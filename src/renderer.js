/**
 * renderer.js - Main renderer process entry point
 * Handles UI initialization, theme loading, and IPC communication with main process
 */

'use strict';

const { ipcRenderer } = require('electron');

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  setupIPCListeners();
});

/**
 * Initialize the UI components
 */
function initUI() {
  // Request config from main process on startup
  ipcRenderer.send('get-config');

  // Set up clock
  updateClock();
  setInterval(updateClock, 1000);

  // Set up resize handler
  window.addEventListener('resize', debounce(onResize, 150));
}

/**
 * Update the on-screen clock display
 */
function updateClock() {
  const clockEl = document.getElementById('clock');
  if (!clockEl) return;

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  clockEl.textContent = `${hours}:${minutes}:${seconds}`;

  const dateEl = document.getElementById('date');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString(undefined, options);
  }
}

/**
 * Handle window resize events
 */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ipcRenderer.send('window-resized', { width: w, height: h });
}

/**
 * Apply a theme object to the document CSS variables
 * @param {Object} theme - Theme configuration object
 */
function applyTheme(theme) {
  if (!theme || typeof theme !== 'object') return;

  const root = document.documentElement;

  if (theme.primaryColor)   root.style.setProperty('--primary-color',    theme.primaryColor);
  if (theme.secondaryColor) root.style.setProperty('--secondary-color',  theme.secondaryColor);
  if (theme.backgroundColor)root.style.setProperty('--background-color', theme.backgroundColor);
  if (theme.textColor)      root.style.setProperty('--text-color',        theme.textColor);
  if (theme.fontFamily)     root.style.setProperty('--font-family',       theme.fontFamily);
  if (theme.fontSize)       root.style.setProperty('--font-size',         theme.fontSize + 'px');

  console.log('[renderer] Theme applied:', theme.name || 'unnamed');
}

/**
 * Set up IPC listeners for messages from the main process
 */
function setupIPCListeners() {
  // Receive config and apply theme
  ipcRenderer.on('config-data', (_event, config) => {
    console.log('[renderer] Received config from main process');
    if (config && config.theme) {
      applyTheme(config.theme);
    }
  });

  // Handle config update notifications
  ipcRenderer.on('config-updated', (_event, config) => {
    console.log('[renderer] Config updated');
    if (config && config.theme) {
      applyTheme(config.theme);
    }
  });

  // Handle errors from main process
  ipcRenderer.on('error', (_event, message) => {
    console.error('[renderer] Error from main process:', message);
  });
}

/**
 * Simple debounce utility
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

module.exports = { applyTheme, updateClock };
