/**
 * eDEX-UI Main Process
 * Electron main entry point — handles window creation, IPC, and system integration
 */

'use strict';

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference to prevent garbage collection
let mainWindow = null;

// Default configuration
const defaultConfig = {
  windowTitle: 'eDEX-UI',
  theme: 'tron',
  shell: process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/bash'),
  keyboard: false, // I never use the on-screen keyboard, disable by default
  clock24: true,   // 24h time makes more sense to me
  showTraffic: true,
  showFilesystem: true,
  allowTransparency: true // transparency looks way better on my setup
};

// Config file path
const configPath = path.join(app.getPath('userData'), 'config.json');

/**
 * Load user configuration, falling back to defaults
 * @returns {Object} merged configuration object
 */
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const userConfig = JSON.parse(raw);
      return Object.assign({}, defaultConfig, userConfig);
    }
  } catch (err) {
    console.error('Failed to load config, using defaults:', err.message);
  }
  return Object.assign({}, defaultConfig);
}

/**
 * Save configuration to disk
 * @param {Object} config - configuration to persist
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err.message);
  }
}

/**
 * Create the main application window
 */
function createWindow() {
  const config = loadConfig();
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1280,
    minHeight: 720,
    frame: false,
    transparent: config.allowTransparency,
    backgroundColor: '#000000',
    title: config.windowTitle,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools only in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Pass initial config to renderer
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('config', config);
  });
}

// IPC handlers
ipcMain.on('save-config', (event, config) => {
  saveConfig(config);
  event.reply('config-saved', true);
});

ipcMain.on('get-config', (event) => {
  event.reply('config', loadConfig());
});

ipcMain.on('close-app', () => {
  app.quit();
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
  
