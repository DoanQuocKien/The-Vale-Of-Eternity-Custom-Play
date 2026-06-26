import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import {
  Trash2, Plus, FileText, Undo, RotateCcw,
  ZoomIn, ZoomOut, Move, Square, Circle as CircleIcon, Type,
  Paintbrush, Eraser, Check, Settings, Minus
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
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
        }} title="Click to open color picker">
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

// ─── SVG Rulers ─────────────────────────────────────────────────────────────
function HorizontalRuler({ widthMm, widthPx }) {
  const pxPerMm = widthPx / widthMm;
  const ticks = [];

  for (let i = 0; i <= widthMm; i++) {
    const x = i * pxPerMm;
    let tickHeight = 5;
    let showLabel = false;

    if (i % 10 === 0) {
      tickHeight = 12;
      showLabel = true;
    } else if (i % 5 === 0) {
      tickHeight = 8;
    }

    ticks.push(
      <g key={i}>
        <line
          x1={x}
          y1={25}
          x2={x}
          y2={25 - tickHeight}
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="1"
        />
        {showLabel && (
          <text
            x={x + 3}
            y={12}
            fill="rgba(255, 255, 255, 0.5)"
            fontSize="8px"
            fontFamily="monospace"
            textAnchor="start"
          >
            {i}
          </text>
        )}
      </g>
    );
  }

  return (
    <svg width={widthPx} height={25} style={{ background: '#111827', display: 'block' }}>
      {ticks}
    </svg>
  );
}

function VerticalRuler({ heightMm, heightPx }) {
  const pxPerMm = heightPx / heightMm;
  const ticks = [];

  for (let i = 0; i <= heightMm; i++) {
    const y = i * pxPerMm;
    let tickWidth = 5;
    let showLabel = false;

    if (i % 10 === 0) {
      tickWidth = 12;
      showLabel = true;
    } else if (i % 5 === 0) {
      tickWidth = 8;
    }

    ticks.push(
      <g key={i}>
        <line
          x1={25}
          y1={y}
          x2={25 - tickWidth}
          y2={y}
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="1"
        />
        {showLabel && (
          <text
            x={2}
            y={y + 8}
            fill="rgba(255, 255, 255, 0.5)"
            fontSize="8px"
            fontFamily="monospace"
          >
            {i}
          </text>
        )}
      </g>
    );
  }

  return (
    <svg width={25} height={heightPx} style={{ background: '#111827', display: 'block' }}>
      {ticks}
    </svg>
  );
}

const PRESETS = [
  { name: 'Player Board (A4 Landscape)', type: 'board', widthMm: 297, heightMm: 210, bleedMm: 3 },
  { name: 'Resource Track (Small)', type: 'track', widthMm: 148, heightMm: 55, bleedMm: 3 },
  { name: 'Tile (Square)', type: 'tile', widthMm: 63.5, heightMm: 63.5, bleedMm: 3 },
  { name: 'Tile Sheet (A4 Portrait)', type: 'tile-sheet', widthMm: 210, heightMm: 297, bleedMm: 3 },
];

