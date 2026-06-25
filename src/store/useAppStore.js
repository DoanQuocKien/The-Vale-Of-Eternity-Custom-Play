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
  DEFAULT_PACK_ID,
  seedDefaultData
} from '../services/db.js';

export const useAppStore = create((set, get) => ({
  // Navigation State
  activeTab: 'editor', // 'editor' | 'explorer'
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Data State
  packs: [],
  activePackId: DEFAULT_PACK_ID,
  explorerCards: [],
  tokens: [],

  // Editor State
  activeCard: null,
  activeToken: null,

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
  }
}));