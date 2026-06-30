import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';

const ComponentLibrary = ({ onEditComponent }) => {
  const components = useAppStore(state => state.components);
  const activePackId = useAppStore(state => state.activePackId);

  const saveComponent = useAppStore(state => state.saveComponent);
  const deleteComponent = useAppStore(state => state.deleteComponent);
  const loadComponents = useAppStore(state => state.loadComponents);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

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

  const handleDeleteComponent = async (comp) => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      await deleteComponent(comp.id);
      await loadComponents(activePackId);
    }
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
        gridTemplateColumns: '1.5fr 1fr',
        gap: '0.75rem',
        alignItems: 'center',
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

      {/* Components Grid */}
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
            No components found. Click "Create Component" to start designing one!
          </div>
        ) : (
          filtered.map(c => (
            <div
              key={c.id}
              className="glass-panel animate-fade-in"
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                minHeight: '230px',
                transition: 'transform var(--transition-fast)'
              }}
            >
              {/* Thumbnail / Image preview */}
              <div style={{
                width: '100%',
                height: '110px',
                borderRadius: 'var(--radius-sm)',
                background: '#070a13',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: '0.6rem',
                position: 'relative'
              }}>
                {c.canvasData ? (
                  <img
                    src={c.canvasData}
                    alt={c.name}
                    style={{
                      maxWidth: '96%',
                      maxHeight: '96%',
                      objectFit: 'contain',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Empty Canvas</span>
                )}

                {/* Component type badge */}
                <span style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#ffffff',
                  background: 'rgba(99, 102, 241, 0.85)',
                  padding: '0.15rem 0.35rem',
                  borderRadius: '3px'
                }}>
                  {c.type}
                </span>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 style={{
                  margin: '0 0 0.15rem 0',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }} title={c.name}>
                  {c.name}
                </h4>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                  Physical size: <strong>{c.widthMm} × {c.heightMm} mm</strong>
                </span>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '0.35rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.5rem',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={() => onEditComponent(c)}
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
                  onClick={() => handleDuplicateComponent(c)}
                  style={{
                    padding: '0.25rem 0.35rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                  title="Clone Component"
                >
                  Clone
                </button>

                <button
                  onClick={() => handleDeleteComponent(c)}
                  style={{
                    padding: '0.25rem 0.35rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--color-danger)',
                    cursor: 'pointer'
                  }}
                  title="Delete Component"
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

export default ComponentLibrary;
