import React, { useState } from 'react';
import {
  Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Plus,
  Layers, Paintbrush, Type, Grid, FileImage, Sliders
} from 'lucide-react';

export default function LayerPanel({
  layers = [],
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onRemoveLayer,
  onReorderLayers,
  onUpdateLayer
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleMoveUp = (index) => {
    if (index === layers.length - 1) return; // already at top of array (drawn on top)
    const newLayers = [...layers];
    const temp = newLayers[index];
    newLayers[index] = newLayers[index + 1];
    newLayers[index + 1] = temp;
    onReorderLayers(newLayers);
  };

  const handleMoveDown = (index) => {
    if (index === 0) return; // already at bottom of array (drawn below)
    const newLayers = [...layers];
    const temp = newLayers[index];
    newLayers[index] = newLayers[index - 1];
    newLayers[index - 1] = temp;
    onReorderLayers(newLayers);
  };

  const getLayerIcon = (type) => {
    switch (type) {
      case 'fill': return <Sliders size={14} style={{ color: '#10b981' }} />;
      case 'image': return <FileImage size={14} style={{ color: '#3b82f6' }} />;
      case 'text': return <Type size={14} style={{ color: '#ec4899' }} />;
      case 'grid': return <Grid size={14} style={{ color: '#f59e0b' }} />;
      case 'drawing':
      default:
        return <Paintbrush size={14} style={{ color: '#818cf8' }} />;
    }
  };

  // Reverse list so top of list = top of rendering stack (drawn last)
  const reversedLayers = [...layers].reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
          <Layers size={14} /> Layer Stack
        </h4>

        {/* Add Layer Popover Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{
              padding: '0.25rem 0.5rem',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            <Plus size={10} /> Add Layer
          </button>

          {showAddMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '0.35rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
              zIndex: 100,
              width: '140px',
              overflow: 'hidden'
            }}>
              {[
                { type: 'drawing', label: 'Drawing Layer' },
                { type: 'fill', label: 'Fill Layer' },
                { type: 'text', label: 'Text Layer' },
                { type: 'grid', label: 'Grid Layer' }
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => {
                    onAddLayer(item.type);
                    setShowAddMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  {getLayerIcon(item.type)}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Layer Stack Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.15rem' }}>
        {layers.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
            No layers found.
          </div>
        ) : (
          reversedLayers.map((layer, revIdx) => {
            const index = layers.length - 1 - revIdx;
            const isActive = activeLayerId === layer.id;

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  padding: '0.5rem 0.6rem',
                  background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                  {/* Layer Label & Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                    {getLayerIcon(layer.type)}
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '120px'
                    }}>
                      {layer.name}
                    </span>
                  </div>

                  {/* Layer Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={e => e.stopPropagation()}>
                    {/* Visibility */}
                    <button
                      onClick={() => onUpdateLayer(layer.id, { visible: !layer.visible })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                    >
                      {layer.visible ? <Eye size={12} style={{ color: '#818cf8' }} /> : <EyeOff size={12} />}
                    </button>

                    {/* Move Up */}
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === layers.length - 1}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', opacity: index === layers.length - 1 ? 0.3 : 1 }}
                    >
                      <ChevronUp size={12} />
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === 0}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', opacity: index === 0 ? 0.3 : 1 }}
                    >
                      <ChevronDown size={12} />
                    </button>

                    {/* Delete (prevent deleting if it's the last layer) */}
                    <button
                      onClick={() => onRemoveLayer(layer.id)}
                      disabled={layers.length <= 1}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: layers.length <= 1 ? 'not-allowed' : 'pointer',
                        color: 'var(--text-muted)',
                        padding: '2px',
                        opacity: layers.length <= 1 ? 0.3 : 1
                      }}
                      onMouseEnter={(e) => { if (layers.length > 1) e.currentTarget.style.color = 'var(--color-danger)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Opacity slider inside active item */}
                {isActive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', width: '40px' }}>Opacity:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={layer.opacity ?? 1}
                      onChange={(e) => onUpdateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
                      style={{ flexGrow: 1, height: '4px' }}
                    />
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', width: '22px', textAlign: 'right' }}>
                      {Math.round((layer.opacity ?? 1) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
