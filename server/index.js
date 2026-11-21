require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { Project, Admin, Post, Resume, ResumePdf } = require("./models");
const DEFAULT_RESUME = require("./resume-default");
const { importRepo, listRepos, GitHubError } = require("./github");
const { storeImage, uploadStorage, videoUploadSignature, UploadError, MAX_BYTES } = require("./uploads");

const app = express();
const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT || 3000);
const onVercel = Boolean(process.env.VERCEL);
const isProduction = process.env.NODE_ENV === "production" || onVercel;
const githubUser = process.env.GITHUB_USER || "Abhay172005";

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  throw new Error("MONGODB_URI and JWT_SECRET must be set (in .env locally, or in the Vercel project's Environment Variables).");
}

/* One shared MongoDB connection. On Vercel each function instance connects on its first request
   and reuses the connection afterwards; a failed attempt is retried on the next request. */
let connecting = null;
function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  connecting ??= mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
    .catch((error) => { connecting = null; throw error; });
  return connecting;
}

app.disable("x-powered-by");
if (onVercel) app.set("trust proxy", 1); // real visitor IPs for the login rate limit
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", async (_req, res, next) => {
  try { await connectDb(); next(); } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    res.status(503).json({ error: "The database is unavailable right now. Please try again shortly." });
  }
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

function tokenFor(admin) {
  return jwt.sign({ sub: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: "8h" });
}

function setSession(res, token) {
  res.cookie("portfolio_admin", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
    maxAge: 8 * 60 * 60 * 1000,
    path: "/"
  });
}

async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies.portfolio_admin;
    if (!token) return res.status(401).json({ error: "Sign in required." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.sub);
    if (!admin) return res.status(401).json({ error: "Session is no longer valid." });
    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ error: "Session is invalid or expired." });
  }
}

const toSlug = (value) => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function cleanProject(body) {
  const asList = (value) => Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];
  const project = {
    slug: toSlug(body.slug),
    name: String(body.name || "").trim(),
    tagline: String(body.tagline || "").trim(),
    image: String(body.image || "").trim(),
    video: String(body.video || "").trim(),
    about: asList(body.about),
    highlights: asList(body.highlights),
    tech: asList(body.tech),
    repo: String(body.repo || "").trim(),
    live: String(body.live || "").trim(),
    demo: String(body.demo || "").trim(),
    icon: String(body.icon || "i-code").trim(),
    hue: Number.isFinite(Number(body.hue)) ? Number(body.hue) : 190,
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0
  };
  // Only change the home-page setting when the request actually sends it.
  if (typeof body.showOnHome === "boolean") project.showOnHome = body.showOnHome;
  return project;
}

app.get("/api/projects", async (_req, res, next) => {
  try { res.json(await Project.find().sort({ order: 1, createdAt: -1 }).lean()); } catch (error) { next(error); }
});

app.post("/api/auth/login", loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const admin = await Admin.findOne({ email });
    if (!admin || !(await bcrypt.compare(String(req.body.password || ""), admin.passwordHash))) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }
    setSession(res, tokenFor(admin));
    res.json({ email: admin.email });
  } catch (error) { next(error); }
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("portfolio_admin", { httpOnly: true, sameSite: "strict", secure: isProduction, path: "/" });
  res.status(204).end();
});

app.get("/api/auth/me", requireAdmin, (req, res) => res.json({ email: req.admin.email }));

app.get("/api/admin/projects", requireAdmin, async (_req, res, next) => {
  try { res.json(await Project.find().sort({ order: 1, createdAt: -1 }).lean()); } catch (error) { next(error); }
});

app.post("/api/admin/projects", requireAdmin, async (req, res, next) => {
  try {
    const project = cleanProject(req.body);
    if (!project.name || !project.tagline || !project.slug) return res.status(400).json({ error: "Name, tagline and slug are required." });
    res.status(201).json(await Project.create(project));
  } catch (error) { next(error); }
});

app.put("/api/admin/projects/:id", requireAdmin, async (req, res, next) => {
  try {
    const project = cleanProject(req.body);
    if (!project.name || !project.tagline || !project.slug) return res.status(400).json({ error: "Name, tagline and slug are required." });
    const updated = await Project.findByIdAndUpdate(req.params.id, project, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: "Project not found." });
    res.json(updated);
  } catch (error) { next(error); }
});

app.put("/api/admin/projects-order", requireAdmin, async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    await Promise.all(ids.map((id, order) => Project.updateOne({ _id: id }, { order })));
    res.json(await Project.find().sort({ order: 1, createdAt: -1 }).lean());
  } catch (error) { next(error); }
});

