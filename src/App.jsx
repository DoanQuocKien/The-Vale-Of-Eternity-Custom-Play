import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  FolderOpen, 
  Plus, 
  Settings, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Download, 
  Upload, 
  HelpCircle,
  RefreshCw,
  ImagePlus
} from 'lucide-react';
import ArtImporter from './ArtImporter.jsx';

// Default layout configuration in percentage coordinates relative to the card container
const DEFAULT_LAYOUT = {
  priceTL: {
    left: 8.5,
    top: 19,
    fontSize: 15.1,
    color: "default",
    colors: {
      Fire: "default",
      Water: "default",
      Earth: "default",
      Wind: "default",
      Dragon: "default"
    },
    families: {
      Fire: { left: 8.5, top: 19, fontSize: 15.1 },
      Water: { left: 8.5, top: 19, fontSize: 15.1 },
      Earth: { left: 8.5, top: 19, fontSize: 15.1 },
      Wind: { left: 8.5, top: 19, fontSize: 15.1 },
      Dragon: { left: 8.5, top: 19, fontSize: 15.1 }
    }
  },
  priceBR: {
    left: 77.5,
    top: 94,
    fontSize: 10.9,
    color: "default",
    colors: {
      Fire: "default",
      Water: "default",
      Earth: "default",
      Wind: "default",
      Dragon: "default"
    },
    families: {
      Fire: { left: 77.5, top: 94, fontSize: 10.9 },
      Water: { left: 77.5, top: 94, fontSize: 10.9 },
      Earth: { left: 77.5, top: 94, fontSize: 10.9 },
      Wind: { left: 77.5, top: 94, fontSize: 10.9 },
      Dragon: { left: 77.5, top: 94, fontSize: 10.9 }
    }
  },
  name: {
    left: 10,
    top: 66,
    width: 80,
    fontSize: 5.2,
    color: "#ffffff"
  },
  effect: {
    left: 4.5,
    top: 71,
    width: 91.0,
    fontSize: 3.7,
    bgOpacity: 0.85,
    bgColor: "#fee8d6",
    padding: 5,
    borderRadius: 3.6,
    color: "#060913",
    panelHeight: 8.5,
    panelGap: 1.5,
    textLeft: 10.0,
    textTop: 1.5,
    textWidth: 80,
    textHeight: 70
  },
  effectIcon: {
    left: -2.5,
    top: 1.0,
    size: 6.0,
    gap: 1.5
  },
  credit: {
    left: 10,
    top: 92,
    width: 80,
    fontSize: 2.2,
    color: "#9ca3af",
    families: {
      Fire: { left: 10, top: 92, fontSize: 2.2, width: 80 },
      Water: { left: 10, top: 92, fontSize: 2.2, width: 80 },
      Earth: { left: 10, top: 92, fontSize: 2.2, width: 80 },
      Wind: { left: 10, top: 92, fontSize: 2.2, width: 80 },
      Dragon: { left: 10, top: 92, fontSize: 2.2, width: 80 }
    }
  }
};

// Helper to resolve layout properties (with family-specific overrides)
const getResolvedElementLayout = (elementKey, family, layoutState) => {
  const elementLayout = layoutState?.[elementKey];
  if (!elementLayout) return {};
  
  const familySpecificKeys = ['priceTL', 'priceBR', 'credit'];
  if (familySpecificKeys.includes(elementKey)) {
    const familyLayout = elementLayout.families?.[family];
    if (familyLayout) {
      return {
        ...elementLayout,
        left: familyLayout.left ?? elementLayout.left,
        top: familyLayout.top ?? elementLayout.top,
        fontSize: familyLayout.fontSize ?? elementLayout.fontSize,
        width: familyLayout.width ?? elementLayout.width
      };
    }
  }
  
  return elementLayout;
};

// Helper to resolve dynamic default color for price fields based on card family
const getPriceColor = (elementKey, family, layoutState) => {
  const elementLayout = layoutState?.[elementKey];
  if (!elementLayout) return '#ffffff';
  
  const defaultColors = {
    Fire: '#ff5a36',   // Bright orange-red
    Water: '#38bdf8',  // Bright sky blue
    Earth: '#4ade80',  // Bright green
    Wind: '#2dd4bf',   // Bright teal
    Dragon: '#c084fc'  // Bright purple
  };

  // Support family-specific colors object
  if (elementLayout.colors && elementLayout.colors[family]) {
    const colorVal = elementLayout.colors[family];
    if (colorVal !== 'default') {
      return colorVal;
    }
  }
  
  // Fallback to legacy single color property if it's not 'default'
  if (elementLayout.color && elementLayout.color !== 'default') {
    return elementLayout.color;
  }
  
  return defaultColors[family] || '#ffffff';
};


// Preset card contents for verification and calibration testing
const MOCK_PRESETS = [
  {
    id: 'kappa',
    name: 'Kappa',
    cost: '3',
    family: 'Water',
    credit: 'Art by Eric Hong',
    effect: '♾️ Whenever you summon a card using \\icon(Stone3), earn \\icon(Score, 2). \n\\italic(A quiet dweller of rivers and streams.)'
  },
  {
    id: 'odin',
    name: 'Odin',
    cost: '6',
    family: 'Dragon',
    credit: 'Concept art by Midjourney v6.0',
    effect: '⏳ If you have less than 6 cards in your hand, earn 2 \\icon(Stone1).\n⏳ Otherwise, earn \\icon(Stone6).'
  },
  {
    id: 'medusa',
    name: 'Medusa',
    cost: '4',
    family: 'Earth',
    credit: 'Designed by Eric Hong',
    effect: '⏳ Discard a card from your hand, then earn \\icon(Stone6).\n\\italic(Her gaze petrifies even the mightiest gods.)'
  },
  {
    id: 'imp',
    name: 'Imp',
    cost: '1',
    family: 'Fire',
    credit: 'Art by Doan Quoc Kien',
    effect: '⚡ Earn 2 \\icon(Stone1).\n⏳ Recover.'
  },
  {
    id: 'zephyr',
    name: 'Zephyr Hawk',
    cost: '2',
    family: 'Wind',
    credit: 'AI Art - Playground v2.5',
    effect: '⚡ Draw 1 card.\n♾️ Your \\icon(Wind) creatures cost 1 less to summon.'
  }
];

