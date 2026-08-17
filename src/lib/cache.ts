import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'EliteCommandDB';
const DB_VERSION = 2;

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
  ai_query_cache: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('chat_history')) {
          db.createObjectStore('chat_history');
        }
        if (!db.objectStoreNames.contains('knowledge')) {
          db.createObjectStore('knowledge');
        }
        if (!db.objectStoreNames.contains('app_settings')) {
          db.createObjectStore('app_settings');
        }
        if (!db.objectStoreNames.contains('ai_query_cache')) {
          db.createObjectStore('ai_query_cache');
        }
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

