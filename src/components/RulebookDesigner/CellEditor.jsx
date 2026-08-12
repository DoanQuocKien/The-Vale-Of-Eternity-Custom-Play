import React, { useState } from 'react';
import { X, Type, Image as ImageIcon } from 'lucide-react';
import RulebookImagePicker from './RulebookImagePicker.jsx';

export default function CellEditor({ cell, onSave, onClose }) {
  const [content, setContent] = useState(cell.content);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const handleSave = () => {
    onSave({ content });
  };

  const handleImagePicked = (imageObj) => {
    setContent({
      ...content,
      imageSource: imageObj.source, // { type, id, name }
      imageDataUrl: imageObj.dataUrl
    });
    setShowImagePicker(false);
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div className="glass-panel" style={{ width: '500px', maxWidth: '90vw', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'white' }}>Edit Cell</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
          </div>

          {/* Type Toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button 
              onClick={() => setContent({ ...content, type: 'text' })}
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', padding: '0.5rem', background: content.type === 'text' ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface-elevated)', border: content.type === 'text' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', color: content.type === 'text' ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}
            >
              <Type size={16} /> Text
            </button>
            <button 
              onClick={() => setContent({ ...content, type: 'image' })}
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', padding: '0.5rem', background: content.type === 'image' ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface-elevated)', border: content.type === 'image' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', color: content.type === 'image' ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}
            >
              <ImageIcon size={16} /> Image
            </button>
          </div>

          {/* Content Editors */}
          {content.type === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea 
                value={content.text || ''} 
                onChange={e => setContent({ ...content, text: e.target.value })}
                rows={6}
                style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '4px', fontFamily: 'inherit' }}
                placeholder="Type your text here. Use \icon(...) for icons."
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Font Size (pt)</label>
                  <input type="number" value={content.fontSize || 11} onChange={e => setContent({ ...content, fontSize: Number(e.target.value) })} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem', borderRadius: '4px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Weight</label>
                  <select value={content.fontWeight || 'normal'} onChange={e => setContent({ ...content, fontWeight: e.target.value })} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem', borderRadius: '4px' }}>
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Align</label>
                  <select value={content.textAlign || 'left'} onChange={e => setContent({ ...content, textAlign: e.target.value })} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem', borderRadius: '4px' }}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="justify">Justify</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Color</label>
                  <input type="color" value={content.color || '#1a1a1a'} onChange={e => setContent({ ...content, color: e.target.value })} style={{ width: '100%', height: '32px', background: 'transparent', border: 'none', padding: 0 }} />
                </div>
              </div>
            </div>
          )}

          {content.type === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '120px', height: '120px', background: 'var(--bg-main)', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                  {content.imageDataUrl ? (
                    <img src={content.imageDataUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Image</span>
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button onClick={() => setShowImagePicker(true)} style={{ padding: '0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>
                    {content.imageDataUrl ? 'Change Image' : 'Pick Image'}
                  </button>
                  {content.imageSource && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Selected: <strong>{content.imageSource.name}</strong> ({content.imageSource.type})
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                  <span>Scale</span>
                  <span>{content.imageScalePercent || 100}%</span>
                </label>
                <input type="range" min="10" max="300" value={content.imageScalePercent || 100} onChange={e => setContent({ ...content, imageScalePercent: Number(e.target.value) })} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Caption (Optional)</label>
                <input type="text" value={content.captionText || ''} onChange={e => setContent({ ...content, captionText: e.target.value })} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '4px' }} placeholder="Image caption..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Caption Font Size (pt)</label>
                <input type="number" value={content.captionFontSize || 9} onChange={e => setContent({ ...content, captionFontSize: Number(e.target.value) })} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '4px' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} style={{ padding: '0.5rem 1.5rem', background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Save</button>
          </div>

        </div>
      </div>

      {showImagePicker && (
        <RulebookImagePicker 
          onCancel={() => setShowImagePicker(false)}
          onPick={handleImagePicked}
        />
      )}
    </>
  );
}
