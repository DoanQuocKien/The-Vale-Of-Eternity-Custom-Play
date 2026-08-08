import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';

const TokenLibrary = ({ onEditToken, onPrintSelected }) => {
  const tokens = useAppStore(state => state.tokens);
  const packs = useAppStore(state => state.packs);
  const activePackId = useAppStore(state => state.activePackId);
  const saveToken = useAppStore(state => state.saveToken);
  const deleteToken = useAppStore(state => state.deleteToken);
  const copyTokenToPack = useAppStore(state => state.copyTokenToPack);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Copy-to picker state per token
  const [copyingTokenId, setCopyingTokenId] = useState(null);

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

  const selectAll = () => setSelectedIds(new Set(filtered.map(t => t.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleDuplicateToken = async (token) => {
    const newToken = {
      ...token,
      id: 'token-' + Date.now(),
      name: token.name + ' (Copy)',
      packId: activePackId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await saveToken(newToken);
  };

  const handleCopyToPack = async (token, targetPackId) => {
    if (!targetPackId || targetPackId === token.packId) return;
    try {
      await copyTokenToPack(token, targetPackId);
      setCopyingTokenId(null);
    } catch (err) {
      alert('Failed to copy token: ' + err.message);
    }
  };

  const handlePrintSelected = () => {
    if (!onPrintSelected || selectedIds.size === 0) return;
    const selectedTokens = filtered.filter(t => selectedIds.has(t.id));
    onPrintSelected(selectedTokens);
  };

  const filtered = tokens.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
    return a.name.localeCompare(b.name);
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
            Search Tokens
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
          title={selectMode ? 'Exit select mode' : 'Enter select mode to choose tokens for printing'}
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

      {/* Tokens Grid */}
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
            No tokens found matching search in this pack. Design a new token in the Token Designer!
          </div>
        ) : (
          filtered.map(t => {
            const isSelected = selectedIds.has(t.id);
            return (
              <div
                key={t.id}
                className="glass-panel animate-fade-in"
                onClick={() => selectMode && toggleSelected(t.id)}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: `4px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-primary)'}`,
                  outline: isSelected ? '2px solid var(--color-primary)' : selectMode ? '1px dashed rgba(99,102,241,0.35)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  minHeight: '260px',
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

                {/* Miniature Token CSS Preview */}
                <div style={{ position: 'relative', width: '120px', height: '167px', background: '#0b0f19', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', margin: '0 auto 0.75rem auto', boxShadow: '0 4px 10px rgba(0,0,0,0.4)', boxSizing: 'border-box' }}>
                  {t.artImageData?.dataUrl && (
                    <img src={t.artImageData.dataUrl} alt="Token Art" style={{ position: 'absolute', left: '50%', top: '50%', width: `${t.scale * 100}%`, transform: `translate(-50%, -50%) translate(${(t.transformX || 0) / 1728 * 120}px, ${(t.transformY || 0) / 2414 * 167}px) rotate(${t.rotation || 0}deg)`, filter: `brightness(${t.brightness || 100}%) contrast(${t.contrast || 100}%) saturate(${t.saturation || 100}%)`, pointerEvents: 'none', zIndex: 1 }} />
                  )}
                  {t.drawingDataUrl && (
                    <img src={t.drawingDataUrl} alt="Token Drawing" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }} />
                  )}
                </div>

                {/* Name */}
                <h4 style={{ fontFamily: 'var(--font-card-name)', fontSize: '0.95rem', fontWeight: 'normal', color: '#ffffff', marginBottom: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.name}
                </h4>

                {/* Action buttons */}
                {!selectMode && (
                  <div style={{ display: 'flex', gap: '0.35rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={() => onEditToken(t)} style={{ flexGrow: 1, padding: '0.25rem 0.4rem', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--color-primary)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#ffffff', textAlign: 'center' }}>
                      Edit
                    </button>

                    <button onClick={() => handleDuplicateToken(t)} title="Clone to same pack"
                      style={{ padding: '0.25rem 0.35rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      Clone
                    </button>

                    {/* Copy to another pack */}
                    <div style={{ position: 'relative' }}>
                      {copyingTokenId === t.id ? (
                        <select
                          autoFocus
                          defaultValue=""
                          onBlur={() => setCopyingTokenId(null)}
                          onChange={(e) => { if (e.target.value) handleCopyToPack(t, e.target.value); }}
                          style={{ padding: '0.25rem 0.2rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--color-primary)', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', maxWidth: '70px', color: 'var(--text-primary)' }}
                        >
                          <option value="" disabled>Pick pack…</option>
                          {otherPacks.map(p => (
                            <option key={p.id} value={p.id}>{p.name.substring(0, 12)}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => otherPacks.length > 0 && setCopyingTokenId(t.id)}
                          disabled={otherPacks.length === 0}
                          title={otherPacks.length === 0 ? 'No other packs' : 'Copy to another pack'}
                          style={{ padding: '0.25rem 0.35rem', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--color-success)', borderRadius: '4px', fontSize: '0.75rem', cursor: otherPacks.length > 0 ? 'pointer' : 'not-allowed', color: 'var(--color-success)', opacity: otherPacks.length > 0 ? 1 : 0.4 }}
                        >
                          📋→
                        </button>
                      )}
                    </div>

                    <button
                      onClick={async () => { if (window.confirm('Are you sure you want to delete this token?')) { await deleteToken(t.id); setSelectedIds(prev => { const n = new Set(prev); n.delete(t.id); return n; }); } }}
                      title="Delete Token"
                      style={{ padding: '0.25rem 0.35rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-danger)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--color-danger)', cursor: 'pointer' }}
                    >
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
              {selectedIds.size} token{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            onClick={handlePrintSelected}
            style={{ padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            🖨 Print Selected ({selectedIds.size})
          </button>
        </div>
      )}
    </div>
  );
};

export default TokenLibrary;
