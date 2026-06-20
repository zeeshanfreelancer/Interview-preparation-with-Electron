const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs/promises");

let mainWindow = null;
const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev
    }
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(process.resourcesPath, "client", "dist", "index.html");
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("dialog:openJsonFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Import questions",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });

  if (canceled || filePaths.length === 0) return null;

  const filePath = filePaths[0];
  const content = await fs.readFile(filePath, "utf-8");
  return { filePath, content };
});

ipcMain.handle("dialog:saveFile", async (_event, { defaultPath, filters, content }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Save file",
    defaultPath,
    filters: filters ?? [{ name: "All Files", extensions: ["*"] }]
  });

  if (canceled || !filePath) return null;

  const payload = typeof content === "string" ? content : Buffer.from(content);
  await fs.writeFile(filePath, payload);
  return filePath;
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

if (!isDev) {
  app.commandLine.appendSwitch("--no-sandbox");
  app.commandLine.appendSwitch("--disable-dev-shm-usage");
  app.commandLine.appendSwitch("--max-old-space-size=256");
}
