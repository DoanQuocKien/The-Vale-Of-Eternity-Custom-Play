import React, { useState, useEffect, useRef } from 'react';
import { Undo, RotateCcw, Paintbrush, Eraser, Check, X, Square, Circle as CircleIcon, Type, Minus } from 'lucide-react';
import { drawShape } from '../../utils/canvasUtils.js';

export default function DrawingModal({
  isOpen,
  onClose,
  onSave,
  title = 'Drawing Canvas',
  width = 512,
  height = 512,
  initialDataUrl = null
}) {
  if (!isOpen) return null;

  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);

  // States
  const [tool, setTool] = useState('brush'); // 'brush', 'erase', 'line', 'rect', 'circle', 'text', 'none'
  const [strokeColor, setStrokeColor] = useState('#6366f1');
  const [fillColor, setFillColor] = useState('#a78bfa');
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [fillEnabled, setFillEnabled] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(36);
  const [textString, setTextString] = useState('Emblem');

  // Drawing state
  const isDrawing = useRef(false);
  const isDrawingShape = useRef(false);
  const lastDrawingPos = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const [undoList, setUndoList] = useState([]);

  useEffect(() => {
    // Initialise backing canvases
    const canvas = canvasRef.current;
    const drawCvs = drawingCanvasRef.current;
    if (!canvas || !drawCvs) return;

    canvas.width = width;
    canvas.height = height;
    drawCvs.width = width;
    drawCvs.height = height;

    const ctx = drawCvs.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        redrawComposite();
      };
      img.src = initialDataUrl;
    } else {
      redrawComposite();
    }
  }, [isOpen, width, height, initialDataUrl]);

  const redrawComposite = (currentCoords = null) => {
    const canvas = canvasRef.current;
    const drawCvs = drawingCanvasRef.current;
    if (!canvas || !drawCvs) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid/transparent helper background
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw the drawing canvas layer
    ctx.drawImage(drawCvs, 0, 0);

    // Render shape preview overlay if drawing active
    if (isDrawingShape.current && startPosRef.current && currentCoords && ['line', 'rect', 'circle'].includes(tool)) {
      ctx.save();
      drawShape(ctx, tool, startPosRef.current, currentCoords, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity: brushOpacity,
        fontSize,
        textString
      });
      ctx.restore();
    }
  };

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
    ctx.clearRect(0, 0, width, height);

    if (prevState) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        redrawComposite();
      };
      img.src = prevState;
    } else {
      redrawComposite();
    }
  };

  const handleClear = () => {
    if (!window.confirm('Clear canvas? This action cannot be undone.')) return;
    saveUndoState();
    const ctx = drawingCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    redrawComposite();
  };

  const handlePointerDown = (e) => {
    if (e.target.closest('button, input, select')) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    if (!drawingCanvasRef.current) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

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
      redrawComposite();
      return;
    }

    if (['line', 'rect', 'circle'].includes(tool)) {
      saveUndoState();
      isDrawingShape.current = true;
      startPosRef.current = coords;
      return;
    }

    // Brush/Eraser
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
    } catch (err) {}

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
      redrawComposite();
    }

    if (isDrawing.current) {
      isDrawing.current = false;
    }
  };

  const handleSave = () => {
    if (!drawingCanvasRef.current) return;
    const finalUrl = drawingCanvasRef.current.toDataURL('image/png');
    onSave(finalUrl);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(8px)',
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '1100px',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        background: '#0d1527'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(30, 41, 59, 0.5)'
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'white' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace */}
        <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', minHeight: '500px' }}>
          {/* Main draw area */}
          <div style={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#020617',
            padding: '1.5rem',
            overflow: 'auto',
            position: 'relative'
          }}>
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                borderRadius: '8px',
                cursor: tool === 'erase' ? 'cell' : 'crosshair',
                maxWidth: '100%',
                maxHeight: '70vh',
                touchAction: 'none'
              }}
            />
            {/* Backing draw layer */}
            <canvas ref={drawingCanvasRef} style={{ display: 'none' }} />
          </div>

          {/* Sidebar */}
          <div style={{
            width: '320px',
            borderLeft: '1px solid var(--border-color)',
            background: '#0a101f',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxSizing: 'border-box'
          }}>
            {/* Tool picker */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 700 }}>TOOLS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                {[
                  { id: 'brush', label: 'Brush', icon: Paintbrush },
                  { id: 'erase', label: 'Eraser', icon: Eraser },
                  { id: 'line', label: 'Line', icon: Minus },
                  { id: 'rect', label: 'Rect', icon: Square },
                  { id: 'circle', label: 'Circle', icon: CircleIcon },
                  { id: 'text', label: 'Text', icon: Type }
                ].map(t => {
                  const IconComp = t.icon;
                  const isActive = tool === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTool(t.id)}
                      style={{
                        padding: '0.5rem',
                        background: isActive ? 'var(--color-primary)' : 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: isActive ? 'white' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontSize: '0.65rem'
                      }}
                    >
                      <IconComp size={16} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sizes & Opacities */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  <span>Brush Size</span>
                  <span>{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  <span>Brush Opacity</span>
                  <span>{Math.round(brushOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={brushOpacity}
                  onChange={(e) => setBrushOpacity(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                />
              </div>
            </div>

            {/* Colors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>STYLING</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={strokeEnabled} onChange={(e) => setStrokeEnabled(e.target.checked)} />
                  Outline
                </label>
                {strokeEnabled && (
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '28px', height: '24px', cursor: 'pointer' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={fillEnabled} onChange={(e) => setFillEnabled(e.target.checked)} />
                  Fill
                </label>
                {fillEnabled && (
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '28px', height: '24px', cursor: 'pointer' }}
                  />
                )}
              </div>
            </div>

            {/* Text options */}
            {tool === 'text' && (
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.6rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>TEXT SETTINGS</div>
                <input
                  type="text"
                  value={textString}
                  onChange={(e) => setTextString(e.target.value)}
                  placeholder="Text contents"
                  style={{
                    width: '100%',
                    padding: '0.3rem 0.5rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    fontSize: '0.75rem',
                    borderRadius: '4px'
                  }}
                />
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    <span>Font Size</span>
                    <span>{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Edit actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: 'auto' }}>
              <button
                onClick={handleUndo}
                disabled={undoList.length === 0}
                style={{
                  padding: '0.5rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: undoList.length === 0 ? 'var(--text-muted)' : 'white',
                  cursor: undoList.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem'
                }}
              >
                <Undo size={14} /> Undo
              </button>
              <button
                onClick={handleClear}
                style={{
                  padding: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: '4px',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem'
                }}
              >
                <RotateCcw size={14} /> Clear
              </button>
            </div>

            {/* Save Action */}
            <button
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--color-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontSize: '0.85rem'
              }}
            >
              <Check size={16} /> Save Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
