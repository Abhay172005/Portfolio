const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    video: { type: String, default: "" },   // optional looping cover video; plays instead of the image
    about: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    tech: { type: [String], default: [] },
    repo: { type: String, default: "" },
    live: { type: String, default: "" },
    demo: { type: String, default: "" },
    icon: { type: String, default: "i-code" },
    hue: { type: Number, default: 190 },
    order: { type: Number, default: 0 },
    showOnHome: { type: Boolean, default: false }
  },
  { timestamps: true, versionKey: false }
);

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true, versionKey: false }
);

const postSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    cover: { type: String, default: "" },
    tags: { type: [String], default: [] },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

/* The resume page's content: one document (key "main"). Entries are plain objects; server/index.js
   cleans them before saving. */
const resumeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    education: { type: Array, default: [] },
    experience: { type: Array, default: [] },
    certifications: { type: Array, default: [] },
    activities: { type: Array, default: [] },
    skills: { type: Array, default: [] }
  },
  { timestamps: true, versionKey: false, minimize: false }
);

/* The uploaded resume PDF (one document, key "main"), kept apart so loading the resume text doesn't
   also load the file. Without one, /resume.pdf serves the Resume.pdf shipped with the site. */
const resumePdfSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    name: { type: String, default: "Resume.pdf" },
    size: { type: Number, default: 0 },
    data: { type: Buffer, required: true }
  },
  { timestamps: true, versionKey: false }
);

module.exports = {
  Project: mongoose.model("Project", projectSchema),
  Admin: mongoose.model("Admin", adminSchema),
  Post: mongoose.model("Post", postSchema),
  Resume: mongoose.model("Resume", resumeSchema),
  ResumePdf: mongoose.model("ResumePdf", resumePdfSchema)
};
