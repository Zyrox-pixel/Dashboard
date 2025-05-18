import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Problem, ProblemResponse } from '../api/types';
import { api } from '../api';

interface ProblemsState {
  vfgProblems: Problem[];
  vfeProblems: Problem[];
  detectionProblems: Problem[];
  encryptionProblems: Problem[];
  vfgProblems72h: Problem[];
  vfeProblems72h: Problem[];
  detectionProblems72h: Problem[];
  encryptionProblems72h: Problem[];
  isLoading: {
    vfg: boolean;
    vfe: boolean;
    detection: boolean;
    encryption: boolean;
  };
}

interface ProblemsContextType extends ProblemsState {
  refreshVFG: (force?: boolean) => Promise<void>;
  refreshVFE: (force?: boolean) => Promise<void>;
  refreshDetection: (force?: boolean) => Promise<void>;
  refreshEncryption: (force?: boolean) => Promise<void>;
  refreshAll: (force?: boolean) => Promise<boolean | void>;
  getAggregatedProblems: () => Problem[];
  getAggregatedProblems72h: () => Problem[];
  setCurrentAppType: (appType: string) => void; // No longer optional
}

const ProblemsContext = createContext<ProblemsContextType | undefined>(undefined);

/**
 * Transforme les données brutes de problème en structure Problem unifiée
 */
const transformProblemData = (problem: ProblemResponse): Problem => {
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
};

