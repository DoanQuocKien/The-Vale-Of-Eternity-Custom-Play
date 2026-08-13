import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAppStore } from '../../store/useAppStore.js';
import { dbGetCards, dbGetTokens, dbGetComponents } from '../../services/db.js';
import CardPreview from '../CardEditor/CardPreview.jsx';
import { DEFAULT_LAYOUT } from '../../utils/constants.jsx';

const BASE_CARD_FILES = [
  "Aeris.png", "Agni.webp", "Asmodeus.png", "Balog.webp", "Basilisk.webp", "Behemoth.webp", 
  "Boreas.webp", "Boulder.webp", "Burningskull.png", "Cerberus.webp", "Charybdis.webp", 
  "Dandelionspirit.webp", "Dragonegg.webp", "Ember.webp", "Eternity.webp", "Firefox.webp", 
  "Forestspirit.webp", "Freyja.webp", "Gargoyle.webp", "Genie.webp", "Genieexalted.webp", 
  "Gi-rin.webp", "Goblin.webp", "Goblinsoldier.webp", "Griffon.webp", "Gust.webp", "Hae-tae.webp", 
  "Harpy.webp", "Hestia.png", "Hippogriff.webp", "Hornedsalamander.webp", "Hydra.webp", "Ifrit.png", 
  "Imp.webp", "Incubus.png", "Kappa.webp", "Lavagiant.webp", "Leviathan.webp", "Marina.webp", 
  "Medusa.webp", "Mimic.webp", "Mudslime.webp", "Nessie.png", "Odin.webp", "Pegasus.webp", 
  "Phoenix.png", "Poseidon.webp", "Rockgolem.webp", "Rudra.webp", "Salamander.webp", "Sandgiant.webp", 
  "Scorch.webp", "Seaspirit.webp", "Snailmaiden.webp", "Stonegolem.webp", "Succubus.webp", "Surtr.png", 
  "Sylph.webp", "Tengu.webp", "Tidal.webp", "Triton.webp", "Troll.webp", "Undine.webp", "Undinequeen.webp", 
  "Valkyrie.webp", "Watergiant.webp", "Willow.webp", "Youngforestspirit.webp", "Yukionna.webp", "Yukionnaexalted.webp"
];

