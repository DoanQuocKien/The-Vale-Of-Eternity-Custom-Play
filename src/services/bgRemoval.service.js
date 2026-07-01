import { runPythonImageProcess } from '../utils/pythonRunner.js';

/**
 * Removes the background of an image using the local Python rembg sidecar process.
 * @param {string} dataUrl - Input image as a data URL
 * @param {function} onProgress - (percent: number) => void
 * @returns {Promise<string>} - Image with transparent background as a data URL
 */
export async function removeBackground(dataUrl, onProgress) {
  try {
    return await runPythonImageProcess('remove-bg', dataUrl, onProgress);
  } catch (err) {
    console.error('[bgRemoval.service] Python background removal failed:', err);
    // Return original image as fallback
    return dataUrl;
  }
}
