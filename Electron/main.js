const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

// __dirname is the Electron/ folder.
// Setu_API/ and Setu_ERP/ sit one level up (project root).
const PROJECT_ROOT = path.join(__dirname, '..');

let apiProcess;
const fs = require('fs');

// [PRO FIX] DISABLING BUILT-IN PRINTING PREVIEW
// Since Chromium's internal preview is unstable in many Windows environments, 
// we bypass it and use our custom high-reliability PDF workflow.
app.commandLine.appendSwitch('disable-print-preview');
app.commandLine.appendSwitch('disable-features', 'PrintPreview');

// Ensure only one instance of the app is running
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window.
    const windows = BrowserWindow.getAllWindows();
    if (windows.length) {
      if (windows[0].isMinimized()) windows[0].restore();
      windows[0].focus();
    }
  });

  function startBackend() {
    const exePath = app.isPackaged 
      ? path.join(process.resourcesPath, 'Setu_API', 'Setu.Api.exe')
      : path.join(PROJECT_ROOT, 'Setu_API', 'publish', 'Setu.Api.exe');

    const logPath = path.join(app.getPath('userData'), 'api.log');
    fs.writeFileSync(logPath, '[LOG START]\n');

    if (!fs.existsSync(exePath)) {
      console.error("CRITICAL: API executable NOT FOUND at " + exePath);
      fs.appendFileSync(logPath, `\n[ERROR] API NOT FOUND at ${exePath}\n`);
      return;
    }
    
    // Proactively kill any old zombie backend processes
    if (process.platform === 'win32') {
      try {
        require('child_process').execSync(`taskkill /F /IM Setu.Api.exe /T 2>nul || exit 0`);
      } catch (e) { }
    }

    try {
      const out = fs.openSync(logPath, 'a');
      const userDataPath = app.getPath('userData');
      
      apiProcess = spawn(exePath, ["--db-path", userDataPath], {
        cwd: path.dirname(exePath),
        detached: true,
        stdio: ['ignore', out, out],
        windowsHide: false,
        shell: true
      });

      apiProcess.on('error', (err) => {
        fs.appendFileSync(logPath, `\n[ERROR] Spawn failed: ${err.message}\n`);
      });

      apiProcess.unref(); 
    } catch (error) {
       fs.appendFileSync(logPath, `\n[EXCEPTION] ${error.stack}\n`);
    }
  }

  function createWindow() {
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false, 
        preload: path.join(__dirname, 'preload.js')
      }
    });

    win.once('ready-to-show', () => {
      win.show();
      win.focus();
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:') || url.startsWith('http:')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    win.loadFile(path.join(PROJECT_ROOT, 'Setu_ERP', 'dist', 'index.html'));
  }

  app.whenReady().then(() => {
    startBackend();

    setTimeout(() => {
      createWindow();
    }, 5000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    /** 
     * [PRO DEVELOPER SOLUTION] 
     * Instead of fighting the browser's broken print preview engine, we:
     * 1. Generate a high-fidelity PDF from the current window silently.
     * 2. Save it to the system's temp folder.
     * 3. Open it immediately in the system's native PDF Viewer (Edge/Chrome/Acrobat).
     * 
     * This provides a 100% reliable print preview that the user can print using 
     * the system's native controls, bypassing Electron's internal hurdles.
     */
    ipcMain.on('print-invoice', async (event, customFileName) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return;

      const logFile = path.join(app.getPath('userData'), 'error.log');
      
      try {
        // High fidelity PDF generation
        const pdfData = await win.webContents.printToPDF({
          printBackground: true,
          landscape: false,
          pageSize: 'A4',
          displayHeaderFooter: false
        });

        // Use the custom filename if provided, otherwise default
        const safeName = customFileName ? customFileName.replace(/[^a-z0-9_\-]/gi, '_') : `Setu_Invoice_${Date.now()}`;
        const tempPath = path.join(app.getPath('temp'), `${safeName}.pdf`);
        
        fs.writeFileSync(tempPath, pdfData);

        // Open in the system default viewer
        await shell.openPath(tempPath);
        
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] PRO_PRINT_FLOW: PDF Generated at ${tempPath}\n`);
      } catch (error) {
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] PRO_PRINT_FLOW_ERROR: ${error.message}\n`);
        win.webContents.executeJavaScript(`alert("Reliable Print Flow Error: ${error.message}");`);
      }
    });

    ipcMain.on('open-logs', () => {
      shell.openPath(app.getPath('userData'));
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      if (apiProcess && !apiProcess.killed) {
        apiProcess.kill('SIGTERM');
      }
      app.quit();
    }
  });

  process.on('uncaughtException', (err) => {
    try {
      const errorLog = path.join(app.getPath('userData'), 'error.log');
      fs.appendFileSync(errorLog, `[${new Date().toISOString()}] UNCAUGHT_EXCEPTION: ${err.message}\n${err.stack}\n`);
    } catch (e) {}
  });
}