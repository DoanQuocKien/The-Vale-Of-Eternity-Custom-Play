import React, { useState, useEffect, useCallback } from 'react';
import { dbGetPacks, dbGetTokens, dbGetCards } from '../../services/db.js';
import { useAppStore } from '../../store/useAppStore.js';

// Built-in game icons from public/img
const BUILTIN_ICONS = [
  // TextIcon (family/resource icons)
  { id: 'icon-score',  label: 'Score',   src: './img/TextIcon/Score.png',   group: 'Resources' },
  { id: 'icon-stone1', label: 'Stone×1', src: './img/TextIcon/Stone1.png',  group: 'Resources' },
  { id: 'icon-stone3', label: 'Stone×3', src: './img/TextIcon/Stone3.png',  group: 'Resources' },
  { id: 'icon-stone6', label: 'Stone×6', src: './img/TextIcon/Stone6.png',  group: 'Resources' },
  // Families
  { id: 'icon-fire',   label: 'Fire',    src: './img/TextIcon/Fire.png',    group: 'Families' },
  { id: 'icon-water',  label: 'Water',   src: './img/TextIcon/Water.png',   group: 'Families' },
  { id: 'icon-earth',  label: 'Earth',   src: './img/TextIcon/Earth.png',   group: 'Families' },
  { id: 'icon-wind',   label: 'Wind',    src: './img/TextIcon/Wind.png',    group: 'Families' },
  { id: 'icon-dragon', label: 'Dragon',  src: './img/TextIcon/Dragon.png',  group: 'Families' },
  // Effect types
  { id: 'icon-eff-instant',  label: 'Instant Effect',    src: './img/Effect/InstantEffect.png',    group: 'Effects' },
  { id: 'icon-eff-perm',     label: 'Permanent Effect',  src: './img/Effect/PermanentEffect.png',  group: 'Effects' },
  { id: 'icon-eff-res',      label: 'Resolution Effect', src: './img/Effect/ResolutionEffect.png', group: 'Effects' },
  // Backgrounds
  { id: 'bg-fire',   label: 'Fire BG',   src: './img/Background/FireBackground.png',   group: 'Backgrounds' },
  { id: 'bg-water',  label: 'Water BG',  src: './img/Background/WaterBackground.png',  group: 'Backgrounds' },
  { id: 'bg-earth',  label: 'Earth BG',  src: './img/Background/EarthBackground.png',  group: 'Backgrounds' },
  { id: 'bg-wind',   label: 'Air BG',    src: './img/Background/AirBackground.png',    group: 'Backgrounds' },
  { id: 'bg-dragon', label: 'Dragon BG', src: './img/Background/DragonBackground.png', group: 'Backgrounds' },
  // Card layouts
  { id: 'layout-card',     label: 'Card Layout',     src: './img/Layout/CardLayout.png', group: 'Layouts' },
  { id: 'layout-backside', label: 'Card Backside',   src: './img/Layout/Backside.png',   group: 'Layouts' },
];

const LibraryDrawer = ({ onCancel, onPickItem, onRenderCard }) => {
  const [libraryTab, setLibraryTab] = useState('icons'); // 'icons' | 'tokens' | 'cards'
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryItems, setLibraryItems] = useState({ icons: BUILTIN_ICONS, tokens: [], cards: [] });

  useEffect(() => {
    const loadItems = async () => {
      setLibraryLoading(true);
      try {
        const allPacks = await dbGetPacks();
        const allTokens = [];
        const allCards = [];

        await Promise.all(allPacks.map(async (pack) => {
          try {
            const tokens = await dbGetTokens(pack.id);
            tokens.forEach(t => allTokens.push({ ...t, _packName: pack.name }));
          } catch (_) {}
          try {
            const cards = await dbGetCards(pack.id);
            cards.forEach(c => allCards.push({ ...c, _packName: pack.name }));
          } catch (_) {}
        }));

        setLibraryItems({
          icons: BUILTIN_ICONS,
          tokens: allTokens,
          cards: allCards
        });
      } catch (err) {
        console.error('[LibraryDrawer] Failed to load library items:', err);
      } finally {
        setLibraryLoading(false);
      }
    };
    loadItems();
  }, []);

  const loadIconAsDataUrl = useCallback((src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <h5 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--color-warning)' }}>
          📚 From Library
        </h5>
        <button
          onClick={onCancel}
          className="btn"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}
        >
          Cancel
        </button>
      </div>

      {libraryLoading ? (
        <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          Loading library items...
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255,255,255,0.03)', padding: '0.2rem', borderRadius: 'var(--radius-sm)' }}>
            {[
              { id: 'icons', label: 'Built-in' },
              { id: 'tokens', label: 'Tokens' },
              { id: 'cards', label: 'Cards' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setLibraryTab(t.id)}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.2rem',
                  border: 'none',
                  background: libraryTab === t.id ? 'var(--color-primary)' : 'transparent',
                  color: libraryTab === t.id ? 'white' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }} className="comp-scroll">
            {libraryTab === 'icons' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {['Resources', 'Families', 'Effects', 'Backgrounds', 'Layouts'].map(group => {
                  const items = libraryItems.icons.filter(i => i.group === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={group}>
                      <h6 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.4rem 0' }}>
                        {group}
                      </h6>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                        {items.map(item => (
                          <button
                            key={item.id}
                            onClick={async () => {
                              try {
                                const dataUrl = await loadIconAsDataUrl(item.src);
                                onPickItem(dataUrl);
                              } catch (err) {
                                alert('Error loading asset: ' + err.message);
                              }
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.25rem',
                              background: 'rgba(0,0,0,0.15)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.4rem 0.2rem',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                          >
                            <img
                              src={item.src}
                              alt={item.label}
                              style={{
                                width: '32px',
                                height: '32px',
                                objectFit: 'contain',
                                background: item.group === 'Layouts' ? 'rgba(255,255,255,0.05)' : 'transparent',
                                borderRadius: '2px'
                              }}
                            />
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {libraryTab === 'tokens' && (
              libraryItems.tokens.length === 0 ? (
                <div style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  No tokens in packs.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  {libraryItems.tokens.map(token => (
                    <button
                      key={token.id}
                      onClick={() => onPickItem(token.croppedDataUrl || token.imageDataUrl)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.4rem 0.2rem',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      title={`${token.name} (${token._packName})`}
                    >
                      <img
                        src={token.croppedDataUrl || token.imageDataUrl}
                        alt={token.name}
                        style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                      />
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                        {token.name}
                      </span>
                    </button>
                  ))}
                </div>
              )
            )}

            {libraryTab === 'cards' && (
              libraryItems.cards.length === 0 ? (
                <div style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  No cards in packs.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {libraryItems.cards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => onRenderCard(card)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.45rem 0.6rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <strong style={{ fontSize: '0.72rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {card.name}
                        </strong>
                        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                          {(() => {
                            const families = useAppStore.getState().families || [];
                            const customFamily = families.find(f => f.id === card.family || f.name === card.family);
                            return customFamily ? customFamily.name : card.family;
                          })()} • {card._packName}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                        Import &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LibraryDrawer;
export { BUILTIN_ICONS };
