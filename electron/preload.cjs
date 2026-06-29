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

  /**
   * Save a PDF buffer to the user's Downloads folder.
   * @param {string} fileName - The target file name (e.g. "my_pack.pdf")
   * @param {Uint8Array} buffer - Raw PDF bytes
   * @returns {{ ok: boolean, savedPath?: string, error?: string }}
   */
  savePdf: (fileName, buffer) => ipcRenderer.invoke('save-pdf', { fileName, buffer }),

  /**
   * Convert an existing RGB PDF file to print-safe CMYK using Ghostscript.
   * The output is saved as [name]_CMYK.pdf in the same folder.
   * Requires Ghostscript to be installed and on the system PATH.
   * @param {string} inputPath - Absolute path to the source RGB PDF
   * @returns {{ ok: boolean, outputPath?: string, error?: string }}
   */
  convertToCmyk: (inputPath) => ipcRenderer.invoke('convert-to-cmyk', { inputPath }),
});
