/* Image uploads for the admin dashboard.
   With Cloudinary configured (CLOUDINARY_URL, or the three CLOUDINARY_* variables) images go to
   Cloudinary and are served from its CDN. Without it they are saved to /uploads on this machine,
   which only works for local development: Vercel's file system is read-only. */
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

// Vercel rejects request bodies over 4.5 MB; the dashboard shrinks bigger photos before sending them.
const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

class UploadError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function cloudinaryConfig() {
  const url = process.env.CLOUDINARY_URL;
  const fromUrl = url && url.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/);
  if (fromUrl) return { apiKey: fromUrl[1], apiSecret: fromUrl[2], cloudName: fromUrl[3] };
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

/** Identifies the image type from the file's first bytes, so a renamed file can't slip through. */
function sniffType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 4, 8) === "ftyp" && /^avi[fs]$/.test(buf.toString("ascii", 8, 12))) return "image/avif";
  return null;
}

/** Cloudinary request signature: params sorted by name, joined as a=b&c=d, then the secret, SHA-1. */
function signParams(params, apiSecret) {
  const payload = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return crypto.createHash("sha1").update(payload + apiSecret).digest("hex");
}

async function uploadToCloudinary(buffer, type, { cloudName, apiKey, apiSecret }) {
  const params = { folder: process.env.CLOUDINARY_FOLDER || "portfolio", timestamp: Math.floor(Date.now() / 1000) };
  const form = new FormData();
  form.append("file", new Blob([buffer], { type }), `upload.${EXTENSIONS[type]}`);
  Object.entries(params).forEach(([k, v]) => form.append(k, String(v)));
  form.append("api_key", apiKey);
  form.append("signature", signParams(params, apiSecret));

  let res;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, { method: "POST", body: form });
  } catch {
    throw new UploadError("Couldn't reach Cloudinary. Check your internet connection.", 502);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(`Cloudinary rejected the upload: ${data.error?.message || `status ${res.status}`}.`, 502);
  // Deliver an automatically compressed, modern format (WebP/AVIF), capped at 2000px wide.
  const url = data.secure_url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_limit,w_2000/");
  return { url, storage: "cloudinary", width: data.width, height: data.height, bytes: data.bytes };
}

async function saveLocally(buffer, type) {
  const dir = path.join(__dirname, "..", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString("hex")}.${EXTENSIONS[type]}`;
  await fs.writeFile(path.join(dir, name), buffer);
  return { url: `uploads/${name}`, storage: "local", bytes: buffer.length };
}

async function storeImage(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new UploadError("No image was received.");
  if (buffer.length > MAX_BYTES) throw new UploadError(`Images must be ${MAX_BYTES / 1048576} MB or smaller.`, 413);
  const type = sniffType(buffer);
  if (!type) throw new UploadError("That file isn't a supported image. Use PNG, JPG, WebP, GIF or AVIF.", 415);
  const config = cloudinaryConfig();
  if (config) return uploadToCloudinary(buffer, type, config);
  if (process.env.VERCEL) throw new UploadError("Image uploads need Cloudinary. Add CLOUDINARY_URL to the Vercel project's Environment Variables.", 503);
  return saveLocally(buffer, type);
}

const uploadStorage = () => (cloudinaryConfig() ? "cloudinary" : "local");

module.exports = { storeImage, uploadStorage, UploadError, MAX_BYTES };
