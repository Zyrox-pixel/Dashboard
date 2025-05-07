import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { api, optimizedApi } from '../api';
import { 
  Problem, 
  ManagementZone, 
  ProcessGroup, 
  Host,
  Service,
  SummaryData,
  ApiResponse,
  VitalForGroupMZsResponse,
  ProblemResponse
} from '../api/types';
import { API_BASE_URL } from '../api/endpoints';
import { Database, Shield, Key, Globe, Server, Grid, Building, CreditCard } from 'lucide-react';

// Types unifiés pour les contextes
export interface AppStateType {
  activeProblems: Problem[];
  problemsLast72h: Problem[]; 
  vitalForGroupMZs: ManagementZone[];
  vitalForEntrepriseMZs: ManagementZone[];
  selectedZone: string | null;
  sidebarCollapsed: boolean;
  activeTab: string;
  processGroups: ProcessGroup[];
  hosts: Host[];
  services: Service[];
  summaryData: SummaryData | null;
  isLoading: {
    problems: boolean;
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
  setActiveTab: (tab: string) => void;
  refreshData: (dashboardType?: 'vfg' | 'vfe', refreshProblemsOnly?: boolean) => Promise<void>;
  loadZoneData?: (zoneId: string) => Promise<void>;
}

export type AppContextType = AppStateType & AppActionsType;

// Contexte unifié
const AppContext = createContext<AppContextType | undefined>(undefined);

// Fonctions utilitaires
export const getZoneIcon = (zoneName: string) => {
  const lowerName = zoneName.toLowerCase();
  
  if (lowerName.includes('acesid')) {
    return <Key size={18} />;
  } else if (lowerName.includes('ocsp')) {
    return <Shield size={18} />;
  } else if (lowerName.includes('websso') || lowerName.includes('itg')) {
    return <Globe size={18} />;
  } else if (lowerName.includes('refsg')) {
    return <Database size={18} />;
  } else if (lowerName.includes('micro-segmentation')) {
    return <Grid size={18} />;
  } else if (lowerName.includes('epv')) {
    return <Server size={18} />;
  } else if (lowerName.includes('finance') || lowerName.includes('financial')) {
    return <CreditCard size={18} />;
  } else if (lowerName.includes('business') || lowerName.includes('corp')) {
    return <Building size={18} />;
  }
  
  return <Shield size={18} />;
};

export const getZoneColor = (zoneName: string): 'red' | 'amber' | 'orange' | 'blue' | 'emerald' | 'purple' | 'green' => {
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
  problemsLast72h: [],
  vitalForGroupMZs: [],
  vitalForEntrepriseMZs: [],
  selectedZone: null,
  sidebarCollapsed: false,
  activeTab: 'hosts',
  processGroups: [],
  hosts: [],
  services: [],
  summaryData: null,
  isLoading: {
    problems: true,
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

// Fournisseur du contexte
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

  // Référence pour éviter les chargements en boucle
  const initialLoadRef = useRef(false);
  
  // Sélectionner l'API appropriée
  const apiClient = useMemo(() => optimized ? optimizedApi : api, [optimized]);

  // Fonction pour obtenir les icônes des process
  const getProcessIcon = useCallback((techIcon: string) => {
    const techLower = techIcon.toLowerCase();
    
    if (techLower === 'database') {
      return <Database size={14} />;
    } else if (techLower === 'coffee') {
      return <span className="text-amber-500">☕</span>;
    } else if (techLower === 'snake') {
      return <span className="text-green-500">🐍</span>;
    }
    
    return <span className="text-blue-500">⚙️</span>;
  }, []);

  // Fonction optimisée pour charger les données d'une zone
  const loadZoneData = useCallback(async (zoneId: string) => {
    console.log(`Loading zone data for zoneId: ${zoneId}`);
    setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, zoneDetails: true } }));
    const startTime = performance.now();
    
