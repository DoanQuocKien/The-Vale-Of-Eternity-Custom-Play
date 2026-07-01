import { pipeline, RawImage } from '@huggingface/transformers';

let segmentatorInstance = null;
let loadPromise = null;

async function getSegmentator(onProgress) {
  if (segmentatorInstance) return segmentatorInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const progress_callback = (data) => {
      if (data.status === 'progress' && onProgress) {
        // data.progress is a percentage (0..100)
        onProgress(Math.round(data.progress));
      }
    };

    try {
      console.log('Initializing RMBG-1.4 with WASM...');
      const instance = await pipeline("image-segmentation", "onnx-community/RMBG-1.4", {
        device: "wasm",
        progress_callback,
      });
      segmentatorInstance = instance;
      console.log('RMBG-1.4 initialized with WASM successfully.');
      return instance;
    } catch (err) {
      console.error("RMBG-1.4 WASM initialization failed:", err);
      throw err;
    }
  })();

  return loadPromise;
}

/**
 * Removes the background of an image using the local Python rembg or RMBG-1.4 model.
 * @param {string} dataUrl - Input image as a data URL
 * @param {function} onProgress - (percent: number) => void
 * @returns {Promise<string>} - Image with transparent background as a data URL
 */
export async function removeBackground(dataUrl, onProgress) {
  // 1. Try local Python background removal if in Electron
  if (typeof window !== 'undefined' && window.electronAPI?.removeBackgroundPython) {
    let unsubscribe;
    try {
      console.log('Attempting local Python background removal...');
      onProgress?.(5);
      
      if (window.electronAPI.onBgRemovalProgress) {
        unsubscribe = window.electronAPI.onBgRemovalProgress(({ percent }) => {
          // Map Python download progress (0..100) to 10..95 range in UI
          const mappedProgress = 10 + Math.round(percent * 0.85);
          onProgress?.(mappedProgress);
        });
      }
      
      const result = await window.electronAPI.removeBackgroundPython(dataUrl);
      if (unsubscribe) unsubscribe();

      if (result && result.ok && result.dataUrl) {
        console.log('Local Python background removal successful.');
        onProgress?.(100);
        return result.dataUrl;
      }
      console.warn('Local Python background removal failed, falling back to Web WASM:', result?.error);
    } catch (err) {
      if (unsubscribe) unsubscribe();
      console.warn('Local Python background removal error, falling back to Web WASM:', err);
    }
  }

  // 2. Fallback to Web WASM / WebGPU RMBG-1.4
  try {
    onProgress?.(15);
    const segmentator = await getSegmentator(onProgress);
    onProgress?.(30);

    const image = await RawImage.fromURL(dataUrl);
    onProgress?.(50);

    const output = await segmentator(image);
    onProgress?.(80);

    const mask = output[0].mask;
    
    // Create a canvas to apply the mask to the original image
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    
    // Draw original image
    const origImg = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });
    ctx.drawImage(origImg, 0, 0);
    
    const origImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const origData = origImgData.data;
    
    // Draw mask to temp canvas to get its pixel values
    const maskCanvas = mask.toCanvas();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    
    const maskImgData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskImgData.data;
    
    // Apply mask to original image's alpha channel
    for (let i = 0; i < origData.length; i += 4) {
      // Use the red channel of the grayscale mask as the alpha channel
      origData[i + 3] = maskData[i];
    }
    
    ctx.putImageData(origImgData, 0, 0);
    onProgress?.(100);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Background removal failed, returning original:', err);
    return dataUrl;
  }
}
