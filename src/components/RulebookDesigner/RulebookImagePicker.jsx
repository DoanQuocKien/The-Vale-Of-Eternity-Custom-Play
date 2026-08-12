import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { dbGetCards, dbGetTokens, dbGetComponents } from '../../services/db.js';

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
  const [search, setSearch] = useState('');

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
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      callback(canvas.toDataURL('image/png'));
    };
    img.src = url;
  };

  const handlePick = (item, type) => {
    let source = { type, id: item.id, name: item.name };
    let dataUrl = null;

    if (type === 'card' && item.artImageData?.dataUrl) {
      dataUrl = item.artImageData.dataUrl;
      onPick({ source, dataUrl });
    } else if (type === 'token') {
      dataUrl = item.artImageData?.dataUrl || item.drawingDataUrl;
      if (dataUrl) onPick({ source, dataUrl });
    } else if (type === 'component') {
      // Components have layers, we can use the top visible image or drawing layer, or maybe we can't easily capture it. 
      // If we saved a flattened canvasData, we can use it.
      dataUrl = item.canvasData; 
      if (dataUrl) onPick({ source, dataUrl });
    } else if (type === 'basecard') {
      convertImageUrlToDataUrl(item.url, (dataUrl) => {
        onPick({ source, dataUrl });
      });
    }
  };

  const filteredItems = items[tab === 'basecard' ? 'base' : tab].filter(item => item.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{ width: '800px', maxWidth: '90vw', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'white' }}>Select Image</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '1rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['cards', 'tokens', 'components', 'basecard'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ padding: '0.5rem 1rem', background: tab === t ? 'rgba(99,102,241,0.2)' : 'transparent', border: tab === t ? '1px solid var(--color-primary)' : '1px solid transparent', color: tab === t ? 'var(--color-primary)' : 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer', textTransform: 'capitalize' }}
              >
                {t}
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {loading ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
              {filteredItems.map((item, idx) => {
                // Determine preview source
                let previewSrc = null;
                if (tab === 'cards') previewSrc = item.artImageData?.dataUrl;
                if (tab === 'tokens') previewSrc = item.artImageData?.dataUrl || item.drawingDataUrl;
                if (tab === 'components') previewSrc = item.canvasData;
                if (tab === 'basecard') previewSrc = item.url;

                return (
                  <div 
                    key={item.id || idx}
                    onClick={() => {
                      if (previewSrc) handlePick(item, tab.slice(0, -1)); // cards -> card
                    }}
                    style={{ 
                      background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', cursor: previewSrc ? 'pointer' : 'not-allowed',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: previewSrc ? 1 : 0.5
                    }}
                  >
                    <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--bg-main)' }}>
                      {previewSrc ? (
                        <img src={previewSrc} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Image</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'white', textAlign: 'center', wordBreak: 'break-word' }}>{item.name}</span>
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