    try {
      // Chercher la zone dans les deux collections
      let selectedZoneObj = state.vitalForGroupMZs.find(zone => zone.id === zoneId) ||
                           state.vitalForEntrepriseMZs.find(zone => zone.id === zoneId);
      
      if (!selectedZoneObj) {
        console.error(`Zone not found with id: ${zoneId}`);
        setState(prev => ({ 
          ...prev, 
          error: `Zone introuvable (ID: ${zoneId})`,
          isLoading: { ...prev.isLoading, zoneDetails: false }
        }));
        return;
      }
      
      // Définir la management zone
      try {
        const setMzResponse = await apiClient.setManagementZone(selectedZoneObj.name);
        
        if (setMzResponse.error) {
          console.error('Erreur lors de la définition de la MZ:', setMzResponse.error);
          setState(prev => ({ 
            ...prev, 
            error: `Erreur lors de la définition de la MZ: ${setMzResponse.error}`,
            isLoading: { ...prev.isLoading, zoneDetails: false }
          }));
          return;
        }
      } catch (error) {
        console.error('Exception lors de la définition de la MZ:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Erreur réseau lors de la définition de la zone',
          isLoading: { ...prev.isLoading, zoneDetails: false }
        }));
        return;
      }
      
      // En mode optimisé, utiliser loadDashboardData
      if (optimized && 'loadDashboardData' in apiClient) {
        try {
          const dashboardData = await apiClient.loadDashboardData(selectedZoneObj.name);
          
          // Transformer les données des process groups
          if (dashboardData.processes.data && dashboardData.processes.data.length > 0) {
            const processGroups: ProcessGroup[] = dashboardData.processes.data.map((process: any) => ({
              id: process.id || `proc-${Math.random().toString(36).substring(2, 9)}`,
              name: process.name || "Processus inconnu",
              technology: process.technology || "Non spécifié",
              icon: getProcessIcon(process.tech_icon || ''),
              dt_url: process.dt_url || "#",
              type: ((process.tech_icon && process.tech_icon.toLowerCase().includes('database')) 
                ? 'database' : 'technology') as 'database' | 'technology' | 'server'
            }));
            
            setState(prev => ({ ...prev, processGroups }));
            setPerformanceMetrics(prev => ({
              ...prev,
              dataSizes: { ...prev.dataSizes, processes: processGroups.length }
            }));
          }
          
          // Mettre à jour les hosts
          if (dashboardData.hosts.data) {
            // Mettre à jour les hosts
            const hostsData = dashboardData.hosts.data;
            setState(prev => ({ ...prev, hosts: hostsData }));
            setPerformanceMetrics(prev => ({
              ...prev,
              dataSizes: { ...prev.dataSizes, hosts: hostsData.length }
            }));
            
            // Mettre à jour les comptages dans la liste des MZs
            const hostsCount = hostsData.length;
            const servicesCount = dashboardData.services.data ? dashboardData.services.data.length : 0;
            const processesCount = dashboardData.processes.data ? dashboardData.processes.data.length : 0;
            
            // Chercher la zone dans la collection appropriée et mettre à jour les comptages
            const isVFG = state.vitalForGroupMZs.some(zone => zone.id === zoneId);
            if (isVFG) {
              const updatedVFGMZs = state.vitalForGroupMZs.map(zone => {
                if (zone.id === zoneId) {
                  return {
                    ...zone,
                    hosts: hostsCount,
                    services: servicesCount,
                    apps: processesCount
                  };
                }
                return zone;
              });
              setState(prev => ({ ...prev, vitalForGroupMZs: updatedVFGMZs }));
            } else {
              const updatedVFEMZs = state.vitalForEntrepriseMZs.map(zone => {
                if (zone.id === zoneId) {
                  return {
                    ...zone,
                    hosts: hostsCount,
                    services: servicesCount,
                    apps: processesCount
                  };
                }
                return zone;
              });
              setState(prev => ({ ...prev, vitalForEntrepriseMZs: updatedVFEMZs }));
            }
          }
          
          // Mettre à jour les services
          if (dashboardData.services.data) {
            setState(prev => ({ ...prev, services: dashboardData.services.data }));
            setPerformanceMetrics(prev => ({
              ...prev,
              dataSizes: { ...prev.dataSizes, services: dashboardData.services.data.length }
            }));
          }
          
        } catch (error) {
          console.error('Erreur lors du chargement des données du dashboard:', error);
        }
      } else {
        // Mode standard: charger les données séparément
        let processData: any[] = [];
        let hostsData: Host[] = [];
        let servicesData: Service[] = [];
        
        // Récupérer les données en parallèle
        const [processResponse, hostsResponse, servicesResponse] = await Promise.all([
          apiClient.getProcesses(),
          apiClient.getHosts(),
          apiClient.getServices()
        ]);
        
        // Traiter les données des process
        if (!processResponse.error && processResponse.data) {
          processData = Array.isArray(processResponse.data) ? processResponse.data : [];
          
          // Transformer les données
          const processGroups: ProcessGroup[] = processData.map((process) => ({
            id: process.id || `proc-${Math.random().toString(36).substring(2, 9)}`,
            name: process.name || "Processus inconnu",
            technology: process.technology || "Non spécifié",
            icon: getProcessIcon(process.tech_icon || ''),
            dt_url: process.dt_url || "#",
            type: ((process.tech_icon && process.tech_icon.toLowerCase().includes('database')) 
              ? 'database' : 'technology') as 'database' | 'technology' | 'server'
          }));
          
          setState(prev => ({ ...prev, processGroups }));
        }
        
        // Traiter les données des hosts
        if (!hostsResponse.error && hostsResponse.data) {
          hostsData = Array.isArray(hostsResponse.data) ? hostsResponse.data : [];
          setState(prev => ({ ...prev, hosts: hostsData }));
          
          // Récupérer les comptages pour mettre à jour la liste des MZs
          const hostsCount = hostsData.length;
          const servicesCount = Array.isArray(servicesData) ? servicesData.length : 0;
          const processCount = Array.isArray(processData) ? processData.length : 0;
            
          // Mettre à jour les comptages dans la liste des MZs
          const isVFG = state.vitalForGroupMZs.some(zone => zone.id === zoneId);
          if (isVFG) {
            const updatedVFGMZs = state.vitalForGroupMZs.map(zone => {
              if (zone.id === zoneId) {
                return {
                  ...zone,
                  hosts: hostsCount,
                  services: servicesCount,
                  apps: processCount
                };
              }
              return zone;
            });
            setState(prev => ({ ...prev, vitalForGroupMZs: updatedVFGMZs }));
          } else {
            const updatedVFEMZs = state.vitalForEntrepriseMZs.map(zone => {
              if (zone.id === zoneId) {
                return {
                  ...zone,
                  hosts: hostsCount,
                  services: servicesCount,
                  apps: processCount
                };
              }
              return zone;
            });
            setState(prev => ({ ...prev, vitalForEntrepriseMZs: updatedVFEMZs }));
          }
        }
        
        // Traiter les données des services
        if (!servicesResponse.error && servicesResponse.data) {
          servicesData = Array.isArray(servicesResponse.data) ? servicesResponse.data : [];
          setState(prev => ({ ...prev, services: servicesData }));
        }
      }
      
      const endTime = performance.now();
      console.log(`Zone data loaded in ${endTime - startTime}ms`);
      
      if (optimized) {
        setPerformanceMetrics(prev => ({
          ...prev,
          loadTime: endTime - startTime,
          lastRefresh: new Date()
        }));
      }
      
    } catch (error: any) {
      console.error('Erreur globale lors du chargement des données de la zone:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors du chargement des données pour la zone sélectionnée.'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, zoneDetails: false } }));
    }
  }, [state.vitalForGroupMZs, state.vitalForEntrepriseMZs, apiClient, optimized, getProcessIcon]);

  // Fonction pour charger toutes les données
  const loadAllData = useCallback(async (dashboardType?: 'vfg' | 'vfe', refreshProblemsOnly?: boolean) => {
    // Modification de la fonction pour utiliser async/await avec Promise.all
    console.log(`Loading all data for dashboard type: ${dashboardType || 'none'} ${refreshProblemsOnly ? '(problèmes uniquement)' : ''}`);
    const startTime = performance.now();
    
    setState(prev => ({ 
      ...prev, 
      isLoading: { 
        ...prev.isLoading, 
        problems: true, 
        vitalForGroupMZs: !refreshProblemsOnly,
        vitalForEntrepriseMZs: !refreshProblemsOnly,
        initialLoadComplete: false,
        dashboardData: !refreshProblemsOnly
      },
      error: null 
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
            vitalForGroupMZs: false,
            vitalForEntrepriseMZs: false,
            initialLoadComplete: true,
            dashboardData: false
          }
        }));
        return;
      }
      
      // Exécuter plusieurs requêtes en parallèle
      console.log(`Loading data for dashboard type: ${dashboardType}`);
      
      // Déclarer les variables avec leur type explicite
      let summaryResponse: ApiResponse<SummaryData> | undefined;
      let vfgResponse: ApiResponse<VitalForGroupMZsResponse> | undefined;
      let vfeResponse: ApiResponse<VitalForGroupMZsResponse> | undefined;
      let problemsResponse: ApiResponse<ProblemResponse[]> | undefined;
      let problemsLast72hResponse: ApiResponse<ProblemResponse[]> | undefined;
      
      // Si on ne rafraîchit que les problèmes, ne récupérer que les données de problèmes
      if (refreshProblemsOnly) {
        const responses = await Promise.all([
          apiClient.getProblems("OPEN", "-60d", dashboardType, true),  // Force le rafraîchissement pour les problèmes actifs sur 60 jours
          apiClient.getProblems72h(dashboardType, undefined, true)   // Utilise le nouvel endpoint dédié pour les problèmes 72h
        ]);
        problemsResponse = responses[0] as ApiResponse<ProblemResponse[]>;
        problemsLast72hResponse = responses[1] as ApiResponse<ProblemResponse[]>;
        console.log('Rafraîchissement des problèmes uniquement terminé');
      } else {
        // Chargement complet de toutes les données
        const responses = await Promise.all([
          apiClient.getSummary(),
          apiClient.getVitalForGroupMZs(),
          apiClient.getVitalForEntrepriseMZs(),
          apiClient.getProblems("OPEN", "-60d", dashboardType, true),  // Force le rafraîchissement pour les problèmes actifs sur 60 jours
          apiClient.getProblems72h(dashboardType, undefined, true)   // Utilise le nouvel endpoint dédié pour les problèmes 72h
        ]);
        summaryResponse = responses[0] as ApiResponse<SummaryData>;
        vfgResponse = responses[1] as ApiResponse<VitalForGroupMZsResponse>;
        vfeResponse = responses[2] as ApiResponse<VitalForGroupMZsResponse>;
        problemsResponse = responses[3] as ApiResponse<ProblemResponse[]>;
        problemsLast72hResponse = responses[4] as ApiResponse<ProblemResponse[]>;
      }
      console.log('Réponse problèmes 72h (dashboard type):', dashboardType, problemsLast72hResponse);
      console.log('Réponse problèmes 72h:', problemsLast72hResponse);

      // Traiter les données du résumé si disponibles et si ce n'est pas un rafraîchissement des problèmes uniquement
      if (!refreshProblemsOnly && summaryResponse && !summaryResponse.error && summaryResponse.data) {
        const data = summaryResponse.data;
        setState(prev => ({ ...prev, summaryData: data as SummaryData }));
      }
      
      // Traiter les données des MZs VFG et VFE si ce n'est pas un rafraîchissement des problèmes uniquement
      let vfgMZs: ManagementZone[] = [];
      let vfeMZs: ManagementZone[] = [];
      
      if (!refreshProblemsOnly) {
        if (vfgResponse && !vfgResponse.error && vfgResponse.data?.mzs) {
          // Obtenir les comptages pour chaque zone en parallèle
          const mzPromises = vfgResponse.data.mzs.map(async (mzName) => {
            try {
              console.log(`Récupération des comptages pour la MZ VFG: ${mzName}`);
              
              // Récupérer les comptages depuis l'API
              const response = await fetch(`${API_BASE_URL}/management-zones/counts?zone=${encodeURIComponent(mzName)}`);
              
              if (response.ok) {
                const data = await response.json();
                const counts = data.counts || { hosts: 0, services: 0, processes: 0 };
                console.log(`Comptages reçus pour ${mzName}:`, counts);
                
                return {
                  id: `env-${mzName.replace(/\s+/g, '-')}`,
                  name: mzName,
                  code: mzName.replace(/^.*?([A-Z0-9]+).*$/, '$1') || 'MZ',
                  icon: getZoneIcon(mzName),
                  problemCount: 0,
                  apps: counts.processes,
                  services: counts.services,
                  hosts: counts.hosts,
                  availability: "99.99%", // Pour l'instant, valeur par défaut
                  status: "healthy" as "healthy" | "warning",
                  color: getZoneColor(mzName),
                  dt_url: "#"
                };
              } else {
                console.error(`Erreur ${response.status} pour ${mzName}: ${await response.text()}`);
                throw new Error(`Erreur API ${response.status}`);
              }
            } catch (error) {
              console.error(`Erreur pour ${mzName}:`, error);
              // En cas d'erreur, retourner un objet avec des comptages à 0
              return {
                id: `env-${mzName.replace(/\s+/g, '-')}`,
                name: mzName,
                code: mzName.replace(/^.*?([A-Z0-9]+).*$/, '$1') || 'MZ',
                icon: getZoneIcon(mzName),
                problemCount: 0,
                apps: 0,
                services: 0,
                hosts: 0,
                availability: "99.99%",
                status: "healthy" as "healthy" | "warning",
                color: getZoneColor(mzName),
                dt_url: "#"
              };
            }
          });
          
          // Attendre la résolution de toutes les promesses
          vfgMZs = await Promise.all(mzPromises);
          
          setState(prev => ({ ...prev, vitalForGroupMZs: vfgMZs }));
        }
        
        if (vfeResponse && !vfeResponse.error && vfeResponse.data?.mzs) {
          // Obtenir les comptages pour chaque zone en parallèle
          const mzPromises = vfeResponse.data.mzs.map(async (mzName) => {
            try {
              console.log(`Récupération des comptages pour la MZ VFE: ${mzName}`);
              
              // Récupérer les comptages depuis l'API
              const response = await fetch(`${API_BASE_URL}/management-zones/counts?zone=${encodeURIComponent(mzName)}`);
              
              if (response.ok) {
                const data = await response.json();
                const counts = data.counts || { hosts: 0, services: 0, processes: 0 };
                console.log(`Comptages reçus pour ${mzName}:`, counts);
                
                return {
                  id: `env-${mzName.replace(/\s+/g, '-')}`,
                  name: mzName,
                  code: mzName.replace(/^.*?([A-Z0-9]+).*$/, '$1') || 'MZ',
                  icon: getZoneIcon(mzName),
                  problemCount: 0,
                  apps: counts.processes,
                  services: counts.services,
                  hosts: counts.hosts,
                  availability: "99.99%", // Pour l'instant, valeur par défaut
                  status: "healthy" as "healthy" | "warning",
                  color: getZoneColor(mzName),
                  dt_url: "#"
                };
              } else {
                console.error(`Erreur ${response.status} pour ${mzName}: ${await response.text()}`);
                throw new Error(`Erreur API ${response.status}`);
              }
            } catch (error) {
              console.error(`Erreur pour ${mzName}:`, error);
              // En cas d'erreur, retourner un objet avec des comptages à 0
              return {
                id: `env-${mzName.replace(/\s+/g, '-')}`,
                name: mzName,
                code: mzName.replace(/^.*?([A-Z0-9]+).*$/, '$1') || 'MZ',
                icon: getZoneIcon(mzName),
                problemCount: 0,
                apps: 0,
                services: 0,
                hosts: 0,
                availability: "99.99%",
                status: "healthy" as "healthy" | "warning",
                color: getZoneColor(mzName),
                dt_url: "#"
              };
            }
          });
          
          // Attendre la résolution de toutes les promesses
          vfeMZs = await Promise.all(mzPromises);
          
          setState(prev => ({ ...prev, vitalForEntrepriseMZs: vfeMZs }));
        }
      } else {
        // En cas de rafraîchissement des problèmes uniquement, réutiliser les MZs existantes
        vfgMZs = state.vitalForGroupMZs;
        vfeMZs = state.vitalForEntrepriseMZs;
      }
      
      // Traiter les données des problèmes actifs
