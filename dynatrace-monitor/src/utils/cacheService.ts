/**
 * Service de cache centralisé pour les requêtes API
 * Permet de stocker et récupérer des données avec une stratégie de péremption
 */

// Types pour le cache
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  // Durée de vie en secondes
  ttl?: number;
  // Identifiant unique pour cette requête (utilisé pour l'invalidation ciblée)
  category?: string;
}

// Durées de cache par défaut (en secondes)
export const CACHE_DURATIONS = {
  // Données critiques - courte durée
  PROBLEMS: 60, // 1 minute
  PROBLEMS_72H: 300, // 5 minutes
  
  // Données semi-critiques - durée moyenne
  SUMMARY: 300, // 5 minutes
  MANAGEMENT_ZONES: 600, // 10 minutes
  
  // Données non-critiques - longue durée
  HOSTS: 900, // 15 minutes
  SERVICES: 900, // 15 minutes
  PROCESSES: 1800, // 30 minutes
  
  // Comptages - durée très longue
  COUNTS: 3600, // 1 heure
  
  // Durée par défaut
  DEFAULT: 300 // 5 minutes
};

class CacheService {
  private cache: Map<string, CacheItem<any>>;
  private static instance: CacheService;

  private constructor() {
    this.cache = new Map();
    
    // Log pour le debugging
    console.log('[CacheService] Initialized');
  }

  /**
   * Obtenir l'instance unique du service de cache (Singleton)
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Mettre en cache des données avec une clé et des options
   * @param key Clé unique pour identifier les données
   * @param data Données à mettre en cache
   * @param options Options de cache (durée de vie, catégorie)
   */
  public set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const timestamp = Date.now();
    const ttl = options.ttl || CACHE_DURATIONS.DEFAULT;
    const expiresAt = timestamp + (ttl * 1000);
    
    // Créer un item de cache avec les métadonnées
    const cacheItem: CacheItem<T> = {
      data,
      timestamp,
      expiresAt
    };
    
    // Stocker dans le cache
    this.cache.set(key, cacheItem);
    
    // Log pour le debugging
    console.log(`[CacheService] Set: ${key}, expires in ${ttl}s`);
  }

  /**
   * Récupérer des données du cache
   * @param key Clé unique pour identifier les données
   * @returns Les données si elles existent et ne sont pas expirées, null sinon
   */
  public get<T>(key: string): T | null {
    // Vérifier si la clé existe dans le cache
    if (!this.cache.has(key)) {
      console.log(`[CacheService] Miss: ${key} (not found)`);
      return null;
    }
    
    const cacheItem = this.cache.get(key) as CacheItem<T>;
    const now = Date.now();
    
    // Vérifier si les données sont expirées
    if (now > cacheItem.expiresAt) {
      console.log(`[CacheService] Miss: ${key} (expired)`);
      // Supprimer les données expirées
      this.cache.delete(key);
      return null;
    }
    
    // Calculer l'âge des données en secondes
    const ageInSeconds = Math.round((now - cacheItem.timestamp) / 1000);
    console.log(`[CacheService] Hit: ${key} (age: ${ageInSeconds}s)`);
    
    return cacheItem.data;
  }

  /**
   * Vérifier si une clé existe dans le cache et n'est pas expirée
   * @param key Clé à vérifier
   * @returns true si la clé existe et n'est pas expirée, false sinon
   */
  public has(key: string): boolean {
    if (!this.cache.has(key)) {
      return false;
    }
    
    const cacheItem = this.cache.get(key);
    const now = Date.now();
    
    return now <= cacheItem!.expiresAt;
  }

  /**
   * Supprimer une entrée spécifique du cache
   * @param key Clé à supprimer
   */
  public delete(key: string): void {
    this.cache.delete(key);
    console.log(`[CacheService] Deleted: ${key}`);
  }

  /**
   * Supprimer toutes les entrées d'une catégorie spécifique
   * @param category Catégorie à supprimer
   */
  public invalidateCategory(category: string): void {
    // Trouver toutes les clés qui commencent par la catégorie
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${category}:`)) {
        keysToDelete.push(key);
      }
    });
    
    // Supprimer toutes les clés trouvées
    keysToDelete.forEach(key => this.cache.delete(key));
    
    console.log(`[CacheService] Invalidated category: ${category} (${keysToDelete.length} entries)`);
  }

  /**
   * Vider complètement le cache
   */
  public clear(): void {
    this.cache.clear();
    console.log('[CacheService] Cache cleared');
  }

  /**
   * Obtenir des statistiques sur le cache
   */
  public getStats(): { size: number, categories: Record<string, number> } {
    const categories: Record<string, number> = {};
    
    // Compter le nombre d'entrées par catégorie
    this.cache.forEach((_, key) => {
      const category = key.split(':')[0];
      categories[category] = (categories[category] || 0) + 1;
    });
    
    return {
      size: this.cache.size,
      categories
    };
  }
}

// Exporter l'instance unique du service de cache
export default CacheService.getInstance();
