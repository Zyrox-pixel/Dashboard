import { useEffect, useRef, useState } from 'react';
import { Problem } from '../api/types';
import { api } from '../api';

// Clés pour le stockage local des statuts préchargés
const CACHE_KEYS = {
  vfg: 'zone_status_vfg_cache',
  vfe: 'zone_status_vfe_cache',
  dct: 'zone_status_dct_cache',
  sec: 'zone_status_sec_cache'
};

/**
 * Hook spécialisé pour le préchargement des statuts de Management Zones
 * Résout spécifiquement le problème de latence des cadres rouges
 */
export function useZoneStatusPreloader() {
  // État pour suivre le statut du préchargement
  const [isPreloaded, setIsPreloaded] = useState<boolean>(false);
  
  // Référence au préchargement en cours
  const preloadingRef = useRef<boolean>(false);
  
  // Référence aux minuteries
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stockage global des statuts de zones pour tous les types de dashboard
  const statusCacheRef = useRef<{
    vfg: Record<string, { problemCount: number, status: 'warning' | 'healthy' }>,
    vfe: Record<string, { problemCount: number, status: 'warning' | 'healthy' }>,
    dct: Record<string, { problemCount: number, status: 'warning' | 'healthy' }>,
    sec: Record<string, { problemCount: number, status: 'warning' | 'healthy' }>
  }>({
    vfg: {},
    vfe: {},
    dct: {},
    sec: {}
  });
  
  /**
   * Fonction pour précharger les statuts des zones - peut être appelée immédiatement
   * pour préparer les statuts avant navigation
   */
  const preloadZoneStatuses = async (force: boolean = false) => {
    // Éviter les préchargements multiples simultanés
    if (preloadingRef.current && !force) return;
    
    preloadingRef.current = true;
    console.log(`Préchargement des statuts de zones (force=${force})`);
    
    try {
      // Récupérer les problèmes pour tous les types de dashboard en parallèle
      const [vfgProblemsResponse, vfeProblemsResponse, dctProblemsResponse, secProblemsResponse] = await Promise.all([
        api.getProblems("OPEN", "-60d", "vfg", force),
        api.getProblems("OPEN", "-60d", "vfe", force),
        api.getProblems("OPEN", "-60d", "dct", force),
        api.getProblems("OPEN", "-60d", "sec", force)
      ]);
      
      // Extraire les données
      const vfgProblemData = vfgProblemsResponse.error ? [] : (vfgProblemsResponse.data || []);
      const vfeProblemData = vfeProblemsResponse.error ? [] : (vfeProblemsResponse.data || []);
      const dctProblemData = dctProblemsResponse.error ? [] : (dctProblemsResponse.data || []);
      const secProblemData = secProblemsResponse.error ? [] : (secProblemsResponse.data || []);
      
      // Cache in-memory pour un accès rapide
      const vfgZoneStatus: Record<string, { problemCount: number, status: 'warning' | 'healthy' }> = {};
      const vfeZoneStatus: Record<string, { problemCount: number, status: 'warning' | 'healthy' }> = {};
      const dctZoneStatus: Record<string, { problemCount: number, status: 'warning' | 'healthy' }> = {};
      const secZoneStatus: Record<string, { problemCount: number, status: 'warning' | 'healthy' }> = {};
      
      // Traiter les problèmes VFG et créer un index par zone
      vfgProblemData.forEach(problem => {
        if (problem.zone) {
          if (!vfgZoneStatus[problem.zone]) {
            vfgZoneStatus[problem.zone] = { problemCount: 0, status: 'healthy' };
          }
          vfgZoneStatus[problem.zone].problemCount++;
          vfgZoneStatus[problem.zone].status = 'warning';
        }
      });
      
      // Traiter les problèmes VFE et créer un index par zone
      vfeProblemData.forEach(problem => {
        if (problem.zone) {
          if (!vfeZoneStatus[problem.zone]) {
            vfeZoneStatus[problem.zone] = { problemCount: 0, status: 'healthy' };
          }
          vfeZoneStatus[problem.zone].problemCount++;
          vfeZoneStatus[problem.zone].status = 'warning';
        }
      });
      
      // Traiter les problèmes DCT et créer un index par zone
      dctProblemData.forEach(problem => {
        if (problem.zone) {
          if (!dctZoneStatus[problem.zone]) {
            dctZoneStatus[problem.zone] = { problemCount: 0, status: 'healthy' };
          }
          dctZoneStatus[problem.zone].problemCount++;
          dctZoneStatus[problem.zone].status = 'warning';
        }
      });
      
      // Traiter les problèmes SEC et créer un index par zone
      secProblemData.forEach(problem => {
        if (problem.zone) {
          if (!secZoneStatus[problem.zone]) {
            secZoneStatus[problem.zone] = { problemCount: 0, status: 'healthy' };
          }
          secZoneStatus[problem.zone].problemCount++;
          secZoneStatus[problem.zone].status = 'warning';
        }
      });
      
      // Mettre à jour le cache en mémoire
      statusCacheRef.current = {
        ...statusCacheRef.current,
        vfg: vfgZoneStatus,
        vfe: vfeZoneStatus,
        dct: dctZoneStatus,
        sec: secZoneStatus
      };
      
      // Sauvegarder dans localStorage pour persistance
      localStorage.setItem(CACHE_KEYS.vfg, JSON.stringify({
        zoneStatuses: vfgZoneStatus,
        timestamp: Date.now()
      }));
      
      localStorage.setItem(CACHE_KEYS.vfe, JSON.stringify({
        zoneStatuses: vfeZoneStatus,
        timestamp: Date.now()
      }));
      
      localStorage.setItem(CACHE_KEYS.dct, JSON.stringify({
        zoneStatuses: dctZoneStatus,
        timestamp: Date.now()
      }));
      
      localStorage.setItem(CACHE_KEYS.sec, JSON.stringify({
        zoneStatuses: secZoneStatus,
        timestamp: Date.now()
      }));
      
      console.log(`Statuts préchargés: VFG=${Object.keys(vfgZoneStatus).length} zones, VFE=${Object.keys(vfeZoneStatus).length} zones, DCT=${Object.keys(dctZoneStatus).length} zones, SEC=${Object.keys(secZoneStatus).length} zones`);
      
      // Marquer comme préchargé
      setIsPreloaded(true);
      
    } catch (error) {
      console.error('Erreur lors du préchargement des statuts de zones:', error);
    } finally {
      preloadingRef.current = false;
    }
  };
  
  /**
   * Fonction pour appliquer les statuts préchargés aux Management Zones
   * Cette fonction doit être appelée au moment de la création des zones
   */
  const applyPreloadedStatuses = (zones: any[], dashboardType: 'vfg' | 'vfe' | 'dct' | 'sec') => {
    // Si pas encore préchargé, renvoyer les zones telles quelles
    if (!isPreloaded) return zones;
    
    // Récupérer les statuts préchargés
    const statusCache = statusCacheRef.current[dashboardType] || {};
    
    // Appliquer les statuts aux zones
    return zones.map(zone => {
      // Si nous avons un statut préchargé pour cette zone, l'appliquer
      if (statusCache[zone.name]) {
        return {
          ...zone,
          problemCount: statusCache[zone.name].problemCount,
          status: statusCache[zone.name].status
        };
      }
      return zone;
    });
  };
  
  /**
   * Fonction pour récupérer immédiatement les problèmes associés à une zone
   */
  const getProblemsForZone = (zoneName: string, dashboardType: 'vfg' | 'vfe' | 'dct' | 'sec'): Problem[] => {
    // Cette fonction pourrait être utilisée pour obtenir la liste des problèmes
    // spécifiques à une zone sans nouvelle requête API
    return [];
  };
  
  // Charger les données depuis localStorage au démarrage
  useEffect(() => {
    // Charger les statuts depuis localStorage lors de l'initialisation
    try {
      const vfgCachedData = localStorage.getItem(CACHE_KEYS.vfg);
      const vfeCachedData = localStorage.getItem(CACHE_KEYS.vfe);
      
      let vfgStatusCache = {};
      let vfeStatusCache = {};
      let needsRefresh = true;
      
      if (vfgCachedData) {
        const parsedData = JSON.parse(vfgCachedData);
        // Vérifier que les données ne sont pas trop anciennes (30 min)
        if (parsedData.timestamp && Date.now() - parsedData.timestamp < 30 * 60 * 1000) {
          vfgStatusCache = parsedData.zoneStatuses || {};
          needsRefresh = false;
        }
      }
      
      if (vfeCachedData) {
        const parsedData = JSON.parse(vfeCachedData);
        // Vérifier que les données ne sont pas trop anciennes (30 min)
        if (parsedData.timestamp && Date.now() - parsedData.timestamp < 30 * 60 * 1000) {
          vfeStatusCache = parsedData.zoneStatuses || {};
          needsRefresh = false;
        }
      }
      
      // Mettre à jour le cache en mémoire
      statusCacheRef.current = {
        vfg: vfgStatusCache,
        vfe: vfeStatusCache,
        dct: {},
        sec: {}
      };
      
      // Si les données sont valides, marquer comme préchargé
      if (!needsRefresh && (Object.keys(vfgStatusCache).length > 0 || Object.keys(vfeStatusCache).length > 0)) {
        console.log(`Statuts de zones chargés depuis le cache local`);
        setIsPreloaded(true);
      } else {
        // Sinon, précharger immédiatement
        preloadZoneStatuses(false);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des statuts de zones:', error);
      // En cas d'erreur, précharger quand même
      preloadZoneStatuses(false);
    }
    
    // Rafraîchissement automatique toutes les 5 minutes
    refreshTimerRef.current = setInterval(() => {
      preloadZoneStatuses(false);
    }, 5 * 60 * 1000);
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);
  
  return {
    isPreloaded,
    preloadZoneStatuses,
    applyPreloadedStatuses,
    getProblemsForZone
  };
}
