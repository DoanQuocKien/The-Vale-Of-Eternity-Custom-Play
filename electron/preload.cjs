/**
 * Electron Preload Script
 * Runs in an isolated context before the renderer. Exposes only whitelisted
 * APIs to the renderer via contextBridge (no direct Node.js access).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Open a file/folder path in the OS native file explorer.
   * @param {string} filePath - Absolute path to open.
   */
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
});
