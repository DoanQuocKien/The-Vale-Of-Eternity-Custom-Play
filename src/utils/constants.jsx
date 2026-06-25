import React from 'react';

// Default layout configuration in percentage coordinates relative to the card container
export const DEFAULT_LAYOUT = {
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

// Preset card contents for verification and calibration testing
export const MOCK_PRESETS = [
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
export const RANDOM_NAMES = [
  'Tectonic Behemoth', 'Frost Leviathan', 'Fafnir, Dragon of Greed', 'Eldritch Sprout', 
  'Ignis Whelpling', 'Zephyr Djinn', 'Abyssal Siren', 'Obsidian Golem', 'Aetherial Phoenix', 
  'Tidal Serpent', 'Stormcaller Griffin', 'Yggdrasil Treant', 'Void Walker', 'Celestial Kitsune', 
  'Magma Wyrm', 'Sylph of the Gale', 'Chronos Weaver', 'Kirin of the Peak', 'Cinder Hellhound'
];
export const RANDOM_CREDITS = [
  'Art by AI Tamer', 'Midjourney v6.0', 'Illustrated by Eric Hong', 'Stable Diffusion XL', 
  'Artist: Quoc Kien', 'DALL-E 3 Creations', 'Art by Guest Contributor', 'Concept by Studio X', 
  'Designed by Tabletop Master', 'Art by NovelAI'
];
export const RANDOM_EFFECTS = [
  '⚡ Earn \\icon(Stone3) and \\icon(Stone1).\n⏳ Discard a card to earn \\icon(Stone6).',
  '♾️ Whenever you sell a \\icon(Fire) card, earn \\icon(Stone1).\n⏳ Recover.',
  '⚡ Earn \\icon(Score, 4) for each unique card family present.\n\\italic(Eternity looms near.)',
  '⏳ If your hand is empty, earn \\icon(Stone6) and \\icon(Stone3).\n⏳ Recover.',
  '⚡ A player of your choice discards one of their summoned \\icon(Water) cards.',
  '⚡ Summon a \\icon(Water) card from your hand for free.',
  '♾️ At the end of each round, earn \\icon(Stone1) for each \\icon(Dragon) card you control.',
  '⏳ Draw 2 cards. You may keep one and discard the other.',
  '⚡ For every 2 \\icon(Earth) cards you have, earn \\icon(Score, 3).',
  '♾️ Your maximum hand size is increased by 2.'
];

export const COMPONENT_LABELS = {
  priceTL: 'Summoning Cost (Top-Left)',
  priceBR: 'Summoning Cost (Bottom-Right)',
  name: 'Creature Name',
  effect: 'Effect Text Panel',
  effectIcon: 'Effect Icon (Timing)',
  credit: 'Artist Credit'
};

// Helper to resolve layout properties (with family-specific overrides)
export const getResolvedElementLayout = (elementKey, family, layoutState) => {
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
export const getPriceColor = (elementKey, family, layoutState) => {
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

// Global helper to convert background elements to matching template paths
export const getBackgroundPath = (family) => {
  const mapping = {
    Fire: 'FireBackground.png',
    Water: 'WaterBackground.png',
    Earth: 'EarthBackground.png',
    Wind: 'AirBackground.png',
    Dragon: 'DragonBackground.png'
  };
  return `./img/Background/${mapping[family] || 'WaterBackground.png'}`;
};

export function getTimingIcon(line) {
  const cleanLine = line.trim();
  if (cleanLine.startsWith('⚡')) {
    return { icon: './img/Effect/InstantEffect.png', text: cleanLine.substring(1).trim() };
  } else if (cleanLine.startsWith('♾️')) {
    return { icon: './img/Effect/PermanentEffect.png', text: cleanLine.substring(2).trim() };
  } else if (cleanLine.startsWith('⏳')) {
    return { icon: './img/Effect/ResolutionEffect.png', text: cleanLine.substring(2).trim() };
  }
  return { icon: null, text: cleanLine };
}

export function parseEffectText(text) {
  return (
    <span dangerouslySetInnerHTML={{
      __html: text.replace(/\\icon\((.*?)\)/g, (match, iconName) => {
        const parts = iconName.split(',').map(s => s.trim());
        if (parts.length === 2 && parts[0] === 'Score') {
          return `<span style="display:inline-block; position:relative; width:1.5em; height:1.5em; vertical-align:middle; margin:0 0.1em;">
                    <img src="./img/TextIcon/Score.png" style="width:100%; height:100%; object-fit:contain;" />
                    <span style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:900; color:white; -webkit-text-stroke: 0.5px black; font-size:0.8em; margin-top:2px;">${parts[1]}</span>
                  </span>`;
        }
        const pathMap = {
          'Stone1': './img/TextIcon/Stone1.png',
          'Stone3': './img/TextIcon/Stone3.png',
          'Stone6': './img/TextIcon/Stone6.png',
          'Fire': './img/TextIcon/Fire.png',
          'Water': './img/TextIcon/Water.png',
          'Earth': './img/TextIcon/Earth.png',
          'Wind': './img/TextIcon/Wind.png',
          'Dragon': './img/TextIcon/Dragon.png',
        };
        return `<img src="${pathMap[parts[0]] || `./img/TextIcon/${parts[0]}.png`}" style="height: 1.5em; vertical-align: middle; margin: 0 0.1em;" />`;
      }).replace(/\\italic\((.*?)\)/g, '<i>$1</i>')
    }} />
  );
}
