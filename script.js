/* ============================================
   Abhay Mittal — Portfolio
   Shared by index, projects, project, resume
   ============================================ */

const GITHUB_USER = "Abhay172005";
const repo = (name) => `https://github.com/${GITHUB_USER}/${name}`;

/* ---------- Projects ----------
   Order here is the order shown. The first FEATURED_COUNT appear on the home page.
   Optional fields per project:
     image: "https://…"              screenshot that replaces the generated cover
     live:  "https://…"              adds a Live button / icon
     demo:  "https://youtube.com/…"  adds a Demo button / icon
*/
const FEATURED_COUNT = 4;

const PROJECTS = [
  {
    slug: "crimelens",
    image: "https://res.cloudinary.com/e1kdp0xz/image/upload/f_auto,q_auto,c_limit,w_2000/v1795053449/portfolio/gogwv2h8q8bstae0ifee.png",
    name: "CrimeLens",
    tagline: "AI forensic investigation suite.",
    about: [
      "CrimeLens is a full-stack forensic investigation platform for crime-scene analysis, live surveillance monitoring and suspect profiling. An investigator uploads scene photos and gets automated object detection plus an AI-written forensic read of the scene, then manages the whole case from a single dashboard.",
    ],
    highlights: [
      "Multi-stage pipeline chaining a YOLOv8 detection microservice (Python), LLaMA 4 Scout vision analysis via Groq, and a weighted 0–100 threat score with 5 severity levels.",
      "Weighted suspect matching on crime type, weapon, modus operandi and Haversine geographic proximity, returning a top-5 suspect ranking from a criminal-records database.",
      "Live webcam monitoring with threat alerts, 2 km crime-cluster mapping (Leaflet), case management and PDF report export, across a 7-page React app and a JWT-secured Express REST API.",
    ],
    tech: ["React", "Node.js", "Express", "MongoDB", "YOLOv8", "Groq", "Leaflet", "Python"],
    icon: "i-search",
    hue: 350,
    repo: repo("Crime_Lens"),
  },
  {
    slug: "autocollect",
    image: "https://res.cloudinary.com/e1kdp0xz/image/upload/f_auto,q_auto,c_limit,w_2000/v1795053448/portfolio/qyd5xhzwjw8tjqcprzfo.png",
    name: "AutoCollect",
    tagline: "Smart receivables & payment reminders.",
    about: [
      "AutoCollect is a receivables management platform for small businesses. A merchant imports the pending-bills report from their accounting software, reviews the extracted invoices, and then sees what is outstanding, what is overdue and which customers to follow up with.",
    ],
    highlights: [
      "Manages invoices, outstanding payments and overdue accounts, with automated invoice extraction from PDF, Excel and CSV reports, bill reconciliation and due-date calculation.",
      "Meta WhatsApp Cloud API integration for single and bulk payment reminders, with webhook-based delivery and read tracking.",
      "JWT authentication with merchant-level data isolation, so every query is scoped to the signed-in business.",
    ],
    tech: ["React", "Node.js", "Express", "MongoDB", "Tailwind CSS", "WhatsApp Cloud API"],
    icon: "i-file",
    hue: 168,
    repo: repo("AutoCollect"),
  },
  {
    slug: "robust-deepfake-detection",
    image: "https://res.cloudinary.com/e1kdp0xz/image/upload/f_auto,q_auto,c_limit,w_2000/v1795053450/portfolio/vxzku8vckfwvxhfokfbc.png",
    name: "Robust Deepfake Detection",
    tagline: "Does the detector survive compression?",
    about: [
      "A video deepfake detector and a study of how well it holds up under compression and on unseen data, built during my deep learning internship at the Computer Vision & Biometrics Lab, IIIT Allahabad.",
      "Each video is reduced to 8 face crops, and an EfficientNet-B0 + GRU model outputs one probability that the face was manipulated.",
    ],
    highlights: [
      "Video-level detector in PyTorch (EfficientNet-B0 + GRU, 5.3M params) trained on FaceForensics++ — 8,640 videos, 5 manipulation methods, C23 & C40 — reaching 0.91 test ROC-AUC.",
      "Preprocessing pipeline with OpenCV YuNet face detection, face tracking and 224×224 cropping, deployed as a React + FastAPI web demo for video inference.",
      "Paired C23/C40 fine-tuning and chained degradation augmentation raised AUC on JPEG-compressed + downsampled video from 0.745 to 0.794 (single run).",
      "Evaluated on 6,862 unseen DFD videos and real H.264 re-encoding with bootstrap 95% CIs and a 3-seed study, which showed a single-run DFD gain did not replicate across seeds.",
    ],
    tech: ["Python", "PyTorch", "OpenCV", "FastAPI", "React", "NumPy"],
    icon: "i-eye",
    hue: 265,
    repo: repo("robust-deepfake-detection"),
  },
  {
    slug: "rippleai",
    image: "https://res.cloudinary.com/e1kdp0xz/image/upload/f_auto,q_auto,c_limit,w_2000/v1795053453/portfolio/q0yqzclaeifpqugfnak0.png",
    name: "RippleAI",
    tagline: "Detect the signal before it becomes the incident.",
    about: [
      "RippleAI is a real-time incident intelligence platform. It ingests live log events, scores each one against a learned statistical baseline, correlates related anomalies into a single explainable incident, and streams everything to an operations dashboard.",
    ],
    highlights: [
      "Async FastAPI event pipeline with a pure-Python statistical detection engine (Z-score over a sliding baseline).",
      "Correlation service that groups anomaly signals into incidents with a timeline, plus AI root-cause analysis, what-if simulation and remediation proposals.",
      "Live React dashboard fed over WebSockets, with a scenario simulator that generates realistic traffic for demos.",
    ],
    tech: ["FastAPI", "Python", "WebSockets", "React", "Recharts", "Groq"],
    icon: "i-activity",
    hue: 200,
    repo: repo("Ripple_AI"),
  },
  {
    slug: "smart-elderly-fall-detection",
    image: "https://res.cloudinary.com/e1kdp0xz/image/upload/f_auto,q_auto,c_limit,w_2000/v1795053454/portfolio/dsspsptccakqo8wautge.png",
    name: "Smart Elderly Fall Detection",
    tagline: "Protection that notices. Response that matters.",
    about: [
      "Smart Elderly Fall Detection is a video-based safety portal that monitors for falls, verifies a suspected incident before alerting, and gives caregivers the evidence and context they need to respond.",
    ],
    highlights: [
      "Processes video monitoring streams to identify potential falls and uses a configurable verification window before raising an alarm.",
      "Equips care teams with incident evidence, a clear event summary and a report to support a timely response.",
      "Provides a focused portal experience for starting monitoring and reviewing how the detection workflow operates.",
    ],
    tech: ["Python", "FastAPI", "OpenCV", "React"],
    icon: "i-eye",
    hue: 218,
    repo: repo("Elderly-Fall-Detection"),
  },
  {
    slug: "freight-mind",
    image: "https://res.cloudinary.com/e1kdp0xz/image/upload/f_auto,q_auto,c_limit,w_2000/v1795053451/portfolio/ts5suuqh9dmdeey5mepr.png",
    name: "Freight Mind",
    tagline: "Predict shipment delays before they become costly disruptions.",
    about: [
      "Freight Mind is an AI-powered predictive delay intelligence platform for logistics and supply-chain teams. It combines historical shipment data with live weather and news signals to estimate shipment delay risks, assess financial exposure, explain contributing factors, and recommend actionable mitigation strategies.",
      "The platform provides a unified operational dashboard where users can analyze shipment risks, understand prediction drivers, visualize routes, and compare alternative transportation options."
    ],
    highlights: [
      "Predicts shipment delay probability and expected duration using Random Forest and XGBoost machine learning models.",
      "Integrates SHAP-based explainability to identify and visualize the key factors influencing each delay prediction.",
      "Enriches shipment assessments with live weather information from OpenWeather and relevant logistics news through NewsAPI.",
      "Uses the OpenAI API to generate AI-powered risk assessments, mitigation recommendations, and alternative transportation mode comparisons.",
      "Estimates financial exposure, including holding costs, potential penalties, and revenue at risk, while visualizing shipment routes through MapLibre GL JS and OpenFreeMap."
    ],
    tech: [
      "React",
      "Vite",
      "Tailwind CSS",
      "Node.js",
      "Express",
      "Python",
      "FastAPI",
      "scikit-learn",
      "XGBoost",
      "SHAP",
      "OpenAI API",
      "Supabase PostgreSQL",
      "OpenWeather",
      "NewsAPI",
      "MapLibre GL JS",
      "OpenFreeMap"
    ],
    icon: "i-truck",
    hue: 35,
    repo: repo("Freight-Mind"),
  },
];

