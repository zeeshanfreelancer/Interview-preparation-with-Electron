#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  ensureKeyPair,
  hashPassword,
  signPayload,
  normalizeExpiry,
  LICENSE_DIR
} = require("../license/crypto");

const PASSWORDS_FILE = path.join(LICENSE_DIR, "passwords.json");
const MANIFEST_FILE = path.join(LICENSE_DIR, "licenses.manifest.json");

function readPasswords() {
  if (!fs.existsSync(PASSWORDS_FILE)) return [];
  return JSON.parse(fs.readFileSync(PASSWORDS_FILE, "utf-8"));
}

function writePasswords(entries) {
  fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

function rebuildManifest(entries) {
  const { privateKey } = ensureKeyPair();
  const payload = {
    version: 1,
    licenses: entries.map((entry) => ({
      hash: hashPassword(entry.password),
      expiresAt: normalizeExpiry(entry.expiresAt)
    }))
  };

  const manifest = {
    ...payload,
    signature: signPayload(payload, privateKey)
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      args[key] = argv[i + 1];
      i += 1;
    } else {
      args._.push(token);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/add-password.js add --password "MyPass123" --expires "2026-12-31" [--label "Customer name"]
  node scripts/add-password.js add --password "MyPass123" --expires "2026-12-31 18:30" [--label "Customer name"]
  node scripts/add-password.js remove --password "MyPass123"
  node scripts/add-password.js list
  node scripts/add-password.js init

Notes:
  - Date-only expiry uses the end of that local day: 23:59.
  - Date and time expiry uses the exact local time you provide.
  - Passwords are stored in desktop/license/passwords.json (gitignored, for your records).
  - The app only ships licenses.manifest.json + public.pem (no plain passwords).
  - For remote sync, upload desktop/license/licenses.manifest.json to your remote URL after every change.
  - For offline-only builds, rebuild the app so the new manifest is included.
`);
}

function cmdInit() {
  ensureKeyPair();
  if (!fs.existsSync(PASSWORDS_FILE)) {
    writePasswords([]);
    rebuildManifest([]);
  }
  console.log("License keys ready.");
  console.log(`Public key:  ${path.join(LICENSE_DIR, "public.pem")}`);
  console.log(`Private key: ${path.join(LICENSE_DIR, "private.pem")} (keep secret)`);
}

function cmdAdd(args) {
  const password = args.password;
  const expiresAt = args.expires;
  const label = args.label ?? "";

  if (!password || !expiresAt) {
    console.error("Missing --password or --expires");
    process.exit(1);
  }

  normalizeExpiry(expiresAt);
  ensureKeyPair();

  const entries = readPasswords();
  const duplicate = entries.find((entry) => entry.password === password);
  if (duplicate) {
    duplicate.expiresAt = expiresAt;
    duplicate.label = label || duplicate.label;
  } else {
    entries.push({ password, expiresAt, label });
  }

  writePasswords(entries);
  rebuildManifest(entries);

  console.log("Password saved.");
  console.log(`Give this password to the user: ${password}`);
  console.log(`Expires: ${normalizeExpiry(expiresAt)}`);
  if (label) console.log(`Label: ${label}`);
  console.log("Upload desktop/license/licenses.manifest.json to your remote license URL.");
  console.log("If you are not using remote sync, rebuild the desktop app to include it.");
}

function cmdRemove(args) {
  const password = args.password;
  if (!password) {
    console.error("Missing --password");
    process.exit(1);
  }

  const entries = readPasswords().filter((entry) => entry.password !== password);
  writePasswords(entries);
  rebuildManifest(entries);
  console.log("Password removed. Upload the manifest to your remote license URL or rebuild the app.");
}

function cmdList() {
  const entries = readPasswords();
  if (entries.length === 0) {
    console.log("No passwords configured.");
    return;
  }

  for (const entry of entries) {
    const expired = new Date(normalizeExpiry(entry.expiresAt)).getTime() <= Date.now();
    const status = expired ? "EXPIRED" : "active";
    console.log(`- [${status}] ${entry.password}  expires ${entry.expiresAt}${entry.label ? `  (${entry.label})` : ""}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? "help";

switch (command) {
  case "init":
    cmdInit();
    break;
  case "add":
    cmdAdd(args);
    break;
  case "remove":
    cmdRemove(args);
    break;
  case "list":
    cmdList();
    break;
  default:
    printHelp();
}
