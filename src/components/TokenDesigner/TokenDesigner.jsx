import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { Trash2, Plus, FileText } from 'lucide-react';

export default function TokenDesigner() {
  const packs = useAppStore(state => state.packs);
  const activePackId = useAppStore(state => state.activePackId);
  const tokens = useAppStore(state => state.tokens);
  const activeToken = useAppStore(state => state.activeToken);
  const setActiveToken = useAppStore(state => state.setActiveToken);
  const saveToken = useAppStore(state => state.saveToken);
  const deleteToken = useAppStore(state => state.deleteToken);
  const exportToken = useAppStore(state => state.exportToken);
  const loadTokens = useAppStore(state => state.loadTokens);

  const [tokenName, setTokenName] = useState('');
  const [exportTargetPackId, setExportTargetPackId] = useState('');

  // Sync token name with active token
  useEffect(() => {
    if (activeToken) {
      setTokenName(activeToken.name || '');
    } else {
      setTokenName('');
    }
  }, [activeToken]);

  // Load tokens on pack select
  useEffect(() => {
    if (activePackId) {
      loadTokens(activePackId);
    }
  }, [activePackId, loadTokens]);

  const handleCreateToken = async () => {
    const newToken = {
      name: `Token ${tokens.length + 1}`,
      packId: activePackId,
      artImageData: null,
    };
    const saved = await saveToken(newToken);
    setActiveToken(saved);
  };

  const handleSaveName = async () => {
    if (!activeToken) return;
    const updated = {
      ...activeToken,
      name: tokenName.trim() || 'Unnamed Token'
    };
    await saveToken(updated);
  };

  const handleDelete = async (tokenId) => {
    if (window.confirm('Are you sure you want to delete this token?')) {
      await deleteToken(tokenId);
    }
  };

  const handleExport = async () => {
    if (!activeToken || !exportTargetPackId) return;
    try {
      await exportToken(activeToken.id, exportTargetPackId);
      alert('Token exported successfully!');
      setExportTargetPackId('');
    } catch (err) {
      alert('Error exporting token: ' + err.message);
    }
  };

  const otherPacks = packs.filter(p => p.id !== activePackId);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '2rem',
      marginTop: '1rem',
      alignItems: 'start',
      minHeight: '70vh'
    }}>
      {/* Sidebar: Token selection & operations */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            🎴 Tokens List
          </h3>
          <button
            onClick={handleCreateToken}
            style={{
              padding: '0.35rem 0.6rem',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Plus size={12} /> Add
          </button>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '400px',
          overflowY: 'auto',
          paddingRight: '0.25rem'
        }}>
          {tokens.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              No custom tokens yet. Click "Add" to start.
            </div>
          ) : (
            tokens.map(t => (
              <div
                key={t.id}
                onClick={() => setActiveToken(t)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: activeToken?.id === t.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: activeToken?.id === t.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: activeToken?.id === t.id ? 700 : 500,
                  color: activeToken?.id === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '180px'
                }}>
                  {t.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {activeToken && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
              Token Settings
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Token Name</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  style={{
                    flexGrow: 1,
                    padding: '0.4rem 0.75rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                  placeholder="e.g. Poison Counter"
                />
                <button
                  onClick={handleSaveName}
                  style={{
                    padding: '0.4rem 0.8rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            {otherPacks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Export to Pack</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={exportTargetPackId}
                    onChange={(e) => setExportTargetPackId(e.target.value)}
                    style={{
                      flexGrow: 1,
                      padding: '0.4rem 0.5rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select target pack...</option>
                    {otherPacks.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleExport}
                    disabled={!exportTargetPackId}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: exportTargetPackId ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                      border: exportTargetPackId ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: exportTargetPackId ? 'pointer' : 'default',
                      color: exportTargetPackId ? '#818cf8' : 'var(--text-muted)'
                    }}
                  >
                    Export
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Workspace Area placeholder */}
      <div className="glass-panel" style={{ padding: '2rem', minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 20, 0.5)' }}>
        {activeToken ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Designing: {activeToken.name}</h3>
            <p style={{ fontSize: '0.9rem' }}>Workspace layout and tools will be implemented in Part 3.</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.1)' }} />
            <h3>No Token Selected</h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0.5rem auto 0 auto' }}>
              Select an existing token from the list, or click "Add" to create a new custom token layout.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