/* Small brand logos for tech chips (slug/colour on cdn.simpleicons.org). */
const TECH_ICONS = {
  React: "react/61DAFB",
  "Node.js": "nodedotjs/5FA04E",
  Express: "express/E2E8F0",
  MongoDB: "mongodb/47A248",
  Python: "python/4B8BBE",
  PyTorch: "pytorch/EE4C2C",
  OpenCV: "opencv/8B7CF6",
  FastAPI: "fastapi/009688",
  NumPy: "numpy/4DABCF",
  "Tailwind CSS": "tailwindcss/06B6D4",
  "WhatsApp Cloud API": "whatsapp/25D366",
  Leaflet: "leaflet/7EBC6F",
  Redis: "redis/FF4438",
  Docker: "docker/2496ED",
  JavaScript: "javascript/F7DF1E",
  Java: "openjdk/E2E8F0",
  HTML: "html5/E34F26",
  CSS: "css/663399",
  Supabase: "supabase/3FCF8E",
  PostgreSQL: "postgresql/4169E1",
  Git: "git/F05032",
  GitHub: "github/E2E8F0",
  Vercel: "vercel/E2E8F0",
};

/* "React.js" and "React" share a logo, as do "Express.js" and "Express". */
const techLogo = (name) => TECH_ICONS[name] || TECH_ICONS[String(name).replace(/\.js$/i, "")];
const logoImg = (slug) => `<img src="https://cdn.simpleicons.org/${slug}" alt="" width="14" height="14" loading="lazy" onerror="this.remove()">`;

const SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <symbol id="i-github" viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></symbol>
  <symbol id="i-linkedin" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M4 3l6.9 9.2L4.3 21h3.3l4.8-6.4L17.2 21H21l-7.2-9.6L20 3h-3.3l-4.4 5.9L7.9 3H4z"/></symbol>
  <symbol id="i-mail" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></symbol>
  <symbol id="i-code" viewBox="0 0 24 24"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></symbol>
  <symbol id="i-cpu" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></symbol>
  <symbol id="i-activity" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></symbol>
  <symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></symbol>
  <symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></symbol>
  <symbol id="i-download" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/></symbol>
  <symbol id="i-file" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></symbol>
  <symbol id="i-eye" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></symbol>
  <symbol id="i-award" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/></symbol>
  <symbol id="i-truck" viewBox="0 0 24 24"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></symbol>
  <symbol id="i-settings" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></symbol>
</defs></svg>`;
document.body.insertAdjacentHTML("afterbegin", SPRITE);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const icon = (id, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24"><use href="#${id}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

document.documentElement.classList.add("js");

/* ---------- Shared render helpers ---------- */
function chip(name) {
  const logo = techLogo(name);
  return `<span class="chip">${logo ? logoImg(logo) : ""}${esc(name)}</span>`;
}

/* Resume skills are written in the HTML; add the same logos the project cards use. */
$$(".skillgrid .chip").forEach((el) => {
  const logo = techLogo(el.textContent.trim());
  if (logo) el.insertAdjacentHTML("afterbegin", logoImg(logo));
});

function chips(list, max = Infinity) {
  const shown = list.slice(0, max).map(chip).join("");
  const extra = list.length - max;
  return shown + (extra > 0 ? `<span class="chip chip--more">+${extra}</span>` : "");
}

function cover(p, wide = false) {
  const inner = p.image
    ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">`
    : `<span class="cover__file"><i></i><i></i><i></i>${esc(p.slug)}</span>
       <span class="cover__art">${icon(p.icon, "cover__glyph")}<span class="cover__name">${esc(p.name)}</span></span>`;
  return `<div class="cover${wide ? " cover--wide" : ""}" style="--h:${p.hue}">${inner}</div>`;
}

