const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  // DEV mode
  win.loadURL("http://localhost:5173");

  // PRODUCTION mode (later)
  // win.loadFile("../client/build/index.html");
}

app.whenReady().then(createWindow);