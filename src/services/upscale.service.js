import { runPythonImageProcess } from '../utils/pythonRunner.js';

/**
 * Upscale an image 2x using ESRGAN in the Python sidecar process.
 * @param {string} dataUrl - Input image as a data URL
 * @param {function} onProgress - (percent: number) => void
 * @returns {Promise<string>} - Upscaled image as a data URL
 */
export async function upscaleImage(dataUrl, onProgress) {
  try {
    return await runPythonImageProcess('upscale', dataUrl, onProgress);
  } catch (err) {
    console.error('[upscale.service] Python upscaling failed:', err);
    // Return original image as fallback
    return dataUrl;
  }
}