function projectCard(p) {
  return `
    <a class="project reveal" href="project.html?p=${p.slug}">
      ${cover(p)}
      <div class="project__body">
        <div class="project__top">
          <div>
            <h3 class="project__name">${esc(p.name)}</h3>
            <p class="project__tagline">${esc(p.tagline)}</p>
          </div>
          <div class="project__marks" aria-hidden="true">
            ${p.repo ? icon("i-github") : ""}${p.live ? icon("i-arrow") : ""}${p.demo ? icon("i-play") : ""}
          </div>
        </div>
        <div class="chips">${chips(p.tech, 5)}</div>
      </div>
    </a>`;
}

/* ---------- Home: featured projects ---------- */
const featuredGrid = $("#featuredGrid");
const projectGrid = $("#projectGrid");
const detail = $("#projectDetail");

function renderDetail() {
  if (!detail) return;
  const slug = new URLSearchParams(location.search).get("p");
  const p = PROJECTS.find((x) => x.slug === slug);
  if (!p) {
    detail.innerHTML = `
      <h1 class="detail__title">Project not found</h1>
      <p class="detail__tagline">That project doesn't exist — <a class="accent" href="projects.html">see all projects</a>.</p>`;
  } else {
    document.title = `${p.name} — Abhay Mittal`;
    const btn = (href, cls, ic, label) =>
      `<a class="btn ${cls}" href="${href}" target="_blank" rel="noopener noreferrer">${icon(ic)} ${label}</a>`;
    detail.innerHTML = `
      ${cover(p, true)}
      <h1 class="detail__title">${esc(p.name)}</h1>
      <p class="detail__tagline">${esc(p.tagline)}</p>
      <div class="detail__actions">
        ${p.live ? btn(p.live, "btn--primary", "i-arrow", "Live") : ""}
        ${p.repo ? btn(p.repo, p.live ? "btn--ghost" : "btn--primary", "i-github", "Source") : ""}
        ${p.demo ? btn(p.demo, "btn--ghost", "i-play", "Demo") : ""}
      </div>
      <div class="detail__block card">
        <h2 class="detail__label">About</h2>
        ${p.about.map((t) => `<p class="detail__about">${esc(t)}</p>`).join("")}
      </div>
      ${p.highlights?.length ? `
      <div class="detail__block card">
        <h2 class="detail__label">Highlights</h2>
        <ul class="bullets bullets--lg">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
      </div>` : ""}
      <div class="detail__block">
        <h2 class="detail__label">Stack</h2>
        <div class="chips">${chips(p.tech)}</div>
      </div>`;
  }
}

/* Projects marked "show on home page" in the admin, in their saved order.
   If none are marked (or the embedded list is in use), the first FEATURED_COUNT are shown. */
function homeProjects(list = PROJECTS) {
  const chosen = list.filter((p) => p.showOnHome);
  return chosen.length ? chosen : list.slice(0, FEATURED_COUNT);
}

function renderProjects() {
  if (featuredGrid) featuredGrid.innerHTML = homeProjects().map(projectCard).join("");
  if (projectGrid) projectGrid.innerHTML = PROJECTS.map(projectCard).join("");
  renderDetail();
}

renderProjects();

/* Use database-managed projects when the portfolio is served with the admin API.
   The embedded list above remains a safe fallback for static hosting. */
