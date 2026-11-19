/* Builds a draft portfolio project from a public GitHub repository:
   repo metadata, languages and the README (intro, feature bullets, first screenshot). */

const API = "https://api.github.com";

class GitHubError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

function headers(accept = "application/vnd.github+json") {
  const h = { Accept: accept, "User-Agent": "portfolio-admin", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function gh(path, accept) {
  const res = await fetch(`${API}${path}`, { headers: headers(accept) });
  if (res.status === 404) return null;
  if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
    const reset = new Date(Number(res.headers.get("x-ratelimit-reset")) * 1000);
    const minutes = Math.max(1, Math.ceil((reset - Date.now()) / 60000));
    throw new GitHubError(`GitHub allows 60 lookups an hour without a token, and that limit is used up. Try again in about ${minutes} min, or add a GITHUB_TOKEN to .env for a much higher limit.`, 429);
  }
  if (!res.ok) throw new GitHubError(`GitHub responded with ${res.status}.`);
  return accept && accept.includes("raw") ? res.text() : res.json();
}

/** Accepts a full URL, "owner/repo", or just "repo" (assumed to belong to the default user). */
function parseRepo(input, defaultUser) {
  const text = String(input || "").trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const fromUrl = text.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/i);
  if (fromUrl) return { owner: fromUrl[1], name: fromUrl[2] };
  const pair = text.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (pair) return { owner: pair[1], name: pair[2] };
  if (/^[\w.-]+$/.test(text) && defaultUser) return { owner: defaultUser, name: text };
  throw new GitHubError("Paste a GitHub repository link, like https://github.com/user/repo.", 400);
}

