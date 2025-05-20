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

  // Fonction pour lire la configuration mzadmin depuis le backend avec réessais
  const fetchMzAdminConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Vérifier d'abord si nous avons déjà la valeur en mémoire
      if (mzAdmin) {
        console.log(`Réutilisation de la MZ Admin déjà en mémoire: ${mzAdmin}`);
        setConfigLoaded(true);
        return mzAdmin;
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
        
        // Vérifier que les données sont pour la bonne MZ admin
        if (parsedData.mzAdmin === mzAdmin && parsedData.hosts && Array.isArray(parsedData.hosts)) {
          console.log(`Utilisation des données en cache pour ${parsedData.hosts.length} hosts de ${mzAdmin}`);
          
          setHosts(parsedData.hosts);
          setTotalHosts(parsedData.total || parsedData.hosts.length);
          setLastRefreshTime(new Date(parsedData.timestamp));
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
      setError('Aucune Management Zone admin configurée. Vérifiez le fichier .of du backend.');
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
      // Récupérer d'abord la config mzadmin depuis le backend
      const loadedMzAdmin = await fetchMzAdminConfig();
      
      if (loadedMzAdmin) {
        // Tenter de charger depuis le cache d'abord
        const cacheLoaded = loadFromCache();
        
        // Si pas de données en cache, charger depuis l'API
        if (!cacheLoaded) {
          refreshData();
        }
      }
    };
    
    // Exécuter loadData et l'enregistrer pour le nettoyage
    let mounted = true;
    loadData().catch(err => {
      if (mounted) {
        console.error('Erreur lors du chargement des données:', err);
        setError('Erreur lors du chargement des données');
      }
    });
    
    // Nettoyage lors du démontage
    return () => {
      mounted = false;
    };
  }, [fetchMzAdminConfig, loadFromCache, refreshData]);

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