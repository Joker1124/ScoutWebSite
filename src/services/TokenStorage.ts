import { openDB, IDBPDatabase } from 'idb';

/**
 * نظام تخزين التوكنات المتعدد الطبقات
 * يدعم: Memory, LocalStorage, IndexedDB
 */
const DB_NAME = 'KashafaAuthDB';
const STORE_NAME = 'tokens';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_DATA_KEY = 'userData';

class TokenStorage {
  private memoryCache: Record<string, string | null> = {
    [ACCESS_TOKEN_KEY]: null,
    [REFRESH_TOKEN_KEY]: null,
    [USER_DATA_KEY]: null,
  };

  private dbPromise: Promise<IDBPDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.dbPromise = openDB(DB_NAME, 1, {
        upgrade(db) {
          db.createObjectStore(STORE_NAME);
        },
      });
    }
  }

  private async setIDB(key: string, value: any) {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    await db.put(STORE_NAME, value, key);
  }

  private async getIDB(key: string) {
    if (!this.dbPromise) return null;
    const db = await this.dbPromise;
    return await db.get(STORE_NAME, key);
  }

  private async deleteIDB(key: string) {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, key);
  }

  async saveTokens(access: string, refresh: string, user: any) {
    const userStr = JSON.stringify(user);
    
    // 1. Memory
    this.memoryCache[ACCESS_TOKEN_KEY] = access;
    this.memoryCache[REFRESH_TOKEN_KEY] = refresh;
    this.memoryCache[USER_DATA_KEY] = userStr;

    // 2. LocalStorage
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    localStorage.setItem(USER_DATA_KEY, userStr);

    // 3. IndexedDB (لضمان البقاء في WebView)
    await this.setIDB(ACCESS_TOKEN_KEY, access);
    await this.setIDB(REFRESH_TOKEN_KEY, refresh);
    await this.setIDB(USER_DATA_KEY, userStr);
  }

  async getAccessToken(): Promise<string | null> {
    return this.memoryCache[ACCESS_TOKEN_KEY] || 
           localStorage.getItem(ACCESS_TOKEN_KEY) || 
           await this.getIDB(ACCESS_TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    return this.memoryCache[REFRESH_TOKEN_KEY] || 
           localStorage.getItem(REFRESH_TOKEN_KEY) || 
           await this.getIDB(REFRESH_TOKEN_KEY);
  }

  async getUserData(): Promise<any | null> {
    const data = this.memoryCache[USER_DATA_KEY] || 
                 localStorage.getItem(USER_DATA_KEY) || 
                 await this.getIDB(USER_DATA_KEY);
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async clearAll() {
    this.memoryCache = { [ACCESS_TOKEN_KEY]: null, [REFRESH_TOKEN_KEY]: null, [USER_DATA_KEY]: null };
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    
    if (this.dbPromise) {
      const db = await this.dbPromise;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await tx.store.clear();
      await tx.done;
    }
  }
}

export const tokenStorage = new TokenStorage();