(async function loadManagedProjects() {
  try {
    const res = await fetch("/api/projects", { headers: { Accept: "application/json" } });
    if (!res.ok) return;
    const managedProjects = await res.json();
    if (!Array.isArray(managedProjects) || !managedProjects.length) return;
    PROJECTS.splice(0, PROJECTS.length, ...managedProjects);
    renderProjects();
    $$(".project.reveal").forEach((el) => el.classList.add("is-visible"));
  } catch {
    // Static deployments deliberately continue using the embedded project data.
  }
})();

/* ---------- Blog (list on blog.html, single post on post.html) ---------- */
const formatPostDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

function postCard(p) {
  const tags = (p.tags || []).slice(0, 3).map(esc).join(" · ");
  return `
    <a class="post-card reveal" href="post.html?s=${encodeURIComponent(p.slug)}">
      ${p.cover ? `<div class="post-card__cover"><img src="${esc(p.cover)}" alt="" loading="lazy"></div>` : ""}
      <div class="post-card__body">
        <p class="post-card__meta">${formatPostDate(p.publishedAt)}${tags ? ` · ${tags}` : ""}</p>
        <h2 class="post-card__title">${esc(p.title)}</h2>
        ${p.excerpt ? `<p class="post-card__excerpt">${esc(p.excerpt)}</p>` : ""}
        <span class="post-card__more">Read post ${icon("i-arrow-right")}</span>
      </div>
    </a>`;
}

(async function blog() {
  const list = $("#blogList");
  const article = $("#postDetail");
  if (!list && !article) return;

  if (list) {
    const empty = `<div class="card blog-empty"><p class="detail__about">Writing about the products, systems, and machine-learning work behind my projects. New posts are on the way.</p></div>`;
    try {
      const res = await fetch("/api/posts", { headers: { Accept: "application/json" } });
      const posts = res.ok ? await res.json() : [];
      list.innerHTML = Array.isArray(posts) && posts.length ? posts.map(postCard).join("") : empty;
    } catch {
      list.innerHTML = empty;
    }
    $$(".post-card.reveal", list).forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const slug = new URLSearchParams(location.search).get("s") || "";
  const notFound = `
    <h1 class="detail__title">Post not found</h1>
    <p class="detail__tagline">That post doesn't exist or isn't published — <a class="accent" href="blog.html">see all posts</a>.</p>`;
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(res.status);
    const p = await res.json();
    document.title = `${p.title} — Abhay Mittal`;
    const minutes = typeof readingTime === "function" ? readingTime(p.content) : null;
    article.innerHTML = `
      ${p.cover ? `<div class="post__cover"><img src="${esc(p.cover)}" alt=""></div>` : ""}
      <h1 class="detail__title">${esc(p.title)}</h1>
      <p class="post__meta">${formatPostDate(p.publishedAt)}${minutes ? ` · ${minutes} min read` : ""}</p>
      ${(p.tags || []).length ? `<div class="chips post__tags">${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>` : ""}
      <div class="prose">${typeof renderMarkdown === "function" ? renderMarkdown(p.content) : `<p>${esc(p.content)}</p>`}</div>`;
  } catch {
    article.innerHTML = notFound;
  }
})();

/* ---------- Mobile nav ---------- */
const navToggle = $("#navToggle");
const navLinks = $("#navLinks");
if (navToggle && navLinks) {
  const setMenu = (open) => {
    navLinks.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open);
  };
  navToggle.addEventListener("click", () => setMenu(!navLinks.classList.contains("is-open")));
  navLinks.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
}

/* ---------- Scroll reveal ---------- */
let pending = $$(".reveal");
const revealCheck = () => {
  const limit = innerHeight - 40;
  pending = pending.filter((el) => {
    if (el.getBoundingClientRect().top > limit) return true;
    el.classList.add("is-visible");
    return false;
  });
  if (!pending.length) {
    removeEventListener("scroll", revealCheck);
    removeEventListener("resize", revealCheck);
  }
};
addEventListener("scroll", revealCheck, { passive: true });
addEventListener("resize", revealCheck);
revealCheck();

