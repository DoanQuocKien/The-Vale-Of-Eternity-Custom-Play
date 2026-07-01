/**
 * Desktop Helper Utilities for Neutralinojs
 * Runs platform-specific filesystem, OS commands, and shell actions.
 */

async function findGhostscript() {
  if (typeof window === 'undefined' || !window.Neutralino) return 'gswin64c';
  
  // Check if we are on Windows
  const isWindows = navigator.userAgent.toLowerCase().includes('win');
  if (!isWindows) {
    return 'gs';
  }
  
  const searchDirs = ['C:\\Program Files\\gs', 'C:\\Program Files (x86)\\gs'];
  for (const baseDir of searchDirs) {
    try {
      const entries = await window.Neutralino.filesystem.readDirectory(baseDir);
      // Filter directories and sort descending (picks newest version first)
      const subdirs = entries
        .filter(e => e.type === 'DIRECTORY' && e.entry !== '.' && e.entry !== '..')
        .map(e => e.entry)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));

      for (const subdir of subdirs) {
        const binDir = `${baseDir}\\${subdir}\\bin`;
        try {
          const binEntries = await window.Neutralino.filesystem.readDirectory(binDir);
          const has64 = binEntries.some(e => e.entry.toLowerCase() === 'gswin64c.exe');
          if (has64) return `${binDir}\\gswin64c.exe`;
          const has32 = binEntries.some(e => e.entry.toLowerCase() === 'gswin32c.exe');
          if (has32) return `${binDir}\\gswin32c.exe`;
        } catch (e) {
          // ignore subdirectory read failures
        }
      }
    } catch (e) {
      // ignore directory read failures
    }
  }
  return 'gswin64c';
}

/**
 * Converts a PDF to CMYK color space using local Ghostscript installation.
 * @param {string} inputPath - Absolute path of the input PDF
 * @returns {Promise<{ok: boolean, outputPath?: string, error?: string}>}
 */
export async function convertToCmyk(inputPath) {
  if (typeof window === 'undefined' || !window.Neutralino) {
    return { ok: false, error: 'Desktop interface is not active.' };
  }

  try {
    const outputPath = inputPath.replace(/\.pdf$/i, '_CMYK.pdf');
    const gsCmd = await findGhostscript();

    const gsArgs = [
      '-dSAFER',
      '-dBATCH',
      '-dNOPAUSE',
      '-dNOCACHE',
      '-sDEVICE=pdfwrite',
      '-sColorConversionStrategy=CMYK',
      '-dProcessColorModel=/DeviceCMYK',
      '-dOverrideICC=true',
      '-dRenderIntent=0',
      '-dBlackPointCompensation=true',
      `-sOutputFile="${outputPath}"`,
      `"${inputPath}"`
    ];

    const cmd = `"${gsCmd}" ${gsArgs.join(' ')}`;
    console.log(`[Neutralino convertToCmyk] Executing: ${cmd}`);

    const result = await window.Neutralino.os.execCommand(cmd);

    if (result.exitCode === 0) {
      return { ok: true, outputPath };
    } else {
      // If error indicates file not found, explain nicely
      if (result.stdErr && result.stdErr.includes('not recognized')) {
        return {
          ok: false,
          error: `Ghostscript was not found on your system.\n\nPlease install it from https://www.ghostscript.com/download.html and make sure it is on your system PATH.`
        };
      }
      return { ok: false, error: `Ghostscript conversion failed (code ${result.exitCode}).\n${result.stdErr}` };
    }
  } catch (err) {
    console.error('[Neutralino convertToCmyk] Error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Opens a file or directory path in the default OS application or file manager.
 * @param {string} filePath - Path to open
 */
export async function openPath(filePath) {
  if (typeof window !== 'undefined' && window.Neutralino) {
    try {
      await window.Neutralino.app.open(filePath);
    } catch (err) {
      console.error('[Neutralino openPath] Failed:', err);
    }
  }
}