export default function ComponentDesigner() {
  const activePackId = useAppStore(state => state.activePackId);
  const components = useAppStore(state => state.components);
  const activeComponent = useAppStore(state => state.activeComponent);
  const setActiveComponent = useAppStore(state => state.setActiveComponent);
  const saveComponent = useAppStore(state => state.saveComponent);
  const deleteComponent = useAppStore(state => state.deleteComponent);
  const loadComponents = useAppStore(state => state.loadComponents);

  // Component metadata states
  const [compName, setCompName] = useState('');
  const [compBleed, setCompBleed] = useState(3);

  // New component modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPresetType, setNewPresetType] = useState('board'); // 'board' | 'track' | 'tile' | 'tile-sheet' | 'custom'
  const [newWidthMm, setNewWidthMm] = useState(297);
  const [newHeightMm, setNewHeightMm] = useState(210);
  const [newBleedMm, setNewBleedMm] = useState(3);
  const [newName, setNewName] = useState('');

  // Canvas Refs
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);

  // Zoom & Pan
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [panMode, setPanMode] = useState(false);
  const isPanning = useRef(false);
  const [isPanningState, setIsPanningState] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  // Drawing tools state
  const [tool, setTool] = useState('brush'); // 'brush', 'erase', 'line', 'rect', 'circle', 'text', 'none'
  const [strokeColor, setStrokeColor] = useState('#6366f1');
  const [fillColor, setFillColor] = useState('#a78bfa');
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [fillEnabled, setFillEnabled] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(48);
  const [textString, setTextString] = useState('Text Label');

  // Drawing state
  const isDrawing = useRef(false);
  const lastDrawingPos = useRef({ x: 0, y: 0 });
  const isDrawingShape = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Undo history
  const [undoList, setUndoList] = useState([]);

  // Spacebar pan listener
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

  // Sync state and initialize canvases when activeComponent changes
  useEffect(() => {
    if (activeComponent) {
      setCompName(activeComponent.name || '');
      setCompBleed(activeComponent.bleedMm ?? 3);

      const widthPx = Math.round(activeComponent.widthMm * 11.811);
      const heightPx = Math.round(activeComponent.heightMm * 11.811);

      // Initialize drawing layer backing canvas
      const drawCvs = drawingCanvasRef.current || document.createElement('canvas');
      drawCvs.width = widthPx;
      drawCvs.height = heightPx;
      drawingCanvasRef.current = drawCvs;

      const drawCtx = drawCvs.getContext('2d');
      drawCtx.clearRect(0, 0, widthPx, heightPx);

      if (activeComponent.canvasData) {
        const img = new Image();
        img.onload = () => {
          drawCtx.drawImage(img, 0, 0);
          redrawComposite();
        };
        img.src = activeComponent.canvasData;
      } else {
        redrawComposite();
      }

      // Compute fitting default zoom
      const workspaceWidth = 800; // estimated workspace center dimensions
      const workspaceHeight = 550;
      const fitZoom = Math.min((workspaceWidth - 60) / widthPx, (workspaceHeight - 60) / heightPx);
      setZoom(Math.max(0.15, Math.min(2.5, fitZoom)));
      setPan({ x: 30, y: 30 });
      setUndoList([]);
    } else {
      setCompName('');
    }
  }, [activeComponent]);

  // Load components on pack change
  useEffect(() => {
    if (activePackId) {
      loadComponents(activePackId);
    }
  }, [activePackId, loadComponents]);

  // Redraw composite when active components or settings change
  useEffect(() => {
    redrawComposite();
  }, [activeComponent, tool]);

  const redrawComposite = (activeCoords = null) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeComponent) return;
    const ctx = canvas.getContext('2d');
    
    const widthPx = Math.round(activeComponent.widthMm * 11.811);
    const heightPx = Math.round(activeComponent.heightMm * 11.811);

    ctx.clearRect(0, 0, widthPx, heightPx);

    // 1. Draw base canvas backdrop background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // 2. Draw standard grid backing (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const mmStepPx = 10 * 11.811; // 10mm grid lines
    for (let x = 0; x < widthPx; x += mmStepPx) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, heightPx);
      ctx.stroke();
    }
    for (let y = 0; y < heightPx; y += mmStepPx) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(widthPx, y);
      ctx.stroke();
    }

    // 3. Draw existing drawing layer
    const drawCvs = drawingCanvasRef.current;
    if (drawCvs) {
      ctx.drawImage(drawCvs, 0, 0);
    }

    // 4. Draw active mouse drag preview
    if (isDrawingShape.current && startPosRef.current && activeCoords) {
      drawShape(ctx, tool, startPosRef.current, activeCoords, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity: brushOpacity,
        fontSize,
        textString
      });
    }

    // 5. Draw safety/bleed border (dashed red)
    const bleedPx = Math.round((activeComponent.bleedMm ?? 3) * 11.811);
    if (bleedPx > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(bleedPx, bleedPx, widthPx - 2 * bleedPx, heightPx - 2 * bleedPx);
      ctx.restore();
    }
  };

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
        saveComponentDrawing();
      };
      img.src = prevState;
    } else {
      redrawComposite();
      saveComponentDrawing();
    }
  };

  const handleClearDrawing = () => {
    if (window.confirm('Clear all drawing layers from this component?')) {
      saveUndoState();
      const ctx = drawingCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      redrawComposite();
      saveComponentDrawing();
    }
  };

  const saveComponentDrawing = () => {
    if (!activeComponent || !drawingCanvasRef.current) return;
    const canvasData = drawingCanvasRef.current.toDataURL('image/png');
    saveComponent({
      ...activeComponent,
      canvasData
    });
  };

  // Convert click/drag events relative to backing canvas
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: x * scaleX,
      y: y * scaleY
    };
  };

  // Viewport Pointer Handlers
  const handlePointerDown = (e) => {
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

    if (!drawingCanvasRef.current || !activeComponent) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    const widthPx = Math.round(activeComponent.widthMm * 11.811);
    const heightPx = Math.round(activeComponent.heightMm * 11.811);

    // Verify pointer clicked inside canvas to start drawing
    const clickedInside = coords.x >= 0 && coords.x <= widthPx && coords.y >= 0 && coords.y <= heightPx;
    if (!clickedInside) return;

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
        textString
      });
      saveComponentDrawing();
      redrawComposite();
      return;
    }

    if (['line', 'rect', 'circle'].includes(tool)) {
      saveUndoState();
      isDrawingShape.current = true;
      startPosRef.current = coords;
      return;
    }

    // Brush & Eraser
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
        textString
      });
      isDrawingShape.current = false;
      startPosRef.current = null;
      saveComponentDrawing();
      redrawComposite();
    }

    if (isDrawing.current) {
      isDrawing.current = false;
      saveComponentDrawing();
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(8, z + 0.15));
  const handleZoomOut = () => setZoom(z => Math.max(0.1, z - 0.15));
  const handleZoomReset = () => {
    if (activeComponent) {
      const wPx = Math.round(activeComponent.widthMm * 11.811);
      const hPx = Math.round(activeComponent.heightMm * 11.811);
      const fitZoom = Math.min((800 - 60) / wPx, (550 - 60) / hPx);
      setZoom(fitZoom);
    } else {
      setZoom(0.5);
    }
    setPan({ x: 30, y: 30 });
  };

  const handleOpenNewModal = () => {
    setNewName('');
    setNewPresetType('board');
    setNewWidthMm(297);
    setNewHeightMm(210);
    setNewBleedMm(3);
    setShowNewModal(true);
  };

  const handlePresetSelect = (presetType) => {
    setNewPresetType(presetType);
    if (presetType === 'board') {
      setNewWidthMm(297);
      setNewHeightMm(210);
    } else if (presetType === 'track') {
      setNewWidthMm(148);
      setNewHeightMm(55);
    } else if (presetType === 'tile') {
      setNewWidthMm(63.5);
      setNewHeightMm(63.5);
    } else if (presetType === 'tile-sheet') {
      setNewWidthMm(210);
      setNewHeightMm(297);
    }
  };

  const handleCreateComponentConfirm = async () => {
    const w = parseFloat(newWidthMm);
    const h = parseFloat(newHeightMm);
    const b = parseFloat(newBleedMm);

    if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
      alert('Please enter valid physical dimensions (positive numbers).');
      return;
    }

    const newComp = {
      name: newName.trim() || `Untitled ${newPresetType === 'custom' ? 'Component' : newPresetType}`,
      packId: activePackId,
      type: newPresetType,
      widthMm: w,
      heightMm: h,
      bleedMm: isNaN(b) ? 3 : b,
      canvasData: null,
      layers: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const saved = await saveComponent(newComp);
    setActiveComponent(saved);
    setShowNewModal(false);
  };

  const handleSaveSettings = async () => {
    if (!activeComponent) return;
    const b = parseFloat(compBleed);
    const updated = {
      ...activeComponent,
      name: compName.trim() || 'Unnamed Component',
      bleedMm: isNaN(b) ? 3 : b,
      updatedAt: Date.now()
    };
    await saveComponent(updated);
    alert('Settings updated successfully!');
  };

  const handleDeleteComponent = async (compId) => {
    if (window.confirm('Are you sure you want to delete this component? This cannot be undone.')) {
      await deleteComponent(compId);
    }
  };

  // Physical dimension calculations for view
  const widthPx = activeComponent ? Math.round(activeComponent.widthMm * 11.811) : 0;
  const heightPx = activeComponent ? Math.round(activeComponent.heightMm * 11.811) : 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '2rem',
      marginTop: '1rem',
      alignItems: 'start',
      minHeight: '70vh'
    }}>
      {/* SIDEBAR LEFT: List of components & details */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            🗃️ Board Components
          </h3>
          <button
            onClick={handleOpenNewModal}
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

        {/* Scrollable list of components */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '260px',
          overflowY: 'auto',
          paddingRight: '0.25rem'
        }}>
          {components.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              No board components yet. Click "Add" to start.
            </div>
          ) : (
            components.map(comp => (
              <div
                key={comp.id}
                onClick={() => setActiveComponent(comp)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: activeComponent?.id === comp.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: activeComponent?.id === comp.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: activeComponent?.id === comp.id ? 700 : 500,
                    color: activeComponent?.id === comp.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '160px'
                  }}>
                    {comp.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {comp.type} • {comp.widthMm}x{comp.heightMm}mm
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteComponent(comp.id); }}
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

        {activeComponent && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
              Component Properties
            </h4>

            {/* Name input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Name</label>
              <input
                type="text"
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  color: 'white'
                }}
                placeholder="e.g. Player Board A"
              />
            </div>

            {/* Bleed margin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Bleed Zone (mm)</label>
              <input
                type="number"
                value={compBleed}
                onChange={(e) => setCompBleed(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  color: 'white'
                }}
                min="0"
                max="20"
                step="0.5"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              className="btn"
              style={{
                width: '100%',
                padding: '0.45rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                marginTop: '0.25rem'
              }}
            >
              Save Settings
            </button>
          </div>
        )}
      </div>

      {/* WORKSPACE & TOOLS PANELS */}
      {activeComponent ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* CENTER: Canvas viewport workspace */}
          <div className="glass-panel" style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(5, 8, 20, 0.5)',
            position: 'relative'
          }}>
            {/* Active canvas box */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '600px',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#04060b',
                border: '1px solid rgba(255,255,255,0.05)',
                cursor: isPanningState ? 'grabbing' : (panMode || tool === 'none' ? 'grab' : 'crosshair'),
                touchAction: 'none'
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Scaled wrapper carrying Canvas and SVGRulers */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                transition: 'none'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '25px 1fr',
                  gridTemplateRows: '25px 1fr',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
                }}>
                  {/* Top-Left Empty Corner */}
                  <div style={{
                    background: '#111827',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }} />

                  {/* Horizontal Ruler */}
                  <div style={{ overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <HorizontalRuler widthMm={activeComponent.widthMm} widthPx={widthPx} />
                  </div>

                  {/* Vertical Ruler */}
                  <div style={{ overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                    <VerticalRuler heightMm={activeComponent.heightMm} heightPx={heightPx} />
                  </div>

                  {/* Drawing Area Canvas */}
                  <div style={{ position: 'relative', width: `${widthPx}px`, height: `${heightPx}px` }}>
                    <canvas
                      ref={canvasRef}
                      width={widthPx}
                      height={heightPx}
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating workspace controls */}
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', color: 'white' }}
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span style={{ fontSize: '0.75rem', width: '35px', textAlign: 'center', fontWeight: 700, color: 'white' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', color: 'white' }}
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={handleZoomReset}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', marginLeft: '2px', borderLeft: '1px solid var(--border-color)', paddingLeft: '4px', color: 'white' }}
                  title="Fit Component Zoom"
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
                <Trash2 size={12} /> Clear Canvas
              </button>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              💡 Hold <b>Spacebar</b> and drag inside workspace to pan. Grid is split into 10mm lines. Red lines denote bleed safety margins.
            </div>
          </div>

          {/* RIGHT PANEL: Drawing tools & properties */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              🖌️ Drawing Toolkit
            </h4>

            {/* Choose Tool Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Choose Tool</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
                {[
                  { id: 'brush', icon: <Paintbrush size={14} />, label: 'Brush' },
                  { id: 'erase', icon: <Eraser size={14} />, label: 'Eraser' },
                  { id: 'line', icon: <Minus size={14} style={{ transform: 'rotate(-45deg)' }} />, label: 'Line' },
                  { id: 'rect', icon: <Square size={14} />, label: 'Rect' },
                  { id: 'circle', icon: <CircleIcon size={14} />, label: 'Circle' },
                  { id: 'text', icon: <Type size={14} />, label: 'Text' },
                  { id: 'none', icon: <Move size={14} />, label: 'Pan/View' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
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

            {/* Text options */}
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
                    outline: 'none',
                    color: 'white'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
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
              </div>
            )}

            {tool !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Stroke/Fill checklist */}
                {['rect', 'circle', 'text'].includes(tool) && (
                  <div style={{ display: 'flex', gap: '1rem', padding: '0.25rem 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', cursor: 'pointer', color: 'white' }}>
                      <input
                        type="checkbox"
                        checked={strokeEnabled}
                        onChange={(e) => setStrokeEnabled(e.target.checked)}
                      />
                      <span>Outline</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', cursor: 'pointer', color: 'white' }}>
                      <input
                        type="checkbox"
                        checked={fillEnabled}
                        onChange={(e) => setFillEnabled(e.target.checked)}
                      />
                      <span>Fill Shape</span>
                    </label>
                  </div>
                )}

                {/* Thickness Slider */}
                {strokeEnabled && tool !== 'text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'white' }}>
                      <span>Thickness / size</span>
                      <span>{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="150"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                {/* Opacity slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'white' }}>
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

                {/* Stroke Color */}
                {strokeEnabled && (
                  <ColorPickerPanel
                    label="Border / Stroke Color"
                    color={strokeColor}
                    onChange={setStrokeColor}
                  />
                )}

                {/* Fill Color */}
                {fillEnabled && ['rect', 'circle', 'text'].includes(tool) && (
                  <ColorPickerPanel
                    label="Fill Color"
                    color={fillColor}
                    onChange={setFillColor}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', minHeight: '550px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 20, 0.5)' }}>
          <FileText size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.1)' }} />
          <h3>No Component Selected</h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0.5rem auto 0 auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select an existing board component from the list, or click "Add" to configure and design a new layout page.
          </p>
        </div>
      )}

      {/* NEW COMPONENT DIALOG MODAL */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem', width: '450px', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#111827' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>Create Board Component</h3>

            {/* Component Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Component Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  color: 'white'
                }}
                placeholder="e.g. Round Scoring Track"
              />
            </div>

            {/* Select Preset Preset */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Size Preset</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handlePresetSelect(p.type)}
                    style={{
                      padding: '0.6rem 0.5rem',
                      background: newPresetType === p.type ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-main)',
                      border: newPresetType === p.type ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>{p.name}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {p.widthMm} x {p.heightMm} mm
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setNewPresetType('custom')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    background: newPresetType === 'custom' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-main)',
                    border: newPresetType === 'custom' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div>📐 Custom Size</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    User dimensions
                  </div>
                </button>
              </div>
            </div>

            {/* Custom inputs */}
            {(newPresetType === 'custom' || true) && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.02)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                opacity: newPresetType === 'custom' ? 1 : 0.6,
                pointerEvents: newPresetType === 'custom' ? 'auto' : 'none'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Width (mm)</label>
                  <input
                    type="number"
                    value={newWidthMm}
                    onChange={(e) => setNewWidthMm(e.target.value)}
                    style={{
                      padding: '0.35rem 0.5rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      color: 'white',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Height (mm)</label>
                  <input
                    type="number"
                    value={newHeightMm}
                    onChange={(e) => setNewHeightMm(e.target.value)}
                    style={{
                      padding: '0.35rem 0.5rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      color: 'white',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Bleed (mm)</label>
                  <input
                    type="number"
                    value={newBleedMm}
                    onChange={(e) => setNewBleedMm(e.target.value)}
                    style={{
                      padding: '0.35rem 0.5rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      color: 'white',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={handleCreateComponentConfirm}
                className="btn"
                style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Create
              </button>
              <button
                onClick={() => setShowNewModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.82rem'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
