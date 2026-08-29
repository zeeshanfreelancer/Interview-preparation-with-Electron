const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PASSWORD_SALT = "interview-prep-license-v1";
const LICENSE_DIR = path.join(__dirname);

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(`${PASSWORD_SALT}:${password}`)
    .digest("hex");
}

function getKeyPaths() {
  return {
    publicKey: path.join(LICENSE_DIR, "public.pem"),
    privateKey: path.join(LICENSE_DIR, "private.pem")
  };
}

function ensureKeyPair() {
  const { publicKey, privateKey } = getKeyPaths();
  const hasPublic = fs.existsSync(publicKey);
  const hasPrivate = fs.existsSync(privateKey);

  if (hasPublic && hasPrivate) {
    return {
      publicKey: fs.readFileSync(publicKey),
      privateKey: fs.readFileSync(privateKey)
    };
  }

  if (hasPublic && !hasPrivate) {
    throw new Error(
      `Missing private key at ${privateKey}. Restore your private.pem backup to add passwords.`
    );
  }

  if (!hasPublic && hasPrivate) {
    throw new Error(
      `Missing public key at ${publicKey}. Restore public.pem or regenerate the key pair on a secure machine.`
    );
  }

  const pair = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(publicKey, pair.publicKey.export({ type: "spki", format: "pem" }));
  fs.writeFileSync(privateKey, pair.privateKey.export({ type: "pkcs8", format: "pem" }));

  return {
    publicKey: fs.readFileSync(publicKey),
    privateKey: fs.readFileSync(privateKey)
  };
}

function loadPublicKey(customDir) {
  const publicKeyPath = path.join(customDir ?? LICENSE_DIR, "public.pem");
  if (!fs.existsSync(publicKeyPath)) {
    throw new Error(`Missing public key at ${publicKeyPath}`);
  }
  return fs.readFileSync(publicKeyPath);
}

function signPayload(payload, privateKeyPem) {
  const privateKey = privateKeyPem ?? ensureKeyPair().privateKey;
  const body = Buffer.from(JSON.stringify(payload));
  return crypto.sign(null, body, privateKey).toString("base64");
}

function verifyPayload(payload, signature, publicKeyPem) {
  const publicKey = publicKeyPem ?? loadPublicKey();
  const body = Buffer.from(JSON.stringify(payload));
  const sig = Buffer.from(signature, "base64");
  return crypto.verify(null, body, publicKey, sig);
}

function createLocalDate(year, month, day, hour, minute, second, millisecond) {
  const date = new Date(year, month - 1, day, hour, minute, second, millisecond);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }

  return date;
}

function normalizeExpiry(expiresAt) {
  const value = String(expiresAt ?? "").trim();
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dateTimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  let date;

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    date = createLocalDate(year, month, day, 23, 59, 59, 999);
  } else if (dateTimeMatch) {
    const year = Number(dateTimeMatch[1]);
    const month = Number(dateTimeMatch[2]);
    const day = Number(dateTimeMatch[3]);
    const hour = Number(dateTimeMatch[4]);
    const minute = Number(dateTimeMatch[5]);
    const second = dateTimeMatch[6] ? Number(dateTimeMatch[6]) : 0;
    date = createLocalDate(year, month, day, hour, minute, second, 0);
  } else {
    date = new Date(value);
  }

  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`Invalid expiry date: ${expiresAt}`);
  }

  return date.toISOString();
}

module.exports = {
  hashPassword,
  ensureKeyPair,
  loadPublicKey,
  signPayload,
  verifyPayload,
  normalizeExpiry,
  LICENSE_DIR
};
