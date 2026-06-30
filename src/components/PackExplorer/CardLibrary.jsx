import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { getPriceColor } from '../../utils/constants.jsx';

const CardLibrary = ({ onEditCard }) => {
  const packs = useAppStore(state => state.packs);
  const explorerCards = useAppStore(state => state.explorerCards);
  const saveCard = useAppStore(state => state.saveCard);
  const deleteCard = useAppStore(state => state.deleteCard);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterFamily, setFilterFamily] = useState('All');
  const [filterCost, setFilterCost] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  const handleDuplicateCard = async (card) => {
    const newCard = {
      ...card,
      id: 'card-' + Date.now(),
      name: card.name + ' (Copy)',
      packId: card.packId || useAppStore.getState().activePackId,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filters and Search Toolbar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
        gap: '0.75rem',
        alignItems: 'center',
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
            <option value="cost-asc">Cost (Low to High)</option>
            <option value="cost-desc">Cost (High to Low)</option>
            <option value="newest">Newest Created</option>
          </select>
        </div>
      </div>

      {/* Cards Grid */}
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
            No cards found matching filters in this pack. Click "Create Card" or save a card to get started!
          </div>
        ) : (
          filtered.map(c => (
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
          ))
        )}
      </div>
    </div>
  );
};

export default CardLibrary;
