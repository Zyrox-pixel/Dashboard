import { useState, useEffect, useRef, useCallback } from 'react';
import { Problem, ApiResponse, ProblemResponse } from '../api/types';
import { api } from '../api';

// Type pour stocker différents types de données en cache
interface DashboardCache {
  [key: string]: {
    data: any;
    timestamp: number;
  }
}

// Clés de cache par type de dashboard
const CACHE_KEYS = {
  vfg: 'dashboard_vfg_cache',
  vfe: 'dashboard_vfe_cache',
  vfp: 'dashboard_vfp_cache',
  vfa: 'dashboard_vfa_cache',
  detection: 'dashboard_detection_cache',
  security: 'dashboard_security_cache',
  unified: 'dashboard_unified_cache'
};

// Durée de vie du cache en millisecondes (5 minutes)
const CACHE_LIFETIME = 5 * 60 * 1000;

/**
 * Hook personnalisé pour gérer le cache des tableaux de bord
 * Permet de charger les données une seule fois, de les mettre à jour automatiquement
 * et de les récupérer instantanément depuis le cache lors des visites ultérieures
 */
export function useDashboardCache(dashboardType: 'vfg' | 'vfe' | 'vfp' | 'vfa' | 'detection' | 'security' | 'unified') {
  // États pour stocker les données et le statut de chargement
  const [activeProblems, setActiveProblems] = useState<Problem[]>([]);
  const [recentProblems, setRecentProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  // Référence pour suivre si le chargement initial a été effectué
  const initialLoadCompletedRef = useRef<boolean>(false);
  
  // Référence pour la minuterie d'auto-rafraîchissement
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Référence pour les requêtes en cours pour éviter les doubles appels
  const pendingRequestRef = useRef<boolean>(false);

  // Fonction pour sauvegarder les données dans le cache local
  const saveToCache = useCallback((activeData: Problem[], recentData: Problem[], managementZonesStatus?: any) => {
    try {
      const cacheKey = CACHE_KEYS[dashboardType];
      const dataToCache = {
        activeProblems: activeData,
        recentProblems: recentData,
        managementZonesStatus: managementZonesStatus || {},
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
      console.log(`Données ${dashboardType} sauvegardées dans le cache`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cache:', error);
    }
  }, [dashboardType]);

  // Fonction pour mettre à jour les Management Zones avec les problèmes actifs
  const updateManagementZonesWithProblems = useCallback((problems: Problem[]) => {
    // Cette fonction sera appelée via l'AppContext qui gère les Management Zones
    // Elle est exposée pour permettre une synchronisation avec les données de problèmes
    console.log(`Exposing ${problems.length} problems for management zone updates`);
    
    // Note: On ne peut pas mettre à jour les MZs directement ici car elles sont gérées par AppContext
    // Cette fonction sera utilisée par les consommateurs du hook
    return problems;
  }, []);

  // Fonction pour charger les données depuis le cache local
  const loadFromCache = useCallback(() => {
    try {
      const cacheKey = CACHE_KEYS[dashboardType];
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        
        // Vérifier que les données ne sont pas trop anciennes
        if (parsedData.timestamp && Date.now() - parsedData.timestamp < CACHE_LIFETIME) {
          console.log(`Utilisation des données en cache pour ${dashboardType}`);
          
          if (parsedData.activeProblems && parsedData.activeProblems.length > 0) {
            setActiveProblems(parsedData.activeProblems);
          }
          
          if (parsedData.recentProblems && parsedData.recentProblems.length > 0) {
            setRecentProblems(parsedData.recentProblems);
          }
          
          // Charger les statuts des management zones à partir du cache
          const managementZonesStatus = parsedData.managementZonesStatus || {};
          if (Object.keys(managementZonesStatus).length > 0) {
            console.log(`Statuts des zones chargés depuis le cache pour ${dashboardType}`);
            // Exposer immédiatement les statuts des zones pour être utilisés par les consommateurs
            updateManagementZonesWithProblems(parsedData.activeProblems || []);
          }
          
          setLastRefreshTime(new Date(parsedData.timestamp));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Erreur lors du chargement du cache:', error);
      return false;
    }
  }, [dashboardType, updateManagementZonesWithProblems]);

  // Type pour le statut des management zones
  interface ManagementZoneStatus {
    count: number;
    status: "warning" | "healthy";
  }

  // Fonction de transformation des problèmes bruts en format Problem
  const transformProblemData = useCallback((problem: ProblemResponse): Problem => {
    // Extraire le nom de l'hôte à partir des entités impactées (priorité)
    let hostName = '';
    
    // PRIORITÉ 1: Utiliser directement impactedEntities
    if (problem.impactedEntities && Array.isArray(problem.impactedEntities)) {
      const hostEntity = problem.impactedEntities.find(entity => 
        entity.entityId && entity.entityId.type === 'HOST' && entity.name);
      if (hostEntity) {
        hostName = hostEntity.name;
      }
    }
    
    // PRIORITÉ 2: Si pas trouvé, utiliser le champ host ou impacted s'ils existent
    if (!hostName) {
      if (problem.host && problem.host !== "Non spécifié") {
        hostName = problem.host;
      } else if (problem.impacted && problem.impacted !== "Non spécifié") {
        hostName = problem.impacted;
      }
    }
    
    return {
      id: problem.id || `PROB-${Math.random().toString(36).substr(2, 9)}`,
      title: problem.title || "Problème inconnu",
      code: problem.id ? problem.id.substring(0, 7) : "UNKNOWN",
      subtitle: `${problem.zone || "Non spécifié"} - Impact: ${problem.impact || "INCONNU"}`,
      time: problem.start_time ? `Depuis ${problem.start_time}` : "Récent",
      type: problem.impact === "INFRASTRUCTURE" ? "Problème d'Infrastructure" : "Problème de Service",
      status: problem.status === "OPEN" ? "critical" : "warning",
      impact: problem.impact === "INFRASTRUCTURE" ? "ÉLEVÉ" : problem.impact === "SERVICE" ? "MOYEN" : "FAIBLE",
      zone: problem.zone || "Non spécifié",
      servicesImpacted: problem.affected_entities ? problem.affected_entities.toString() : "0",
      dt_url: problem.dt_url || "#",
      duration: problem.duration || "",
      resolved: problem.resolved || false,
      host: hostName,
      impacted: hostName,
      impactedEntities: problem.impactedEntities,
      rootCauseEntity: problem.rootCauseEntity
    };
  }, []);


  // Fonction pour rafraîchir les données depuis l'API
  const refreshData = useCallback(async (force: boolean = false, customTimeframe?: string, forceBackendReload?: boolean) => {
    // Éviter les requêtes multiples simultanées
    if (pendingRequestRef.current && !force) {
      return;
    }

    pendingRequestRef.current = true;
    setIsLoading(true);
    setError(null);
    
    // Si on force le rechargement depuis le backend, effacer les caches locaux
    if (forceBackendReload) {
      console.log("Forçage du rechargement complet depuis le backend - nettoyage des caches locaux");
      // Nettoyer les caches localStorage et sessionStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('dashboard_') || key.includes('_cache')) {
          localStorage.removeItem(key);
        }
      });
      
      // Forcer le paramètre force à true pour s'assurer que l'API ignre son cache
      force = true;
    }

    try {
      console.log(`Rafraîchissement des données ${dashboardType}${force ? ' (forcé)' : ''}${customTimeframe ? ` avec période ${customTimeframe}` : ''}`);
      
      // Récupération différente des données selon le type de dashboard
      let activeProblemsData: ProblemResponse[] = [];
      let problems72hData: ProblemResponse[] = [];
      
      // Récupérer la timeframe depuis le sessionStorage si aucune n'est fournie
      const timeframe = customTimeframe || sessionStorage.getItem('lastTimeframe') || "-72h";
      
      if (dashboardType === 'unified') {
        // Pour l'onglet unifié (VFG + VFE), combiner les résultats des deux tableaux de bord
        const [vfgActiveResponse, vfeActiveResponse, vfgRecent, vfeRecent] = await Promise.all([
          api.getProblems("OPEN", "-60d", "vfg", force),
          api.getProblems("OPEN", "-60d", "vfe", force),
          api.getProblems72h("vfg", undefined, force, timeframe),
          api.getProblems72h("vfe", undefined, force, timeframe)
        ]);
        
        // Combiner et dédupliquer les problèmes actifs
        const vfgActiveData = vfgActiveResponse.error ? [] : (vfgActiveResponse.data || []);
        const vfeActiveData = vfeActiveResponse.error ? [] : (vfeActiveResponse.data || []);
        const combinedActiveProblems = [...vfgActiveData, ...vfeActiveData];
        
        // Dédupliquer par ID
        const uniqueActiveIds = new Set();
        activeProblemsData = combinedActiveProblems.filter(problem => {
          if (!problem.id || uniqueActiveIds.has(problem.id)) return false;
          uniqueActiveIds.add(problem.id);
          return true;
        });
        
        // Combiner et dédupliquer les problèmes avec la période spécifiée
        const vfgRecentData = vfgRecent.error ? [] : (vfgRecent.data || []);
        const vfeRecentData = vfeRecent.error ? [] : (vfeRecent.data || []);
        const combinedRecentProblems = [...vfgRecentData, ...vfeRecentData];
        
        // Dédupliquer par ID
        const uniqueRecentIds = new Set();
        problems72hData = combinedRecentProblems.filter(problem => {
          if (!problem.id || uniqueRecentIds.has(problem.id)) return false;
          uniqueRecentIds.add(problem.id);
          return true;
        });
        
        console.log(`Problèmes actifs unifiés: ${activeProblemsData.length} (VFG: ${vfgActiveData.length}, VFE: ${vfeActiveData.length})`);
        console.log(`Problèmes récents unifiés: ${problems72hData.length} (VFG: ${vfgRecentData.length}, VFE: ${vfeRecentData.length})`);
      } else {
        // Pour les tableaux de bord spécifiques (VFG ou VFE)
        const activeProblemsResponse = await api.getProblems("OPEN", "-60d", dashboardType, force);
        const problems72hResponse = await api.getProblems72h(dashboardType, undefined, force, timeframe);
        
        // Extraire les données
        activeProblemsData = activeProblemsResponse.error ? [] : (activeProblemsResponse.data || []);
        problems72hData = problems72hResponse.error ? [] : (problems72hResponse.data || []);
        
        console.log(`Problèmes ${dashboardType}: actifs=${activeProblemsData.length}, récents(${timeframe})=${problems72hData.length}`);
      }
      
      // Transformer et mettre à jour les problèmes actifs
      const transformedActiveProblems = activeProblemsData.map(transformProblemData);
      setActiveProblems(transformedActiveProblems);
      
      // Transformer et mettre à jour les problèmes récents
      const transformedRecentProblems = problems72hData.map(transformProblemData);
      setRecentProblems(transformedRecentProblems);
      
      // Marquer le moment du rafraîchissement
      const refreshTime = new Date();
      setLastRefreshTime(refreshTime);
      
      // Préparer les données de status des management zones pour le cache
      const managementZonesStatus: Record<string, ManagementZoneStatus> = {};
      transformedActiveProblems.forEach(problem => {
        if (problem.zone) {
          if (!managementZonesStatus[problem.zone]) {
            managementZonesStatus[problem.zone] = { count: 0, status: "warning" };
          }
          managementZonesStatus[problem.zone].count += 1;
        }
      });
      
      // Sauvegarder les données dans le cache, y compris les statuts des zones
      saveToCache(transformedActiveProblems, transformedRecentProblems, managementZonesStatus);
      
      // Marquer que le chargement initial est terminé
      initialLoadCompletedRef.current = true;
      
      return {
        activeProblems: transformedActiveProblems,
        recentProblems: transformedRecentProblems
      };
    } catch (error) {
      console.error(`Erreur lors du rafraîchissement des données ${dashboardType}:`, error);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
      return null;
    } finally {
      setIsLoading(false);
      pendingRequestRef.current = false;
    }
  }, [dashboardType, saveToCache, transformProblemData]);

  // Effet pour configurer le chargement initial et le rafraîchissement automatique
  useEffect(() => {
    // Fonction de chargement initial
    const setupDashboard = async () => {
      console.log(`Configuration du tableau de bord ${dashboardType}`);
      
      // Tentative de chargement depuis le cache
      const cacheLoaded = loadFromCache();
      
      // Si pas de cache valide, charger les données depuis l'API
      if (!cacheLoaded) {
        console.log(`Pas de cache valide pour ${dashboardType}, chargement des données`);
        await refreshData(false);
      } else {
        // Si les données ont été chargées depuis le cache, planifier un rafraîchissement
        // silencieux en arrière-plan pour mettre à jour les données
        setTimeout(() => {
          refreshData(false).catch(err => {
            console.error(`Erreur lors du rafraîchissement silencieux:`, err);
          });
        }, 3000); // Attendre 3 secondes pour permettre au reste de l'UI de se charger
      }
      
      // Configurer le rafraîchissement automatique toutes les 5 minutes
      refreshTimerRef.current = setInterval(() => {
        console.log(`Auto-rafraîchissement programmé pour ${dashboardType}`);
        refreshData(false).catch(err => {
          console.error(`Erreur lors de l'auto-rafraîchissement:`, err);
        });
      }, CACHE_LIFETIME);
    };
    
    // Lancer la configuration
    setupDashboard();
    
    // Nettoyage lors du démontage du composant
    return () => {
      // Annuler le timer de rafraîchissement automatique
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [dashboardType, loadFromCache, refreshData]);

  // Retourner les données et fonctions nécessaires
  // Create a typed version of the refreshData function
  const typedRefreshData = useCallback(
    (force: boolean = false, customTimeframe?: string, forceBackendReload?: boolean) => {
      return refreshData(force, customTimeframe, forceBackendReload);
    },
    [refreshData]
  );

  return {
    activeProblems,
    recentProblems,
    isLoading,
    error,
    lastRefreshTime,
    refreshData: typedRefreshData,
    updateManagementZonesWithProblems,
    initialLoadComplete: initialLoadCompletedRef.current
  };
}
