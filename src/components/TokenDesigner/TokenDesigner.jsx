import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import {
  Trash2, Plus, FileText, Camera, Upload, Undo, RotateCcw,
  ZoomIn, ZoomOut, Move, Square, Circle as CircleIcon, Type,
  Paintbrush, Eraser, Check, Sliders, Settings, Minus
} from 'lucide-react';
import { drawShape } from '../../utils/canvasUtils.js';

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

export default function TokenDesigner({ onShowArtImporter }) {
  const packs = useAppStore(state => state.packs);
  const activePackId = useAppStore(state => state.activePackId);
  const tokens = useAppStore(state => state.tokens);
  const activeToken = useAppStore(state => state.activeToken);
  const setActiveToken = useAppStore(state => state.setActiveToken);
  const saveTokenStore = useAppStore(state => state.saveToken);
  const deleteToken = useAppStore(state => state.deleteToken);
  const exportToken = useAppStore(state => state.exportToken);
  const loadTokens = useAppStore(state => state.loadTokens);
  const hasUnsavedChanges = useAppStore(state => state.hasUnsavedChanges);
  const setHasUnsavedChanges = useAppStore(state => state.setHasUnsavedChanges);

  const saveToken = async (updatedToken) => {
    const result = await saveTokenStore(updatedToken);
    setHasUnsavedChanges(false);
    return result;
  };

  // Canvas Refs
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null); // Backing canvas for user drawing
  const uploadedCanvasRef = useRef(null); // Backing canvas for processed uploaded image

  // General state
  const [tokenName, setTokenName] = useState('');
  const [exportTargetPackId, setExportTargetPackId] = useState('');
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'draw' | 'tune'

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const isPanning = useRef(false);
  const [isPanningState, setIsPanningState] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  // Uploaded Image Layer transforms
  const [transformX, setTransformX] = useState(0);
  const [transformY, setTransformY] = useState(0);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Image Tuning Filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Drawing Tools State
  const [tool, setTool] = useState('brush'); // 'brush', 'line', 'rect', 'circle', 'polygon', 'text', 'erase', 'none'
  const [strokeColor, setStrokeColor] = useState('#6366f1');
  const [fillColor, setFillColor] = useState('#a78bfa');
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [fillEnabled, setFillEnabled] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(60);
  const [textString, setTextString] = useState('Token');
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [fontWeight, setFontWeight] = useState(30);

  // Undo list
  const [undoList, setUndoList] = useState([]);

  const isInitialTokenLoad = useRef(true);

  // Reset the initial load flag when switching tokens
  useEffect(() => {
    isInitialTokenLoad.current = true;
  }, [activeToken?.id]);

  // Set unsaved changes on user interaction
  useEffect(() => {
    if (isInitialTokenLoad.current) {
      isInitialTokenLoad.current = false;
      return;
    }
    setHasUnsavedChanges(true);
  }, [tokenName, transformX, transformY, scale, rotation, brightness, contrast, saturation, undoList]);

  // Keyboard shortcut for spacebar panning
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setPanMode(true);
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

  // Sync token name and load token data
  useEffect(() => {
    if (activeToken) {
      setTokenName(activeToken.name || '');
      setTransformX(activeToken.transformX ?? 0);
      setTransformY(activeToken.transformY ?? 0);
      setScale(activeToken.scale ?? 1);
      setRotation(activeToken.rotation ?? 0);
      setBrightness(activeToken.brightness ?? 100);
      setContrast(activeToken.contrast ?? 100);
      setSaturation(activeToken.saturation ?? 100);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setPolygonPoints([]);

      initBackingCanvases(activeToken);
    } else {
      setTokenName('');
      clearCanvases();
    }
  }, [activeToken]);

  // Load tokens on pack select
  useEffect(() => {
    if (activePackId) {
      loadTokens(activePackId);
    }
  }, [activePackId, loadTokens]);

  // Trigger composite redraw whenever layers, transforms, or filters change
  useEffect(() => {
    redrawComposite();
  }, [transformX, transformY, scale, rotation, brightness, contrast, saturation, activeToken, polygonPoints, tool]);

  const initBackingCanvases = (token) => {
    // Setup drawing canvas
    const drawCvs = drawingCanvasRef.current || document.createElement('canvas');
    drawCvs.width = 1728;
    drawCvs.height = 2414;
    drawingCanvasRef.current = drawCvs;
    const drawCtx = drawCvs.getContext('2d');
    drawCtx.clearRect(0, 0, drawCvs.width, drawCvs.height);

    if (token.drawingDataUrl) {
      const img = new Image();
      img.onload = () => {
        drawCtx.drawImage(img, 0, 0);
        redrawComposite();
      };
      img.src = token.drawingDataUrl;
    }

    // Setup uploaded canvas
    const uploadCvs = uploadedCanvasRef.current || document.createElement('canvas');
    uploadCvs.width = 1728;
    uploadCvs.height = 2414;
    uploadedCanvasRef.current = uploadCvs;
    const uploadCtx = uploadCvs.getContext('2d');
    uploadCtx.clearRect(0, 0, uploadCvs.width, uploadCvs.height);

    if (token.artImageData?.dataUrl) {
      const img = new Image();
      img.onload = () => {
        uploadCvs.width = img.width;
        uploadCvs.height = img.height;
        uploadCtx.drawImage(img, 0, 0);
        redrawComposite();
      };
      img.src = token.artImageData.dataUrl;
    } else {
      uploadCvs.width = 1728;
      uploadCvs.height = 2414;
    }
    setUndoList([]);
  };

  const clearCanvases = () => {
    if (drawingCanvasRef.current) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
    }
    if (uploadedCanvasRef.current) {
      const ctx = uploadedCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, uploadedCanvasRef.current.width, uploadedCanvasRef.current.height);
    }
    redrawComposite();
  };

  const redrawComposite = (activeCoords = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Grid backdrop
    // Grid guide lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // 2. Uploaded image
    const uploadCvs = uploadedCanvasRef.current;
    if (uploadCvs && uploadCvs.width > 10 && activeToken?.artImageData?.dataUrl) {
      ctx.save();
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.translate(canvas.width / 2 + transformX, canvas.height / 2 + transformY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.drawImage(uploadCvs, -uploadCvs.width / 2, -uploadCvs.height / 2);
      ctx.restore();
    }

    // 3. Static drawings
    const drawCvs = drawingCanvasRef.current;
    if (drawCvs) {
      ctx.drawImage(drawCvs, 0, 0);
    }

    // 4. Active shape guide preview (while mouse is dragging)
    if (isDrawingShape.current && startPosRef.current && activeCoords) {
      drawShape(ctx, tool, startPosRef.current, activeCoords, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity: brushOpacity,
        fontSize,
        textString,
        fontWeight
      });
    }

    // 5. Active Polygon guide lines & anchor dots
    if (tool === 'polygon' && polygonPoints.length > 0) {
      ctx.save();
      ctx.globalAlpha = brushOpacity;
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
      if (activeCoords) {
        ctx.lineTo(activeCoords.x, activeCoords.y);
      }
      ctx.stroke();

      // Anchor dots
      ctx.fillStyle = 'var(--color-primary)';
      for (let pt of polygonPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(8, brushSize / 2), 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const handleTokenArtConfirmed = (artData) => {
    if (!artData || !activeToken) return;

    // Load image to determine its dimensions
    const img = new Image();
    img.onload = () => {
      // 1. Save in backing uploaded canvas
      const uploadCvs = uploadedCanvasRef.current || document.createElement('canvas');
      uploadCvs.width = img.width;
      uploadCvs.height = img.height;
      uploadedCanvasRef.current = uploadCvs;
      const uploadCtx = uploadCvs.getContext('2d');
      uploadCtx.clearRect(0, 0, uploadCvs.width, uploadCvs.height);
      uploadCtx.drawImage(img, 0, 0);

      // 2. Map transform coordinates from percentage to pixels
      const t = artData.transform;
      const tX = (t.x / 100) * 1728 - 864;
      const tY = (t.y / 100) * 2414 - 1207;
      const tScale = (t.scale / 100) * 1728 / img.width;
      const tRot = t.rotation;

      setTransformX(tX);
      setTransformY(tY);
      setScale(tScale);
      setRotation(tRot);

      // 3. Save to activeToken  
      // First redraw composite with new transforms so bbox scan sees the latest render
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw uploaded image with new transforms
        const uploadCvs = uploadedCanvasRef.current;
        if (uploadCvs) {
          ctx.save();
          ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
          ctx.translate(canvas.width / 2 + tX, canvas.height / 2 + tY);
          ctx.rotate((tRot * Math.PI) / 180);
          ctx.scale(tScale, tScale);
          ctx.drawImage(uploadCvs, -uploadCvs.width / 2, -uploadCvs.height / 2);
          ctx.restore();
        }
        // Draw drawing layer on top
        const drawCvs = drawingCanvasRef.current;
        if (drawCvs) ctx.drawImage(drawCvs, 0, 0);
      }

      const snap = canvasRef.current ? canvasRef.current.toDataURL('image/png') : null;
      const snapCanvasW = canvasRef.current?.width;
      const snapCanvasH = canvasRef.current?.height;

      const updatedToken = {
        ...activeToken,
        artImageData: {
          dataUrl: artData.dataUrl,
          width: img.width,
          height: img.height,
          transform: t
        },
        transformX: tX,
        transformY: tY,
        scale: tScale,
        rotation: tRot,
        imageDataUrl: snap,
        canvasW: snapCanvasW,
        canvasH: snapCanvasH
      };
      saveToken(updatedToken);
    };
    img.src = artData.dataUrl;
  };

  const handleDeleteTokenArt = () => {
    if (!activeToken) return;
    if (uploadedCanvasRef.current) {
      const ctx = uploadedCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, uploadedCanvasRef.current.width, uploadedCanvasRef.current.height);
    }
    const updatedToken = {
      ...activeToken,
      artImageData: null,
      transformX: 0,
      transformY: 0,
      scale: 1,
      rotation: 0
    };
    setTransformX(0);
    setTransformY(0);
    setScale(1);
    setRotation(0);
    saveToken(updatedToken);
  };

  // Undo/Redo/Save drawing operations
  const saveUndoState = () => {
    if (!drawingCanvasRef.current) return;
    const snapshot = drawingCanvasRef.current.toDataURL('image/png');
    setUndoList(prev => [...prev.slice(-19), snapshot]);
  };

  const handleUndo = () => {
    if (undoList.length === 0 || !drawingCanvasRef.current) return;
    const prevStates = [...undoList];
    const prevState = prevStates.pop();
    setUndoList(prevStates);

    const ctx = drawingCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);

    if (prevState) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        redrawComposite();
        saveTokenDrawing();
      };
      img.src = prevState;
    } else {
      redrawComposite();
      saveTokenDrawing();
    }
  };

  // Compute bounding box of non-transparent pixels from the composite canvas
  const computeBboxAndSnapshot = () => {
    const canvas = canvasRef.current;
    const drawCvs = drawingCanvasRef.current; // Get the raw user drawing layer
    if (!canvas || !drawCvs) return { imageDataUrl: null, bbox: null, croppedDataUrl: null };

    // 💡 FIX: Scan the raw drawing canvas data instead of the dirty editor window canvas
    const drawCtx = drawCvs.getContext('2d');
    const { width, height } = drawCvs;
    const imgData = drawCtx.getImageData(0, 0, width, height);
    const pixels = imgData.data;

    let minX = width, minY = height, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = pixels[(y * width + x) * 4 + 3];
        if (alpha > 8) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    // Fallback if the drawing canvas is totally empty
    let bbox = found
      ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
      : { x: 0, y: 0, w: width, h: height };

    // If an uploaded art image asset is present, adjust bounds to encompass the full space
    if (activeToken?.artImageData?.dataUrl) {
      bbox = { x: 0, y: 0, w: width, h: height };
    }

    const imageDataUrl = canvas.toDataURL('image/png');

    // Create the clean, perfectly cropped standalone token asset image
    let croppedDataUrl = imageDataUrl;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = bbox.w;
    cropCanvas.height = bbox.h;
    const cropCtx = cropCanvas.getContext('2d');

    // Copy the raw pixels cleanly from the composite canvas into the tight cropped file frame
    cropCtx.drawImage(canvas, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);
    croppedDataUrl = cropCanvas.toDataURL('image/png');

    return { imageDataUrl, bbox, croppedDataUrl, canvasW: width, canvasH: height };
  };

  const saveTokenDrawing = () => {
    if (!activeToken || !drawingCanvasRef.current) return;
    const drawingDataUrl = drawingCanvasRef.current.toDataURL('image/png');
    const { imageDataUrl, bbox, croppedDataUrl, canvasW, canvasH } = computeBboxAndSnapshot();
    saveToken({
      ...activeToken,
      drawingDataUrl,
      imageDataUrl,
      bbox,
      croppedDataUrl,
      canvasW,
      canvasH,
      transformX,
      transformY,
      scale,
      rotation,
      brightness,
      contrast,
      saturation
    });
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert relative viewport click to coordinates in backing canvas (1728 x 2414)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: x * scaleX,
      y: y * scaleY
    };
  };

  const commitPolygon = () => {
    if (polygonPoints.length < 2 || !drawingCanvasRef.current) return;
    saveUndoState();
    const ctx = drawingCanvasRef.current.getContext('2d');
    ctx.save();
    ctx.globalAlpha = brushOpacity;
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
    saveTokenDrawing();
    redrawComposite();
  };

  const handlePointerDown = (e) => {
    // Don't intercept clicks on nested interactive elements (zoom buttons, etc.)
    if (e.target.closest('button, a, input, select')) return;

    // Capture pointer to track dragging outside canvas boundary
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) { }

    const isPanAction = panMode || tool === 'none' || e.button === 1 || e.button === 2;
    if (isPanAction) {
      isPanning.current = true;
      setIsPanningState(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }

    if (!drawingCanvasRef.current) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (tool === 'polygon') {
      if (polygonPoints.length >= 3) {
        const firstPt = polygonPoints[0];
        const dist = Math.sqrt((coords.x - firstPt.x) ** 2 + (coords.y - firstPt.y) ** 2);
        if (dist < 30) {
          commitPolygon();
          return;
        }
      }
      saveUndoState();
      setPolygonPoints(prev => [...prev, coords]);
      return;
    }

    if (tool === 'text') {
      saveUndoState();
      const ctx = drawingCanvasRef.current.getContext('2d');
      drawShape(ctx, 'text', coords, coords, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity: brushOpacity,
        fontSize,
        textString,
        fontWeight
      });
      saveTokenDrawing();
      redrawComposite();
      return;
    }

    if (['line', 'rect', 'circle'].includes(tool)) {
      saveUndoState();
      isDrawingShape.current = true;
      startPosRef.current = coords;
      return;
    }

    // Brush & Eraser freehand
    saveUndoState();
    isDrawing.current = true;
    lastDrawingPos.current = coords;

    const ctx = drawingCanvasRef.current.getContext('2d');
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.globalAlpha = brushOpacity;

    if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    ctx.restore();
    redrawComposite();
  };

  const handlePointerMove = (e) => {
    if (isPanning.current) {
      setPan(p => ({
        x: p.x + (e.clientX - lastPanPos.current.x),
        y: p.y + (e.clientY - lastPanPos.current.y)
      }));
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (tool === 'polygon' && polygonPoints.length > 0) {
      redrawComposite(coords);
      return;
    }

    if (isDrawingShape.current && startPosRef.current) {
      redrawComposite(coords);
      return;
    }

    if (isDrawing.current && ['brush', 'erase'].includes(tool)) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = brushOpacity;

      if (tool === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(lastDrawingPos.current.x, lastDrawingPos.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(lastDrawingPos.current.x, lastDrawingPos.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
      ctx.restore();

      lastDrawingPos.current = coords;
      redrawComposite();
    }
  };

  const handlePointerUp = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) { }

    if (isPanning.current) {
      isPanning.current = false;
      setIsPanningState(false);
      return;
    }

    const coords = getCanvasCoords(e);
    if (isDrawingShape.current && startPosRef.current && drawingCanvasRef.current && coords) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      drawShape(ctx, tool, startPosRef.current, coords, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity: brushOpacity,
        fontSize,
        textString,
        fontWeight
      });
      isDrawingShape.current = false;
      startPosRef.current = null;
      saveTokenDrawing();
      redrawComposite();
    }

    if (isDrawing.current) {
      isDrawing.current = false;
      saveTokenDrawing();
    }
  };

  const handleCreateToken = async () => {
    const newToken = {
      name: `Token ${tokens.length + 1}`,
      packId: activePackId,
      artImageData: null,
      drawingDataUrl: null,
    };
    const saved = await saveToken(newToken);
    setActiveToken(saved);
  };

  const handleSaveName = async () => {
    if (!activeToken) return;
    const updated = {
      ...activeToken,
      name: tokenName.trim() || 'Unnamed Token'
    };
    await saveToken(updated);
  };

  const handleDelete = async (tokenId) => {
    if (window.confirm('Are you sure you want to delete this token?')) {
      await deleteToken(tokenId);
    }
  };

  const handleExport = async () => {
    if (!activeToken || !exportTargetPackId) return;
    try {
      await exportToken(activeToken.id, exportTargetPackId);
      alert('Token exported successfully!');
      setExportTargetPackId('');
    } catch (err) {
      alert('Error exporting token: ' + err.message);
    }
  };

  const handleClearDrawing = () => {
    if (window.confirm('Clear all drawing layers from this token?')) {
      saveUndoState();
      const ctx = drawingCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      redrawComposite();
      saveTokenDrawing();
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(8, z + 0.25));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.25));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const otherPacks = packs.filter(p => p.id !== activePackId);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '2rem',
      marginTop: '1rem',
      alignItems: 'start',
      minHeight: '70vh'
    }}>
      {/* Sidebar Left: Token list & meta */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            🎴 Tokens List
          </h3>
          <button
            onClick={handleCreateToken}
            style={{
              padding: '0.35rem 0.6rem',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Plus size={12} /> Add
          </button>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '300px',
          overflowY: 'auto',
          paddingRight: '0.25rem'
        }}>
          {tokens.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              No custom tokens yet. Click "Add" to start.
            </div>
          ) : (
            tokens.map(t => (
              <div
                key={t.id}
                onClick={() => setActiveToken(t)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: activeToken?.id === t.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: activeToken?.id === t.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: activeToken?.id === t.id ? 700 : 500,
                  color: activeToken?.id === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '180px'
                }}>
                  {t.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {activeToken && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
              Token Settings
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Token Name</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  style={{
                    flexGrow: 1,
                    padding: '0.4rem 0.75rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                  placeholder="e.g. Poison Counter"
                />
                <button
                  onClick={handleSaveName}
                  style={{
                    padding: '0.4rem 0.8rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            {otherPacks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Export to Pack</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={exportTargetPackId}
                    onChange={(e) => setExportTargetPackId(e.target.value)}
                    style={{
                      flexGrow: 1,
                      padding: '0.4rem 0.5rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select target pack...</option>
                    {otherPacks.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleExport}
                    disabled={!exportTargetPackId}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: exportTargetPackId ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                      border: exportTargetPackId ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: exportTargetPackId ? 'pointer' : 'default',
                      color: exportTargetPackId ? '#818cf8' : 'var(--text-muted)'
                    }}
                  >
                    Export
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Designer Grid Workspace */}
      {activeToken ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '450px 1fr',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* Card-sized Canvas Container */}
          <div className="glass-panel" style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(5, 8, 20, 0.5)',
            position: 'relative'
          }}>
            <div
              style={{
                position: 'relative',
                width: '400px',
                height: '558px',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7)',
                overflow: 'hidden',
                background: '#0b0f19',
                border: '2px solid rgba(255,255,255,0.05)',
                cursor: isPanningState ? 'grabbing' : (panMode || tool === 'none' ? 'grab' : 'crosshair'),
                touchAction: 'none'
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div style={{
                width: '100%',
                height: '100%',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'none'
              }}>
                <canvas
                  ref={canvasRef}
                  width={1728}
                  height={2414}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block'
                  }}
                />
              </div>

              {/* Floating Zoom & Pan Controls Overlay */}
              <div style={{
                position: 'absolute',
                bottom: '1rem',
                right: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--bg-surface-elevated)',
                padding: '0.35rem 0.6rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                <button
                  onClick={handleZoomOut}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span style={{ fontSize: '0.75rem', width: '35px', textAlign: 'center', fontWeight: 700 }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={handleZoomReset}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', marginLeft: '2px', borderLeft: '1px solid var(--border-color)', paddingLeft: '4px' }}
                  title="Reset Zoom & Pan"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
              <button
                onClick={handleUndo}
                disabled={undoList.length === 0}
                className="btn"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: undoList.length === 0 ? 0.5 : 1
                }}
              >
                <Undo size={12} /> Undo
              </button>
              <button
                onClick={handleClearDrawing}
                className="btn-danger"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Trash2 size={12} /> Clear Drawing
              </button>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              💡 Hold <b>Spacebar</b> and drag to pan the canvas workspace.
            </div>
          </div>

          {/* Right Editing Sidebar tabs */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1rem', paddingBottom: '0.5rem' }}>
              {[
                { id: 'upload', label: '1. Upload Arts' },
                { id: 'draw', label: '2. Drawing Tools' },
                { id: 'tune', label: '3. Tune Image' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                    color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    paddingBottom: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Upload Arts */}
            {activeTab === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Bring your custom token artwork to life using the scanning and AI processing pipeline.
                </p>

                {!activeToken.artImageData ? (
                  <button
                    onClick={() => onShowArtImporter({ family: 'Water', existingArt: null, isTokenMode: true }, handleTokenArtConfirmed)}
                    style={{
                      padding: '1.5rem',
                      border: '2px dashed var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Upload size={24} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Upload & Process Art</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scan, deskew, remove background, and more</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => onShowArtImporter({
                          family: 'Water',
                          existingArt: activeToken.artImageData.dataUrl,
                          existingTransform: activeToken.artImageData.transform,
                          isTokenMode: true
                        }, handleTokenArtConfirmed)}
                        style={{
                          flexGrow: 1,
                          padding: '0.5rem 1rem',
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid var(--color-primary)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: '#818cf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Sliders size={14} /> Adjust / Reprocess
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete the custom artwork from this token?')) {
                            handleDeleteTokenArt();
                          }
                        }}
                        style={{
                          padding: '0.5rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid var(--color-danger)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: 'var(--color-danger)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Remove Art"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {activeToken.artImageData && (
                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h5 style={{ fontSize: '0.8rem', margin: 0, fontWeight: 700 }}>Image Placement Layer transforms</h5>

                    {/* Scale */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>Scale</span>
                        <span>{Math.round(scale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="4"
                        step="0.05"
                        value={scale}
                        onChange={(e) => { setScale(parseFloat(e.target.value)); saveToken({ ...activeToken, scale: parseFloat(e.target.value) }); }}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Rotation */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>Rotation</span>
                        <span>{rotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={rotation}
                        onChange={(e) => { setRotation(parseInt(e.target.value)); saveToken({ ...activeToken, rotation: parseInt(e.target.value) }); }}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Position X */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>Position X</span>
                        <span>{transformX}px</span>
                      </div>
                      <input
                        type="range"
                        min="-1000"
                        max="1000"
                        value={transformX}
                        onChange={(e) => { setTransformX(parseInt(e.target.value)); saveToken({ ...activeToken, transformX: parseInt(e.target.value) }); }}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Position Y */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>Position Y</span>
                        <span>{transformY}px</span>
                      </div>
                      <input
                        type="range"
                        min="-1500"
                        max="1500"
                        value={transformY}
                        onChange={(e) => { setTransformY(parseInt(e.target.value)); saveToken({ ...activeToken, transformY: parseInt(e.target.value) }); }}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Drawing toolkit */}
            {activeTab === 'draw' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Shapes Toolbar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Choose Tool</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
                    {[
                      { id: 'brush', icon: <Paintbrush size={14} />, label: 'Brush' },
                      { id: 'erase', icon: <Eraser size={14} />, label: 'Eraser' },
                      { id: 'line', icon: <Minus size={14} style={{ transform: 'rotate(-45deg)' }} />, label: 'Line' },
                      { id: 'rect', icon: <Square size={14} />, label: 'Rect' },
                      { id: 'circle', icon: <CircleIcon size={14} />, label: 'Circle' },
                      { id: 'polygon', icon: <Check size={14} />, label: 'Polygon' },
                      { id: 'text', icon: <Type size={14} />, label: 'Text' },
                      { id: 'none', icon: <Move size={14} />, label: 'Pan/View' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setTool(t.id); setPolygonPoints([]); }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.4rem 0.2rem',
                          background: tool === t.id ? 'var(--color-primary)' : 'var(--bg-main)',
                          border: tool === t.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          color: tool === t.id ? 'white' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          transition: 'all 0.15s'
                        }}
                      >
                        {t.icon}
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {tool === 'polygon' && polygonPoints.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-primary)' }}>
                    <button
                      onClick={commitPolygon}
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.72rem',
                        flexGrow: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Check size={12} /> Close & Commit ({polygonPoints.length} pts)
                    </button>
                    <button
                      onClick={() => { setPolygonPoints([]); redrawComposite(); }}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.72rem',
                        background: 'none',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer'
                      }}
                    >
                      Reset
                    </button>
                  </div>
                )}

                {tool === 'text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Text String</label>
                    <input
                      type="text"
                      value={textString}
                      onChange={(e) => setTextString(e.target.value)}
                      style={{
                        padding: '0.35rem 0.5rem',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span>Font Size</span>
                        <span>{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span>Font Weight (Thickness)</span>
                        <span style={{ fontWeight: fontWeight }}>{fontWeight}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={fontWeight}
                        onChange={(e) => setFontWeight(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}

                {tool !== 'none' && (
                  <>
                    {/* Outline / Fill switches */}
                    {['rect', 'circle', 'polygon', 'text'].includes(tool) && (
                      <div style={{ display: 'flex', gap: '1rem', padding: '0.25rem 0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={strokeEnabled}
                            onChange={(e) => setStrokeEnabled(e.target.checked)}
                          />
                          <span>Outline / Border</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={fillEnabled}
                            onChange={(e) => setFillEnabled(e.target.checked)}
                          />
                          <span>Fill Shape</span>
                        </label>
                      </div>
                    )}

                    {/* Thickness slider */}
                    {strokeEnabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span>{tool === 'text' ? 'Text Border Thickness' : 'Thickness / Size'}</span>
                          <span>{brushSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max={tool === 'text' ? 30 : 150}
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}

                    {/* Opacity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>Opacity</span>
                        <span>{Math.round(brushOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={brushOpacity}
                        onChange={(e) => setBrushOpacity(parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Custom Color Selecting Panels */}
                    {strokeEnabled && (
                      <ColorPickerPanel
                        label="Border / Stroke Color"
                        color={strokeColor}
                        onChange={setStrokeColor}
                      />
                    )}

                    {fillEnabled && ['rect', 'circle', 'polygon', 'text'].includes(tool) && (
                      <ColorPickerPanel
                        label="Fill Color"
                        color={fillColor}
                        onChange={setFillColor}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tab 3: Tune Image */}
            {activeTab === 'tune' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Adjust the colors and levels of the uploaded image layer.
                </p>

                {activeToken.artImageData ? (
                  <>
                    {/* Brightness */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>Brightness</span>
                        <span>{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={brightness}
                        onChange={(e) => { setBrightness(parseInt(e.target.value)); saveToken({ ...activeToken, brightness: parseInt(e.target.value) }); }}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Contrast */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>Contrast</span>
                        <span>{contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={contrast}
                        onChange={(e) => { setContrast(parseInt(e.target.value)); saveToken({ ...activeToken, contrast: parseInt(e.target.value) }); }}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Saturation */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>Saturation</span>
                        <span>{saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={saturation}
                        onChange={(e) => { setSaturation(parseInt(e.target.value)); saveToken({ ...activeToken, saturation: parseInt(e.target.value) }); }}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                    Please upload an image first to enable tuning sliders.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 20, 0.5)' }}>
          <FileText size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.1)' }} />
          <h3>No Token Selected</h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0.5rem auto 0 auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select an existing token from the list, or click "Add" to create a new custom token layout.
          </p>
        </div>
      )}
    </div>
  );
}
