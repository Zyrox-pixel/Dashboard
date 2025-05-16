import { useState, useEffect, useCallback } from 'react';
import { ApiResponse } from '../api/types';
import { cacheService } from '../utils/cache';

interface FetchingState {
  isLoading: boolean;
  error: string | null;
}

interface UseDataFetchingOptions<T> {
  fetcher: () => Promise<T>; // La fonction qui fait l'appel API réel
  cacheKeyParts: Array<string | number | Record<string, any>>; // Pour générer la clé de cache
  ttlMs?: number; // TTL spécifique pour cette donnée
}

/**
 * Hook amélioré pour gérer le chargement des données avec cache
 */
export function useDataFetching<T>({ fetcher, cacheKeyParts, ttlMs }: UseDataFetchingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  // flag pour le Volet 2 (refresh en arrière-plan)
  const [isServedFromCache, setIsServedFromCache] = useState(false); 

  const cacheKey = cacheService.generateKey(cacheKeyParts);

  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    setIsServedFromCache(false);

    if (!forceRefresh) {
      const cachedData = cacheService.get<T>(cacheKey);
      if (cachedData !== null) {
        setData(cachedData);
        setLoading(false);
        setError(null);
        setIsServedFromCache(true); // Marquer que c'est servi du cache
        
        // Lancement du rafraîchissement en arrière-plan
        (async () => {
          if (document.hidden) return; // Ne pas rafraîchir si l'onglet n'est pas visible

          try {
            console.log(`Background refreshing: ${cacheKey}`);
            const freshData = await fetcher(); // fetcher est la fonction d'appel API
            // Optionnel: comparer freshData avec cachedData pour éviter des écritures inutiles
            // if (!isEqual(freshData, cachedData)) { // isEqual est une fonction de comparaison profonde
            cacheService.set(cacheKey, freshData, ttlMs);
            // Optionnel: Mettre à jour l'état pour refléter les nouvelles données immédiatement
            // setData(freshData); // Ceci actualisera l'UI. A évaluer selon l'impact UX.
            // }
          } catch (backgroundError) {
            console.warn(`Background refresh failed for ${cacheKey}:`, backgroundError);
            // Pas d'impact sur l'utilisateur, l'erreur est juste logguée.
          }
        })();
        
        return; // Données du cache utilisées, pas besoin d'appeler l'API pour l'instant
      }
    }

    // Si pas dans le cache, ou si forceRefresh est vrai
    try {
      const result = await fetcher();
      setData(result);
      cacheService.set(cacheKey, result, ttlMs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch data'));
      // Ne pas effacer les données précédentes en cas d'erreur de rafraîchissement ?
      // setData(null); // Optionnel : vider les données en cas d'erreur
    } finally {
      setLoading(false);
    }
  }, [fetcher, cacheKey, ttlMs]); // Ajouter les dépendances

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData est maintenant stable grâce à useCallback

  const refreshData = () => fetchData(true); // Fonction pour forcer le refresh

  return { data, error, loading, refreshData, isServedFromCache };
}

/**
 * Hook original maintenu pour rétrocompatibilité
 * Hook générique pour gérer le chargement des données
 * Permet de réutiliser la logique de chargement, d'erreurs et d'état
 */
export function useDataFetchingLegacy<T>(
  fetchFunction: () => Promise<ApiResponse<T>>,
  initialData: T,
  autoFetch: boolean = true
): [T, FetchingState, () => Promise<void>] {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchFunction();
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setData(response.data as T);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return [data, { isLoading, error }, fetchData];
}

/**
 * Hook spécialisé pour gérer le chargement multiple de données en parallèle
 */
export function useMultipleFetching<T extends Record<string, any>>(
  fetchFunctions: Record<keyof T, () => Promise<ApiResponse<any>>>,
  initialData: T
): [T, FetchingState, () => Promise<void>] {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Exécuter toutes les requêtes en parallèle
      const fetchPromises = Object.entries(fetchFunctions).map(
        ([key, fetchFn]) => fetchFn().then(res => ({ key, response: res }))
      );
      
      const results = await Promise.all(fetchPromises);
      
      // Traiter les résultats
      const newData = { ...initialData };
      let hasError = false;
      
      for (const { key, response } of results) {
        if (response.error) {
          hasError = true;
        } else if (response.data) {
          // Utilisation d'assertion de type pour éviter l'erreur d'indexation
          (newData as any)[key] = response.data;
        }
      }
      
      setData(newData);
      
      if (hasError) {
        setError('Certaines données n\'ont pas pu être chargées');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunctions, initialData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return [data, { isLoading, error }, fetchAllData];
}

/**
 * Hook pour gérer la sélection d'onglets et de filtres
 */
export function useTabsAndFilters(defaultTab: string = 'hosts') {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtersVisible, setFiltersVisible] = useState<boolean>(false);
  const [selectedFilters, setSelectedFilters] = useState<any[]>([]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const toggleFilters = useCallback(() => {
    setFiltersVisible(prev => !prev);
  }, []);

  const handleFilterChange = useCallback((filters: any[]) => {
    setSelectedFilters(filters);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedFilters([]);
  }, []);

  return {
    activeTab,
    searchTerm,
    filtersVisible,
    selectedFilters,
    handleTabChange,
    handleSearch,
    toggleFilters,
    handleFilterChange,
    clearFilters
  };
}