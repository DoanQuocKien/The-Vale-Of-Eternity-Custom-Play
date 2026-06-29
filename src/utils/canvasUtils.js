// ─── Canvas image processing utilities ───────────────────────────────────────

export function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function imageToCanvas(img, maxDim = 2048) {
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
export function applyShadowBalance(srcCanvas, strength = 0.85) {
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
export function applyColorEnhancement(srcCanvas, { vibrance = 0, familyTint = 0, familyHue = 200, brightness = 0, contrast = 0, hueRotate = 0 }) {
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

export function canvasToDataUrl(canvas, quality = 0.95) {
  return canvas.toDataURL('image/png', quality);
}

// Apply mask (Uint8ClampedArray RGBA from BG removal worker) onto canvas
export function applyBgRemovalMask(srcCanvas, maskBuffer, maskWidth, maskHeight) {
  const outCanvas = document.createElement('canvas');
  outCanvas.width = maskWidth;
  outCanvas.height = maskHeight;
  const ctx = outCanvas.getContext('2d');
  const imageData = new ImageData(new Uint8ClampedArray(maskBuffer), maskWidth, maskHeight);
  ctx.putImageData(imageData, 0, 0);
  return outCanvas;
}

export function drawShape(ctx, type, start, end, params) {
  const {
    strokeColor,
    fillColor,
    strokeEnabled,
    fillEnabled,
    brushSize,
    opacity,
    fontSize,
    textString,
    fontWeight,
    strokeSize
  } = params;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  
  // Use specific strokeSize if available (e.g. for text outlines), otherwise general brushSize
  ctx.lineWidth = strokeSize !== undefined ? strokeSize : brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'line') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    if (strokeEnabled) ctx.stroke();
  } else if (type === 'rect') {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(start.x - end.x);
    const h = Math.abs(start.y - end.y);
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    if (fillEnabled) ctx.fill();
    if (strokeEnabled) ctx.stroke();
  } else if (type === 'circle') {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const radius = Math.sqrt(dx * dx + dy * dy);
    ctx.beginPath();
    ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
    if (fillEnabled) ctx.fill();
    if (strokeEnabled) ctx.stroke();
  } else if (type === 'text') {
    const fw = fontWeight !== undefined ? fontWeight : 'bold';
    ctx.font = `${fw} ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (fillEnabled) {
      ctx.fillStyle = fillColor;
      ctx.fillText(textString, start.x, start.y);
    }
    if (strokeEnabled) {
      ctx.strokeStyle = strokeColor;
      ctx.strokeText(textString, start.x, start.y);
    }
  }
  ctx.restore();
}

// Enhance faint pencil lines before background removal
export function applyLineEnhancement(srcCanvas) {
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
