import { create } from 'zustand';
import {
  dbGetPacks,
  dbSavePack,
  dbDeletePack,
  dbGetCards,
  dbSaveCard,
  dbDeleteCard,
  dbGetTokens,
  dbSaveToken,
  dbDeleteToken,
  dbGetComponents,
  dbSaveComponent,
  dbDeleteComponent,
  dbGetFamilies,
  dbSaveFamily,
  dbDeleteFamily,
  dbGetRulebooks,
  dbSaveRulebook,
  dbDeleteRulebook,
  DEFAULT_PACK_ID,
  seedDefaultData
} from '../services/db.js';
import { saveImportedPack } from '../utils/packSharing.js';

export const useAppStore = create((set, get) => ({
  // Navigation State
  activeTab: 'editor', // 'editor' | 'explorer'
  setActiveTab: (tab) => set({ activeTab: tab }),
  hasUnsavedChanges: false,
  setHasUnsavedChanges: (val) => set({ hasUnsavedChanges: val }),

  // Data State
  packs: [],
  activePackId: DEFAULT_PACK_ID,
  explorerCards: [],
  tokens: [],
  components: [],
  families: [],
  rulebooks: [],

  // Editor State
  activeCard: null,
  activeToken: null,
  activeComponent: null,
  activeRulebook: null,

  // Actions
  initializeApp: async () => {
    await seedDefaultData();
    const packs = await get().loadPacks();
    if (packs.length > 0) {
      const activeId = get().activePackId || DEFAULT_PACK_ID;
      const packExists = packs.some(p => p.id === activeId);
      await get().setActivePackId(packExists ? activeId : packs[0].id);
    } else {
      await get().setActivePackId(DEFAULT_PACK_ID);
    }
  },

  loadPacks: async () => {
    const packs = await dbGetPacks();
    set({ packs: packs.sort((a, b) => b.createdAt - a.createdAt) });
    return packs;
  },

  setActivePackId: async (packId) => {
    set({ activePackId: packId });
    await get().loadExplorerCards(packId);
    await get().loadTokens(packId);
    await get().loadComponents(packId);
    await get().loadFamilies(packId);
    await get().loadRulebooks(packId);
  },

  loadExplorerCards: async (packId) => {
    const idToLoad = packId || get().activePackId;
    if (!idToLoad) return;
    const cards = await dbGetCards(idToLoad);
    set({ explorerCards: cards.sort((a, b) => b.createdAt - a.createdAt) });
  },

  createNewPack: async (name) => {
    const newPack = {
      id: 'pack-' + Date.now(),
      name,
      createdAt: Date.now()
    };
    await dbSavePack(newPack);
    await get().loadPacks();
    await get().setActivePackId(newPack.id);
  },

  renamePack: async (packId, name) => {
    const packs = get().packs;
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;
    const updatedPack = { ...pack, name, updatedAt: Date.now() };
    await dbSavePack(updatedPack);
    await get().loadPacks();
  },

  importPack: async (importedData) => {
    const packId = await saveImportedPack(importedData);
    await get().loadPacks();
    await get().setActivePackId(packId);
    return packId;
  },

  deletePack: async (packId) => {
    await dbDeletePack(packId);
    const packs = await get().loadPacks();
    if (get().activePackId === packId) {
      if (packs.length > 0) {
        await get().setActivePackId(packs[0].id);
      } else {
        set({ activePackId: null, explorerCards: [] });
      }
    }
  },

  setActiveCard: (card) => set({ activeCard: card }),

  saveCard: async (cardData) => {
    const cardToSave = {
      ...cardData,
      updatedAt: Date.now()
    };
    if (!cardToSave.createdAt) cardToSave.createdAt = Date.now();
    if (!cardToSave.id) cardToSave.id = 'card-' + Date.now();

    await dbSaveCard(cardToSave);

    // Refresh explorer if we are viewing the pack this card belongs to
    if (get().activePackId === cardToSave.packId) {
      await get().loadExplorerCards(get().activePackId);
    }

    set({ activeCard: cardToSave });
    return cardToSave;
  },

  deleteCard: async (cardId) => {
    await dbDeleteCard(cardId);
    await get().loadExplorerCards(get().activePackId);
    if (get().activeCard?.id === cardId) {
      set({ activeCard: null });
    }
  },

  setActiveToken: (token) => set({ activeToken: token }),

  loadTokens: async (packId) => {
    const idToLoad = packId || get().activePackId;
    if (!idToLoad) return [];
    const tokens = await dbGetTokens(idToLoad);
    const sorted = tokens.sort((a, b) => b.createdAt - a.createdAt);
    set({ tokens: sorted });
    return sorted;
  },

  saveToken: async (tokenData) => {
    const tokenToSave = {
      ...tokenData,
      updatedAt: Date.now()
    };
    if (!tokenToSave.createdAt) tokenToSave.createdAt = Date.now();
    if (!tokenToSave.id) tokenToSave.id = 'token-' + Date.now();

    await dbSaveToken(tokenToSave);

    // Refresh tokens list
    if (get().activePackId === tokenToSave.packId) {
      await get().loadTokens(get().activePackId);
    }

    set({ activeToken: tokenToSave });
    return tokenToSave;
  },

  deleteToken: async (tokenId) => {
    await dbDeleteToken(tokenId);
    await get().loadTokens(get().activePackId);
    if (get().activeToken?.id === tokenId) {
      set({ activeToken: null });
    }
  },

  loadComponents: async (packId) => {
    const idToLoad = packId || get().activePackId;
    if (!idToLoad) return [];
    const comps = await dbGetComponents(idToLoad);
    const migrated = comps.map(c => {
      if (!c.layers || c.layers.length === 0) {
        return {
          ...c,
          layers: [
            {
              id: 'layer-draw-default',
              type: 'drawing',
              name: 'Main Drawing',
              visible: true,
              opacity: 1,
              drawingData: c.canvasData || null
            }
          ]
        };
      }
      return c;
    });
    const sorted = migrated.sort((a, b) => b.createdAt - a.createdAt);
    set({ components: sorted });
    return sorted;
  },

  setActiveComponent: (component) => {
    if (component && (!component.layers || component.layers.length === 0)) {
      component = {
        ...component,
        layers: [
          {
            id: 'layer-draw-default',
            type: 'drawing',
            name: 'Main Drawing',
            visible: true,
            opacity: 1,
            drawingData: component.canvasData || null
          }
        ]
      };
    }
    set({ activeComponent: component });
  },

  saveComponent: async (componentData) => {
    const compToSave = {
      ...componentData,
      updatedAt: Date.now()
    };
    if (!compToSave.createdAt) compToSave.createdAt = Date.now();
    if (!compToSave.id) compToSave.id = 'comp-' + Date.now();

    await dbSaveComponent(compToSave);

    if (get().activePackId === compToSave.packId) {
      await get().loadComponents(get().activePackId);
    }

    set({ activeComponent: compToSave });
    return compToSave;
  },

  deleteComponent: async (componentId) => {
    await dbDeleteComponent(componentId);
    await get().loadComponents(get().activePackId);
    if (get().activeComponent?.id === componentId) {
      set({ activeComponent: null });
    }
  },

  exportToken: async (tokenId, targetPackId) => {
    const tokens = get().tokens;
    let tokenToCopy = tokens.find(t => t.id === tokenId);
    if (!tokenToCopy) {
      const allTokens = await dbGetTokens(get().activePackId);
      tokenToCopy = allTokens.find(t => t.id === tokenId);
    }
    if (!tokenToCopy) throw new Error('Token not found');

    const copiedToken = {
      ...tokenToCopy,
      id: 'token-' + Date.now(),
      packId: targetPackId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await dbSaveToken(copiedToken);

    if (get().activePackId === targetPackId) {
      await get().loadTokens(targetPackId);
    }
    return copiedToken;
  },

  renamePack: async (packId, newName) => {
    const { dbSavePack } = await import('../services/db.js');

    // Update DB entry
    await dbSavePack({ id: packId, name: newName });

    // Refresh internal data arrays to trigger a clean top-level UI redraw
    await get().loadPacks();
  },

  loadFamilies: async (packId) => {
    const idToLoad = packId || get().activePackId;
    if (!idToLoad) return [];
    const families = await dbGetFamilies(idToLoad);
    set({ families: families || [] });
    return families;
  },

  saveFamily: async (family) => {
    const familyToSave = {
      ...family,
      packId: get().activePackId,
      updatedAt: Date.now()
    };
    if (!familyToSave.id) {
      // Generate a stable, deterministic ID from the family name so the same family
      // always maps to the same ID (avoids duplicates and broken card references)
      const slug = (familyToSave.name || 'custom')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      familyToSave.id = 'family-' + slug;
      familyToSave.createdAt = Date.now();
    }
    await dbSaveFamily(familyToSave);
    await get().loadFamilies(get().activePackId);
    return familyToSave;
  },

  deleteFamily: async (familyId) => {
    await dbDeleteFamily(familyId);
    await get().loadFamilies(get().activePackId);
  },

  saveLayoutTemplate: async (packId, variantKey, layoutObj) => {
    const packs = get().packs;
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;
    const existingTemplates = pack.layoutTemplates || {};
    const updatedPack = {
      ...pack,
      layoutTemplates: {
        ...existingTemplates,
        [variantKey]: layoutObj
      },
      updatedAt: Date.now()
    };
    await dbSavePack(updatedPack);
    await get().loadPacks();
    return updatedPack;
  },

  deleteLayoutTemplate: async (packId, variantKey) => {
    const packs = get().packs;
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;
    const existingTemplates = { ...(pack.layoutTemplates || {}) };
    delete existingTemplates[variantKey];
    const updatedPack = {
      ...pack,
      layoutTemplates: existingTemplates,
      updatedAt: Date.now()
    };
    await dbSavePack(updatedPack);
    await get().loadPacks();
    return updatedPack;
  },

  // ─── Rulebooks ────────────────────────────────────────────────────────
  loadRulebooks: async (packId) => {
    const idToLoad = packId || get().activePackId;
    if (!idToLoad) return [];
    const rulebooks = await dbGetRulebooks(idToLoad);
    const sorted = rulebooks.sort((a, b) => b.createdAt - a.createdAt);
    set({ rulebooks: sorted });
    return sorted;
  },

  saveRulebook: async (rulebook) => {
    const rulebookToSave = {
      ...rulebook,
      updatedAt: Date.now()
    };
    if (!rulebookToSave.createdAt) rulebookToSave.createdAt = Date.now();
    if (!rulebookToSave.id) rulebookToSave.id = 'rulebook-' + Date.now();

    await dbSaveRulebook(rulebookToSave);

    if (get().activePackId === rulebookToSave.packId) {
      await get().loadRulebooks(get().activePackId);
    }
    return rulebookToSave;
  },

  deleteRulebook: async (rulebookId) => {
    await dbDeleteRulebook(rulebookId);
    await get().loadRulebooks(get().activePackId);
  },

  setActiveRulebook: (rulebook) => set({ activeRulebook: rulebook }),

  // ── Copy-to-Pack actions ────────────────────────────────────────────────────

  /**
   * Copy a card to another pack, including any tokens referenced in its
   * tokenOverlays. New IDs are generated; originals are untouched.
   */
  copyCardToPack: async (card, targetPackId) => {
    const tokenOverlays = card.tokenOverlays || [];
    const uniqueTokenIds = [...new Set(tokenOverlays.map(ov => ov.tokenId).filter(Boolean))];

    // Copy each referenced token and build an ID mapping old → new
    const tokenIdMap = {};
    const sourceTokens = get().tokens;
    for (const tokenId of uniqueTokenIds) {
      const tok = sourceTokens.find(t => t.id === tokenId);
      if (!tok) continue;
      const newTokenId = 'token-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      const newToken = {
        ...tok,
        id: newTokenId,
        packId: targetPackId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await dbSaveToken(newToken);
      tokenIdMap[tokenId] = newTokenId;
    }

    // Remap overlay IDs in the card copy
    const newOverlays = tokenOverlays.map(ov => ({
      ...ov,
      instanceId: 'instance-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      tokenId: tokenIdMap[ov.tokenId] ?? ov.tokenId
    }));

    const newCard = {
      ...card,
      id: 'card-' + Date.now(),
      packId: targetPackId,
      tokenOverlays: newOverlays,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await dbSaveCard(newCard);

    if (get().activePackId === targetPackId) {
      await get().loadExplorerCards(targetPackId);
      await get().loadTokens(targetPackId);
    }
    return newCard;
  },

  /**
   * Copy a single token to another pack. Original is untouched.
   */
  copyTokenToPack: async (token, targetPackId) => {
    const newToken = {
      ...token,
      id: 'token-' + Date.now(),
      packId: targetPackId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await dbSaveToken(newToken);
    if (get().activePackId === targetPackId) {
      await get().loadTokens(targetPackId);
    }
    return newToken;
  },

  /**
   * Copy a board component to another pack. Original is untouched.
   */
  copyComponentToPack: async (comp, targetPackId) => {
    const newComp = {
      ...comp,
      id: 'component-' + Date.now(),
      packId: targetPackId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await dbSaveComponent(newComp);
    if (get().activePackId === targetPackId) {
      await get().loadComponents(targetPackId);
    }
    return newComp;
  }
}));