export default function RulebookImagePicker({ onCancel, onPick }) {
  const activePackId = useAppStore(state => state.activePackId);
  const [tab, setTab] = useState('cards'); // cards, tokens, components, base
  const [items, setItems] = useState({ cards: [], tokens: [], components: [], base: [] });
  const [loading, setLoading] = useState(true);
  const [capturingCardId, setCapturingCardId] = useState(null);
  const [search, setSearch] = useState('');

  const offscreenCardRefs = useRef({});

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      if (activePackId) {
        const cards = await dbGetCards(activePackId);
        const tokens = await dbGetTokens(activePackId);
        const components = await dbGetComponents(activePackId);
        
        // Base cards
        const baseCards = BASE_CARD_FILES.map(filename => {
          const name = filename.split('.')[0];
          return {
            id: `base-${name}`,
            name: name,
            url: `./img/BaseGameCard/${filename}`
          };
        });

        setItems({
          cards: cards || [],
          tokens: tokens || [],
          components: components || [],
          base: baseCards
        });
      }
      setLoading(false);
    }
    loadAll();
  }, [activePackId]);

  const convertImageUrlToDataUrl = (url, callback) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      callback(canvas.toDataURL('image/png'));
    };
    img.onerror = () => callback(null);
    img.src = url;
  };

  const handlePickCard = async (card) => {
    setCapturingCardId(card.id);
    const cardEl = offscreenCardRefs.current[card.id];
    let dataUrl = null;

    if (cardEl) {
      try {
        const canvas = await html2canvas(cardEl, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false
        });
        dataUrl = canvas.toDataURL('image/png');
      } catch (err) {
        console.error("Failed to capture card canvas:", err);
      }
    }

    // Fallback to art image if DOM capture fails
    if (!dataUrl) {
      dataUrl = card.artImageData?.dataUrl;
    }

    setCapturingCardId(null);
    if (dataUrl) {
      onPick({
        source: { type: 'card', id: card.id, name: card.name },
        dataUrl
      });
    }
  };

  const handlePickOther = (item, type) => {
    let source = { type, id: item.id, name: item.name };

    if (type === 'token') {
      const dataUrl = item.croppedDataUrl || item.artImageData?.dataUrl || item.drawingDataUrl;
      if (dataUrl) onPick({ source, dataUrl });
    } else if (type === 'component') {
      const dataUrl = item.canvasData;
      if (dataUrl) onPick({ source, dataUrl });
    } else if (type === 'basecard') {
      convertImageUrlToDataUrl(item.url, (dataUrl) => {
        if (dataUrl) onPick({ source, dataUrl });
      });
    }
  };

  const activeTabKey = tab === 'basecard' ? 'base' : tab;
  const filteredItems = items[activeTabKey].filter(item => item.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Hidden Offscreen Container for Clean Full Card Captures (Unscaled 744x1039) */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none', zIndex: -100 }}>
        {items.cards.map((card) => (
          <div key={`offscreen-${card.id}`} style={{ width: '744px', height: '1039px' }}>
            <CardPreview 
              ref={el => offscreenCardRefs.current[card.id] = el}
              card={card} 
              defaultLayout={DEFAULT_LAYOUT} 
            />
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ width: '850px', maxWidth: '92vw', height: '82vh', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'white' }}>Select Image for Rulebook</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Tab switcher & Search bar */}
        <div style={{ padding: '1rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { id: 'cards', label: 'Pack Cards' },
              { id: 'tokens', label: 'Tokens' },
              { id: 'components', label: 'Components' },
              { id: 'basecard', label: 'Base Game Cards' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ padding: '0.5rem 1rem', background: tab === t.id ? 'rgba(99,102,241,0.2)' : 'transparent', border: tab === t.id ? '1px solid var(--color-primary)' : '1px solid transparent', color: tab === t.id ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 32px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
            />
          </div>
        </div>

        {/* Content Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {loading ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>Loading items...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: tab === 'cards' ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
              
              {/* Custom Pack Cards with Full Rendered Card Preview */}
              {tab === 'cards' && filteredItems.map((card) => {
                const isCapturing = capturingCardId === card.id;

                return (
                  <div
                    key={card.id}
                    onClick={() => !isCapturing && handlePickCard(card)}
                    style={{
                      background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', padding: '0.5rem', cursor: isCapturing ? 'wait' : 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                      position: 'relative', overflow: 'hidden', transition: 'transform 0.15s, border-color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    {/* Visual Card Preview Tile */}
                    <div style={{ width: '130px', height: '181px', position: 'relative', overflow: 'hidden', borderRadius: '6px', background: '#000' }}>
                      <div style={{
                        width: '744px',
                        height: '1039px',
                        transform: 'scale(0.1747)',
                        transformOrigin: 'top left',
                        pointerEvents: 'none'
                      }}>
                        <CardPreview 
                          card={card} 
                          defaultLayout={DEFAULT_LAYOUT} 
                        />
                      </div>
                    </div>

                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                      {card.name}
                    </span>

                    {isCapturing && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                        <Loader size={24} className="animate-spin" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Tokens, Components, and Base Game Cards */}
              {tab !== 'cards' && filteredItems.map((item, idx) => {
                let previewSrc = null;
                if (tab === 'tokens') previewSrc = item.croppedDataUrl || item.artImageData?.dataUrl || item.drawingDataUrl;
                if (tab === 'components') previewSrc = item.canvasData;
                if (tab === 'basecard') previewSrc = item.url;

                return (
                  <div 
                    key={item.id || idx}
                    onClick={() => {
                      if (previewSrc) handlePickOther(item, tab === 'basecard' ? 'basecard' : tab.slice(0, -1));
                    }}
                    style={{ 
                      background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', cursor: previewSrc ? 'pointer' : 'not-allowed',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: previewSrc ? 1 : 0.5,
                      transition: 'transform 0.15s, border-color 0.15s'
                    }}
                    onMouseEnter={e => previewSrc && (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onMouseLeave={e => previewSrc && (e.currentTarget.style.borderColor = 'var(--border-color)')}
                  >
                    <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--bg-main)', borderRadius: '4px' }}>
                      {previewSrc ? (
                        <img src={previewSrc} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Image</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'white', textAlign: 'center', wordBreak: 'break-word', fontWeight: 600 }}>{item.name}</span>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div style={{ gridColumn: '1 / -1', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No items found.</div>
              )}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
