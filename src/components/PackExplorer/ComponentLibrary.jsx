import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';

const ComponentLibrary = ({ onEditComponent, onPrintSelected }) => {
  const components = useAppStore(state => state.components);
  const packs = useAppStore(state => state.packs);
  const activePackId = useAppStore(state => state.activePackId);

  const saveComponent = useAppStore(state => state.saveComponent);
  const deleteComponent = useAppStore(state => state.deleteComponent);
  const loadComponents = useAppStore(state => state.loadComponents);
  const copyComponentToPack = useAppStore(state => state.copyComponentToPack);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Copy-to picker state per component
  const [copyingCompId, setCopyingCompId] = useState(null);

  const otherPacks = packs.filter(p => p.id !== activePackId);

  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map(c => c.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleDuplicateComponent = async (comp) => {
    const newComp = {
      ...comp,
      id: 'component-' + Date.now(),
      name: comp.name + ' (Copy)',
      packId: activePackId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await saveComponent(newComp);
    await loadComponents(activePackId);
  };

  const handleCopyToPack = async (comp, targetPackId) => {
    if (!targetPackId || targetPackId === comp.packId) return;
    try {
      await copyComponentToPack(comp, targetPackId);
      setCopyingCompId(null);
    } catch (err) {
      alert('Failed to copy component: ' + err.message);
    }
  };

  const handleDeleteComponent = async (comp) => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      await deleteComponent(comp.id);
      await loadComponents(activePackId);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(comp.id); return n; });
    }
  };

  const handlePrintSelected = () => {
    if (!onPrintSelected || selectedIds.size === 0) return;
    const selectedComps = filtered.filter(c => selectedIds.has(c.id));
    onPrintSelected(selectedComps);
  };

  const filtered = components.filter(c => {
    return c.name.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
    return 0;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Search and Sort Toolbar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr auto',
        gap: '0.75rem',
        alignItems: 'end',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '1rem'
      }}>
        <div>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
            Search Components
          </label>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            <option value="name">Name (A-Z)</option>
            <option value="newest">Newest Created</option>
          </select>
        </div>

        {/* Select Mode Toggle */}
        <button
          onClick={toggleSelectMode}
          title={selectMode ? 'Exit select mode' : 'Enter select mode to choose components for printing'}
          style={{
            padding: '0.4rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            background: selectMode ? 'rgba(99,102,241,0.25)' : 'var(--bg-surface-elevated)',
            border: selectMode ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
            color: selectMode ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
        >
          {selectMode ? '✕ Cancel' : '☑ Select'}
        </button>
      </div>

      {/* Select-all helper row */}
      {selectMode && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <button onClick={selectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 600 }}>Select all</button>
          <span style={{ opacity: 0.4 }}>·</span>
          <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Clear</button>
          <span style={{ marginLeft: 'auto' }}>{selectedIds.size} of {filtered.length} selected</span>
        </div>
      )}

      {/* Components Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '1rem',
        maxHeight: '580px',
        overflowY: 'auto',
        paddingRight: '0.25rem',
        paddingBottom: selectedIds.size > 0 ? '4rem' : '0'
      }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 2rem' }}>
            No components found. Click "Create Component" to start designing one!
          </div>
        ) : (
          filtered.map(c => {
            const isSelected = selectedIds.has(c.id);
            return (
              <div
                key={c.id}
                className="glass-panel animate-fade-in"
                onClick={() => selectMode && toggleSelected(c.id)}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  outline: isSelected ? '2px solid var(--color-primary)' : selectMode ? '1px dashed rgba(99,102,241,0.35)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  minHeight: '230px',
                  cursor: selectMode ? 'pointer' : 'default',
                  background: isSelected ? 'rgba(99,102,241,0.08)' : undefined,
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Checkbox badge (select mode only) */}
                {selectMode && (
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--border-color)',
                    background: isSelected ? 'var(--color-primary)' : 'var(--bg-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: 'white',
                    transition: 'all 0.1s',
                    zIndex: 2
                  }}>
                    {isSelected && '✓'}
                  </div>
                )}

                {/* Thumbnail / Image preview */}
                <div style={{ width: '100%', height: '110px', borderRadius: 'var(--radius-sm)', background: '#070a13', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '0.6rem', position: 'relative' }}>
                  {c.canvasData ? (
                    <img src={c.canvasData} alt={c.name} style={{ maxWidth: '96%', maxHeight: '96%', objectFit: 'contain', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} />
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Empty Canvas</span>
                  )}
                  <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: '#ffffff', background: 'rgba(99, 102, 241, 0.85)', padding: '0.15rem 0.35rem', borderRadius: '3px' }}>
                    {c.type}
                  </span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.name}>
                    {c.name}
                  </h4>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                    Physical size: <strong>{c.widthMm} × {c.heightMm} mm</strong>
                  </span>
                </div>

                {/* Actions */}
                {!selectMode && (
                  <div style={{ display: 'flex', gap: '0.35rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={() => onEditComponent(c)} style={{ flexGrow: 1, padding: '0.25rem 0.4rem', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--color-primary)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#ffffff', textAlign: 'center' }}>
                      Edit
                    </button>

                    <button onClick={() => handleDuplicateComponent(c)} title="Clone to same pack"
                      style={{ padding: '0.25rem 0.35rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      Clone
                    </button>

                    {/* Copy to another pack */}
                    <div style={{ position: 'relative' }}>
                      {copyingCompId === c.id ? (
                        <select
                          autoFocus
                          defaultValue=""
                          onBlur={() => setCopyingCompId(null)}
                          onChange={(e) => { if (e.target.value) handleCopyToPack(c, e.target.value); }}
                          style={{ padding: '0.25rem 0.2rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--color-primary)', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', maxWidth: '70px', color: 'var(--text-primary)' }}
                        >
                          <option value="" disabled>Pick pack…</option>
                          {otherPacks.map(p => (
                            <option key={p.id} value={p.id}>{p.name.substring(0, 12)}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => otherPacks.length > 0 && setCopyingCompId(c.id)}
                          disabled={otherPacks.length === 0}
                          title={otherPacks.length === 0 ? 'No other packs' : 'Copy to another pack'}
                          style={{ padding: '0.25rem 0.35rem', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--color-success)', borderRadius: '4px', fontSize: '0.75rem', cursor: otherPacks.length > 0 ? 'pointer' : 'not-allowed', color: 'var(--color-success)', opacity: otherPacks.length > 0 ? 1 : 0.4 }}
                        >
                          📋→
                        </button>
                      )}
                    </div>

                    <button onClick={() => handleDeleteComponent(c)} title="Delete Component"
                      style={{ padding: '0.25rem 0.35rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-danger)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--color-danger)', cursor: 'pointer' }}>
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky selection toolbar */}
      {selectMode && selectedIds.size > 0 && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.65rem 1rem',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 -4px 20px rgba(99,102,241,0.2)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem' }}>☐ Clear</button>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>
              {selectedIds.size} component{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            onClick={handlePrintSelected}
            style={{ padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            🖨 Print Selected ({selectedIds.size})
          </button>
        </div>
      )}
    </div>
  );
};

export default ComponentLibrary;
