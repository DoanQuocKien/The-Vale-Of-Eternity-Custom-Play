/**
 * Background Removal Web Worker
 * Uses Hugging Face Transformers.js dedicated background-removal pipeline.
 * Runs entirely client-side via ONNX Runtime WebAssembly.
 */

import { pipeline, RawImage } from '@huggingface/transformers';

let segmentator = null;

// Post progress messages back to main thread
function postProgress(stage, percent, message) {
  self.postMessage({ type: 'progress', stage, percent, message });
}

// Lazy-initialize the segmentation pipeline
async function getSegmentator() {
  if (segmentator) return segmentator;
  
  postProgress('load', 0, 'Loading RMBG-1.4 model...');

  // Use Xenova/modnet (officially supported for BG removal) instead of briaai/RMBG-1.4
  segmentator = await pipeline('background-removal', 'Xenova/modnet', {
    progress_callback: (progress) => {
      if (progress.status === 'downloading') {
        const pct = Math.round((progress.loaded / progress.total) * 100) || 0;
        postProgress('load', pct, `Downloading model: ${pct}%`);
      } else if (progress.status === 'loading') {
        postProgress('load', 95, 'Initializing model...');
      }
    }
  });

  postProgress('load', 100, 'Model ready');
  return segmentator;
}

self.onmessage = async (event) => {
  const { type, imageDataUrl } = event.data;

  if (type !== 'remove-bg') return;

  try {
    // 1. Load model
    const seg = await getSegmentator();

    // 2. Run inference
    postProgress('inference', 10, 'Analyzing image subject...');
    
    // The background-removal pipeline outputs a RawImage with 4 channels (RGBA)
    const resultImage = await seg(imageDataUrl);

    postProgress('inference', 100, 'Background removed');

    // 3. Send result back
    // The underlying data is a Uint8ClampedArray/Uint8Array
    self.postMessage({
      type: 'result',
      outputData: resultImage.data.buffer,
      width: resultImage.width,
      height: resultImage.height
    }, [resultImage.data.buffer]); // Transfer buffer ownership

  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};
