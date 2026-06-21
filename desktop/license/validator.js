const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const {
  hashPassword,
  loadPublicKey,
  verifyPayload,
  normalizeExpiry
} = require("./crypto");
const { readActivation, writeActivation, clearActivation } = require("./store");

function getLicenseResourceDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "license");
  }
  return path.join(__dirname);
}

function loadManifest() {
  const manifestPath = path.join(getLicenseResourceDir(), "licenses.manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const { signature, ...payload } = manifest;
  const publicKey = loadPublicKey(getLicenseResourceDir());

  if (!verifyPayload(payload, signature, publicKey)) {
    throw new Error("License manifest signature is invalid");
  }

  return payload;
}

function findLicense(password, manifest) {
  if (!manifest?.licenses?.length) return null;

  const hash = hashPassword(password);
  return manifest.licenses.find((entry) => entry.hash === hash) ?? null;
}

function isExpired(expiresAt) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function formatExpiry(expiresAt) {
  return new Date(expiresAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function getLicenseStatus(isDev) {
  if (isDev) {
    return { status: "licensed", isDev: true, expiresAt: null, expiresLabel: null };
  }

  const activation = readActivation();
  if (!activation) {
    return { status: "unlicensed", isDev: false, expiresAt: null, expiresLabel: null };
  }

  if (isExpired(activation.expiresAt)) {
    return {
      status: "expired",
      isDev: false,
      expiresAt: activation.expiresAt,
      expiresLabel: formatExpiry(activation.expiresAt)
    };
  }

  try {
    const manifest = loadManifest();
    const manifestEntry = manifest?.licenses?.find((entry) => entry.hash === activation.hash);

    if (!manifestEntry || isExpired(manifestEntry.expiresAt)) {
      clearActivation();
      return {
        status: "expired",
        isDev: false,
        expiresAt: activation.expiresAt,
        expiresLabel: formatExpiry(activation.expiresAt)
      };
    }

    if (manifestEntry.expiresAt !== activation.expiresAt) {
      writeActivation({ ...activation, expiresAt: manifestEntry.expiresAt });
      activation.expiresAt = manifestEntry.expiresAt;
    }
  } catch (error) {
    console.warn("License manifest check failed:", error.message);
  }

  return {
    status: "licensed",
    isDev: false,
    expiresAt: activation.expiresAt,
    expiresLabel: formatExpiry(activation.expiresAt)
  };
}

function activateLicense(password) {
  const trimmed = password?.trim();
  if (!trimmed) {
    return { success: false, error: "Please enter a password." };
  }

  let manifest;
  try {
    manifest = loadManifest();
  } catch (error) {
    return { success: false, error: error.message };
  }

  if (!manifest) {
    return { success: false, error: "No license data found in this app build." };
  }

  const match = findLicense(trimmed, manifest);
  if (!match) {
    return { success: false, error: "Invalid password." };
  }

  if (isExpired(match.expiresAt)) {
    return {
      success: false,
      error: `This password expired on ${formatExpiry(match.expiresAt)}. Contact the developer for a new one.`
    };
  }

  writeActivation({
    hash: match.hash,
    expiresAt: match.expiresAt,
    activatedAt: new Date().toISOString()
  });

  return {
    success: true,
    expiresAt: match.expiresAt,
    expiresLabel: formatExpiry(match.expiresAt)
  };
}

module.exports = {
  getLicenseStatus,
  activateLicense,
  normalizeExpiry,
  hashPassword
};
