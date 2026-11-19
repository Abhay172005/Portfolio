require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Project } = require("./models");

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in .env first.");
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "script.js"), "utf8");
  const start = source.indexOf("const PROJECTS = [");
  const end = source.indexOf("\n];", start);
  if (start < 0 || end < 0) throw new Error("Could not find the embedded projects list.");
  const declaration = source.slice(start, end + 2);
  const projects = new Function("repo", `${declaration}; return PROJECTS;`)((name) => `https://github.com/Abhay172005/${name}`);
  await mongoose.connect(process.env.MONGODB_URI);
  for (let order = 0; order < projects.length; order += 1) {
    // Newly seeded projects start with the first four on the home page; re-seeding keeps your choices.
    await Project.findOneAndUpdate(
      { slug: projects[order].slug },
      { $set: { ...projects[order], order }, $setOnInsert: { showOnHome: order < 4 } },
      { upsert: true, new: true }
    );
  }
  console.log(`Seeded ${projects.length} projects.`);
  await mongoose.disconnect();
}
run().catch((error) => { console.error(error.message); process.exit(1); });
