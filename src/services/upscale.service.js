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
    const tf = await import('@tensorflow/tfjs');

    try {
      console.log('[Upscaler] Forcing TensorFlow.js backend to CPU to prevent GPU/WebGL crashes...');
      await tf.setBackend('cpu');
      console.log('[Upscaler] TensorFlow.js backend successfully set to CPU.');
    } catch (e) {
      console.warn('[Upscaler] Failed to set CPU backend:', e);
    }

    const localModel = {
      ...ESRGANMedium,
      path: './models/esrgan-medium/model.json'
    };

    const instance = new Upscaler({ model: localModel });
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
    if (!result || typeof result !== 'string' || result.length < 100) {
      console.warn('Upscaler returned an invalid result, falling back to original.');
      return dataUrl;
    }
    return result.startsWith('data:') ? result : 'data:image/png;base64,' + result;
  } catch (err) {
    console.error('Upscaling failed, falling back to original. Error:', err);
    return dataUrl; // Graceful fallback — just use original
  }
}