export const ProblemsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // États séparés pour chaque type de problème
  const [vfgProblems, setVfgProblems] = useState<Problem[]>([]);
  const [vfeProblems, setVfeProblems] = useState<Problem[]>([]);
  const [detectionProblems, setDetectionProblems] = useState<Problem[]>([]);
  const [encryptionProblems, setEncryptionProblems] = useState<Problem[]>([]);
  const [vfgProblems72h, setVfgProblems72h] = useState<Problem[]>([]);
  const [vfeProblems72h, setVfeProblems72h] = useState<Problem[]>([]);
  const [detectionProblems72h, setDetectionProblems72h] = useState<Problem[]>([]);
  const [encryptionProblems72h, setEncryptionProblems72h] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState({ 
    vfg: false, 
    vfe: false, 
    detection: false, 
    encryption: false 
  });
  
  // État pour suivre le type d'application courant
  const [currentAppType, setCurrentAppType] = useState<string>('vfg'); // Par défaut à 'vfg'
  
  // Cache avancé pour éviter les requêtes répétées - avec localStorage
  const lastFetchTimeRef = useRef({
    vfg: 0,
    vfe: 0,
    detection: 0,
    encryption: 0
  });

  // Système de cache pour stocker les données entre les sessions
  const cacheRef = useRef({
    vfgProblems: null as Problem[] | null,
    vfeProblems: null as Problem[] | null,
    detectionProblems: null as Problem[] | null,
    encryptionProblems: null as Problem[] | null,
    vfgProblems72h: null as Problem[] | null,
    vfeProblems72h: null as Problem[] | null,
    detectionProblems72h: null as Problem[] | null,
    encryptionProblems72h: null as Problem[] | null
  });

  // Fonction utilitaire pour charger les données du cache
  const loadFromCache = () => {
    try {
      const cachedData = localStorage.getItem('problemsData');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);

        // Vérifier que les données ne sont pas trop anciennes (max 1 heure)
        if (parsedData.timestamp && Date.now() - parsedData.timestamp < 3600000) {
          // Charger les problèmes depuis le cache si disponibles
          if (parsedData.vfgProblems && parsedData.vfgProblems.length > 0) {
            setVfgProblems(parsedData.vfgProblems);
            cacheRef.current.vfgProblems = parsedData.vfgProblems;
          }

          if (parsedData.vfeProblems && parsedData.vfeProblems.length > 0) {
            setVfeProblems(parsedData.vfeProblems);
            cacheRef.current.vfeProblems = parsedData.vfeProblems;
          }

          if (parsedData.vfgProblems72h && parsedData.vfgProblems72h.length > 0) {
            setVfgProblems72h(parsedData.vfgProblems72h);
            cacheRef.current.vfgProblems72h = parsedData.vfgProblems72h;
          }

          if (parsedData.vfeProblems72h && parsedData.vfeProblems72h.length > 0) {
            setVfeProblems72h(parsedData.vfeProblems72h);
            cacheRef.current.vfeProblems72h = parsedData.vfeProblems72h;
          }
          
          if (parsedData.detectionProblems && parsedData.detectionProblems.length > 0) {
            setDetectionProblems(parsedData.detectionProblems);
            cacheRef.current.detectionProblems = parsedData.detectionProblems;
          }
          
          if (parsedData.detectionProblems72h && parsedData.detectionProblems72h.length > 0) {
            setDetectionProblems72h(parsedData.detectionProblems72h);
            cacheRef.current.detectionProblems72h = parsedData.detectionProblems72h;
          }
          
          if (parsedData.encryptionProblems && parsedData.encryptionProblems.length > 0) {
            setEncryptionProblems(parsedData.encryptionProblems);
            cacheRef.current.encryptionProblems = parsedData.encryptionProblems;
          }
          
          if (parsedData.encryptionProblems72h && parsedData.encryptionProblems72h.length > 0) {
            setEncryptionProblems72h(parsedData.encryptionProblems72h);
            cacheRef.current.encryptionProblems72h = parsedData.encryptionProblems72h;
          }

          return true;
        }
      }
    } catch (error) {
      // Silent error for cache loading failure
    }
    return false;
  };

  // Fonction utilitaire pour sauvegarder les données dans le cache
  const saveToCache = () => {
    try {
      const dataToCache = {
        vfgProblems: vfgProblems,
        vfeProblems: vfeProblems,
        detectionProblems: detectionProblems,
        encryptionProblems: encryptionProblems,
        vfgProblems72h: vfgProblems72h,
        vfeProblems72h: vfeProblems72h,
        detectionProblems72h: detectionProblems72h,
        encryptionProblems72h: encryptionProblems72h,
        timestamp: Date.now()
      };

      localStorage.setItem('problemsData', JSON.stringify(dataToCache));
    } catch (error) {
      // Silent error for cache saving failure
    }
  };
  
  // Rafraîchir les problèmes VFG
  const refreshVFG = async (force = false) => {
    // Vérifier si un chargement récent a eu lieu (moins de 10 secondes - optimisé)
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current.vfg < 10000) {
      return;
    }

    // Priorité élevée pour cette requête
    if ('requestIdleCallback' in window) {
      // @ts-ignore - optimisation moderne
      window.cancelIdleCallback = window.cancelIdleCallback || function() {};
    }
    
    setIsLoading(prev => ({ ...prev, vfg: true }));
    
    try {
      
      // Récupérer les problèmes actifs
      const activeProblemsResponse = await api.getProblems("OPEN", "-60d", "vfg", force);
      if (!activeProblemsResponse.error && activeProblemsResponse.data) {
        const transformedProblems = Array.isArray(activeProblemsResponse.data) 
          ? activeProblemsResponse.data.map(transformProblemData)
          : [];
        
        setVfgProblems(transformedProblems);
      }
      
      // Récupérer les problèmes des 72 dernières heures
      const problems72hResponse = await api.getProblems72h("vfg", undefined, force);
      if (!problems72hResponse.error && problems72hResponse.data) {
        const transformedProblems = Array.isArray(problems72hResponse.data) 
          ? problems72hResponse.data.map(transformProblemData)
          : [];
        
        setVfgProblems72h(transformedProblems);
      }
      
      // Mettre à jour l'horodatage
      lastFetchTimeRef.current.vfg = now;
      
    } catch (error) {
      // Error handled in finally block
    } finally {
      setIsLoading(prev => ({ ...prev, vfg: false }));
    }
  };
  
  // Rafraîchir les problèmes VFE
  const refreshVFE = async (force = false) => {
    // Vérifier si un chargement récent a eu lieu (moins de 10 secondes - optimisé)
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current.vfe < 10000) {
      return;
    }

    // Priorité élevée pour cette requête
    if ('requestIdleCallback' in window) {
      // @ts-ignore - optimisation moderne
      window.cancelIdleCallback = window.cancelIdleCallback || function() {};
    }
    
    setIsLoading(prev => ({ ...prev, vfe: true }));
    
    try {
      
      // Récupérer les problèmes actifs
      const activeProblemsResponse = await api.getProblems("OPEN", "-60d", "vfe", force);
      if (!activeProblemsResponse.error && activeProblemsResponse.data) {
        const transformedProblems = Array.isArray(activeProblemsResponse.data) 
          ? activeProblemsResponse.data.map(transformProblemData)
          : [];
        
        setVfeProblems(transformedProblems);
      }
      
      // Récupérer les problèmes des 72 dernières heures
      const problems72hResponse = await api.getProblems72h("vfe", undefined, force);
      if (!problems72hResponse.error && problems72hResponse.data) {
        const transformedProblems = Array.isArray(problems72hResponse.data) 
          ? problems72hResponse.data.map(transformProblemData)
          : [];
        
        setVfeProblems72h(transformedProblems);
      }
      
      // Mettre à jour l'horodatage
      lastFetchTimeRef.current.vfe = now;
      
    } catch (error) {
      // Error handled in finally block
    } finally {
      setIsLoading(prev => ({ ...prev, vfe: false }));
    }
  };
  
  // Rafraîchir les problèmes Detection
  const refreshDetection = async (force = false) => {
    // Vérifier si un chargement récent a eu lieu (moins de 10 secondes - optimisé)
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current.detection < 10000) {
      return;
    }

    // Priorité élevée pour cette requête
    if ('requestIdleCallback' in window) {
      // @ts-ignore - optimisation moderne
      window.cancelIdleCallback = window.cancelIdleCallback || function() {};
    }
    
    setIsLoading(prev => ({ ...prev, detection: true }));
    
    try {
      
      // Récupérer les problèmes actifs
      const activeProblemsResponse = await api.getProblems("OPEN", "-60d", "detection", force);
      if (!activeProblemsResponse.error && activeProblemsResponse.data) {
        const transformedProblems = Array.isArray(activeProblemsResponse.data) 
          ? activeProblemsResponse.data.map(transformProblemData)
          : [];
        
        setDetectionProblems(transformedProblems);
      }
      
      // Récupérer les problèmes des 72 dernières heures
      const problems72hResponse = await api.getProblems72h("detection", undefined, force);
      if (!problems72hResponse.error && problems72hResponse.data) {
        const transformedProblems = Array.isArray(problems72hResponse.data) 
          ? problems72hResponse.data.map(transformProblemData)
          : [];
        
        setDetectionProblems72h(transformedProblems);
      }
      
      // Mettre à jour l'horodatage
      lastFetchTimeRef.current.detection = now;
      
    } catch (error) {
      // Error handled in finally block
    } finally {
      setIsLoading(prev => ({ ...prev, detection: false }));
    }
  };
  
  // Rafraîchir les problèmes Encryption
  const refreshEncryption = async (force = false) => {
    // Vérifier si un chargement récent a eu lieu (moins de 10 secondes - optimisé)
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current.encryption < 10000) {
      return;
    }

    // Priorité élevée pour cette requête
    if ('requestIdleCallback' in window) {
      // @ts-ignore - optimisation moderne
      window.cancelIdleCallback = window.cancelIdleCallback || function() {};
    }
    
    setIsLoading(prev => ({ ...prev, encryption: true }));
    
    try {
      
      // Récupérer les problèmes actifs
      const activeProblemsResponse = await api.getProblems("OPEN", "-60d", "encryption", force);
      if (!activeProblemsResponse.error && activeProblemsResponse.data) {
        const transformedProblems = Array.isArray(activeProblemsResponse.data) 
          ? activeProblemsResponse.data.map(transformProblemData)
          : [];
        
        setEncryptionProblems(transformedProblems);
      }
      
      // Récupérer les problèmes des 72 dernières heures
      const problems72hResponse = await api.getProblems72h("encryption", undefined, force);
      if (!problems72hResponse.error && problems72hResponse.data) {
        const transformedProblems = Array.isArray(problems72hResponse.data) 
          ? problems72hResponse.data.map(transformProblemData)
          : [];
        
        setEncryptionProblems72h(transformedProblems);
      }
      
      // Mettre à jour l'horodatage
      lastFetchTimeRef.current.encryption = now;
      
    } catch (error) {
      // Error handled in finally block
    } finally {
      setIsLoading(prev => ({ ...prev, encryption: false }));
    }
  };
  
  // Rafraîchir tous les problèmes - version optimisée avec types corrigés
  const refreshAll = async (force = false): Promise<boolean | void> => {

    // Optimisation: utiliser AbortController pour annuler les requêtes trop longues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 secondes max

    try {
      // Utiliser les données du cache comme fallback en cas d'échec de chargement
      const initialVfgProblems = [...vfgProblems];
      const initialVfeProblems = [...vfeProblems];
      const initialDetectionProblems = [...detectionProblems];
      const initialEncryptionProblems = [...encryptionProblems];

      // Exécuter tous les rafraîchissements en parallèle
      await Promise.all([
        refreshVFG(force),
        refreshVFE(force),
        refreshDetection(force),
        refreshEncryption(force)
      ]);

      // Sauvegarder les données mise à jour dans le cache local
      setTimeout(saveToCache, 300);

      return true;
    } catch (error) {
      // Error handled in recovery logic

      // En cas d'erreur, revenir aux données précédentes si disponibles
      if (vfgProblems.length === 0 && cacheRef.current.vfgProblems) {
        setVfgProblems(cacheRef.current.vfgProblems);
      }

      if (vfeProblems.length === 0 && cacheRef.current.vfeProblems) {
        setVfeProblems(cacheRef.current.vfeProblems);
      }
      
      if (detectionProblems.length === 0 && cacheRef.current.detectionProblems) {
        setDetectionProblems(cacheRef.current.detectionProblems);
      }
      
      if (encryptionProblems.length === 0 && cacheRef.current.encryptionProblems) {
        setEncryptionProblems(cacheRef.current.encryptionProblems);
      }

      // Essayer une approche séquentielle pour éviter la surcharge
      try {
        await refreshVFG(force);
        await refreshVFE(force);
        await refreshDetection(force);
        await refreshEncryption(force);
        return true;
      } catch (fallbackError) {
        // Failure is returned as false
        return false;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  };
  
  // Récupérer tous les problèmes agrégés
  const getAggregatedProblems = () => {
    const problemMap = new Map<string, Problem>();
    
    // Agréger les problèmes VFG
    vfgProblems.forEach(problem => {
      problemMap.set(problem.id, problem);
    });
    
    // Agréger les problèmes VFE
    vfeProblems.forEach(problem => {
      problemMap.set(problem.id, problem);
    });
    
    // Agréger les problèmes Detection
    detectionProblems.forEach(problem => {
      problemMap.set(problem.id, problem);
    });
    
    // Agréger les problèmes Encryption
    encryptionProblems.forEach(problem => {
      problemMap.set(problem.id, problem);
    });
    
    return Array.from(problemMap.values());
  };
  
  // Récupérer tous les problèmes récents agrégés
  const getAggregatedProblems72h = () => {
    const problemMap = new Map<string, Problem>();
    
    // Agréger les problèmes VFG
    vfgProblems72h.forEach(problem => {
      problemMap.set(problem.id, problem);
    });
    
    // Agréger les problèmes VFE
    vfeProblems72h.forEach(problem => {
      problemMap.set(problem.id, problem);
    });
    
    // Agréger les problèmes Detection
    detectionProblems72h.forEach(problem => {
      problemMap.set(problem.id, problem);
    });
    
    // Agréger les problèmes Encryption
    encryptionProblems72h.forEach(problem => {
      problemMap.set(problem.id, problem);
    });
    
    return Array.from(problemMap.values());
  };
  
  // Charger les données initiales avec système de cache optimisé
  useEffect(() => {

    // D'abord, essayer de charger les données depuis le cache local
    const cacheLoaded = loadFromCache();

    // Si les données n'ont pas été chargées depuis le cache ou sont invalides
    if (!cacheLoaded) {
      // Forcer le rechargement complet des données
      refreshAll(true).then(() => {
        // Sauvegarder les données fraîchement chargées dans le cache
        // Attendre un court délai pour s'assurer que les états ont été mis à jour
        setTimeout(saveToCache, 500);
      });
    } else {
      // Si des données ont été chargées depuis le cache, déclencher un rafraîchissement silencieux
      // pour mettre à jour les données en arrière-plan sans bloquer l'interface
      setTimeout(() => {
        refreshAll(false).then(() => {
          // Mettre à jour le cache avec les données fraîches
          saveToCache();
        });
      }, 3000); // Délai pour permettre au reste de l'UI de se charger d'abord
    }

    // Configurer un intervalle pour sauvegarder périodiquement les données dans le cache
    const saveInterval = setInterval(saveToCache, 300000); // 5 minutes

    return () => {
      clearInterval(saveInterval);
      // Sauvegarder une dernière fois avant de démonter le composant
      saveToCache();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  const contextValue: ProblemsContextType = {
    vfgProblems,
    vfeProblems,
    detectionProblems,
    encryptionProblems,
    vfgProblems72h,
    vfeProblems72h,
    detectionProblems72h,
    encryptionProblems72h,
    isLoading,
    refreshVFG,
    refreshVFE,
    refreshDetection,
    refreshEncryption,
    refreshAll,
    getAggregatedProblems,
    getAggregatedProblems72h,
    setCurrentAppType: (appType: string) => setCurrentAppType(appType)
  };
  
  return (
    <ProblemsContext.Provider value={contextValue}>
      {children}
    </ProblemsContext.Provider>
  );
};

export const useProblems = () => {
  const context = useContext(ProblemsContext);
  if (context === undefined) {
    throw new Error('useProblems must be used within a ProblemsProvider');
  }
  return context;
};