app.delete("/api/admin/projects/:id", requireAdmin, async (req, res, next) => {
  try {
    const removed = await Project.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: "Project not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});

/* ---------- Image uploads ---------- */
app.get("/api/admin/upload-status", requireAdmin, (_req, res) => res.json({ storage: uploadStorage() }));

// Videos are too big to pass through this server (Vercel caps requests at 4.5 MB), so the dashboard
// uploads them straight to Cloudinary using a short-lived signature from here.
app.get("/api/admin/video-signature", requireAdmin, (_req, res) => {
  const signed = videoUploadSignature();
  if (!signed) return res.status(503).json({ error: "Video uploads need Cloudinary. Add CLOUDINARY_URL to your settings." });
  res.json(signed);
});

app.post("/api/admin/upload", requireAdmin, express.raw({ type: () => true, limit: MAX_BYTES }), async (req, res, next) => {
  try { res.status(201).json(await storeImage(req.body)); } catch (error) { next(error); }
});

/* ---------- GitHub import ---------- */
app.get("/api/admin/github/repos", requireAdmin, async (_req, res, next) => {
  try {
    const [repos, projects] = await Promise.all([listRepos(githubUser), Project.find({}, { repo: 1 }).lean()]);
    const imported = new Set(projects.map((p) => String(p.repo || "").toLowerCase().replace(/\/+$/, "")));
    res.json({ user: githubUser, repos: repos.map((r) => ({ ...r, imported: imported.has(r.url.toLowerCase()) })) });
  } catch (error) { next(error); }
});

app.get("/api/admin/github/import", requireAdmin, async (req, res, next) => {
  try { res.json(await importRepo(req.query.repo, githubUser)); } catch (error) { next(error); }
});

/* ---------- Blog ---------- */
function cleanPost(body) {
  const title = String(body.title || "").trim();
  return {
    title,
    slug: toSlug(body.slug || title),
    excerpt: String(body.excerpt || "").trim(),
    content: String(body.content || ""),
    cover: String(body.cover || "").trim(),
    tags: Array.isArray(body.tags) ? [...new Set(body.tags.map((t) => String(t).trim()).filter(Boolean))] : [],
    published: Boolean(body.published)
  };
}

const publicPost = { content: 0 };

app.get("/api/posts", async (_req, res, next) => {
  try { res.json(await Post.find({ published: true }, publicPost).sort({ publishedAt: -1 }).lean()); } catch (error) { next(error); }
});

app.get("/api/posts/:slug", async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: String(req.params.slug).toLowerCase(), published: true }).lean();
    if (!post) return res.status(404).json({ error: "Post not found." });
    res.json(post);
  } catch (error) { next(error); }
});

app.get("/api/admin/posts", requireAdmin, async (_req, res, next) => {
  try { res.json(await Post.find().sort({ updatedAt: -1 }).lean()); } catch (error) { next(error); }
});

app.post("/api/admin/posts", requireAdmin, async (req, res, next) => {
  try {
    const post = cleanPost(req.body);
    if (!post.title || !post.slug) return res.status(400).json({ error: "A title is required." });
    if (post.published) post.publishedAt = new Date();
    res.status(201).json(await Post.create(post));
  } catch (error) { next(error); }
});

app.put("/api/admin/posts/:id", requireAdmin, async (req, res, next) => {
  try {
    const post = cleanPost(req.body);
    if (!post.title || !post.slug) return res.status(400).json({ error: "A title is required." });
    const existing = await Post.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Post not found." });
    // Keep the original publish date when re-saving; set it the first time a post goes live.
    post.publishedAt = post.published ? existing.publishedAt || new Date() : null;
    existing.set(post);
    res.json(await existing.save());
  } catch (error) { next(error); }
});

