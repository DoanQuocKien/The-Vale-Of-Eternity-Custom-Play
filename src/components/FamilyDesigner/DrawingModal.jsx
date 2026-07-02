import React, { useState, useEffect, useRef } from 'react';
import { Undo, RotateCcw, Paintbrush, Eraser, Check, X, Square, Circle as CircleIcon, Type, Minus, Image as ImageIcon, Sliders } from 'lucide-react';
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
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Layout Tab selection: 'draw' | 'image'
  const [activeTab, setActiveTab] = useState('draw');

  // Drawing States
  const [tool, setTool] = useState('brush'); // 'brush', 'erase', 'line', 'rect', 'circle', 'text', 'polygon', 'none'
  const [strokeColor, setStrokeColor] = useState('#6366f1');
  const [fillColor, setFillColor] = useState('#a78bfa');
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [fillEnabled, setFillEnabled] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(36);
  const [fontWeight, setFontWeight] = useState(30); // text thickness
  const [textString, setTextString] = useState('Emblem');
  const [polygonPoints, setPolygonPoints] = useState([]);

  // Image Layer States
  const [bgImage, setBgImage] = useState(null); // Loaded image object
  const [imgX, setImgX] = useState(0);
  const [imgY, setImgY] = useState(0);
  const [imgScale, setImgScale] = useState(1.0);
  const [imgRotation, setImgRotation] = useState(0);
  const [imgBrightness, setImgBrightness] = useState(100);
  const [imgContrast, setImgContrast] = useState(100);
  const [imgSaturation, setImgSaturation] = useState(100);

  // Pointer drawing tracking
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

  // Redraw when any visual parameter changes
  useEffect(() => {
    redrawComposite();
  }, [
    bgImage,
    imgX,
    imgY,
    imgScale,
    imgRotation,
    imgBrightness,
    imgContrast,
    imgSaturation,
    tool,
    strokeColor,
    fillColor,
    strokeEnabled,
    fillEnabled,
    brushSize,
    brushOpacity,
    fontSize,
    fontWeight,
    textString,
    polygonPoints
  ]);

  const redrawComposite = (currentCoords = null) => {
    const canvas = canvasRef.current;
    const drawCvs = drawingCanvasRef.current;
    if (!canvas || !drawCvs) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw helper grid backdrop
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 2. Draw background image layer with transforms and filters
    if (bgImage) {
      ctx.save();
      ctx.filter = `brightness(${imgBrightness}%) contrast(${imgContrast}%) saturate(${imgSaturation}%)`;
      ctx.translate(canvas.width / 2 + imgX, canvas.height / 2 + imgY);
      ctx.rotate((imgRotation * Math.PI) / 180);
      ctx.scale(imgScale, imgScale);

      const imgW = bgImage.naturalWidth || bgImage.width;
      const imgH = bgImage.naturalHeight || bgImage.height;
      const scaleX = canvas.width / imgW;
      const scaleY = canvas.height / imgH;
      const coverScale = Math.max(scaleX, scaleY);
      const drawW = imgW * coverScale;
      const drawH = imgH * coverScale;

      ctx.drawImage(bgImage, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }

    // 3. Draw user painted layer
    ctx.drawImage(drawCvs, 0, 0);

    // 4. Render shape preview overlay if drawing active
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
        textString,
        fontWeight
      });
      ctx.restore();
    }

    // 5. Render polygon guide lines & active mouse guide line
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

      // If active coords are moving, draw line to cursor
      if (currentCoords) {
        ctx.lineTo(currentCoords.x, currentCoords.y);
      }

      if (strokeEnabled) ctx.stroke();
      ctx.restore();

      // Draw anchor circles
      ctx.save();
      ctx.fillStyle = strokeColor;
      for (let pt of polygonPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(4, brushSize / 2), 0, Math.PI * 2);
        ctx.fill();
      }
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
    if (!window.confirm('Clear painted canvas? This won\'t remove the image layer.')) return;
    saveUndoState();
    const ctx = drawingCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    redrawComposite();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setBgImage(img);
        // Reset transforms for the new image layer
        setImgX(0);
        setImgY(0);
        setImgScale(1.0);
        setImgRotation(0);
        setImgBrightness(100);
        setImgContrast(100);
        setImgSaturation(100);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
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

    if (tool === 'polygon') {
      if (polygonPoints.length >= 3) {
        const firstPt = polygonPoints[0];
        const dist = Math.sqrt((coords.x - firstPt.x) ** 2 + (coords.y - firstPt.y) ** 2);
        if (dist < 20) {
          commitPolygon();
          return;
        }
      }
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
      redrawComposite();
      return;
    }

    if (['line', 'rect', 'circle'].includes(tool)) {
      saveUndoState();
      isDrawingShape.current = true;
      startPosRef.current = coords;
      return;
    }

    if (tool === 'none') return;

    // Brush/Eraser drawing
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
        textString,
        fontWeight
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Compile composite canvas with transparent/white background (without helper slate background)
    const tempCvs = document.createElement('canvas');
    tempCvs.width = width;
    tempCvs.height = height;
    const tempCtx = tempCvs.getContext('2d');

    // 1. Draw transformed image layer onto compile target
    if (bgImage) {
      tempCtx.save();
      tempCtx.filter = `brightness(${imgBrightness}%) contrast(${imgContrast}%) saturate(${imgSaturation}%)`;
      tempCtx.translate(width / 2 + imgX, height / 2 + imgY);
      tempCtx.rotate((imgRotation * Math.PI) / 180);
      tempCtx.scale(imgScale, imgScale);

      const imgW = bgImage.naturalWidth || bgImage.width;
      const imgH = bgImage.naturalHeight || bgImage.height;
      const scaleX = width / imgW;
      const scaleY = height / imgH;
      const coverScale = Math.max(scaleX, scaleY);
      const drawW = imgW * coverScale;
      const drawH = imgH * coverScale;

      tempCtx.drawImage(bgImage, -drawW / 2, -drawH / 2, drawW, drawH);
      tempCtx.restore();
    }

    // 2. Draw user painted layer
    if (drawingCanvasRef.current) {
      tempCtx.drawImage(drawingCanvasRef.current, 0, 0);
    }

    const finalUrl = tempCvs.toDataURL('image/png');
    onSave(finalUrl);
    onClose();
  };

  if (!isOpen) return null;

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
        <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', minHeight: '520px' }}>
          {/* Canvas workspace area */}
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
                cursor: tool === 'erase' ? 'cell' : tool === 'none' ? 'default' : 'crosshair',
                maxWidth: '100%',
                maxHeight: '70vh',
                touchAction: 'none'
              }}
            />
            <canvas ref={drawingCanvasRef} style={{ display: 'none' }} />
          </div>

          {/* Sidebar controls */}
          <div style={{
            width: '320px',
            borderLeft: '1px solid var(--border-color)',
            background: '#0a101f',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}>
            {/* Tab Header Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-color)' }}>
              <button
                onClick={() => { setActiveTab('draw'); setTool('brush'); }}
                style={{
                  padding: '0.85rem',
                  background: activeTab === 'draw' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: `2.5px solid ${activeTab === 'draw' ? 'var(--color-primary)' : 'transparent'}`,
                  color: activeTab === 'draw' ? 'white' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'draw' ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem'
                }}
              >
                <Paintbrush size={14} /> Draw Tools
              </button>
              <button
                onClick={() => { setActiveTab('image'); setTool('none'); }}
                style={{
                  padding: '0.85rem',
                  background: activeTab === 'image' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: `2.5px solid ${activeTab === 'image' ? 'var(--color-primary)' : 'transparent'}`,
                  color: activeTab === 'image' ? 'white' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'image' ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem'
                }}
              >
                <ImageIcon size={14} /> Image Layer
              </button>
            </div>

            {/* Tab content viewports */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1, overflowY: 'auto' }}>
              
              {activeTab === 'draw' ? (
                <>
                  {/* Tool picker */}
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 700 }}>SELECT DRAWING TOOL</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                      {[
                        { id: 'brush', label: 'Brush', icon: Paintbrush },
                        { id: 'erase', label: 'Eraser', icon: Eraser },
                        { id: 'line', label: 'Line', icon: Minus },
                        { id: 'rect', label: 'Rect', icon: Square },
                        { id: 'circle', label: 'Circle', icon: CircleIcon },
                        { id: 'polygon', label: 'Polygon', icon: Check },
                        { id: 'text', label: 'Text', icon: Type }
                      ].map(t => {
                        const IconComp = t.icon;
                        const isActive = tool === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => { setTool(t.id); setPolygonPoints([]); }}
                            style={{
                              padding: '0.5rem 0.25rem',
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
                            <IconComp size={15} />
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {tool === 'polygon' && polygonPoints.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={commitPolygon}
                        style={{
                          flex: 2,
                          padding: '0.4rem',
                          background: 'var(--color-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Commit Polygon ({polygonPoints.length} pts)
                      </button>
                      <button
                        onClick={() => setPolygonPoints([])}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--color-danger)',
                          border: '1px solid var(--color-danger)',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Size & Opacity */}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>STYLING CONFIG</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={strokeEnabled} onChange={(e) => setStrokeEnabled(e.target.checked)} />
                        Outline (Stroke)
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={fillEnabled} onChange={(e) => setFillEnabled(e.target.checked)} />
                        Fill Inside
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

                  {/* Text parameters panel */}
                  {tool === 'text' && (
                    <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.6rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>TEXT SPECIFICS</div>
                      <input
                        type="text"
                        value={textString}
                        onChange={(e) => setTextString(e.target.value)}
                        placeholder="Text value"
                        style={{
                          width: '100%',
                          padding: '0.35rem 0.5rem',
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
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
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
                </>
              ) : (
                <>
                  {/* Image Layer properties */}
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 700 }}>UPLOAD IMAGE FILE</div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <ImageIcon size={15} /> Choose Image...
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {bgImage && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Sliders size={12} /> TRANSFORMS & FIT
                      </div>

                      {/* Scale */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          <span>Scale (Zoom)</span>
                          <span>{Math.round(imgScale * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="4.0"
                          step="0.05"
                          value={imgScale}
                          onChange={(e) => setImgScale(parseFloat(e.target.value))}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Rotation */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          <span>Rotation</span>
                          <span>{imgRotation}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="1"
                          value={imgRotation}
                          onChange={(e) => setImgRotation(parseInt(e.target.value))}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* X Offset */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          <span>Offset X (Horizontal)</span>
                          <span>{imgX}px</span>
                        </div>
                        <input
                          type="range"
                          min="-400"
                          max="400"
                          value={imgX}
                          onChange={(e) => setImgX(parseInt(e.target.value))}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Y Offset */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          <span>Offset Y (Vertical)</span>
                          <span>{imgY}px</span>
                        </div>
                        <input
                          type="range"
                          min="-400"
                          max="400"
                          value={imgY}
                          onChange={(e) => setImgY(parseInt(e.target.value))}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, marginTop: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                        IMAGE CORRECTION (FILTERS)
                      </div>

                      {/* Brightness */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          <span>Brightness</span>
                          <span>{imgBrightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={imgBrightness}
                          onChange={(e) => setImgBrightness(parseInt(e.target.value))}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Contrast */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          <span>Contrast</span>
                          <span>{imgContrast}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={imgContrast}
                          onChange={(e) => setImgContrast(parseInt(e.target.value))}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Saturation */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          <span>Saturation</span>
                          <span>{imgSaturation}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={imgSaturation}
                          onChange={(e) => setImgSaturation(parseInt(e.target.value))}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Undo & Clear Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginTop: 'auto' }}>
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
                  <Undo size={14} /> Undo Draw
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
                  <RotateCcw size={14} /> Clear Painted
                </button>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                style={{
                  width: '100%',
                  padding: '0.7rem',
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
                  fontSize: '0.82rem'
                }}
              >
                <Check size={16} /> Save Canvas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
