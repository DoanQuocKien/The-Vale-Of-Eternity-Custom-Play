import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, Camera, ChevronRight, ChevronLeft, Loader, Check, Sliders, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';

// ─── Card art safe zone (from Card_Art_Implementation_Rules.md) ──────────────
// Canvas: 1728×2414. Safe zone: X 18.5%–81%, Y 8.3%–87%
// Zone A cutout (top-left): 0–18.5% W × 0–26.5% H
// Zone B cutout (bottom-right): 69.4%–100% W × 89%–100% H
const SAFE_ZONE = {
  xMin: 18.5,  // %
  xMax: 81,    // %
  yMin: 8.3,   // %
  yMax: 87,    // %
  focalX: 50,  // % ideal center X
  focalY: 47.7 // % ideal center Y (864/2414 * 100 ≈ 47.7% of height is optical center)
};

// Family palette hue angles (HSL degrees) for color tinting
const FAMILY_HUES = {
  Fire: 15,
  Water: 200,
  Earth: 120,
  Wind: 175,
  Dragon: 280,
};

const getBackgroundPath = (family) => {
  const mapping = {
    Fire: 'FireCard.png',
    Water: 'WaterCard.png',
    Earth: 'EarthCard.png',
    Wind: 'WindCard.png',
    Dragon: 'DragonCard.png'
  };
  return `/img/Background/${mapping[family] || 'WaterCard.png'}`;
};

// ─── Canvas image processing utilities ───────────────────────────────────────

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function imageToCanvas(img, maxDim = 2048) {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  // Downscale if too large for processing
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/**
 * Shadow balancing via divide-by-background algorithm:
 * 1. Create blurred version (simulates flat illumination)
 * 2. Divide original by blur → normalizes shadows
 * 3. Stretch result for vivid output
 */
function applyShadowBalance(srcCanvas, strength = 0.85) {
  console.time('applyShadowBalance');
  const { width, height } = srcCanvas;
  console.log(`[ShadowBalance] Starting shadow balance. dimensions=${width}x${height}, strength=${strength}`);
  const ctx = srcCanvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Step 1: Create blurred background model (box blur approximation)
  const blurRadius = Math.round(Math.max(width, height) * 0.08); // 8% of image
  console.log(`[ShadowBalance] Calculating blur background with radius=${blurRadius}px`);
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurCtx = blurCanvas.getContext('2d');
  blurCtx.filter = `blur(${blurRadius}px)`;
  blurCtx.drawImage(srcCanvas, 0, 0);
  const blurData = blurCtx.getImageData(0, 0, width, height).data;

  // Step 2: Divide original by blur, normalize
  console.log('[ShadowBalance] Dividing original by blurred background and normalising channels');
  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = data[i + c];
      const blr = blurData[i + c] || 1;
      // Divide, scale up to target white, blend with strength parameter
      const normalized = (orig / blr) * 255;
      output[i + c] = Math.min(255, Math.max(0, Math.round(orig * (1 - strength) + normalized * strength)));
    }
    output[i + 3] = data[i + 3]; // preserve alpha
  }

  const outImageData = new ImageData(output, width, height);
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  outCanvas.getContext('2d').putImageData(outImageData, 0, 0);
  console.timeEnd('applyShadowBalance');
  console.log('[ShadowBalance] Completed.');
  return outCanvas;
}

/**
 * GPU-accelerated color enhancement via Canvas CSS Filters:
 * - Handles transparency correctly without corrupting pixels
 * - Vibrance maps to saturate()
 * - Brightness & Contrast map to their respective CSS filters
 * - Hue Rotate maps to hue-rotate()
 * - Family Tint blends a colored rectangle using 'color' composite mode
 */
function applyColorEnhancement(srcCanvas, { vibrance = 0, familyTint = 0, familyHue = 200, brightness = 0, contrast = 0, hueRotate = 0 }) {
  const { width, height } = srcCanvas;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');

  // Convert normalized parameters to CSS filter percentages
  // Vibrance (0 to 1) -> 100% to 250%
  const sat = 100 + (vibrance * 150);
  // Brightness (-1 to 1) -> 50% to 150%
  const bri = 100 + (brightness * 50);
  // Contrast (-1 to 1) -> 50% to 150%
  const con = 100 + (contrast * 50);
  
  ctx.filter = `saturate(${sat}%) brightness(${bri}%) contrast(${con}%) hue-rotate(${hueRotate}deg)`;
  ctx.drawImage(srcCanvas, 0, 0);

  // Apply family hue tint selectively to opaque pixels
  if (familyTint > 0) {
    ctx.save();
    // 'color' blending mode changes hue/saturation but preserves luminosity
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = familyTint * 0.4; // Scale down slightly to avoid overpowering
    ctx.fillStyle = `hsl(${familyHue}, 100%, 50%)`;
    ctx.fillRect(0, 0, width, height);

    // Mask back against original alpha to preserve transparency
    ctx.globalCompositeOperation = 'destination-in';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.drawImage(srcCanvas, 0, 0);
    ctx.restore();
  }

  return outCanvas;
}

