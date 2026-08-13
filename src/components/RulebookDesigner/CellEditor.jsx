import React, { useState, useRef } from 'react';
import { X, Type, Image as ImageIcon, Sparkles, Bold, Italic, Underline, Strikethrough } from 'lucide-react';
import RulebookImagePicker from './RulebookImagePicker.jsx';
import { useAppStore } from '../../store/useAppStore.js';

const FONT_OPTIONS = [
  { label: 'Default (Sans-Serif)', value: 'var(--font-family)' },
  { label: 'NorseBold (Title / Price)', value: 'var(--font-price)' },
  { label: 'TitanOne (Card Name)', value: 'var(--font-card-name)' },
  { label: 'MerriweatherSans (Effect)', value: 'var(--font-effect)' },
  { label: 'Roboto (Credit)', value: 'var(--font-credit)' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
];

const BUILTIN_ICON_PRESETS = [
  { label: 'Stone 1', code: '\\icon(Stone1)', img: './img/TextIcon/Stone1.png' },
  { label: 'Stone 3', code: '\\icon(Stone3)', img: './img/TextIcon/Stone3.png' },
  { label: 'Stone 6', code: '\\icon(Stone6)', img: './img/TextIcon/Stone6.png' },
  { label: 'Score', code: '\\icon(Score, 1)', img: './img/TextIcon/Score.png' },
  { label: 'Fire', code: '\\icon(Fire)', img: './img/TextIcon/Fire.png' },
  { label: 'Water', code: '\\icon(Water)', img: './img/TextIcon/Water.png' },
  { label: 'Earth', code: '\\icon(Earth)', img: './img/TextIcon/Earth.png' },
  { label: 'Wind', code: '\\icon(Wind)', img: './img/TextIcon/Wind.png' },
  { label: 'Dragon', code: '\\icon(Dragon)', img: './img/TextIcon/Dragon.png' },
  { label: 'Instant', code: '\\icon(Instant)', img: './img/Effect/InstantEffect.png' },
  { label: 'Permanent', code: '\\icon(Permanent)', img: './img/Effect/PermanentEffect.png' },
  { label: 'Resolution', code: '\\icon(Active)', img: './img/Effect/ResolutionEffect.png' },
  { label: 'Card Back', code: '\\icon(Card)', img: './img/Layout/Backside.png' },
];

export default function CellEditor({ cell, onSave, onClose }) {
  const [content, setContent] = useState(cell.content);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showIconMenu, setShowIconMenu] = useState(false);

  const textareaRef = useRef(null);

  const tokens = useAppStore(state => state.tokens);
  const families = useAppStore(state => state.families);

  const handleSave = () => {
    onSave({ content });
  };

  const handleImagePicked = (imageObj) => {
    setContent({
      ...content,
      imageSource: imageObj.source,
      imageDataUrl: imageObj.dataUrl
    });
    setShowImagePicker(false);
  };

  const insertTextOrWrap = (prefix, suffix = ')') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = content.text || '';
    const selectedText = currentText.substring(start, end);

    let inserted = '';
    if (selectedText) {
      inserted = `${prefix}${selectedText}${suffix}`;
    } else {
      inserted = `${prefix}text${suffix}`;
    }

    const newText = currentText.substring(0, start) + inserted + currentText.substring(end);
    setContent({ ...content, text: newText });

    setTimeout(() => {
      textarea.focus();
      const cursorTarget = start + prefix.length + (selectedText ? selectedText.length : 0);
      textarea.setSelectionRange(cursorTarget, cursorTarget);
    }, 50);
  };

  const insertIconCode = (code) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = content.text || '';
      const newText = currentText.substring(0, start) + code + currentText.substring(end);
      setContent({ ...content, text: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + code.length, start + code.length);
      }, 50);
    } else {
      setContent({ ...content, text: (content.text || '') + code });
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div className="glass-panel" style={{ width: '580px', maxWidth: '95vw', maxHeight: '90vh', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'white' }}>Edit Cell</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
          </div>

          {/* Type Toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <button 
              onClick={() => setContent({ ...content, type: 'text' })}
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', padding: '0.5rem', background: content.type === 'text' ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface-elevated)', border: content.type === 'text' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', color: content.type === 'text' ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              <Type size={16} /> Text
            </button>
            <button 
              onClick={() => setContent({ ...content, type: 'image' })}
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', padding: '0.5rem', background: content.type === 'image' ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface-elevated)', border: content.type === 'image' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', color: content.type === 'image' ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              <ImageIcon size={16} /> Image
            </button>
          </div>

          {/* Text Editor */}
          {content.type === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  {/* Quick Format Bar */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={() => insertTextOrWrap('\\bold(')}
                      title="Bold \bold(...)"
                      style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      onClick={() => insertTextOrWrap('\\italic(')}
                      title="Italic \italic(...)"
                      style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontStyle: 'italic', fontSize: '0.8rem' }}
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      onClick={() => insertTextOrWrap('\\underline(')}
                      title="Underline \underline(...)"
                      style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      <Underline size={13} />
                    </button>
                    <button
                      onClick={() => insertTextOrWrap('\\bolditalic(')}
                      title="Bold Italic \bolditalic(...)"
                      style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontStyle: 'italic', fontSize: '0.75rem' }}
                    >
                      BI
                    </button>
                    <button
                      onClick={() => insertTextOrWrap('\\strike(')}
                      title="Strikethrough \strike(...)"
                      style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      <Strikethrough size={13} />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowIconMenu(!showIconMenu)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.25rem 0.6rem', background: 'rgba(99,102,241,0.15)',
                      border: '1px solid var(--color-primary)', color: 'var(--color-primary)',
                      borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700
                    }}
                  >
                    <Sparkles size={12} /> {showIconMenu ? 'Close Icon Picker' : '✦ Insert Icon'}
                  </button>
                </div>

                {/* Icon Insertion Helper Panel */}
                {showIconMenu && (
                  <div style={{
                    background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                    borderRadius: '4px', padding: '0.75rem', marginBottom: '0.75rem',
                    maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem'
                  }}>
                    {/* Built-in Icons */}
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 700 }}>Built-in Icons</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {BUILTIN_ICON_PRESETS.map((icon, idx) => (
                          <button
                            key={idx}
                            onClick={() => insertIconCode(icon.code)}
                            title={icon.code}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.25rem 0.5rem', background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-color)', color: 'white',
                              borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem'
                            }}
                          >
                            <img src={icon.img} alt={icon.label} style={{ height: '14px', width: 'auto', objectFit: 'contain' }} />
                            <span>{icon.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pack Custom Families */}
                    {families.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 700 }}>Pack Families</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {families.map((fam) => (
                            <button
                              key={fam.id}
                              onClick={() => insertIconCode(`\\icon(${fam.name})`)}
                              title={`\\icon(${fam.name})`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                padding: '0.25rem 0.5rem', background: 'var(--bg-surface-elevated)',
                                border: '1px solid var(--border-color)', color: 'white',
                                borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem'
                              }}
                            >
                              {fam.icon && <img src={fam.icon} alt={fam.name} style={{ height: '14px', width: 'auto', objectFit: 'contain' }} />}
                              <span>{fam.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pack Custom Tokens */}
                    {tokens.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 700 }}>Pack Tokens</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {tokens.map((token) => (
                            <button
                              key={token.id}
                              onClick={() => insertIconCode(`\\icon(${token.name})`)}
                              title={`\\icon(${token.name})`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                padding: '0.25rem 0.5rem', background: 'var(--bg-surface-elevated)',
                                border: '1px solid var(--border-color)', color: 'white',
                                borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem'
                              }}
                            >
                              {(token.artImageData?.dataUrl || token.drawingDataUrl) && (
                                <img src={token.artImageData?.dataUrl || token.drawingDataUrl} alt={token.name} style={{ height: '14px', width: 'auto', objectFit: 'contain' }} />
                              )}
                              <span>{token.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <textarea 
                  ref={textareaRef}
                  value={content.text || ''} 
                  onChange={e => setContent({ ...content, text: e.target.value })}
                  rows={5}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem', borderRadius: '4px', fontFamily: content.fontFamily || 'inherit', fontSize: '0.9rem' }}
                  placeholder="Type text here. Use \bold(...), \italic(...), \underline(...), or \icon(...) for formatting."
                />
              </div>

              {/* Font Family Choice */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Font Family</label>
                <select
                  value={content.fontFamily || 'var(--font-family)'}
                  onChange={e => setContent({ ...content, fontFamily: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem', borderRadius: '4px', fontFamily: content.fontFamily || 'inherit' }}
                >
                  {FONT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '80px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Size (pt)</label>
                  <input type="number" value={content.fontSize || 11} onChange={e => setContent({ ...content, fontSize: Number(e.target.value) })} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem', borderRadius: '4px' }} />
                </div>
                <div style={{ flex: 1, minWidth: '90px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Weight</label>
                  <select value={content.fontWeight || 'normal'} onChange={e => setContent({ ...content, fontWeight: e.target.value })} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem', borderRadius: '4px' }}>
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '90px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Style</label>
                  <select value={content.fontStyle || 'normal'} onChange={e => setContent({ ...content, fontStyle: e.target.value })} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem', borderRadius: '4px' }}>
                    <option value="normal">Normal</option>
                    <option value="italic">Italic</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '90px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Decoration</label>
                  <select value={content.textDecoration || 'none'} onChange={e => setContent({ ...content, textDecoration: e.target.value })} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem', borderRadius: '4px' }}>
                    <option value="none">None</option>
                    <option value="underline">Underline</option>
                    <option value="line-through">Strikethrough</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '80px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Align</label>
                  <select value={content.textAlign || 'left'} onChange={e => setContent({ ...content, textAlign: e.target.value })} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem', borderRadius: '4px' }}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="justify">Justify</option>
                  </select>
                </div>
                <div style={{ flex: '0 0 50px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Color</label>
                  <input type="color" value={content.color || '#1a1a1a'} onChange={e => setContent({ ...content, color: e.target.value })} style={{ width: '100%', height: '32px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }} />
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
                  <button onClick={() => setShowImagePicker(true)} style={{ padding: '0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
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
