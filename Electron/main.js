const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

// __dirname is the Electron/ folder.
// Setu_API/ and Setu_ERP/ sit one level up (project root).
const PROJECT_ROOT = path.join(__dirname, '..');

let apiProcess;

function startBackend() {
  const exePath = path.join(PROJECT_ROOT, 'Setu_API', 'publish', 'Setu.Api.exe');

  console.log("Starting API from:", exePath);
  apiProcess = spawn(exePath, [], {
    detached: true,
    stdio: 'ignore'
  });
  apiProcess.unref(); // Allow the app to exit even if API is still running
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true
    }
  });

  // Load React build from Setu_ERP/dist/index.html
  win.loadFile(path.join(PROJECT_ROOT, 'Setu_ERP', 'dist', 'index.html'));
  //win.loadFile(path.join(__dirname, '..', 'Setu_ERP', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  startBackend();

  // Give the API a few seconds to initialize before opening the window
  setTimeout(() => {
    createWindow();
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (apiProcess) apiProcess.kill();
    app.quit();
  }
});