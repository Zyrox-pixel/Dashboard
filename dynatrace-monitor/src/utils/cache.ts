const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes par défaut

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export const cacheService = {
  get: <T>(key: string): T | null => {
    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) {
      return null;
    }
    try {
      const item = JSON.parse(itemStr) as CacheEntry<T>;
      if (Date.now() > item.expiry) {
        sessionStorage.removeItem(key);
        return null;
      }
      return item.data;
    } catch (e) {
      console.error("Cache read error:", e);
      sessionStorage.removeItem(key); // Clear corrupted item
      return null;
    }
  },

  set: <T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void => {
    const item: CacheEntry<T> = {
      data,
      expiry: Date.now() + ttlMs,
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.error("Cache write error:", e); 
      // Gérer potentiellement QuotaExceededError en vidant une partie du cache ancien
    }
  },

  remove: (key: string): void => {
    sessionStorage.removeItem(key);
  },

  // Clé de cache : ongletActif_typeDeDonnee_parametresRequete(serialisés et triés)
  generateKey: (parts: Array<string | number | Record<string, any>>): string => {
    return parts.map(part => {
      if (typeof part === 'object' && part !== null) {
        return Object.keys(part).sort().map(k => `${k}=${part[k]}`).join('&');
      }
      return String(part);
    }).join('_');
  }
};