function canvasToDataUrl(canvas, quality = 0.95) {
  return canvas.toDataURL('image/png', quality);
}

// Apply mask (Uint8ClampedArray RGBA from BG removal worker) onto canvas
function applyBgRemovalMask(srcCanvas, maskBuffer, maskWidth, maskHeight) {
  const outCanvas = document.createElement('canvas');
  outCanvas.width = maskWidth;
  outCanvas.height = maskHeight;
  const ctx = outCanvas.getContext('2d');
  const imageData = new ImageData(new Uint8ClampedArray(maskBuffer), maskWidth, maskHeight);
  ctx.putImageData(imageData, 0, 0);
  return outCanvas;
}

// Enhance faint pencil lines before background removal
function applyLineEnhancement(srcCanvas) {
  console.time('applyLineEnhancement');
  const { width, height } = srcCanvas;
  console.log(`[LineEnhancement] Starting line art enhancement on ${width}x${height} canvas`);
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');
  
  ctx.drawImage(srcCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);
  const data = imgData.data;

  let darkenedPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    const brightness = (r + g + b) / 3;
    
    // If it's darker than pure white, darken it heavily to boost lines
    if (brightness < 240) {
      darkenedPixels++;
      const factor = Math.min(1, (240 - brightness) / 100); // scales intensity, more aggressive
      data[i] = Math.max(0, r - (255 * factor));
      data[i+1] = Math.max(0, g - (255 * factor));
      data[i+2] = Math.max(0, b - (255 * factor));
    } else {
      // Force paper background to pure white to ensure flood fill doesn't snag
      data[i] = 255;
      data[i+1] = 255;
      data[i+2] = 255;
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  console.timeEnd('applyLineEnhancement');
  console.log(`[LineEnhancement] Completed. Darkened ${darkenedPixels} pixels representing lines.`);
  return outCanvas;
}

// ─── Main ArtImporter Component ───────────────────────────────────────────────

const STAGES = ['import', 'deskew', 'process', 'tune', 'confirm'];
const STAGE_LABELS = ['1. Import', '2. Scan & Deskew', '3. AI Process', '4. Color Tune', '5. Place on Card'];

export default function ArtImporter({ isOpen, onClose, onArtConfirmed, cardFamily = 'Water', existingArt = null }) {
  const [stage, setStage] = useState(0); // 0..4
  const [rawDataUrl, setRawDataUrl] = useState(existingArt || null);
  const [deskewedDataUrl, setDeskewedDataUrl] = useState(null);
  const [processedDataUrl, setProcessedDataUrl] = useState(null);
  const [finalDataUrl, setFinalDataUrl] = useState(null);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progressSteps, setProgressSteps] = useState([
    { label: 'Shadow Balance', done: false, active: false, pct: 0, skip: false },
    { label: 'Line Art Enhance', done: false, active: false, pct: 0, skip: false },
    { label: 'BG Removal (Xenova/modnet)', done: false, active: false, pct: 0, skip: false },
  ]);

  // Color tuning state
  const [tuning, setTuning] = useState({
    vibrance: 0.4,
    familyTint: 0.5,
    brightness: 0,
    contrast: 0,
    hueRotate: 0,
  });

  // Art placement state (for confirm stage)
  const [artTransform, setArtTransform] = useState({
    x: SAFE_ZONE.focalX,   // % position on card
    y: SAFE_ZONE.focalY,   // %
    scale: 60,             // % of card width
    rotation: 0,           // degrees
  });

  // Before/after slider
  const [compareSlider, setCompareSlider] = useState(50);

  // Webcam
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const deskewCanvasRef = useRef(null);
  const confirmCanvasRef = useRef(null);
  const bgWorkerRef = useRef(null);
  const upscaleWorkerRef = useRef(null);

  // Drag state for art placement
  const isDraggingArt = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Brush masking state
  const [brushMode, setBrushMode] = useState(null); // 'erase' | 'restore' | null
  const [brushSize, setBrushSize] = useState(20);
  const isBrushing = useRef(false);
  const brushLastPosRef = useRef({ x: 0, y: 0 });
  const editedProcessedCanvasRef = useRef(null);
  const originalImgRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStage(existingArt ? 4 : 0);
      setRawDataUrl(existingArt || null);
      setDeskewedDataUrl(existingArt || null);
      setProcessedDataUrl(existingArt || null);
      setFinalDataUrl(existingArt || null);
    }
  }, [isOpen, existingArt]);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
      if (bgWorkerRef.current) bgWorkerRef.current.terminate();
      if (upscaleWorkerRef.current) upscaleWorkerRef.current.terminate();
    };
  }, [webcamStream]);

  // ─── Input handlers ────────────────────────────────────────────────────────

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setRawDataUrl(evt.target.result);
      setDeskewedDataUrl(evt.target.result);
      setStage(1); // jump to deskew
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setRawDataUrl(evt.target.result);
      setDeskewedDataUrl(evt.target.result);
      setStage(1);
    };
    reader.readAsDataURL(file);
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setWebcamStream(stream);
      setShowWebcam(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      alert('Camera access denied or not available.');
    }
  };

  const captureWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    webcamStream?.getTracks().forEach(t => t.stop());
    setWebcamStream(null);
    setShowWebcam(false);
    setRawDataUrl(dataUrl);
    setDeskewedDataUrl(dataUrl);
    setStage(1);
  };

  // ─── Deskew (jscanify) ─────────────────────────────────────────────────────

  const runDeskew = useCallback(async () => {
    if (!rawDataUrl) return;
    try {
      // Dynamically import jscanify (only when needed)
      const { default: jscanify } = await import('jscanify');
      const img = await loadImageFromDataUrl(rawDataUrl);
      const scanner = new jscanify();

      // Draw source image to temp canvas
      const srcCanvas = imageToCanvas(img, 1600);

      // Extract paper (auto perspective correction)
      const result = scanner.extractPaper(srcCanvas, srcCanvas.width, srcCanvas.height);
      const url = canvasToDataUrl(result);
      setDeskewedDataUrl(url);
    } catch (err) {
      console.warn('Deskew failed (jscanify), using original:', err.message);
      setDeskewedDataUrl(rawDataUrl);
    }
  }, [rawDataUrl]);

  // Auto-deskew when entering stage 1
  useEffect(() => {
    if (stage === 1 && rawDataUrl) {
      runDeskew();
    }
  }, [stage]);

  // ─── AI Processing pipeline ────────────────────────────────────────────────

  const markStep = (idx, status, pct = 0) => {
    setProgressSteps(prev => prev.map((s, i) =>
      i === idx ? { ...s, ...status, pct } : s
    ));
  };

  const runProcessingPipeline = async () => {
    if (!deskewedDataUrl) {
      console.warn('[Pipeline] Attempted to run pipeline but deskewedDataUrl is empty!');
      return;
    }
    console.log('[Pipeline] Initialising image processing pipeline...');
    console.time('PipelineDuration');
    setProcessing(true);
    
    const steps = progressSteps;
    let currentDataUrl = deskewedDataUrl;

    try {
      // ── Step 1: Shadow Balance (Canvas API — no worker needed, fast) ──────
      if (!steps[0].skip) {
        console.log('[Pipeline] Step 1 (Shadow Balance): Starting...');
        markStep(0, { active: true, done: false }, 0);
        const img = await loadImageFromDataUrl(currentDataUrl);
        console.log(`[Pipeline] Step 1: Loaded image. dimensions=${img.naturalWidth}x${img.naturalHeight}`);
        const canvas = imageToCanvas(img, 1600);
        const balanced = applyShadowBalance(canvas, 0.8);
        currentDataUrl = canvasToDataUrl(balanced);
        markStep(0, { active: false, done: true }, 100);
        console.log('[Pipeline] Step 1 (Shadow Balance): Completed.');
      } else {
        console.log('[Pipeline] Step 1 (Shadow Balance): Skipped.');
        markStep(0, { active: false, done: true, pct: 100 });
      }

      // ── Step 2: Line Art Enhancement (Darkens faint lines for AI) ──
      if (!steps[1].skip) {
        console.log('[Pipeline] Step 2 (Line Art Enhancement): Starting...');
        markStep(1, { active: true, done: false }, 0);
        
        // Let UI update
        await new Promise(r => setTimeout(r, 50));
        
        const img = await loadImageFromDataUrl(currentDataUrl);
        console.log(`[Pipeline] Step 2: Loaded image. dimensions=${img.naturalWidth}x${img.naturalHeight}`);
        const canvas = imageToCanvas(img, 1600);
        const enhanced = applyLineEnhancement(canvas);
        currentDataUrl = canvasToDataUrl(enhanced);
        
        markStep(1, { active: false, done: true }, 100);
        console.log('[Pipeline] Step 2 (Line Art Enhancement): Completed.');
      } else {
        console.log('[Pipeline] Step 2 (Line Art Enhancement): Skipped.');
        markStep(1, { active: false, done: true, pct: 100 });
      }


      // ── Step 3: Flood Fill Extraction (True inside/outside line art detection) ──
      if (!steps[2].skip) {
        console.log('[Pipeline] Step 3 (Flood Fill Extraction): Starting...');
        markStep(2, { active: true, done: false }, 0);
        
        // Use the high-contrast Line-Enhanced image for detecting boundaries
        console.log('[Pipeline] Step 3: Loading enhanced image for boundary mask...');
        const enhancedImg = await loadImageFromDataUrl(currentDataUrl);
        const width = enhancedImg.width;
        const height = enhancedImg.height;
        console.log(`[Pipeline] Step 3: Enhanced image dimensions=${width}x${height}`);
        
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.drawImage(enhancedImg, 0, 0);
        const maskData = maskCtx.getImageData(0, 0, width, height).data;

        // Load original untouched deskewed image
        console.log('[Pipeline] Step 3: Loading original deskewed image...');
        const origImg = await loadImageFromDataUrl(deskewedDataUrl);
        console.log(`[Pipeline] Step 3: Original deskewed dimensions=${origImg.width}x${origImg.height}`);
        const origCanvas = document.createElement('canvas');
        origCanvas.width = width;
        origCanvas.height = height;
        const origCtx = origCanvas.getContext('2d');
        origCtx.drawImage(origImg, 0, 0, width, height);
        const origImgData = origCtx.getImageData(0, 0, width, height);
        const origData = origImgData.data;

        // --- Fast Flood Fill ---
        console.log('[Pipeline] Step 3: Starting fast Flood Fill extraction...');
        console.time('FloodFillRun');
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height * 2);
        let head = 0, tail = 0;

        const push = (x, y) => {
          if (x < 0 || x >= width || y < 0 || y >= height) return;
          const idx = y * width + x;
          if (visited[idx]) return;
          visited[idx] = 1;
          queue[tail++] = x;
          queue[tail++] = y;
        };

        const inset = Math.floor(Math.min(width, height) * 0.015); // 1.5% inset to bypass any black scanning borders
        console.log(`[Pipeline] Step 3: Using border inset of ${inset}px to bypass edge artifacts`);

        // Start from inset borders instead of absolute edges
        for (let x = inset; x < width - inset; x++) { push(x, inset); push(x, height - 1 - inset); }
        for (let y = inset; y < height - inset; y++) { push(inset, y); push(width - 1 - inset, y); }
        console.log(`[Pipeline] Step 3: Initial border queue size = ${tail / 2}`);

        let erasedCount = 0;
        let lineHits = 0;

        while (head < tail) {
          const x = queue[head++];
          const y = queue[head++];
          const pIdx = (y * width + x) * 4;
          
          const brightness = (maskData[pIdx] + maskData[pIdx+1] + maskData[pIdx+2]) / 3;
          
          // Use a strict threshold of 128 (mid-gray) for the mask since we aggressively enhanced lines
          if (brightness < 128) {
            lineHits++;
            continue;
          }
          
          // It's outside paper! Erase it on the ORIGINAL image.
          origData[pIdx + 3] = 0;
          erasedCount++;
          
          // Add neighbors
          push(x - 1, y);
          push(x + 1, y);
          push(x, y - 1);
          push(x, y + 1);
        }

        // Clean up the outer border physical pixels directly (since the flood fill was inset and couldn't reach them)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (x < inset || x >= width - inset || y < inset || y >= height - inset) {
              const pIdx = (y * width + x) * 4;
              origData[pIdx + 3] = 0; 
            }
          }
        }
        console.timeEnd('FloodFillRun');
        console.log(`[Pipeline] Step 3: Flood fill traversal finished. Erased ${erasedCount} pixels. Stopped at line boundaries ${lineHits} times.`);
        
        origCtx.putImageData(origImgData, 0, 0);
        currentDataUrl = origCanvas.toDataURL('image/png');
        
        markStep(2, { active: false, done: true }, 100);
        console.log('[Pipeline] Step 3 (Flood Fill Extraction): Completed.');
      } else {
        console.log('[Pipeline] Step 3 (Flood Fill Extraction): Skipped.');
        markStep(2, { active: false, done: true, pct: 100 });
      }

      setProcessedDataUrl(currentDataUrl);
      setFinalDataUrl(currentDataUrl);
      setProcessing(false);
      console.timeEnd('PipelineDuration');
      console.log('[Pipeline] Pipeline finished successfully.');
      setStage(3); // advance to color tuning

    } catch (err) {
      console.timeEnd('PipelineDuration');
      console.error('[Pipeline] CRITICAL ERROR IN PIPELINE:', err);
      setProcessing(false);
      alert('Processing error: ' + err.message);
    }
  };

  // ─── Color tuning (applied live) ──────────────────────────────────────────

  const [tunedDataUrl, setTunedDataUrl] = useState(null);
  const tuningDebounceRef = useRef(null);

  useEffect(() => {
    if (stage !== 3 || !processedDataUrl) return;
    if (tuningDebounceRef.current) clearTimeout(tuningDebounceRef.current);
    tuningDebounceRef.current = setTimeout(async () => {
      const img = await loadImageFromDataUrl(processedDataUrl);
      const canvas = imageToCanvas(img, 1200);
      const enhanced = applyColorEnhancement(canvas, {
        vibrance: tuning.vibrance,
        familyTint: tuning.familyTint,
        familyHue: FAMILY_HUES[cardFamily] || 200,
        brightness: tuning.brightness,
        contrast: tuning.contrast,
        hueRotate: tuning.hueRotate,
        lumaKey: tuning.lumaKey,
      });
      setTunedDataUrl(canvasToDataUrl(enhanced));
      setFinalDataUrl(canvasToDataUrl(enhanced));
    }, 200);
  }, [tuning, processedDataUrl, stage, cardFamily]);

  // Initialize tuned URL when entering stage 3
  useEffect(() => {
    if (stage === 3 && processedDataUrl && !tunedDataUrl) {
      setTunedDataUrl(processedDataUrl);
      setFinalDataUrl(processedDataUrl);
    }
  }, [stage, processedDataUrl]);

  // Brush Masking Initialization
  useEffect(() => {
    if (stage === 3 && processedDataUrl && !editedProcessedCanvasRef.current) {
      loadImageFromDataUrl(processedDataUrl).then(img => {
        editedProcessedCanvasRef.current = imageToCanvas(img, 1200);
      });
      if (deskewedDataUrl) {
        loadImageFromDataUrl(deskewedDataUrl).then(img => {
          originalImgRef.current = img;
        });
      }
    }
    if (stage !== 3) {
      editedProcessedCanvasRef.current = null;
      originalImgRef.current = null;
    }
  }, [stage, processedDataUrl, deskewedDataUrl]);

  // Draw Tuned Image onto Preview Canvas
  useEffect(() => {
    if (tunedDataUrl && previewCanvasRef.current) {
      const cvs = previewCanvasRef.current;
      const ctx = cvs.getContext('2d');
      loadImageFromDataUrl(tunedDataUrl).then(img => {
        cvs.width = img.width;
        cvs.height = img.height;
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.drawImage(img, 0, 0);
      });
    }
  }, [tunedDataUrl]);

  // Brush Mouse Handlers
  const applyBrush = (x, y, lastX, lastY, displayWidth, displayHeight) => {
    if (!editedProcessedCanvasRef.current) return;
    const cvs = editedProcessedCanvasRef.current;
    const scaleX = cvs.width / displayWidth;
    const scaleY = cvs.height / displayHeight;
    const ctx = cvs.getContext('2d');
    
    if (brushMode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize * scaleX;
      ctx.beginPath();
      ctx.moveTo(lastX * scaleX, lastY * scaleY);
      ctx.lineTo(x * scaleX, y * scaleY);
      ctx.stroke();
    } else if (brushMode === 'restore' && originalImgRef.current) {
      const tempCvs = document.createElement('canvas');
      tempCvs.width = cvs.width;
      tempCvs.height = cvs.height;
      const tCtx = tempCvs.getContext('2d');
      tCtx.lineCap = 'round';
      tCtx.lineJoin = 'round';
      tCtx.lineWidth = brushSize * scaleX;
      tCtx.beginPath();
      tCtx.moveTo(lastX * scaleX, lastY * scaleY);
      tCtx.lineTo(x * scaleX, y * scaleY);
      tCtx.stroke();
      
      tCtx.globalCompositeOperation = 'source-in';
      tCtx.drawImage(originalImgRef.current, 0, 0, tempCvs.width, tempCvs.height);
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(tempCvs, 0, 0);
    }
    
    if (previewCanvasRef.current) {
      const pCtx = previewCanvasRef.current.getContext('2d');
      pCtx.lineCap = 'round';
      pCtx.lineJoin = 'round';
      pCtx.lineWidth = brushSize * scaleX;
      pCtx.beginPath();
      pCtx.moveTo(lastX * scaleX, lastY * scaleY);
      pCtx.lineTo(x * scaleX, y * scaleY);
      if (brushMode === 'erase') {
        pCtx.globalCompositeOperation = 'destination-out';
        pCtx.stroke();
      } else {
        pCtx.globalCompositeOperation = 'source-over';
        pCtx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        pCtx.stroke();
      }
    }
  };

  const handleBrushDown = (e) => {
    if (!brushMode || !previewCanvasRef.current) return;
    isBrushing.current = true;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    brushLastPosRef.current = { x, y };
    applyBrush(x, y, x, y, rect.width, rect.height);
    e.preventDefault();
  };

  const handleBrushMove = (e) => {
    if (!isBrushing.current || !brushMode || !previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    applyBrush(x, y, brushLastPosRef.current.x, brushLastPosRef.current.y, rect.width, rect.height);
    brushLastPosRef.current = { x, y };
  };

  const handleBrushUp = () => {
    if (isBrushing.current) {
      isBrushing.current = false;
      if (editedProcessedCanvasRef.current) {
        setProcessedDataUrl(canvasToDataUrl(editedProcessedCanvasRef.current));
      }
    }
  };

  // ─── Art placement (confirm stage) ────────────────────────────────────────

  const handleConfirm = () => {
    if (!finalDataUrl) return;
    onArtConfirmed({
      dataUrl: finalDataUrl,
      transform: artTransform
    });
    onClose();
  };

  // Drag-to-reposition art on confirm canvas
  const handleArtMouseDown = (e) => {
    isDraggingArt.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: artTransform.x,
      ty: artTransform.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDraggingArt.current) return;
      const container = confirmCanvasRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
      setArtTransform(prev => ({
        ...prev,
        x: Math.max(5, Math.min(95, dragStartRef.current.tx + dx)),
        y: Math.max(5, Math.min(95, dragStartRef.current.ty + dy))
      }));
    };
    const handleUp = () => { isDraggingArt.current = false; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  if (!isOpen) return null;

  // ─── Render ───────────────────────────────────────────────────────────────

  const panelStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
  };

  const modalStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    width: '900px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
  };

  const stepBtnStyle = (active) => ({
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: active ? '2px solid var(--color-primary)' : '2px solid transparent',
    background: active ? 'rgba(99,102,241,0.15)' : 'var(--bg-surface-elevated)',
    color: active ? 'white' : 'var(--text-muted)',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'default',
    transition: 'all 0.2s',
    flexShrink: 0,
  });

  return (
    <div style={panelStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface-elevated)',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              🎨 Art Integrator
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              Scan, enhance, and place your creature art onto the card
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>

        {/* Stage indicator */}
        <div style={{ display: 'flex', gap: '0.4rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', flexShrink: 0, background: 'var(--bg-main)' }}>
          {STAGE_LABELS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
              <button style={stepBtnStyle(stage === i)}>
                {i < stage ? '✓ ' : ''}{label}
              </button>
              {i < STAGE_LABELS.length - 1 && <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {/* Stage Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>

          {/* ── Stage 0: Import ── */}
          {stage === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                Upload or photograph your hand-drawn creature art. We'll flatten, enhance, and remove the background automatically.
              </p>

              {/* Webcam area */}
              {showWebcam ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width: '100%', maxWidth: '500px', borderRadius: '12px', border: '2px solid var(--color-primary)' }} />
                  <button onClick={captureWebcam} style={{
                    padding: '0.6rem 1.5rem', background: 'var(--color-primary)', border: 'none',
                    borderRadius: '8px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
                  }}>
                    📸 Capture Photo
                  </button>
                  <button onClick={() => { webcamStream?.getTracks().forEach(t => t.stop()); setShowWebcam(false); setWebcamStream(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  style={{
                    border: '2px dashed var(--border-color-hover)',
                    borderRadius: '16px',
                    padding: '3rem',
                    textAlign: 'center',
                    background: 'var(--bg-surface-elevated)',
                    transition: 'border-color 0.2s',
                    cursor: 'pointer',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={40} style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Drag & drop your image here
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 1.25rem' }}>
                    or click to browse files (JPG, PNG, HEIC, WebP)
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); startWebcam(); }}
                    style={{
                      padding: '0.5rem 1.25rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    <Camera size={16} /> Use Camera
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* ── Stage 1: Deskew ── */}
          {stage === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Auto-detected paper boundaries and corrected perspective. Check the result below — the art should appear flat and straight.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Original</p>
                  <img src={rawDataUrl} alt="Original" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.4rem' }}>After Deskew</p>
                  <img src={deskewedDataUrl || rawDataUrl} alt="Deskewed" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--color-primary)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={runDeskew} style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  🔄 Re-run Auto-Detect
                </button>
                <button
                  onClick={() => { setDeskewedDataUrl(rawDataUrl); }}
                  style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}
                >
                  Skip (use original)
                </button>
                <button
                  onClick={() => setStage(2)}
                  style={{ padding: '0.5rem 1.25rem', background: 'var(--color-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Next: AI Process <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Stage 2: Processing ── */}
          {stage === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Configure and run the AI pipeline. Toggle steps on/off to customize the process.
              </p>

              {/* Step toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {progressSteps.map((step, idx) => (
                  <div key={idx} style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: `1px solid ${step.active ? 'var(--color-primary)' : step.done ? 'var(--color-success)' : 'var(--border-color)'}`,
                    background: step.active ? 'rgba(99,102,241,0.08)' : step.done ? 'rgba(16,185,129,0.06)' : 'var(--bg-surface-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: step.done ? 'var(--color-success)' : step.active ? 'var(--color-primary)' : 'var(--bg-main)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${step.done ? 'var(--color-success)' : step.active ? 'var(--color-primary)' : 'var(--border-color)'}`,
                      fontSize: '0.75rem', fontWeight: 800, color: (step.done || step.active) ? 'white' : 'var(--text-muted)'
                    }}>
                      {step.done ? '✓' : step.active ? <Loader size={13} className="spin" /> : idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: step.skip ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: step.skip ? 'line-through' : 'none' }}>
                          {step.label}
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={!step.skip} disabled={processing}
                            onChange={(e) => setProgressSteps(prev => prev.map((s, i) => i === idx ? { ...s, skip: !e.target.checked } : s))} />
                          Enable
                        </label>
                      </div>
                      {step.active && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <div style={{ height: '4px', borderRadius: '4px', background: 'var(--bg-main)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${step.pct}%`, background: 'var(--color-primary)', transition: 'width 0.4s ease', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', marginTop: '0.2rem', display: 'block' }}>{step.pct}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setStage(1)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  ← Back
                </button>
                <button
                  onClick={runProcessingPipeline}
                  disabled={processing}
                  style={{
                    padding: '0.6rem 1.5rem',
                    background: processing ? 'var(--bg-surface-elevated)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', borderRadius: '8px', cursor: processing ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem', fontWeight: 800, color: 'white',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    boxShadow: processing ? 'none' : '0 4px 16px rgba(99,102,241,0.35)'
                  }}
                >
                  {processing ? <><Loader size={16} /> Processing…</> : '🚀 Run AI Pipeline'}
                </button>
              </div>
            </div>
          )}

          {/* ── Stage 3: Color Tuning ── */}
          {stage === 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
              {/* Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>Color Tuning</h3>

                {[
                  { key: 'vibrance', label: 'Vibrance', min: 0, max: 1, step: 0.05 },
                  { key: 'familyTint', label: `Family Tint (${cardFamily})`, min: 0, max: 1, step: 0.05 },
                  { key: 'brightness', label: 'Brightness', min: -1, max: 1, step: 0.05 },
                  { key: 'contrast', label: 'Contrast', min: -1, max: 1, step: 0.05 },
                  { key: 'hueRotate', label: 'Hue Rotate (°)', min: -180, max: 180, step: 1 },
                ].map(({ key, label, min, max, step }) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{tuning[key]}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step}
                      value={tuning[key]}
                      onChange={(e) => setTuning(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                      style={{ width: '100%' }} />
                  </div>
                ))}

                <button
                  onClick={() => setTuning({ vibrance: 0.4, familyTint: 0.5, brightness: 0, contrast: 0, hueRotate: 0 })}
                  style={{ padding: '0.4rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                >
                  Reset to Defaults
                </button>

                <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Brush Masking</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setBrushMode(brushMode === 'erase' ? null : 'erase')}
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: brushMode === 'erase' ? 'var(--color-primary)' : 'transparent', color: brushMode === 'erase' ? 'white' : 'var(--text-primary)', cursor: 'pointer' }}>
                      Erase BG
                    </button>
                    <button 
                      onClick={() => setBrushMode(brushMode === 'restore' ? null : 'restore')}
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: brushMode === 'restore' ? '#10b981' : 'transparent', color: brushMode === 'restore' ? 'white' : 'var(--text-primary)', cursor: 'pointer' }}>
                      Restore Art
                    </button>
                  </div>
                  {brushMode && (
                    <div style={{ marginTop: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Brush Size</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{brushSize}px</span>
                      </div>
                      <input type="range" min={5} max={100} step={1} value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} style={{ width: '100%' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <button onClick={() => setStage(2)} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ← Back
                  </button>
                  <button onClick={() => setStage(4)} style={{ flex: 2, padding: '0.5rem 1rem', background: 'var(--color-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                    Next: Place on Card →
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Live Preview</p>
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-main)', backgroundImage: 'repeating-conic-gradient(#80808033 0% 25%, transparent 0% 50%)', backgroundSize: '20px 20px', border: '1px solid var(--border-color)' }}>
                  {/* Before/after slider */}
                  <img src={processedDataUrl} alt="Before" style={{ width: '100%', display: 'block', opacity: compareSlider < 100 ? 1 : 0 }} />
                  <div style={{
                    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                    clipPath: `inset(0 0 0 ${compareSlider}%)`
                  }}>
                    <canvas 
                      ref={previewCanvasRef} 
                      style={{ 
                        width: '100%', display: 'block', 
                        cursor: brushMode ? (brushMode === 'erase' ? 'url(/erase.png), crosshair' : 'url(/restore.png), crosshair') : 'default',
                        touchAction: brushMode ? 'none' : 'auto'
                      }} 
                      onMouseDown={handleBrushDown}
                      onMouseMove={handleBrushMove}
                      onMouseUp={handleBrushUp}
                      onMouseLeave={handleBrushUp}
                    />
                  </div>
                  {/* Slider line */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${compareSlider}%`, width: '2px', background: 'white', boxShadow: '0 0 6px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, padding: '0.3rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(0,0,0,0.5)', color: 'white', pointerEvents: 'none' }}>BEFORE</div>
                  <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.3rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(99,102,241,0.7)', color: 'white', pointerEvents: 'none' }}>AFTER</div>
                </div>
                <input type="range" min={0} max={100} value={compareSlider}
                  onChange={(e) => setCompareSlider(parseInt(e.target.value))}
                  style={{ width: '100%' }} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Drag slider to compare before/after</p>
              </div>
            </div>
          )}

          {/* ── Stage 4: Place on Card ── */}
          {stage === 4 && (
            <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* Transform controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f472b6', margin: 0 }}>Position & Size</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Drag the art on the card preview to reposition it. Use sliders for precise control.
                </p>

                {[
                  { key: 'x', label: 'Horizontal Position (%)', min: 5, max: 95, step: 0.5 },
                  { key: 'y', label: 'Vertical Position (%)', min: 5, max: 95, step: 0.5 },
                  { key: 'scale', label: 'Size (% of card width)', min: 10, max: 150, step: 1 },
                  { key: 'rotation', label: 'Rotation (°)', min: -180, max: 180, step: 1 },
                ].map(({ key, label, min, max, step }) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
                      <span style={{ color: '#f472b6', fontWeight: 700 }}>{artTransform[key]}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step}
                      value={artTransform[key]}
                      onChange={(e) => setArtTransform(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                      style={{ width: '100%' }} />
                  </div>
                ))}

                <button
                  onClick={() => setArtTransform({ x: SAFE_ZONE.focalX, y: SAFE_ZONE.focalY, scale: 60, rotation: 0 })}
                  style={{ padding: '0.4rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                >
                  Reset to Center
                </button>

                <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  💡 Art is placed on the <strong>middle layer</strong> — between the card background and the text frame overlays. The frame border will naturally mask any bleed edges.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setStage(3)} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ← Back
                  </button>
                  <button onClick={handleConfirm} style={{
                    flex: 2, padding: '0.6rem 1rem',
                    background: 'linear-gradient(135deg, #ec4899, #db2777)',
                    border: 'none', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: 800, color: 'white',
                    boxShadow: '0 4px 16px rgba(236,72,153,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}>
                    <Check size={16} /> Apply to Card
                  </button>
                </div>
              </div>

              {/* Card preview with art overlay */}
              <div ref={confirmCanvasRef} style={{
                position: 'relative',
                width: '240px',
                height: '335px', // 240 × (2414/1728) = 335
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                border: `2px solid var(--family-${cardFamily.toLowerCase()})`,
                userSelect: 'none',
                margin: '0 auto'
              }}>
                {/* Card Background (bottom) */}
                <img src={getBackgroundPath(cardFamily)} alt="Card Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }} />

                {/* Art layer (middle) */}
                {finalDataUrl && (
                  <img
                    src={finalDataUrl}
                    alt="Card art"
                    onMouseDown={handleArtMouseDown}
                    style={{
                      position: 'absolute',
                      left: `${artTransform.x}%`,
                      top: `${artTransform.y}%`,
                      width: `${artTransform.scale}%`,
                      transform: `translate(-50%, -50%) rotate(${artTransform.rotation}deg)`,
                      cursor: 'move',
                      zIndex: 2,
                      pointerEvents: 'all',
                      userSelect: 'none',
                    }}
                    draggable={false}
                  />
                )}

                {/* Text frame overlay (simulated by border) is handled by the parent in App.jsx */}

                {/* Safe zone overlay guide */}
                <div style={{
                  position: 'absolute',
                  left: `${SAFE_ZONE.xMin}%`,
                  top: `${SAFE_ZONE.yMin}%`,
                  width: `${SAFE_ZONE.xMax - SAFE_ZONE.xMin}%`,
                  height: `${SAFE_ZONE.yMax - SAFE_ZONE.yMin}%`,
                  border: '1px dashed rgba(255,255,255,0.2)',
                  borderRadius: '2px',
                  zIndex: 3,
                  pointerEvents: 'none'
                }} />

                <p style={{
                  position: 'absolute', bottom: '4px', left: 0, right: 0,
                  fontSize: '8px', color: 'rgba(255,255,255,0.4)', textAlign: 'center',
                  zIndex: 4, pointerEvents: 'none'
                }}>
                  ←drag art→
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
