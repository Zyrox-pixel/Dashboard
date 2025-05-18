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
  ProblemResponse,
  DashboardVariant
} from '../api/types';
import { API_BASE_URL } from '../api/endpoints';
import { Database, Shield, Key, Globe, Server, Grid, Building, CreditCard } from 'lucide-react';
import cacheService, { CACHE_DURATIONS } from '../utils/cacheService';

// Types unifiés pour les contextes
export interface AppStateType {
  activeProblems: Problem[];
  problemsLast72h: Problem[]; 
  vitalForGroupMZs: ManagementZone[];
  vitalForEntrepriseMZs: ManagementZone[];
  detectionMZs: ManagementZone[];
  encryptionMZs: ManagementZone[];
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
    detectionMZs: boolean;
    encryptionMZs: boolean;
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
  refreshData: (dashboardType?: DashboardVariant, refreshProblemsOnly?: boolean, timeframe?: string) => Promise<void>;
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
  detectionMZs: [],
  encryptionMZs: [],
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
    detectionMZs: true,
    encryptionMZs: true,
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
    // Error checking backend status
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
    setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, zoneDetails: true } }));
    const startTime = performance.now();
    
    try {
      // Chercher la zone dans toutes les collections
      let selectedZoneObj = state.vitalForGroupMZs.find(zone => zone.id === zoneId) ||
                           state.vitalForEntrepriseMZs.find(zone => zone.id === zoneId) ||
                           state.detectionMZs.find(zone => zone.id === zoneId) ||
                           state.encryptionMZs.find(zone => zone.id === zoneId);
      
      if (!selectedZoneObj) {
        // Zone not found error handled in state update
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
          // MZ definition error handled in state update
          setState(prev => ({ 
            ...prev, 
            error: `Erreur lors de la définition de la MZ: ${setMzResponse.error}`,
            isLoading: { ...prev.isLoading, zoneDetails: false }
          }));
          return;
        }
      } catch (error) {
        // MZ exception handled in state update
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
            const isVFE = state.vitalForEntrepriseMZs.some(zone => zone.id === zoneId);
            const isDetection = state.detectionMZs.some(zone => zone.id === zoneId);
            const isEncryption = state.encryptionMZs.some(zone => zone.id === zoneId);
            
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
            } else if (isVFE) {
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
            } else if (isDetection) {
              const updatedDetectionMZs = state.detectionMZs.map(zone => {
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
              setState(prev => ({ ...prev, detectionMZs: updatedDetectionMZs }));
            } else if (isEncryption) {
              const updatedEncryptionMZs = state.encryptionMZs.map(zone => {
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
              setState(prev => ({ ...prev, encryptionMZs: updatedEncryptionMZs }));
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
          // Dashboard data loading error
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
          const isVFE = state.vitalForEntrepriseMZs.some(zone => zone.id === zoneId);
          const isDetection = state.detectionMZs.some(zone => zone.id === zoneId);
          const isEncryption = state.encryptionMZs.some(zone => zone.id === zoneId);
          
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
          } else if (isVFE) {
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
          } else if (isDetection) {
            const updatedDetectionMZs = state.detectionMZs.map(zone => {
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
            setState(prev => ({ ...prev, detectionMZs: updatedDetectionMZs }));
          } else if (isEncryption) {
            const updatedEncryptionMZs = state.encryptionMZs.map(zone => {
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
            setState(prev => ({ ...prev, encryptionMZs: updatedEncryptionMZs }));
          }
        }
        
        // Traiter les données des services
        if (!servicesResponse.error && servicesResponse.data) {
          servicesData = Array.isArray(servicesResponse.data) ? servicesResponse.data : [];
          setState(prev => ({ ...prev, services: servicesData }));
        }
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
      // Global zone data loading error handled in state update
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors du chargement des données pour la zone sélectionnée.'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, zoneDetails: false } }));
    }
  }, [state.vitalForGroupMZs, state.vitalForEntrepriseMZs, state.detectionMZs, state.encryptionMZs, apiClient, optimized, getProcessIcon]);

  // Fonction pour charger toutes les données
  const loadAllData = useCallback(async (dashboardType?: DashboardVariant, refreshProblemsOnly?: boolean, silentMode: boolean = false, timeframe?: string) => {
    // Modification de la fonction pour utiliser async/await avec Promise.all
    const startTime = performance.now();
    
    // Ne mettre à jour les indicateurs de chargement que si nous ne sommes pas en mode silencieux
    if (!silentMode) {
      setState(prev => ({ 
        ...prev, 
        isLoading: { 
          ...prev.isLoading, 
          problems: true, 
          vitalForGroupMZs: !refreshProblemsOnly,
          vitalForEntrepriseMZs: !refreshProblemsOnly,
          detectionMZs: !refreshProblemsOnly,
          encryptionMZs: !refreshProblemsOnly,
          initialLoadComplete: false,
          dashboardData: !refreshProblemsOnly
        },
        error: null 
      }));
    }
    
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
            detectionMZs: false,
            encryptionMZs: false,
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
      let detectionResponse: ApiResponse<VitalForGroupMZsResponse> | undefined;
      let encryptionResponse: ApiResponse<VitalForGroupMZsResponse> | undefined;
      let problemsResponse: ApiResponse<ProblemResponse[]> | undefined;
      let problemsLast72hResponse: ApiResponse<ProblemResponse[]> | undefined;
      
      // Si on ne rafraîchit que les problèmes, ne récupérer que les données de problèmes
      if (refreshProblemsOnly) {
        const responses = await Promise.all([
          apiClient.getProblems("OPEN", "-60d", dashboardType, true),  // Force le rafraîchissement pour les problèmes actifs sur 60 jours
          apiClient.getProblems72h(dashboardType, undefined, true, timeframe)   // Utilise le nouvel endpoint dédié pour les problèmes avec la période spécifiée
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
          apiClient.getDetectionMZs(),
          apiClient.getEncryptionMZs(),
          apiClient.getProblems("OPEN", "-60d", dashboardType, true),  // Force le rafraîchissement pour les problèmes actifs sur 60 jours
          apiClient.getProblems72h(dashboardType, undefined, true, timeframe)   // Utilise le nouvel endpoint dédié pour les problèmes avec la période spécifiée
        ]);
        summaryResponse = responses[0] as ApiResponse<SummaryData>;
        vfgResponse = responses[1] as ApiResponse<VitalForGroupMZsResponse>;
        vfeResponse = responses[2] as ApiResponse<VitalForGroupMZsResponse>;
        detectionResponse = responses[3] as ApiResponse<VitalForGroupMZsResponse>;
        encryptionResponse = responses[4] as ApiResponse<VitalForGroupMZsResponse>;
        problemsResponse = responses[5] as ApiResponse<ProblemResponse[]>;
        problemsLast72hResponse = responses[6] as ApiResponse<ProblemResponse[]>;
      }

      // Traiter les données du résumé si disponibles et si ce n'est pas un rafraîchissement des problèmes uniquement
      if (!refreshProblemsOnly && summaryResponse && !summaryResponse.error && summaryResponse.data) {
        const data = summaryResponse.data;
        setState(prev => ({ ...prev, summaryData: data as SummaryData }));
      }
      
      // Traiter les données des MZs VFG, VFE, Detection et Encryption si ce n'est pas un rafraîchissement des problèmes uniquement
      let vfgMZs: ManagementZone[] = [];
      let vfeMZs: ManagementZone[] = [];
      let detectionMZs: ManagementZone[] = [];
      let encryptionMZs: ManagementZone[] = [];
      
      if (!refreshProblemsOnly) {
        if (vfgResponse && !vfgResponse.error && vfgResponse.data?.mzs) {
          // Obtenir les comptages pour chaque zone en parallèle
          const mzPromises = vfgResponse.data.mzs.map(async (mzName) => {
            try {
                      
              // Récupérer les comptages depuis l'API
              const response = await fetch(`${API_BASE_URL}/management-zones/counts?zone=${encodeURIComponent(mzName)}`);
              
              if (response.ok) {
                const data = await response.json();
                const counts = data.counts || { hosts: 0, services: 0, processes: 0 };
                
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
                // API error handled in catch block
                throw new Error(`Erreur API ${response.status}`);
              }
            } catch (error) {
              // Error for MZ handled with fallback object
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
              
              // Récupérer les comptages depuis l'API
              const response = await fetch(`${API_BASE_URL}/management-zones/counts?zone=${encodeURIComponent(mzName)}`);
              
              if (response.ok) {
                const data = await response.json();
                const counts = data.counts || { hosts: 0, services: 0, processes: 0 };
                
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
                // API error handled in catch block
                throw new Error(`Erreur API ${response.status}`);
              }
            } catch (error) {
              // Error for MZ handled with fallback object
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
        
        // Traiter les données des MZs Detection
        if (detectionResponse && !detectionResponse.error && detectionResponse.data?.mzs) {
          // Obtenir les comptages pour chaque zone en parallèle
          const mzPromises = detectionResponse.data.mzs.map(async (mzName) => {
            try {
              
              // Récupérer les comptages depuis l'API
              const response = await fetch(`${API_BASE_URL}/management-zones/counts?zone=${encodeURIComponent(mzName)}`);
              
              if (response.ok) {
                const data = await response.json();
                const counts = data.counts || { hosts: 0, services: 0, processes: 0 };
                
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
                // API error handled in catch block
                throw new Error(`Erreur API ${response.status}`);
              }
            } catch (error) {
              // Error for MZ handled with fallback object
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
          detectionMZs = await Promise.all(mzPromises);
          
          setState(prev => ({ ...prev, detectionMZs }));
        }
        
        // Traiter les données des MZs Encryption
        if (encryptionResponse && !encryptionResponse.error && encryptionResponse.data?.mzs) {
          // Obtenir les comptages pour chaque zone en parallèle
          const mzPromises = encryptionResponse.data.mzs.map(async (mzName) => {
            try {
              
              // Récupérer les comptages depuis l'API
              const response = await fetch(`${API_BASE_URL}/management-zones/counts?zone=${encodeURIComponent(mzName)}`);
              
              if (response.ok) {
                const data = await response.json();
                const counts = data.counts || { hosts: 0, services: 0, processes: 0 };
                
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
                // API error handled in catch block
                throw new Error(`Erreur API ${response.status}`);
              }
            } catch (error) {
              // Error for MZ handled with fallback object
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
          encryptionMZs = await Promise.all(mzPromises);
          
          setState(prev => ({ ...prev, encryptionMZs }));
        }
      } else {
        // En cas de rafraîchissement des problèmes uniquement, réutiliser les MZs existantes
        vfgMZs = state.vitalForGroupMZs;
        vfeMZs = state.vitalForEntrepriseMZs;
        detectionMZs = state.detectionMZs;
        encryptionMZs = state.encryptionMZs;
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
    
    const updatedDetectionMZs = detectionMZs.map(zone => {
      const zoneProblems = problems.filter(p => p.zone && p.zone.includes(zone.name));
      return {
        ...zone,
        problemCount: zoneProblems.length,
        status: (zoneProblems.length > 0 ? "warning" : "healthy") as "warning" | "healthy"
      };
    });
    
    const updatedEncryptionMZs = encryptionMZs.map(zone => {
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
      vitalForEntrepriseMZs: updatedVfeMZs,
      detectionMZs: updatedDetectionMZs,
      encryptionMZs: updatedEncryptionMZs
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
          
          setState(prev => ({ ...prev, problemsLast72h: problems }));
        } else {
          // Invalid 72h problems data
        }
      } else {
        // Error retrieving 72h problems data
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
      // Ne réinitialiser les indicateurs de chargement que si nous ne sommes pas en mode silencieux
      if (!silentMode) {
        setState(prev => ({ 
          ...prev, 
          isLoading: { 
            ...prev.isLoading, 
            problems: false, 
            vitalForGroupMZs: !refreshProblemsOnly ? false : prev.isLoading.vitalForGroupMZs,
            vitalForEntrepriseMZs: !refreshProblemsOnly ? false : prev.isLoading.vitalForEntrepriseMZs,
            detectionMZs: !refreshProblemsOnly ? false : prev.isLoading.detectionMZs,
            encryptionMZs: !refreshProblemsOnly ? false : prev.isLoading.encryptionMZs,
            initialLoadComplete: !refreshProblemsOnly ? true : prev.isLoading.initialLoadComplete,
            dashboardData: false
          } 
        }));
      }
    }
  }, [state.selectedZone, state.vitalForGroupMZs, state.vitalForEntrepriseMZs, state.detectionMZs, state.encryptionMZs, loadZoneData, apiClient, optimized, getZoneIcon, getZoneColor]);

  // Drapeau pour éviter les appels multiples à refreshData
  const refreshInProgressRef = useRef(false);
  // Identifiant du dernier timeout pour éviter les collisions
  const refreshTimeoutIdRef = useRef<number | null>(null);

  // Fonction pour rafraîchir les données - version non bloquante améliorée avec prise en charge de la période
  const refreshData = useCallback(async (dashboardType?: DashboardVariant, refreshProblemsOnly?: boolean, timeframe?: string): Promise<void> => {
    // Éviter les appels multiples simultanés
    if (refreshInProgressRef.current) {
      console.log("Un rafraîchissement est déjà en cours, nouvelle demande ignorée");
      return;
    }

    // Annuler tout timeout précédent pour éviter les collisions
    if (refreshTimeoutIdRef.current !== null) {
      clearTimeout(refreshTimeoutIdRef.current);
      refreshTimeoutIdRef.current = null;
    }

    // Vérifier si l'utilisateur navigue depuis un cache existant
    const isNavigatingFromCache = sessionStorage.getItem('navigationFromCache') === 'true';
    if (isNavigatingFromCache && !refreshProblemsOnly) {
      console.log("Navigation depuis un cache existant, pas de rechargement automatique");
      sessionStorage.removeItem('navigationFromCache');
      return;
    }

    // Marquer le début du rafraîchissement
    refreshInProgressRef.current = true;

    // Utiliser 72h comme période par défaut si non spécifiée
    const effectiveTimeframe = timeframe || "-72h";

    setState(prev => ({ ...prev, error: null }));

    // Définir un timeout maximum pour éviter que le drapeau reste bloqué
    const timeoutId = window.setTimeout(() => {
      refreshInProgressRef.current = false;
      refreshTimeoutIdRef.current = null;
    }, 60000); // 60 secondes maximum

    refreshTimeoutIdRef.current = timeoutId;

    // Gérer les erreurs dans la fonction
    try {
      // Vérifier s'il existe des données en cache pour la page de problèmes unifié
      if (window.location.pathname.includes('/problems/unified') && !refreshProblemsOnly) {
        // Essayer de lire le cache des problèmes
        const cachedData = sessionStorage.getItem('problemsViewData');
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            // Vérifier si les données sont encore valides (moins de 10 minutes)
            if (parsedData && parsedData.timestamp && (Date.now() - parsedData.timestamp < 10 * 60 * 1000)) {
              console.log("Utilisation des données en cache pour problems/unified");

              // Si on a déjà des données en cache valides, ne pas recharger
              refreshInProgressRef.current = false;
              if (refreshTimeoutIdRef.current === timeoutId) {
                clearTimeout(timeoutId);
                refreshTimeoutIdRef.current = null;
              }
              return;
            }
          } catch (e) {
            console.error("Erreur lors du parsing des données en cache:", e);
          }
        }
      }

      // Exécuter loadAllData de manière non bloquante si on est dans un contexte de zone détaillée
      if (refreshProblemsOnly && state.selectedZone) {

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
          const asyncTimeoutId = window.setTimeout(async () => {
            try {
              await loadAllData(dashboardType, true, false, effectiveTimeframe);
              resolve();
            } catch (error) {
              // Async refresh error handled in reject
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
          }, 100); // Légèrement plus long pour éviter les problèmes de délai

          // Nettoyer le timeout en cas d'annulation
          return () => clearTimeout(asyncTimeoutId);
        });
      } else {
        // Dans les autres cas, exécuter normalement
        await loadAllData(dashboardType, refreshProblemsOnly || false, false, effectiveTimeframe);
      }
    } catch (error) {
      // Error in refreshData handled by updating state
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
      if (refreshTimeoutIdRef.current === timeoutId) {
        clearTimeout(timeoutId);
        refreshTimeoutIdRef.current = null;
      }
    }
  }, [loadAllData, state.selectedZone]); // Ajout de state.selectedZone comme dépendance

  // Référence à l'intervalle pour le rafraîchissement automatique
  const autoRefreshIntervalRef = useRef<number | null>(null);
  // Référence au dernier timeoutId pour le rafraîchissement automatique
  const autoRefreshTimeoutRef = useRef<number | null>(null);
  // Horodatage du dernier rafraîchissement réussi
  const lastSuccessfulRefreshRef = useRef<number>(0);
  
  // Charger les données initiales et configurer le rafraîchissement automatique
  useEffect(() => {
    // Fonction pour effectuer le chargement initial
    const performInitialLoad = async () => {
      if (!initialLoadRef.current) {
        console.log("Initial data load");
        initialLoadRef.current = true;
        try {
          await loadAllData(undefined, false);
          lastSuccessfulRefreshRef.current = Date.now();
        } catch (error) {
          console.error("Erreur lors du chargement initial des données:", error);
        }
      }
    };
    
    // Lancer le chargement initial
    performInitialLoad();
    
    // Fonction pour effectuer le rafraîchissement automatique
    const performAutoRefresh = async () => {
      // Vérifier si un rafraîchissement est déjà en cours avec refreshInProgressRef
      if (refreshInProgressRef.current) {
          return;
      }
      
      // Vérifier si le dernier rafraîchissement réussi est assez récent (<1 minute)
      const timeSinceLastRefresh = Date.now() - lastSuccessfulRefreshRef.current;
      if (timeSinceLastRefresh < 60000) { // Moins d'une minute
        return;
      }
      
      
      // Récupérer le type de dashboard actuel (vfg ou vfe)
      const currentDashboardType = window.location.pathname.includes('vfe') ? 'vfe' : 'vfg';
      
      // NE PAS mettre à jour l'indicateur de chargement pour un rafraîchissement en arrière-plan
      // Les rafraîchissements automatiques doivent être transparents pour l'utilisateur
      // Le code ci-dessous est commenté intentionnellement
      /*
      if (!state.isLoading.problems) {
        setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, problems: true }}));
      }
      */
      
      // Vérifier si on est sur la page d'aperçu pour éviter les rafraîchissements automatiques
      const isOverviewPage = window.location.pathname === '/' || window.location.pathname === '/overview';

      // Vérifier si on est sur la page de problèmes unifiés (qui a son propre cache)
      const isUnifiedProblemsPage = window.location.pathname.includes('/problems/unified');

      // Vérifier si on vient de naviguer depuis une page avec cache
      const hasNavigatedFromCache = !!sessionStorage.getItem('navigationFromCache');

      // Si on est sur la page d'aperçu, la page de problèmes unifiés, ou qu'on a navigué depuis un cache, ne pas continuer
      if (isOverviewPage || isUnifiedProblemsPage || hasNavigatedFromCache) {
        // Si on a navigué depuis un cache, nettoyer le marqueur pour les futures navigations
        if (hasNavigatedFromCache) {
          console.log('Navigation depuis un cache détectée, rafraîchissement auto évité');
          sessionStorage.removeItem('navigationFromCache');
        }
        return;
      }

      // Annuler tout timeout précédent
      if (autoRefreshTimeoutRef.current !== null) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }

      // Définir un timeout juste pour nettoyer les références, mais sans modifier les indicateurs de chargement
      const timeoutId = window.setTimeout(() => {
        // Ne pas mettre à jour l'état d'isLoading pour un rafraîchissement en arrière-plan
        // setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, problems: false }}));
        autoRefreshTimeoutRef.current = null;
      }, 30000); // 30 secondes maximum
      
      autoRefreshTimeoutRef.current = timeoutId;
      
      // Fonction simplifiée pour le rafraîchissement silencieux
      const silentRefresh = async () => {
        try {
          // Récupérer le type de dashboard actuel
          const dashboardType = currentDashboardType as 'vfg' | 'vfe';
          
          // Utiliser la fonction loadAllData avec le mode silencieux
          await loadAllData(dashboardType, true, true); // true pour refreshProblemsOnly, true pour silentMode
          
          // Marquer le rafraîchissement comme réussi
          lastSuccessfulRefreshRef.current = Date.now();
        } catch (error) {
          // Silent refresh error is caught
        }
      };
      
      try {
        // Vérifier si on est sur la page d'aperçu pour éviter les rafraîchissements automatiques
        const isOverviewPage = window.location.pathname === '/' || window.location.pathname === '/overview';

        // Ne pas faire de rafraîchissement silencieux si on est sur la page d'aperçu
        if (!isOverviewPage) {
          // Appeler le rafraîchissement silencieux à la place de refreshData
          await silentRefresh();
        } else {
            }
      } catch (err) {
        // Auto-refresh error handled in finally block
      } finally {
        // Nettoyer le timeout si c'est toujours le même, mais NE PAS modifier l'indicateur de chargement
        if (autoRefreshTimeoutRef.current === timeoutId) {
          clearTimeout(timeoutId);
          autoRefreshTimeoutRef.current = null;
        }
      }
    };
    
    // Rafraîchir automatiquement les problèmes actifs toutes les 10 minutes (au lieu de 5)
    const refreshInterval = 600000; // 10 minutes en millisecondes
    
    
    // Nettoyer tout intervalle existant
    if (autoRefreshIntervalRef.current !== null) {
      clearInterval(autoRefreshIntervalRef.current);
    }
    
    // Configurer le nouvel intervalle
    const intervalId = window.setInterval(performAutoRefresh, refreshInterval);
    autoRefreshIntervalRef.current = intervalId;
    
    // Nettoyer l'intervalle et les timeouts lors du démontage du composant
    return () => {
      if (autoRefreshIntervalRef.current !== null) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
      
      if (autoRefreshTimeoutRef.current !== null) {
        clearTimeout(autoRefreshTimeoutRef.current);
        autoRefreshTimeoutRef.current = null;
      }
    };
  }, [loadAllData, refreshData, state.isLoading.problems]);

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
                           state.vitalForEntrepriseMZs.find((z: ManagementZone) => z.id === zoneId) ||
                           state.detectionMZs.find((z: ManagementZone) => z.id === zoneId) ||
                           state.encryptionMZs.find((z: ManagementZone) => z.id === zoneId);
        
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
                
                      
                // Mettre à jour immédiatement le comptage des services pour cette zone
                const isVFG = state.vitalForGroupMZs.some((zone: ManagementZone) => zone.id === zoneId);
                const isVFE = state.vitalForEntrepriseMZs.some((zone: ManagementZone) => zone.id === zoneId);
                const isDetection = state.detectionMZs.some((zone: ManagementZone) => zone.id === zoneId);
                const isEncryption = state.encryptionMZs.some((zone: ManagementZone) => zone.id === zoneId);
                
                if (isVFG) {
                  setState(prev => ({
                    ...prev,
                    vitalForGroupMZs: prev.vitalForGroupMZs.map(zone => 
                      zone.id === zoneId ? {...zone, services: servicesCount} : zone
                    )
                  }));
                } else if (isVFE) {
                  setState(prev => ({
                    ...prev,
                    vitalForEntrepriseMZs: prev.vitalForEntrepriseMZs.map(zone => 
                      zone.id === zoneId ? {...zone, services: servicesCount} : zone
                    )
                  }));
                } else if (isDetection) {
                  setState(prev => ({
                    ...prev,
                    detectionMZs: prev.detectionMZs.map(zone => 
                      zone.id === zoneId ? {...zone, services: servicesCount} : zone
                    )
                  }));
                } else if (isEncryption) {
                  setState(prev => ({
                    ...prev,
                    encryptionMZs: prev.encryptionMZs.map(zone => 
                      zone.id === zoneId ? {...zone, services: servicesCount} : zone
                    )
                  }));
                }
              }
              
              // Continuer avec le chargement normal
              loadZoneData(zoneId);
            })
            .catch(error => {
              // Error during services preloading, handled by continuing with normal loading
              // Continuer avec le chargement normal même en cas d'erreur
              loadZoneData(zoneId);
            });
        } else {
          // Zone non trouvée, procéder au chargement normal
          loadZoneData(zoneId);
        }
      } catch (error) {
        // General preloading error, handled by continuing with normal loading
        // En cas d'erreur, continuer avec le chargement normal
        loadZoneData(zoneId);
      }
    }
  }, [loadZoneData, state.vitalForGroupMZs, state.vitalForEntrepriseMZs, state.detectionMZs, state.encryptionMZs, apiClient]);

  // Fonctions pour modifier l'état
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState(prev => ({ ...prev, sidebarCollapsed: collapsed }));
  }, []);

  // Fonction optimisée pour changer d'onglet avec chargement intelligent des données
  const setActiveTab = useCallback((tab: string) => {
    // Stocker l'onglet précédent pour référence
    const previousTab = state.activeTab;
    
    // Mettre à jour l'onglet actif immédiatement pour une UI réactive
    setState(prev => ({ ...prev, activeTab: tab }));
    
    // Si nous sommes dans une zone sélectionnée, optimiser le chargement des données
    if (state.selectedZone) {
      // Vérifier si nous avons besoin de charger des données spécifiques pour cet onglet
      const needsHostsData = tab === 'hosts' && state.hosts.length === 0;
      const needsServicesData = tab === 'services' && state.services.length === 0;
      const needsProcessesData = tab === 'processes' && state.processGroups.length === 0;
      
      // Vérifier si les données sont en cache
      const cacheKey = `zone_data:${state.selectedZone}:${tab}`;
      const cachedData = cacheService.get(cacheKey);
      
      if (cachedData) {
        console.log(`[AppContext] Using cached data for tab ${tab}`);
        
        // Mettre à jour l'état avec les données en cache
        if (tab === 'hosts' && Array.isArray(cachedData)) {
          setState(prev => ({ ...prev, hosts: cachedData as Host[] }));
        } else if (tab === 'services' && Array.isArray(cachedData)) {
          setState(prev => ({ ...prev, services: cachedData as Service[] }));
        } else if (tab === 'processes' && Array.isArray(cachedData)) {
          setState(prev => ({ ...prev, processGroups: cachedData as ProcessGroup[] }));
        }
      } else if (needsHostsData || needsServicesData || needsProcessesData) {
        // Si les données ne sont pas en cache et sont nécessaires, les charger
        console.log(`[AppContext] Loading data for tab ${tab}`);
        
        // Trouver la zone sélectionnée
        const selectedZoneObj = state.vitalForGroupMZs.find(zone => zone.id === state.selectedZone) ||
                               state.vitalForEntrepriseMZs.find(zone => zone.id === state.selectedZone) ||
                               state.detectionMZs.find(zone => zone.id === state.selectedZone) ||
                               state.encryptionMZs.find(zone => zone.id === state.selectedZone);
        
        if (selectedZoneObj) {
          // Définir la management zone si nécessaire
          apiClient.setManagementZone(selectedZoneObj.name)
            .then(() => {
              // Charger uniquement les données nécessaires pour l'onglet actif
              if (tab === 'hosts') {
                return apiClient.getHosts();
              } else if (tab === 'services') {
                return apiClient.getServices();
              } else if (tab === 'processes') {
                return apiClient.getProcesses();
              }
              return Promise.resolve(null);
            })
            .then((response: any) => {
              if (response && !response.error && response.data) {
                // Mettre à jour l'état avec les nouvelles données
                if (tab === 'hosts') {
                  const hostsData = Array.isArray(response.data) ? response.data : [];
                  setState(prev => ({ ...prev, hosts: hostsData }));
                  
                  // Mettre en cache les données
                  cacheService.set(`zone_data:${state.selectedZone}:hosts`, hostsData, { 
                    ttl: CACHE_DURATIONS.HOSTS,
                    category: 'zone_data'
                  });
                } else if (tab === 'services') {
                  const servicesData = Array.isArray(response.data) ? response.data as Service[] : [];
                  setState(prev => ({ ...prev, services: servicesData }));
                  
                  // Mettre en cache les données
                  cacheService.set(`zone_data:${state.selectedZone}:services`, servicesData, { 
                    ttl: CACHE_DURATIONS.SERVICES,
                    category: 'zone_data'
                  });
                } else if (tab === 'processes') {
                  const processData = Array.isArray(response.data) ? response.data : [];
                  
                  // Transformer les données
                  const processGroups: ProcessGroup[] = processData.map((process: any) => ({
                    id: process.id || `proc-${Math.random().toString(36).substring(2, 9)}`,
                    name: process.name || "Processus inconnu",
                    technology: process.technology || "Non spécifié",
                    icon: getProcessIcon(process.tech_icon || ''),
                    dt_url: process.dt_url || "#",
                    type: ((process.tech_icon && process.tech_icon.toLowerCase().includes('database')) 
                      ? 'database' : 'technology') as 'database' | 'technology' | 'server'
                  }));
                  
                  setState(prev => ({ ...prev, processGroups }));
                  
                  // Mettre en cache les données
                  cacheService.set(`zone_data:${state.selectedZone}:processes`, processGroups, { 
                    ttl: CACHE_DURATIONS.PROCESSES,
                    category: 'zone_data'
                  });
                }
              }
            })
            .catch(error => {
              console.error(`[AppContext] Error loading data for tab ${tab}:`, error);
            });
        }
      }
    }
  }, [state.activeTab, state.selectedZone, state.hosts.length, state.services.length, state.processGroups.length, state.vitalForGroupMZs, state.vitalForEntrepriseMZs, state.detectionMZs, state.encryptionMZs, apiClient, getProcessIcon]);

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
