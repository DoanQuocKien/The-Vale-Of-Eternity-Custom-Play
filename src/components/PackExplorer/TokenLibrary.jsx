import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';

const TokenLibrary = ({ onEditToken }) => {
  const tokens = useAppStore(state => state.tokens);
  const activePackId = useAppStore(state => state.activePackId);
  const saveToken = useAppStore(state => state.saveToken);
  const deleteToken = useAppStore(state => state.deleteToken);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

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
        gridTemplateColumns: '1.5fr 1fr',
        gap: '0.75rem',
        alignItems: 'center',
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
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem'
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem'
            }}
          >
            <option value="name">Name (A-Z)</option>
            <option value="newest">Newest Created</option>
          </select>
        </div>
      </div>

      {/* Tokens Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '1rem',
        maxHeight: '650px',
        overflowY: 'auto',
        paddingRight: '0.25rem'
      }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 2rem' }}>
            No tokens found matching search in this pack. Design a new token in the Token Designer!
          </div>
        ) : (
          filtered.map(t => (
            <div
              key={t.id}
              className="glass-panel animate-fade-in"
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--color-primary)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                minHeight: '260px',
                transition: 'transform var(--transition-fast)'
              }}
            >
              {/* Miniature Token CSS Preview */}
              <div style={{
                position: 'relative',
                width: '120px',
                height: '167px',
                background: '#0b0f19',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                margin: '0 auto 0.75rem auto',
                boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                boxSizing: 'border-box'
              }}>
                {/* Art Layer */}
                {t.artImageData?.dataUrl && (
                  <img
                    src={t.artImageData.dataUrl}
                    alt="Token Art"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: `${t.scale * 100}%`,
                      transform: `translate(-50%, -50%) translate(${(t.transformX || 0) / 1728 * 120}px, ${(t.transformY || 0) / 2414 * 167}px) rotate(${t.rotation || 0}deg)`,
                      filter: `brightness(${t.brightness || 100}%) contrast(${t.contrast || 100}%) saturate(${t.saturation || 100}%)`,
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  />
                )}
                {/* Drawing Layer */}
                {t.drawingDataUrl && (
                  <img
                    src={t.drawingDataUrl}
                    alt="Token Drawing"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: 2
                    }}
                  />
                )}
              </div>

              {/* Name */}
              <h4 style={{
                fontFamily: 'var(--font-card-name)',
                fontSize: '0.95rem',
                fontWeight: 'normal',
                color: '#ffffff',
                marginBottom: '0.75rem',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {t.name}
              </h4>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                gap: '0.35rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.5rem',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={() => onEditToken(t)}
                  style={{
                    flexGrow: 1,
                    padding: '0.25rem 0.4rem',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#ffffff',
                    textAlign: 'center'
                  }}
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDuplicateToken(t)}
                  style={{
                    padding: '0.25rem 0.35rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                  title="Clone Token"
                >
                  Clone
                </button>

                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this token?')) {
                      await deleteToken(t.id);
                    }
                  }}
                  style={{
                    padding: '0.25rem 0.35rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--color-danger)',
                    cursor: 'pointer'
                  }}
                  title="Delete Token"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TokenLibrary;
