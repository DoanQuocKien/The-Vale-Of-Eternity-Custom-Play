import { MOCK_PRESETS, DEFAULT_LAYOUT } from '../utils/constants.jsx';

const DB_NAME = 'ValeOfEternityDB';
const DB_VERSION = 1;

export function openDB() {
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

export function dbGetPacks() {
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

export function dbSavePack(pack) {
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

export function dbDeletePack(packId) {
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

export function dbGetCards(packId) {
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

export function dbSaveCard(card) {
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

export function dbDeleteCard(cardId) {
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

export const DEFAULT_PACK_ID = 'starter-pack';

export async function seedDefaultData() {
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
