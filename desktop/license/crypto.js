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

function normalizeExpiry(expiresAt) {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid expiry date: ${expiresAt}`);
  }
  date.setHours(23, 59, 59, 999);
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
