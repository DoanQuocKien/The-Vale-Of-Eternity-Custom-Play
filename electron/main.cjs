/**
 * Electron Main Process
 * Loads the Vite-built dist/index.html as the app window.
 * Injects COEP/COOP headers so SharedArrayBuffer works for WASM workers.
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

// Keep a global window reference to prevent garbage collection
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'The Vale of Eternity: Card Creator',
    icon: path.join(__dirname, '../public/img/TextIcon/Score.png'),
    backgroundColor: '#060913',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,     // Secure: renderer can only access contextBridge APIs
      nodeIntegration: false,     // Secure: no Node.js in renderer
      sandbox: false,             // Must be false for WASM SharedArrayBuffer workers
      webSecurity: true,
    },
  });

  // ── Inject COEP/COOP headers on all responses ──
  // Required for SharedArrayBuffer (used by Transformers.js WASM inference).
  // In Electron's file:// protocol, HTTP headers can't be set by the server,
  // so we inject them via onHeadersReceived instead.
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      },
    });
  });

  // Load the built Vite app using loadFile (handles Windows paths reliably)
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  // Log renderer crashes to help debug startup failures
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Electron] Renderer process gone:', details.reason, details.exitCode);
  });

  // Prevent the window from navigating away from the app
  mainWindow.webContents.on('will-navigate', (event, navUrl) => {
    if (!navUrl.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(navUrl); // Open external links in the OS browser
    }
  });

  // Open external links in default OS browser instead of Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC: Open a path in OS file explorer ──
ipcMain.handle('open-path', async (_event, filePath) => {
  await shell.openPath(filePath);
});

// ── App lifecycle ──
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
