import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import RulebookPage from './RulebookPage.jsx';
import { Plus, Trash2, Printer, Edit2, Check } from 'lucide-react';

export default function RulebookDesigner() {
  const activePackId = useAppStore(state => state.activePackId);
  const rulebooks = useAppStore(state => state.rulebooks);
  const saveRulebook = useAppStore(state => state.saveRulebook);
  const deleteRulebook = useAppStore(state => state.deleteRulebook);

  const packRulebooks = rulebooks.filter(r => r.packId === activePackId);

  const [selectedRulebookId, setSelectedRulebookId] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // Auto-select rulebook when active pack changes or list updates
  useEffect(() => {
    if (packRulebooks.length > 0) {
      if (!selectedRulebookId || !packRulebooks.some(r => r.id === selectedRulebookId)) {
        setSelectedRulebookId(packRulebooks[0].id);
      }
    } else {
      setSelectedRulebookId(null);
    }
  }, [activePackId, packRulebooks, selectedRulebookId]);

  const activeRulebook = packRulebooks.find(r => r.id === selectedRulebookId) || packRulebooks[0];

  useEffect(() => {
    if (activeRulebook) {
      setTitleInput(activeRulebook.title || 'Rulebook 1');
    }
  }, [activeRulebook?.id]);

  const handleCreateRulebook = async () => {
    if (!activePackId) return;
    const count = packRulebooks.length + 1;
    const newRulebook = {
      packId: activePackId,
      title: `Rulebook ${count}`,
      pageSize: 'a4',
      customWidthMm: 210,
      customHeightMm: 297,
      orientation: 'portrait',
      marginMm: 15,
      background: {
        type: 'solid',
        color: '#f5f0e8',
        gradientFrom: '#f5f0e8',
        gradientTo: '#e8dfc8',
        gradientAngle: 135,
        imageDataUrl: null
      },
      pages: [
        {
          id: 'page-' + Date.now(),
          blocks: []
        }
      ]
    };
    const saved = await saveRulebook(newRulebook);
    setSelectedRulebookId(saved.id);
  };

  const updateRulebook = async (updates) => {
    if (!activeRulebook) return;
    await saveRulebook({ ...activeRulebook, ...updates });
  };

  const handleDeleteRulebook = async () => {
    if (!activeRulebook) return;
    if (window.confirm(`Are you sure you want to delete "${activeRulebook.title || 'this rulebook'}"?`)) {
      await deleteRulebook(activeRulebook.id);
      setSelectedRulebookId(null);
    }
  };

  const handleSaveTitle = async () => {
    if (titleInput.trim()) {
      await updateRulebook({ title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  if (!activePackId) {
    return <div style={{ padding: '2rem', color: 'white', textAlign: 'center' }}>Please select or create a pack first.</div>;
  }

  if (!activeRulebook) {
    return (
      <div style={{ padding: '4rem 2rem', color: 'white', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>No Rulebook Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Each pack can have one or more customized rulebooks.</p>
        <button
          onClick={handleCreateRulebook}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 700, borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Create New Rulebook
        </button>
      </div>
    );
  }

  const handleAddPage = () => {
    const newPages = [...activeRulebook.pages, { id: 'page-' + Date.now(), blocks: [] }];
    updateRulebook({ pages: newPages });
  };

  const handleDeletePage = (pageId) => {
    if (activeRulebook.pages.length <= 1) return;
    if (window.confirm('Delete this page?')) {
      updateRulebook({ pages: activeRulebook.pages.filter(p => p.id !== pageId) });
    }
  };

  const updatePage = (pageId, updates) => {
    const newPages = activeRulebook.pages.map(p => p.id === pageId ? { ...p, ...updates } : p);
    updateRulebook({ pages: newPages });
  };

  // Derived dimensions for UI display
  let wMm = 210, hMm = 297;
  if (activeRulebook.pageSize === 'a4') {
    wMm = 210; hMm = 297;
  } else if (activeRulebook.pageSize === 'letter') {
    wMm = 215.9; hMm = 279.4;
  } else if (activeRulebook.pageSize === 'custom') {
    wMm = activeRulebook.customWidthMm || 210; hMm = activeRulebook.customHeightMm || 297;
  }
  if (activeRulebook.orientation === 'landscape') {
    const temp = wMm; wMm = hMm; hMm = temp;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', height: 'calc(100vh - 140px)' }}>
      {/* Sidebar: Settings */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
        
        {/* Rulebook Switcher Header */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 700 }}>Rulebooks ({packRulebooks.length})</span>
            <button
              onClick={handleCreateRulebook}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
            >
              <Plus size={12} /> New Rulebook
            </button>
          </div>

          {/* Selector */}
          <select
            value={activeRulebook.id}
            onChange={(e) => setSelectedRulebookId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontWeight: 600 }}
          >
            {packRulebooks.map((rb, idx) => (
              <option key={rb.id} value={rb.id}>
                {rb.title || `Rulebook ${idx + 1}`} ({rb.pages?.length || 1} pgs)
              </option>
            ))}
          </select>

          {/* Title Editor */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isEditingTitle ? (
              <>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  style={{ flex: 1, padding: '0.4rem', background: 'var(--bg-main)', border: '1px solid var(--color-primary)', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                  autoFocus
                />
                <button onClick={handleSaveTitle} style={{ padding: '0.4rem', background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}><Check size={14} /></button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontWeight: 700, color: 'white', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeRulebook.title || 'Rulebook 1'}
                </span>
                <button onClick={() => setIsEditingTitle(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Edit2 size={14} /></button>
                <button onClick={handleDeleteRulebook} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </>
            )}
          </div>
        </div>

        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'white', fontWeight: 800 }}>Document Settings</h3>
        
        {/* Page Size & Orientation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Page Size</label>
          <select 
            value={activeRulebook.pageSize} 
            onChange={e => updateRulebook({ pageSize: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
          >
            <option value="a4">A4 (210 × 297 mm)</option>
            <option value="letter">Letter (8.5 × 11 in)</option>
            <option value="custom">Custom Size</option>
          </select>

          {activeRulebook.pageSize === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="number" value={activeRulebook.customWidthMm} onChange={e => updateRulebook({ customWidthMm: Number(e.target.value) })} placeholder="W (mm)" style={{ width: '50%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
              <input type="number" value={activeRulebook.customHeightMm} onChange={e => updateRulebook({ customHeightMm: Number(e.target.value) })} placeholder="H (mm)" style={{ width: '50%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button 
              onClick={() => updateRulebook({ orientation: 'portrait' })}
              style={{ flex: 1, padding: '0.4rem', background: activeRulebook.orientation === 'portrait' ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface-elevated)', border: activeRulebook.orientation === 'portrait' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', color: activeRulebook.orientation === 'portrait' ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}
            >
              Portrait
            </button>
            <button 
              onClick={() => updateRulebook({ orientation: 'landscape' })}
              style={{ flex: 1, padding: '0.4rem', background: activeRulebook.orientation === 'landscape' ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface-elevated)', border: activeRulebook.orientation === 'landscape' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', color: activeRulebook.orientation === 'landscape' ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}
            >
              Landscape
            </button>
          </div>
        </div>

        {/* Margin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <label>Margin</label>
            <span>{activeRulebook.marginMm} mm</span>
          </div>
          <input 
            type="range" 
            min="0" max="50" 
            value={activeRulebook.marginMm}
            onChange={e => updateRulebook({ marginMm: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        {/* Background Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Background Type</label>
          <select 
            value={activeRulebook.background.type} 
            onChange={e => updateRulebook({ background: { ...activeRulebook.background, type: e.target.value } })}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
          >
            <option value="solid">Solid Color</option>
            <option value="gradient">Gradient</option>
            <option value="image">Image (Upload)</option>
          </select>

          {activeRulebook.background.type === 'solid' && (
            <input 
              type="color" 
              value={activeRulebook.background.color}
              onChange={e => updateRulebook({ background: { ...activeRulebook.background, color: e.target.value } })}
              style={{ width: '100%', height: '40px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            />
          )}

          {activeRulebook.background.type === 'gradient' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="color" value={activeRulebook.background.gradientFrom} onChange={e => updateRulebook({ background: { ...activeRulebook.background, gradientFrom: e.target.value } })} style={{ flex: 1, height: '30px' }} />
                <input type="color" value={activeRulebook.background.gradientTo} onChange={e => updateRulebook({ background: { ...activeRulebook.background, gradientTo: e.target.value } })} style={{ flex: 1, height: '30px' }} />
              </div>
              <input type="range" min="0" max="360" value={activeRulebook.background.gradientAngle} onChange={e => updateRulebook({ background: { ...activeRulebook.background, gradientAngle: Number(e.target.value) } })} style={{ width: '100%' }} />
            </div>
          )}

          {activeRulebook.background.type === 'image' && (
            <div style={{ marginTop: '0.5rem' }}>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => updateRulebook({ background: { ...activeRulebook.background, imageDataUrl: evt.target.result } });
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ width: '100%', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
              />
              {activeRulebook.background.imageDataUrl && (
                <button onClick={() => updateRulebook({ background: { ...activeRulebook.background, imageDataUrl: null } })} style={{ marginTop: '0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }}>Clear Image</button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Main Canvas Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>
              {activeRulebook.title || 'Rulebook'} ({activeRulebook.pages.length} Pages)
            </span>
            <button
              onClick={handleAddPage}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <Plus size={14} /> Add Page
            </button>
          </div>
          <button
            onClick={() => {
              import('../../utils/rulebookPdfUtils.js').then(m => m.exportRulebookToPdf(activeRulebook));
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
          >
            <Printer size={16} /> Export to PDF
          </button>
        </div>

        {/* Scrolling Pages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
          {activeRulebook.pages.map((page, index) => (
            <div key={page.id} style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Page {index + 1}</span>
                {activeRulebook.pages.length > 1 && (
                  <button onClick={() => handleDeletePage(page.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
                    <Trash2 size={12} /> Delete Page
                  </button>
                )}
              </div>
              <RulebookPage 
                page={page} 
                rulebook={activeRulebook} 
                widthMm={wMm} 
                heightMm={hMm} 
                onChange={(updates) => updatePage(page.id, updates)} 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
