import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import {
  Trash2, Plus, FileText, Undo, RotateCcw,
  ZoomIn, ZoomOut, Move, Square, Circle as CircleIcon, Type,
  Paintbrush, Eraser, Check, Settings, Minus, FileImage, Sliders
} from 'lucide-react';
import { drawShape } from '../../utils/canvasUtils.js';
import LayerPanel from './LayerPanel.jsx';
import GridLayerEditor from './GridLayerEditor.jsx';

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

export default function ComponentDesigner({ onShowArtImporter }) {
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
  const [foldLines, setFoldLines] = useState([]);
  const [newFoldType, setNewFoldType] = useState('horizontal');
  const [newFoldPos, setNewFoldPos] = useState('');

  // Layer stack states
  const [activeLayerId, setActiveLayerId] = useState(null);
  const imageCacheRef = useRef({});

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

  // Drawing state tracking
  const isDrawing = useRef(false);
  const lastDrawingPos = useRef({ x: 0, y: 0 });
  const isDrawingShape = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const activeCoordsRef = useRef(null);

  // Undo list
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
      setFoldLines(activeComponent.foldLines || []);

      // Default active layer if none selected or if component changed
      const layers = activeComponent.layers || [];
      if (layers.length > 0) {
        const hasActive = layers.some(l => l.id === activeLayerId);
        if (!hasActive) {
          setActiveLayerId(layers[layers.length - 1].id); // select top layer
        }
      }

      const widthPx = Math.round(activeComponent.widthMm * 11.811);
      const heightPx = Math.round(activeComponent.heightMm * 11.811);

      // Initialize drawing layer backing canvas size
      const drawCvs = drawingCanvasRef.current || document.createElement('canvas');
      drawCvs.width = widthPx;
      drawCvs.height = heightPx;
      drawingCanvasRef.current = drawCvs;

      // Compute fitting default zoom
      const workspaceWidth = 800;
      const workspaceHeight = 550;
      const fitZoom = Math.min((workspaceWidth - 60) / widthPx, (workspaceHeight - 60) / heightPx);
      setZoom(Math.max(0.15, Math.min(2.5, fitZoom)));
      setPan({ x: 30, y: 30 });
      setUndoList([]);
    } else {
      setCompName('');
      setActiveLayerId(null);
      setFoldLines([]);
    }
  }, [activeComponent?.id]);

  // Load components on pack change
  useEffect(() => {
    if (activePackId) {
      loadComponents(activePackId);
    }
  }, [activePackId, loadComponents]);

  // Sync drawingCanvasRef when active layer changes
  useEffect(() => {
    if (activeComponent && activeLayerId) {
      const activeLayer = activeComponent.layers?.find(l => l.id === activeLayerId);
      if (activeLayer && activeLayer.type === 'drawing') {
        const drawCvs = drawingCanvasRef.current;
        if (drawCvs) {
          const drawCtx = drawCvs.getContext('2d');
          drawCtx.clearRect(0, 0, drawCvs.width, drawCvs.height);
          if (activeLayer.drawingData) {
            const img = new Image();
            img.onload = () => {
              drawCtx.drawImage(img, 0, 0);
              redrawComposite();
            };
            img.src = activeLayer.drawingData;
          } else {
            redrawComposite();
          }
        }
      } else {
        redrawComposite();
      }
    }
  }, [activeLayerId, activeComponent?.id]);

  // Redraw composite when settings, layers list, or drawing tool changes
  useEffect(() => {
    redrawComposite();
  }, [activeComponent, tool, activeLayerId]);

  const redrawComposite = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeComponent) return;
    const ctx = canvas.getContext('2d');
    
    const widthPx = Math.round(activeComponent.widthMm * 11.811);
    const heightPx = Math.round(activeComponent.heightMm * 11.811);

    ctx.clearRect(0, 0, widthPx, heightPx);

    const layers = activeComponent.layers || [];
    
    // Check if we need to load any images first
    let needsLoading = false;
    layers.forEach(layer => {
      if (layer.type === 'drawing' && layer.drawingData) {
        const cached = imageCacheRef.current[layer.id];
        if (!cached || cached.src !== layer.drawingData) {
          needsLoading = true;
          const img = new Image();
          img.onload = () => {
            imageCacheRef.current[layer.id] = img;
            redrawComposite();
          };
          img.src = layer.drawingData;
        }
      }
      if (layer.type === 'image' && layer.imageDataUrl) {
        const cached = imageCacheRef.current[layer.id];
        if (!cached || cached.src !== layer.imageDataUrl) {
          needsLoading = true;
          const img = new Image();
          img.onload = () => {
            imageCacheRef.current[layer.id] = img;
            redrawComposite();
          };
          img.src = layer.imageDataUrl;
        }
      }
    });

    if (needsLoading) {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, widthPx, heightPx);
      return;
    }

    // Compose layers bottom-to-top
    layers.forEach(layer => {
      if (!layer.visible) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1.0;

      if (layer.type === 'fill') {
        ctx.fillStyle = layer.fillColor || '#3b82f6';
        ctx.fillRect(0, 0, widthPx, heightPx);
      } 
      else if (layer.type === 'drawing') {
        const cachedImg = imageCacheRef.current[layer.id];
        if (cachedImg) {
          ctx.drawImage(cachedImg, 0, 0);
        }
        
        // If this drawing layer is active and we are dragging live strokes, draw them
        if (layer.id === activeLayerId && isDrawingShape.current && startPosRef.current && activeCoordsRef.current) {
          drawShape(ctx, tool, startPosRef.current, activeCoordsRef.current, {
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
      }
      else if (layer.type === 'image') {
        const cachedImg = imageCacheRef.current[layer.id];
        if (cachedImg) {
          const scale = layer.scale ?? 1;
          const rotation = layer.rotation ?? 0;
          const tx = (layer.transformX ?? 0) * 11.811;
          const ty = (layer.transformY ?? 0) * 11.811;
          
          ctx.save();
          ctx.translate(widthPx / 2 + tx, heightPx / 2 + ty);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.scale(scale, scale);
          ctx.drawImage(cachedImg, -cachedImg.width / 2, -cachedImg.height / 2);
          ctx.restore();
        }
      }
      else if (layer.type === 'text') {
        const textX = (layer.textX ?? Math.round(activeComponent.widthMm / 2)) * 11.811;
        const textY = (layer.textY ?? Math.round(activeComponent.heightMm / 2)) * 11.811;
        
        ctx.font = `bold ${layer.fontSize ?? 48}px ${layer.fontFamily || 'NorseBold'}`;
        ctx.textAlign = layer.textAlign || 'center';
        ctx.textBaseline = 'middle';
        
        if (layer.fillEnabled ?? true) {
          ctx.fillStyle = layer.fillColor || '#ffffff';
          ctx.fillText(layer.text || 'Text Label', textX, textY);
        }
        if (layer.strokeEnabled ?? false) {
          ctx.strokeStyle = layer.strokeColor || '#000000';
          ctx.lineWidth = layer.lineWidth ?? 2;
          ctx.strokeText(layer.text || 'Text Label', textX, textY);
        }
      }
      else if (layer.type === 'grid') {
        const gRows = layer.gridRows ?? 5;
        const gCols = layer.gridCols ?? 5;
        const cSizeMm = layer.cellSizeMm ?? 20;
        const cGapMm = layer.cellGapMm ?? 2;
        const gX = layer.gridX ?? 10;
        const gY = layer.gridY ?? 10;
        
        const cellW = cSizeMm * 11.811;
        const cellH = cSizeMm * 11.811;
        const gap = cGapMm * 11.811;
        const startX = gX * 11.811;
        const startY = gY * 11.811;
        
        const strokeEn = layer.strokeEnabled ?? true;
        const fillEn = layer.fillEnabled ?? false;
        const sColor = layer.strokeColor ?? '#ffffff';
        const fColor = layer.fillColor ?? '#6366f1';
        const lWidth = layer.lineWidth ?? 2;
        const showNum = layer.showNumbers ?? true;
        const labels = layer.cellLabels ?? [];

        ctx.lineWidth = lWidth;
        ctx.strokeStyle = sColor;
        ctx.fillStyle = fColor;
        
        for (let r = 0; r < gRows; r++) {
          for (let c = 0; c < gCols; c++) {
            const cellX = startX + c * (cellW + gap);
            const cellY = startY + r * (cellH + gap);
            
            ctx.beginPath();
            ctx.rect(cellX, cellY, cellW, cellH);
            if (fillEn) ctx.fill();
            if (strokeEn) ctx.stroke();
            
            const cellIndex = r * gCols + c;
            let cellText = '';
            if (labels[cellIndex] !== undefined && labels[cellIndex] !== '') {
              cellText = labels[cellIndex];
            } else if (showNum) {
              cellText = String(cellIndex + 1);
            }
            
            if (cellText) {
              ctx.save();
              ctx.fillStyle = strokeEn ? sColor : '#ffffff';
              ctx.font = `bold ${Math.max(12, cellH * 0.22)}px NorseBold, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(cellText, cellX + cellW / 2, cellY + cellH / 2);
              ctx.restore();
            }
          }
        }
      }

      ctx.restore();
    });

    // 6. Draw safety/bleed border (dashed red)
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

  // Saves current drawing backing canvas to the active drawing layer
  const saveComponentDrawing = () => {
    if (!activeComponent || !drawingCanvasRef.current || !canvasRef.current) return;
    
    const drawingDataUrl = drawingCanvasRef.current.toDataURL('image/png');
    
    const updatedLayers = activeComponent.layers.map(l => {
      if (l.id === activeLayerId) {
        return { ...l, drawingData: drawingDataUrl };
      }
      return l;
    });

    saveComponent({
      ...activeComponent,
      layers: updatedLayers,
      canvasData: canvasRef.current.toDataURL('image/png')
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

    const activeLayer = activeComponent.layers?.find(l => l.id === activeLayerId);
    const isDrawingLayerActive = activeLayer && activeLayer.type === 'drawing';
    if (!isDrawingLayerActive) return; // ignore draws if non-drawing layer is selected

    const coords = getCanvasCoords(e);
    if (!coords) return;

    const widthPx = Math.round(activeComponent.widthMm * 11.811);
    const heightPx = Math.round(activeComponent.heightMm * 11.811);

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
    activeCoordsRef.current = coords;

    if (isDrawingShape.current && startPosRef.current) {
      redrawComposite();
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
      activeCoordsRef.current = null;
      saveComponentDrawing();
      redrawComposite();
    }

    if (isDrawing.current) {
      isDrawing.current = false;
      saveComponentDrawing();
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(8, z + 0.15));
  const handleZoomOut = () => setZoom(z => Math.max(0.05, z - 0.15));
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

  // Layer Stack modifications
  const handleAddLayer = (type) => {
    if (!activeComponent) return;
    const newLayer = {
      id: 'layer-' + Date.now(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Layer ${(activeComponent.layers || []).length + 1}`,
      visible: true,
      opacity: 1,
      ...(type === 'fill' ? { fillColor: '#3b82f6' } : {}),
      ...(type === 'text' ? { text: 'Round Track', fontFamily: 'NorseBold', fontSize: 48, fillColor: '#ffffff', fillEnabled: true, textX: Math.round(activeComponent.widthMm / 2), textY: Math.round(activeComponent.heightMm / 2) } : {}),
      ...(type === 'grid' ? { gridRows: 5, gridCols: 5, cellSizeMm: 20, cellGapMm: 2, gridX: 10, gridY: 10, strokeColor: '#ffffff', fillColor: '#6366f1', strokeEnabled: true, fillEnabled: false, lineWidth: 2, showNumbers: true, cellLabels: [] } : {}),
      ...(type === 'drawing' ? { drawingData: null } : {}),
      ...(type === 'image' ? { imageDataUrl: null, scale: 1, rotation: 0, transformX: 0, transformY: 0 } : {})
    };
    const updatedLayers = [...(activeComponent.layers || []), newLayer];
    saveComponent({
      ...activeComponent,
      layers: updatedLayers
    });
    setActiveLayerId(newLayer.id);
  };

  const handleRemoveLayer = (layerId) => {
    if (!activeComponent || (activeComponent.layers || []).length <= 1) return;
    if (window.confirm('Are you sure you want to delete this layer?')) {
      const updatedLayers = activeComponent.layers.filter(l => l.id !== layerId);
      saveComponent({
        ...activeComponent,
        layers: updatedLayers
      });
      if (activeLayerId === layerId) {
        setActiveLayerId(updatedLayers[updatedLayers.length - 1].id);
      }
    }
  };

  const handleUpdateLayer = (layerId, updatedProperties) => {
    if (!activeComponent) return;
    const updatedLayers = activeComponent.layers.map(l => {
      if (l.id === layerId) {
        return { ...l, ...updatedProperties };
      }
      return l;
    });
    saveComponent({
      ...activeComponent,
      layers: updatedLayers
    });
  };

  const handleReorderLayers = (newLayers) => {
    if (!activeComponent) return;
    saveComponent({
      ...activeComponent,
      layers: newLayers
    });
  };

  // Component setup
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
      layers: [
        {
          id: 'layer-draw-default',
          type: 'drawing',
          name: 'Main Drawing',
          visible: true,
          opacity: 1,
          drawingData: null
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const saved = await saveComponent(newComp);
    setActiveComponent(saved);
    setShowNewModal(false);
  };

  const handleAddFoldLine = () => {
    if (!activeComponent) return;
    const pos = parseFloat(newFoldPos);
    if (isNaN(pos) || pos <= 0) {
      alert('Please enter a valid positive number for the position.');
      return;
    }
    const maxVal = newFoldType === 'horizontal' ? activeComponent.heightMm : activeComponent.widthMm;
    if (pos >= maxVal) {
      alert(`Fold line position exceeds the component boundary (${maxVal} mm).`);
      return;
    }
    const updated = [...foldLines, { type: newFoldType, positionMm: pos }];
    setFoldLines(updated);
    setNewFoldPos('');
  };

  const handleRemoveFoldLine = (index) => {
    const updated = foldLines.filter((_, idx) => idx !== index);
    setFoldLines(updated);
  };

  const handleSaveSettings = async () => {
    if (!activeComponent) return;
    const b = parseFloat(compBleed);
    const updated = {
      ...activeComponent,
      name: compName.trim() || 'Unnamed Component',
      bleedMm: isNaN(b) ? 3 : b,
      foldLines,
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

  // Current calculations
  const widthPx = activeComponent ? Math.round(activeComponent.widthMm * 11.811) : 0;
  const heightPx = activeComponent ? Math.round(activeComponent.heightMm * 11.811) : 0;
  
  const layers = activeComponent?.layers || [];
  const activeLayer = layers.find(l => l.id === activeLayerId);
  const isDrawingLayerActive = activeLayer && activeLayer.type === 'drawing';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '2rem',
      marginTop: '1rem',
      alignItems: 'start',
      minHeight: '70vh'
    }}>
      {/* SIDEBAR LEFT: List of components & layers panel */}
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
          maxHeight: '160px',
          overflowY: 'auto',
          paddingRight: '0.25rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem'
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
                  padding: '0.6rem 0.75rem',
                  background: activeComponent?.id === comp.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: activeComponent?.id === comp.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: activeComponent?.id === comp.id ? 700 : 500,
                    color: activeComponent?.id === comp.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px'
                  }}>
                    {comp.name}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
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
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Dynamic Layer Stack panel */}
        {activeComponent && (
          <LayerPanel
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={setActiveLayerId}
            onAddLayer={handleAddLayer}
            onRemoveLayer={handleRemoveLayer}
            onReorderLayers={handleReorderLayers}
            onUpdateLayer={handleUpdateLayer}
          />
        )}

        {/* Active Component general configurations */}
        {activeComponent && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Name</label>
              <input
                type="text"
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  outline: 'none',
                  color: 'white'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Bleed (mm)</label>
              <input
                type="number"
                value={compBleed}
                onChange={(e) => setCompBleed(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  outline: 'none',
                  color: 'white'
                }}
                min="0"
                max="20"
                step="0.5"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Fold Lines (mm)</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <select
                  value={newFoldType}
                  onChange={(e) => setNewFoldType(e.target.value)}
                  style={{
                    padding: '0.35rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: 'white'
                  }}
                >
                  <option value="horizontal">Horiz</option>
                  <option value="vertical">Vert</option>
                </select>
                <input
                  type="number"
                  placeholder="Pos"
                  value={newFoldPos}
                  onChange={(e) => setNewFoldPos(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.5rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: 'white',
                    outline: 'none'
                  }}
                  min="0"
                />
                <button
                  onClick={handleAddFoldLine}
                  className="btn"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Add
                </button>
              </div>
              
              {foldLines.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.25rem',
                  maxHeight: '80px',
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '0.35rem',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '0.25rem',
                  border: '1px solid var(--border-color)'
                }} className="comp-scroll">
                  {foldLines.map((fl, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        padding: '0.15rem 0.35rem',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        color: 'white'
                      }}
                    >
                      {fl.type === 'horizontal' ? 'H' : 'V'}: {fl.positionMm} mm
                      <button
                        onClick={() => handleRemoveFoldLine(idx)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.8rem',
                          lineHeight: 1
                        }}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleSaveSettings}
              className="btn"
              style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Save Settings
            </button>
          </div>
        )}
      </div>

      {/* WORKSPACE & PROPERTIES PANEL */}
      {activeComponent ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* CENTER: Workspace Viewport */}
          <div className="glass-panel" style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(5, 8, 20, 0.5)',
            position: 'relative'
          }}>
            {/* Viewport viewport */}
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
                  <div style={{
                    background: '#111827',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }} />

                  <div style={{ overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <HorizontalRuler widthMm={activeComponent.widthMm} widthPx={widthPx} />
                  </div>

                  <div style={{ overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                    <VerticalRuler heightMm={activeComponent.heightMm} heightPx={heightPx} />
                  </div>

                  <div style={{ position: 'relative', width: `${widthPx}px`, height: `${heightPx}px` }}>
                    <canvas
                      ref={canvasRef}
                      width={widthPx}
                      height={heightPx}
                      style={{ width: '100%', height: '100%', display: 'block' }}
                    />
                  </div>
                </div>
              </div>

              {/* Warning overlay if user selects drawing tool on a non-drawing layer */}
              {!isDrawingLayerActive && tool !== 'none' && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, width: '100%', height: '100%',
                  background: 'rgba(5, 8, 20, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5,
                  padding: '2rem',
                  textAlign: 'center',
                  backdropFilter: 'blur(3px)'
                }}>
                  <Paintbrush size={36} style={{ color: '#818cf8', marginBottom: '0.75rem' }} />
                  <h4 style={{ color: 'white', margin: 0 }}>Non-Drawing Layer Selected</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '300px', margin: '0.5rem 0 1rem 0' }}>
                    To draw, please select or add a <b>Drawing Layer</b> in the layer stack panel on the left.
                  </p>
                  <button
                    onClick={() => setTool('none')}
                    className="btn"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                  >
                    Switch to Pan Tool
                  </button>
                </div>
              )}

              {/* Floating zoom controls */}
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

            {/* Canvas drawing actions */}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
              <button
                onClick={handleUndo}
                disabled={undoList.length === 0 || !isDrawingLayerActive}
                className="btn"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: (undoList.length === 0 || !isDrawingLayerActive) ? 0.5 : 1
                }}
              >
                <Undo size={12} /> Undo
              </button>
              <button
                onClick={handleClearDrawing}
                disabled={!isDrawingLayerActive}
                className="btn-danger"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: !isDrawingLayerActive ? 0.5 : 1
                }}
              >
                <Trash2 size={12} /> Clear Layer Drawing
              </button>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              💡 Hold <b>Spacebar</b> and drag to pan workspace. Grid lines are spaced at 10mm. Red margins show bleed safety guidelines.
            </div>
          </div>

          {/* RIGHT PANEL: Properties Configuration Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {activeLayer ? (
              <>
                {/* 1. TEXT LAYER EDITORS */}
                {activeLayer.type === 'text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--text-secondary)' }}>
                      Text Label Options
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Text Content</label>
                      <input
                        type="text"
                        value={activeLayer.text || ''}
                        onChange={(e) => handleUpdateLayer(activeLayer.id, { text: e.target.value })}
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
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Font Style</label>
                      <select
                        value={activeLayer.fontFamily || 'NorseBold'}
                        onChange={(e) => handleUpdateLayer(activeLayer.id, { fontFamily: e.target.value })}
                        style={{
                          padding: '0.35rem',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          color: 'white',
                          outline: 'none'
                        }}
                      >
                        <option value="NorseBold">NorseBold (Norse Game Header)</option>
                        <option value="TitanOne">TitanOne (Heavy Accent)</option>
                        <option value="MerriweatherSans">MerriweatherSans (Body Bold)</option>
                        <option value="sans-serif">Standard System Font</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                        <span>Font Size</span>
                        <span>{activeLayer.fontSize ?? 48}px</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="300"
                        value={activeLayer.fontSize ?? 48}
                        onChange={(e) => handleUpdateLayer(activeLayer.id, { fontSize: parseInt(e.target.value) })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                        <span>Position X (mm)</span>
                        <span>{activeLayer.textX ?? Math.round(activeComponent.widthMm / 2)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={activeComponent.widthMm}
                        step="1"
                        value={activeLayer.textX ?? Math.round(activeComponent.widthMm / 2)}
                        onChange={(e) => handleUpdateLayer(activeLayer.id, { textX: parseInt(e.target.value) })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                        <span>Position Y (mm)</span>
                        <span>{activeLayer.textY ?? Math.round(activeComponent.heightMm / 2)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={activeComponent.heightMm}
                        step="1"
                        value={activeLayer.textY ?? Math.round(activeComponent.heightMm / 2)}
                        onChange={(e) => handleUpdateLayer(activeLayer.id, { textY: parseInt(e.target.value) })}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', padding: '0.25rem 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
                        <input
                          type="checkbox"
                          checked={activeLayer.fillEnabled ?? true}
                          onChange={(e) => handleUpdateLayer(activeLayer.id, { fillEnabled: e.target.checked })}
                        />
                        <span>Draw Color Fill</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
                        <input
                          type="checkbox"
                          checked={activeLayer.strokeEnabled ?? false}
                          onChange={(e) => handleUpdateLayer(activeLayer.id, { strokeEnabled: e.target.checked })}
                        />
                        <span>Stroke Border Outline</span>
                      </label>
                    </div>

                    {(activeLayer.fillEnabled ?? true) && (
                      <ColorPickerPanel
                        label="Text Fill Color"
                        color={activeLayer.fillColor || '#ffffff'}
                        onChange={(color) => handleUpdateLayer(activeLayer.id, { fillColor: color })}
                      />
                    )}

                    {activeLayer.strokeEnabled && (
                      <>
                        <ColorPickerPanel
                          label="Text Stroke Color"
                          color={activeLayer.strokeColor || '#000000'}
                          onChange={(color) => handleUpdateLayer(activeLayer.id, { strokeColor: color })}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                            <span>Outline Thickness</span>
                            <span>{activeLayer.lineWidth ?? 2}px</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="12"
                            value={activeLayer.lineWidth ?? 2}
                            onChange={(e) => handleUpdateLayer(activeLayer.id, { lineWidth: parseInt(e.target.value) })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 2. FILL LAYER EDITORS */}
                {activeLayer.type === 'fill' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--text-secondary)' }}>
                      Background Solid Fill Color
                    </h5>
                    <ColorPickerPanel
                      label="Solid Fill Color"
                      color={activeLayer.fillColor || '#3b82f6'}
                      onChange={(color) => handleUpdateLayer(activeLayer.id, { fillColor: color })}
                    />
                  </div>
                )}

                {/* 3. IMAGE LAYER EDITORS */}
                {activeLayer.type === 'image' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--text-secondary)' }}>
                      Image Layer Properties
                    </h5>
                    
                    {!activeLayer.imageDataUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                          onClick={() => {
                            if (typeof onShowArtImporter === 'function') {
                              onShowArtImporter({
                                family: 'Water',
                                existingArt: activeLayer.imageDataUrl,
                                isComponentMode: true
                              }, (artData) => {
                                handleUpdateLayer(activeLayer.id, {
                                  imageDataUrl: artData.dataUrl,
                                  scale: 1,
                                  rotation: 0,
                                  transformX: 0,
                                  transformY: 0
                                });
                              });
                            }
                          }}
                          className="btn"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2rem 1.25rem',
                            background: 'rgba(99, 102, 241, 0.04)',
                            border: '1px dashed var(--color-primary, #6366f1)',
                            borderRadius: 'var(--radius-md, 8px)',
                            cursor: 'pointer',
                            color: 'var(--text-secondary, #9ca3af)',
                            width: '100%',
                            gap: '0.5rem',
                            transition: 'all var(--transition-fast, 0.15s ease)',
                            outline: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                            e.currentTarget.style.borderColor = 'var(--color-primary-hover, #4f46e5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.04)';
                            e.currentTarget.style.borderColor = 'var(--color-primary, #6366f1)';
                          }}
                        >
                          <FileImage size={24} style={{ color: 'var(--color-primary, #6366f1)' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #f3f4f6)' }}>
                            Upload & Process Art
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #6b7280)' }}>
                            Opens the Art Integrator pipeline
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              if (typeof onShowArtImporter === 'function') {
                                onShowArtImporter({
                                  family: 'Water',
                                  existingArt: activeLayer.imageDataUrl,
                                  isComponentMode: true
                                }, (artData) => {
                                  handleUpdateLayer(activeLayer.id, {
                                    imageDataUrl: artData.dataUrl,
                                    scale: 1,
                                    rotation: 0,
                                    transformX: 0,
                                    transformY: 0
                                  });
                                });
                              }
                            }}
                            className="btn"
                            style={{
                              flex: 1,
                              padding: '0.4rem',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <FileImage size={12} /> Change Art
                          </button>
                          <button
                            onClick={() => handleUpdateLayer(activeLayer.id, { imageDataUrl: null })}
                            className="btn-danger"
                            style={{
                              flex: 1,
                              padding: '0.4rem',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                            <span>Scale factor</span>
                            <span>{Math.round((activeLayer.scale ?? 1) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="4"
                            step="0.05"
                            value={activeLayer.scale ?? 1}
                            onChange={(e) => handleUpdateLayer(activeLayer.id, { scale: parseFloat(e.target.value) })}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                            <span>Rotation Degrees</span>
                            <span>{activeLayer.rotation ?? 0}°</span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={activeLayer.rotation ?? 0}
                            onChange={(e) => handleUpdateLayer(activeLayer.id, { rotation: parseInt(e.target.value) })}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                            <span>Position X offset (mm)</span>
                            <span>{activeLayer.transformX ?? 0} mm</span>
                          </div>
                          <input
                            type="range"
                            min="-300"
                            max="300"
                            value={activeLayer.transformX ?? 0}
                            onChange={(e) => handleUpdateLayer(activeLayer.id, { transformX: parseInt(e.target.value) })}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                            <span>Position Y offset (mm)</span>
                            <span>{activeLayer.transformY ?? 0} mm</span>
                          </div>
                          <input
                            type="range"
                            min="-300"
                            max="300"
                            value={activeLayer.transformY ?? 0}
                            onChange={(e) => handleUpdateLayer(activeLayer.id, { transformY: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. GRID BUILDER EDITORS */}
                {activeLayer.type === 'grid' && (
                  <GridLayerEditor
                    layer={activeLayer}
                    onUpdateLayer={handleUpdateLayer}
                  />
                )}

                {/* 5. DRAWING LAYER EDITORS (STANDARD DRAW TOOLKIT) */}
                {activeLayer.type === 'drawing' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Tool choice grid */}
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

                    {/* Standard text overlays */}
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
                        {['rect', 'circle', 'text'].includes(tool) && (
                          <div style={{ display: 'flex', gap: '1rem', padding: '0.25rem 0' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="checkbox"
                                checked={strokeEnabled}
                                onChange={(e) => setStrokeEnabled(e.target.checked)}
                              />
                              <span>Outline Border</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="checkbox"
                                checked={fillEnabled}
                                onChange={(e) => setFillEnabled(e.target.checked)}
                              />
                              <span>Fill Shape</span>
                            </label>
                          </div>
                        )}

                        {strokeEnabled && tool !== 'text' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'white' }}>
                              <span>Line Thickness</span>
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'white' }}>
                            <span>Brush Opacity</span>
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

                        {strokeEnabled && (
                          <ColorPickerPanel
                            label="Border / Stroke Color"
                            color={strokeColor}
                            onChange={setStrokeColor}
                          />
                        )}

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
                )}
              </>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                Please select a layer to view configuration details.
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
