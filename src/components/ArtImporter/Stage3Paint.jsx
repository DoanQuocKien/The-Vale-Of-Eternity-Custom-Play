import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Square, Circle as CircleIcon, Type, Paintbrush, Eraser, Trash2, Check, Sliders } from 'lucide-react';
import ColorPickerPanel from './ColorPickerPanel.jsx'; // We'll extract ColorPickerPanel too!

const Stage3Paint = ({
  tool,
  setTool,
  strokeColor,
  setStrokeColor,
  fillColor,
  setFillColor,
  strokeEnabled,
  setStrokeEnabled,
  fillEnabled,
  setFillEnabled,
  opacity,
  setOpacity,
  fontSize,
  setFontSize,
  textString,
  setTextString,
  polygonPoints,
  setPolygonPoints,
  fontWeight,
  setFontWeight,
  isCreateMode,
  createBlankCanvas,
  brushSize,
  setBrushSize,
  zoom,
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  pan,
  isPanningState,
  panMode,
  setPanMode,
  canvasRef,
  processedDataUrl,
  compareSlider,
  setCompareSlider,
  commitPolygon,
  setStage,
  isTokenMode,
  isComponentMode,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onStartOver,
  tuning,
  setTuning
}) => {
  const isCustomMode = isTokenMode || isComponentMode;

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
    <div style={{ display: 'grid', gridTemplateColumns: '0.4fr 0.6fr', gap: '1.5rem', alignItems: 'start' }}>
      
      {/* Left Column: Controls & Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        
        {/* Color Tuning Section (Upload Mode Only) */}
        {!isCreateMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Sliders size={14} /> Color Tuning
            </h3>
            {[
              { key: 'vibrance', label: 'Vibrance', min: 0, max: 2, step: 0.05 },
              { key: 'familyTint', label: 'Family Tint Strength', min: 0, max: 1, step: 0.05 },
              { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 5 },
              { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 5 },
              { key: 'hueRotate', label: 'Hue Rotation (°)', min: -180, max: 180, step: 10 },
            ].map(({ key, label, min, max, step }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{tuning[key]}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={tuning[key]}
                  onChange={(e) => setTuning(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Painting Suite Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderTop: !isCreateMode ? '1px solid var(--border-color)' : 'none', paddingTop: !isCreateMode ? '0.75rem' : 0 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
            🎨 Painting & Overlay Tools
          </h3>

          {/* Tools Grid Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
            {[
              { id: 'brush', label: 'Brush', icon: <Paintbrush size={12} /> },
              { id: 'erase', label: 'Eraser', icon: <Eraser size={12} /> },
              { id: 'line', label: 'Line', icon: <span style={{ fontWeight: 800 }}>╱</span> },
              { id: 'rect', label: 'Rect', icon: <Square size={12} /> },
              { id: 'circle', label: 'Circle', icon: <CircleIcon size={12} /> },
              { id: 'polygon', label: 'Polygon', icon: <span style={{ fontSize: '0.75rem' }}>⬡</span> },
              { id: 'text', label: 'Text', icon: <Type size={12} /> },
              { id: 'pan', label: 'Pan', icon: <Move size={12} /> },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                style={toolBtnStyle(tool === t.id)}
                title={t.label}
              >
                {t.icon}
                <span style={{ display: 'none' }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Brush/Eraser specific parameters */}
          {['brush', 'erase', 'restore', 'line', 'rect', 'circle', 'polygon'].includes(tool) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Brush / Stroke Size</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={200}
                  step={1}
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Opacity</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Stroke/Fill pickers for shapes */}
              {['line', 'rect', 'circle', 'polygon'].includes(tool) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
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
                  {['rect', 'circle', 'polygon'].includes(tool) && (
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
            </div>
          )}

          {/* Text Tool parameters */}
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
            <div style={{ display: 'flex', gap: '0.3.5rem', marginTop: '0.2rem' }}>
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

        {/* Buttons block */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
          <button
            onClick={onStartOver}
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

      {/* Right Column: Live Workspace Canvas */}
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
          onPointerDown={onPointerDown}
          onContextMenu={(e) => e.preventDefault()}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
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
                <img src={processedDataUrl} alt="Before" style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', opacity: 1, objectFit: 'contain' }} />
                <div style={{
                  position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                  clipPath: `inset(0 0 0 ${compareSlider}%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <canvas
                    ref={canvasRef}
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
                ref={canvasRef}
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
            <input
              type="range"
              min={0}
              max={100}
              value={compareSlider}
              onChange={(e) => setCompareSlider(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>Drag slider to compare before/after enhancement</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stage3Paint;
