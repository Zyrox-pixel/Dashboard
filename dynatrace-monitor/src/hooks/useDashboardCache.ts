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
  unified: 'dashboard_unified_cache'
};

// Durée de vie du cache en millisecondes (5 minutes)
const CACHE_LIFETIME = 5 * 60 * 1000;

/**
 * Hook personnalisé pour gérer le cache des tableaux de bord
 * Permet de charger les données une seule fois, de les mettre à jour automatiquement
 * et de les récupérer instantanément depuis le cache lors des visites ultérieures
 */
export function useDashboardCache(dashboardType: 'vfg' | 'vfe' | 'unified') {
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
  const saveToCache = useCallback((activeData: Problem[], recentData: Problem[]) => {
    try {
      const cacheKey = CACHE_KEYS[dashboardType];
      const dataToCache = {
        activeProblems: activeData,
        recentProblems: recentData,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
      console.log(`Données ${dashboardType} sauvegardées dans le cache`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cache:', error);
    }
  }, [dashboardType]);

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
          
          setLastRefreshTime(new Date(parsedData.timestamp));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Erreur lors du chargement du cache:', error);
      return false;
    }
  }, [dashboardType]);

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
  const refreshData = useCallback(async (force: boolean = false) => {
    // Éviter les requêtes multiples simultanées
    if (pendingRequestRef.current && !force) {
      return;
    }

    pendingRequestRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log(`Rafraîchissement des données ${dashboardType}${force ? ' (forcé)' : ''}`);
      
      // Déterminer les paramètres API en fonction du type de dashboard
      const apiType = dashboardType === 'unified' ? undefined : dashboardType;
      
      // Récupérer les problèmes actifs
      const activeProblemsResponse = await api.getProblems("OPEN", "-60d", apiType, force);
      
      // Récupérer les problèmes des 72 dernières heures
      const problems72hResponse = await api.getProblems72h(apiType, undefined, force);
      
      // Mettre à jour les états si les données sont valides
      if (!activeProblemsResponse.error && activeProblemsResponse.data) {
        const transformedProblems = Array.isArray(activeProblemsResponse.data) 
          ? activeProblemsResponse.data.map(transformProblemData)
          : [];
          
        setActiveProblems(transformedProblems);
      }
      
      if (!problems72hResponse.error && problems72hResponse.data) {
        const transformedProblems = Array.isArray(problems72hResponse.data) 
          ? problems72hResponse.data.map(transformProblemData)
          : [];
          
        setRecentProblems(transformedProblems);
      }
      
      // Marquer le moment du rafraîchissement
      const refreshTime = new Date();
      setLastRefreshTime(refreshTime);
      
      // Sauvegarder les données dans le cache
      if (Array.isArray(activeProblemsResponse.data) && Array.isArray(problems72hResponse.data)) {
        // Transformer les données avant de les sauvegarder
        const transformedActiveProblems = activeProblemsResponse.data.map(transformProblemData);
        const transformedRecentProblems = problems72hResponse.data.map(transformProblemData);
        
        saveToCache(
          transformedActiveProblems,
          transformedRecentProblems
        );
      }
      
      // Marquer que le chargement initial est terminé
      initialLoadCompletedRef.current = true;
      
      return {
        activeProblems: activeProblemsResponse.data,
        recentProblems: problems72hResponse.data
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
  return {
    activeProblems,
    recentProblems,
    isLoading,
    error,
    lastRefreshTime,
    refreshData,
    initialLoadComplete: initialLoadCompletedRef.current
  };
}
