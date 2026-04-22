import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'EliteCommandDB';
const DB_VERSION = 1;

export interface CacheSchema {
  chat_history: {
    key: string;
    value: any;
  };
  knowledge: {
    key: string;
    value: any;
  };
  app_settings: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('chat_history');
        db.createObjectStore('knowledge');
        db.createObjectStore('app_settings');
      },
    });
  }
  return dbPromise;
};

export const cacheData = async (storeName: keyof CacheSchema, key: string, value: any) => {
  try {
    const db = await getDB();
    await db.put(storeName, value, key);
  } catch (error) {
    console.warn(`Local caching failed for ${storeName}:`, error);
  }
};

export const getCachedData = async (storeName: keyof CacheSchema, key: string) => {
  try {
    const db = await getDB();
    return await db.get(storeName, key);
  } catch (error) {
    console.warn(`Retrieving cached data failed for ${storeName}:`, error);
    return null;
  }
};

export const clearCache = async (storeName: keyof CacheSchema) => {
  try {
    const db = await getDB();
    await db.clear(storeName);
  } catch (error) {
    console.warn(`Clearing cache failed for ${storeName}:`, error);
  }
};