/* ---------- GitHub contribution calendar (home) ---------- */
(async function contributions() {
  const grid = $("#ghGrid");
  if (!grid) return;
  const months = $("#ghMonths");
  const total = $("#ghTotal");
  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const days = data.contributions;
    if (!days?.length) throw new Error("empty");

    // Pad so the first column starts on Sunday.
    const offset = new Date(days[0].date + "T00:00:00").getDay();
    const cells = Array(offset).fill(null).concat(days);
    grid.innerHTML = cells
      .map((d) =>
        d
          ? `<i data-l="${d.level}" title="${d.count} contribution${d.count === 1 ? "" : "s"} on ${d.date}"></i>`
          : `<i style="visibility:hidden"></i>`
      )
      .join("");

    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const weeks = Math.ceil(cells.length / 7);
    let html = "", last = -1, lastLabelWeek = -4;
    for (let w = 0; w < weeks; w++) {
      const first = cells.slice(w * 7, w * 7 + 7).find(Boolean);
      const m = first ? new Date(first.date + "T00:00:00").getMonth() : last;
      const label = m !== last && w - lastLabelWeek >= 3 && w < weeks - 1;
      if (label) lastLabelWeek = w;
      html += `<span>${label ? names[m] : ""}</span>`;
      last = m;
    }
    months.innerHTML = html;

    const count = data.total?.lastYear ?? days.reduce((s, d) => s + d.count, 0);
    total.textContent = `${count.toLocaleString()} contributions in the last year`;
    const scroller = grid.parentElement;
    scroller.scrollLeft = scroller.scrollWidth;
  } catch {
    months.remove();
    grid.remove();
    total.innerHTML = `Couldn't load the contribution calendar — <a class="accent" href="https://github.com/${GITHUB_USER}" target="_blank" rel="noopener noreferrer">view it on GitHub</a>.`;
  }
})();

/* ---------- Custom cursor: teal dot + trailing ring (mouse devices only) ---------- */
(function cursor() {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const root = document.documentElement;
  const dot = document.createElement("div");
  const ring = document.createElement("div");
  dot.className = "cursor-dot";
  ring.className = "cursor-ring";
  document.body.append(dot, ring);
  root.classList.add("has-cursor");

  let x = 0, y = 0, rx = 0, ry = 0, running = false;
  const ease = reducedMotion ? 1 : 0.18;
  const frame = () => {
    rx += (x - rx) * ease;
    ry += (y - ry) * ease;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    if (Math.abs(x - rx) + Math.abs(y - ry) > 0.1) requestAnimationFrame(frame);
    else running = false;
  };

  addEventListener("mousemove", (e) => {
    x = e.clientX; y = e.clientY;
    if (!root.classList.contains("cursor-on")) {
      rx = x; ry = y;
      root.classList.add("cursor-on");
    }
    dot.style.transform = `translate(${x}px, ${y}px)`;
    ring.classList.toggle("is-link", !!e.target.closest?.("a, button, .hero__photo"));
    if (!running) { running = true; requestAnimationFrame(frame); }
  }, { passive: true });
  addEventListener("mousedown", () => ring.classList.add("is-down"));
  addEventListener("mouseup", () => ring.classList.remove("is-down"));
  document.addEventListener("mouseleave", () => root.classList.remove("cursor-on"));
})();

/* ---------- Background particles ---------- */
(function particles() {
  const canvas = $("#particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const colors = ["94,234,212", "148,163,184", "129,140,248"];
  let w, h, dots = [], raf;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(70, Math.round((w * h) / 22000));
    dots = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.8 + 0.6,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(Math.random() * 0.25 + 0.05),
      a: Math.random() * 0.35 + 0.08,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    draw();
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.c},${d.a})`;
      ctx.fill();
    }
  };

  const step = () => {
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.y < -5) { d.y = h + 5; d.x = Math.random() * w; }
      if (d.x < -5) d.x = w + 5;
      if (d.x > w + 5) d.x = -5;
    }
    draw();
    raf = requestAnimationFrame(step);
  };

  addEventListener("resize", resize);
  resize();
  if (!reducedMotion) {
    raf = requestAnimationFrame(step);
    document.addEventListener("visibilitychange", () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(step);
    });
  }
})();
