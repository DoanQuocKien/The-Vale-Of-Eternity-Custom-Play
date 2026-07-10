import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { Plus, Trash2, Edit3, ImagePlus, Check, X, ShieldAlert, Sparkles, Paintbrush } from 'lucide-react';
import DrawingModal from './DrawingModal.jsx';

export default function FamilyDesigner({ onShowArtImporter }) {
  const families = useAppStore(state => state.families);
  const activePackId = useAppStore(state => state.activePackId);
  const saveFamily = useAppStore(state => state.saveFamily);
  const deleteFamily = useAppStore(state => state.deleteFamily);
  const cards = useAppStore(state => state.cards);
  const saveCard = useAppStore(state => state.saveCard);
  const loadCards = useAppStore(state => state.loadCards);

  // Editor states
  const [editingFamily, setEditingFamily] = useState(null);
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#8b5cf6');
  const [secondaryColor, setSecondaryColor] = useState('#ec4899');
  const [icon, setIcon] = useState('');
  const [bgArt, setBgArt] = useState('');

  // Drawing modal state
  const [drawingConfig, setDrawingConfig] = useState({
    isOpen: false,
    type: 'icon', // 'icon' | 'bg'
    width: 256,
    height: 256,
    initialDataUrl: ''
  });

  const selectFamily = (fam) => {
    if (fam) {
      setEditingFamily(fam);
      setName(fam.name || '');
      setPrimaryColor(fam.primaryColor || '#8b5cf6');
      setSecondaryColor(fam.secondaryColor || '#ec4899');
      setIcon(fam.icon || '');
      setBgArt(fam.bgArt || '');
    } else {
      setEditingFamily(null);
      setName('');
      setPrimaryColor('#8b5cf6');
      setSecondaryColor('#ec4899');
      setIcon('');
      setBgArt('');
    }
  };

  const handleCreateNew = () => {
    selectFamily({
      name: `New Element ${families.length + 1}`,
      primaryColor: '#8b5cf6',
      secondaryColor: '#ec4899',
      icon: '',
      bgArt: ''
    });
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (onShowArtImporter) {
        onShowArtImporter({
          existingArt: event.target.result,
          family: name || 'Water',
          isBgMode: type === 'bg',
          isIconMode: type === 'icon'
        }, (finalArt) => {
          if (type === 'icon') {
            setIcon(finalArt);
          } else {
            setBgArt(finalArt);
          }
        });
      } else {
        if (type === 'icon') {
          setIcon(event.target.result);
        } else {
          setBgArt(event.target.result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a family name.');
      return;
    }

    const reservedNames = ['fire', 'water', 'earth', 'wind', 'dragon'];
    if (reservedNames.includes(name.trim().toLowerCase())) {
      alert(`"${name}" is a default element name and cannot be used for a custom family.`);
      return;
    }

    const isRename = editingFamily && editingFamily.name && editingFamily.name !== name.trim();
    const oldName = editingFamily?.name;

    const payload = {
      ...editingFamily,
      name: name.trim(),
      primaryColor,
      secondaryColor,
      icon,
      bgArt
    };

    const saved = await saveFamily(payload);

    if (isRename && oldName) {
      // Find all cards matching old family name or ID and update them
      const updatedCards = cards.filter(c => c.family === oldName || c.family === saved.id);
      for (const card of updatedCards) {
        const updatedCard = { ...card, family: saved.id };
        
        // Update layout calibrations keys
        if (updatedCard.layout) {
          const newLayout = { ...updatedCard.layout };
          for (const key of Object.keys(newLayout)) {
            if (newLayout[key] && newLayout[key].families) {
              const fams = { ...newLayout[key].families };
              if (fams[oldName]) {
                fams[saved.id] = fams[oldName];
                delete fams[oldName];
              }
              newLayout[key] = { ...newLayout[key], families: fams };
            }
            if (newLayout[key] && newLayout[key].colors) {
              const cols = { ...newLayout[key].colors };
              if (cols[oldName]) {
                cols[saved.id] = cols[oldName];
                delete cols[oldName];
              }
              newLayout[key] = { ...newLayout[key], colors: cols };
            }
          }
          updatedCard.layout = newLayout;
        }

        await saveCard(updatedCard);
      }
      await loadCards(activePackId);
    }

    selectFamily(saved);
    alert('Family saved successfully!');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this custom family? Cards referencing it will fall back to default element styles.')) return;
    await deleteFamily(id);
    if (editingFamily?.id === id) {
      selectFamily(null);
    }
  };

  const openPaintModal = (type) => {
    if (type === 'icon') {
      setDrawingConfig({
        isOpen: true,
        type: 'icon',
        width: 256,
        height: 256,
        initialDataUrl: icon
      });
    } else {
      setDrawingConfig({
        isOpen: true,
        type: 'bg',
        width: 744,
        height: 1039,
        initialDataUrl: bgArt
      });
    }
  };

  const handleSaveDrawing = (dataUrl) => {
    if (drawingConfig.type === 'icon') {
      setIcon(dataUrl);
    } else {
      setBgArt(dataUrl);
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '320px 1fr',
      gap: '1.5rem',
      height: '100%',
      minHeight: '650px',
      padding: '0.5rem',
      boxSizing: 'border-box'
    }}>
      {/* Left panel: families list */}
      <div className="glass-panel" style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', margin: 0 }}>Custom Families</h3>
          <button
            onClick={handleCreateNew}
            style={{
              padding: '0.35rem 0.6rem',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {families.length === 0 ? (
          <div style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            gap: '0.5rem'
          }}>
            <ShieldAlert size={28} style={{ color: 'var(--text-muted)' }} />
            No custom families defined for this pack yet. Define new elements to expand card combinations!
          </div>
        ) : (
          <div style={{
            flexGrow: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {families.map(fam => {
              const isActive = editingFamily?.id === fam.id;
              return (
                <div
                  key={fam.id}
                  onClick={() => selectFamily(fam)}
                  style={{
                    padding: '0.75rem',
                    background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--bg-surface-elevated)',
                    border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: fam.primaryColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.2)',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {fam.icon ? (
                        <img src={fam.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        fam.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{fam.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(fam.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-danger)',
                      opacity: 0.7,
                      cursor: 'pointer',
                      padding: '0.2rem'
                    }}
                    title="Delete family"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right panel: editor and live card mockup */}
      {editingFamily ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '1.5rem',
          height: '100%'
        }}>
          {/* Form Settings */}
          <div className="glass-panel" style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Edit3 size={18} style={{ color: 'var(--color-primary)' }} /> Edit Element Family
            </h3>

            {/* Family Name */}
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>FAMILY NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shadow, Thunder, Cosmic"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Colors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>PRIMARY COLOR</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '36px', height: '36px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{
                      flexGrow: 1,
                      padding: '0.4rem 0.6rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>SECONDARY / ACCENT</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '36px', height: '36px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    style={{
                      flexGrow: 1,
                      padding: '0.4rem 0.6rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Emblem / Icon */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>FAMILY EMBLEM / TEXT ICON</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--bg-main)',
                  border: '2px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: 'white',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {icon ? (
                    <img src={icon} alt="Emblem Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    name ? name.charAt(0).toUpperCase() : '?'
                  )}
                </div>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <label style={{
                      flexGrow: 1,
                      padding: '0.4rem',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.2rem'
                    }}>
                      <ImagePlus size={14} /> Upload Image
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'icon')} style={{ display: 'none' }} />
                    </label>
                    <button
                      onClick={() => openPaintModal('icon')}
                      style={{
                        padding: '0.4rem 0.6rem',
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#c7d2fe',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      <Paintbrush size={14} /> Paint Icon
                    </button>
                  </div>
                  {icon && (
                    <button
                      onClick={() => setIcon('')}
                      style={{
                        padding: '0.25rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-danger)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      Remove emblem (falls back to letter icon)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Background Art Template */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>BACKGROUND TEMPLATE ART</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '89px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-main)',
                  border: '2px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {bgArt ? (
                    <img src={bgArt} alt="BG Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    'Standard'
                  )}
                </div>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <label style={{
                      flexGrow: 1,
                      padding: '0.4rem',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.2rem'
                    }}>
                      <ImagePlus size={14} /> Upload Image
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} style={{ display: 'none' }} />
                    </label>
                    <button
                      onClick={() => openPaintModal('bg')}
                      style={{
                        padding: '0.4rem 0.6rem',
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#c7d2fe',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      <Paintbrush size={14} /> Paint BG
                    </button>
                  </div>
                  {bgArt && (
                    <button
                      onClick={() => setBgArt('')}
                      style={{
                        padding: '0.25rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-danger)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      Remove background (falls back to default gradient)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Save Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: 'auto' }}>
              <button
                onClick={handleSave}
                style={{
                  flexGrow: 1,
                  padding: '0.75rem',
                  background: 'var(--color-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem'
                }}
              >
                <Check size={16} /> Save Family
              </button>
              <button
                onClick={() => selectFamily(null)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'white',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Right Live Preview Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Sparkles size={14} style={{ color: '#fbbf24' }} /> LIVE CARD TEMPLATE PREVIEW
            </div>

            <div style={{
              width: '320px',
              height: '446px',
              borderRadius: '16px',
              border: `4px solid ${primaryColor}`,
              background: bgArt ? `url(${bgArt})` : `linear-gradient(135deg, ${primaryColor} 0%, #030712 100%)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.25rem'
            }}>
              {/* Overlay styling for layout elements */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)',
                zIndex: 1,
                pointerEvents: 'none'
              }} />

              {/* Title & Emblem Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  fontFamily: 'Outfit, sans-serif'
                }}>
                  {name || 'Elemental Dragon'}
                </div>

                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: primaryColor,
                  border: '1.5px solid white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: 'white',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}>
                  {icon ? (
                    <img src={icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    name ? name.charAt(0).toUpperCase() : '?'
                  )}
                </div>
              </div>

              {/* Timing & Cost elements */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', zIndex: 2, marginTop: 'auto', marginBottom: '0.75rem' }}>
                <div style={{
                  background: 'rgba(0,0,0,0.7)',
                  borderLeft: `3px solid ${primaryColor}`,
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.75rem',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700
                  }}>★</div>
                  <span>Summoning cost: <strong style={{ color: primaryColor }}>10</strong></span>
                </div>

                <div style={{
                  background: 'rgba(0,0,0,0.7)',
                  borderLeft: `3px solid ${secondaryColor}`,
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  Active effect placeholder text explaining synergistic abilities.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          padding: '4rem',
          textAlign: 'center',
          gap: '0.5rem'
        }}>
          <Sparkles size={36} style={{ color: 'var(--color-primary)', opacity: 0.6 }} />
          <span>Select an element family from the left sidebar or create a new one to begin designing!</span>
        </div>
      )}

      {/* Paint Canvas Modal */}
      <DrawingModal
        isOpen={drawingConfig.isOpen}
        onClose={() => setDrawingConfig(prev => ({ ...prev, isOpen: false }))}
        onSave={handleSaveDrawing}
        title={drawingConfig.type === 'icon' ? 'Draw Family Emblem' : 'Draw Card Background Art'}
        width={drawingConfig.width}
        height={drawingConfig.height}
        initialDataUrl={drawingConfig.initialDataUrl}
      />
    </div>
  );
}
