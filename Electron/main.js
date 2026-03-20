const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function startBackend() {
  exec('dotnet run', { cwd: path.join(__dirname, '../Setu_API') });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800
  });

  

  mainWindow.loadURL('http://localhost:3000/');
}

app.whenReady().then(() => {
  startBackend(); // start API
  createWindow(); // open UI
});