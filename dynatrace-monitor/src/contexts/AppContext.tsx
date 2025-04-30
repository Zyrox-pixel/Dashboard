import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { api, CACHE_TYPES } from '../api';
import { 
  Problem, 
  ManagementZone, 
  ProcessGroup, 
  VitalForGroupMZsResponse,
  ProblemResponse,
  ProcessResponse,
  Host,
  Service,
  SummaryData
} from '../api/types';
import { Database, Shield, Key, Globe, Server, Grid, Building, CreditCard } from 'lucide-react';

// On utilise les APIs existantes
// Ajoutez ceci si vous n'avez pas encore modifié src/api/index.ts
const optimizedApiMethods = api;

// Types unifiés pour les contextes
export interface AppStateType {
  activeProblems: Problem[];
  managementZones: ManagementZone[];
  vitalForGroupMZs: ManagementZone[];
  vitalForEntrepriseMZs: ManagementZone[];
  selectedZone: string | null;
  sidebarCollapsed: boolean;
  currentPage: number;
  activeTab: string;
  processGroups: ProcessGroup[];
  hosts: Host[];
  services: Service[];
  summaryData: SummaryData | null;
  isLoading: {
    problems: boolean;
    managementZones: boolean;
    zoneDetails: boolean;
    vitalForGroupMZs: boolean;
    vitalForEntrepriseMZs: boolean;
    initialLoadComplete: boolean;
    dashboardData?: boolean;
  };
  error: string | null;
  backendConnected: boolean;
  performanceMetrics?: {
    loadTime: number;
    lastRefresh: Date;
    dataSizes: {
      problems: number;
      services: number;
      hosts: number;
      processes: number;
    }
  };
}

export interface AppActionsType {
  setSelectedZone: (zoneId: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: number) => void;
  setActiveTab: (tab: string) => void;
  refreshData: () => Promise<void>;
  loadZoneData?: (zoneId: string) => Promise<void>;
  loadAllData?: () => Promise<void>;
}

export type AppContextType = AppStateType & AppActionsType;

// Contexte unifié
const AppContext = createContext<AppContextType | undefined>(undefined);

// Fonctions utilitaires partagées
export const getZoneIcon = (zoneName: string) => {
  const lowerName = zoneName.toLowerCase();
  
  if (lowerName.includes('acesid')) {
    return <Key />;
  } else if (lowerName.includes('ocsp')) {
    return <Shield />;
  } else if (lowerName.includes('websso') || lowerName.includes('itg')) {
    return <Globe />;
  } else if (lowerName.includes('refsg')) {
    return <Database />;
  } else if (lowerName.includes('micro-segmentation')) {
    return <Grid />;
  } else if (lowerName.includes('epv')) {
    return <Server />;
  } else if (lowerName.includes('finance') || lowerName.includes('financial')) {
    return <CreditCard />;
  } else if (lowerName.includes('business') || lowerName.includes('corp')) {
    return <Building />;
  }
  
  return <Shield />;
};

export const getZoneColor = (zoneName: string) => {
  const lowerName = zoneName.toLowerCase();
  
  if (lowerName.includes('acesid')) {
    return 'blue';
  } else if (lowerName.includes('ocsp')) {
    return 'red';
  } else if (lowerName.includes('websso') || lowerName.includes('itg')) {
    return 'green';
  } else if (lowerName.includes('refsg')) {
    return 'purple';
  } else if (lowerName.includes('micro-segmentation')) {
    return 'amber';
  } else if (lowerName.includes('epv-mut')) {
    return 'emerald';
  } else if (lowerName.includes('epv-fortis')) {
    return 'orange';
  }
  
  const colors = ['red', 'amber', 'orange', 'blue', 'emerald', 'purple', 'green'];
  const hash = zoneName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length] as 'red' | 'amber' | 'orange' | 'blue' | 'emerald' | 'purple' | 'green';
};

// Initialiser le contexte avec des valeurs par défaut
const initialAppState: AppStateType = {
  activeProblems: [],
  managementZones: [],
  vitalForGroupMZs: [],
  vitalForEntrepriseMZs: [],
  selectedZone: null,
  sidebarCollapsed: false,
  currentPage: 1,
  activeTab: 'hosts',
  processGroups: [],
  hosts: [],
  services: [],
  summaryData: null,
  isLoading: {
    problems: true,
    managementZones: true,
    zoneDetails: false,
    vitalForGroupMZs: true,
    vitalForEntrepriseMZs: true,
    initialLoadComplete: false
  },
  error: null,
  backendConnected: false
};

// Vérifier le statut du backend
const checkBackendStatus = async (): Promise<boolean> => {
  try {
    const statusResponse = await api.getStatus();
    return !statusResponse.error;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut du backend:', error);
    return false;
  }
};