// Traiter les données des problèmes actifs
if (problemsResponse && !problemsResponse.error && problemsResponse.data) {
  const problemsData = problemsResponse.data;
  
  if (Array.isArray(problemsData)) {
    // Transformer les données
    const problems: Problem[] = problemsData.map((problem) => {
      // Extraire le nom de l'hôte à partir des entités impactées (priorité)
      let hostName = '';
      
      // PRIORITÉ 1: Utiliser directement impactedEntities
      if (problem.impactedEntities && Array.isArray(problem.impactedEntities)) {
        const hostEntity = problem.impactedEntities.find(entity => 
          entity.entityId && entity.entityId.type === 'HOST' && entity.name);
        if (hostEntity) {
          hostName = hostEntity.name;
          console.log(`Nom d'hôte extrait de impactedEntities pour le problème ${problem.id}: ${hostName}`);
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
        host: hostName, // Utiliser le nom d'hôte extrait
        impacted: hostName, // Pour compatibilité
        impactedEntities: problem.impactedEntities, // Transférer les entités impactées pour utilisation dans ProblemCard
        rootCauseEntity: problem.rootCauseEntity // Transférer aussi la cause racine si disponible
      };
    });
    
    setState(prev => ({ ...prev, activeProblems: problems }));
    
    if (optimized) {
      setPerformanceMetrics(prev => ({
        ...prev,
        dataSizes: { ...prev.dataSizes, problems: problems.length }
      }));
    }
    
    // Mettre à jour les compteurs de problèmes pour les MZs
    const updatedVfgMZs = vfgMZs.map(zone => {
      const zoneProblems = problems.filter(p => p.zone && p.zone.includes(zone.name));
      return {
        ...zone,
        problemCount: zoneProblems.length,
        status: (zoneProblems.length > 0 ? "warning" : "healthy") as "warning" | "healthy"
      };
    });
    
    const updatedVfeMZs = vfeMZs.map(zone => {
      const zoneProblems = problems.filter(p => p.zone && p.zone.includes(zone.name));
      return {
        ...zone,
        problemCount: zoneProblems.length,
        status: (zoneProblems.length > 0 ? "warning" : "healthy") as "warning" | "healthy"
      };
    });
    
    setState(prev => ({
      ...prev,
      vitalForGroupMZs: updatedVfgMZs,
      vitalForEntrepriseMZs: updatedVfeMZs
    }));
  }
}
      
      // Traiter les données des problèmes des 72 dernières heures
      if (problemsLast72hResponse && !problemsLast72hResponse.error && problemsLast72hResponse.data) {
        const problemsData = problemsLast72hResponse.data;
        
        if (Array.isArray(problemsData)) {
          // Transformer les données
          const problems: Problem[] = problemsData.map((problem) => {
            // Extraire le nom de l'hôte à partir des entités impactées (priorité)
            let hostName = '';
            
            // PRIORITÉ 1: Utiliser directement impactedEntities
            if (problem.impactedEntities && Array.isArray(problem.impactedEntities)) {
              const hostEntity = problem.impactedEntities.find(entity => 
                entity.entityId && entity.entityId.type === 'HOST' && entity.name);
              if (hostEntity) {
                hostName = hostEntity.name;
                console.log(`Nom d'hôte extrait de impactedEntities pour le problème 72h ${problem.id}: ${hostName}`);
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
            
            // PRIORITÉ 3: Extraire du titre si toujours rien
            if (!hostName && problem.title && problem.title.toLowerCase().includes('host')) {
              const words = problem.title.split(' ');
              // On prend le mot après "host" s'il existe
              const hostIndex = words.findIndex(word => word.toLowerCase() === 'host');
              if (hostIndex !== -1 && hostIndex < words.length - 1) {
                hostName = words[hostIndex + 1];
              }
            }
            
            return {
              id: problem.id || `PROB-${Math.random().toString(36).substr(2, 9)}`,
              title: problem.title || "Problème résolu",
              code: problem.id ? problem.id.substring(0, 7) : "UNKNOWN",
              subtitle: `${problem.zone || "Non spécifié"} - Impact: ${problem.impact || "INCONNU"}`,
              time: problem.start_time ? `Détecté le ${problem.start_time}` : "Récent",
              type: problem.impact === "INFRASTRUCTURE" ? "Problème d'Infrastructure" : "Problème de Service",
              status: "warning", // Tous les problèmes sur 72h ont un statut visuel warning
              impact: problem.impact === "INFRASTRUCTURE" ? "ÉLEVÉ" : problem.impact === "SERVICE" ? "MOYEN" : "FAIBLE",
              zone: problem.zone || "Non spécifié",
              servicesImpacted: problem.affected_entities ? problem.affected_entities.toString() : "0",
              dt_url: problem.dt_url || "#",
              duration: problem.duration || "",
              resolved: problem.resolved || false,
              host: hostName, // Utiliser le nom d'hôte extrait
              impacted: hostName, // Pour compatibilité
              impactedEntities: problem.impactedEntities, // Transférer les entités impactées pour utilisation dans ProblemCard
              rootCauseEntity: problem.rootCauseEntity // Transférer aussi la cause racine si disponible
            };
          });
          
          console.log(`Problèmes 72h transformés: ${problems.length}`);
          setState(prev => ({ ...prev, problemsLast72h: problems }));
        } else {
          console.error("Données de problèmes 72h non valides:", problemsData);
        }
      } else {
        console.error("Erreur lors de la récupération des problèmes 72h:", problemsLast72hResponse?.error);
      }
      
      // Si une zone est sélectionnée, charger ses données
      if (state.selectedZone) {
        await loadZoneData(state.selectedZone);
      }
      
      // Mettre à jour les performances
      if (optimized) {
        setPerformanceMetrics(prev => ({
          ...prev,
          loadTime: performance.now() - startTime,
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
          vitalForGroupMZs: !refreshProblemsOnly ? false : prev.isLoading.vitalForGroupMZs,
          vitalForEntrepriseMZs: !refreshProblemsOnly ? false : prev.isLoading.vitalForEntrepriseMZs,
          initialLoadComplete: !refreshProblemsOnly ? true : prev.isLoading.initialLoadComplete,
          dashboardData: false
        } 
      }));
    }
  }, [state.selectedZone, state.vitalForGroupMZs, state.vitalForEntrepriseMZs, loadZoneData, apiClient, optimized, getZoneIcon, getZoneColor]);

  // Drapeau pour éviter les appels multiples à refreshData
  const refreshInProgressRef = useRef(false);

  // Fonction pour rafraîchir les données - version non bloquante améliorée
  const refreshData = useCallback(async (dashboardType?: 'vfg' | 'vfe', refreshProblemsOnly?: boolean): Promise<void> => {
    // Éviter les appels multiples simultanés
    if (refreshInProgressRef.current) {
      console.log("Un rafraîchissement est déjà en cours, nouvelle demande ignorée");
      return;
    }
    
    // Marquer le début du rafraîchissement
    refreshInProgressRef.current = true;
    
    console.log(`Refreshing data for dashboard type: ${dashboardType || 'none'} ${refreshProblemsOnly ? '(problèmes uniquement)' : ''}`);
    setState(prev => ({ ...prev, error: null }));
    
    // Définir un timeout maximum pour éviter que le drapeau reste bloqué
    const timeoutId = setTimeout(() => {
      console.log("Timeout de sécurité pour refreshData : réinitialisation du drapeau");
      refreshInProgressRef.current = false;
    }, 60000); // 60 secondes maximum
    
    // Gérer les erreurs dans la fonction
    try {
      // Exécuter loadAllData de manière non bloquante si on est dans un contexte de zone détaillée
      if (refreshProblemsOnly && state.selectedZone) {
        console.log("Mode de rafraîchissement non bloquant activé pour les problèmes en zone");
        
        // Mettre à jour l'état pour indiquer le chargement des problèmes
        setState(prev => ({ 
          ...prev, 
          isLoading: { 
            ...prev.isLoading, 
            problems: true
          }
        }));
        
        // Exécuter loadAllData avec un timeout court pour s'assurer que l'UI reste réactive
        await new Promise<void>((resolve, reject) => {
          setTimeout(async () => {
            try {
              await loadAllData(dashboardType, true);
              resolve();
            } catch (error) {
              console.error("Erreur dans le rafraîchissement asynchrone:", error);
              reject(error);
            } finally {
              setState(prev => ({ 
                ...prev, 
                isLoading: { 
                  ...prev.isLoading, 
                  problems: false
                }
              }));
            }
          }, 10);
        });
      } else {
        // Dans les autres cas, exécuter normalement
        await loadAllData(dashboardType, refreshProblemsOnly || false);
      }
    } catch (error) {
      console.error("Erreur dans refreshData:", error);
      setState(prev => ({ 
        ...prev, 
        isLoading: { 
          ...prev.isLoading, 
          problems: false
        },
        error: "Erreur lors du rafraîchissement des données"
      }));
    } finally {
      // Réinitialiser le drapeau et nettoyer le timeout
      refreshInProgressRef.current = false;
      clearTimeout(timeoutId);
    }
  }, [loadAllData, state.selectedZone]); // Ajout de state.selectedZone comme dépendance

  // Charger les données initiales et configurer le rafraîchissement automatique
  useEffect(() => {
    if (!initialLoadRef.current) {
      console.log("Initial data load");
      initialLoadRef.current = true;
      loadAllData(undefined, false);
    }
    
    // Variable pour suivre si un rafraîchissement est en cours
    let isRefreshInProgress = false;
    
    // Rafraîchir automatiquement les problèmes actifs toutes les 5 minutes
    const refreshInterval = 300000; // 5 minutes en millisecondes
    
    console.log(`Configuration du rafraîchissement automatique des problèmes toutes les ${refreshInterval/1000} secondes`);
    
    // Configurer l'intervalle
    const intervalId = setInterval(() => {
      // Éviter les rafraîchissements multiples simultanés
      if (isRefreshInProgress) {
        console.log("Rafraîchissement déjà en cours, nouvelle tentative ignorée");
        return;
      }
      
      console.log("Rafraîchissement automatique des problèmes actifs");
      
      // Marquer le début du rafraîchissement
      isRefreshInProgress = true;
      
      // Récupérer le type de dashboard actuel (vfg ou vfe)
      const currentDashboardType = window.location.pathname.includes('vfe') ? 'vfe' : 'vfg';
      
      // Vérifier si on est sur une page de détail de zone
      const isZoneDetailPage = state.selectedZone !== null;
      
      console.log(`Rafraîchissement automatique sur page de détail zone: ${isZoneDetailPage ? 'oui' : 'non'}`);
      
      // Ne pas bloquer l'interface pendant le rafraîchissement
      setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, problems: true }}));
      
      // Définir un timeout pour s'assurer que l'indicateur de chargement ne reste pas bloqué
      const timeoutId = setTimeout(() => {
        console.log("Timeout de sécurité déclenché pour le rafraîchissement des problèmes");
        setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, problems: false }}));
        isRefreshInProgress = false; // Réinitialiser le drapeau
      }, 30000); // 30 secondes maximum
      
      // Utiliser un microtask pour exécuter le rafraîchissement
      Promise.resolve().then(async () => {
        try {
          await refreshData(currentDashboardType as 'vfg' | 'vfe', true);
          console.log("Rafraîchissement automatique des problèmes terminé avec succès");
        } catch (err) {
          console.error("Erreur lors du rafraîchissement automatique des problèmes:", err);
        } finally {
          // S'assurer que l'indicateur de chargement est bien désactivé
          setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, problems: false }}));
          // Nettoyer le timeout
          clearTimeout(timeoutId);
          // Marquer la fin du rafraîchissement
          isRefreshInProgress = false;
        }
      });
    }, refreshInterval);
    
    // Nettoyer l'intervalle lors du démontage du composant
    return () => {
      clearInterval(intervalId);
    };
  }, [loadAllData, refreshData]);

  // Fonction pour définir la zone sélectionnée et charger ses données
  const setSelectedZoneAndLoadData = useCallback((zoneId: string | null) => {
    // Mettre d'abord l'état en chargement pour éviter tout affichage incomplet
    setState(prev => ({ 
      ...prev, 
      selectedZone: zoneId,
      isLoading: { ...prev.isLoading, zoneDetails: true }
    }));
    
    if (zoneId) {
      // Force le rafraîchissement complet avant de charger les données de la zone
      try {
        // Récupérer les comptages à jour pour la zone sélectionnée
        console.log(`Récupération prioritaire des comptages pour ${zoneId}`);
        
        // Trouver la zone dans l'une des collections
        const selectedZone = state.vitalForGroupMZs.find((z: ManagementZone) => z.id === zoneId) || 
                           state.vitalForEntrepriseMZs.find((z: ManagementZone) => z.id === zoneId);
        
        if (selectedZone) {
          // Forcer un préchargement spécifique des données de services pour cette zone
          apiClient.setManagementZone(selectedZone.name)
            .then(() => {
              return apiClient.getServices();
            })
            .then(servicesResponse => {
              if (!servicesResponse.error && servicesResponse.data) {
                const servicesData = Array.isArray(servicesResponse.data) ? servicesResponse.data : [];
                const servicesCount = servicesData.length;
                
                console.log(`Préchargement des services pour ${selectedZone.name}: ${servicesCount} services trouvés`);
                
                // Mettre à jour immédiatement le comptage des services pour cette zone
                const isVFG = state.vitalForGroupMZs.some((zone: ManagementZone) => zone.id === zoneId);
                if (isVFG) {
                  setState(prev => ({
                    ...prev,
                    vitalForGroupMZs: prev.vitalForGroupMZs.map(zone => 
                      zone.id === zoneId ? {...zone, services: servicesCount} : zone
                    )
                  }));
                } else {
                  setState(prev => ({
                    ...prev,
                    vitalForEntrepriseMZs: prev.vitalForEntrepriseMZs.map(zone => 
                      zone.id === zoneId ? {...zone, services: servicesCount} : zone
                    )
                  }));
                }
              }
              
              // Continuer avec le chargement normal
              loadZoneData(zoneId);
            })
            .catch(error => {
              console.error('Erreur lors du préchargement des services:', error);
              // Continuer avec le chargement normal même en cas d'erreur
              loadZoneData(zoneId);
            });
        } else {
          // Zone non trouvée, procéder au chargement normal
          loadZoneData(zoneId);
        }
      } catch (error) {
        console.error('Erreur générale lors du préchargement:', error);
        // En cas d'erreur, continuer avec le chargement normal
        loadZoneData(zoneId);
      }
    }
  }, [loadZoneData, state.vitalForGroupMZs, state.vitalForEntrepriseMZs, apiClient]);

  // Fonctions pour modifier l'état
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState(prev => ({ ...prev, sidebarCollapsed: collapsed }));
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // Valeur du contexte
  const contextValue = useMemo<AppContextType>(() => ({
    ...state,
    setSelectedZone: setSelectedZoneAndLoadData,
    setSidebarCollapsed,
    setActiveTab,
    refreshData,
    performanceMetrics: state.performanceMetrics || performanceMetrics,
    ...(optimized ? {
      loadZoneData
    } : {})
  }), [
    state,
    setSelectedZoneAndLoadData,
    setSidebarCollapsed,
    setActiveTab,
    refreshData,
    optimized,
    loadZoneData,
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