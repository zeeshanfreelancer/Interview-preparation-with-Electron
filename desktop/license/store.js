const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function getActivationPath() {
  return path.join(app.getPath("userData"), "activation.json");
}

function readActivation() {
  const filePath = getActivationPath();
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function writeActivation(data) {
  const filePath = getActivationPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function clearActivation() {
  const filePath = getActivationPath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  readActivation,
  writeActivation,
  clearActivation
};
