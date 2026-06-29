/**
 * Electron Main Process
 * Loads the Vite-built dist/index.html as the app window.
 * Injects COEP/COOP headers so SharedArrayBuffer works for WASM workers.
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Keep a global window reference to prevent garbage collection
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: process.platform === 'win32'
      ? path.join(__dirname, 'icon.ico')
      : path.join(__dirname, 'icon.png'),
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

// ── IPC: Save a PDF buffer to disk ──
// Writes the given Uint8Array to the user's Downloads folder.
// Returns { ok: true, savedPath } on success or { ok: false, error } on failure.
ipcMain.handle('save-pdf', async (_event, { fileName, buffer }) => {
  try {
    const downloadsDir = app.getPath('downloads');
    const savedPath = path.join(downloadsDir, fileName);
    fs.writeFileSync(savedPath, Buffer.from(buffer));
    return { ok: true, savedPath };
  } catch (err) {
    console.error('[save-pdf] Failed:', err);
    return { ok: false, error: err.message };
  }
});

function findGhostscriptExecutable() {
  if (process.platform !== 'win32') {
    return 'gs';
  }

  const searchDirs = ['C:\\Program Files\\gs', 'C:\\Program Files (x86)\\gs'];
  for (const baseDir of searchDirs) {
    if (fs.existsSync(baseDir)) {
      try {
        const subdirs = fs.readdirSync(baseDir);
        // Sort descending so we pick the newest version first
        subdirs.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
        for (const subdir of subdirs) {
          const exe64 = path.join(baseDir, subdir, 'bin', 'gswin64c.exe');
          if (fs.existsSync(exe64)) return exe64;
          const exe32 = path.join(baseDir, subdir, 'bin', 'gswin32c.exe');
          if (fs.existsSync(exe32)) return exe32;
        }
      } catch (err) {
        console.error('[findGhostscript] Scanning base folders failed:', err);
      }
    }
  }
  // Fallback to global command
  return 'gswin64c';
}

// ── IPC: Convert a PDF to CMYK using Ghostscript ──
// Runs gswin64c (Windows) or gs (Mac/Linux) to perform a print-safe
// RGB→CMYK colour space conversion on the given PDF file.
// Returns { ok: true, outputPath } on success or { ok: false, error } on failure.
ipcMain.handle('convert-to-cmyk', async (_event, { inputPath }) => {
  return new Promise((resolve) => {
    const outputPath = inputPath.replace(/\.pdf$/i, '_CMYK.pdf');
    const gsCmd = findGhostscriptExecutable();

    const gsArgs = [
      '-dSAFER',
      '-dBATCH',
      '-dNOPAUSE',
      '-dNOCACHE',
      '-sDEVICE=pdfwrite',
      '-sColorConversionStrategy=CMYK',
      '-dProcessColorModel=/DeviceCMYK',
      '-dOverrideICC=true',
      // Perceptual rendering: preserves gradients and shadow/highlight detail
      '-dRenderIntent=0',
      // Black point compensation: rich blacks instead of washed-out grays
      '-dBlackPointCompensation=true',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ];

    console.log(`[convert-to-cmyk] Executable: "${gsCmd}"`);
    console.log(`[convert-to-cmyk] Arguments: ${gsArgs.join(' ')}`);

    // Use shell mode only for global commands; direct execution works best for absolute paths with spaces
    const useShell = !path.isAbsolute(gsCmd);
    const proc = spawn(gsCmd, gsArgs, { stdio: ['ignore', 'pipe', 'pipe'], shell: useShell });

    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true, outputPath });
      } else {
        resolve({ ok: false, error: `Ghostscript exited with code ${code}.\n${stderr}` });
      }
    });

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        resolve({
          ok: false,
          error: `Ghostscript was not found at "${gsCmd}".\n\nPlease install it from https://www.ghostscript.com/download.html and make sure it is on your system PATH.`
        });
      } else {
        resolve({ ok: false, error: err.message });
      }
    });
  });
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
