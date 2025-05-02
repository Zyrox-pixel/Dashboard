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
  
  // NOUVEAU: Ajout de l'état pour les métadonnées des zones
  const [zoneMeta, setZoneMeta] = useState<Record<string, {
    hosts: number;
    services: number;
    apps: number;
    timestamp: number;
  }>>(() => {
    // Initialiser avec les données en cache si disponibles
    try {
      const cached = localStorage.getItem('zoneMeta');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      console.error('Erreur lors du chargement du cache zoneMeta:', e);
      return {};
    }
  });
  
  // NOUVEAU: Fonction pour sauvegarder les métadonnées
  const saveZoneMeta = useCallback(() => {
    try {
      localStorage.setItem('zoneMeta', JSON.stringify(zoneMeta));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des métadonnées:', e);
    }
  }, [zoneMeta]);
  
  // NOUVEAU: Effet pour sauvegarder les métadonnées lorsqu'elles changent
  useEffect(() => {
    saveZoneMeta();
  }, [zoneMeta, saveZoneMeta]);
  
  // NOUVEAU: Fonction pour mettre à jour les métadonnées d'une zone
  const updateZoneMetaData = useCallback((zoneName: string, hostsCount: number, servicesCount: number) => {
    setZoneMeta(prevMeta => {
      // Calculer le nombre d'applications approximatif
      const appsCount = Math.max(1, Math.floor(servicesCount / 5));
      
      // Mettre à jour les métadonnées pour cette zone
      return {
        ...prevMeta,
        [zoneName]: {
          hosts: hostsCount,
          services: servicesCount,
          apps: appsCount,
          timestamp: Date.now()
        }
      };
    });
  }, []);
  
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

  // NOUVEAU: Fonction pour charger les métadonnées en arrière-plan
  const loadZoneMetaDataInBackground = useCallback(async (mzNames: string[]) => {
    // Créer une copie pour éviter de modifier l'original pendant le traitement
    const mzList = [...mzNames];
    
    // Traiter les MZs une par une pour éviter de surcharger l'API
    while (mzList.length > 0) {
      const mzName = mzList.shift();
      if (!mzName) continue;
      
      // Vérifier si nous avons déjà des données récentes (moins de 24h)
      const existingMeta = zoneMeta[mzName];
      const isRecent = existingMeta && (Date.now() - existingMeta.timestamp < 24 * 60 * 60 * 1000);
      
      if (isRecent) {
        console.log(`Métadonnées récentes déjà disponibles pour ${mzName}`);
        continue;
      }
      
      try {
        console.log(`Chargement en arrière-plan des métadonnées pour ${mzName}`);
        
        // Définir la MZ courante
        await apiClient.setManagementZone(mzName);
        
        // Récupérer les données
        const [hostsResponse, servicesResponse] = await Promise.all([
          apiClient.getHosts(),
          apiClient.getServices()
        ]);
        
        const hostsCount = Array.isArray(hostsResponse.data) ? hostsResponse.data.length : 0;
        const servicesCount = Array.isArray(servicesResponse.data) ? servicesResponse.data.length : 0;
        
        // Mettre à jour les métadonnées
        updateZoneMetaData(mzName, hostsCount, servicesCount);
        
        // Mettre à jour les MZs avec ces nouvelles données
        setState(prev => {
          // Mise à jour des VFG MZs
          const updatedVfgMZs = prev.vitalForGroupMZs.map(mz => 
            mz.name === mzName 
              ? {
                  ...mz,
                  hosts: hostsCount,
                  services: servicesCount,
                  apps: Math.max(1, Math.floor(servicesCount / 5))
                }
              : mz
          );
          
          // Mise à jour des VFE MZs
          const updatedVfeMZs = prev.vitalForEntrepriseMZs.map(mz => 
            mz.name === mzName 
              ? {
                  ...mz,
                  hosts: hostsCount,
                  services: servicesCount,
                  apps: Math.max(1, Math.floor(servicesCount / 5))
                }
              : mz
          );
          
          return {
            ...prev,
            vitalForGroupMZs: updatedVfgMZs,
            vitalForEntrepriseMZs: updatedVfeMZs
          };
        });
        
        // Pause pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Erreur lors du chargement des métadonnées pour ${mzName}:`, error);
        // Continue avec la MZ suivante même en cas d'erreur
      }
    }
    
    console.log('Chargement en arrière-plan des métadonnées terminé');
  }, [apiClient, updateZoneMetaData, zoneMeta]);

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
            setState(prev => ({ ...prev, hosts: dashboardData.hosts.data }));
            setPerformanceMetrics(prev => ({
              ...prev,
              dataSizes: { ...prev.dataSizes, hosts: dashboardData.hosts.data.length }
            }));
            
            // NOUVEAU: Mettre à jour les métadonnées
            updateZoneMetaData(
              selectedZoneObj.name,
              dashboardData.hosts.data.length,
              dashboardData.services.data ? dashboardData.services.data.length : 0
            );
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
        }
        
        // Traiter les données des services
        if (!servicesResponse.error && servicesResponse.data) {
          servicesData = Array.isArray(servicesResponse.data) ? servicesResponse.data : [];
          setState(prev => ({ ...prev, services: servicesData }));
        }
        
        // NOUVEAU: Mettre à jour les métadonnées
        if (hostsData.length > 0 || servicesData.length > 0) {
          updateZoneMetaData(
            selectedZoneObj.name,
            hostsData.length,
            servicesData.length
          );
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
  }, [state.vitalForGroupMZs, state.vitalForEntrepriseMZs, apiClient, optimized, getProcessIcon, updateZoneMetaData]);

  // Fonction pour charger toutes les données
  const loadAllData = useCallback(async (dashboardType?: 'vfg' | 'vfe', refreshProblemsOnly?: boolean) => {
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
          apiClient.getProblems("OPEN", "all", dashboardType, true),  // Force le rafraîchissement sans limite de temps pour les problèmes en cours
          apiClient.getProblems("ALL", "-72h", dashboardType, true)   // Force le rafraîchissement pour les problèmes récents avec 72h de délai
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
          apiClient.getProblems("OPEN", "all", dashboardType, true),  // Force le rafraîchissement sans limite de temps pour les problèmes en cours
          apiClient.getProblems("ALL", "-72h", dashboardType, true)   // Force le rafraîchissement pour les problèmes récents avec 72h de délai
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
        // Gérer de façon flexible le format de données (migration)
        if (vfgResponse && !vfgResponse.error && vfgResponse.data?.mzs) {
          console.log("Données reçues VFG:", vfgResponse.data.mzs);
          
          // Déterminer le format des données
          const firstItem = vfgResponse.data.mzs.length > 0 ? vfgResponse.data.mzs[0] : null;
          console.log("Premier élément:", firstItem, "Type:", typeof firstItem);
          
          vfgMZs = (vfgResponse?.data?.mzs || []).map(mz => {
            // Adapter le traitement selon le format (chaîne ou objet)
            let mzName, stats;
            
            if (typeof mz === 'string') {
              // Format ancien: liste de chaînes
              console.log("Format ancien détecté (chaîne):", mz);
              mzName = mz;
              stats = { hosts: null, services: null, applications: null };
            } else if (typeof mz === 'object' && mz !== null) {
              // Format nouveau: objets avec statistiques
              console.log("Format nouveau détecté (objet):", mz);
              mzName = mz.name;
              stats = mz.stats || { hosts: null, services: null, applications: null };
            } else {
              // Format inattendu
              console.error("Format inattendu pour MZ:", mz);
              mzName = "Inconnu";
              stats = { hosts: null, services: null, applications: null };
            }
            
            // Calculer uniquement le hash pour l'availability
            const mzNameSum = mzName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            
            return {
              id: `env-${mzName.replace(/\s+/g, '-')}`,
              name: mzName,
              code: mzName.replace(/^.*?([A-Z0-9]+).*$/, '$1') || 'MZ',
              icon: getZoneIcon(mzName),
              problemCount: 0, // Sera mis à jour avec les problèmes actifs
              apps: stats.applications,
              services: stats.services,
              hosts: stats.hosts,
              availability: `${99.7 + (mzNameSum % 10) / 30}%`, // Entre 99.7% et 100%
              status: "healthy" as "healthy" | "warning",
              color: getZoneColor(mzName),
              dt_url: `/ui/managementzones/details/${encodeURIComponent(mzName)}`,
              hostUrl: `/ui/hosts?managementzone=${encodeURIComponent(mzName)}`,
              serviceUrl: `/ui/services?managementzone=${encodeURIComponent(mzName)}`,
              applicationUrl: `/ui/applications?managementzone=${encodeURIComponent(mzName)}`
            };
          });
          
          setState(prev => ({ ...prev, vitalForGroupMZs: vfgMZs }));
        }
        
        // Gérer de façon flexible le format de données (migration) pour VFE
        if (vfeResponse && !vfeResponse.error && vfeResponse.data?.mzs) {
          console.log("Données reçues VFE:", vfeResponse.data.mzs);
          
          // Déterminer le format des données
          const firstItem = vfeResponse.data.mzs.length > 0 ? vfeResponse.data.mzs[0] : null;
          console.log("Premier élément VFE:", firstItem, "Type:", typeof firstItem);
          
          vfeMZs = (vfeResponse?.data?.mzs || []).map(mz => {
            // Adapter le traitement selon le format (chaîne ou objet)
            let mzName, stats;
            
            if (typeof mz === 'string') {
              // Format ancien: liste de chaînes
              console.log("Format ancien détecté (chaîne):", mz);
              mzName = mz;
              stats = { hosts: null, services: null, applications: null };
            } else if (typeof mz === 'object' && mz !== null) {
              // Format nouveau: objets avec statistiques
              console.log("Format nouveau détecté (objet):", mz);
              mzName = mz.name;
              stats = mz.stats || { hosts: null, services: null, applications: null };
            } else {
              // Format inattendu
              console.error("Format inattendu pour MZ:", mz);
              mzName = "Inconnu";
              stats = { hosts: null, services: null, applications: null };
            }
            
            // Calculer uniquement le hash pour l'availability
            const mzNameSum = mzName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            
            return {
              id: `env-${mzName.replace(/\s+/g, '-')}`,
              name: mzName,
              code: mzName.replace(/^.*?([A-Z0-9]+).*$/, '$1') || 'MZ',
              icon: getZoneIcon(mzName),
              problemCount: 0, // Sera mis à jour avec les problèmes actifs
              apps: stats.applications,
              services: stats.services,
              hosts: stats.hosts,
              availability: `${99.7 + (mzNameSum % 10) / 30}%`, // Entre 99.7% et 100%
              status: "healthy" as "healthy" | "warning",
              color: getZoneColor(mzName),
              dt_url: `/ui/managementzones/details/${encodeURIComponent(mzName)}`,
              hostUrl: `/ui/hosts?managementzone=${encodeURIComponent(mzName)}`,
              serviceUrl: `/ui/services?managementzone=${encodeURIComponent(mzName)}`,
              applicationUrl: `/ui/applications?managementzone=${encodeURIComponent(mzName)}`
            };
          });
          
          setState(prev => ({ ...prev, vitalForEntrepriseMZs: vfeMZs }));
        }
      } else {
        // En cas de rafraîchissement des problèmes uniquement, réutiliser les MZs existantes
        vfgMZs = state.vitalForGroupMZs;
        vfeMZs = state.vitalForEntrepriseMZs;
      }
      
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
            // Extraire le nom de l'hôte à partir du titre si possible
            let hostName = '';
            if (problem.title && problem.title.toLowerCase().includes('host')) {
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
              host: hostName // Ajouter le nom de l'hôte extrait
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
      
      // NOUVEAU: Déclencher le chargement en arrière-plan
      if (!refreshProblemsOnly) {
        // Extraire uniquement les noms des management zones
        const allMzNames = [
          ...(vfgResponse?.data?.mzs || []).map(mz => typeof mz === 'string' ? mz : mz.name),
          ...(vfeResponse?.data?.mzs || []).map(mz => typeof mz === 'string' ? mz : mz.name)
        ];
        
        // Déclencher le chargement en arrière-plan après une courte pause
        setTimeout(() => {
          loadZoneMetaDataInBackground(allMzNames);
        }, 3000); // Attendre 3 secondes après le chargement initial
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
  }, [state.selectedZone, state.vitalForGroupMZs, state.vitalForEntrepriseMZs, loadZoneData, apiClient, optimized, getZoneIcon, getZoneColor, loadZoneMetaDataInBackground, zoneMeta]);

  // Fonction pour rafraîchir les données - version simplifiée
  const refreshData = useCallback(async (dashboardType?: 'vfg' | 'vfe', refreshProblemsOnly?: boolean) => {
    console.log(`Refreshing data for dashboard type: ${dashboardType || 'none'} ${refreshProblemsOnly ? '(problèmes uniquement)' : ''}`);
    setState(prev => ({ ...prev, error: null }));
    await loadAllData(dashboardType, refreshProblemsOnly || false);
  }, [loadAllData]);

  // Charger les données initiales
  useEffect(() => {
    if (!initialLoadRef.current) {
      console.log("Initial data load");
      initialLoadRef.current = true;
      loadAllData(undefined, false);
    }
    
    // Rafraîchir automatiquement les problèmes actifs toutes les 5 minutes
    const refreshInterval = 300000; // 5 minutes en millisecondes
    
    console.log(`Configuration du rafraîchissement automatique des problèmes toutes les ${refreshInterval/1000} secondes`);
    
    // Configurer l'intervalle
    const intervalId = setInterval(() => {
      console.log("Rafraîchissement automatique des problèmes actifs");
      // Récupérer le type de dashboard actuel (vfg ou vfe)
      const currentDashboardType = window.location.pathname.includes('vfe') ? 'vfe' : 'vfg';
      refreshData(currentDashboardType as 'vfg' | 'vfe', true);
    }, refreshInterval);
    
    // Nettoyer l'intervalle lors du démontage du composant
    return () => {
      clearInterval(intervalId);
    };
  }, [loadAllData, refreshData]);

  // Fonction pour définir la zone sélectionnée et charger ses données
  const setSelectedZoneAndLoadData = useCallback((zoneId: string | null) => {
    setState(prev => ({ ...prev, selectedZone: zoneId }));
    if (zoneId) {
      loadZoneData(zoneId);
    }
  }, [loadZoneData]);

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