app.delete("/api/admin/posts/:id", requireAdmin, async (req, res, next) => {
  try {
    const removed = await Post.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: "Post not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});

/* ---------- Resume ---------- */
const MAX_PDF_BYTES = 4 * 1024 * 1024;   // Vercel caps requests at 4.5 MB; resumes are usually well under 1 MB
const RESUME_SECTIONS = ["education", "experience", "certifications", "activities", "skills"];

function cleanResume(body) {
  const text = (v, max = 300) => String(v ?? "").trim().slice(0, max);
  const list = (v, max = 40, len = 600) => (Array.isArray(v) ? v.map((s) => text(s, len)).filter(Boolean).slice(0, max) : []);
  const items = (v, fn) => (Array.isArray(v) ? v.slice(0, 40).map(fn).filter((e) => Object.values(e).some((x) => (Array.isArray(x) ? x.length : x))) : []);
  const entry = (e = {}) => ({ title: text(e.title), org: text(e.org), date: text(e.date, 80), place: text(e.place, 80) });
  return {
    education: items(body.education, (e) => ({ ...entry(e), chips: list(e?.chips, 20, 80) })),
    experience: items(body.experience, (e) => ({
      ...entry(e),
      bullets: list(e?.bullets, 20, 800),
      links: items(e?.links, (l) => ({ label: text(l?.label, 60), url: text(l?.url, 500) })).filter((l) => l.url)
    })),
    certifications: items(body.certifications, (e) => ({ title: text(e?.title), org: text(e?.org) })),
    activities: items(body.activities, entry),
    skills: items(body.skills, (s) => ({ label: text(s?.label, 60), items: list(s?.items, 40, 60) }))
  };
}

const pick = (doc) => Object.fromEntries(RESUME_SECTIONS.map((k) => [k, doc[k] || []]));
const pdfInfo = (pdf) => (pdf ? { name: pdf.name, size: pdf.size, updatedAt: pdf.updatedAt } : null);
const pdfMeta = () => ResumePdf.findOne({ key: "main" }, { data: 0 }).lean();

// Public: the saved resume (null until it's first saved; the page then keeps its built-in content).
app.get("/api/resume", async (_req, res, next) => {
  try {
    const [doc, pdf] = await Promise.all([Resume.findOne({ key: "main" }).lean(), pdfMeta()]);
    res.json({ resume: doc ? { ...pick(doc), updatedAt: doc.updatedAt } : null, pdf: pdfInfo(pdf) });
  } catch (error) { next(error); }
});

app.get("/api/admin/resume", requireAdmin, async (_req, res, next) => {
  try {
    const [doc, pdf] = await Promise.all([Resume.findOne({ key: "main" }).lean(), pdfMeta()]);
    res.json({ resume: doc ? pick(doc) : DEFAULT_RESUME, saved: Boolean(doc), updatedAt: doc?.updatedAt || null, pdf: pdfInfo(pdf) });
  } catch (error) { next(error); }
});

app.put("/api/admin/resume", requireAdmin, async (req, res, next) => {
  try {
    const doc = await Resume.findOneAndUpdate({ key: "main" }, { $set: cleanResume(req.body) }, { upsert: true, new: true }).lean();
    res.json({ resume: pick(doc), saved: true, updatedAt: doc.updatedAt });
  } catch (error) { next(error); }
});

// Replace the downloadable PDF. Takes effect immediately.
app.put("/api/admin/resume/pdf", requireAdmin, express.raw({ type: () => true, limit: MAX_PDF_BYTES }), async (req, res, next) => {
  try {
    const data = req.body;
    if (!Buffer.isBuffer(data) || !data.length) return res.status(400).json({ error: "No file was received." });
    if (data.subarray(0, 5).toString("latin1") !== "%PDF-") return res.status(415).json({ error: "That file isn't a PDF." });
    let name = String(req.get("X-File-Name") || "Resume.pdf");
    try { name = decodeURIComponent(name); } catch { /* keep as sent */ }
    name = name.replace(/[^\p{L}\p{N} ._()-]/gu, "").slice(0, 120) || "Resume.pdf";
    const pdf = await ResumePdf.findOneAndUpdate({ key: "main" }, { $set: { name, size: data.length, data } }, { upsert: true, new: true, projection: { data: 0 } }).lean();
    res.json(pdfInfo(pdf));
  } catch (error) { next(error); }
});

// Go back to the Resume.pdf that ships with the site.
app.delete("/api/admin/resume/pdf", requireAdmin, async (_req, res, next) => {
  try { await ResumePdf.deleteOne({ key: "main" }); res.status(204).end(); } catch (error) { next(error); }
});

/* The resume PDF everyone downloads: the latest upload, or the site's Resume.pdf if there isn't one.
   (On Vercel, vercel.json routes /resume.pdf here; locally this runs before the static files.) */
app.get("/resume.pdf", async (req, res, next) => {
  // Express matches paths case-insensitively; let /Resume.pdf (the built-in file) through to the static files.
  if (req.path !== "/resume.pdf") return next();
  try {
    await connectDb();
    const pdf = await ResumePdf.findOne({ key: "main" }).lean();
    if (!pdf) return res.redirect(302, "/Resume.pdf");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Abhay-Mittal-Resume.pdf"',
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Last-Modified": new Date(pdf.updatedAt).toUTCString()
    });
    res.send(Buffer.from(pdf.data.buffer ?? pdf.data));
  } catch (error) {
    console.error("Resume PDF failed:", error.message);
    res.redirect(302, "/Resume.pdf");   // never leave the download button broken
  }
});

// On Vercel the CDN serves public/ and only /api reaches this app; locally Express serves both.
app.use(express.static(publicDir, { dotfiles: "ignore", index: "index.html" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), { dotfiles: "ignore" }));
app.use((error, req, res, _next) => {
  if (error?.code === 11000) return res.status(409).json({ error: "That slug is already used. Pick a different one." });
  if (error instanceof GitHubError || error instanceof UploadError) return res.status(error.status).json({ error: error.message });
  if (error?.name === "CastError") return res.status(404).json({ error: "Not found." });
  if (error?.type === "entity.too.large") {
    const message = req.path === "/api/admin/upload" ? `Images must be ${MAX_BYTES / 1048576} MB or smaller.`
      : req.path === "/api/admin/resume/pdf" ? `The PDF must be ${MAX_PDF_BYTES / 1048576} MB or smaller.`
      : "That is too large to save.";
    return res.status(413).json({ error: message });
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

// Vercel imports the app (api/index.js); `npm run dev` / `npm start` run this file directly.
if (require.main === module) {
  connectDb().then(() => {
    app.listen(port, () => console.log(`Portfolio running at http://localhost:${port}`));
  }).catch((error) => { console.error("MongoDB connection failed:", error.message); process.exit(1); });
}

module.exports = app;
