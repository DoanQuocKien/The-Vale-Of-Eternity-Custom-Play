import React from 'react';
import BlockEditor from './BlockEditor.jsx';
import { Plus } from 'lucide-react';

export default function RulebookPage({ page, rulebook, widthMm, heightMm, onChange }) {
  const { marginMm, background } = rulebook;

  // We map physical dimensions (mm) to CSS pixels using a fixed ratio.
  // We'll use 1mm = 3.78px for rendering (standard 96dpi).
  const MM_TO_PX = 3.78;

  const wPx = widthMm * MM_TO_PX;
  const hPx = heightMm * MM_TO_PX;
  const marginPx = marginMm * MM_TO_PX;

  let bgStyle = {};
  if (background.type === 'solid') {
    bgStyle.backgroundColor = background.color;
  } else if (background.type === 'gradient') {
    bgStyle.backgroundImage = `linear-gradient(${background.gradientAngle}deg, ${background.gradientFrom}, ${background.gradientTo})`;
  } else if (background.type === 'image' && background.imageDataUrl) {
    bgStyle.backgroundImage = `url(${background.imageDataUrl})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  } else {
    bgStyle.backgroundColor = '#ffffff'; // Fallback
  }

  const handleAddBlock = () => {
    const newBlock = {
      id: 'block-' + Date.now(),
      columns: 1,
      columnGapMm: 4,
      heightMm: 60,
      cells: [
        { columnIndex: 0, content: { type: 'text', text: 'New text block...', fontSize: 11, fontFamily: 'inherit', fontWeight: 'normal', textAlign: 'left', color: '#1a1a1a' } }
      ]
    };
    onChange({ blocks: [...page.blocks, newBlock] });
  };

  const updateBlock = (blockId, updates) => {
    const newBlocks = page.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b);
    onChange({ blocks: newBlocks });
  };

  const deleteBlock = (blockId) => {
    onChange({ blocks: page.blocks.filter(b => b.id !== blockId) });
  };

  return (
    <div 
      className="rulebook-page-canvas"
      data-page-id={page.id}
      style={{
        width: `${wPx}px`,
        height: `${hPx}px`,
        ...bgStyle,
        position: 'relative',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        top: `${marginPx}px`,
        left: `${marginPx}px`,
        right: `${marginPx}px`,
        bottom: `${marginPx}px`,
        border: '1px dashed rgba(100,100,100,0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {page.blocks.map((block) => (
          <BlockEditor 
            key={block.id} 
            block={block} 
            rulebook={rulebook} 
            mmToPx={MM_TO_PX} 
            onChange={(updates) => updateBlock(block.id, updates)} 
            onDelete={() => deleteBlock(block.id)}
          />
        ))}

        {/* Add block area */}
        <div 
          className="hide-on-export"
          onClick={handleAddBlock}
          style={{
            flex: 1,
            minHeight: '60px',
            border: '2px dashed var(--color-primary)',
            borderRadius: '4px',
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-primary)',
            fontSize: '0.9rem',
            fontWeight: 600,
            transition: 'all 0.2s',
            margin: '4px 0'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.15)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)'}
        >
          <Plus size={16} style={{ marginRight: '0.4rem' }} /> Add Block
        </div>
      </div>
    </div>
  );
}
