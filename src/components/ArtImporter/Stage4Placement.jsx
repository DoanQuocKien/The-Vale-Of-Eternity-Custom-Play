import React from 'react';
import { Check } from 'lucide-react';
import { getBackgroundPath } from '../../utils/constants.jsx';
import { useAppStore } from '../../store/useAppStore.js';

const SAFE_ZONE = {
  xMin: 18.5,  // %
  xMax: 81,    // %
  yMin: 8.3,   // %
  yMax: 87,    // %
  focalX: 50,  // %
  focalY: 47.7 // %
};

const Stage4Placement = ({
  isComponentMode,
  isTokenMode,
  cardFamily,
  finalDataUrl,
  artTransform,
  setArtTransform,
  handleArtMouseDown,
  handleConfirm,
  setStage,
  onStartOver,
  confirmCanvasRef
}) => {
  const isCustomMode = isTokenMode || isComponentMode;
  const families = useAppStore(state => state.families);
  const customFamily = families.find(f => f.id === cardFamily || f.name === cardFamily);

  const bgSrc = customFamily
    ? (customFamily.bgArt || getBackgroundPath('Water'))
    : getBackgroundPath(cardFamily);

  const familyColor = customFamily
    ? customFamily.primaryColor
    : `var(--family-${cardFamily.toLowerCase()})`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
      {/* Transform controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f472b6', margin: 0 }}>Position & Size</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          Drag the art on the preview to reposition it. Use sliders for precise control.
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
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={artTransform[key]}
              onChange={(e) => setArtTransform(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
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
            onClick={onStartOver}
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

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button onClick={() => setStage(3)} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ← Back
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 2,
              padding: '0.6rem 1rem',
              background: 'linear-gradient(135deg, #ec4899, #db2777)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 800,
              color: 'white',
              boxShadow: '0 4px 16px rgba(236,72,153,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Check size={16} /> {isComponentMode ? 'Apply to Component' : isTokenMode ? 'Apply to Token' : 'Apply to Card'}
          </button>
        </div>
      </div>

      {/* Card preview with art overlay */}
      <div
        ref={confirmCanvasRef}
        style={{
          position: 'relative',
          width: '240px',
          height: '335px', // 240 × (2414/1728) = 335
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          border: isCustomMode ? '2px solid rgba(255,255,255,0.1)' : `2px solid ${familyColor}`,
          background: '#0b0f19',
          userSelect: 'none',
          margin: '0 auto',
          containerType: 'inline-size'
        }}
      >
        {/* Card Background (bottom) */}
        {!isCustomMode && (
          <img src={bgSrc} alt="Card Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }} />
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
          customFamily && !customFamily.icon ? (
            <div style={{
              position: 'absolute',
              left: '8.45%',
              top: '6.46%',
              width: '11.91cqw',
              height: '11.91cqw',
              transform: 'translate(-50%, -50%)',
              zIndex: 3.5,
              borderRadius: '50%',
              border: '1.5px solid white',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              background: customFamily.primaryColor,
              color: 'white',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '5cqw',
              pointerEvents: 'none'
            }}>
              {customFamily.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <img
              src={customFamily?.icon || `./img/TextIcon/${cardFamily}.png`}
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
          )
        )}

        {/* Family Emblem - Bottom-Right */}
        {!isCustomMode && (
          customFamily && !customFamily.icon ? (
            <div style={{
              position: 'absolute',
              left: '90.97%',
              top: '93.54%',
              width: '9.84cqw',
              height: '9.84cqw',
              transform: 'translate(-50%, -50%)',
              zIndex: 3.5,
              borderRadius: '50%',
              border: '1.5px solid white',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              background: customFamily.primaryColor,
              color: 'white',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4.5cqw',
              pointerEvents: 'none'
            }}>
              {customFamily.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <img
              src={customFamily?.icon || `./img/TextIcon/${cardFamily}.png`}
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
          )
        )}

        {/* Safe zone overlay guide */}
        {!isCustomMode && (
          <div
            style={{
              position: 'absolute',
              left: `${SAFE_ZONE.xMin}%`,
              top: `${SAFE_ZONE.yMin}%`,
              width: `${SAFE_ZONE.xMax - SAFE_ZONE.xMin}%`,
              height: `${SAFE_ZONE.yMax - SAFE_ZONE.yMin}%`,
              border: '1px dashed rgba(255,255,255,0.2)',
              borderRadius: '2px',
              zIndex: 4,
              pointerEvents: 'none'
            }}
          />
        )}

        <p style={{
          position: 'absolute',
          bottom: '4px',
          left: 0,
          right: 0,
          fontSize: '8px',
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
          zIndex: 4,
          pointerEvents: 'none'
        }}>
          ←drag art→
        </p>
      </div>
    </div>
  );
};

export default Stage4Placement;
export { SAFE_ZONE };
