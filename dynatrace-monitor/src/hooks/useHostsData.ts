import { useState, useEffect, useCallback, useRef } from 'react';
import { Host, ApiResponse } from '../api/types';
import { api } from '../api';

// Cache key for hosts data
const HOSTS_CACHE_KEY = 'hosts_data_cache';

/**
 * Hook personnalisé pour gérer les données des hosts
 * Implémente une stratégie de mise en cache durable pour les données
 * La MZ admin est récupérée depuis le backend (configurée dans le fichier .of)
 */
export function useHostsData() {
  // États pour stocker les données et le statut
  const [hosts, setHosts] = useState<Host[]>([]);
  const [totalHosts, setTotalHosts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  // État pour stocker le MZ admin actif
  const [mzAdmin, setMzAdmin] = useState<string>('');
  // État pour suivre si la configuration a été chargée
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);

  // Référence pour les requêtes en cours
  const pendingRequestRef = useRef<boolean>(false);

  // Fonction pour lire la configuration mzadmin depuis le backend ou le cache persistent
  const fetchMzAdminConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 1. D'abord, vérifier si nous avons déjà la valeur en mémoire
      if (mzAdmin) {
        console.log(`Réutilisation de la MZ Admin déjà en mémoire: ${mzAdmin}`);
        setConfigLoaded(true);
        return mzAdmin;
      }

      // 2. Ensuite, essayer de récupérer depuis le cache localStorage global
      try {
        const cachedGlobalData = localStorage.getItem(HOSTS_CACHE_KEY);
        if (cachedGlobalData) {
          const parsedData = JSON.parse(cachedGlobalData);
          if (parsedData.mzAdmin && parsedData.hosts && Array.isArray(parsedData.hosts)) {
            console.log(`Récupération de la MZ Admin depuis le cache global: ${parsedData.mzAdmin}`);
            setMzAdmin(parsedData.mzAdmin);
            setHosts(parsedData.hosts);
            setTotalHosts(parsedData.total || parsedData.hosts.length);
            setLastRefreshTime(new Date(parsedData.timestamp));
            setConfigLoaded(true);
            return parsedData.mzAdmin;
          }
        }
      } catch (cacheError) {
        console.warn('Erreur lors de la lecture du cache global:', cacheError);
        // Continue to backend fetch on cache error
      }
      
      // Sinon, essayer de récupérer depuis le backend avec réessais
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          const response = await api.getMzAdmin();
          if (response.error) {
            lastError = response.error;
            console.warn(`Tentative ${attempts}/${maxAttempts} échouée: ${response.error}`);
          } else {
            const mzAdminValue = response.data?.mzadmin || '';
            if (!mzAdminValue) {
              lastError = 'Aucune Management Zone admin configurée dans le backend.';
              console.warn(`Tentative ${attempts}/${maxAttempts}: MZ admin vide reçue`);
            } else {
              console.log(`MZ Admin récupérée depuis le backend: ${mzAdminValue}`);
              setMzAdmin(mzAdminValue);
              setConfigLoaded(true);
              return mzAdminValue;
            }
          }
          
          // Pause avant la prochaine tentative
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        } catch (attemptError) {
          lastError = attemptError;
          console.warn(`Tentative ${attempts}/${maxAttempts} échouée avec erreur:`, attemptError);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }
      
      // Toutes les tentatives ont échoué
      console.error('Erreur après plusieurs tentatives:', lastError);
      if (typeof lastError === 'string') {
        setError(lastError);
      } else {
        setError('Erreur de communication avec le backend.');
      }
      setConfigLoaded(true);
      return '';
    } catch (error) {
      console.error('Erreur globale lors de la récupération de la config MZ admin:', error);
      setError('Erreur de communication avec le backend.');
      setConfigLoaded(true);
      return '';
    } finally {
      setIsLoading(false);
    }
  }, [mzAdmin]);

  // Fonction pour sauvegarder les données dans le cache persistant
  const saveToCache = useCallback((hostsData: Host[]) => {
    try {
      // Sauvegarder les données dans le localStorage avec la MZ admin associée
      localStorage.setItem(HOSTS_CACHE_KEY, JSON.stringify({
        mzAdmin,
        hosts: hostsData,
        timestamp: Date.now(),
        total: hostsData.length
      }));
      console.log(`Données de ${hostsData.length} hosts sauvegardées dans le cache`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cache:', error);
    }
  }, [mzAdmin]);

  // Fonction pour charger les données depuis le cache
  const loadFromCache = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(HOSTS_CACHE_KEY);
      
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        
        // On utilise le cache si on a des données valides, même si la MZ est différente
        // Cela garantit que nous avons toujours quelque chose à afficher
        if (parsedData.hosts && Array.isArray(parsedData.hosts) && parsedData.hosts.length > 0) {
          console.log(`Utilisation des données en cache pour ${parsedData.hosts.length} hosts`);
          
          setHosts(parsedData.hosts);
          setTotalHosts(parsedData.total || parsedData.hosts.length);
          setLastRefreshTime(new Date(parsedData.timestamp));

          // Si la MZ en cache est différente de la MZ en mémoire mais valide, mettons à jour la MZ en mémoire
          if (parsedData.mzAdmin && (!mzAdmin || parsedData.mzAdmin !== mzAdmin)) {
            console.log(`Mise à jour de la MZ Admin depuis le cache: ${parsedData.mzAdmin}`);
            setMzAdmin(parsedData.mzAdmin);
          }
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Erreur lors du chargement du cache:', error);
      return false;
    }
  }, [mzAdmin]);

  // Fonction pour rafraîchir les données depuis l'API
  const refreshData = useCallback(async (forceRefresh: boolean = false) => {
    // Vérifier si une MZ admin est configurée
    if (!mzAdmin) {
      setError('Impossible de charger les données des hôtes. Veuillez rafraîchir la page.');
      
      // Essayer de charger depuis le cache même sans MZ admin actuelle
      try {
        const fallbackCache = localStorage.getItem(HOSTS_CACHE_KEY);
        if (fallbackCache) {
          const parsedCache = JSON.parse(fallbackCache);
          if (parsedCache.hosts && Array.isArray(parsedCache.hosts) && parsedCache.hosts.length > 0) {
            console.log('Utilisation des données en cache de secours');
            setHosts(parsedCache.hosts);
            setTotalHosts(parsedCache.total || parsedCache.hosts.length);
            setLastRefreshTime(new Date(parsedCache.timestamp));
            if (parsedCache.mzAdmin) {
              setMzAdmin(parsedCache.mzAdmin);
              return parsedCache.hosts;
            }
          }
        }
      } catch (e) {
        console.error('Erreur lors de la tentative de récupération du cache de secours:', e);
      }
      
      return null;
    }

    // Éviter les requêtes multiples simultanées
    if (pendingRequestRef.current && !forceRefresh) {
      return null;
    }

    pendingRequestRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log(`Chargement des données pour la MZ admin: ${mzAdmin}`);
      
      // Définir la MZ actuelle sur la MZ admin
      await api.setManagementZone(mzAdmin);
      
      // Récupérer les hosts pour cette MZ
      const hostsResponse: ApiResponse<Host[]> = await api.getHosts();
      
      if (hostsResponse.error) {
        throw new Error(hostsResponse.error);
      }
      
      const hostsData = hostsResponse.data || [];
      console.log(`${hostsData.length} hosts récupérés pour ${mzAdmin}`);
      
      // Mettre à jour les états
      setHosts(hostsData);
      setTotalHosts(hostsData.length);
      
      // Marquer le moment du rafraîchissement
      const refreshTime = new Date();
      setLastRefreshTime(refreshTime);
      
      // Sauvegarder dans le cache persistant
      saveToCache(hostsData);
      
      return hostsData;
    } catch (error) {
      console.error(`Erreur lors du chargement des hosts pour ${mzAdmin}:`, error);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
      return null;
    } finally {
      setIsLoading(false);
      pendingRequestRef.current = false;
    }
  }, [mzAdmin, saveToCache]);

  // Effet pour charger la configuration et les données au démarrage
  useEffect(() => {
    const loadData = async () => {
      // D'abord, essayer de charger depuis le cache
      // Cela permet d'afficher immédiatement des données si disponibles
      const cacheLoaded = loadFromCache();
      
      // Récupérer ensuite la config mzadmin depuis le backend
      // même si les données du cache ont été chargées
      const loadedMzAdmin = await fetchMzAdminConfig();
      
      // Si nous avons une MZ admin et pas de données en cache, charger depuis l'API
      if (loadedMzAdmin && !cacheLoaded) {
        await refreshData();
      } 
      // Si nous n'avons pas de MZ admin mais des données en cache, c'est ok de continuer
      // Si nous n'avons ni MZ admin ni données en cache, refreshData affichera l'erreur
      else if (!loadedMzAdmin && !cacheLoaded) {
        refreshData();
      }
    };
    
    // Exécuter loadData et l'enregistrer pour le nettoyage
    let mounted = true;
    const loadingPromise = loadData();
    
    loadingPromise.catch(err => {
      if (mounted) {
        console.error('Erreur lors du chargement des données:', err);
        setError('Impossible de charger les données des hôtes. Veuillez rafraîchir la page.');
        
        // Une dernière tentative de récupération depuis le cache en cas d'erreur
        loadFromCache();
      }
    });
    
    // Nettoyage lors du démontage
    return () => {
      mounted = false;
    };
  }, [fetchMzAdminConfig, loadFromCache, refreshData]);
  
  // Effet secondaire pour s'assurer que les données ne sont jamais perdues après le premier rendu
  useEffect(() => {
    // Si nous avons des hosts en mémoire, sauvegardons-les toujours dans le cache
    if (hosts.length > 0 && mzAdmin) {
      saveToCache(hosts);
    }
  }, [hosts, mzAdmin, saveToCache]);

  // Retourner les données et fonctions nécessaires
  return {
    hosts,
    totalHosts,
    isLoading,
    error,
    lastRefreshTime,
    mzAdmin,
    configLoaded,
    refreshData
  };
}