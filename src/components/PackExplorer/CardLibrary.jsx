import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { getPriceColor } from '../../utils/constants.jsx';

const CardLibrary = ({ onEditCard, onPrintSelected }) => {
  const packs = useAppStore(state => state.packs);
  const explorerCards = useAppStore(state => state.explorerCards);
  const activePackId = useAppStore(state => state.activePackId);
  const saveCard = useAppStore(state => state.saveCard);
  const deleteCard = useAppStore(state => state.deleteCard);
  const copyCardToPack = useAppStore(state => state.copyCardToPack);
  const families = useAppStore(state => state.families);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterFamily, setFilterFamily] = useState('All');
  const [filterCost, setFilterCost] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  // Select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Copy-to picker state per card
  const [copyingCardId, setCopyingCardId] = useState(null);

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

  const handleDuplicateCard = async (card) => {
    const newCard = {
      ...card,
      id: 'card-' + Date.now(),
      name: card.name + ' (Copy)',
      packId: card.packId || activePackId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await saveCard(newCard);
  };

  const handleMoveCard = async (card, targetPackId) => {
    const updatedCard = { ...card, packId: targetPackId, updatedAt: Date.now() };
    await saveCard(updatedCard);
  };

  const handleCopyToPack = async (card, targetPackId) => {
    if (!targetPackId || targetPackId === card.packId) return;
    try {
      await copyCardToPack(card, targetPackId);
      setCopyingCardId(null);
    } catch (err) {
      alert('Failed to copy card: ' + err.message);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      await deleteCard(cardId);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(cardId); return n; });
    }
  };

  const handlePrintSelected = () => {
    if (!onPrintSelected || selectedIds.size === 0) return;
    const selectedCards = filtered.filter(c => selectedIds.has(c.id));
    onPrintSelected(selectedCards);
  };

  const filtered = explorerCards.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.effect.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFamily = filterFamily === 'All' || c.family === filterFamily ||
      families.some(f => (f.id === filterFamily || f.name === filterFamily) && (c.family === f.id || c.family === f.name));
    const matchesCost = filterCost === 'All' || c.cost === filterCost;
    return matchesSearch && matchesFamily && matchesCost;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'cost-asc') return parseInt(a.cost) - parseInt(b.cost);
    if (sortBy === 'cost-desc') return parseInt(b.cost) - parseInt(a.cost);
    if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
    return 0;
  });

  const otherPacks = packs.filter(p => p.id !== activePackId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filters and Search Toolbar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
        gap: '0.75rem',
        alignItems: 'end',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '1rem'
      }}>
        <div>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
            Search Cards
          </label>
          <input
            type="text"
            placeholder="Search by name, effect..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Filter Family</label>
          <select value={filterFamily} onChange={(e) => setFilterFamily(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            <option value="All">All Families</option>
            {['Fire', 'Water', 'Earth', 'Wind', 'Dragon'].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
            {families.map(fam => (
              <option key={fam.id} value={fam.id}>{fam.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Filter Cost</label>
          <select value={filterCost} onChange={(e) => setFilterCost(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            <option value="All">All Costs</option>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => (
              <option key={c} value={c.toString()}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            <option value="name">Name (A-Z)</option>
            <option value="cost-asc">Cost (Low to High)</option>
            <option value="cost-desc">Cost (High to Low)</option>
            <option value="newest">Newest Created</option>
          </select>
        </div>

        {/* Select Mode Toggle */}
        <button
          onClick={toggleSelectMode}
          title={selectMode ? 'Exit select mode' : 'Enter select mode to choose cards for printing'}
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

      {/* Select-all / deselect-all helper row */}
      {selectMode && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <button onClick={selectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 600 }}>Select all</button>
          <span style={{ opacity: 0.4 }}>·</span>
          <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Clear</button>
          <span style={{ marginLeft: 'auto' }}>{selectedIds.size} of {filtered.length} selected</span>
        </div>
      )}

      {/* Cards Grid */}
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
            No cards found matching filters in this pack. Click "Create Card" or save a card to get started!
          </div>
        ) : (
          filtered.map(c => {
            const isSelected = selectedIds.has(c.id);
            const customFamily = families.find(fam => fam.id === c.family || fam.name === c.family);
            const familyName = customFamily ? customFamily.name : c.family;
            const familyColor = customFamily ? customFamily.primaryColor : `var(--family-${c.family.toLowerCase()})`;
            const familyBg = customFamily
              ? customFamily.primaryColor + '26'
              : `rgba(${c.family === 'Fire' ? '239, 68, 68' : c.family === 'Water' ? '56, 189, 248' : c.family === 'Earth' ? '74, 222, 128' : c.family === 'Wind' ? '236, 72, 153' : '192, 132, 252'}, 0.15)`;

            return (
              <div
                key={c.id}
                className="glass-panel animate-fade-in"
                onClick={() => selectMode && toggleSelected(c.id)}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: `4px solid ${isSelected ? 'var(--color-primary)' : familyColor}`,
                  outline: isSelected ? '2px solid var(--color-primary)' : selectMode ? '1px dashed rgba(99,102,241,0.35)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  minHeight: '180px',
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
                    color: familyColor,
                    background: familyBg,
                    padding: '0.15rem 0.35rem',
                    borderRadius: '4px'
                  }}>
                    {familyName}
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
                {!selectMode && (
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
                      style={{ flexGrow: 1, padding: '0.25rem 0.4rem', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--color-primary)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#ffffff', textAlign: 'center' }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDuplicateCard(c)}
                      title="Clone to same pack"
                      style={{ padding: '0.25rem 0.35rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      Clone
                    </button>

                    {/* Copy to another pack */}
                    <div style={{ position: 'relative' }}>
                      {copyingCardId === c.id ? (
                        <select
                          autoFocus
                          defaultValue=""
                          onBlur={() => setCopyingCardId(null)}
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
                          onClick={() => otherPacks.length > 0 && setCopyingCardId(c.id)}
                          disabled={otherPacks.length === 0}
                          title={otherPacks.length === 0 ? 'No other packs' : 'Copy to another pack'}
                          style={{ padding: '0.25rem 0.35rem', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--color-success)', borderRadius: '4px', fontSize: '0.75rem', cursor: otherPacks.length > 0 ? 'pointer' : 'not-allowed', color: 'var(--color-success)', opacity: otherPacks.length > 0 ? 1 : 0.4 }}
                        >
                          📋→
                        </button>
                      )}
                    </div>

                    {/* Move to pack */}
                    <select
                      value={c.packId}
                      onChange={(e) => handleMoveCard(c, e.target.value)}
                      title="Move card to pack"
                      style={{ padding: '0.25rem 0.15rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', cursor: 'pointer', maxWidth: '55px', color: 'var(--text-secondary)' }}
                    >
                      {packs.map(p => (
                        <option key={p.id} value={p.id}>{p.name.substring(0, 10)}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleDeleteCard(c.id)}
                      title="Delete Card"
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
          left: 0,
          right: 0,
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
              {selectedIds.size} card{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            onClick={handlePrintSelected}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
              border: 'none',
              color: 'white',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            🖨 Print Selected ({selectedIds.size})
          </button>
        </div>
      )}
    </div>
  );
};

export default CardLibrary;
