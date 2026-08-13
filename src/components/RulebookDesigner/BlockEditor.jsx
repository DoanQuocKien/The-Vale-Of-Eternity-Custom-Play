import React, { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import CellEditor from './CellEditor.jsx';
import { useAppStore } from '../../store/useAppStore.js';
import { parseEffectText } from '../../utils/constants.jsx';

export default function BlockEditor({ block, rulebook, mmToPx, onChange, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeCellIndex, setActiveCellIndex] = useState(null);

  const tokens = useAppStore(state => state.tokens);
  const families = useAppStore(state => state.families);

  const hPx = block.heightMm * mmToPx;
  const gapPx = block.columnGapMm * mmToPx;

  const updateCell = (index, cellData) => {
    let newCells = [...block.cells];
    const existingIndex = newCells.findIndex(c => c.columnIndex === index);
    if (existingIndex >= 0) {
      newCells[existingIndex] = { ...newCells[existingIndex], ...cellData };
    } else {
      newCells.push({ columnIndex: index, ...cellData });
    }
    onChange({ cells: newCells });
  };

  const getCellData = (index) => {
    return block.cells.find(c => c.columnIndex === index) || {
      columnIndex: index,
      content: { type: 'text', text: 'Click to edit...', fontSize: 11, fontWeight: 'normal', textAlign: 'left', color: '#1a1a1a' }
    };
  };

  return (
    <div 
      style={{
        position: 'relative',
        height: `${hPx}px`,
        marginBottom: '4px',
        border: isEditing ? '2px solid var(--color-primary)' : '1px solid transparent',
        transition: 'border 0.2s',
      }}
      onMouseEnter={() => !isEditing && setIsEditing(true)}
      onMouseLeave={() => isEditing && activeCellIndex === null && setIsEditing(false)}
    >
      {/* Block settings toolbar */}
      {isEditing && (
        <div style={{
          position: 'absolute',
          top: '-32px',
          right: '0',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '4px 8px',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          color: 'white',
          fontSize: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label>Height (mm):</label>
            <input 
              type="number" 
              value={block.heightMm} 
              onChange={e => onChange({ heightMm: Number(e.target.value) })}
              style={{ width: '40px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '2px 4px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label>Cols:</label>
            <select 
              value={block.columns} 
              onChange={e => onChange({ columns: Number(e.target.value) })}
              style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '2px 4px' }}
            >
              {[1, 2, 3, 4].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label>Gap (mm):</label>
            <input 
              type="number" 
              value={block.columnGapMm} 
              onChange={e => onChange({ columnGapMm: Number(e.target.value) })}
              style={{ width: '40px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '2px 4px' }}
            />
          </div>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Columns container */}
      <div style={{
        display: 'flex',
        gap: `${gapPx}px`,
        height: '100%',
      }}>
        {Array.from({ length: block.columns }).map((_, colIndex) => {
          const cellData = getCellData(colIndex);
          const content = cellData.content;
          
          return (
            <div 
              key={colIndex}
              onClick={() => setActiveCellIndex(colIndex)}
              style={{
                flex: 1,
                border: isEditing ? '1px dashed rgba(100,100,100,0.5)' : 'none',
                padding: '2px',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {content.type === 'text' ? (
                <div style={{ 
                  fontFamily: content.fontFamily || 'inherit',
                  fontSize: `${content.fontSize}pt`,
                  fontWeight: content.fontWeight,
                  fontStyle: content.fontStyle || 'normal',
                  textDecoration: content.textDecoration || 'none',
                  textAlign: content.textAlign,
                  color: content.color,
                  lineHeight: 1.4,
                }}>
                  {parseEffectText(content.text, tokens, families)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center' }}>
                  {content.imageDataUrl ? (
                    <>
                      <img 
                        src={content.imageDataUrl} 
                        alt="cell-img" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: content.captionText ? '90%' : '100%',
                          transform: `scale(${content.imageScalePercent / 100})` 
                        }} 
                      />
                      {content.captionText && (
                        <div style={{ fontSize: `${content.captionFontSize}pt`, marginTop: '4px', color: '#1a1a1a', textAlign: 'center' }}>
                          {parseEffectText(content.captionText, tokens, families)}
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No image selected</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cell Editor Modal */}
      {activeCellIndex !== null && (
        <CellEditor 
          cell={getCellData(activeCellIndex)}
          onSave={(updatedCell) => {
            updateCell(activeCellIndex, updatedCell);
            setActiveCellIndex(null);
          }}
          onClose={() => setActiveCellIndex(null)}
        />
      )}
    </div>
  );
}
