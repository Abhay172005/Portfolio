/* Portfolio admin dashboard.
   Loaded after script.js, so it reuses the public site's helpers (esc, icon, cover, chips,
   projectCard, FEATURED_COUNT) to show cards exactly as visitors see them.
   Views are driven by the URL hash: #projects, #blog, #project/<id|new>, #post/<id|new>. */
(() => {
  "use strict";

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const slugify = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const lines = (s) => String(s || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
  const fallbackHomeCount = typeof FEATURED_COUNT === "number" ? FEATURED_COUNT : 4;
  /** Same rule as the public home page: the chosen projects, or the first few if none are chosen. */
  const homeIds = () => {
    const chosen = state.projects.filter((p) => p.showOnHome);
    return new Set((chosen.length ? chosen : state.projects.slice(0, fallbackHomeCount)).map((p) => p._id));
  };
  const ICONS = [["i-code", "Code"], ["i-cpu", "Chip"], ["i-activity", "Activity"], ["i-file", "File"], ["i-eye", "Eye"], ["i-search", "Search"], ["i-truck", "Truck"]];

  const state = { email: "", projects: [], posts: [], repos: null, dirty: false, ready: false, storage: "" };
  const IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif|avif)$/;
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // largest file the picker accepts
  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // largest file the server accepts; bigger photos are shrunk first
  const VIDEO_TYPES = /^video\/(mp4|webm|quicktime)$/;
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
  const MAX_VIDEO_SECONDS = 20;
  const HUE_PRESETS = [350, 15, 35, 50, 140, 168, 190, 210, 235, 265, 290, 320];

  function setDirty(on) {
    state.dirty = on;
    qsa(".dirty-flag").forEach((el) => { el.hidden = !on; });
  }

  /* ---------- API ---------- */
  async function api(url, { method = "GET", body } = {}) {
    let res;
    try {
      res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw new Error("Can't reach the server. Is it running?");
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (res.status === 401 && state.ready && !url.startsWith("/api/auth/")) {
      showLogin("Your session expired. Sign in again.");
    }
    if (!res.ok) {
      const fallback = res.status === 404 && !data
        ? "The admin API isn't available. Start the server with npm run dev."
        : "Something went wrong. Please try again.";
      const error = new Error(data?.error || fallback);
      error.status = res.status;
      throw error;
    }
    return data;
  }

  /* ---------- Feedback ---------- */
  let toastTimer;
  function toast(message, isError = false) {
    const el = qs("#toast");
    el.textContent = message;
    el.classList.toggle("is-error", isError);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 6000 : 3200);
  }

  function notice(el, message = "", type = "") {
    el.textContent = message;
    el.className = `notice ${type}`.trim();
  }

  function busy(button, on) {
    button.disabled = on;
    button.classList.toggle("is-loading", on);
  }

  function updateCounters(form) {
    qsa("[data-count]", form).forEach((el) => {
      const field = form.elements.namedItem(el.dataset.count);
      const max = Number(el.dataset.max);
      const len = field.value.trim().length;
      el.textContent = `${len}/${max}`;
      el.classList.toggle("is-over", len > max);
    });
  }

  /** Grows a textarea to fit its content. */
  function autogrow(el) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }
  document.addEventListener("input", (e) => { if (e.target.matches?.("textarea[data-autogrow]")) autogrow(e.target); });
  const growAll = (root) => qsa("textarea[data-autogrow]", root).forEach(autogrow);

  /* ---------- Image upload ---------- */
  /** Re-encodes a photo over the upload limit as a smaller WebP (falling back to JPEG). GIFs are left alone so they keep their animation. */
  async function shrinkForUpload(file) {
    if (file.size <= MAX_UPLOAD_BYTES) return file;
    if (file.type === "image/gif") throw new Error(`That GIF is ${(file.size / 1048576).toFixed(1)} MB. GIFs must be 4 MB or smaller.`);
    let bitmap;
    try { bitmap = await createImageBitmap(file); } catch { throw new Error("Couldn't read that image to shrink it."); }
    try {
      for (const longest of [2400, 1800, 1400]) {
        const scale = Math.min(1, longest / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const type of ["image/webp", "image/jpeg"]) {
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
          if (blob && blob.type === type && blob.size <= MAX_UPLOAD_BYTES) return blob;
        }
      }
    } finally { bitmap.close?.(); }
    throw new Error("That image is too large to upload, even after shrinking it.");
  }

  async function uploadImage(file) {
    if (!file || !IMAGE_TYPES.test(file.type)) throw new Error("Choose a PNG, JPG, WebP, GIF or AVIF image.");
    if (file.size > MAX_IMAGE_BYTES) throw new Error(`That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is 8 MB.`);
    const body = await shrinkForUpload(file);
    let res;
    try {
      res = await fetch("/api/admin/upload", { method: "POST", credentials: "same-origin", headers: { "Content-Type": body.type }, body });
    } catch {
      throw new Error("Upload failed. Is the server running?");
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) showLogin("Your session expired. Sign in again.");
    if (!res.ok) throw new Error(data.error || "Upload failed.");
    return data;
  }

  const storageNote = (storage) => (storage === "cloudinary"
    ? "Uploaded to Cloudinary."
    : "Saved on this computer. Set up Cloudinary before you deploy, or the image will be lost.");

  /* ---------- Video upload (straight to Cloudinary) ---------- */
  /** The video's length in seconds, or NaN if the browser can't read it (Cloudinary's reply is checked then). */
  function videoDuration(file) {
    return new Promise((resolve) => {
      const probe = document.createElement("video");
      const src = URL.createObjectURL(file);
      const done = (seconds) => { URL.revokeObjectURL(src); resolve(seconds); };
      probe.preload = "metadata";
      probe.onloadedmetadata = () => done(probe.duration);
      probe.onerror = () => done(NaN);
      probe.src = src;
    });
  }

  async function uploadVideo(file, onProgress) {
    if (!file || !VIDEO_TYPES.test(file.type)) throw new Error("Choose an MP4, WebM or MOV video.");
    if (file.size > MAX_VIDEO_BYTES) throw new Error(`That video is ${(file.size / 1048576).toFixed(0)} MB. The limit is 50 MB, so trim or compress it first.`);
    const tooLong = (s) => s > MAX_VIDEO_SECONDS + 0.5;
    const seconds = await videoDuration(file);
    if (tooLong(seconds)) throw new Error(`That video is ${Math.round(seconds)} seconds long. Keep it to ${MAX_VIDEO_SECONDS} seconds or less.`);

    const { uploadUrl, fields } = await api("/api/admin/video-signature");
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append("file", file);
    // XMLHttpRequest (not fetch) so the bar can show real upload progress.
    const data = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
      xhr.onload = () => {
        let body = {};
        try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(`Cloudinary rejected the video: ${body.error?.message || `status ${xhr.status}`}.`));
      };
      xhr.onerror = () => reject(new Error("Couldn't reach Cloudinary. Check your internet connection."));
      xhr.send(form);
    });
    if (tooLong(data.duration)) throw new Error(`That video is ${Math.round(data.duration)} seconds long. Keep it to ${MAX_VIDEO_SECONDS} seconds or less.`);
    // Deliver a compressed, silent MP4 (plays everywhere), capped at 1280px wide.
    const url = data.secure_url
      .replace("/video/upload/", "/video/upload/ac_none,q_auto,vc_auto,c_limit,w_1280/")
      .replace(/\.[a-z0-9]+$/i, ".mp4");
    return { url, storage: "cloudinary" };
  }

  /** Drag-and-drop / browse / paste picker that uploads a file and stores the final URL in a hidden input.
      Images by default; pass { kind: "video" } for the cover video. */
  function createDropzone(root, onChange, { kind = "image" } = {}) {
    const isVideo = kind === "video";
    const accepts = (f) => (isVideo ? VIDEO_TYPES : IMAGE_TYPES).test(f?.type || "");
    const upload = isVideo ? uploadVideo : (f) => uploadImage(f);
    const hidden = qs('input[type="hidden"]', root);
    const file = qs(".dropzone__file", root);
    const area = qs(".dropzone__area", root);
    const img = qs(".dropzone__img", root);   // an <img>, or a <video> for the cover video
    const progress = qs(".dropzone__progress", root);
    const note = qs(".dropzone__note", root);
    const urlInput = qs(".dropzone__url", root);
    const btn = (name) => qs(`[data-dz="${name}"]`, root);
    let busy = false;

    const setNote = (text = "", tone = "") => { note.textContent = text; note.className = `dropzone__note ${tone}`.trim(); };
    const setProgress = (fraction) => {
      root.classList.add("is-determinate");
      progress.style.setProperty("--p", `${Math.round(fraction * 100)}%`);
      setNote(`Uploading… ${Math.round(fraction * 100)}%`);
    };

    function show(url) {
      const has = Boolean(url);
      root.classList.toggle("has-image", has);
      img.hidden = !has;
      if (has) img.src = url; else img.removeAttribute("src");
      btn("replace").hidden = !has;
      btn("remove").hidden = !has;
    }

    function set(url, { silent = false } = {}) {
      hidden.value = url || "";
      urlInput.value = url || "";
      show(url);
      if (!silent) onChange();
    }

    img.addEventListener("error", () => {
      if (!hidden.value || busy) return;
      root.classList.remove("has-image");
      img.hidden = true;
      setNote(`Couldn't load this ${kind}. Check the link, or upload the file instead.`, "error");
    });

    async function handle(fileObj) {
      if (busy || !fileObj) return;
      if (!accepts(fileObj)) {
        setNote(isVideo ? "Choose an MP4, WebM or MOV video." : "Choose a PNG, JPG, WebP, GIF or AVIF image.", "error");
        return;
      }
      busy = true;
      root.classList.add("is-uploading");
      progress.hidden = false;
      setNote(`Uploading ${fileObj.name || kind}…`);
      const localPreview = URL.createObjectURL(fileObj);
      show(localPreview);
      try {
        const result = await upload(fileObj, setProgress);
        set(result.url);
        setNote(storageNote(result.storage), result.storage === "cloudinary" ? "" : "warn");
      } catch (error) {
        show(hidden.value);
        setNote(error.message, "error");
      } finally {
        URL.revokeObjectURL(localPreview);
        busy = false;
        root.classList.remove("is-uploading", "is-determinate");
        progress.hidden = true;
        file.value = "";
      }
    }

    const browse = () => { if (!busy) file.click(); };
    area.addEventListener("click", browse);
    area.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); browse(); } });
    area.addEventListener("paste", (e) => {
      const item = [...(e.clipboardData?.files || [])].find(accepts);
      if (item) { e.preventDefault(); handle(item); }
    });
    file.addEventListener("change", () => handle(file.files[0]));
    ["dragenter", "dragover"].forEach((type) => area.addEventListener(type, (e) => { e.preventDefault(); root.classList.add("is-over"); }));
    ["dragleave", "dragend"].forEach((type) => area.addEventListener(type, () => root.classList.remove("is-over")));
    area.addEventListener("drop", (e) => {
      e.preventDefault();
      root.classList.remove("is-over");
      handle([...e.dataTransfer.files].find(accepts) || e.dataTransfer.files[0]);
    });
    btn("replace").addEventListener("click", browse);
    btn("remove").addEventListener("click", () => { set(""); setNote(); });
    btn("url").addEventListener("click", () => {
      urlInput.hidden = !urlInput.hidden;
      btn("url").textContent = urlInput.hidden ? (root.classList.contains("dropzone--compact") ? "Use a link" : "Use a link instead") : "Hide link";
      if (!urlInput.hidden) urlInput.focus();
    });
    let typing;
    urlInput.addEventListener("input", () => {
      clearTimeout(typing);
      typing = setTimeout(() => { hidden.value = urlInput.value.trim(); show(hidden.value); setNote(); onChange(); }, 350);
    });

    return {
      get: () => hidden.value.trim(),
      set: (url) => {
        set(url, { silent: true });
        urlInput.hidden = true;
        btn("url").textContent = root.classList.contains("dropzone--compact") ? "Use a link" : "Use a link instead";
        const localOnly = state.storage === "local" && !url;
        const localNote = isVideo ? "Video uploads need Cloudinary. You can still use a link." : "Uploads are saved on this computer until Cloudinary is set up.";
        setNote(localOnly ? localNote : "", localOnly ? "warn" : "");
      }
    };
  }

  /* ---------- Highlights list ---------- */
  function createListEditor(root, onChange, placeholder) {
    const list = qs(".list-editor__items", root);

    function row(text = "") {
      const li = document.createElement("li");
      li.className = "list-editor__item";
      li.innerHTML = `<textarea rows="1" data-autogrow aria-label="Highlight" placeholder="${esc(placeholder)}"></textarea>
        <button type="button" class="icon-btn" aria-label="Remove highlight" title="Remove"><svg class="icon"><use href="#a-x"/></svg></button>`;
      qs("textarea", li).value = text;
      return li;
    }
    const focusEnd = (ta) => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); };

    function add(after, text = "", focus = true) {
      const li = row(text);
      if (after) after.after(li); else list.append(li);
      autogrow(qs("textarea", li));
      if (focus) focusEnd(qs("textarea", li));
      return li;
    }

    list.addEventListener("keydown", (e) => {
      const ta = e.target.closest("textarea");
      if (!ta) return;
      const li = ta.closest("li");
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        add(li);
        onChange();
      } else if (e.key === "Backspace" && !ta.value && list.children.length > 1) {
        e.preventDefault();
        const prev = li.previousElementSibling || li.nextElementSibling;
        li.remove();
        focusEnd(qs("textarea", prev));
        onChange();
      }
    });
    list.addEventListener("paste", (e) => {
      const ta = e.target.closest("textarea");
      const text = e.clipboardData?.getData("text") || "";
      if (!ta || !text.includes("\n")) return;
      // Pasting several lines creates one highlight per line.
      e.preventDefault();
      const parts = text.split("\n").map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s+/, "").trim()).filter(Boolean);
      let li = ta.closest("li");
      qs("textarea", li).value = `${ta.value}${parts.shift() || ""}`;
      autogrow(qs("textarea", li));
      parts.forEach((p) => { li = add(li, p, false); });
      focusEnd(qs("textarea", li));
      onChange();
    });
    list.addEventListener("input", onChange);
    list.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      const li = button.closest("li");
      if (list.children.length === 1) qs("textarea", li).value = ""; else li.remove();
      onChange();
    });
    qs(".list-editor__add", root).addEventListener("click", () => { add(list.lastElementChild); onChange(); });

    return {
      get: () => qsa("textarea", list).map((t) => t.value.trim()).filter(Boolean),
      set: (items) => {
        list.replaceChildren();
        (items && items.length ? items : [""]).forEach((t) => list.append(row(t)));
        requestAnimationFrame(() => qsa("textarea", list).forEach(autogrow));
      },
      el: root
    };
  }

  /* ---------- Tag input ---------- */
  function createTagInput(root, onChange) {
    const list = qs(".tags__list", root);
    const input = qs("input", root);
    let items = [];

    const render = () => {
      list.innerHTML = items.map((t, i) => `<span class="chip">${esc(t)}<button type="button" data-i="${i}" aria-label="Remove ${esc(t)}">×</button></span>`).join("");
    };
    const add = (text) => {
      let changed = false;
      text.split(",").map((s) => s.trim()).filter(Boolean).forEach((t) => {
        if (!items.some((x) => x.toLowerCase() === t.toLowerCase())) { items.push(t); changed = true; }
      });
      if (changed) { render(); onChange(); }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        add(input.value);
        input.value = "";
      } else if (e.key === "Backspace" && !input.value && items.length) {
        items.pop();
        render();
        onChange();
      }
    });
    input.addEventListener("input", () => {
      if (input.value.includes(",")) {
        const parts = input.value.split(",");
        input.value = parts.pop();
        add(parts.join(","));
      }
    });
    input.addEventListener("blur", () => { if (input.value.trim()) { add(input.value); input.value = ""; } });
    list.addEventListener("click", (e) => {
      const i = e.target.closest("button")?.dataset.i;
      if (i === undefined) return;
      items.splice(Number(i), 1);
      render();
      onChange();
      input.focus();
    });
    root.addEventListener("click", (e) => { if (e.target === root) input.focus(); });

    return {
      get: () => [...items],
      set: (arr) => { items = [...new Set((arr || []).map(String))]; render(); }
    };
  }

  /* ---------- Views & routing ---------- */
  const loginView = qs("#loginView");
  const dashboardView = qs("#dashboardView");
  const panels = ["#projectsPanel", "#blogPanel", "#resumePanel", "#profilePanel", "#projectEditor", "#postEditor"].map((s) => qs(s));
  let currentRoute = "";
  let ignoreNextHash = false;

  function showLogin(message = "") {
    state.ready = false;
    setDirty(false);
    dashboardView.hidden = true;
    loginView.hidden = false;
    notice(qs("#loginNotice"), message, message ? "error" : "");
    qs("#loginForm").elements.email.focus();
  }

  async function enterDashboard(email) {
    state.email = email;
    qs("#whoami").textContent = `Signed in as ${email}`;
    const [projects, posts, resume, profile] = await Promise.all([
      api("/api/admin/projects"),
      api("/api/admin/posts"),
      api("/api/admin/resume").catch(() => null),
      api("/api/admin/profile").catch(() => null)
    ]);
    state.projects = projects;
    state.posts = posts;
    state.resume = resume;
    state.profile = profile;
    state.ready = true;
    api("/api/admin/upload-status").then((s) => { state.storage = s.storage; }).catch(() => {});
    loginView.hidden = true;
    dashboardView.hidden = false;
    renderStats();
    renderProjectGrid();
    renderPostList();
    route();
  }

  function route() {
    if (!state.ready) return;
    if (ignoreNextHash) { ignoreNextHash = false; return; }
    const hash = location.hash.slice(1) || "projects";
    if (`#${hash}` !== currentRoute && state.dirty && !confirm("You have unsaved changes. Leave without saving?")) {
      ignoreNextHash = true;
      location.hash = currentRoute;
      return;
    }
    setDirty(false);
    currentRoute = `#${hash}`;
    const [kind, id] = hash.split("/");
    const tab = kind === "blog" || kind === "post" ? "blog" : ["resume", "profile"].includes(kind) ? kind : "projects";
    qsa(".tab").forEach((t) => {
      const active = t.dataset.tab === tab;
      t.classList.toggle("is-active", active);
      if (active) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
    panels.forEach((p) => { p.hidden = true; });
    const inEditor = kind === "project" || kind === "post";
    qs(".stats").hidden = inEditor;
    qs(".tabs").hidden = inEditor;
    qs(".dash-head").hidden = inEditor;

    if (kind === "project") openProjectEditor(id || "new");
    else if (kind === "post") openPostEditor(id || "new");
    else if (kind === "blog") qs("#blogPanel").hidden = false;
    else if (kind === "resume") openResume();
    else if (kind === "profile") openProfile();
    else qs("#projectsPanel").hidden = false;
    if (inEditor) window.scrollTo({ top: 0 });
  }

  function renderStats() {
    const published = state.posts.filter((p) => p.published).length;
    qs("#statProjects").textContent = state.projects.length;
    qs("#statPublished").textContent = published;
    qs("#statDrafts").textContent = state.posts.length - published;
    qs("#tabProjects").textContent = state.projects.length;
    qs("#tabPosts").textContent = state.posts.length;
    const chosen = state.projects.filter((p) => p.showOnHome).length;
    qs("#homeHint").innerHTML = chosen
      ? `<strong>${chosen}</strong> project${chosen === 1 ? "" : "s"} on your home page. Use the <svg class="icon"><use href="#a-home"/></svg> button to add or remove one, and the arrows to change the order.`
      : `No projects are picked for the home page yet, so it shows the first ${fallbackHomeCount}. Use the <svg class="icon"><use href="#a-home"/></svg> button on a card to choose.`;
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("beforeunload", (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- Login / logout ---------- */
  qs("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const button = qs("button[type=submit]", form);
    notice(qs("#loginNotice"));
    busy(button, true);
    try {
      const me = await api("/api/auth/login", { method: "POST", body: { email: form.elements.email.value.trim(), password: form.elements.password.value } });
      form.reset();
      await enterDashboard(me.email);
    } catch (error) {
      notice(qs("#loginNotice"), error.message, "error");
    } finally {
      busy(button, false);
    }
  });

  qs("#logoutButton").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    history.replaceState(null, "", location.pathname);
    currentRoute = "";
    showLogin();
  });

  /* ---------- Projects list ---------- */
  function renderProjectGrid() {
    const total = state.projects.length;
    const onHome = homeIds();
    const cards = state.projects.map((p, i) => `
      <article class="project admin-card" data-id="${esc(p._id)}">
        <span class="admin-card__order">#${i + 1}</span>
        ${onHome.has(p._id) ? `<span class="admin-card__badge"><svg class="icon"><use href="#a-home"/></svg>On home page</span>` : ""}
        ${cover(p)}
        <div class="project__body">
          <div class="project__top"><div>
            <h3 class="project__name">${esc(p.name)}</h3>
            <p class="project__tagline">${esc(p.tagline)}</p>
          </div></div>
          <div class="chips">${chips(p.tech || [], 4)}</div>
          <div class="admin-card__actions">
            <a class="btn btn--ghost" href="#project/${esc(p._id)}"><svg class="icon"><use href="#a-edit"/></svg> Edit</a>
            <a class="btn btn--ghost" href="project.html?p=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">View</a>
            <span class="admin-card__tools">
            <button class="icon-btn${p.showOnHome ? " is-on" : ""}" type="button" data-home aria-pressed="${Boolean(p.showOnHome)}" aria-label="Show ${esc(p.name)} on home page" title="${p.showOnHome ? "Remove from home page" : "Show on home page"}"><svg class="icon"><use href="#a-home"/></svg></button>
            <button class="icon-btn" type="button" data-move="-1" aria-label="Move ${esc(p.name)} earlier" title="Move earlier" ${i === 0 ? "disabled" : ""}><svg class="icon"><use href="#a-left"/></svg></button>
            <button class="icon-btn" type="button" data-move="1" aria-label="Move ${esc(p.name)} later" title="Move later" ${i === total - 1 ? "disabled" : ""}><svg class="icon"><use href="#a-right"/></svg></button>
            <button class="icon-btn danger" type="button" data-delete aria-label="Delete ${esc(p.name)}" title="Delete"><svg class="icon"><use href="#a-trash"/></svg></button>
            </span>
          </div>
        </div>
      </article>`).join("");
    qs("#adminProjects").innerHTML = `${cards}
      <a class="add-card" href="#project/new">
        <svg class="icon"><use href="#a-plus"/></svg>
        <strong>Add a project</strong>
        <span>Import it from a GitHub link, or fill in the details yourself.</span>
      </a>`;
  }

  qs("#adminProjects").addEventListener("click", async (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    const id = button.closest("[data-id]").dataset.id;
    const index = state.projects.findIndex((p) => p._id === id);
    const project = state.projects[index];

    if ("home" in button.dataset) {
      const showOnHome = !project.showOnHome;
      button.disabled = true;
      try {
        state.projects[index] = await api(`/api/admin/projects/${id}`, { method: "PUT", body: { ...project, showOnHome } });
        renderProjectGrid();
        renderStats();
        qs(`[data-id="${CSS.escape(id)}"] [data-home]`)?.focus();
        toast(showOnHome ? `${project.name} now shows on your home page.` : `${project.name} removed from your home page.`);
      } catch (error) {
        button.disabled = false;
        toast(error.message, true);
      }
      return;
    }

    if (button.dataset.move) {
      const to = index + Number(button.dataset.move);
      if (to < 0 || to >= state.projects.length) return;
      const previous = [...state.projects];
      [state.projects[index], state.projects[to]] = [state.projects[to], state.projects[index]];
      renderProjectGrid();
      qs(`[data-id="${CSS.escape(id)}"] [data-move="${button.dataset.move}"]`)?.focus();
      try {
        state.projects = await api("/api/admin/projects-order", { method: "PUT", body: { ids: state.projects.map((p) => p._id) } });
      } catch (error) {
        state.projects = previous;
        renderProjectGrid();
        toast(error.message, true);
      }
    } else if ("delete" in button.dataset) {
      if (!confirm(`Delete “${project.name}”? This can't be undone.`)) return;
      try {
        await api(`/api/admin/projects/${id}`, { method: "DELETE" });
        state.projects.splice(index, 1);
        renderProjectGrid();
        renderStats();
        toast(`Deleted ${project.name}.`);
      } catch (error) { toast(error.message, true); }
    }
  });

  /* ---------- Project editor ---------- */
  const pf = qs("#projectForm");
  const techInput = createTagInput(qs("#techInput"), () => projectChanged());
  const highlightsInput = createListEditor(qs("#highlightsEditor"), () => projectChanged(), "e.g. Predicts delays with XGBoost and explains each prediction with SHAP.");
  const projectImage = createDropzone(qs("#projectImage"), () => projectChanged());
  const projectVideo = createDropzone(qs("#projectVideo"), () => projectChanged(), { kind: "video" });
  let editingProject = null;
  let slugTouched = false;

  qs("#iconPicker").innerHTML = ICONS.map(([id, label]) => `
    <label title="${label}"><input type="radio" name="icon" value="${id}" aria-label="${label}" /><span>${icon(id)}</span></label>`).join("");
  qs("#hueSwatches").innerHTML = HUE_PRESETS.map((h) => `
    <button type="button" class="swatch-btn" data-hue="${h}" style="--c:hsl(${h} 70% 55%)" aria-label="Hue ${h}" title="${h}°"></button>`).join("");
  qs("#hueSwatches").addEventListener("click", (e) => {
    const hue = e.target.closest("[data-hue]")?.dataset.hue;
    if (!hue) return;
    pf.elements.hue.value = hue;
    projectChanged();
  });

  function readProject() {
    const v = (name) => pf.elements.namedItem(name).value.trim();
    return {
      name: v("name"),
      slug: slugify(v("slug")),
      tagline: v("tagline"),
      about: lines(v("about")),
      highlights: highlightsInput.get(),
      tech: techInput.get(),
      repo: v("repo"),
      live: v("live"),
      demo: v("demo"),
      image: projectImage.get(),
      video: projectVideo.get(),
      icon: pf.elements.icon.value || "i-code",
      hue: Number(pf.elements.hue.value),
      order: editingProject ? editingProject.order : Math.max(-1, ...state.projects.map((p) => p.order ?? 0)) + 1,
      showOnHome: pf.elements.showOnHome.checked
    };
  }

  function fillProject(p) {
    ["name", "slug", "tagline", "repo", "live", "demo"].forEach((k) => { pf.elements[k].value = p[k] || ""; });
    pf.elements.about.value = (p.about || []).join("\n");
    highlightsInput.set(p.highlights || []);
    projectImage.set(p.image || "");
    projectVideo.set(p.video || "");
    pf.elements.hue.value = Number.isFinite(Number(p.hue)) ? p.hue : 190;
    pf.elements.showOnHome.checked = Boolean(p.showOnHome);
    techInput.set(p.tech || []);
    requestAnimationFrame(() => growAll(pf));
    const radio = qsa("input[name=icon]", pf).find((r) => r.value === p.icon) || qs("input[name=icon]", pf);
    radio.checked = true;
    qsa(".is-invalid", pf).forEach((el) => el.classList.remove("is-invalid"));
    refreshProjectExtras();
  }

  function refreshProjectExtras() {
    const p = readProject();
    const hue = p.hue;
    qs("#hueValue").innerHTML = `<span class="swatch" style="background:hsl(${hue} 70% 55%)"></span>${hue}°`;
    qsa(".swatch-btn", pf).forEach((b) => b.classList.toggle("is-active", Number(b.dataset.hue) === hue));
    updateCounters(pf);
    const preview = { ...p, name: p.name || "Project name", tagline: p.tagline || "Your tagline appears here.", slug: p.slug || "project" };
    const oldVideo = qs("#projectPreview video");
    qs("#projectPreview").innerHTML = projectCard(preview);
    // Keep the playing video when only the text changed, so it doesn't restart on every keystroke.
    const newVideo = qs("#projectPreview video");
    if (oldVideo && newVideo && oldVideo.dataset.src === newVideo.dataset.src) newVideo.replaceWith(oldVideo);
    qsa("#projectPreview .reveal").forEach((el) => el.classList.add("is-visible"));
  }

  let extrasFrame;
  function projectChanged() {
    setDirty(true);
    cancelAnimationFrame(extrasFrame);
    extrasFrame = requestAnimationFrame(refreshProjectExtras);
  }

  pf.addEventListener("input", (e) => {
    const name = e.target.name;
    if (!name || name === "importUrl" || name === "image") return;
    if (name === "slug") slugTouched = true;
    if (name === "name" && !slugTouched) pf.elements.slug.value = slugify(pf.elements.name.value);
    e.target.classList.remove("is-invalid");
    projectChanged();
  });
  pf.addEventListener("change", (e) => { if (e.target.name === "icon") projectChanged(); });

  function openProjectEditor(id) {
    const project = id === "new" ? null : state.projects.find((p) => p._id === id);
    if (id !== "new" && !project) {
      toast("That project no longer exists.", true);
      location.hash = "#projects";
      return;
    }
    editingProject = project;
    slugTouched = Boolean(project);
    qs("#projectEditorTitle").textContent = project ? `Edit ${project.name}` : "New project";
    qs("#deleteProject").hidden = !project;
    qs("#importTitle").textContent = project ? "Refresh from GitHub" : "Import from GitHub";
    pf.elements.importUrl.value = project?.repo || "";
    qs("#repoList").hidden = true;
    notice(qs("#importNotice"));
    qs("#previewNote").textContent = "This is how the card looks on the Projects page.";
    fillProject(project || { hue: 190, icon: "i-code" });
    setDirty(false);
    qs("#projectEditor").hidden = false;
    if (!project) pf.elements.importUrl.focus();
  }

  pf.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = readProject();
    const missing = ["name", "slug", "tagline"].filter((k) => !data[k]);
    missing.forEach((k) => pf.elements[k].classList.add("is-invalid"));
    if (missing.length) {
      pf.elements[missing[0]].focus();
      toast("Add a name, URL slug and tagline before saving.", true);
      return;
    }
    const button = qs("#projectEditor .editor__actions .btn--primary");
    busy(button, true);
    try {
      const saved = editingProject
        ? await api(`/api/admin/projects/${editingProject._id}`, { method: "PUT", body: data })
        : await api("/api/admin/projects", { method: "POST", body: data });
      const i = state.projects.findIndex((p) => p._id === saved._id);
      if (i >= 0) state.projects[i] = saved; else state.projects.push(saved);
      renderProjectGrid();
      renderStats();
      setDirty(false);
      toast(`${saved.name} saved.`);
      location.hash = "#projects";
    } catch (error) {
      if (error.status === 409) pf.elements.slug.classList.add("is-invalid");
      toast(error.message, true);
    } finally {
      busy(button, false);
    }
  });

  qs("#deleteProject").addEventListener("click", async () => {
    if (!editingProject || !confirm(`Delete “${editingProject.name}”? This can't be undone.`)) return;
    try {
      await api(`/api/admin/projects/${editingProject._id}`, { method: "DELETE" });
      state.projects = state.projects.filter((p) => p._id !== editingProject._id);
      renderProjectGrid();
      renderStats();
      setDirty(false);
      toast(`Deleted ${editingProject.name}.`);
      location.hash = "#projects";
    } catch (error) { toast(error.message, true); }
  });

  /* GitHub import */
  async function importFrom(url) {
    const target = qs("#importNotice");
    if (!url.trim()) { notice(target, "Paste a GitHub repository link first.", "error"); pf.elements.importUrl.focus(); return; }
    const current = readProject();
    const hasContent = current.name || current.tagline || current.about.length;
    if (hasContent && !confirm("Replace the details below with the ones from GitHub?")) return;

    const button = qs("#importButton");
    busy(button, true);
    notice(target, "Reading the repository and its README…");
    try {
      const { project, source } = await api(`/api/admin/github/import?repo=${encodeURIComponent(url.trim())}`);
      const merged = { ...current, ...project };
      if (editingProject) merged.slug = current.slug; // keep existing links working
      if (current.image && /opengraph\.githubassets\.com/.test(project.image)) merged.image = current.image;
      fillProject(merged);
      slugTouched = true;
      setDirty(true);
      pf.elements.importUrl.value = project.repo;
      const flash = (el) => { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); };
      ["name", "tagline", "about", "repo", "live"].forEach((k) => { if (pf.elements[k].value) flash(pf.elements[k]); });
      flash(pf.elements.slug.closest(".input-group"));
      if (merged.highlights.length) qsa("#highlightsEditor textarea").forEach(flash);
      if (merged.tech.length) flash(qs("#techInput"));
      if (merged.image) flash(qs("#projectImage .dropzone__area"));
      const filled = [project.about.length && "about", project.highlights.length && `${project.highlights.length} highlights`, project.tech.length && `${project.tech.length} technologies`].filter(Boolean);
      notice(target, `Filled in from ${source.fullName}${filled.length ? ` — ${filled.join(", ")}` : ""}${source.hasReadme ? "" : " (no README found)"}. Review, then save.`, "success");
      qs("#repoList").hidden = true;
    } catch (error) {
      notice(target, error.message, "error");
    } finally {
      busy(button, false);
    }
  }

  qs("#importButton").addEventListener("click", () => importFrom(pf.elements.importUrl.value));
  pf.elements.importUrl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); importFrom(pf.elements.importUrl.value); }
  });

  qs("#toggleRepos").addEventListener("click", async () => {
    const list = qs("#repoList");
    list.hidden = !list.hidden;
    if (list.hidden || state.repos) return;
    list.innerHTML = `<p class="hint">Loading your repositories…</p>`;
    try {
      const { repos } = await api("/api/admin/github/repos");
      state.repos = repos;
      list.innerHTML = repos.length ? repos.map((r) => `
        <button type="button" class="repo${r.imported ? " is-imported" : ""}" data-url="${esc(r.url)}">
          <strong>${esc(r.name)}</strong>
          <span>${esc(r.description || "No description")}</span>
          <small>${r.imported ? "Already in portfolio" : [r.language, `updated ${formatDate(r.pushedAt)}`].filter(Boolean).map(esc).join(" · ")}</small>
        </button>`).join("") : `<p class="hint">No public repositories found.</p>`;
    } catch (error) {
      state.repos = null;
      list.innerHTML = `<p class="notice error">${esc(error.message)}</p>`;
    }
  });

  qs("#repoList").addEventListener("click", (e) => {
    const repo = e.target.closest(".repo");
    if (!repo) return;
    pf.elements.importUrl.value = repo.dataset.url;
    importFrom(repo.dataset.url);
  });

  /* ---------- Blog list ---------- */
  function renderPostList() {
    const list = qs("#adminPosts");
    if (!state.posts.length) {
      list.innerHTML = `
        <div class="empty">
          <svg class="icon"><use href="#a-pen"/></svg>
          <strong>No posts yet</strong>
          <p>Write about what you're building, what you learned, or how a project came together.</p>
          <a class="btn btn--primary" href="#post/new"><svg class="icon"><use href="#a-plus"/></svg> Write your first post</a>
        </div>`;
      return;
    }
    list.innerHTML = state.posts.map((p) => `
      <article class="card post-row" data-id="${esc(p._id)}">
        <div class="post-row__thumb" data-cover="${esc(p.cover || "")}"></div>
        <div>
          <h3>${esc(p.title)}</h3>
          ${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ""}
          <div class="post-row__meta">
            <span class="pill ${p.published ? "pill--live" : "pill--draft"}">${p.published ? "Published" : "Draft"}</span>
            <span>${p.published ? formatDate(p.publishedAt) : `Edited ${formatDate(p.updatedAt)}`}</span>
            <span>· ${readingTime(p.content)} min read</span>
            ${(p.tags || []).length ? `<span>· ${p.tags.map(esc).join(", ")}</span>` : ""}
          </div>
        </div>
        <div class="post-row__actions">
          <a class="btn btn--ghost" href="#post/${esc(p._id)}"><svg class="icon"><use href="#a-edit"/></svg> Edit</a>
          ${p.published ? `<a class="btn btn--ghost" href="post.html?s=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">View</a>` : ""}
          <button class="icon-btn danger" type="button" data-delete aria-label="Delete ${esc(p.title)}" title="Delete"><svg class="icon"><use href="#a-trash"/></svg></button>
        </div>
      </article>`).join("");
    qsa(".post-row__thumb[data-cover]", list).forEach((el) => {
      if (el.dataset.cover) el.style.backgroundImage = `url(${JSON.stringify(el.dataset.cover)})`;
    });
  }

  async function deletePost(post) {
    if (!confirm(`Delete “${post.title}”? This can't be undone.`)) return false;
    try {
      await api(`/api/admin/posts/${post._id}`, { method: "DELETE" });
      state.posts = state.posts.filter((p) => p._id !== post._id);
      renderPostList();
      renderStats();
      toast(`Deleted “${post.title}”.`);
      return true;
    } catch (error) { toast(error.message, true); return false; }
  }

  qs("#adminPosts").addEventListener("click", (e) => {
    if (!e.target.closest("[data-delete]")) return;
    const post = state.posts.find((p) => p._id === e.target.closest("[data-id]").dataset.id);
    if (post) deletePost(post);
  });

  /* ---------- Post editor ---------- */
  const postForm = qs("#postForm");
  const content = qs("#postContent");
  const panes = qs("#writerPanes");
  const tagInput = createTagInput(qs("#tagInput"), () => postChanged());
  const postCover = createDropzone(qs("#postCover"), () => postChanged());
  let editingPost = null;
  let postSlugTouched = false;

  function readPost() {
    const v = (name) => postForm.elements.namedItem(name).value;
    return {
      title: v("title").trim(),
      slug: slugify(v("slug")) || slugify(v("title")),
      excerpt: v("excerpt").trim(),
      cover: postCover.get(),
      tags: tagInput.get(),
      content: v("content")
    };
  }

  function renderPostPreview() {
    const p = readPost();
    qs("#postPreview").innerHTML = `${p.title ? `<h1>${esc(p.title)}</h1>` : ""}${renderMarkdown(p.content) || `<p class="hint">Nothing to preview yet.</p>`}`;
    const words = p.content.trim() ? p.content.trim().split(/\s+/).length : 0;
    qs("#writerStats").textContent = `${words} words · ${readingTime(p.content)} min read · Markdown supported`;
    updateCounters(postForm);
  }

  let previewFrame;
  function postChanged() {
    setDirty(true);
    cancelAnimationFrame(previewFrame);
    previewFrame = requestAnimationFrame(renderPostPreview);
  }

  postForm.addEventListener("input", (e) => {
    if (!e.target.name || e.target.name === "cover") return;
    if (e.target.name === "slug") postSlugTouched = true;
    if (e.target.name === "title" && !postSlugTouched) postForm.elements.slug.value = slugify(e.target.value);
    e.target.classList.remove("is-invalid");
    postChanged();
  });

  function updatePostButtons() {
    const live = Boolean(editingPost?.published);
    const pill = `<span class="pill ${live ? "pill--live" : "pill--draft"}">${live ? "Published" : "Draft"}</span>`;
    qs("#postEditorTitle").innerHTML = `${editingPost ? "Edit post" : "New post"} ${pill}`;
    qs("#postStatus").outerHTML = pill.replace("<span ", '<span id="postStatus" ');
    qs("#saveDraft").textContent = live ? "Unpublish" : "Save draft";
    qs("#publishPost").textContent = live ? "Update" : "Publish";
    qs("#deletePost").hidden = !editingPost;
  }

  function openPostEditor(id) {
    const post = id === "new" ? null : state.posts.find((p) => p._id === id);
    if (id !== "new" && !post) {
      toast("That post no longer exists.", true);
      location.hash = "#blog";
      return;
    }
    editingPost = post;
    postSlugTouched = Boolean(post);
    ["title", "slug", "excerpt", "content"].forEach((k) => { postForm.elements[k].value = post?.[k] || ""; });
    postCover.set(post?.cover || "");
    tagInput.set(post?.tags || []);
    qsa(".is-invalid", postForm).forEach((el) => el.classList.remove("is-invalid"));
    updatePostButtons();
    renderPostPreview();
    setDirty(false);
    qs("#postEditor").hidden = false;
    requestAnimationFrame(() => growAll(postForm));
    (post ? content : postForm.elements.title).focus();
  }

  async function savePost(published, button) {
    const data = readPost();
    if (!data.title) {
      postForm.elements.title.classList.add("is-invalid");
      postForm.elements.title.focus();
      toast("Give the post a title first.", true);
      return;
    }
    if (published && !data.content.trim()) {
      content.focus();
      toast("Write something before publishing.", true);
      return;
    }
    busy(button, true);
    try {
      const body = { ...data, published };
      const saved = editingPost
        ? await api(`/api/admin/posts/${editingPost._id}`, { method: "PUT", body })
        : await api("/api/admin/posts", { method: "POST", body });
      const i = state.posts.findIndex((p) => p._id === saved._id);
      if (i >= 0) state.posts[i] = saved; else state.posts.unshift(saved);
      renderPostList();
      renderStats();
      setDirty(false);
      if (published) {
        toast(editingPost?.published ? "Post updated." : "Post published.");
        location.hash = "#blog";
      } else {
        toast(editingPost?.published ? "Post moved back to drafts." : "Draft saved.");
        editingPost = saved;
        postSlugTouched = true;
        postForm.elements.slug.value = saved.slug;
        currentRoute = `#post/${saved._id}`;
        history.replaceState(null, "", currentRoute);
        updatePostButtons();
      }
    } catch (error) {
      if (error.status === 409) postForm.elements.slug.classList.add("is-invalid");
      toast(error.message, true);
    } finally {
      busy(button, false);
    }
  }

  qs("#saveDraft").addEventListener("click", (e) => savePost(false, e.currentTarget));
  qs("#publishPost").addEventListener("click", (e) => savePost(true, e.currentTarget));
  qs("#deletePost").addEventListener("click", async () => {
    if (editingPost && await deletePost(editingPost)) { setDirty(false); location.hash = "#blog"; }
  });

  /* Writing toolbar */
  function insert(text, selectFrom, selectTo) {
    content.focus();
    const start = content.selectionStart;
    // execCommand keeps the browser's undo history; setRangeText is the fallback.
    if (!document.execCommand("insertText", false, text)) {
      content.setRangeText(text, start, content.selectionEnd, "end");
      content.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (selectFrom !== undefined) content.setSelectionRange(start + selectFrom, start + selectTo);
  }

  function wrap(before, after, placeholder) {
    const selected = content.value.slice(content.selectionStart, content.selectionEnd) || placeholder;
    insert(`${before}${selected}${after}`, before.length, before.length + selected.length);
  }

  function prefixLines(prefix) {
    const { value, selectionStart: s, selectionEnd: e } = content;
    const from = value.lastIndexOf("\n", s - 1) + 1;
    const lineEnd = value.indexOf("\n", e);
    const to = lineEnd < 0 ? value.length : lineEnd;
    content.setSelectionRange(from, to);
    const text = value.slice(from, to).split("\n").map((l, i) => `${prefix(i)}${l}`).join("\n");
    insert(text);
  }

  const formats = {
    heading: () => prefixLines(() => "## "),
    bold: () => wrap("**", "**", "bold text"),
    italic: () => wrap("*", "*", "italic text"),
    link: () => wrap("[", "](https://)", "link text"),
    quote: () => prefixLines(() => "> "),
    code: () => {
      const selected = content.value.slice(content.selectionStart, content.selectionEnd);
      if (selected.includes("\n")) wrap("```\n", "\n```", "code"); else wrap("`", "`", "code");
    },
    list: () => prefixLines(() => "- "),
    olist: () => prefixLines((i) => `${i + 1}. `),
    image: () => qs("#inlineImageFile").click()
  };

  /* Images inside a post: upload, then insert Markdown at the cursor. */
  async function insertUploadedImages(files) {
    const images = [...files].filter((f) => IMAGE_TYPES.test(f.type));
    if (!images.length) { toast("Choose a PNG, JPG, WebP, GIF or AVIF image.", true); return; }
    for (const file of images) {
      const alt = (file.name || "image").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "image";
      const marker = `![Uploading ${alt}…]()`;
      const before = content.selectionStart > 0 && content.value[content.selectionStart - 1] !== "\n" ? "\n\n" : "";
      insert(`${before}${marker}\n`);
      try {
        const { url, storage } = await uploadImage(file);
        content.value = content.value.replace(marker, `![${alt}](${url})`);
        if (storage !== "cloudinary") toast("Image saved on this computer. Set up Cloudinary before you deploy.");
      } catch (error) {
        content.value = content.value.replace(`${marker}\n`, "");
        toast(error.message, true);
      }
      content.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  qs("#inlineImageFile").addEventListener("change", (e) => {
    insertUploadedImages(e.target.files);
    e.target.value = "";
  });
  content.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.some((f) => IMAGE_TYPES.test(f.type))) { e.preventDefault(); insertUploadedImages(files); }
  });
  const writer = qs(".writer");
  content.addEventListener("dragover", (e) => {
    if ([...e.dataTransfer.items].some((i) => i.kind === "file")) { e.preventDefault(); writer.classList.add("is-over"); }
  });
  content.addEventListener("dragleave", () => writer.classList.remove("is-over"));
  content.addEventListener("drop", (e) => {
    writer.classList.remove("is-over");
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    content.focus();
    insertUploadedImages(e.dataTransfer.files);
  });

  qs(".toolbar").addEventListener("click", (e) => {
    const action = e.target.closest("[data-md]")?.dataset.md;
    if (action) formats[action]();
  });
  content.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = { b: "bold", i: "italic", k: "link" }[e.key.toLowerCase()];
    if (key) { e.preventDefault(); formats[key](); }
  });

  function setMode(mode) {
    panes.dataset.mode = mode;
    qsa(".seg button").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === mode));
    try { localStorage.setItem("admin.writerMode", mode); } catch { /* storage unavailable */ }
  }
  qs(".seg").addEventListener("click", (e) => { const mode = e.target.closest("[data-mode]")?.dataset.mode; if (mode) setMode(mode); });
  try { const saved = localStorage.getItem("admin.writerMode"); if (saved) setMode(saved); } catch { /* storage unavailable */ }

  /* ---------- Resume ---------- */
  // Each section is a list of entries; each field is a text box, a one-per-line list, tags or links.
  const RESUME_SECTIONS = [
    {
      key: "education", title: "Education", icon: "a-text", add: "Add education", blank: "New education entry",
      desc: "Schools and degrees, newest first.",
      fields: [
        { name: "title", label: "School", placeholder: "SRM Institute of Science and Technology" },
        { name: "org", label: "Degree", placeholder: "B.Tech in Computer Science and Engineering" },
        { name: "date", label: "Dates", placeholder: "Expected May 2028", half: true },
        { name: "place", label: "Location", placeholder: "Chennai, India", half: true, hint: "Optional" },
        { name: "chips", label: "Courses", type: "tags", placeholder: "Add a course and press Enter", hint: "Optional" }
      ]
    },
    {
      key: "experience", title: "Technical experience", icon: "i-code", add: "Add experience", blank: "New role",
      desc: "Internships, jobs and research, newest first.",
      fields: [
        { name: "title", label: "Role", placeholder: "Deep Learning Intern — Video Deepfake Detection" },
        { name: "org", label: "Organisation", placeholder: "Computer Vision & Biometrics Lab (CVBL), IIIT Allahabad" },
        { name: "date", label: "Dates", placeholder: "June 2026", half: true },
        { name: "place", label: "Location", placeholder: "Leave empty for remote", half: true, hint: "Optional" },
        { name: "bullets", label: "What you did", type: "lines", placeholder: "Built a … reaching **0.91 ROC-AUC**.", help: "One point per line. Wrap words in **double stars** to make them bold." },
        { name: "links", label: "Links", type: "links", hint: "Optional" }
      ]
    },
    {
      key: "certifications", title: "Certifications", icon: "i-award", add: "Add certification", blank: "New certification",
      desc: "Shown as cards in a grid.",
      fields: [
        { name: "title", label: "Certificate", placeholder: "SAP Generative AI Developer" },
        { name: "org", label: "Issuer and details", placeholder: "SAP Certified" }
      ]
    },
    {
      key: "activities", title: "Activities", icon: "a-sparkle", add: "Add activity", blank: "New activity",
      desc: "Clubs, volunteering and leadership.",
      fields: [
        { name: "title", label: "Role", placeholder: "Corporate Member" },
        { name: "org", label: "Club or organisation", placeholder: "FOSS Club — SRMIST" },
        { name: "date", label: "Dates", placeholder: "2025 – present", half: true, hint: "Optional" },
        { name: "place", label: "Location", placeholder: "Chennai, India", half: true, hint: "Optional" }
      ]
    },
    {
      key: "skills", title: "Technical skills", icon: "a-layers", add: "Add skill group", blank: "New skill group",
      desc: "Groups of skills. Popular tools get their logo automatically.",
      fields: [
        { name: "label", label: "Group", placeholder: "Languages" },
        { name: "items", label: "Skills", type: "tags", placeholder: "Add a skill and press Enter" }
      ]
    }
  ];

  function linksField(wrap, links, onChange) {
    const rows = document.createElement("div");
    rows.className = "rep-links";
    const add = (link = {}) => {
      const row = document.createElement("div");
      row.className = "rep-links__row";
      row.innerHTML = `<input aria-label="Link label" placeholder="Label, e.g. Source" autocomplete="off" />
        <input aria-label="Link address" placeholder="https://… or project.html?p=…" autocomplete="off" />
        <button type="button" class="icon-btn danger" aria-label="Remove link" title="Remove link">${icon("a-x")}</button>`;
      const [label, url] = qsa("input", row);
      label.value = link.label || "";
      url.value = link.url || "";
      qs("button", row).addEventListener("click", () => { row.remove(); onChange(); });
      rows.append(row);
      return row;
    };
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "link-btn rep-links__add";
    addBtn.innerHTML = `${icon("a-plus")} Add link`;
    addBtn.addEventListener("click", () => { qs("input", add()).focus(); onChange(); });
    (links || []).forEach(add);
    wrap.append(rows, addBtn);
    return () => qsa(".rep-links__row", rows)
      .map((r) => { const [label, url] = qsa("input", r); return { label: label.value.trim(), url: url.value.trim() }; })
      .filter((l) => l.url);
  }

  function createRepeater(section, onChange) {
    const group = document.createElement("section");
    group.className = "card group";
    group.innerHTML = `
      <header class="group__head">
        <span class="group__icon">${icon(section.icon)}</span>
        <div><h3 class="group__title">${esc(section.title)}</h3><p class="group__desc">${esc(section.desc)}</p></div>
      </header>
      <div class="rep__items"></div>
      <button type="button" class="list-editor__add">${icon("a-plus")} ${esc(section.add)}</button>`;
    const list = qs(".rep__items", group);
    const getters = new Map();   // entry element → function returning its data

    function entry(data = {}) {
      const el = document.createElement("div");
      el.className = "rep__item";
      el.innerHTML = `
        <span class="rep__tools">
          <button type="button" class="icon-btn" data-act="up" aria-label="Move up" title="Move up">${icon("a-left")}</button>
          <button type="button" class="icon-btn" data-act="down" aria-label="Move down" title="Move down">${icon("a-right")}</button>
          <button type="button" class="icon-btn danger" data-act="remove" aria-label="Remove" title="Remove">${icon("a-trash")}</button>
        </span>
        <div class="rep__body"></div>`;
      const body = qs(".rep__body", el);
      const fields = {};
      let pair = null;   // a two-column row for half-width fields
      for (const f of section.fields) {
        const wrap = document.createElement(f.type === "tags" || f.type === "links" ? "div" : "label");
        wrap.className = "field";
        wrap.innerHTML = `<span class="field__label">${esc(f.label)}${f.hint ? `<span class="field__hint">${esc(f.hint)}</span>` : ""}</span>`;
        if (f.type === "lines") {
          const ta = document.createElement("textarea");
          ta.rows = 3;
          ta.dataset.autogrow = "";
          ta.placeholder = f.placeholder || "";
          ta.value = (data[f.name] || []).join("\n");
          wrap.append(ta);
          fields[f.name] = () => lines(ta.value);
        } else if (f.type === "tags") {
          const box = document.createElement("div");
          box.className = "tags";
          box.innerHTML = `<div class="tags__list"></div><input type="text" placeholder="${esc(f.placeholder || "")}" aria-label="${esc(f.label)}" />`;
          wrap.append(box);
          const tags = createTagInput(box, onChange);
          tags.set(data[f.name] || []);
          fields[f.name] = tags.get;
        } else if (f.type === "links") {
          fields[f.name] = linksField(wrap, data[f.name], onChange);
        } else if (f.type === "select") {
          const select = document.createElement("select");
          select.innerHTML = f.options.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join("");
          select.value = data[f.name] || f.options[0][0];
          select.addEventListener("change", onChange);
          wrap.append(select);
          fields[f.name] = () => select.value;
        } else {
          const input = document.createElement("input");
          input.autocomplete = "off";
          input.placeholder = f.placeholder || "";
          input.value = data[f.name] || "";
          wrap.append(input);
          fields[f.name] = () => input.value.trim();
        }
        if (f.help) wrap.insertAdjacentHTML("beforeend", `<span class="field__help">${esc(f.help)}</span>`);
        if (f.half) {
          if (!pair) { pair = document.createElement("div"); pair.className = "two"; body.append(pair); }
          pair.append(wrap);
          if (pair.children.length === 2) pair = null;
        } else {
          pair = null;
          body.append(wrap);
        }
      }
      el.dataset.label = section.fields[0].name;   // the field that names this entry (used when removing it)
      getters.set(el, () => Object.fromEntries(Object.entries(fields).map(([k, get]) => [k, get()])));
      return el;
    }

    const refreshTools = () => {
      const items = [...list.children];
      items.forEach((el, i) => {
        qs('[data-act="up"]', el).disabled = i === 0;
        qs('[data-act="down"]', el).disabled = i === items.length - 1;
      });
      qs(".list-editor__add", group).hidden = Boolean(section.max) && items.length >= section.max;
    };

    list.addEventListener("click", (e) => {
      const button = e.target.closest("[data-act]");
      if (!button) return;
      const el = button.closest(".rep__item");
      const act = button.dataset.act;
      if (act === "up" && el.previousElementSibling) el.previousElementSibling.before(el);
      else if (act === "down" && el.nextElementSibling) el.nextElementSibling.after(el);
      else if (act === "remove") {
        const label = getters.get(el)?.()[el.dataset.label] || section.blank.toLowerCase();
        if (!confirm(`Remove “${label}”? It's only gone for good once you save.`)) return;
        getters.delete(el);
        el.remove();
      }
      refreshTools();
      onChange();
    });
    group.addEventListener("input", onChange);
    qs(".list-editor__add", group).addEventListener("click", () => {
      const el = entry();
      list.append(el);
      refreshTools();
      onChange();
      qs("input, textarea", el)?.focus();
    });

    return {
      el: group,
      set(items) {
        getters.clear();
        list.replaceChildren(...(items || []).map(entry));
        refreshTools();
        requestAnimationFrame(() => growAll(list));
      },
      get: () => [...list.children].map((el) => getters.get(el)?.()).filter(Boolean)
    };
  }

  const resumeEditors = RESUME_SECTIONS.map((section) => ({ key: section.key, ...createRepeater(section, () => setDirty(true)) }));
  qs("#resumeSections").replaceChildren(...resumeEditors.map((r) => r.el));

  function renderResumeHint() {
    const r = state.resume;
    qs("#resumeHint").textContent = !r
      ? "Couldn't load the resume. Refresh the page to try again."
      : r.saved
        ? `Last saved ${formatDate(r.updatedAt)}. Changes appear on your resume page after you save.`
        : "This is your current resume. Edit anything and press Save; from then on it's managed here.";
  }

  function renderPdf() {
    const pdf = state.resume?.pdf;
    qs("#pdfName").textContent = pdf ? pdf.name : "Resume.pdf";
    qs("#pdfMeta").textContent = pdf
      ? `${Math.max(1, Math.round(pdf.size / 1024))} KB · uploaded ${formatDate(pdf.updatedAt)}`
      : "The original PDF that ships with the site";
    qs("#pdfOpen").href = `resume.pdf?v=${pdf ? new Date(pdf.updatedAt).getTime() : "original"}`;
    qs("#pdfReset").hidden = !pdf;
  }

  function openResume() {
    qs("#resumePanel").hidden = false;
    resumeEditors.forEach((r) => r.set(state.resume?.resume?.[r.key] || []));
    renderResumeHint();
    renderPdf();
    setDirty(false);
  }

  qs("#saveResume").addEventListener("click", async () => {
    const button = qs("#saveResume");
    busy(button, true);
    try {
      const body = Object.fromEntries(resumeEditors.map((r) => [r.key, r.get()]));
      const saved = await api("/api/admin/resume", { method: "PUT", body });
      state.resume = { ...state.resume, ...saved };
      setDirty(false);
      renderResumeHint();
      toast("Resume saved.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      busy(button, false);
    }
  });

  /* Resume PDF: uploaded through this server (it's small) and stored in the database. */
  (function pdfUploader() {
    const root = qs("#pdfDrop");
    const file = qs(".dropzone__file", root);
    const area = qs(".dropzone__area", root);
    const progress = qs(".dropzone__progress", root);
    const note = qs(".dropzone__note", root);
    const setNote = (text = "", tone = "") => { note.textContent = text; note.className = `dropzone__note ${tone}`.trim(); };
    const MAX_PDF_BYTES = 4 * 1024 * 1024;
    let uploading = false;

    async function upload(pdf) {
      if (uploading || !pdf) return;
      if (pdf.type !== "application/pdf" && !/\.pdf$/i.test(pdf.name)) return setNote("Choose a PDF file.", "error");
      if (pdf.size > MAX_PDF_BYTES) return setNote(`That PDF is ${(pdf.size / 1048576).toFixed(1)} MB. The limit is 4 MB.`, "error");
      if (!confirm(`Replace the resume PDF on your site with “${pdf.name}”? Visitors get the new one straight away.`)) return;
      uploading = true;
      root.classList.add("is-uploading");
      progress.hidden = false;
      setNote(`Uploading ${pdf.name}…`);
      try {
        let res;
        try {
          res = await fetch("/api/admin/resume/pdf", {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/pdf", "X-File-Name": encodeURIComponent(pdf.name) },
            body: pdf
          });
        } catch { throw new Error("Upload failed. Check your connection."); }
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) showLogin("Your session expired. Sign in again.");
        if (!res.ok) throw new Error(data.error || "Upload failed.");
        state.resume = { ...state.resume, pdf: data };
        renderPdf();
        setNote("Replaced. The PDF Resume button now downloads this file.");
        toast("Resume PDF replaced.");
      } catch (error) {
        setNote(error.message, "error");
      } finally {
        uploading = false;
        root.classList.remove("is-uploading");
        progress.hidden = true;
        file.value = "";
      }
    }

    const browse = () => { if (!uploading) file.click(); };
    area.addEventListener("click", browse);
    area.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); browse(); } });
    file.addEventListener("change", () => upload(file.files[0]));
    ["dragenter", "dragover"].forEach((type) => area.addEventListener(type, (e) => { e.preventDefault(); root.classList.add("is-over"); }));
    ["dragleave", "dragend"].forEach((type) => area.addEventListener(type, () => root.classList.remove("is-over")));
    area.addEventListener("drop", (e) => {
      e.preventDefault();
      root.classList.remove("is-over");
      upload(e.dataTransfer.files[0]);
    });

    qs("#pdfReset").addEventListener("click", async () => {
      if (!confirm("Remove the uploaded PDF and go back to the original Resume.pdf that ships with the site?")) return;
      try {
        await api("/api/admin/resume/pdf", { method: "DELETE" });
        state.resume = { ...state.resume, pdf: null };
        renderPdf();
        setNote("Back to the original PDF.");
      } catch (error) {
        setNote(error.message, "error");
      }
    });
  })();

  /* ---------- Profile (home page intro, "what I do" cards, social links) ---------- */
  const prf = qs("#profileForm");
  const profilePhoto = createDropzone(qs("#profilePhoto"), () => setDirty(true));
  const focusEditor = createRepeater({
    key: "focus", title: "What I do", icon: "a-layers", add: "Add card", blank: "New card", max: 4,
    desc: "The cards under your intro on the home page (up to four).",
    fields: [
      { name: "title", label: "Title", placeholder: "Full-Stack Dev" },
      { name: "text", label: "Description", placeholder: "React, Node, Express, MongoDB — end-to-end product engineering." },
      { name: "icon", label: "Icon", type: "select", options: ICONS }
    ]
  }, () => setDirty(true));
  qs("#focusSection").replaceWith(focusEditor.el);
  prf.addEventListener("input", () => { setDirty(true); updateCounters(prf); });

  const SOCIALS = ["github", "linkedin", "x", "email"];

  function openProfile() {
    qs("#profilePanel").hidden = false;
    const r = state.profile;
    const p = r?.profile || {};
    ["eyebrow", "name", "tagline", "bio"].forEach((k) => { prf.elements[k].value = p[k] || ""; });
    SOCIALS.forEach((k) => { prf.elements[k].value = p.socials?.[k] || ""; });
    profilePhoto.set(p.photo || "");
    focusEditor.set(p.focus || []);
    updateCounters(prf);
    requestAnimationFrame(() => growAll(prf));
    qs("#profileHint").textContent = !r
      ? "Couldn't load your profile. Refresh the page to try again."
      : r.saved
        ? `Last saved ${formatDate(r.updatedAt)}. Changes appear on your site after you save.`
        : "This is your current home page intro. Edit anything and press Save; from then on it's managed here.";
    setDirty(false);
  }

  qs("#saveProfile").addEventListener("click", async () => {
    const v = (k) => prf.elements[k].value.trim();
    if (!v("name")) {
      prf.elements.name.classList.add("is-invalid");
      prf.elements.name.focus();
      toast("Add your name before saving.", true);
      return;
    }
    prf.elements.name.classList.remove("is-invalid");
    const body = {
      eyebrow: v("eyebrow"), name: v("name"), tagline: v("tagline"), bio: v("bio"),
      photo: profilePhoto.get(),
      focus: focusEditor.get(),
      socials: Object.fromEntries(SOCIALS.map((k) => [k, v(k)]))
    };
    const button = qs("#saveProfile");
    busy(button, true);
    try {
      state.profile = await api("/api/admin/profile", { method: "PUT", body });
      openProfile();   // show exactly what was saved (e.g. a link that wasn't a web address is cleared)
      toast("Profile saved.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      busy(button, false);
    }
  });

  /* ---------- Start ---------- */
  (async function boot() {
    try {
      const me = await api("/api/auth/me");
      await enterDashboard(me.email);
    } catch (error) {
      showLogin(error.status === 401 ? "" : error.message);
    }
  })();
})();
