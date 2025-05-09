import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Problem, ProblemResponse } from '../api/types';
import { api } from '../api';

interface ProblemsState {
  vfgProblems: Problem[];
  vfeProblems: Problem[];
  vfgProblems72h: Problem[];
  vfeProblems72h: Problem[];
  isLoading: {
    vfg: boolean;
    vfe: boolean;
  };
}

interface ProblemsContextType extends ProblemsState {
  refreshVFG: (force?: boolean) => Promise<void>;
  refreshVFE: (force?: boolean) => Promise<void>;
  refreshAll: (force?: boolean) => Promise<void>;
  getAggregatedProblems: () => Problem[];
  getAggregatedProblems72h: () => Problem[];
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
  const [vfgProblems72h, setVfgProblems72h] = useState<Problem[]>([]);
  const [vfeProblems72h, setVfeProblems72h] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState({ vfg: false, vfe: false });
  
  // Cache pour éviter les requêtes répétées
  const lastFetchTimeRef = useRef({
    vfg: 0,
    vfe: 0
  });
  
  // Rafraîchir les problèmes VFG
  const refreshVFG = async (force = false) => {
    // Vérifier si un chargement récent a eu lieu (moins de 15 secondes)
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current.vfg < 15000) {
      console.log("🔵 Utilisation du cache pour VFG (récent)");
      return;
    }
    
    setIsLoading(prev => ({ ...prev, vfg: true }));
    
    try {
      console.log("🔵 Chargement des données VFG...");
      
      // Récupérer les problèmes actifs
      const activeProblemsResponse = await api.getProblems("OPEN", "-60d", "vfg", force);
      if (!activeProblemsResponse.error && activeProblemsResponse.data) {
        const transformedProblems = Array.isArray(activeProblemsResponse.data) 
          ? activeProblemsResponse.data.map(transformProblemData)
          : [];
        
        console.log(`🔵 Problèmes actifs VFG récupérés: ${transformedProblems.length}`);
        setVfgProblems(transformedProblems);
      }
      
      // Récupérer les problèmes des 72 dernières heures
      const problems72hResponse = await api.getProblems72h("vfg", undefined, force);
      if (!problems72hResponse.error && problems72hResponse.data) {
        const transformedProblems = Array.isArray(problems72hResponse.data) 
          ? problems72hResponse.data.map(transformProblemData)
          : [];
        
        console.log(`🔵 Problèmes 72h VFG récupérés: ${transformedProblems.length}`);
        setVfgProblems72h(transformedProblems);
      }
      
      // Mettre à jour l'horodatage
      lastFetchTimeRef.current.vfg = now;
      
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des problèmes VFG:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, vfg: false }));
    }
  };
  
  // Rafraîchir les problèmes VFE
  const refreshVFE = async (force = false) => {
    // Vérifier si un chargement récent a eu lieu (moins de 15 secondes)
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current.vfe < 15000) {
      console.log("🟠 Utilisation du cache pour VFE (récent)");
      return;
    }
    
    setIsLoading(prev => ({ ...prev, vfe: true }));
    
    try {
      console.log("🟠 Chargement des données VFE...");
      
      // Récupérer les problèmes actifs
      const activeProblemsResponse = await api.getProblems("OPEN", "-60d", "vfe", force);
      if (!activeProblemsResponse.error && activeProblemsResponse.data) {
        const transformedProblems = Array.isArray(activeProblemsResponse.data) 
          ? activeProblemsResponse.data.map(transformProblemData)
          : [];
        
        console.log(`🟠 Problèmes actifs VFE récupérés: ${transformedProblems.length}`);
        setVfeProblems(transformedProblems);
      }
      
      // Récupérer les problèmes des 72 dernières heures
      const problems72hResponse = await api.getProblems72h("vfe", undefined, force);
      if (!problems72hResponse.error && problems72hResponse.data) {
        const transformedProblems = Array.isArray(problems72hResponse.data) 
          ? problems72hResponse.data.map(transformProblemData)
          : [];
        
        console.log(`🟠 Problèmes 72h VFE récupérés: ${transformedProblems.length}`);
        setVfeProblems72h(transformedProblems);
      }
      
      // Mettre à jour l'horodatage
      lastFetchTimeRef.current.vfe = now;
      
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des problèmes VFE:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, vfe: false }));
    }
  };
  
  // Rafraîchir tous les problèmes
  const refreshAll = async (force = false) => {
    console.log("🔄 Rafraîchissement de tous les problèmes...");
    
    // Exécuter les deux rafraîchissements en parallèle
    await Promise.all([
      refreshVFG(force),
      refreshVFE(force)
    ]);
    
    console.log("✅ Rafraîchissement complet terminé");
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
    
    return Array.from(problemMap.values());
  };
  
  // Charger les données initiales immédiatement
  useEffect(() => {
    console.log("Initialisation du ProblemsContext - chargement immédiat des données");
    // Forcer le rechargement complet des données
    refreshAll(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  const contextValue: ProblemsContextType = {
    vfgProblems,
    vfeProblems,
    vfgProblems72h,
    vfeProblems72h,
    isLoading,
    refreshVFG,
    refreshVFE,
    refreshAll,
    getAggregatedProblems,
    getAggregatedProblems72h
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