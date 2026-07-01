/**
 * Python Sidecar Execution Runner for Neutralinojs
 * Handles temporary files, base64 conversions, and running Python backend processes.
 */

// Helper to determine the executable path
async function getPythonCommand() {
  if (typeof window === 'undefined' || !window.Neutralino) {
    throw new Error('Neutralinojs not initialized');
  }
  
  try {
    // Check if packaged sidecar exists in bin/
    await window.Neutralino.filesystem.getStats(`${window.NL_PATH}/bin/vale_ai.exe`);
    return `"${window.NL_PATH}/bin/vale_ai.exe"`;
  } catch (e) {
    // Fall back to python script in dev mode
    return `python "${window.NL_PATH}/electron/vale_ai.py"`;
  }
}

// Convert base64 dataUrl to an ArrayBuffer
function dataUrlToArrayBuffer(dataUrl) {
  const base64Data = dataUrl.split(',')[1];
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert an ArrayBuffer to a PNG dataUrl
function arrayBufferToDataUrl(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  // Use chunked conversion to avoid stack overflow with huge files
  const chunkSize = 65536;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  const base64 = window.btoa(binary);
  return `data:image/png;base64,${base64}`;
}

/**
 * Run a Python sidecar processing subcommand on a dataUrl image.
 * 
 * @param {string} subcommand - Subcommand (e.g. 'remove-bg', 'upscale', 'balance-lighting', 'enhance-lines')
 * @param {string} inputDataUrl - Data URL of the input image
 * @param {function} [onProgress] - Callback for progress reporting
 * @returns {Promise<string>} Data URL of the processed image
 */
export async function runPythonImageProcess(subcommand, inputDataUrl, onProgress) {
  if (typeof window === 'undefined' || !window.Neutralino) {
    console.warn(`[PythonRunner] Not running on desktop wrapper, returning original image for ${subcommand}`);
    return inputDataUrl;
  }

  const timestamp = Date.now();
  const tempInPath = `${window.NL_PATH}/temp_${subcommand}_in_${timestamp}.png`;
  const tempOutPath = `${window.NL_PATH}/temp_${subcommand}_out_${timestamp}.png`;

  try {
    onProgress?.(10);
    // 1. Write input dataURL to temp file
    const inBuffer = dataUrlToArrayBuffer(inputDataUrl);
    await window.Neutralino.filesystem.writeBinaryFile(tempInPath, inBuffer);
    
    onProgress?.(30);
    // 2. Prepare Python / compiled executable call
    const runCmd = await getPythonCommand();
    const cmd = `${runCmd} ${subcommand} "${tempInPath}" "${tempOutPath}"`;
    
    console.log(`[PythonRunner] Executing: ${cmd}`);
    
    // We can monitor stderr to capture downloading percentages
    onProgress?.(50);
    
    const result = await window.Neutralino.os.execCommand(cmd);
    
    if (result.exitCode !== 0) {
      throw new Error(`Python sidecar exited with code ${result.exitCode}: ${result.stdErr || result.stdOut}`);
    }

    onProgress?.(85);
    // 3. Read output temp file
    const outBuffer = await window.Neutralino.filesystem.readBinaryFile(tempOutPath);
    const outputDataUrl = arrayBufferToDataUrl(outBuffer);
    
    onProgress?.(100);
    return outputDataUrl;

  } catch (err) {
    console.error(`[PythonRunner] ${subcommand} failed:`, err);
    throw err;
  } finally {
    // Clean up temp files silently
    try {
      await window.Neutralino.filesystem.removeFile(tempInPath);
    } catch (e) {}
    try {
      await window.Neutralino.filesystem.removeFile(tempOutPath);
    } catch (e) {}
  }
}

/**
 * Execute a RAG recommendation query against the database of cards.
 * 
 * @param {object} cardData - Metadata of the designed card
 * @returns {Promise<object[]>} List of recommended synergistic cards
 */
export async function runPythonRecommendation(cardData) {
  if (typeof window === 'undefined' || !window.Neutralino) {
    return [];
  }

  try {
    const runCmd = await getPythonCommand();
    const jsonStr = JSON.stringify(cardData).replace(/"/g, '\\"');
    const cmd = `${runCmd} recommend "${jsonStr}"`;
    
    const result = await window.Neutralino.os.execCommand(cmd);
    if (result.exitCode === 0) {
      return JSON.parse(result.stdOut.trim());
    } else {
      console.error('[PythonRunner recommend] Failed:', result.stdErr);
      return [];
    }
  } catch (err) {
    console.error('[PythonRunner recommend] Error:', err);
    return [];
  }
}
