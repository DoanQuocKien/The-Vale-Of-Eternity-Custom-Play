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
      console.log('Initializing RMBG-1.4 with WebGPU...');
      const instance = await pipeline("image-segmentation", "onnx-community/RMBG-1.4", {
        device: "webgpu",
        progress_callback,
      });
      segmentatorInstance = instance;
      console.log('RMBG-1.4 initialized with WebGPU successfully.');
      return instance;
    } catch (err) {
      console.warn("WebGPU failed, falling back to WASM:", err);
      const instance = await pipeline("image-segmentation", "onnx-community/RMBG-1.4", {
        device: "wasm",
        progress_callback,
      });
      segmentatorInstance = instance;
      console.log('RMBG-1.4 initialized with WASM successfully.');
      return instance;
    }
  })();

  return loadPromise;
}

/**
 * Removes the background of an image using the RMBG-1.4 model.
 * @param {string} dataUrl - Input image as a data URL
 * @param {function} onProgress - (percent: number) => void
 * @returns {Promise<string>} - Image with transparent background as a data URL
 */
export async function removeBackground(dataUrl, onProgress) {
  try {
    onProgress?.(5);
    const segmentator = await getSegmentator(onProgress);
    onProgress?.(20);

    const image = await RawImage.fromURL(dataUrl);
    onProgress?.(40);

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