// Fournisseur du contexte standard
interface AppProviderProps {
  children: ReactNode;
  optimized?: boolean;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, optimized = false }) => {
  // État unifié pour tous les contextes
  const [state, setState] = useState<AppStateType>(initialAppState);
  
  // État de performance uniquement pour la version optimisée
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    lastRefresh: new Date(),
    dataSizes: {
      problems: 0,
      services: 0,
      hosts: 0,
      processes: 0
    }
  });

  // Fonction optimisée pour charger les données d'une zone
  const loadZoneData = useCallback(async (zoneId: string) => {
    setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, zoneDetails: true } }));
    const startTime = performance.now();
    
    try {
      let selectedZoneObj = state.vitalForGroupMZs.find(zone => zone.id === zoneId);
      if (!selectedZoneObj) {
        selectedZoneObj = state.vitalForEntrepriseMZs.find(zone => zone.id === zoneId);
      }
      
      if (!selectedZoneObj) return;
      
      // Utiliser soit l'API optimisée soit l'API standard
      const apiClient = optimized ? optimizedApiMethods : api;
      
      // Définir la management zone
      const setMzResponse = await apiClient.setManagementZone(selectedZoneObj.name);
      
      if (setMzResponse.error) {
        setState(prev => ({ ...prev, error: `Erreur: ${setMzResponse.error}` }));
        return;
      }
      
      // Utiliser l'API standard - charger les données séparément
      const [processResponse, hostsResponse, servicesResponse] = await Promise.all([
        apiClient.getProcesses(),
        apiClient.getHosts(),
        apiClient.getServices()
      ]);
      
      // Mise à jour des process groups
      if (!processResponse.error && processResponse.data) {
        const processData = processResponse.data as ProcessResponse[];
        
        if (Array.isArray(processData) && processData.length > 0) {
          const processGroups: ProcessGroup[] = processData.map((process: ProcessResponse) => ({
            id: process.id || `proc-${Math.random().toString(36).substring(2, 9)}`,
            name: process.name || "Processus inconnu",
            technology: process.technology || "Non spécifié",
            icon: getProcessIcon(process.tech_icon || ''),
            dt_url: process.dt_url || "#",
            // Make sure to use a type that's compatible with ProcessGroup
            type: ((process.tech_icon && process.tech_icon.toLowerCase().includes('database')) 
              ? 'database' : 'technology') as 'database' | 'technology' | 'server'
          }));
          
          setState(prev => ({ ...prev, processGroups }));
          
          if (optimized) {
            setPerformanceMetrics(prev => ({
              ...prev,
              dataSizes: { ...prev.dataSizes, processes: processGroups.length }
            }));
          }
        } else {
          setState(prev => ({ ...prev, processGroups: [] }));
        }
      }
      
      // Mise à jour des hosts
      if (!hostsResponse.error && hostsResponse.data) {
        setState(prev => ({ ...prev, hosts: hostsResponse.data as Host[] }));
        
        if (optimized) {
          setPerformanceMetrics(prev => ({
            ...prev,
            dataSizes: { ...prev.dataSizes, hosts: (hostsResponse.data as Host[]).length }
          }));
        }
      } else {
        setState(prev => ({ ...prev, hosts: [] }));
      }
      
      // Mise à jour des services
      if (!servicesResponse.error && servicesResponse.data) {
        setState(prev => ({ ...prev, services: servicesResponse.data as Service[] }));
        
        if (optimized) {
          setPerformanceMetrics(prev => ({
            ...prev,
            dataSizes: { ...prev.dataSizes, services: (servicesResponse.data as Service[]).length }
          }));
        }
      } else {
        setState(prev => ({ ...prev, services: [] }));
      }
      
      const endTime = performance.now();
      
      if (optimized) {
        setPerformanceMetrics(prev => ({
          ...prev,
          loadTime: endTime - startTime,
          lastRefresh: new Date()
        }));
      }
      
    } catch (error: any) {
      console.error('Erreur lors du chargement des données de la zone:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors du chargement des données pour la zone sélectionnée.'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, zoneDetails: false } }));
    }
  }, [state.vitalForGroupMZs, state.vitalForEntrepriseMZs, optimized]);

  // Fonction pour obtenir les icônes des process
  const getProcessIcon = (techIcon: string) => {
    const techLower = techIcon.toLowerCase();
    
    if (techLower === 'database') {
      return <Database size={14} />;
    } else if (techLower === 'coffee') {
      return <span className="text-amber-500">☕</span>;
    } else if (techLower === 'snake') {
      return <span className="text-green-500">🐍</span>;
    }
    
    return <span className="text-blue-500">⚙️</span>;
  };

  // Fonction pour charger toutes les données
  const loadAllData = useCallback(async () => {
    const startTime = performance.now();
    
    setState(prev => ({ 
      ...prev, 
      isLoading: { 
        ...prev.isLoading, 
        problems: true, 
        managementZones: true, 
        vitalForGroupMZs: true,
        vitalForEntrepriseMZs: true,
        initialLoadComplete: false,
        dashboardData: true
      } 
    }));
    
    try {
      // Vérifier si le backend est en ligne
      const isBackendConnected = await checkBackendStatus();
      setState(prev => ({ ...prev, backendConnected: isBackendConnected }));
      
      if (!isBackendConnected) {
        setState(prev => ({ 
          ...prev, 
          error: "Le serveur backend n'est pas accessible. Veuillez vérifier votre connexion.",
          isLoading: { 
            ...prev.isLoading,
            problems: false, 
            managementZones: false,
            vitalForGroupMZs: false,
            vitalForEntrepriseMZs: false,
            initialLoadComplete: true,
            dashboardData: false
          }
        }));
        return;
      }
      
      // Utiliser l'API standard ou optimisée
      const apiClient = optimized ? optimizedApiMethods : api;
      
      // Exécuter plusieurs requêtes en parallèle
      const responses = await Promise.all([
        apiClient.getSummary(),
        apiClient.getVitalForGroupMZs(),
        apiClient.getVitalForEntrepriseMZs(),
        apiClient.getProblems()
      ]);
      
      const [summaryResponse, vfgResponse, vfeResponse, problemsResponse] = responses;
      
      // Traiter les données du résumé
      if (!summaryResponse.error && summaryResponse.data) {
        setState(prev => ({ ...prev, summaryData: summaryResponse.data as SummaryData }));
      }
      
      // Traiter les données des MZs VFG
      if (!vfgResponse.error && vfgResponse.data) {
        const vfgData = vfgResponse.data as VitalForGroupMZsResponse;
        
        if (vfgData.mzs && Array.isArray(vfgData.mzs) && vfgData.mzs.length > 0) {
          // Créer directement les MZ
          const vfgMZs: ManagementZone[] = vfgData.mzs.map(mzName => ({
            id: `env-${mzName.replace(/\s+/g, '-')}`,
            name: mzName,
            code: mzName.replace(/^.*?([A-Z0-9]+).*$/, '$1') || 'MZ',
            icon: getZoneIcon(mzName),
            problemCount: 0,
            apps: Math.floor(Math.random() * 15) + 1,
            services: Math.floor(Math.random() * 30) + 5,
            hosts: Math.floor(Math.random() * 20) + 2,
            availability: `${(99 + (Math.random() * 1)).toFixed(2)}%`,
            status: "healthy", // Correct type
            color: getZoneColor(mzName),
            dt_url: "#"
          }));
          
          setState(prev => ({ 
            ...prev, 
            vitalForGroupMZs: vfgMZs,
            managementZones: vfgMZs // Pour compatibilité
          }));
        }
      }
      
      // Traiter les données des MZs VFE
      if (!vfeResponse.error && vfeResponse.data) {
        const vfeData = vfeResponse.data as VitalForGroupMZsResponse;
        
        if (vfeData.mzs && Array.isArray(vfeData.mzs) && vfeData.mzs.length > 0) {
          // Créer directement les MZ
          const vfeMZs: ManagementZone[] = vfeData.mzs.map(mzName => ({
            id: `env-${mzName.replace(/\s+/g, '-')}`,
            name: mzName,
            code: mzName.replace(/^.*?([A-Z0-9]+).*$/, '$1') || 'MZ',
            icon: getZoneIcon(mzName),
            problemCount: 0,
            apps: Math.floor(Math.random() * 15) + 1,
            services: Math.floor(Math.random() * 30) + 5,
            hosts: Math.floor(Math.random() * 20) + 2,
            availability: `${(99 + (Math.random() * 1)).toFixed(2)}%`,
            status: "healthy" as "healthy" | "warning", // Correct type
            color: getZoneColor(mzName),
            dt_url: "#"
          }));
          
          setState(prev => ({ ...prev, vitalForEntrepriseMZs: vfeMZs }));
        }
      }
      
      // Traiter les données des problèmes
      if (!problemsResponse.error && problemsResponse.data) {
        const problemsData = problemsResponse.data as ProblemResponse[];
        
        if (Array.isArray(problemsData)) {
          // Transformer les données
          const problems: Problem[] = problemsData.map((problem: ProblemResponse) => ({
            id: problem.id || `PROB-${Math.random().toString(36).substr(2, 9)}`,
            title: problem.title || "Problème inconnu",
            code: problem.id ? problem.id.substring(0, 7) : "UNKNOWN",
            subtitle: `${problem.zone || "Non spécifié"} - Impact: ${problem.impact || "INCONNU"}`,
            time: problem.start_time ? `Depuis ${problem.start_time}` : "Récent",
            type: "Problème Dynatrace",
            status: problem.status === "OPEN" ? "critical" : "warning",
            impact: problem.impact === "INFRASTRUCTURE" ? "ÉLEVÉ" : problem.impact === "SERVICE" ? "MOYEN" : "FAIBLE",
            zone: problem.zone || "Non spécifié",
            servicesImpacted: problem.affected_entities ? problem.affected_entities.toString() : "0",
            dt_url: problem.dt_url || "#"
          }));
          
          setState(prev => ({ ...prev, activeProblems: problems }));
          
          if (optimized) {
            setPerformanceMetrics(prev => ({
              ...prev,
              dataSizes: { ...prev.dataSizes, problems: problems.length }
            }));
          }
          
          // Mettre à jour les compteurs de problèmes pour les MZs
          // Version corrigée qui respecte les types:
          
          if (state.vitalForGroupMZs.length > 0) {
            // Mettre à jour VFG
            const updatedVfgMZs = state.vitalForGroupMZs.map(zone => {
              const zoneProblems = problems.filter(p => p.zone.includes(zone.name));
              return {
                ...zone,
                problemCount: zoneProblems.length,
                status: (zoneProblems.length > 0 ? "warning" : "healthy") as "warning" | "healthy"
              };
            });
            
            setState(prev => ({
              ...prev,
              vitalForGroupMZs: updatedVfgMZs
            }));
          }
          
          if (state.vitalForEntrepriseMZs.length > 0) {
            // Mettre à jour VFE
            const updatedVfeMZs = state.vitalForEntrepriseMZs.map(zone => {
              const zoneProblems = problems.filter(p => p.zone.includes(zone.name));
              return {
                ...zone,
                problemCount: zoneProblems.length,
                status: (zoneProblems.length > 0 ? "warning" : "healthy") as "warning" | "healthy"
              };
            });
            
            setState(prev => ({
              ...prev,
              vitalForEntrepriseMZs: updatedVfeMZs
            }));
          }
        }
      }
      
      // Si une zone est sélectionnée, charger ses données
      if (state.selectedZone) {
        await loadZoneData(state.selectedZone);
      }
      
      const endTime = performance.now();
      
      if (optimized) {
        setPerformanceMetrics(prev => ({
          ...prev,
          loadTime: endTime - startTime,
          lastRefresh: new Date()
        }));
      }
      
    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors du chargement des données. Veuillez réessayer.' 
      }));
    } finally {
      setState(prev => ({ 
        ...prev, 
        isLoading: { 
          ...prev.isLoading, 
          problems: false, 
          managementZones: false,
          vitalForGroupMZs: false,
          vitalForEntrepriseMZs: false,
          initialLoadComplete: true,
          dashboardData: false
        } 
      }));
    }
  }, [state.selectedZone, state.vitalForGroupMZs, state.vitalForEntrepriseMZs, loadZoneData, optimized]);

  // Charger les données initiales
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Fonction pour définir la zone sélectionnée et charger ses données
  const setSelectedZoneAndLoadData = useCallback((zoneId: string | null) => {
    setState(prev => ({ ...prev, selectedZone: zoneId }));
    if (zoneId) {
      loadZoneData(zoneId);
    }
  }, [loadZoneData]);

  // Fonction pour rafraîchir les données
  const refreshData = useCallback(async () => {
    setState(prev => ({ ...prev, error: null }));
    
    // Recharger toutes les données
    await loadAllData();
  }, [loadAllData]);

  // Fonctions pour modifier l'état
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState(prev => ({ ...prev, sidebarCollapsed: collapsed }));
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // Valeur du contexte
  const contextValue = useMemo<AppContextType>(() => ({
    ...state,
    setSelectedZone: setSelectedZoneAndLoadData,
    setSidebarCollapsed,
    setCurrentPage,
    setActiveTab,
    refreshData,
    ...(optimized ? {
      loadZoneData,
      loadAllData,
      performanceMetrics
    } : {})
  }), [
    state,
    setSelectedZoneAndLoadData,
    setSidebarCollapsed,
    setCurrentPage,
    setActiveTab,
    refreshData,
    optimized,
    loadZoneData,
    loadAllData,
    performanceMetrics
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Contexte optimisé qui utilise le même AppProvider mais avec l'option optimized=true
export const OptimizedAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <AppProvider optimized={true}>{children}</AppProvider>;
};

// Hook personnalisé pour utiliser le contexte de l'application
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Hook alias pour la compatibilité avec le code existant
export const useOptimizedApp = useApp;