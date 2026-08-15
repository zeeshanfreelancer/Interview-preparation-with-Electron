const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const { app } = require("electron");
const { loadPublicKey, verifyPayload } = require("./crypto");
const { REMOTE_LICENSE_MANIFEST_URL } = require("./remote-config");

const CACHE_FILE = "licenses.manifest.cache.json";
const FETCH_TIMEOUT_MS = 8000;

function getLicenseResourceDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "license");
  }
  return path.join(__dirname);
}

function getBundledManifestPath() {
  return path.join(getLicenseResourceDir(), "licenses.manifest.json");
}

function getCachedManifestPath() {
  return path.join(app.getPath("userData"), CACHE_FILE);
}

function verifyManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("License manifest is invalid");
  }

  const { signature, ...payload } = manifest;
  if (!signature) {
    throw new Error("License manifest signature is missing");
  }

  const publicKey = loadPublicKey(getLicenseResourceDir());
  if (!verifyPayload(payload, signature, publicKey)) {
    throw new Error("License manifest signature is invalid");
  }

  return payload;
}

function readManifestFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return verifyManifest(manifest);
}

async function writeCachedManifest(manifest) {
  const cachePath = getCachedManifestPath();
  await fsPromises.mkdir(path.dirname(cachePath), { recursive: true });
  await fsPromises.writeFile(cachePath, JSON.stringify(manifest, null, 2), "utf-8");
}

async function fetchRemoteManifest() {
  if (!REMOTE_LICENSE_MANIFEST_URL) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(REMOTE_LICENSE_MANIFEST_URL, {
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Remote license manifest returned ${response.status}`);
    }

    const manifest = await response.json();
    const payload = verifyManifest(manifest);
    await writeCachedManifest(manifest);
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadManifest() {
  try {
    const remoteManifest = await fetchRemoteManifest();
    if (remoteManifest) return remoteManifest;
  } catch (error) {
    console.warn("Remote license manifest check failed:", error.message);
  }

  try {
    const cachedManifest = readManifestFile(getCachedManifestPath());
    if (cachedManifest) return cachedManifest;
  } catch (error) {
    console.warn("Cached license manifest check failed:", error.message);
  }

  return readManifestFile(getBundledManifestPath());
}

module.exports = {
  loadManifest,
  getBundledManifestPath,
  getCachedManifestPath,
  REMOTE_LICENSE_MANIFEST_URL
};
