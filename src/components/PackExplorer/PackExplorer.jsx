import React, { useState, useEffect } from 'react';
import { Plus, Download, Printer, Upload } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { getPriceColor } from '../../utils/constants.jsx';

const PackExplorer = ({ onEditCard, onEditToken, onExportPack, onExportLibrary, onImportFile, onOpenPdfExport }) => {
  const packs = useAppStore(state => state.packs);
  const activePackId = useAppStore(state => state.activePackId);
  const explorerCards = useAppStore(state => state.explorerCards);
  const tokens = useAppStore(state => state.tokens);
  const setActivePackId = useAppStore(state => state.setActivePackId);
  const createNewPack = useAppStore(state => state.createNewPack);
  const deletePack = useAppStore(state => state.deletePack);
  const saveCard = useAppStore(state => state.saveCard);
  const deleteCard = useAppStore(state => state.deleteCard);
  const saveToken = useAppStore(state => state.saveToken);
  const deleteToken = useAppStore(state => state.deleteToken);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterFamily, setFilterFamily] = useState('All');
  const [filterCost, setFilterCost] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [subTab, setSubTab] = useState('cards'); // 'cards' | 'tokens'

  const handleDuplicateToken = async (token) => {
    const newToken = {
      ...token,
      id: 'token-' + Date.now(),
      name: token.name + ' (Copy)',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await saveToken(newToken);
  };

  const handleDuplicateCard = async (card) => {
    const newCard = {
      ...card,
      id: 'card-' + Date.now(),
      name: card.name + ' (Copy)',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await saveCard(newCard);
  };

  const handleMoveCard = async (card, targetPackId) => {
    const updatedCard = {
      ...card,
      packId: targetPackId,
      updatedAt: Date.now()
    };
    await saveCard(updatedCard);
  };

  const handleDeleteCard = async (cardId) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      await deleteCard(cardId);
    }
  };

  const handleAddPack = async () => {
    const name = window.prompt('Enter name for the new pack:');
    if (name && name.trim()) {
      await createNewPack(name.trim());
    }
  };

  const handleDeletePack = async (pack) => {
    if (window.confirm(`Are you sure you want to delete pack "${pack.name}" and all cards in it?`)) {
      await deletePack(pack.id);
    }
  };

  const handleRenamePack = async (pack) => {
    const newName = window.prompt('Enter new name for this pack:', pack.name);
    if (newName && newName.trim()) {
      // Direct call to db or store action. Since rename isn't in store yet, 
      // we can dispatch a generic action or update the store to handle it.
      // Wait, we need to update the store with a renamePack action. Let's do it via savePack.
      const { dbSavePack } = await import('../../services/db.js');
      await dbSavePack({ ...pack, name: newName.trim() });
      useAppStore.getState().loadPacks();
    }
  };

  return (
    <div className="animate-fade-in" style={{
      display: 'grid',
      gridTemplateColumns: '0.3fr 0.7fr',
      gap: '2rem',
      marginTop: '1rem',
      alignItems: 'start'
    }}>
      {/* Left Panel: Pack List */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>Packs & Expansions</h3>
          <button
            onClick={handleAddPack}
            style={{
              padding: '0.3rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary)',
              border: 'none',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            <Plus size={12} /> Add Pack
          </button>
        </div>

        {/* Pack List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
          {packs.map(p => (
            <div
              key={p.id}
              onClick={() => setActivePackId(p.id)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: activePackId === p.id ? 'var(--bg-surface-elevated)' : 'transparent',
                border: activePackId === p.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: activePackId === p.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {p.id === 'starter-pack' ? 'Built-in set' : 'Custom set'}
                </span>
              </div>

              {p.id !== 'starter-pack' && (
                <div style={{ display: 'flex', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleRenamePack(p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                    title="Rename Pack"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeletePack(p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                    title="Delete Pack"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pack Set Operations Footer */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.50rem' }}>
          <button
            onClick={() => {
              const activePack = packs.find(p => p.id === activePackId);
              if (activePack) onExportPack(activePack);
            }}
            disabled={!activePackId}
            style={{
              width: '100%',
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              opacity: activePackId ? 1 : 0.5
            }}
          >
            <Download size={14} /> Export Active Pack JSON
          </button>

          <button
            onClick={() => {
              const activePack = packs.find(p => p.id === activePackId);
              const activePackName = activePack ? activePack.name : 'Pack';
              onOpenPdfExport(explorerCards, activePackName);
            }}
            disabled={!activePackId || explorerCards.length === 0}
            style={{
              width: '100%',
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
              border: 'none',
              cursor: (activePackId && explorerCards.length > 0) ? 'pointer' : 'not-allowed',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              opacity: (activePackId && explorerCards.length > 0) ? 1 : 0.5,
              boxShadow: (activePackId && explorerCards.length > 0) ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Printer size={13} /> Export Pack to PDF
          </button>
          
          <button
            onClick={onExportLibrary}
            style={{
              width: '100%',
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Download size={14} /> Export Full Library JSON
          </button>

          <input
            type="file"
            id="import-file-input-explorer"
            accept=".json"
            onChange={onImportFile}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => document.getElementById('import-file-input-explorer').click()}
            style={{
              width: '100%',
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px dashed var(--color-success)',
              color: 'var(--color-success)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Upload size={14} /> Import Pack/Library JSON
          </button>
        </div>
      </div>

      {/* Right Panel: Card & Token Grid Explorer */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '600px' }}>
        
        {/* Sub-tab switcher */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
          {[
            { id: 'cards', label: `Cards (${explorerCards.length})` },
            { id: 'tokens', label: `Tokens (${tokens.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setSubTab(tab.id);
                // Reset sortBy if switching to tokens and sorting by cost
                if (tab.id === 'tokens' && (sortBy === 'cost-asc' || sortBy === 'cost-desc')) {
                  setSortBy('name');
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: subTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: subTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                paddingBottom: '0.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: subTab === 'cards' ? '1.5fr 1fr 1fr 1fr' : '1.5fr 1fr',
          gap: '0.75rem',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem'
        }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
              {subTab === 'cards' ? 'Search Cards' : 'Search Tokens'}
            </label>
            <input
              type="text"
              placeholder={subTab === 'cards' ? "Search by name, effect..." : "Search by name..."}
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

          {subTab === 'cards' && (
            <>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Filter Family</label>
                <select
                  value={filterFamily}
                  onChange={(e) => setFilterFamily(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="All">All Families</option>
                  {['Fire', 'Water', 'Earth', 'Wind', 'Dragon'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Filter Cost</label>
                <select
                  value={filterCost}
                  onChange={(e) => setFilterCost(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="All">All Costs</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => (
                    <option key={c} value={c.toString()}>{c}</option>
                  ))}
                </select>
              </div>
            </>
          )}

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
              {subTab === 'cards' && <option value="cost-asc">Cost (Low to High)</option>}
              {subTab === 'cards' && <option value="cost-desc">Cost (High to Low)</option>}
              <option value="newest">Newest Created</option>
            </select>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: '1rem',
          maxHeight: '650px',
          overflowY: 'auto',
          paddingRight: '0.25rem'
        }}>
          {subTab === 'cards' ? (
            (() => {
              const filtered = explorerCards.filter(c => {
                const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    c.effect.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesFamily = filterFamily === 'All' || c.family === filterFamily;
                const matchesCost = filterCost === 'All' || c.cost === filterCost;
                return matchesSearch && matchesFamily && matchesCost;
              }).sort((a, b) => {
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                if (sortBy === 'cost-asc') return parseInt(a.cost) - parseInt(b.cost);
                if (sortBy === 'cost-desc') return parseInt(b.cost) - parseInt(a.cost);
                if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
                return 0;
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 2rem' }}>
                    No cards found matching filters in this pack. Click "Edit in Designer" or save a card to get started!
                  </div>
                );
              }

              return filtered.map(c => (
                <div 
                  key={c.id} 
                  className="glass-panel animate-fade-in" 
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `4px solid var(--family-${c.family.toLowerCase()})`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    minHeight: '180px',
                    transition: 'transform var(--transition-fast), border-color var(--transition-fast)'
                  }}
                >
                  {/* Badge header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-price)',
                      fontSize: '1.2rem',
                      color: getPriceColor('priceTL', c.family, c.layout),
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      lineHeight: 1
                    }}>
                      {c.cost}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: `var(--family-${c.family.toLowerCase()})`,
                      background: `rgba(${c.family === 'Fire' ? '239, 68, 68' : c.family === 'Water' ? '56, 189, 248' : c.family === 'Earth' ? '74, 222, 128' : c.family === 'Wind' ? '45, 212, 191' : '192, 132, 252'}, 0.15)`,
                      padding: '0.15rem 0.35rem',
                      borderRadius: '4px'
                    }}>
                      {c.family}
                    </span>
                  </div>

                  {/* Name */}
                  <h4 style={{
                    fontFamily: 'var(--font-card-name)',
                    fontSize: '0.95rem',
                    fontWeight: 'normal',
                    color: '#ffffff',
                    marginBottom: '0.3rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {c.name}
                  </h4>

                  {/* Effect snippet */}
                  <p style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.3',
                    flexGrow: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    marginBottom: '0.75rem'
                  }}>
                    {c.effect.replace(/\\icon\([^)]+\)/g, '🗲').replace(/\\italic\(([^)]+)\)/g, '$1')}
                  </p>

                  {/* Action buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '0.3rem',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '0.5rem',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <button
                      onClick={() => onEditCard(c)}
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
                      onClick={() => handleDuplicateCard(c)}
                      style={{
                        padding: '0.25rem 0.35rem',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                      }}
                      title="Clone Card"
                    >
                      Clone
                    </button>

                    <select
                      value={c.packId}
                      onChange={(e) => handleMoveCard(c, e.target.value)}
                      style={{
                        padding: '0.25rem 0.15rem',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        maxWidth: '55px',
                        color: 'var(--text-secondary)'
                      }}
                      title="Move Card to Pack"
                    >
                      {packs.map(p => (
                        <option key={p.id} value={p.id}>{p.name.substring(0, 10)}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleDeleteCard(c.id)}
                      style={{
                        padding: '0.25rem 0.35rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid var(--color-danger)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--color-danger)',
                        cursor: 'pointer'
                      }}
                      title="Delete Card"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ));
            })()
          ) : (
            (() => {
              const filtered = tokens.filter(t => 
                t.name.toLowerCase().includes(searchTerm.toLowerCase())
              ).sort((a, b) => {
                if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
                return a.name.localeCompare(b.name);
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 2rem' }}>
                    No tokens found matching search in this pack. Design a new token in the Token Designer!
                  </div>
                );
              }

              return filtered.map(t => (
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
              ));
            })()
          )}
        </div>
      </div>
    </div>
  );
};

export default PackExplorer;
