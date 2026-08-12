import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import RulebookPage from './RulebookPage.jsx';
import { Plus, Trash2, Printer } from 'lucide-react';

export default function RulebookDesigner() {
  const activePackId = useAppStore(state => state.activePackId);
  const rulebooks = useAppStore(state => state.rulebooks);
  const saveRulebook = useAppStore(state => state.saveRulebook);

  // For this feature, we assume one rulebook per pack
  const rulebook = rulebooks.find(r => r.packId === activePackId);

  const handleCreateRulebook = async () => {
    if (!activePackId) return;
    const newRulebook = {
      packId: activePackId,
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
    await saveRulebook(newRulebook);
  };

  const updateRulebook = async (updates) => {
    if (!rulebook) return;
    await saveRulebook({ ...rulebook, ...updates });
  };

  if (!activePackId) {
    return <div style={{ padding: '2rem', color: 'white', textAlign: 'center' }}>Please select or create a pack first.</div>;
  }

  if (!rulebook) {
    return (
      <div style={{ padding: '4rem 2rem', color: 'white', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>No Rulebook Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Every pack can have its own customized rulebook.</p>
        <button
          onClick={handleCreateRulebook}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 700, borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Create Rulebook
        </button>
      </div>
    );
  }

  const handleAddPage = () => {
    const newPages = [...rulebook.pages, { id: 'page-' + Date.now(), blocks: [] }];
    updateRulebook({ pages: newPages });
  };

  const handleDeletePage = (pageId) => {
    if (rulebook.pages.length <= 1) return;
    if (window.confirm('Delete this page?')) {
      updateRulebook({ pages: rulebook.pages.filter(p => p.id !== pageId) });
    }
  };

  const updatePage = (pageId, updates) => {
    const newPages = rulebook.pages.map(p => p.id === pageId ? { ...p, ...updates } : p);
    updateRulebook({ pages: newPages });
  };

  // Derived dimensions for UI display
  let wMm = 210, hMm = 297;
  if (rulebook.pageSize === 'a4') {
    wMm = 210; hMm = 297;
  } else if (rulebook.pageSize === 'letter') {
    wMm = 215.9; hMm = 279.4;
  } else if (rulebook.pageSize === 'custom') {
    wMm = rulebook.customWidthMm; hMm = rulebook.customHeightMm;
  }
  if (rulebook.orientation === 'landscape') {
    const temp = wMm; wMm = hMm; hMm = temp;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', height: 'calc(100vh - 140px)' }}>
      {/* Sidebar: Settings */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: 800 }}>Document Settings</h3>
        
        {/* Page Size & Orientation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Page Size</label>
          <select 
            value={rulebook.pageSize} 
            onChange={e => updateRulebook({ pageSize: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
          >
            <option value="a4">A4 (210 × 297 mm)</option>
            <option value="letter">Letter (8.5 × 11 in)</option>
            <option value="custom">Custom Size</option>
          </select>

          {rulebook.pageSize === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="number" value={rulebook.customWidthMm} onChange={e => updateRulebook({ customWidthMm: Number(e.target.value) })} placeholder="W (mm)" style={{ width: '50%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
              <input type="number" value={rulebook.customHeightMm} onChange={e => updateRulebook({ customHeightMm: Number(e.target.value) })} placeholder="H (mm)" style={{ width: '50%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button 
              onClick={() => updateRulebook({ orientation: 'portrait' })}
              style={{ flex: 1, padding: '0.4rem', background: rulebook.orientation === 'portrait' ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface-elevated)', border: rulebook.orientation === 'portrait' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', color: rulebook.orientation === 'portrait' ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}
            >
              Portrait
            </button>
            <button 
              onClick={() => updateRulebook({ orientation: 'landscape' })}
              style={{ flex: 1, padding: '0.4rem', background: rulebook.orientation === 'landscape' ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface-elevated)', border: rulebook.orientation === 'landscape' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', color: rulebook.orientation === 'landscape' ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}
            >
              Landscape
            </button>
          </div>
        </div>

        {/* Margin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <label>Margin</label>
            <span>{rulebook.marginMm} mm</span>
          </div>
          <input 
            type="range" 
            min="0" max="50" 
            value={rulebook.marginMm}
            onChange={e => updateRulebook({ marginMm: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        {/* Background Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Background Type</label>
          <select 
            value={rulebook.background.type} 
            onChange={e => updateRulebook({ background: { ...rulebook.background, type: e.target.value } })}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
          >
            <option value="solid">Solid Color</option>
            <option value="gradient">Gradient</option>
            <option value="image">Image (Upload)</option>
          </select>

          {rulebook.background.type === 'solid' && (
            <input 
              type="color" 
              value={rulebook.background.color}
              onChange={e => updateRulebook({ background: { ...rulebook.background, color: e.target.value } })}
              style={{ width: '100%', height: '40px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            />
          )}

          {rulebook.background.type === 'gradient' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="color" value={rulebook.background.gradientFrom} onChange={e => updateRulebook({ background: { ...rulebook.background, gradientFrom: e.target.value } })} style={{ flex: 1, height: '30px' }} />
                <input type="color" value={rulebook.background.gradientTo} onChange={e => updateRulebook({ background: { ...rulebook.background, gradientTo: e.target.value } })} style={{ flex: 1, height: '30px' }} />
              </div>
              <input type="range" min="0" max="360" value={rulebook.background.gradientAngle} onChange={e => updateRulebook({ background: { ...rulebook.background, gradientAngle: Number(e.target.value) } })} style={{ width: '100%' }} />
            </div>
          )}

          {rulebook.background.type === 'image' && (
            <div style={{ marginTop: '0.5rem' }}>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => updateRulebook({ background: { ...rulebook.background, imageDataUrl: evt.target.result } });
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ width: '100%', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
              />
              {rulebook.background.imageDataUrl && (
                <button onClick={() => updateRulebook({ background: { ...rulebook.background, imageDataUrl: null } })} style={{ marginTop: '0.5rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }}>Clear Image</button>
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
            <span style={{ fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>Rulebook Pages ({rulebook.pages.length})</span>
            <button
              onClick={handleAddPage}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <Plus size={14} /> Add Page
            </button>
          </div>
          <button
            onClick={() => {
              import('../../utils/rulebookPdfUtils.js').then(m => m.exportRulebookToPdf(rulebook));
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
          >
            <Printer size={16} /> Export to PDF
          </button>
        </div>

        {/* Scrolling Pages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
          {rulebook.pages.map((page, index) => (
            <div key={page.id} style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Page {index + 1}</span>
                {rulebook.pages.length > 1 && (
                  <button onClick={() => handleDeletePage(page.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
                    <Trash2 size={12} /> Delete Page
                  </button>
                )}
              </div>
              <RulebookPage 
                page={page} 
                rulebook={rulebook} 
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
