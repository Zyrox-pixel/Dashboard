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
  vitalForProductionMZs: ManagementZone[];
  vitalForAnalyticsMZs: ManagementZone[];
  detectionCtlMZs: ManagementZone[];
  securityEncryptionMZs: ManagementZone[];
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
    vitalForProductionMZs: boolean;
    vitalForAnalyticsMZs: boolean;
    detectionCtlMZs: boolean;
    securityEncryptionMZs: boolean;
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
  refreshData: (dashboardType?: 'vfg' | 'vfe' | 'vfp' | 'vfa' | 'detection' | 'security', refreshProblemsOnly?: boolean, timeframe?: string, forceBackendReload?: boolean) => Promise<void>;
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
  vitalForProductionMZs: [],
  vitalForAnalyticsMZs: [],
  detectionCtlMZs: [],
  securityEncryptionMZs: [],
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
    vitalForProductionMZs: true,
    vitalForAnalyticsMZs: true,
    detectionCtlMZs: true,
    securityEncryptionMZs: true,
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

  // Fonction optimisée pour charger les données d'une zone avec prise en charge flexible des IDs de zone
  const loadZoneData = useCallback(async (zoneId: string) => {
    setState(prev => ({ ...prev, isLoading: { ...prev.isLoading, zoneDetails: true } }));
    const startTime = performance.now();
    
    try {
      // Étape 1: Tentative directe - chercher la zone exacte dans les deux collections
      let selectedZoneObj = state.vitalForGroupMZs.find(zone => zone.id === zoneId) ||
                           state.vitalForEntrepriseMZs.find(zone => zone.id === zoneId) ||
                           state.vitalForProductionMZs.find(zone => zone.id === zoneId) ||
                           state.vitalForAnalyticsMZs.find(zone => zone.id === zoneId) ||
                           state.detectionCtlMZs.find(zone => zone.id === zoneId) ||
                           state.securityEncryptionMZs.find(zone => zone.id === zoneId);
      
      // Étape 2: Si pas trouvé, utiliser des approches plus flexibles
      if (!selectedZoneObj) {
        console.log(`Zone avec ID exact '${zoneId}' non trouvée, essai avec approche flexible...`);
        
        // Approche 2.1: Nettoyer l'ID de la zone pour comparaison
        const cleanZoneId = zoneId.replace(/^env-/, '').replace(/-+/g, ' ').trim();
        
        // Recherche dans toutes les collections avec le nom nettoyé
        const allZones = [
          ...state.vitalForGroupMZs,
          ...state.vitalForEntrepriseMZs,
          ...state.vitalForProductionMZs,
          ...state.vitalForAnalyticsMZs,
          ...state.detectionCtlMZs,
          ...state.securityEncryptionMZs
        ];
        
        // Approche 2.2: Chercher par nom nettoyé - correspondance partielle
        selectedZoneObj = allZones.find(zone => {
          const cleanZoneName = zone.name.trim();
          return cleanZoneName.toLowerCase().includes(cleanZoneId.toLowerCase()) || 
                 cleanZoneId.toLowerCase().includes(cleanZoneName.toLowerCase());
        });
        
        // Approche 2.3: Extraire des parties de l'ID et chercher des correspondances
        if (!selectedZoneObj) {
          const parts = zoneId.replace(/^env-/, '').split(/[-_]+/);
          for (const part of parts) {
            if (part.length > 3) {  // Ignorer les petites parties
              selectedZoneObj = allZones.find(zone => 
                zone.name.toLowerCase().includes(part.toLowerCase())
              );
              if (selectedZoneObj) {
                console.log(`Zone trouvée par partie de l'ID: ${part} -> ${selectedZoneObj.name}`);
                break;
              }
            }
          }
        }
      }
      
      // Vérifier si nous avons trouvé une zone correspondante
      if (!selectedZoneObj) {
        // Zone non trouvée après toutes les tentatives
        setState(prev => ({ 
          ...prev, 
          error: `Zone introuvable (ID: ${zoneId}). Vérifiez l'identifiant de la zone ou essayez avec un autre ID.`,
          isLoading: { ...prev.isLoading, zoneDetails: false }
        }));
        return;
      }
      
      // Log la correspondance trouvée
      console.log(`Zone correspondante trouvée: ${selectedZoneObj.name} (${selectedZoneObj.id}) pour l'ID demandé: ${zoneId}`);
      
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
  }, [
    state.vitalForGroupMZs,
    state.vitalForEntrepriseMZs,
    state.vitalForProductionMZs,
    state.vitalForAnalyticsMZs,
    state.detectionCtlMZs,
    state.securityEncryptionMZs,
    apiClient,
    optimized,
    getProcessIcon
  ]);

  // Fonction pour charger toutes les données
  const loadAllData = useCallback(async (dashboardType?: 'vfg' | 'vfe' | 'vfp' | 'vfa' | 'detection' | 'security', refreshProblemsOnly?: boolean, silentMode: boolean = false, timeframe?: string, forceBackendReload?: boolean) => {
    // Modification de la fonction pour utiliser async/await avec Promise.all
    const startTime = performance.now();

    // Si forceBackendReload est demandé, on va nettoyer le cache de l'API
    if (forceBackendReload) {
      console.log("Forçage du rechargement depuis le backend - nettoyage du cache API");
      // Utiliser refreshCache pour forcer le rechargement depuis le backend
      try {
        await apiClient.refreshCache('all');
        console.log("Cache API nettoyé avec succès");
      } catch (error) {
        console.error("Erreur lors du nettoyage du cache API:", error);
      }
    }
    
    // Ne mettre à jour les indicateurs de chargement que si nous ne sommes pas en mode silencieux
    if (!silentMode) {
      setState(prev => ({ 
        ...prev, 
        isLoading: { 
          ...prev.isLoading, 
          problems: true, 
          vitalForGroupMZs: !refreshProblemsOnly || !!forceBackendReload,
          vitalForEntrepriseMZs: !refreshProblemsOnly || !!forceBackendReload,
          initialLoadComplete: false,
          dashboardData: !refreshProblemsOnly || !!forceBackendReload
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
      let vfpResponse: ApiResponse<VitalForGroupMZsResponse> | undefined;
      let vfaResponse: ApiResponse<VitalForGroupMZsResponse> | undefined;
      let detectionResponse: ApiResponse<VitalForGroupMZsResponse> | undefined;
      let securityResponse: ApiResponse<VitalForGroupMZsResponse> | undefined;
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
        
        // Si on force le rechargement complet depuis le backend, recharger aussi les informations de zones
        if (forceBackendReload) {
          console.log("Forçage du rechargement complet des MZs en plus des problèmes");
          const mzResponses = await Promise.all([
            apiClient.getVitalForGroupMZs(),
            apiClient.getVitalForEntrepriseMZs(),
            apiClient.getVitalForProductionMZs(),
            apiClient.getVitalForAnalyticsMZs(),
            apiClient.getDetectionCtlMZs(),
            apiClient.getSecurityEncryptionMZs()
          ]);
          vfgResponse = mzResponses[0] as ApiResponse<VitalForGroupMZsResponse>;
          vfeResponse = mzResponses[1] as ApiResponse<VitalForGroupMZsResponse>;
          vfpResponse = mzResponses[2] as ApiResponse<VitalForGroupMZsResponse>;
          vfaResponse = mzResponses[3] as ApiResponse<VitalForGroupMZsResponse>;
          detectionResponse = mzResponses[4] as ApiResponse<VitalForGroupMZsResponse>;
          securityResponse = mzResponses[5] as ApiResponse<VitalForGroupMZsResponse>;
        }
      } else {
        // Chargement complet de toutes les données
        const responses = await Promise.all([
          apiClient.getSummary(),
          apiClient.getVitalForGroupMZs(),
          apiClient.getVitalForEntrepriseMZs(),
          apiClient.getVitalForProductionMZs(),
          apiClient.getVitalForAnalyticsMZs(),
          apiClient.getDetectionCtlMZs(),
          apiClient.getSecurityEncryptionMZs(),
          apiClient.getProblems("OPEN", "-60d", dashboardType, true),  // Force le rafraîchissement pour les problèmes actifs sur 60 jours
          apiClient.getProblems72h(dashboardType, undefined, true, timeframe)   // Utilise le nouvel endpoint dédié pour les problèmes avec la période spécifiée
        ]);
        summaryResponse = responses[0] as ApiResponse<SummaryData>;
        vfgResponse = responses[1] as ApiResponse<VitalForGroupMZsResponse>;
        vfeResponse = responses[2] as ApiResponse<VitalForGroupMZsResponse>;
        vfpResponse = responses[3] as ApiResponse<VitalForGroupMZsResponse>;
        vfaResponse = responses[4] as ApiResponse<VitalForGroupMZsResponse>;
        detectionResponse = responses[5] as ApiResponse<VitalForGroupMZsResponse>;
        securityResponse = responses[6] as ApiResponse<VitalForGroupMZsResponse>;
        problemsResponse = responses[7] as ApiResponse<ProblemResponse[]>;
        problemsLast72hResponse = responses[8] as ApiResponse<ProblemResponse[]>;
      }

      // Traiter les données du résumé si disponibles et si ce n'est pas un rafraîchissement des problèmes uniquement
      if (!refreshProblemsOnly && summaryResponse && !summaryResponse.error && summaryResponse.data) {
        const data = summaryResponse.data;
        setState(prev => ({ ...prev, summaryData: data as SummaryData }));
      }
      
      // Traiter les données des MZs VFG, VFE, VFP, VFA, Detection & CTL, et Security & Encryption si ce n'est pas un rafraîchissement des problèmes uniquement
      let vfgMZs: ManagementZone[] = [];
      let vfeMZs: ManagementZone[] = [];
      let vfpMZs: ManagementZone[] = [];
      let vfaMZs: ManagementZone[] = [];
      let detectionMZs: ManagementZone[] = [];
      let securityMZs: ManagementZone[] = [];
      
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
        
        // Traitement des données de Vital for Production
        if (vfpResponse && !vfpResponse.error && vfpResponse.data?.mzs) {
          // Obtenir les comptages pour chaque zone en parallèle
          const mzPromises = vfpResponse.data.mzs.map(async (mzName) => {
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
          vfpMZs = await Promise.all(mzPromises);
          
          setState(prev => ({ ...prev, vitalForProductionMZs: vfpMZs }));
        }
        
        // Traitement des données de Vital for Analytics
        if (vfaResponse && !vfaResponse.error && vfaResponse.data?.mzs) {
          // Obtenir les comptages pour chaque zone en parallèle
          const mzPromises = vfaResponse.data.mzs.map(async (mzName) => {
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
          vfaMZs = await Promise.all(mzPromises);
          
          setState(prev => ({ ...prev, vitalForAnalyticsMZs: vfaMZs }));
        }
        
        // Traitement des données de Detection & CTL
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
                throw new Error(`Erreur API ${response.status}`);
              }
            } catch (error) {
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
          
          setState(prev => ({ ...prev, detectionCtlMZs: detectionMZs }));
        }
        
        // Traitement des données de Security & Encryption
        if (securityResponse && !securityResponse.error && securityResponse.data?.mzs) {
          // Obtenir les comptages pour chaque zone en parallèle
          const mzPromises = securityResponse.data.mzs.map(async (mzName) => {
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
                throw new Error(`Erreur API ${response.status}`);
              }
            } catch (error) {
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
          securityMZs = await Promise.all(mzPromises);
          
          setState(prev => ({ ...prev, securityEncryptionMZs: securityMZs }));
        }
      } else {
        // En cas de rafraîchissement des problèmes uniquement, réutiliser les MZs existantes
        vfgMZs = state.vitalForGroupMZs;
        vfeMZs = state.vitalForEntrepriseMZs;
        vfpMZs = state.vitalForProductionMZs;
        vfaMZs = state.vitalForAnalyticsMZs;
        detectionMZs = state.detectionCtlMZs;
        securityMZs = state.securityEncryptionMZs;
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
    
    const updatedSecurityMZs = securityMZs.map(zone => {
      const zoneProblems = problems.filter(p => p.zone && p.zone.includes(zone.name));
      return {
        ...zone,
        problemCount: zoneProblems.length,
        status: (zoneProblems.length > 0 ? "warning" : "healthy") as "warning" | "healthy"
      };
    });
    
    // Mettre à jour les compteurs de problèmes pour les MZs VFP et VFA
    const updatedVfpMZs = vfpMZs.map(zone => {
      const zoneProblems = problems.filter(p => p.zone && p.zone.includes(zone.name));
      return {
        ...zone,
        problemCount: zoneProblems.length,
        status: (zoneProblems.length > 0 ? "warning" : "healthy") as "warning" | "healthy"
      };
    });
    
    const updatedVfaMZs = vfaMZs.map(zone => {
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
      vitalForProductionMZs: updatedVfpMZs,
      vitalForAnalyticsMZs: updatedVfaMZs,
      detectionCtlMZs: updatedDetectionMZs,
      securityEncryptionMZs: updatedSecurityMZs
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
            detectionCtlMZs: !refreshProblemsOnly ? false : prev.isLoading.detectionCtlMZs,
            securityEncryptionMZs: !refreshProblemsOnly ? false : prev.isLoading.securityEncryptionMZs,
            initialLoadComplete: !refreshProblemsOnly ? true : prev.isLoading.initialLoadComplete,
            dashboardData: false
          } 
        }));
      }
    }
  }, [
    state.selectedZone, 
    state.vitalForGroupMZs, 
    state.vitalForEntrepriseMZs, 
    state.vitalForProductionMZs, 
    state.vitalForAnalyticsMZs, 
    state.detectionCtlMZs, 
    state.securityEncryptionMZs, 
    loadZoneData, 
    apiClient, 
    optimized, 
    getZoneIcon, 
    getZoneColor, 
    setPerformanceMetrics,
    API_BASE_URL
  ]);

  // Drapeau pour éviter les appels multiples à refreshData
  const refreshInProgressRef = useRef(false);
  // Identifiant du dernier timeout pour éviter les collisions
  const refreshTimeoutIdRef = useRef<number | null>(null);

  // Fonction pour rafraîchir les données - version non bloquante améliorée avec prise en charge de la période
  const refreshData = useCallback(async (dashboardType?: 'vfg' | 'vfe' | 'vfp' | 'vfa' | 'detection' | 'security', refreshProblemsOnly?: boolean, timeframe?: string, forceBackendReload?: boolean): Promise<void> => {
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

    // Si on force le rechargement depuis le backend, effacer les caches locaux
    if (forceBackendReload) {
      console.log("Forçage du rechargement complet depuis le backend - nettoyage des caches");
      // Nettoyer les caches SessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('dashboard_') || 
            key.startsWith('problems') || 
            key.includes('_cache') || 
            key.includes('dynatrace_monitor')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Forcer l'utilisation du paramètre force=true dans les appels API
      refreshProblemsOnly = true; // Pour s'assurer qu'on rafraîchisse au moins les problèmes
      
      // Avertir l'utilisateur
      console.log("Caches nettoyés, rechargement forcé depuis le backend en cours...");
    }

    // Vérifier si l'utilisateur navigue depuis un cache existant
    const isNavigatingFromCache = sessionStorage.getItem('navigationFromCache') === 'true';
    if (isNavigatingFromCache && !refreshProblemsOnly && !forceBackendReload) {
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
      // Ne pas utiliser le cache si on force le rechargement
      if (!forceBackendReload && window.location.pathname.includes('/problems/unified') && !refreshProblemsOnly) {
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
      if ((refreshProblemsOnly || forceBackendReload) && state.selectedZone) {

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
              // Passer forceBackendReload comme cinquième paramètre
              await loadAllData(dashboardType, true, false, effectiveTimeframe, forceBackendReload);
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
        await loadAllData(dashboardType, refreshProblemsOnly || false, false, effectiveTimeframe, forceBackendReload);
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
      
      
      // Récupérer le type de dashboard actuel
      let currentDashboardType = 'vfg';
      if (window.location.pathname.includes('vfe')) {
        currentDashboardType = 'vfe';
      } else if (window.location.pathname.includes('detection')) {
        currentDashboardType = 'detection';
      } else if (window.location.pathname.includes('security')) {
        currentDashboardType = 'security';
      }
      
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
        
        // Recherche dans toutes les collections avec le même algorithme que dans loadZoneData
        const allZones = [
          ...state.vitalForGroupMZs,
          ...state.vitalForEntrepriseMZs,
          ...state.vitalForProductionMZs,
          ...state.vitalForAnalyticsMZs,
          ...state.detectionCtlMZs,
          ...state.securityEncryptionMZs
        ];
        
        // Étape 1: Tentative directe avec ID exact
        let selectedZone = allZones.find(z => z.id === zoneId);
        
        // Étape 2: Si pas trouvé, essayer des méthodes de correspondance flexibles
        if (!selectedZone) {
          // Nettoyer l'ID de la zone pour comparaison
          const cleanZoneId = zoneId.replace(/^env-/, '').replace(/-+/g, ' ').trim();
          
          // Chercher par nom nettoyé (correspondance partielle)
          selectedZone = allZones.find(zone => {
            const cleanZoneName = zone.name.trim();
            return cleanZoneName.toLowerCase().includes(cleanZoneId.toLowerCase()) || 
                   cleanZoneId.toLowerCase().includes(cleanZoneName.toLowerCase());
          });
          
          // Si toujours pas trouvé, essayer par parties de l'ID
          if (!selectedZone) {
            const parts = zoneId.replace(/^env-/, '').split(/[-_]+/);
            for (const part of parts) {
              if (part.length > 3) {  // Ignorer les petites parties
                selectedZone = allZones.find(zone => 
                  zone.name.toLowerCase().includes(part.toLowerCase())
                );
                if (selectedZone) break;
              }
            }
          }
        }
        
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
                
                // Vérifier que selectedZone est toujours défini à ce point
                if (!selectedZone) {
                  console.error("selectedZone est undefined, impossible de continuer");
                  return;
                }
                
                // Déterminer à quelle collection appartient la zone
                const zoneId = selectedZone.id; // Utiliser selectedZone qui est garanti d'exister
                const isVFG = state.vitalForGroupMZs.some(z => z.id === zoneId);
                const isVFE = state.vitalForEntrepriseMZs.some(z => z.id === zoneId);
                const isVFP = state.vitalForProductionMZs.some(z => z.id === zoneId);
                const isVFA = state.vitalForAnalyticsMZs.some(z => z.id === zoneId);
                const isDetection = state.detectionCtlMZs.some(z => z.id === zoneId);
                const isSecurity = state.securityEncryptionMZs.some(z => z.id === zoneId);
                
                // Mettre à jour la collection appropriée
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
                } else if (isVFP) {
                  setState(prev => ({
                    ...prev,
                    vitalForProductionMZs: prev.vitalForProductionMZs.map(zone => 
                      zone.id === zoneId ? {...zone, services: servicesCount} : zone
                    )
                  }));
                } else if (isVFA) {
                  setState(prev => ({
                    ...prev,
                    vitalForAnalyticsMZs: prev.vitalForAnalyticsMZs.map(zone => 
                      zone.id === zoneId ? {...zone, services: servicesCount} : zone
                    )
                  }));
                } else if (isDetection) {
                  setState(prev => ({
                    ...prev,
                    detectionCtlMZs: prev.detectionCtlMZs.map(zone => 
                      zone.id === zoneId ? {...zone, services: servicesCount} : zone
                    )
                  }));
                } else if (isSecurity) {
                  setState(prev => ({
                    ...prev,
                    securityEncryptionMZs: prev.securityEncryptionMZs.map(zone => 
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
  }, [
    loadZoneData, 
    state.vitalForGroupMZs, 
    state.vitalForEntrepriseMZs,
    state.vitalForProductionMZs,
    state.vitalForAnalyticsMZs,
    state.detectionCtlMZs,
    state.securityEncryptionMZs,
    apiClient
  ]);

  // Fonctions pour modifier l'état
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState(prev => ({ ...prev, sidebarCollapsed: collapsed }));
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // Create a typed version of the refreshData function
  const typedRefreshData = useCallback(
    (
      dashboardType?: 'vfg' | 'vfe' | 'vfp' | 'vfa' | 'detection' | 'security',
      refreshProblemsOnly?: boolean,
      timeframe?: string,
      forceBackendReload?: boolean
    ): Promise<void> => {
      return refreshData(dashboardType, refreshProblemsOnly, timeframe, forceBackendReload);
    },
    [refreshData]
  );

  // Valeur du contexte
  const contextValue = useMemo<AppContextType>(() => ({
    ...state,
    setSelectedZone: setSelectedZoneAndLoadData,
    setSidebarCollapsed,
    setActiveTab,
    refreshData: typedRefreshData,
    performanceMetrics: state.performanceMetrics || performanceMetrics,
    ...(optimized ? {
      loadZoneData
    } : {})
  }), [
    state,
    setSelectedZoneAndLoadData,
    setSidebarCollapsed,
    setActiveTab,
    typedRefreshData,
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