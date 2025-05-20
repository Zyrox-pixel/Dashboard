import { useState, useEffect, useCallback, useRef } from 'react';
import { Host, ApiResponse } from '../api/types';
import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';

// Cache keys
const HOSTS_CACHE_KEY = 'hosts_data_cache_v3'; // Incrémenté pour forcer la réinitialisation du cache
const MZ_ADMIN_VERSION_KEY = 'mz_admin_version'; // Pour suivre les changements de configuration
const FIRST_LOAD_DONE_KEY = 'hosts_first_load_done'; // Pour suivre si le premier chargement a été effectué

/**
 * Hook personnalisé pour gérer les données des hosts
 * Implémente une stratégie de mise en cache durable pour les données
 * La MZ admin est récupérée depuis le backend (configurée dans le fichier .env)
 * Le chargement n'est effectué qu'une seule fois et uniquement rafraîchi manuellement
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

      // 2. Continuer directement à la récupération depuis le backend
      // N'utilisez PAS le cache pour la valeur de MZ_ADMIN - toujours récupérer depuis le backend
      // Seulement le cache des données de hosts est conservé
      
      // Sinon, essayer de récupérer depuis le backend avec réessais
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          // Utiliser le bon endpoint pour récupérer la MZ admin
          const response = await api.get<{mzadmin: string}>('/mz-admin', {
            params: { nocache: Date.now() }
          }, false);
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
        
        // On utilise le cache uniquement pour les données des hosts, pas pour la MZ
        if (parsedData.hosts && Array.isArray(parsedData.hosts) && parsedData.hosts.length > 0) {
          console.log(`Utilisation des données en cache pour ${parsedData.hosts.length} hosts`);
          
          setHosts(parsedData.hosts);
          setTotalHosts(parsedData.total || parsedData.hosts.length);
          setLastRefreshTime(new Date(parsedData.timestamp));
          
          // Ne pas mettre à jour la MZ Admin depuis le cache
          // La valeur de MZ Admin doit toujours venir du backend, pas du cache
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Erreur lors du chargement du cache:', error);
      return false;
    }
  }, []);

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

  // Fonction pour vérifier si le premier chargement a déjà été effectué
  const isFirstLoadDone = useCallback(() => {
    return localStorage.getItem(FIRST_LOAD_DONE_KEY) === 'true';
  }, []);

  // Fonction pour marquer le premier chargement comme effectué
  const markFirstLoadDone = useCallback(() => {
    localStorage.setItem(FIRST_LOAD_DONE_KEY, 'true');
  }, []);

  // Effet pour charger la configuration et les données dès que l'utilisateur arrive sur la page
  useEffect(() => {
    console.log('Initialisation du chargement automatique des hosts dès l\'arrivée sur la page');
    const loadData = async () => {
      // IMPORTANT: Toujours récupérer d'abord la config mzadmin depuis le backend
      // pour garantir qu'on a la valeur la plus récente du .env
      const loadedMzAdmin = await fetchMzAdminConfig();
      
      // Après avoir récupéré la MZ du backend, vérifier si on a un cache pour les hosts
      const cacheLoaded = loadFromCache();
      
      // Vérifier si c'est le premier chargement
      const firstLoadDone = isFirstLoadDone();
      
      if (!firstLoadDone) {
        // Premier chargement: charger depuis l'API si MZ admin est configurée et pas de cache
        console.log('Premier chargement des données hosts');
        if (loadedMzAdmin && !cacheLoaded) {
          await refreshData(true);
        } else if (!loadedMzAdmin && !cacheLoaded) {
          refreshData(true);
        }
        
        // Marquer le premier chargement comme effectué même si nous avons utilisé le cache
        markFirstLoadDone();
      } else if (cacheLoaded) {
        // Si ce n'est pas le premier chargement et que nous avons des données en cache,
        // utiliser uniquement le cache sans rafraîchissement automatique
        console.log('Utilisation des données en cache sans rafraîchissement automatique');
      } else if (loadedMzAdmin && !cacheLoaded) {
        // Si pas de données en cache mais MZ admin configurée, 
        // charger les données (cas rare où le cache aurait été effacé)
        console.log('Cache non trouvé, chargement des données depuis l\'API');
        await refreshData(true);
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
  }, [fetchMzAdminConfig, loadFromCache, refreshData, isFirstLoadDone, markFirstLoadDone]);
  
  // Effet secondaire pour sauvegarder les données dans le cache
  useEffect(() => {
    // Si nous avons des hosts en mémoire, sauvegardons-les dans le cache
    if (hosts.length > 0 && mzAdmin) {
      saveToCache(hosts);
      
      // Sauvegarder la version de MZ pour référence future
      const previousMzVersion = localStorage.getItem(MZ_ADMIN_VERSION_KEY);
      if (previousMzVersion !== mzAdmin) {
        console.log(`Mise à jour de la référence MZ Admin: ${previousMzVersion} -> ${mzAdmin}`);  
        localStorage.setItem(MZ_ADMIN_VERSION_KEY, mzAdmin);
      }
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
    refreshData,
    isFirstLoadDone
  };
}