/* ---------- Text helpers ---------- */
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function prettyName(repoName) {
  const words = repoName.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().split(/\s+/);
  return words.map((w) => (w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}

function stripMarkdown(s) {
  return String(s)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,:;!?]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/:[a-z0-9_+-]+:/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Turns a description into a short card tagline: first sentence, trimmed at a natural break. */
function tagline(text, projectName = "", max = 100) {
  let t = (text.match(/^.+?[.!?](\s|$)/) || [text])[0].trim();
  const intro = new RegExp(`^(${projectName.replace(/[^\w\s]/g, "").replace(/\s+/g, "\\s?")}|this (project|repo|repository|app))\\s+is\\s+(an?|the)\\s+`, "i");
  t = t.replace(intro, "");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (t.length > max) {
    const breaks = [" with ", " built ", " using ", " that ", " for ", " — ", " - ", ", "]
      .map((b) => t.indexOf(b))
      .filter((i) => i >= 30 && i <= max);
    if (breaks.length) t = t.slice(0, Math.min(...breaks));
    else t = `${t.slice(0, t.lastIndexOf(" ", max - 1))}…`;
  }
  t = t.replace(/[,;:\s]+$/, "");
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

const tidyHighlight = (t, max = 280) => {
  let s = t.replace(/\s+--\s+/g, " — ");
  if (s.length > max) s = `${s.slice(0, s.lastIndexOf(" ", max - 1))}…`;
  return s;
};

/* ---------- README parsing ---------- */
function parseReadme(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  const blocks = []; // { type: "heading"|"para"|"item", level, text }
  let inCode = false, para = [];
  const flush = () => { if (para.length) blocks.push({ type: "para", text: para.join(" ") }); para = []; };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*(```|~~~)/.test(line)) { flush(); inCode = !inCode; continue; }
    if (inCode) continue;
    const heading = line.match(/^(#{1,6})\s+(.*)$/) || line.match(/^\s*<h([1-6])[^>]*>(.*?)<\/h\1>/i);
    if (heading) {
      flush();
      const level = typeof heading[1] === "string" && heading[1].startsWith("#") ? heading[1].length : Number(heading[1]);
      blocks.push({ type: "heading", level, text: stripMarkdown(heading[2]) });
      continue;
    }
    const item = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (item) { flush(); blocks.push({ type: "item", indent: item[1].length, text: item[2] }); continue; }
    if (!line.trim() || /^\s*(>|\||<|!\[|\[!\[|---|===|\*\*\*)/.test(line)) { flush(); continue; }
    if (para.length === 0 && blocks.length && blocks[blocks.length - 1].type === "item" && /^\s{2,}/.test(raw)) {
      blocks[blocks.length - 1].text += ` ${line.trim()}`; // wrapped list item
      continue;
    }
    para.push(line.trim());
  }
  flush();

  const title = blocks.find((b) => b.type === "heading" && b.level === 1)?.text || "";

  // Intro: prose before the first section heading, else an About/Overview section.
  const isProse = (b) => b.type === "para" && stripMarkdown(b.text).length >= 40;
  const firstSection = blocks.findIndex((b) => b.type === "heading" && b.level > 1);
  let intro = blocks.slice(0, firstSection < 0 ? blocks.length : firstSection).filter(isProse);
  if (!intro.length) {
    const about = blocks.findIndex((b) => b.type === "heading" && /about|overview|introduction|description|what is/i.test(b.text));
    if (about >= 0) {
      const end = blocks.findIndex((b, i) => i > about && b.type === "heading" && b.level <= blocks[about].level);
      intro = blocks.slice(about + 1, end < 0 ? undefined : end).filter(isProse);
    }
  }
  if (!intro.length) intro = blocks.filter(isProse);
  const about = intro.slice(0, 2).map((b) => stripMarkdown(b.text)).map((t) => (t.length > 700 ? `${t.slice(0, 699)}…` : t));

  // Highlights: list items in a Features-like section, else the first substantial list.
  const listAfter = (start) => {
    const level = blocks[start].level;
    const items = [];
    for (let i = start + 1; i < blocks.length; i += 1) {
      const b = blocks[i];
      if (b.type === "heading" && b.level <= level) break;
      if (b.type === "item" && b.indent < 2) items.push(stripMarkdown(b.text));
    }
    return items;
  };
  let highlights = [];
  const featureHeading = blocks.findIndex((b) => b.type === "heading" && /feature|highlight|key|what it does|capabilit|functionalit/i.test(b.text));
  if (featureHeading >= 0) highlights = listAfter(featureHeading);
  if (!highlights.length) {
    const items = blocks.filter((b) => b.type === "item" && b.indent < 2).map((b) => stripMarkdown(b.text));
    if (items.length >= 3 && items.reduce((n, t) => n + t.length, 0) / items.length > 25) highlights = items;
  }
  highlights = highlights.filter((t) => t.length >= 12).slice(0, 6);

  return { title, about, highlights };
}

function firstImage(md, owner, name, branch) {
  const found = [
    ...[...md.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)].map((m) => ({ at: m.index, src: m[1] })),
    ...[...md.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => ({ at: m.index, src: m[1] }))
  ].sort((a, b) => a.at - b.at);
  const usable = found.map((f) => f.src).find((src) => !/shields\.io|badge|badgen|travis-ci|codecov|\/workflows\/|\.svg(\?|$)|komarev|vercel\.app\/api|readme-stats/i.test(src));
  if (!usable) return "";
  if (/^https?:\/\//i.test(usable)) {
    const blob = usable.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/i);
    return blob ? `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3].replace(/\?raw=true$/, "")}` : usable;
  }
  return `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${usable.replace(/^\.?\//, "")}`;
}

/* ---------- Tech stack ---------- */
const TECH_PATTERNS = [
  ["React", /\breact(\.js|js)?\b(?!\s*native)/i], ["React Native", /\breact native\b/i], ["Next.js", /\bnext\.?js\b/i],
  ["Vue", /\bvue(\.js|js)?\b/i], ["Angular", /\bangular\b/i], ["Svelte", /\bsvelte\b/i], ["Vite", /\bvite\b/i],
  ["Node.js", /\bnode(\.js|js)?\b/i], ["Express", /\bexpress(\.js|js)?\b/i], ["MongoDB", /\bmongo(db|ose)\b/i],
  ["PostgreSQL", /\bpostgres(ql)?\b/i], ["MySQL", /\bmysql\b/i], ["SQLite", /\bsqlite\b/i], ["Supabase", /\bsupabase\b/i],
  ["Firebase", /\bfirebase\b/i], ["Redis", /\bredis\b/i], ["Docker", /\bdocker\b/i], ["Kubernetes", /\bkubernetes\b/i],
  ["Tailwind CSS", /\btailwind(\s?css)?\b/i], ["FastAPI", /\bfastapi\b/i], ["Flask", /\bflask\b/i], ["Django", /\bdjango\b/i],
  ["PyTorch", /\bpytorch\b/i], ["TensorFlow", /\btensorflow\b/i], ["Keras", /\bkeras\b/i], ["scikit-learn", /\b(scikit-learn|sklearn)\b/i],
  ["XGBoost", /\bxgboost\b/i], ["OpenCV", /\bopencv\b/i], ["NumPy", /\bnumpy\b/i], ["Pandas", /\bpandas\b/i],
  ["YOLOv8", /\byolo\s?v?8\b/i], ["Hugging Face", /\bhugging\s?face\b/i], ["LangChain", /\blangchain\b/i],
  ["OpenAI API", /\bopenai\b/i], ["Groq", /\bgroq\b/i], ["Gemini", /\bgemini\b/i], ["Leaflet", /\bleaflet\b/i],
  ["MapLibre GL JS", /\bmaplibre\b/i], ["Recharts", /\brecharts\b/i], ["Socket.IO", /\bsocket\.?io\b/i],
  ["WebSockets", /\bwebsockets?\b/i], ["Streamlit", /\bstreamlit\b/i], ["GraphQL", /\bgraphql\b/i], ["Prisma", /\bprisma\b/i],
  ["WhatsApp Cloud API", /\bwhatsapp\b/i], ["SHAP", /\bshap\b/i]
];
const SKIP_LANGUAGES = new Set(["HTML", "CSS", "SCSS", "Shell", "Dockerfile", "Batchfile", "PowerShell", "Procfile", "Makefile", "Jupyter Notebook", "EJS", "Handlebars"]);

function detectTech(text, languages, topics) {
  const hits = TECH_PATTERNS
    .map(([label, re]) => ({ label, at: text.search(re) }))
    .filter((h) => h.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((h) => h.label);
  const topicNames = topics.map((t) => TECH_PATTERNS.find(([, re]) => re.test(t.replace(/-/g, " ")))?.[0]).filter(Boolean);
  const langs = Object.keys(languages).filter((l) => !SKIP_LANGUAGES.has(l));
  if (languages["Jupyter Notebook"] && !langs.includes("Python")) langs.push("Python");
  return [...new Set([...hits, ...topicNames, ...langs])].slice(0, 10);
}

/** Picks the cover icon whose keywords appear most often in the project's own summary. */
function guessIcon(text) {
  const rules = [
    ["i-truck", /logistic|shipment|freight|supply.chain|transport/gi],
    ["i-search", /forensic|investigat|crime|suspect/gi],
    ["i-eye", /computer vision|detect|video|camera|surveillance|face|fall/gi],
    ["i-activity", /monitor|incident|anomal|observab|alert|telemetry/gi],
    ["i-file", /invoice|pdf|document|receivable|payment|blog|article/gi],
    ["i-cpu", /machine learning|deep learning|neural|\bml\b|\bllm\b|model/gi]
  ];
  const scored = rules.map(([id, re]) => [id, (text.match(re) || []).length]).sort((a, b) => b[1] - a[1]);
  return scored[0][1] > 0 ? scored[0][0] : "i-code";
}

const hueFor = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

/* ---------- Public API ---------- */
async function importRepo(input, defaultUser) {
  const { owner, name } = parseRepo(input, defaultUser);
  const repo = await gh(`/repos/${owner}/${name}`);
  if (!repo) throw new GitHubError(`Couldn't find ${owner}/${name}. Check the link, and that the repository is public.`, 404);
  const [languages, readme] = await Promise.all([
    gh(`/repos/${repo.full_name}/languages`).then((l) => l || {}),
    gh(`/repos/${repo.full_name}/readme`, "application/vnd.github.raw+json").then((r) => r || "")
  ]);

  const parsed = parseReadme(readme);
  const title = parsed.title.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  const displayName = title && title.length <= 48 ? title : prettyName(repo.name);
  const description = stripMarkdown(repo.description || "").replace(/\s+,/g, ",");
  const about = parsed.about.length ? parsed.about : description ? [description] : [];
  const corpus = `${description}\n${readme}`;

  return {
    project: {
      name: displayName,
      slug: slugify(repo.name),
      tagline: description || about[0] ? tagline(description || about[0], displayName) : "",
      about,
      highlights: parsed.highlights.map((h) => tidyHighlight(h)),
      tech: detectTech(corpus, languages, repo.topics || []),
      repo: repo.html_url,
      live: repo.homepage && /^https?:\/\//i.test(repo.homepage) ? repo.homepage : "",
      image: firstImage(readme, repo.owner.login, repo.name, repo.default_branch) || `https://opengraph.githubassets.com/1/${repo.full_name}`,
      icon: guessIcon([displayName, description, ...about, ...parsed.highlights].join(" ")),
      hue: hueFor(repo.name)
    },
    source: { fullName: repo.full_name, stars: repo.stargazers_count, pushedAt: repo.pushed_at, hasReadme: Boolean(readme) }
  };
}

async function listRepos(user) {
  const repos = await gh(`/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed`);
  if (!repos) throw new GitHubError(`GitHub user ${user} was not found.`, 404);
  return repos
    .filter((r) => !r.fork && !r.archived)
    .map((r) => ({ name: r.name, fullName: r.full_name, url: r.html_url, description: r.description || "", language: r.language || "", stars: r.stargazers_count, pushedAt: r.pushed_at }));
}

module.exports = { importRepo, listRepos, GitHubError };
