import {
  dbGetCards,
  dbGetTokens,
  dbGetComponents,
  dbGetFamilies,
  dbSavePack,
  dbSaveCard,
  dbSaveToken,
  dbSaveComponent,
  dbSaveFamily
} from '../services/db.js';

/**
 * Compiles pack, cards, tokens, components, and custom families into a single JSON object.
 * @param {Object} pack The pack object from IndexedDB
 * @returns {Promise<string>} Serialized JSON string
 */
export async function serializePack(pack) {
  const cards = await dbGetCards(pack.id);
  const tokens = await dbGetTokens(pack.id);
  const components = await dbGetComponents(pack.id);
  const families = await dbGetFamilies(pack.id);

  const packData = {
    version: '1.4.0',
    pack: {
      id: pack.id,
      name: pack.name,
      createdAt: pack.createdAt
    },
    cards,
    tokens,
    components,
    families
  };

  return JSON.stringify(packData, null, 2);
}

/**
 * Triggers a browser download of the serialized pack file.
 * @param {string} packName Name of the pack
 * @param {string} serializedJson Serialized JSON string
 */
export function downloadPackFile(packName, serializedJson) {
  const blob = new Blob([serializedJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = packName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  a.href = url;
  a.download = `${safeName}.voe-pack`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses and processes the imported pack file, re-mapping all IDs to avoid collisions.
 * @param {string} fileContent The JSON string content of the imported file
 * @returns {Object} The processed pack, cards, tokens, components, and families
 */
export function processImportedPack(fileContent) {
  let packData;
  try {
    packData = JSON.parse(fileContent);
  } catch (err) {
    throw new Error('Invalid pack file: Failed to parse JSON.');
  }

  if (!packData.pack || !packData.pack.name) {
    throw new Error('Invalid pack file: Missing pack metadata.');
  }

  const oldPackId = packData.pack.id;
  const newPackId = 'pack-' + Date.now();
  const timestamp = Date.now();

  const importedPack = {
    id: newPackId,
    name: `${packData.pack.name} (Imported)`,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const tokenIdMap = {};
  const cardIdMap = {};
  const familyIdMap = {};

  // 1. Remap Families
  const importedFamilies = (packData.families || []).map((family, index) => {
    const newFamilyId = `family-${timestamp}-${index}`;
    familyIdMap[family.id] = newFamilyId;
    return {
      ...family,
      id: newFamilyId,
      packId: newPackId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  });

  // 2. Remap Tokens
  const importedTokens = (packData.tokens || []).map((token, index) => {
    const newTokenId = `token-${timestamp}-${index}`;
    tokenIdMap[token.id] = newTokenId;
    return {
      ...token,
      id: newTokenId,
      packId: newPackId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  });

  // 3. Remap Cards
  const importedCards = (packData.cards || []).map((card, index) => {
    const newCardId = `card-${timestamp}-${index}`;
    cardIdMap[card.id] = newCardId;

    // Rewrite family reference if it's custom
    let cardFamily = card.family;
    if (familyIdMap[cardFamily]) {
      cardFamily = familyIdMap[cardFamily];
    }

    // Rewrite effect text references to tokens (e.g. \icon(token-xxxx))
    let effectText = card.effectText || '';
    if (card.tokens && card.tokens.length > 0) {
      card.tokens.forEach(t => {
        const oldTokenId = t.id;
        const newTokenId = tokenIdMap[oldTokenId];
        if (newTokenId) {
          effectText = effectText.replaceAll(oldTokenId, newTokenId);
        }
      });
    }

    // Rewrite card's token overlay list IDs
    const newCardTokens = (card.tokens || []).map(t => {
      const newTokenId = tokenIdMap[t.id];
      return {
        ...t,
        id: newTokenId || t.id
      };
    });

    return {
      ...card,
      id: newCardId,
      packId: newPackId,
      family: cardFamily,
      effectText,
      tokens: newCardTokens,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  });

  // 4. Remap Components
  const importedComponents = (packData.components || []).map((comp, index) => {
    const newCompId = `component-${timestamp}-${index}`;

    // Update image layers referencing custom tokens or cards
    const newLayers = (comp.layers || []).map(layer => {
      if (layer.type === 'image' && layer.assetId) {
        const newAssetId = tokenIdMap[layer.assetId] || cardIdMap[layer.assetId];
        if (newAssetId) {
          return {
            ...layer,
            assetId: newAssetId
          };
        }
      }
      return layer;
    });

    return {
      ...comp,
      id: newCompId,
      packId: newPackId,
      layers: newLayers,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  });

  return {
    pack: importedPack,
    cards: importedCards,
    tokens: importedTokens,
    components: importedComponents,
    families: importedFamilies
  };
}

/**
 * Saves all imported pack assets directly to IndexedDB.
 * @param {Object} importedData Output of processImportedPack
 */
export async function saveImportedPack(importedData) {
  const { pack, cards, tokens, components, families } = importedData;

  // Save pack metadata
  await dbSavePack(pack);

  // Save families
  if (families) {
    for (const family of families) {
      await dbSaveFamily(family);
    }
  }

  // Save tokens
  for (const token of tokens) {
    await dbSaveToken(token);
  }

  // Save cards
  for (const card of cards) {
    await dbSaveCard(card);
  }

  // Save components
  for (const comp of components) {
    await dbSaveComponent(comp);
  }

  return pack.id;
}
