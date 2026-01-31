const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

let mainWindow = null;
let serverProcess = null;
let serverRestartCount = 0;
let serverStartTime = null;
const MAX_SERVER_RESTARTS = 3;
const SERVER_RESTART_WINDOW = 30000; // 30 seconds

const isDev = !app.isPackaged;

// Helper function to log only in development
const devLog = (...args) => {
  if (isDev) console.log(...args);
};

const devError = (...args) => {
  if (isDev) console.error(...args);
};

/**
 * Start backend server (DEV + PROD safe) with restart limits
 */
function startServer() {
  return new Promise((resolve) => {
    const now = Date.now();

    // Check restart limits
    if (serverStartTime && (now - serverStartTime) < SERVER_RESTART_WINDOW) {
      if (serverRestartCount >= MAX_SERVER_RESTARTS) {
        devError(`[ELECTRON] Server restart limit (${MAX_SERVER_RESTARTS}) exceeded. Giving up.`);
        resolve();
        return;
      }
    } else {
      // Reset counter if outside restart window
      serverRestartCount = 0;
      serverStartTime = now;
    }

    serverRestartCount++;
    devLog(`[ELECTRON] Starting server (attempt ${serverRestartCount}/${MAX_SERVER_RESTARTS})`);

    let serverDir, serverEntry, nodePath;

    if (isDev) {
      // Development mode - use local server directory
      serverDir = path.join(__dirname, "..", "server");
      serverEntry = path.join(serverDir, "server.js");
      nodePath = process.execPath; // Use current Node.js
    } else {
      // Production mode - extract server from ASAR
      const appPath = path.dirname(__dirname); // resources/app.asar.unpacked
      serverDir = path.join(appPath, "server");

      // Check if server directory exists in unpacked location
      if (!fs.existsSync(serverDir)) {
        devLog("[ELECTRON] Server not found in unpacked location, trying app.asar...");
        // Fallback to app.asar location
        serverDir = path.join(process.resourcesPath, "app.asar", "server");
      }

      serverEntry = path.join(serverDir, "server.js");
      nodePath = process.execPath; // Use bundled Node.js
    }

    devLog("[ELECTRON] Starting server from:", serverEntry);

    // Ensure server file exists
    if (!fs.existsSync(serverEntry)) {
      devError("[ELECTRON] Server file not found:", serverEntry);
      try {
        devLog("[ELECTRON] Available files in directory:", fs.readdirSync(serverDir));
      } catch (e) {
        devError("[ELECTRON] Could not read server directory:", e.message);
      }
      resolve();
      return;
    }

    // Kill existing server process if it exists
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch (e) {
        // Ignore kill errors
      }
    }

    // In production, ignore all server output to prevent disk writes
    // In development, capture output for debugging
    serverProcess = spawn(nodePath, [serverEntry], {
      cwd: serverDir, // Set working directory to server directory so .env file is found
      stdio: isDev ? ["ignore", "pipe", "pipe"] : ["ignore", "ignore", "ignore"],
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: isDev ? "development" : "production",
        // Ensure .env file path is available (for debugging)
        ...(isDev && { SERVER_DIR: serverDir })
      }
    });

    let serverStarted = false;
    let retryInterval = null;

    // Only handle server output in development
    if (isDev) {
      serverProcess.stdout.on("data", (data) => {
        const msg = data.toString().trim();
        if (!msg) return;

        const fullMsg = data.toString();

        // Check for successful server start
        if (!serverStarted && fullMsg.includes("Server running")) {
          serverStarted = true;
          serverRestartCount = 0;
          resolve();
        }

        // Check if server is using a different port
        const portMatch = fullMsg.match(/Server running on port (\d+)/);
        if (portMatch) {
          const serverPort = parseInt(portMatch[1]);
          devLog(`[ELECTRON] Server is running on port: ${serverPort}`);
          global.serverPort = serverPort;
          updateApiUrlOnce(serverPort);
        }
      });

      serverProcess.stderr.on("data", (data) => {
        const msg = data.toString().trim();
        if (msg) {
          // Log all errors and database-related messages in development
          if (msg.includes("error") || msg.includes("Error") || msg.includes("MongoDB") || msg.includes("[DB]")) {
            devError("[SERVER]", msg);
          }
        }
      });
      
      // Also log stdout for database connection messages
      serverProcess.stdout.on("data", (data) => {
        const msg = data.toString().trim();
        if (msg && (msg.includes("MongoDB") || msg.includes("[DB]") || msg.includes("Database"))) {
          devLog("[SERVER]", msg);
        }
      });
    } else {
      // In production, just wait for server to start (no output capture)
      // Assume server starts successfully after a short delay
      setTimeout(() => {
        if (!serverStarted) {
          serverStarted = true;
          serverRestartCount = 0;
          global.serverPort = parseInt(process.env.PORT) || 3000;
          updateApiUrlOnce(global.serverPort);
          resolve();
        }
      }, 3000);
    }

    // Helper function to update API URL once (no retries in production)
    function updateApiUrlOnce(serverPort) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`
          if (window.updateApiBaseUrl) {
            window.updateApiBaseUrl(${serverPort});
            window.apiPortUpdated = ${serverPort};
          }
        `).catch(() => {
          // Ignore errors silently in production
        });
      }
    }

    serverProcess.on("error", (err) => {
      devError("[ELECTRON] Server process error:", err.message);
      resolve();
    });

    serverProcess.on("exit", (code, signal) => {
      if (isDev) {
        devLog(`[ELECTRON] Server exited with code ${code}, signal ${signal}`);
        if (code !== 0 && code !== null) {
          devError(`[ELECTRON] Server crashed with code ${code}`);
        }
      }
    });

    // Fallback timeout
    setTimeout(() => {
      if (!serverStarted) {
        devLog("[ELECTRON] Server start timeout reached, continuing anyway");
        resolve();
      }
    }, isDev ? 10000 : 5000);
  });
}

/**
 * Create Electron window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load from bundled client
    let indexPath;

    // Try different possible locations for the built client
    const possiblePaths = [
      path.join(process.resourcesPath, "client", "dist", "index.html"), // Standard location
      path.join(__dirname, "..", "client", "dist", "index.html"), // Relative to main.js
      path.join(process.resourcesPath, "app.asar", "client", "dist", "index.html"), // Inside ASAR
    ];

    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        indexPath = testPath;
        devLog("[ELECTRON] Found client at:", indexPath);
        break;
      }
    }

    if (!indexPath) {
      devError("[ELECTRON] Could not find client index.html in any of:", possiblePaths);
      // Create a simple fallback HTML
      mainWindow.loadURL(`data:text/html,
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Interview Prep App</h1>
            <p>Loading application...</p>
            <p style="color: red;">If you see this page, there was an issue loading the application.</p>
          </body>
        </html>
      `);
      return;
    }

    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * App lifecycle
 */
app.whenReady().then(async () => {
  await startServer();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  devLog("[ELECTRON] Application quitting, cleaning up...");

  // Kill server process
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM');

      // Give it 3 seconds to shut down gracefully
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      }, 3000);
    } catch (e) {
      devError("[ELECTRON] Error killing server process:", e.message);
    }
  }
});

// Enable garbage collection hints
if (!isDev) {
  app.commandLine.appendSwitch('--optimize-for-size');
  app.commandLine.appendSwitch('--memory-reducer');
}