// Random pool for generator
const RANDOM_NAMES = [
  'Tectonic Behemoth', 'Frost Leviathan', 'Fafnir, Dragon of Greed', 'Eldritch Sprout', 
  'Ignis Whelpling', 'Zephyr Djinn', 'Abyssal Siren', 'Obsidian Golem', 'Aetherial Phoenix', 
  'Tidal Serpent', 'Stormcaller Griffin', 'Yggdrasil Treant', 'Void Walker', 'Celestial Kitsune', 
  'Magma Wyrm', 'Sylph of the Gale', 'Chronos Weaver', 'Kirin of the Peak', 'Cinder Hellhound'
];
const RANDOM_CREDITS = [
  'Art by AI Tamer', 'Midjourney v6.0', 'Illustrated by Eric Hong', 'Stable Diffusion XL', 
  'Artist: Quoc Kien', 'DALL-E 3 Creations', 'Art by Guest Contributor', 'Concept by Studio X', 
  'Designed by Tabletop Master', 'Art by NovelAI'
];
const RANDOM_EFFECTS = [
  '⚡ Earn \\icon(Stone3) and \\icon(Stone1).\n⏳ Discard a card to earn \\icon(Stone6).',
  '♾️ Whenever you sell a \\icon(Fire) card, earn \\icon(Stone1).\n⏳ Recover.',
  '⚡ Earn \\icon(Score, 4) for each unique card family present.\n\\italic(Eternity looms near.)',
  '⏳ If your hand is empty, earn \\icon(Stone6) and \\icon(Stone3).\n⏳ Recover.',
  '⚡ A player of your choice discards one of their summoned \\icon(Water) cards.',
  '⚡ Summon a \\icon(Water) card from your hand for free.',
  '♾️ At the end of each round, earn \\icon(Stone1) for each \\icon(Dragon) card you control.',
  '⏳ Destroy one of your own cards to earn \\icon(Score, 5).',
  '⚡ Draw 2 cards. Keep 1 and discard the other.',
  '♾️ Your cards cost 1 less to summon.',
  '⏳ Discard 2 cards from your hand to earn \\icon(Stone6).',
  '⚡ Gain \\icon(Score, 2) for every 3 \\icon(Stone1) you have.',
  '♾️ Opponents must pay you \\icon(Stone1) to summon a \\icon(Dragon).',
  '⚡ Steal \\icon(Stone1) from the player with the most points.',
  '⏳ Discard this card from the field to earn \\icon(Score, 10).'
];

// Helper parser to render text strings with inline image icons and styling
function parseEffectText(text) {
  if (!text) return '';
  
  // Regex matches \icon(Name) or \italic(Text)
  const regex = /(\\icon\([^)]+\)|\\italic\([^)]+\))/g;
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (part.startsWith('\\icon(')) {
      const inside = part.substring(6, part.length - 1); // e.g. "Score, 2" or "Stone3"
      const commaIdx = inside.indexOf(',');
      const colonIdx = inside.indexOf(':');
      const splitIdx = commaIdx !== -1 ? commaIdx : colonIdx;
      
      let iconName = inside;
      let extraVal = '';
      
      if (splitIdx !== -1) {
        iconName = inside.substring(0, splitIdx).trim();
        extraVal = inside.substring(splitIdx + 1).trim();
      }
      
      // If it's a Score icon, render it in a relative box with the value overlaid (always has a number)
      if (iconName === 'Score') {
        const displayVal = extraVal || '1';
        return (
          <span key={index} style={{ 
            position: 'relative', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 0.15em',
            verticalAlign: 'middle',
            transform: 'translateY(-1.5px)'
          }}>
            <img 
              src="/img/TextIcon/Score.png" 
              alt="Score" 
              style={{ height: '1.25em', width: 'auto', display: 'block' }} 
            />
            <span style={{
              position: 'absolute',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.62em',
              fontFamily: 'var(--font-effect)',
              textAlign: 'center',
              lineHeight: 1,
              transform: 'translateY(0.08em)',
              textShadow: '0 1px 1px rgba(0,0,0,0.3)',
              WebkitTextStroke: '0.9px #4a3525', // Dark beige border
            }}>
              {displayVal}
            </span>
          </span>
        );
      }

      return (
        <img 
          key={index} 
          src={`/img/TextIcon/${iconName}.png`} 
          alt={iconName}
          style={{
            height: '1.2em',
            width: 'auto',
            verticalAlign: 'middle',
            display: 'inline-block',
            margin: '0 0.15em',
            transform: 'translateY(-1.5px)'
          }}
        />
      );
    } else if (part.startsWith('\\italic(')) {
      const italicText = part.substring(8, part.length - 1);
      return (
        <span key={index} style={{ fontStyle: 'italic' }}>
          {italicText}
        </span>
      );
    }
    return part;
  });
}

// Maps timing characters to their official overlay icons
function getTimingIcon(line) {
  const cleanLine = line.trim();
  if (cleanLine.startsWith('⚡')) {
    return { icon: '/img/Effect/InstantEffect.png', text: cleanLine.substring(1).trim() };
  } else if (cleanLine.startsWith('♾️')) {
    return { icon: '/img/Effect/PermanentEffect.png', text: cleanLine.substring(2).trim() };
  } else if (cleanLine.startsWith('⏳')) {
    return { icon: '/img/Effect/ResolutionEffect.png', text: cleanLine.substring(2).trim() };
  }
  return { icon: null, text: cleanLine };
}

// Sidebar component adjusters mapping
const COMPONENT_LABELS = {
  priceTL: 'Summoning Cost (Top-Left)',
  priceBR: 'Summoning Cost (Bottom-Right)',
  name: 'Creature Name',
  effect: 'Effect Text Panel',
  effectIcon: 'Effect Icon (Timing)',
  credit: 'Artist Credit'
};

// --- INDEXEDDB DATABASE LAYER ---
const DB_NAME = 'ValeOfEternityDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('packs')) {
        db.createObjectStore('packs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cards')) {
        const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
        cardStore.createIndex('packId', 'packId', { unique: false });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function dbGetPacks() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('packs', 'readonly');
      const store = transaction.objectStore('packs');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function dbSavePack(pack) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('packs', 'readwrite');
      const store = transaction.objectStore('packs');
      const request = store.put(pack);
      request.onsuccess = () => resolve(pack);
      request.onerror = () => reject(request.error);
    });
  });
}

function dbDeletePack(packId) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['packs', 'cards'], 'readwrite');
      
      // Delete pack
      transaction.objectStore('packs').delete(packId);
      
      // Delete all cards in that pack
      const cardStore = transaction.objectStore('cards');
      const index = cardStore.index('packId');
      const request = index.openCursor(IDBKeyRange.only(packId));
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

