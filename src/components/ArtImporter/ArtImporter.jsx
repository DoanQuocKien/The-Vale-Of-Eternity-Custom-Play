import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, Camera, ChevronRight, ChevronLeft, Loader, Check, Sliders, ZoomIn, ZoomOut, RotateCcw, Move, Square, Circle as CircleIcon, Type, Paintbrush, Eraser, Trash2 } from 'lucide-react';

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

import { getBackgroundPath } from '../../utils/constants.jsx';

import {
  loadImageFromDataUrl,
  imageToCanvas,
  applyShadowBalance,
  applyColorEnhancement,
  canvasToDataUrl,
  applyBgRemovalMask,
  drawShape,
  applyLineEnhancement
} from '../../utils/canvasUtils.js';

// ─── Custom Color Picker Helpers ─────────────────────────────────────────────
function hexToHsl(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h <= 360) {
    r = c; g = 0; b = x;
  }

  let rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  let gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  let bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

const colorPickerStyles = `
  .custom-color-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    border-radius: 4px;
    outline: none;
    margin: 6px 0;
    cursor: pointer;
  }
  .custom-color-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid var(--color-primary, #6366f1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: transform 0.1s;
  }
  .custom-color-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }
  .custom-color-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid var(--color-primary, #6366f1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: transform 0.1s;
  }
  .custom-color-slider::-moz-range-thumb:hover {
    transform: scale(1.15);
  }
`;

