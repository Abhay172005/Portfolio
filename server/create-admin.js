require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Admin } = require("./models");

async function run() {
  const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set MONGODB_URI, ADMIN_EMAIL, and ADMIN_PASSWORD in .env first.");
  await mongoose.connect(MONGODB_URI);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await Admin.findOneAndUpdate({ email: ADMIN_EMAIL.toLowerCase() }, { email: ADMIN_EMAIL.toLowerCase(), passwordHash }, { upsert: true, new: true, setDefaultsOnInsert: true });
  console.log(`Admin account ready for ${ADMIN_EMAIL.toLowerCase()}`);
  await mongoose.disconnect();
}
run().catch((error) => { console.error(error.message); process.exit(1); });
