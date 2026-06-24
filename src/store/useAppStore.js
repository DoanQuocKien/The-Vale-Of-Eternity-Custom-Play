import { create } from 'zustand';
import { 
  dbGetPacks, 
  dbSavePack, 
  dbDeletePack, 
  dbGetCards, 
  dbSaveCard, 
  dbDeleteCard,
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
  
  // Editor State
  activeCard: null,
  
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
  }
}));
