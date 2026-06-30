/**
 * Image Upscaling Utility (Main Thread)
 * Uses UpscalerJS + ESRGAN-Medium model (MIT license)
 * TensorFlow.js requires DOM/WebGL APIs, so this MUST run on the main thread.
 * Call upscaleImage() directly — it returns a Promise<string> (base64 data URL).
 */

let upscalerInstance = null;
let loadPromise = null;

async function getUpscaler() {
  if (upscalerInstance) return upscalerInstance;
  // Only initialize once even if called concurrently
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { default: Upscaler } = await import('upscaler');
    const { default: ESRGANMedium } = await import('@upscalerjs/esrgan-medium');

    const instance = new Upscaler({ model: ESRGANMedium });
    upscalerInstance = instance;
    return instance;
  })();

  return loadPromise;
}

/**
 * Upscale an image 2x using ESRGAN.
 * @param {string} dataUrl - Input image as a data URL
 * @param {function} onProgress - (percent: number) => void
 * @returns {Promise<string>} - Upscaled image as a data URL
 */
export async function upscaleImage(dataUrl, onProgress) {
  try {
    onProgress?.(5);
    const upscaler = await getUpscaler();
    onProgress?.(20);

    // Load image element for UpscalerJS
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });

    onProgress?.(30);

    const result = await upscaler.upscale(img, {
      output: 'base64',
      progressCallback: ({ percent }) => {
        onProgress?.(30 + Math.round(percent * 65));
      }
    });

    onProgress?.(100);
    return 'data:image/png;base64,' + result;
  } catch (err) {
    console.warn('Upscaling failed, returning original:', err.message);
    return dataUrl; // Graceful fallback — just use original
  }
}
