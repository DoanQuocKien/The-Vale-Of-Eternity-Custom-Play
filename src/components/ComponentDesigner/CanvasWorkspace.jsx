import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Undo, Trash2 } from 'lucide-react';

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

const CanvasWorkspace = ({
  activeComponent,
  widthPx,
  heightPx,
  canvasRef,
  panMode,
  tool,
  isPanningState,
  zoom,
  pan,
  isDrawingLayerActive,
  undoList,
  handleUndo,
  handleClearDrawing,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleWheel,
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  setTool
}) => {
  return (
    <div className="glass-panel" style={{
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'rgba(5, 8, 20, 0.5)',
      position: 'relative'
    }}>
      {/* Viewport */}
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
        onWheel={handleWheel}
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

        {/* Non-drawing layer warning badge */}
        {!isDrawingLayerActive && tool !== 'none' && (
          <div style={{
            position: 'absolute',
            top: '0.6rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(99, 102, 241, 0.85)',
            color: 'white',
            padding: '0.3rem 0.8rem',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 700,
            zIndex: 10,
            pointerEvents: 'none',
            backdropFilter: 'blur(4px)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}>
            ✏️ Select a Drawing Layer to draw — pan/drag still works
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
        💡 Use the <b>Pan/View</b> tool or hold <b>Spacebar</b> to pan. <b>Scroll</b> to zoom. Grid lines are spaced at 10mm. Red margins show bleed safety guidelines.
      </div>
    </div>
  );
};

export default CanvasWorkspace;
export { HorizontalRuler, VerticalRuler };
