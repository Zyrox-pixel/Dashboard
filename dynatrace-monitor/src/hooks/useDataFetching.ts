import { useState, useEffect, useCallback } from 'react';
import { ApiResponse } from '../api/types';

interface FetchingState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook générique pour gérer le chargement des données
 * Permet de réutiliser la logique de chargement, d'erreurs et d'état
 */
export function useDataFetching<T>(
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