function ColorPickerPanel({ color, onChange, label }) {
  const [hsl, setHsl] = useState({ h: 200, s: 80, l: 50 });
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    if (color && color.startsWith('#')) {
      const parsed = hexToHsl(color);
      setHsl(parsed);
      setHexInput(color);
    }
  }, [color]);

  const handleHslChange = (h, s, l) => {
    setHsl({ h, s, l });
    const hex = hslToHex(h, s, l);
    setHexInput(hex);
    onChange(hex);
  };

  const handleHexInputChange = (e) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
      onChange(val);
      const parsed = hexToHsl(val);
      setHsl(parsed);
    }
  };

  const presets = ['#ffffff', '#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#ec4899', '#a78bfa', '#f472b6'];

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      marginTop: '0.25rem'
    }}>
      <style>{colorPickerStyles}</style>
      {label && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>}
      
      {/* Preset Swatches */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button
            key={p}
            onClick={() => {
              onChange(p);
              const parsed = hexToHsl(p);
              setHsl(parsed);
              setHexInput(p);
            }}
            style={{
              width: '18px',
              height: '18px',
              background: p,
              border: color.toLowerCase() === p.toLowerCase() ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: 0
            }}
            title={p}
          />
        ))}
      </div>

      {/* Interactive Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {/* Hue Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Hue</span>
            <span>{hsl.h}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={hsl.h}
            onChange={(e) => handleHslChange(parseInt(e.target.value), hsl.s, hsl.l)}
            className="custom-color-slider"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            }}
          />
        </div>

        {/* Saturation Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Saturation</span>
            <span>{hsl.s}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={hsl.s}
            onChange={(e) => handleHslChange(hsl.h, parseInt(e.target.value), hsl.l)}
            className="custom-color-slider"
            style={{
              background: `linear-gradient(to right, hsl(${hsl.h}, 0%, 50%), hsl(${hsl.h}, 100%, 50%))`,
            }}
          />
        </div>

        {/* Lightness Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Lightness</span>
            <span>{hsl.l}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={hsl.l}
            onChange={(e) => handleHslChange(hsl.h, hsl.s, parseInt(e.target.value))}
            className="custom-color-slider"
            style={{
              background: `linear-gradient(to right, #000000, hsl(${hsl.h}, 100%, 50%), #ffffff)`,
            }}
          />
        </div>
      </div>

      {/* Hex Text Input & Color Preview Box */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
        <div style={{
          position: 'relative',
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          background: color,
          border: '1px solid var(--border-color)',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          overflow: 'hidden'
        }} title="Click to open full color picker">
          <input
            type="color"
            value={color}
            onChange={(e) => {
              onChange(e.target.value);
              const parsed = hexToHsl(e.target.value);
              setHsl(parsed);
              setHexInput(e.target.value);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
          />
        </div>
        <input
          type="text"
          value={hexInput}
          onChange={handleHexInputChange}
          placeholder="#ffffff"
          style={{
            flexGrow: 1,
            padding: '0.4rem 0.6rem',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'white',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            outline: 'none'
          }}
        />
      </div>
    </div>
  );
}

// ─── Main ArtImporter Component ───────────────────────────────────────────────

const STAGES = ['import', 'deskew', 'process', 'tune', 'confirm'];
const STAGE_LABELS = ['1. Import', '2. Scan & Deskew', '3. AI Process', '4. Color Tune', '5. Place on Card'];
const STAGE_LABELS_TOKEN = ['1. Import', '2. Scan & Deskew', '3. AI Process', '4. Color Tune', '5. Place on Token'];
const STAGE_LABELS_COMPONENT = ['1. Import', '2. Scan & Deskew', '3. AI Process', '4. Color Tune', '5. Place on Component'];

export default function ArtImporter({ isOpen, onClose, onArtConfirmed, cardFamily = 'Water', existingArt = null, existingTransform = null, isTokenMode = false, isComponentMode = false }) {
  const isCustomMode = isTokenMode || isComponentMode;
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

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const isPanning = useRef(false);
  const [isPanningState, setIsPanningState] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(z => Math.min(8, z + 0.25));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.25));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Creation mode state
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Drawing suite state
  const [tool, setTool] = useState('brush'); // 'brush', 'line', 'rect', 'circle', 'polygon', 'text', 'erase', 'restore', 'pan'
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#6366f1');
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [fillEnabled, setFillEnabled] = useState(true);
  const [opacity, setOpacity] = useState(1.0);
  const [fontSize, setFontSize] = useState(30);
  const [textString, setTextString] = useState('Creature');
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [fontWeight, setFontWeight] = useState(700);

  // Refs for drawing preview
  const isDrawingShape = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const tunedImgRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStage(existingArt ? 4 : 0);
      setRawDataUrl(existingArt || null);
      setDeskewedDataUrl(existingArt || null);
      setProcessedDataUrl(existingArt || null);
      setFinalDataUrl(existingArt || null);
      setIsCreateMode(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setTool('brush');
      setBrushMode(null);
      setPolygonPoints([]);
      tunedImgRef.current = null;

      if (existingTransform) {
        setArtTransform(existingTransform);
      } else {
        setArtTransform({
          x: SAFE_ZONE.focalX,
          y: SAFE_ZONE.focalY,
          scale: 60,
          rotation: 0,
        });
      }
    }
  }, [isOpen, existingArt, existingTransform]);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    };
  }, [webcamStream]);

  // ─── Input handlers ────────────────────────────────────────────────────────

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setIsCreateMode(false);
      setTool('brush');
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
      setIsCreateMode(false);
      setTool('brush');
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
    setIsCreateMode(false);
    setTool('brush');
    setRawDataUrl(dataUrl);
    setDeskewedDataUrl(dataUrl);
    setStage(1);
  };

  const createBlankCanvas = () => {
    editedProcessedCanvasRef.current = null;
    const canvas = document.createElement('canvas');
    canvas.width = 1728;
    canvas.height = 2414;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    
    setIsCreateMode(true);
    setTool('brush');
    setRawDataUrl(dataUrl);
    setDeskewedDataUrl(dataUrl);
    setProcessedDataUrl(dataUrl);
    setTunedDataUrl(dataUrl);
    setFinalDataUrl(dataUrl);
    setStage(3); // Jump straight to drawing stage
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

  // Apply tuning when sliders change
  useEffect(() => {
    if (stage !== 3 || !processedDataUrl) return;
    
    if (isCreateMode) {
      setTunedDataUrl(processedDataUrl);
      setFinalDataUrl(processedDataUrl);
      return;
    }

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
  }, [tuning, processedDataUrl, stage, cardFamily, isCreateMode]);

  // Initialize tuned URL when entering stage 3
  useEffect(() => {
    if (stage === 3 && processedDataUrl && !tunedDataUrl) {
      setTunedDataUrl(processedDataUrl);
      setFinalDataUrl(processedDataUrl);
    }
  }, [stage, processedDataUrl]);

  // Load tuned data URL into an image ref for fast synchronous preview rendering
  useEffect(() => {
    if (tunedDataUrl) {
      loadImageFromDataUrl(tunedDataUrl).then(img => {
        tunedImgRef.current = img;
        if (previewCanvasRef.current) {
          const cvs = previewCanvasRef.current;
          cvs.width = img.width;
          cvs.height = img.height;
          const ctx = cvs.getContext('2d');
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          ctx.drawImage(img, 0, 0);
        }
      });
    } else {
      tunedImgRef.current = null;
    }
  }, [tunedDataUrl]);

  // Brush Masking Initialization
  useEffect(() => {
    if (stage === 3 && processedDataUrl && !editedProcessedCanvasRef.current) {
      loadImageFromDataUrl(processedDataUrl).then(img => {
        editedProcessedCanvasRef.current = imageToCanvas(img, 1200);
      });
      if (deskewedDataUrl && !isCreateMode) {
        loadImageFromDataUrl(deskewedDataUrl).then(img => {
          originalImgRef.current = img;
        });
      }
    }
    if (stage !== 3) {
      editedProcessedCanvasRef.current = null;
      originalImgRef.current = null;
    }
  }, [stage, processedDataUrl, deskewedDataUrl, isCreateMode]);

  // Spacebar panning listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setPanMode(true);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setPanMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Brush Mouse Handlers
  const applyBrush = (x, y, lastX, lastY, displayWidth, displayHeight) => {
    if (!editedProcessedCanvasRef.current) return;
    const cvs = editedProcessedCanvasRef.current;
    const scaleX = cvs.width / displayWidth;
    const scaleY = cvs.height / displayHeight;
    const ctx = cvs.getContext('2d');
    
    ctx.save();
    if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize * scaleX;
      ctx.beginPath();
      ctx.moveTo(lastX * scaleX, lastY * scaleY);
      ctx.lineTo(x * scaleX, y * scaleY);
      ctx.stroke();
    } else if (tool === 'restore' && originalImgRef.current) {
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
    } else if (tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize * scaleX;
      ctx.beginPath();
      ctx.moveTo(lastX * scaleX, lastY * scaleY);
      ctx.lineTo(x * scaleX, y * scaleY);
      ctx.stroke();
    }
    ctx.restore();
    
    if (previewCanvasRef.current) {
      const pCtx = previewCanvasRef.current.getContext('2d');
      pCtx.save();
      pCtx.lineCap = 'round';
      pCtx.lineJoin = 'round';
      pCtx.lineWidth = brushSize * scaleX;
      pCtx.beginPath();
      pCtx.moveTo(lastX * scaleX, lastY * scaleY);
      pCtx.lineTo(x * scaleX, y * scaleY);
      if (tool === 'erase') {
        pCtx.globalCompositeOperation = 'destination-out';
        pCtx.stroke();
      } else if (tool === 'restore') {
        pCtx.globalCompositeOperation = 'source-over';
        pCtx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        pCtx.stroke();
      } else if (tool === 'brush') {
        pCtx.globalCompositeOperation = 'source-over';
        pCtx.strokeStyle = strokeColor;
        pCtx.globalAlpha = opacity;
        pCtx.stroke();
      }
      pCtx.restore();
    }
  };

  const drawActivePreview = (currentX, currentY) => {
    if (!previewCanvasRef.current || !tunedImgRef.current) return;
    const cvs = previewCanvasRef.current;
    const ctx = cvs.getContext('2d');
    
    // Draw base image
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(tunedImgRef.current, 0, 0);

    // Draw active shape preview
    if (isDrawingShape.current && startPosRef.current) {
      drawShape(ctx, tool, startPosRef.current, { x: currentX, y: currentY }, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity,
        fontSize,
        textString
      });
    } else if (tool === 'polygon' && polygonPoints.length > 0) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
      for (let i = 1; i < polygonPoints.length; i++) {
        ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
      }
      ctx.lineTo(currentX, currentY); // Guide line to cursor
      ctx.stroke();

      // Anchor dots
      ctx.fillStyle = 'var(--color-primary)';
      for (let pt of polygonPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(4, brushSize / 2), 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const commitPolygon = () => {
    if (polygonPoints.length < 2 || !editedProcessedCanvasRef.current) return;
    const cvs = editedProcessedCanvasRef.current;
    const ctx = cvs.getContext('2d');

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    for (let i = 1; i < polygonPoints.length; i++) {
      ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    ctx.closePath();

    if (fillEnabled && polygonPoints.length >= 3) ctx.fill();
    if (strokeEnabled) ctx.stroke();
    ctx.restore();

    setPolygonPoints([]);
    setProcessedDataUrl(canvasToDataUrl(cvs));
  };

  const handleBrushDown = (e) => {
    if (tool === 'pan' || panMode || e.button === 1 || e.button === 2) return;
    if (!previewCanvasRef.current) return;
    
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const canvasX = (x / rect.width) * previewCanvasRef.current.width;
    const canvasY = (y / rect.height) * previewCanvasRef.current.height;

    if (tool === 'polygon') {
      if (polygonPoints.length >= 3) {
        const firstPt = polygonPoints[0];
        const dist = Math.sqrt((canvasX - firstPt.x) ** 2 + (canvasY - firstPt.y) ** 2);
        const closeThreshold = 15 * (previewCanvasRef.current.width / rect.width);
        if (dist < closeThreshold) {
          commitPolygon();
          return;
        }
      }
      setPolygonPoints(prev => [...prev, { x: canvasX, y: canvasY }]);
      return;
    }

    if (tool === 'text') {
      if (!editedProcessedCanvasRef.current) return;
      const cvs = editedProcessedCanvasRef.current;
      const ctx = cvs.getContext('2d');
      drawShape(ctx, 'text', { x: canvasX, y: canvasY }, { x: canvasX, y: canvasY }, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity,
        fontSize,
        textString,
        fontWeight
      });
      setProcessedDataUrl(canvasToDataUrl(cvs));
      return;
    }

    if (['line', 'rect', 'circle'].includes(tool)) {
      isDrawingShape.current = true;
      startPosRef.current = { x: canvasX, y: canvasY };
      return;
    }

    // Brush/Erase/Restore tools
    isBrushing.current = true;
    brushLastPosRef.current = { x, y };
    applyBrush(x, y, x, y, rect.width, rect.height);
    e.preventDefault();
  };

  const handleBrushMove = (e) => {
    if (!previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const canvasX = (x / rect.width) * previewCanvasRef.current.width;
    const canvasY = (y / rect.height) * previewCanvasRef.current.height;

    if (tool === 'polygon' && polygonPoints.length > 0) {
      drawActivePreview(canvasX, canvasY);
      return;
    }

    if (isDrawingShape.current && startPosRef.current) {
      drawActivePreview(canvasX, canvasY);
      return;
    }

    if (isBrushing.current && ['brush', 'erase', 'restore'].includes(tool)) {
      applyBrush(x, y, brushLastPosRef.current.x, brushLastPosRef.current.y, rect.width, rect.height);
      brushLastPosRef.current = { x, y };
    }
  };

  const handleBrushUp = (e) => {
    if (isDrawingShape.current && startPosRef.current && previewCanvasRef.current) {
      const rect = previewCanvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const canvasX = (x / rect.width) * previewCanvasRef.current.width;
      const canvasY = (y / rect.height) * previewCanvasRef.current.height;

      if (editedProcessedCanvasRef.current) {
        const cvs = editedProcessedCanvasRef.current;
        const ctx = cvs.getContext('2d');
        drawShape(ctx, tool, startPosRef.current, { x: canvasX, y: canvasY }, {
          strokeColor,
          fillColor,
          strokeEnabled,
          fillEnabled,
          brushSize,
          opacity,
          fontSize,
          textString,
          fontWeight
        });
        setProcessedDataUrl(canvasToDataUrl(cvs));
      }
      isDrawingShape.current = false;
      startPosRef.current = null;
    }

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

  const toolBtnStyle = (active) => ({
    padding: '0.4rem 0.2rem',
    fontSize: '0.7rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: active ? 'var(--color-primary)' : 'var(--bg-main)',
    color: active ? 'white' : 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    fontWeight: active ? '700' : 'normal',
    transition: 'all 0.15s ease',
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
              🎨 {isComponentMode ? 'Component Art Integrator' : isTokenMode ? 'Token Art Integrator' : 'Art Integrator'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              {isComponentMode ? 'Scan, enhance, and place your custom art onto the component layer' : isTokenMode ? 'Scan, enhance, and place your custom art onto the token canvas' : 'Scan, enhance, and place your creature art onto the card'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>

        {/* Stage indicator */}
        <div style={{ display: 'flex', gap: '0.4rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', flexShrink: 0, background: 'var(--bg-main)' }}>
          {(isComponentMode ? STAGE_LABELS_COMPONENT : isTokenMode ? STAGE_LABELS_TOKEN : STAGE_LABELS).map((label, i) => (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', margin: '0 auto', maxWidth: '600px' }}>
                Choose how you want to bring your creature to life: import an existing sketch/photo for AI processing, or start drawing directly on a blank template.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                alignItems: 'stretch',
                marginTop: '0.5rem'
              }}>
                {/* Panel 1: Upload / Capture */}
                <div className="glass-panel" style={{
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(15, 20, 36, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center',
                }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    📥 Upload Existing Art
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '3rem' }}>
                    Upload a sketch, drawing, or photo. We'll enhance lines and isolate the background.
                  </p>

                  {showWebcam ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                      <video ref={videoRef} autoPlay playsInline muted
                        style={{ width: '100%', borderRadius: '8px', border: '2px solid var(--color-primary)' }} />
                      <button onClick={captureWebcam} style={{
                        width: '100%', padding: '0.6rem 1.5rem', background: 'var(--color-primary)', border: 'none',
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
                        border: '2px dashed var(--border-color)',
                        borderRadius: '12px',
                        padding: '2rem 1.5rem',
                        width: '100%',
                        background: 'rgba(5, 8, 20, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={32} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Drag & drop or browse
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); startWebcam(); }}
                        style={{
                          marginTop: '1rem',
                          padding: '0.4rem 1rem',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        <Camera size={14} /> Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Panel 2: Create Blank Canvas */}
                <div className="glass-panel" style={{
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(15, 20, 36, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center',
                }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    🎨 Sketch Digitally
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '3rem' }}>
                    Start drawing directly on a blank canvas calibrated to the exact proportions of the card.
                  </p>

                  <button
                    onClick={createBlankCanvas}
                    style={{
                      padding: '0.8rem 1.5rem',
                      background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
                      transition: 'all 0.2s',
                    }}
                  >
                    ✏️ Create Blank Canvas
                  </button>
                </div>
              </div>

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
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
                <button
                  onClick={() => {
                    if (window.confirm('Discard this artwork and start over?')) {
                      setRawDataUrl(null);
                      setDeskewedDataUrl(null);
                      setProcessedDataUrl(null);
                      setTunedDataUrl(null);
                      setFinalDataUrl(null);
                      setIsCreateMode(false);
                      setStage(0);
                    }
                  }}
                  style={{ marginRight: 'auto', padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-danger)' }}
                >
                  🗑️ Start Over
                </button>
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

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                <button
                  onClick={() => {
                    if (window.confirm('Discard this artwork and start over?')) {
                      setRawDataUrl(null);
                      setDeskewedDataUrl(null);
                      setProcessedDataUrl(null);
                      setTunedDataUrl(null);
                      setFinalDataUrl(null);
                      setIsCreateMode(false);
                      setStage(0);
                    }
                  }}
                  style={{ marginRight: 'auto', padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-danger)' }}
                >
                  🗑️ Start Over
                </button>
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

          {/* ── Stage 3: Color Tuning / Drawing ── */}
          {stage === 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
              {/* Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                
                {/* 1. Color Tuning Sliders (Only if not in create mode) */}
                {!isCreateMode && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>Color Tuning</h3>
                    {[
                      { key: 'vibrance', label: 'Vibrance', min: 0, max: 1, step: 0.05 },
                      { key: 'familyTint', label: `Family Tint (${cardFamily})`, min: 0, max: 1, step: 0.05 },
                      { key: 'brightness', label: 'Brightness', min: -1, max: 1, step: 0.05 },
                      { key: 'contrast', label: 'Contrast', min: -1, max: 1, step: 0.05 },
                      { key: 'hueRotate', label: 'Hue Rotate (°)', min: -180, max: 180, step: 1 },
                    ].map(({ key, label, min, max, step }) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.1rem' }}>
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
                      style={{ padding: '0.3rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-muted)' }}
                    >
                      Reset Colors
                    </button>
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.4rem 0' }} />
                  </div>
                )}

                {/* 2. Drawing toolkit */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                    {isCreateMode ? 'Drawing Studio' : 'Brush Masking & Drawing'}
                  </h3>

                  {/* Tool selection buttons grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Tool</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem' }}>
                      <button 
                        onClick={() => { setTool('brush'); setBrushMode(null); }}
                        style={toolBtnStyle(tool === 'brush')}
                        title="Freehand brush drawing"
                      >
                        <Paintbrush size={13} /> Brush
                      </button>
                      <button 
                        onClick={() => { setTool('line'); setBrushMode(null); }}
                        style={toolBtnStyle(tool === 'line')}
                        title="Draw straight lines"
                      >
                        📏 Line
                      </button>
                      <button 
                        onClick={() => { setTool('rect'); setBrushMode(null); }}
                        style={toolBtnStyle(tool === 'rect')}
                        title="Draw rectangles"
                      >
                        <Square size={13} /> Rect
                      </button>
                      <button 
                        onClick={() => { setTool('circle'); setBrushMode(null); }}
                        style={toolBtnStyle(tool === 'circle')}
                        title="Draw circles"
                      >
                        <CircleIcon size={13} /> Circle
                      </button>
                      <button 
                        onClick={() => { setTool('polygon'); setBrushMode(null); }}
                        style={toolBtnStyle(tool === 'polygon')}
                        title="Polygon tool: click points, then close to commit"
                      >
                        ⬡ Poly
                      </button>
                      <button 
                        onClick={() => { setTool('text'); setBrushMode(null); }}
                        style={toolBtnStyle(tool === 'text')}
                        title="Text tool: click on canvas to place text"
                      >
                        <Type size={13} /> Text
                      </button>
                      <button 
                        onClick={() => { setTool('erase'); setBrushMode('erase'); }}
                        style={toolBtnStyle(tool === 'erase')}
                        title="Erase background pixels to transparency"
                      >
                        <Eraser size={13} /> Erase BG
                      </button>
                      {!isCreateMode && (
                        <button 
                          onClick={() => { setTool('restore'); setBrushMode('restore'); }}
                          style={toolBtnStyle(tool === 'restore')}
                          title="Restore original artwork pixels under mask"
                        >
                          ✨ Restore
                        </button>
                      )}
                      <button 
                        onClick={() => { setTool('pan'); setBrushMode(null); }}
                        style={toolBtnStyle(tool === 'pan')}
                        title="Pan around canvas (or hold Spacebar while drawing)"
                      >
                        <Move size={13} /> Pan
                      </button>
                    </div>
                  </div>

                  {/* Tool options panel */}
                  {tool !== 'pan' && (
                    <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      
                      {/* Brush size / Line width / Text Outline size */}
                      {((['brush', 'line', 'rect', 'circle', 'polygon', 'erase', 'restore'].includes(tool)) || 
                        (tool === 'text' && strokeEnabled)) && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.1rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {tool === 'text' ? 'Text Border Thickness' : 'Brush/Line Width'}
                            </span>
                            <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{brushSize}px</span>
                          </div>
                          <input type="range" min={1} max={tool === 'text' ? 30 : 100} step={1} value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} style={{ width: '100%' }} />
                        </div>
                      )}

                      {/* Opacity */}
                      {['brush', 'line', 'rect', 'circle', 'polygon', 'text'].includes(tool) && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.1rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Opacity</span>
                            <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{Math.round(opacity * 100)}%</span>
                          </div>
                          <input type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} style={{ width: '100%' }} />
                        </div>
                      )}

                      {/* Colors (Stroke & Fill) */}
                      {['brush', 'line', 'rect', 'circle', 'polygon', 'text'].includes(tool) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {/* Outline Color */}
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '0.2rem', fontWeight: 600 }}>
                              <input type="checkbox" checked={strokeEnabled} onChange={(e) => setStrokeEnabled(e.target.checked)} />
                              Outline / Border
                            </label>
                            {strokeEnabled && (
                              <ColorPickerPanel
                                label="Border / Stroke Color"
                                color={strokeColor}
                                onChange={setStrokeColor}
                              />
                            )}
                          </div>

                          {/* Fill Color */}
                          {['rect', 'circle', 'polygon', 'text'].includes(tool) && (
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '0.2rem', fontWeight: 600 }}>
                                <input type="checkbox" checked={fillEnabled} onChange={(e) => setFillEnabled(e.target.checked)} />
                                Fill Color
                              </label>
                              {fillEnabled && (
                                <ColorPickerPanel
                                  label="Fill Color"
                                  color={fillColor}
                                  onChange={setFillColor}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Text Settings */}
                      {tool === 'text' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem' }}>
                          <div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.1rem' }}>Text Content</span>
                            <input 
                              type="text" 
                              value={textString} 
                              onChange={(e) => setTextString(e.target.value)} 
                              style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white' }} 
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.1rem' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Font Size</span>
                              <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{fontSize}px</span>
                            </div>
                            <input type="range" min={10} max={120} step={1} value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} style={{ width: '100%' }} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.1rem' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Font Weight (Thickness)</span>
                              <span style={{ color: 'var(--color-primary)', fontWeight: fontWeight }}>{fontWeight}</span>
                            </div>
                            <input type="range" min={100} max={900} step={100} value={fontWeight} onChange={(e) => setFontWeight(parseInt(e.target.value))} style={{ width: '100%' }} />
                          </div>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>* Click canvas to place text</span>
                        </div>
                      )}

                      {/* Polygon controls */}
                      {tool === 'polygon' && polygonPoints.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
                          <button
                            onClick={commitPolygon}
                            style={{
                              flex: 2, padding: '0.3rem 0.5rem', background: 'var(--color-success)', border: 'none', borderRadius: '4px',
                              color: 'white', fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem'
                            }}
                          >
                            <Check size={11} /> Close & Fill ({polygonPoints.length} pts)
                          </button>
                          <button
                            onClick={() => setPolygonPoints([])}
                            style={{
                              flex: 1, padding: '0.3rem', background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: '4px',
                              color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.65rem', cursor: 'pointer'
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clear Canvas (Create Mode only) */}
                  {isCreateMode && (
                    <button
                      onClick={() => {
                        if (window.confirm('Clear the entire drawing canvas and start over?')) {
                          createBlankCanvas();
                        }
                      }}
                      style={{
                        padding: '0.4rem', background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: '6px',
                        cursor: 'pointer', fontSize: '0.7rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'
                      }}
                    >
                      <Trash2 size={12} /> Clear Entire Canvas
                    </button>
                  )}
                </div>

                {/* Buttons block */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <button
                    onClick={() => {
                      if (window.confirm('Discard this artwork and start over?')) {
                        setRawDataUrl(null);
                        setDeskewedDataUrl(null);
                        setProcessedDataUrl(null);
                        setTunedDataUrl(null);
                        setFinalDataUrl(null);
                        setIsCreateMode(false);
                        setStage(0);
                      }
                    }}
                    style={{ flex: 1, padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-danger)' }}
                  >
                    🗑️ Start Over
                  </button>
                  <button onClick={() => setStage(isCreateMode ? 0 : 2)} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ← Back
                  </button>
                  <button onClick={() => setStage(4)} style={{ flex: 2, padding: '0.5rem 1rem', background: 'var(--color-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                    {isComponentMode ? 'Next: Place on Component →' : isTokenMode ? 'Next: Place on Token →' : 'Next: Place on Card →'}
                  </button>
                </div>
              </div>

              {/* Live Preview Container with Zoom/Pan wrapper */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>Live Workspace Canvas</p>
                
                <div 
                  style={{ 
                    position: 'relative', 
                    height: '460px', 
                    width: '100%', 
                    overflow: 'hidden', 
                    background: 'var(--bg-main)', 
                    backgroundImage: 'repeating-conic-gradient(#80808011 0% 25%, transparent 0% 50%)', 
                    backgroundSize: '20px 20px', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: isPanningState ? 'grabbing' : (panMode || tool === 'pan' ? 'grab' : 'crosshair'),
                    touchAction: 'none'
                  }}
                  onPointerDown={(e) => {
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch (err) {}
                    if (panMode || tool === 'pan' || e.button === 1 || e.button === 2) {
                      isPanning.current = true;
                      setIsPanningState(true);
                      lastPanPos.current = { x: e.clientX, y: e.clientY };
                      e.preventDefault();
                    } else {
                      handleBrushDown(e);
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onPointerMove={(e) => {
                    if (isPanning.current) {
                      const dx = e.clientX - lastPanPos.current.x;
                      const dy = e.clientY - lastPanPos.current.y;
                      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                      lastPanPos.current = { x: e.clientX, y: e.clientY };
                    } else {
                      handleBrushMove(e);
                    }
                  }}
                  onPointerUp={(e) => {
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch (err) {}
                    if (isPanning.current) {
                      isPanning.current = false;
                      setIsPanningState(false);
                    } else {
                      handleBrushUp(e);
                    }
                  }}
                >
                  {/* Floating Zoom/Pan Controls Overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0.8rem',
                    right: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'var(--bg-surface-elevated)',
                    padding: '0.3rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    zIndex: 15,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    userSelect: 'none',
                    pointerEvents: 'auto'
                  }} onMouseDown={(e) => e.stopPropagation()}>
                    <button 
                      onClick={handleZoomOut}
                      title="Zoom Out"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', padding: '2px' }}
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span style={{ fontSize: '0.7rem', width: '32px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {Math.round(zoom * 100)}%
                    </span>
                    <button 
                      onClick={handleZoomIn}
                      title="Zoom In"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', padding: '2px' }}
                    >
                      <ZoomIn size={14} />
                    </button>
                    <div style={{ width: '1px', height: '12px', background: 'var(--border-color)', margin: '0 0.15rem' }} />
                    <button 
                      onClick={handleZoomReset}
                      title="Reset Zoom/Pan"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', padding: '2px' }}
                    >
                      <RotateCcw size={13} />
                    </button>
                    <button 
                      onClick={() => setTool(prev => prev === 'pan' ? 'brush' : 'pan')}
                      title="Pan Canvas Mode (Hold Spacebar to Pan anyway)"
                      style={{ 
                        background: tool === 'pan' ? 'var(--color-primary)' : 'none', 
                        border: 'none', 
                        borderRadius: '3px',
                        padding: '2px',
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        color: tool === 'pan' ? 'white' : 'var(--text-secondary)' 
                      }}
                    >
                      <Move size={13} />
                    </button>
                  </div>

                  {/* Inner transform translation container */}
                  <div style={{
                    width: '100%',
                    height: '100%',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {!isCreateMode ? (
                      /* Before/After slider mode for uploads */
                      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={processedDataUrl} alt="Before" style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', opacity: compareSlider < 100 ? 1 : 0, objectFit: 'contain' }} />
                        <div style={{
                          position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                          clipPath: `inset(0 0 0 ${compareSlider}%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <canvas 
                            ref={previewCanvasRef} 
                            style={{ 
                              maxWidth: '100%', maxHeight: '100%', display: 'block', 
                              objectFit: 'contain',
                              touchAction: 'none'
                            }} 
                          />
                        </div>
                        {/* Slider bar overlay line */}
                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${compareSlider}%`, width: '2px', background: 'white', boxShadow: '0 0 6px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', top: 0, left: 0, padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 700, background: 'rgba(0,0,0,0.5)', color: 'white', pointerEvents: 'none' }}>BEFORE</div>
                        <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 700, background: 'rgba(99,102,241,0.7)', color: 'white', pointerEvents: 'none' }}>AFTER</div>
                      </div>
                    ) : (
                      /* Clean drawing mode for blank canvas */
                      <canvas 
                        ref={previewCanvasRef} 
                        style={{ 
                          maxWidth: '100%', maxHeight: '100%', display: 'block', 
                          objectFit: 'contain',
                          touchAction: 'none'
                        }} 
                      />
                    )}
                  </div>
                </div>

                {/* Compare Slider controls under the canvas (Only for upload mode) */}
                {!isCreateMode && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.2rem' }}>
                    <input type="range" min={0} max={100} value={compareSlider}
                      onChange={(e) => setCompareSlider(parseInt(e.target.value))}
                      style={{ width: '100%' }} />
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>Drag slider to compare before/after enhancement</p>
                  </div>
                )}
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

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setArtTransform({ x: SAFE_ZONE.focalX, y: SAFE_ZONE.focalY, scale: 60, rotation: 0 })}
                    style={{ flex: 1, padding: '0.4rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-muted)' }}
                  >
                    Reset Position
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this artwork and start over?')) {
                        setRawDataUrl(null);
                        setDeskewedDataUrl(null);
                        setProcessedDataUrl(null);
                        setTunedDataUrl(null);
                        setFinalDataUrl(null);
                        setIsCreateMode(false);
                        setStage(0);
                      }
                    }}
                    style={{ flex: 1, padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--color-danger)' }}
                  >
                    🗑️ Delete & Start Over
                  </button>
                </div>

                <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {isComponentMode ? (
                    <span>💡 Art is placed on the selected <strong>image layer</strong> of the board component. You can drag and scale it inside the bounds of the layer.</span>
                  ) : isTokenMode ? (
                    <span>💡 Art is placed on the <strong>uploaded layer</strong> of the token. You can further adjust position or draw shapes on top of it.</span>
                  ) : (
                    <span>💡 Art is placed on the <strong>middle layer</strong> — between the card background and the text frame overlays. The frame border will naturally mask any bleed edges.</span>
                  )}
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
                    <Check size={16} /> {isComponentMode ? 'Apply to Component' : isTokenMode ? 'Apply to Token' : 'Apply to Card'}
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
                border: isCustomMode ? '2px solid rgba(255,255,255,0.1)' : `2px solid var(--family-${cardFamily.toLowerCase()})`,
                background: '#0b0f19',
                userSelect: 'none',
                margin: '0 auto',
                containerType: 'inline-size'
              }}>
                {/* Card Background (bottom) */}
                {!isCustomMode && (
                  <img src={getBackgroundPath(cardFamily)} alt="Card Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }} />
                )}

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

                {/* Card Layout Border (above art) */}
                {!isCustomMode && (
                  <img 
                    src="./img/Layout/CardLayout.png" 
                    alt="Card Layout Border" 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      pointerEvents: 'none',
                      zIndex: 3
                    }}
                  />
                )}

                {/* Family Emblem - Top-Left */}
                {!isCustomMode && (
                  <img
                    src={`./img/TextIcon/${cardFamily}.png`}
                    alt={`${cardFamily} Emblem TL`}
                    style={{
                      position: 'absolute',
                      left: '8.45%',
                      top: '6.46%',
                      width: '11.91cqw',
                      height: '11.91cqw',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 3.5,
                      borderRadius: '50%',
                      border: '1.5px solid rgba(0, 0, 0, 0.3)',
                      boxSizing: 'border-box',
                      pointerEvents: 'none'
                    }}
                  />
                )}

                {/* Family Emblem - Bottom-Right */}
                {!isCustomMode && (
                  <img
                    src={`./img/TextIcon/${cardFamily}.png`}
                    alt={`${cardFamily} Emblem BR`}
                    style={{
                      position: 'absolute',
                      left: '90.97%',
                      top: '93.54%',
                      width: '9.84cqw',
                      height: '9.84cqw',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 3.5,
                      borderRadius: '50%',
                      border: '1.5px solid rgba(0, 0, 0, 0.3)',
                      boxSizing: 'border-box',
                      pointerEvents: 'none'
                    }}
                  />
                )}

                {/* Safe zone overlay guide */}
                {!isCustomMode && (
                  <div style={{
                    position: 'absolute',
                    left: `${SAFE_ZONE.xMin}%`,
                    top: `${SAFE_ZONE.yMin}%`,
                    width: `${SAFE_ZONE.xMax - SAFE_ZONE.xMin}%`,
                    height: `${SAFE_ZONE.yMax - SAFE_ZONE.yMin}%`,
                    border: '1px dashed rgba(255,255,255,0.2)',
                    borderRadius: '2px',
                    zIndex: 4,
                    pointerEvents: 'none'
                  }} />
                )}

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