function dbGetCards(packId) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cards', 'readonly');
      const store = transaction.objectStore('cards');
      const index = store.index('packId');
      const request = index.getAll(IDBKeyRange.only(packId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function dbSaveCard(card) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cards', 'readwrite');
      const store = transaction.objectStore('cards');
      const request = store.put(card);
      request.onsuccess = () => resolve(card);
      request.onerror = () => reject(request.error);
    });
  });
}

function dbDeleteCard(cardId) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cards', 'readwrite');
      const store = transaction.objectStore('cards');
      const request = store.delete(cardId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

const DEFAULT_PACK_ID = 'starter-pack';

async function seedDefaultData() {
  const packs = await dbGetPacks();
  if (packs.length === 0) {
    const starterPack = {
      id: DEFAULT_PACK_ID,
      name: 'Starter Pack (Official)',
      createdAt: Date.now()
    };
    await dbSavePack(starterPack);
    
    // Seed the cards
    for (const preset of MOCK_PRESETS) {
      const card = {
        id: preset.id,
        packId: DEFAULT_PACK_ID,
        name: preset.name,
        cost: preset.cost,
        family: preset.family,
        credit: preset.credit,
        effect: preset.effect,
        layout: DEFAULT_LAYOUT,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await dbSaveCard(card);
    }
  }
}

export default function App() {
  const [activePreset, setActivePreset] = useState(MOCK_PRESETS[0]);
  const [backgroundFamily, setBackgroundFamily] = useState('Water'); // Fire, Water, Earth, Wind, Dragon
  
  // Custom Card Input State
  const [cardName, setCardName] = useState(MOCK_PRESETS[0].name);
  const [cardCost, setCardCost] = useState(MOCK_PRESETS[0].cost);
  const [cardCredit, setCardCredit] = useState(MOCK_PRESETS[0].credit);
  const [cardEffectText, setCardEffectText] = useState(MOCK_PRESETS[0].effect);

  // Art Integrator State
  const [artImageData, setArtImageData] = useState(null); // { dataUrl, transform }
  const [showArtImporter, setShowArtImporter] = useState(false);
  
  // Layout Calibration State
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [selectedElement, setSelectedElement] = useState('name'); // priceTL, priceBR, name, effect, credit
  const [zoomScale, setZoomScale] = useState(0.85);
  const [jsonInput, setJsonInput] = useState('');
  
  // Tab and Database state
  const [activeTab, setActiveTab] = useState('editor');
  const [packs, setPacks] = useState([]);
  const [activePackId, setActivePackId] = useState(DEFAULT_PACK_ID);
  const [explorerCards, setExplorerCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFamily, setFilterFamily] = useState('All');
  const [filterCost, setFilterCost] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [editingCardId, setEditingCardId] = useState(null);

  const cardRef = useRef(null);

  // Initialize DB and load packs
  useEffect(() => {
    const initDB = async () => {
      await seedDefaultData();
      const allPacks = await dbGetPacks();
      setPacks(allPacks);
      if (allPacks.length > 0) {
        const hasStarter = allPacks.some(p => p.id === DEFAULT_PACK_ID);
        setActivePackId(hasStarter ? DEFAULT_PACK_ID : allPacks[0].id);
      }
    };
    initDB();
  }, []);

  // Fetch cards for explorer
  const refreshExplorer = () => {
    if (activePackId) {
      dbGetCards(activePackId).then(setExplorerCards);
    }
  };

  useEffect(() => {
    refreshExplorer();
  }, [activePackId]);

  // Card explorer operations
  const duplicateCard = (card) => {
    const newCard = {
      ...card,
      id: 'card-' + Date.now(),
      name: card.name + ' (Copy)',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    dbSaveCard(newCard).then(refreshExplorer);
  };

  const moveCard = (card, targetPackId) => {
    const updatedCard = {
      ...card,
      packId: targetPackId,
      updatedAt: Date.now()
    };
    dbSaveCard(updatedCard).then(refreshExplorer);
  };

  const deleteCard = (cardId) => {
    if (confirm('Are you sure you want to delete this card?')) {
      dbDeleteCard(cardId).then(refreshExplorer);
    }
  };

  const loadCardInEditor = (card) => {
    setEditingCardId(card.id);
    setCardName(card.name);
    setCardCost(card.cost);
    setCardCredit(card.credit);
    setCardEffectText(card.effect);
    setBackgroundFamily(card.family);
    if (card.layout) {
      setLayout(card.layout);
    } else {
      setLayout(DEFAULT_LAYOUT);
    }
    setArtImageData(card.artImageData || null);
    setActivePackId(card.packId);
    setActiveTab('editor');
  };

  const handleSaveCard = (saveAsNew = false) => {
    const cardId = (saveAsNew || !editingCardId) ? 'card-' + Date.now() : editingCardId;
    const newCard = {
      id: cardId,
      packId: activePackId,
      name: cardName,
      cost: cardCost,
      family: backgroundFamily,
      credit: cardCredit,
      effect: cardEffectText,
      layout: layout,
      artImageData: artImageData || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    dbSaveCard(newCard).then(() => {
      setEditingCardId(cardId);
      alert(saveAsNew ? 'Card duplicated and saved!' : 'Card saved successfully!');
      dbGetPacks().then(setPacks);
      refreshExplorer();
    }).catch(err => {
      alert('Error saving card: ' + err.message);
    });
  };

  const exportPack = (pack) => {
    dbGetCards(pack.id).then(packCards => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        type: 'vale-pack',
        pack: pack,
        cards: packCards
      }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${pack.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_pack.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  };

  const exportEntireLibrary = () => {
    dbGetPacks().then(async (allPacks) => {
      const allData = [];
      for (const pack of allPacks) {
        const pCards = await dbGetCards(pack.id);
        allData.push({ pack, cards: pCards });
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        type: 'vale-library',
        packs: allData
      }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "vale_of_eternity_library.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.type === 'vale-pack') {
          const pack = parsed.pack;
          pack.createdAt = pack.createdAt || Date.now();
          await dbSavePack(pack);
          for (const card of parsed.cards) {
            await dbSaveCard(card);
          }
          alert(`Pack "${pack.name}" and ${parsed.cards.length} cards imported!`);
        } else if (parsed.type === 'vale-library') {
          for (const item of parsed.packs) {
            await dbSavePack(item.pack);
            for (const card of item.cards) {
              await dbSaveCard(card);
            }
          }
          alert('Entire library imported successfully!');
        } else {
          alert('Unknown file format.');
        }
        dbGetPacks().then(setPacks);
        refreshExplorer();
      } catch (err) {
        alert('Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  // Synchronize layout when presets change
  const loadPreset = (preset) => {
    setActivePreset(preset);
    setCardName(preset.name);
    setCardCost(preset.cost);
    setCardCredit(preset.credit);
    setCardEffectText(preset.effect);
    setBackgroundFamily(preset.family);
  };
  
  // Random card generator to test limits
  const generateRandomCard = () => {
    const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const cost = Math.floor(Math.random() * 10).toString();
    const credit = RANDOM_CREDITS[Math.floor(Math.random() * RANDOM_CREDITS.length)];
    const effect = RANDOM_EFFECTS[Math.floor(Math.random() * RANDOM_EFFECTS.length)];
    const families = ['Fire', 'Water', 'Earth', 'Wind', 'Dragon'];
    const family = families[Math.floor(Math.random() * families.length)];
    
    setCardName(name);
    setCardCost(cost);
    setCardCredit(credit);
    setCardEffectText(effect);
    setBackgroundFamily(family);
  };

  // Convert background elements to matching template paths
  const getBackgroundPath = (family) => {
    const mapping = {
      Fire: 'FireCard.png',
      Water: 'WaterCard.png',
      Earth: 'EarthCard.png',
      Wind: 'AirCard.png',
      Dragon: 'DragonCard.png'
    };
    return `/img/Background/${mapping[family] || 'WaterCard.png'}`;
  };

  // Handle direct mouse drag positioning of active elements
  const handleDragStart = (e, elementKey) => {
    e.preventDefault();
    setSelectedElement(elementKey);
    
    const cardElement = cardRef.current;
    if (!cardElement) return;
    
    const cardRect = cardElement.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    
    const currentLayout = getResolvedElementLayout(elementKey, backgroundFamily, layout);
    const startLeft = currentLayout.left ?? 0;
    const startTop = currentLayout.top ?? 0;
    
    const handleDragMove = (moveEvent) => {
      if (elementKey === 'effectIcon') {
        const cqwPx = cardRect.width / 100;
        const deltaX = (moveEvent.clientX - startX) / cqwPx;
        const deltaY = (moveEvent.clientY - startY) / cqwPx;
        
        setLayout(prev => ({
          ...prev,
          effectIcon: {
            ...prev.effectIcon,
            left: parseFloat((startLeft + deltaX).toFixed(1)),
            top: parseFloat((startTop + deltaY).toFixed(1))
          }
        }));
        return;
      }
      
      const familySpecificKeys = ['priceTL', 'priceBR', 'credit'];
      if (familySpecificKeys.includes(elementKey)) {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        const percentDeltaX = (deltaX / cardRect.width) * 100;
        const percentDeltaY = (deltaY / cardRect.height) * 100;
        
        const percentX = parseFloat(Math.max(0, Math.min(100, startLeft + percentDeltaX)).toFixed(1));
        const percentY = parseFloat(Math.max(0, Math.min(100, startTop + percentDeltaY)).toFixed(1));

        setLayout(prev => {
          const selected = prev[elementKey];
          const currentFamilies = selected.families || {};
          const activeFamilyLayout = currentFamilies[backgroundFamily] || {
            left: selected.left,
            top: selected.top,
            fontSize: selected.fontSize,
            width: selected.width
          };
          return {
            ...prev,
            [elementKey]: {
              ...selected,
              families: {
                ...currentFamilies,
                [backgroundFamily]: {
                  ...activeFamilyLayout,
                  left: percentX,
                  top: percentY
                }
              }
            }
          };
        });
        return;
      }
      
      const deltaX = moveEvent.clientX - cardRect.left;
      const deltaY = moveEvent.clientY - cardRect.top;
      
      // Map to exact percentages relative to card container width/height
      const percentX = parseFloat(Math.max(0, Math.min(100, (deltaX / cardRect.width) * 100)).toFixed(1));
      const percentY = parseFloat(Math.max(0, Math.min(100, (deltaY / cardRect.height) * 100)).toFixed(1));
      
      setLayout(prev => ({
        ...prev,
        [elementKey]: {
          ...prev[elementKey],
          left: percentX,
          top: percentY
        }
      }));
    };
    
    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  // Live sidebar setting updates
  const updateSetting = (key, value) => {
    setLayout(prev => {
      const selected = prev[selectedElement];
      const familySpecificKeys = ['priceTL', 'priceBR', 'credit'];
      
      if (familySpecificKeys.includes(selectedElement)) {
        if (key === 'color') {
          const currentColors = selected.colors || {
            Fire: 'default',
            Water: 'default',
            Earth: 'default',
            Wind: 'default',
            Dragon: 'default'
          };
          return {
            ...prev,
            [selectedElement]: {
              ...selected,
              color: 'default', // Reset legacy single color to avoid overriding colors map
              colors: {
                ...currentColors,
                [backgroundFamily]: value
              }
            }
          };
        }
        
        const currentFamilies = selected.families || {};
        const activeFamilyLayout = currentFamilies[backgroundFamily] || {
          left: selected.left,
          top: selected.top,
          fontSize: selected.fontSize,
          width: selected.width
        };
        
        return {
          ...prev,
          [selectedElement]: {
            ...selected,
            families: {
              ...currentFamilies,
              [backgroundFamily]: {
                ...activeFamilyLayout,
                [key]: value
              }
            }
          }
        };
      }
      return {
        ...prev,
        [selectedElement]: {
          ...selected,
          [key]: value
        }
      };
    });
  };

  // Copy current layout config to clipboard
  const copyLayoutToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(layout, null, 2));
    alert('Configuration JSON copied to clipboard!');
  };

  // Import custom configuration JSON
  const importLayoutConfig = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      // Validate structure matches
      if (parsed.priceTL && parsed.priceBR && parsed.name && parsed.effect && parsed.credit) {
        if (!parsed.effectIcon) {
          parsed.effectIcon = {
            left: parsed.effect?.iconOffsetLeft ?? 0,
            top: parsed.effect?.iconOffset ?? 0.2,
            size: parsed.effect?.iconSize ?? 6.0,
            gap: parsed.effect?.iconGap ?? 1.5
          };
        }
        
        // Migrate family-specific overrides if missing
        const familiesList = ['Fire', 'Water', 'Earth', 'Wind', 'Dragon'];
        ['priceTL', 'priceBR', 'credit'].forEach(key => {
          if (parsed[key] && !parsed[key].families) {
            parsed[key].families = {};
            familiesList.forEach(fam => {
              parsed[key].families[fam] = {
                left: parsed[key].left,
                top: parsed[key].top,
                fontSize: parsed[key].fontSize,
                width: parsed[key].width
              };
            });
          }
        });

        // Migrate new effect panel properties if missing
        if (parsed.effect) {
          if (parsed.effect.panelHeight === undefined) parsed.effect.panelHeight = 8.5;
          if (parsed.effect.panelGap === undefined) parsed.effect.panelGap = 1.5;
          if (parsed.effect.textLeft === undefined) parsed.effect.textLeft = 10.0;
          if (parsed.effect.textTop === undefined) parsed.effect.textTop = 1.5;
          if (parsed.effect.textWidth === undefined) parsed.effect.textWidth = 80;
          if (parsed.effect.textHeight === undefined) parsed.effect.textHeight = 70;
        }

        setLayout(parsed);
        alert('Configuration imported successfully!');
      } else {
        alert('Invalid JSON layout structure. Make sure all components are defined.');
      }
    } catch (e) {
      alert('Error parsing JSON string. Please verify layout format.');
    }
  };

  // Inject code symbols at cursor in text area
  const insertTextTag = (tag) => {
    setCardEffectText(prev => prev + tag);
  };

  // Parse lines and render timing panels
  const renderEffectPanels = () => {
    const lines = cardEffectText.split('\n');
    
    // Retrieve effectIcon settings with grace-fallbacks if missing from layout
    const iconSize = layout.effectIcon?.size ?? layout.effect?.iconSize ?? 6.0;
    const iconOffset = layout.effectIcon?.top ?? layout.effect?.iconOffset ?? 0.2;
    const iconLeft = layout.effectIcon?.left ?? 0;

    // Retrieve panel/text box bounding box parameters
    const panelHeight = layout.effect.panelHeight ?? 8.5;
    const panelGap = layout.effect.panelGap ?? 1.5;
    const textLeft = layout.effect.textLeft ?? 10.0;
    const textTop = layout.effect.textTop ?? 1.5;
    const textWidth = layout.effect.textWidth ?? 80;
    const textHeight = layout.effect.textHeight ?? 70;

    return lines.map((line, idx) => {
      if (!line.trim()) return null;
      
      const { icon, text } = getTimingIcon(line);
      
      return (
        <div key={idx} style={{
          position: 'relative',
          width: '100%',
          height: `${panelHeight}cqw`,
          marginBottom: idx < lines.length - 1 ? `${panelGap}cqw` : 0
        }}>
          {/* Beige translucent panel background */}
          <div style={{
            width: '100%',
            height: '100%',
            background: `rgba(${parseInt(layout.effect.bgColor.slice(1, 3), 16)}, ${parseInt(layout.effect.bgColor.slice(3, 5), 16)}, ${parseInt(layout.effect.bgColor.slice(5, 7), 16)}, ${layout.effect.bgOpacity})`,
            color: layout.effect.color,
            fontSize: `${layout.effect.fontSize}cqw`,
            fontFamily: 'var(--font-effect)',
            borderRadius: `${layout.effect.borderRadius}cqw`,
            borderLeft: `2.5px solid var(--family-${backgroundFamily.toLowerCase()})`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            position: 'relative',
            boxSizing: 'border-box'
          }}>
            {/* Text Bounding Box (editable and allows vertical overflow outside panel box) */}
            <div style={{
              position: 'absolute',
              left: `${textLeft}cqw`,
              top: `${textTop}cqw`,
              width: `${textWidth}%`,
              height: `${textHeight}%`,
              textAlign: 'left',
              lineHeight: 1.35,
              boxSizing: 'border-box',
              overflow: 'visible'
            }}>
              {parseEffectText(text)}
            </div>
          </div>

          {/* Timing icon anchored relative to the row container */}
          {icon && (
            <img 
              src={icon} 
              alt="Timing" 
              onMouseDown={(e) => {
                e.stopPropagation();
                handleDragStart(e, 'effectIcon');
              }}
              style={{
                position: 'absolute',
                left: `${iconLeft}cqw`,
                top: `${iconOffset}cqw`,
                width: `${iconSize}cqw`,
                height: `${iconSize}cqw`,
                objectFit: 'contain',
                cursor: 'move',
                border: selectedElement === 'effectIcon' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
                borderRadius: '4px',
                padding: '1px',
                zIndex: 5
              }}
            />
          )}
        </div>
      );
    });
  };

  const resolvedPriceTL = getResolvedElementLayout('priceTL', backgroundFamily, layout);
  const resolvedPriceBR = getResolvedElementLayout('priceBR', backgroundFamily, layout);
  const resolvedCredit = getResolvedElementLayout('credit', backgroundFamily, layout);
  const resolvedSelected = getResolvedElementLayout(selectedElement, backgroundFamily, layout);

  return (
    <>
      <div className="app-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1600px' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '1rem',
      }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            background: 'linear-gradient(to right, #818cf8, #a78bfa, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.025em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            The Vale of Eternity <span style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary)',
              color: 'white',
              letterSpacing: 'normal',
              WebkitTextFillColor: 'initial',
              alignSelf: 'center'
            }}>Layout Calibrator</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.1rem' }}>
            Calibrate components and output precise coordinates for custom card templates.
          </p>
        </div>
        
        {/* Preset selections */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Presets:</span>
          {MOCK_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => loadPreset(preset)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--radius-sm)',
                border: activePreset.id === preset.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                background: activePreset.id === preset.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
                color: activePreset.id === preset.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all var(--transition-fast)'
              }}
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={generateRandomCard}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-color-hover)',
              background: 'transparent',
              color: 'var(--color-success)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginLeft: '0.5rem'
            }}
          >
            <RefreshCw size={14} /> Random
          </button>
        </div>
      </header>

      {/* Tab Navigation header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('editor')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'editor' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'editor' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'editor' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          Interactive Designer
        </button>
        <button
          onClick={() => {
            setActiveTab('explorer');
            refreshExplorer();
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'explorer' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'explorer' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'explorer' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          Pack Explorer
        </button>
      </div>

      {/* Main calibrator interface split panel */}
      {activeTab === 'editor' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '2rem',
          marginTop: '1rem',
          alignItems: 'start'
        }}>
        
        {/* LEFT COMPONENT: The interactive card workspace */}
        <div className="glass-panel" style={{
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: '720px',
          background: 'rgba(5, 8, 20, 0.5)'
        }}>
          {/* Zoom scale controller bar */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-surface-elevated)',
            padding: '0.3rem 0.6rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            zIndex: 10
          }}>
            <button 
              onClick={() => setZoomScale(s => Math.max(0.5, s - 0.05))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Minimize2 size={16} />
            </button>
            <span style={{ fontSize: '0.8rem', width: '35px', textAlign: 'center', fontWeight: 600 }}>
              {Math.round(zoomScale * 100)}%
            </span>
            <button 
              onClick={() => setZoomScale(s => Math.min(1.5, s + 0.05))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Maximize2 size={16} />
            </button>
          </div>

          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <HelpCircle size={14} /> Drag elements directly on the card to align coordinates.
          </div>

          {/* Scaled Preview Card Frame */}
          <div 
            ref={cardRef}
            style={{
              position: 'relative',
              width: '450px',
              height: '628px', // Standard 63:88 aspect ratio (approx 450x628)
              background: '#030712',
              borderRadius: '26px', // Estimated layout roundness
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden',
              transform: `scale(${zoomScale})`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease-out',
              containerType: 'inline-size', // Declares this as a Container Query root
              border: `3px solid var(--family-${backgroundFamily.toLowerCase()})`
            }}
          >
            {/* Layer 1 (Bottom): Card Background Template */}
            <img 
              src={getBackgroundPath(backgroundFamily)} 
              alt="Card Background" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none'
              }}
            />

            {/* Layer 2 (Middle): User Art — positioned between background and frame overlays */}
            {artImageData?.dataUrl && (
              <img
                src={artImageData.dataUrl}
                alt="Card Art"
                style={{
                  position: 'absolute',
                  left: `${artImageData.transform?.x ?? 50}%`,
                  top: `${artImageData.transform?.y ?? 47.7}%`,
                  width: `${artImageData.transform?.scale ?? 60}%`,
                  transform: `translate(-50%, -50%) rotate(${artImageData.transform?.rotation ?? 0}deg)`,
                  pointerEvents: 'none',
                  zIndex: 1,
                  userSelect: 'none',
                }}
                draggable={false}
              />
            )}

            {/* OVERLAY: Top-Left Summoning Cost */}
            <div 
              onMouseDown={(e) => handleDragStart(e, 'priceTL')}
              style={{
                position: 'absolute',
                left: `${resolvedPriceTL.left}%`,
                top: `${resolvedPriceTL.top}%`,
                fontSize: `${resolvedPriceTL.fontSize}cqw`,
                fontFamily: 'var(--font-price)',
                color: getPriceColor('priceTL', backgroundFamily, layout),
                lineHeight: 1,
                cursor: 'move',
                userSelect: 'none',
                padding: '4px',
                border: selectedElement === 'priceTL' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
                borderRadius: '4px',
                transform: 'translate(-50%, -50%)',
                zIndex: selectedElement === 'priceTL' ? 10 : 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              {cardCost}
            </div>

            {/* OVERLAY: Bottom-Right Summoning Cost */}
            <div 
              onMouseDown={(e) => handleDragStart(e, 'priceBR')}
              style={{
                position: 'absolute',
                left: `${resolvedPriceBR.left}%`,
                top: `${resolvedPriceBR.top}%`,
                fontSize: `${resolvedPriceBR.fontSize}cqw`,
                fontFamily: 'var(--font-price)',
                color: getPriceColor('priceBR', backgroundFamily, layout),
                lineHeight: 1,
                cursor: 'move',
                userSelect: 'none',
                padding: '4px',
                border: selectedElement === 'priceBR' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
                borderRadius: '4px',
                transform: 'translate(-50%, -50%)',
                zIndex: selectedElement === 'priceBR' ? 10 : 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              {cardCost}
            </div>

            {/* OVERLAY: Creature Name */}
            <div 
              onMouseDown={(e) => handleDragStart(e, 'name')}
              style={{
                position: 'absolute',
                left: `${layout.name.left}%`,
                top: `${layout.name.top}%`,
                width: `${layout.name.width}%`,
                fontSize: `${layout.name.fontSize}cqw`,
                fontFamily: 'var(--font-card-name)',
                color: layout.name.color,
                fontWeight: 'normal',
                textAlign: 'center',
                cursor: 'move',
                userSelect: 'none',
                padding: '4px',
                border: selectedElement === 'name' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
                borderRadius: '4px',
                transform: 'translate(0, -50%)',
                zIndex: selectedElement === 'name' ? 10 : 2,
                letterSpacing: '0.02em',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.7)'
              }}
            >
              {cardName}
            </div>

            {/* OVERLAY: Effect Panel Wrapper */}
            <div 
              onMouseDown={(e) => handleDragStart(e, 'effect')}
              style={{
                position: 'absolute',
                left: `${layout.effect.left}%`,
                top: `${layout.effect.top}%`,
                width: `${layout.effect.width}%`,
                cursor: 'move',
                userSelect: 'none',
                padding: '0px',
                border: selectedElement === 'effect' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
                borderRadius: '8px',
                zIndex: selectedElement === 'effect' ? 10 : 2,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
              }}
            >
              {renderEffectPanels()}
            </div>

            {/* OVERLAY: Artist Credit */}
            <div 
              onMouseDown={(e) => handleDragStart(e, 'credit')}
              style={{
                position: 'absolute',
                left: `${resolvedCredit.left}%`,
                top: `${resolvedCredit.top}%`,
                width: `${resolvedCredit.width}%`,
                fontSize: `${resolvedCredit.fontSize}cqw`,
                fontFamily: 'var(--font-credit)',
                color: layout.credit.color,
                textAlign: 'center',
                cursor: 'move',
                userSelect: 'none',
                padding: '4px',
                border: selectedElement === 'credit' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
                borderRadius: '4px',
                transform: 'translate(0, -50%)',
                zIndex: selectedElement === 'credit' ? 10 : 2,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)'
              }}
            >
              {cardCredit}
            </div>

          </div>
        </div>

        {/* RIGHT COMPONENT: Calibration Settings Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1: Template and Text Inputs */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <Sparkles size={16} /> 1. Edit Card Content
              </h3>
              <button
                onClick={() => setShowArtImporter(true)}
                style={{
                  padding: '0.35rem 0.75rem',
                  background: artImageData ? 'rgba(236,72,153,0.15)' : 'var(--bg-surface-elevated)',
                  border: `1px solid ${artImageData ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: artImageData ? '#f472b6' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.2s'
                }}
              >
                <ImagePlus size={13} />
                {artImageData ? 'Edit Art' : 'Add Art'}
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Family</label>
                <select
                  value={backgroundFamily}
                  onChange={(e) => setBackgroundFamily(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem'
                  }}
                >
                  {['Fire', 'Water', 'Earth', 'Wind', 'Dragon'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Card Name</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Price (Cost)</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={cardCost}
                  onChange={(e) => setCardCost(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Artist Credit</label>
                <input
                  type="text"
                  value={cardCredit}
                  onChange={(e) => setCardCredit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Effect Description (Split timing with newline `\n`)
              </label>
              <textarea
                value={cardEffectText}
                onChange={(e) => setCardEffectText(e.target.value)}
                rows="3"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.6rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  lineHeight: '1.4',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Quick-insert helper tags */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Insert:</span>
              {[
                { label: '⚡', tag: '⚡ ' },
                { label: '♾️', tag: '♾️ ' },
                { label: '⏳', tag: '⏳ ' },
                { label: 'Water', tag: '\\icon(Water)' },
                { label: 'Fire', tag: '\\icon(Fire)' },
                { label: 'Wind', tag: '\\icon(Wind)' },
                { label: 'Earth', tag: '\\icon(Earth)' },
                { label: 'Dragon', tag: '\\icon(Dragon)' },
                { label: 'Red St.', tag: '\\icon(Stone1)' },
                { label: 'Blue St.', tag: '\\icon(Stone3)' },
                { label: 'Purp. St.', tag: '\\icon(Stone6)' },
                { label: 'VP', tag: '\\icon(Score, 1)' },
                { label: 'Italic', tag: '\\italic(text)' }
              ].map(t => (
                <button
                  key={t.label}
                  onClick={() => insertTextTag(t.tag)}
                  style={{
                    padding: '0.15rem 0.4rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Database Save/Manage Actions */}
            <div style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px dashed var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.5rem', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem', fontWeight: 600 }}>Target Pack</label>
                  <select
                    value={activePackId}
                    onChange={(e) => setActivePackId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.35rem 0.5rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem'
                    }}
                  >
                    {packs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ alignSelf: 'end' }}>
                  <button
                    onClick={() => {
                      const name = prompt('Enter new pack name:');
                      if (name && name.trim()) {
                        const newPack = { id: 'pack-' + Date.now(), name: name.trim(), createdAt: Date.now() };
                        dbSavePack(newPack).then(() => {
                          dbGetPacks().then(setPacks);
                          setActivePackId(newPack.id);
                        });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.35rem 0.5rem',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px dashed var(--border-color-hover)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      color: 'var(--color-success)',
                      fontWeight: 600
                    }}
                  >
                    + New Pack
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: editingCardId ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <button
                  onClick={() => handleSaveCard(false)}
                  style={{
                    padding: '0.45rem',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
                  }}
                >
                  {editingCardId ? 'Update Card' : 'Save Card'}
                </button>
                
                {editingCardId && (
                  <button
                    onClick={() => handleSaveCard(true)}
                    style={{
                      padding: '0.45rem',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Save As New
                  </button>
                )}

                <button
                  onClick={() => {
                    setEditingCardId(null);
                    setCardName('New Creature');
                    setCardCost('3');
                    setCardCredit('Art by Tamer');
                    setCardEffectText('⚡ Instantly earn \\icon(Stone1).');
                    setLayout(DEFAULT_LAYOUT);
                  }}
                  style={{
                    padding: '0.45rem',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Clear/New
                </button>
              </div>
              
              {editingCardId && (
                <div style={{ fontSize: '0.7rem', color: 'var(--color-warning)', textAlign: 'center', fontWeight: 500 }}>
                  Editing saved card (ID: {editingCardId}). Changes will overwrite.
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Layout calibration sliders */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Settings size={16} /> 2. Calibrate Elements
            </h3>

            {/* Selector for element being calibrated */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Target Element
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.35rem'
              }}>
                {Object.keys(COMPONENT_LABELS).map(key => (
                  <button
                    key={key}
                    onClick={() => setSelectedElement(key)}
                    style={{
                      padding: '0.4rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: selectedElement === key ? 'var(--color-primary)' : 'var(--bg-surface-elevated)',
                      border: 'none',
                      color: 'white',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      textAlign: 'left'
                    }}
                  >
                    {COMPONENT_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Controls based on selected element */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedElement === 'effectIcon' ? (
                <>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <span>Horizontal Shift (cqw)</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{layout.effectIcon?.left ?? 0}</span>
                    </div>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      step="0.1"
                      value={layout.effectIcon?.left ?? 0}
                      onChange={(e) => updateSetting('left', parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <span>Vertical Shift (cqw)</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{layout.effectIcon?.top ?? 0.2}</span>
                    </div>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      step="0.1"
                      value={layout.effectIcon?.top ?? 0.2}
                      onChange={(e) => updateSetting('top', parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <span>Icon Size (cqw)</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{layout.effectIcon?.size ?? 6.0}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.1"
                      value={layout.effectIcon?.size ?? 6.0}
                      onChange={(e) => updateSetting('size', parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <span>Icon-Panel Gap (cqw)</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{layout.effectIcon?.gap ?? 1.5}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.1"
                      value={layout.effectIcon?.gap ?? 1.5}
                      onChange={(e) => updateSetting('gap', parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Sliders for Top/Left coordinates */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <span>Horizontal Position (Left %)</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{resolvedSelected?.left}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={resolvedSelected?.left ?? 0}
                      onChange={(e) => updateSetting('left', parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <span>Vertical Position (Top %)</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{resolvedSelected?.top}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={resolvedSelected?.top ?? 0}
                      onChange={(e) => updateSetting('top', parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Sliders for Width (if not price tags) */}
                  {resolvedSelected?.width !== undefined && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                        <span>Width (%)</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{resolvedSelected.width}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="0.5"
                        value={resolvedSelected.width}
                        onChange={(e) => updateSetting('width', parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}

                  {/* Sliders for Font Size (in cqw units) */}
                  {resolvedSelected?.fontSize !== undefined && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                        <span>Font Size (cqw)</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{resolvedSelected.fontSize}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.1"
                        value={resolvedSelected.fontSize}
                        onChange={(e) => updateSetting('fontSize', parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}

                  {/* Text color field */}
                  {layout[selectedElement]?.color !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem' }}>Text Color</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {(selectedElement === 'priceTL' || selectedElement === 'priceBR') && (
                          <button
                            onClick={() => updateSetting('color', 'default')}
                            disabled={
                              (() => {
                                const el = layout[selectedElement];
                                if (!el) return true;
                                const hasCustomSingleColor = el.color && el.color !== 'default';
                                const hasCustomFamilyColor = el.colors && el.colors[backgroundFamily] && el.colors[backgroundFamily] !== 'default';
                                return !hasCustomSingleColor && !hasCustomFamilyColor;
                              })()
                            }
                            style={{
                              padding: '0.2rem 0.4rem',
                              fontSize: '0.7rem',
                              background: 'var(--bg-main)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              opacity: (() => {
                                const el = layout[selectedElement];
                                if (!el) return 0.5;
                                const hasCustomSingleColor = el.color && el.color !== 'default';
                                const hasCustomFamilyColor = el.colors && el.colors[backgroundFamily] && el.colors[backgroundFamily] !== 'default';
                                return (hasCustomSingleColor || hasCustomFamilyColor) ? 1 : 0.5;
                              })()
                            }}
                          >
                            Reset Default
                          </button>
                        )}
                        <input
                          type="color"
                          value={getPriceColor(selectedElement, backgroundFamily, layout)}
                          onChange={(e) => updateSetting('color', e.target.value)}
                          style={{ background: 'none', border: 'none', width: '40px', height: '24px', cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Extra specific controls for Effect Panel (effect) */}
                  {selectedElement === 'effect' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                            <span>Bg Opacity</span>
                            <span>{layout.effect.bgOpacity}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={layout.effect.bgOpacity}
                            onChange={(e) => updateSetting('bgOpacity', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                            <span>Bg Color</span>
                          </div>
                          <input
                            type="color"
                            value={layout.effect.bgColor}
                            onChange={(e) => updateSetting('bgColor', e.target.value)}
                            style={{ background: 'none', border: 'none', width: '100%', height: '24px', cursor: 'pointer' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                            <span>Padding (cqw)</span>
                            <span>{layout.effect.padding}</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="6"
                            step="0.1"
                            value={layout.effect.padding}
                            onChange={(e) => updateSetting('padding', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                            <span>Radius (cqw)</span>
                            <span>{layout.effect.borderRadius}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={layout.effect.borderRadius}
                            onChange={(e) => updateSetting('borderRadius', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                          <span>Panel Height (cqw)</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{layout.effect.panelHeight ?? 8.5}</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="25"
                          step="0.1"
                          value={layout.effect.panelHeight ?? 8.5}
                          onChange={(e) => updateSetting('panelHeight', parseFloat(e.target.value))}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                          <span>Panel Gap (cqw)</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{layout.effect.panelGap ?? 1.5}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="15"
                          step="0.1"
                          value={layout.effect.panelGap ?? 1.5}
                          onChange={(e) => updateSetting('panelGap', parseFloat(e.target.value))}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                            <span>Text Left (cqw)</span>
                            <span>{layout.effect.textLeft ?? 10.0}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            step="0.5"
                            value={layout.effect.textLeft ?? 10.0}
                            onChange={(e) => updateSetting('textLeft', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                            <span>Text Top (cqw)</span>
                            <span>{layout.effect.textTop ?? 1.5}</span>
                          </div>
                          <input
                            type="range"
                            min="-5"
                            max="10"
                            step="0.1"
                            value={layout.effect.textTop ?? 1.5}
                            onChange={(e) => updateSetting('textTop', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                            <span>Text Width (%)</span>
                            <span>{layout.effect.textWidth ?? 80}%</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="100"
                            step="1"
                            value={layout.effect.textWidth ?? 80}
                            onChange={(e) => updateSetting('textWidth', parseInt(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                            <span>Text Height (%)</span>
                            <span>{layout.effect.textHeight ?? 70}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="1"
                            value={layout.effect.textHeight ?? 70}
                            onChange={(e) => updateSetting('textHeight', parseInt(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Section 3: Configuration JSON Import/Export */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f472b6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={16} /> 3. Layout JSON Configuration
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                onClick={copyLayoutToClipboard}
                style={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                <Copy size={14} /> Copy Config
              </button>

              <button
                onClick={() => {
                  setJsonInput(JSON.stringify(layout, null, 2));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                View JSON
              </button>
            </div>

            <div>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste Layout JSON configuration here to import..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  lineHeight: '1.3',
                  resize: 'vertical',
                  marginBottom: '0.5rem'
                }}
              />
              <button
                onClick={importLayoutConfig}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, #ec4899, #db2777)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)'
                }}
              >
                <Upload size={14} /> Import Layout Configuration
              </button>
            </div>
          </div>

        </div>

      </div>
      )}

      {/* Pack Explorer Tab View */}
      {activeTab === 'explorer' && (
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
                onClick={() => {
                  const name = prompt('Enter name for the new pack:');
                  if (name && name.trim()) {
                    const newPack = { id: 'pack-' + Date.now(), name: name.trim(), createdAt: Date.now() };
                    dbSavePack(newPack).then(() => {
                      dbGetPacks().then(setPacks);
                      setActivePackId(newPack.id);
                    });
                  }
                }}
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

                  {/* Actions for Custom Packs */}
                  {p.id !== 'starter-pack' && (
                    <div style={{ display: 'flex', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          const newName = prompt('Enter new name for this pack:', p.name);
                          if (newName && newName.trim()) {
                            dbSavePack({ ...p, name: newName.trim() }).then(() => {
                              dbGetPacks().then(setPacks);
                            });
                          }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                        title="Rename Pack"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete pack "${p.name}" and all cards in it?`)) {
                            dbDeletePack(p.id).then(() => {
                              dbGetPacks().then(allPacks => {
                                setPacks(allPacks);
                                if (allPacks.length > 0) setActivePackId(allPacks[0].id);
                              });
                            });
                          }
                        }}
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
                  if (activePack) exportPack(activePack);
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
                onClick={exportEntireLibrary}
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
                onChange={handleImportFile}
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

          {/* Right Panel: Card Grid Explorer */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '600px' }}>
            {/* Filters bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
              gap: '0.75rem',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '1rem'
            }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Search Cards</label>
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

            {/* Grid display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '1rem',
              maxHeight: '650px',
              overflowY: 'auto',
              paddingRight: '0.25rem'
            }}>
              {(() => {
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
                        color: getPriceColor('priceTL', c.family, c.layout || layout),
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
                        onClick={() => loadCardInEditor(c)}
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
                        onClick={() => duplicateCard(c)}
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
                        onChange={(e) => moveCard(c, e.target.value)}
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
                        onClick={() => deleteCard(c.id)}
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
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
    {/* Art Importer Modal */}
    <ArtImporter
      isOpen={showArtImporter}
      onClose={() => setShowArtImporter(false)}
      onArtConfirmed={(artData) => setArtImageData(artData)}
      cardFamily={backgroundFamily}
      existingArt={artImageData?.dataUrl || null}
    />
    </>
  );
}
