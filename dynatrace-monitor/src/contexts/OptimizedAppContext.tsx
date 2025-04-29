import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { optimizedApiMethods } from '../api/optimizedApi';
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

// Définition du type pour les réponses de l'API getCurrentManagementZone
interface ManagementZoneResponse {
  management_zone: string;
}

// Définition du type pour le contexte de l'application optimisée
interface OptimizedAppContextType {
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
    dashboardData: boolean;
  };
  error: string | null;
  backendConnected: boolean;
  performanceMetrics: {
    loadTime: number;
    lastRefresh: Date;
    dataSizes: {
      problems: number;
      services: number;
      hosts: number;
      processes: number;
    }
  };
  
  // Fonctions pour modifier l'état
  setSelectedZone: (zoneId: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: number) => void;
  setActiveTab: (tab: string) => void;
  refreshData: () => Promise<void>;
  loadZoneData: (zoneId: string) => Promise<void>;
  loadAllData: () => Promise<void>;
}

// Création du contexte
const OptimizedAppContext = createContext<OptimizedAppContextType | undefined>(undefined);

// Fonction utilitaire pour créer une icône basée sur le nom de la management zone
const getZoneIcon = (zoneName: string) => {
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
  
  // Icône par défaut
  return <Shield />;
};

// Attribution de couleurs aux management zones
const getZoneColor = (zoneName: string) => {
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
  
  // Couleurs par défaut rotatives pour les autres MZs
  const colors = ['red', 'amber', 'orange', 'blue', 'emerald', 'purple', 'green'];
  const hash = zoneName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length] as 'red' | 'amber' | 'orange' | 'blue' | 'emerald' | 'purple' | 'green';
};

// Fournisseur du contexte
interface OptimizedAppProviderProps {
  children: ReactNode;
}

export const OptimizedAppProvider: React.FC<OptimizedAppProviderProps> = ({ children }) => {
  // Initialisation avec des tableaux vides
  const [activeProblems, setActiveProblems] = useState<Problem[]>([]);
  const [managementZones, setManagementZones] = useState<ManagementZone[]>([]);
  const [vitalForGroupMZs, setVitalForGroupMZs] = useState<ManagementZone[]>([]);
  const [vitalForEntrepriseMZs, setVitalForEntrepriseMZs] = useState<ManagementZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('process-groups');
  const [processGroups, setProcessGroups] = useState<ProcessGroup[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState({
    problems: true,
    managementZones: true,
    zoneDetails: false,
    vitalForGroupMZs: true,
    vitalForEntrepriseMZs: true,
    initialLoadComplete: false,
    dashboardData: false
  });
  const [error, setError] = useState<string | null>(null);
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

  // Charger les données initiales
  useEffect(() => {
    loadAllData();
  }, []);

  // Vérifier d'abord si le backend est en ligne
  const checkBackendStatus = async (): Promise<boolean> => {
    try {
      const statusResponse = await optimizedApiMethods.getStatus();
      return !statusResponse.error;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut du backend:', error);
      return false;
    }
  };

  // Fonction pour charger les données spécifiques à une zone
  const loadZoneData = async (zoneId: string) => {
    setIsLoading(prev => ({ ...prev, zoneDetails: true }));
    const startTime = performance.now();
    
    try {
      // Chercher la zone dans VFG ou VFE
      let selectedZoneObj = vitalForGroupMZs.find(zone => zone.id === zoneId);
      
      // Si pas trouvé dans VFG, chercher dans VFE
      if (!selectedZoneObj) {
        selectedZoneObj = vitalForEntrepriseMZs.find(zone => zone.id === zoneId);
      }
      
      if (selectedZoneObj) {
        // Définir la MZ actuelle sur le backend
        const setMzResponse = await optimizedApiMethods.setManagementZone(selectedZoneObj.name);
        
        if (setMzResponse.error) {
          console.error('Erreur lors de la définition de la MZ:', setMzResponse.error);
          setError(`Erreur lors de la définition de la MZ: ${setMzResponse.error}`);
          return;
        }
        
        // Récupérer les données en parallèle pour cette MZ
        const { processes, hosts, services } = await optimizedApiMethods.loadDashboardData(selectedZoneObj.name);
        
        // Traiter les données des processus
        if (!processes.error && processes.data) {
          const processData = processes.data;
          
          if (Array.isArray(processData) && processData.length > 0) {
            // Transformer les données pour le frontend
            const processGroups: ProcessGroup[] = processData.map((process: ProcessResponse) => {
              // Créer l'icône en fonction du type de technologie
              let icon = <></>;
              const techLower = process.tech_icon ? process.tech_icon.toLowerCase() : '';
              
              if (techLower === 'database') {
                icon = <Database size={14} />;
              } else if (techLower === 'coffee') {
                icon = <span className="text-amber-500">☕</span>;
              } else if (techLower === 'snake') {
                icon = <span className="text-green-500">🐍</span>;
              } else {
                icon = <span className="text-blue-500">⚙️</span>;
              }
              
              return {
                id: process.id || `proc-${Math.random().toString(36).substring(2, 9)}`,
                name: process.name || "Processus inconnu",
                technology: process.technology || "Non spécifié",
                icon: icon,
                dt_url: process.dt_url || "#",
                type: techLower.includes('database') ? 'database' : 'technology'
              };
            });
            
            setProcessGroups(processGroups);
            setPerformanceMetrics(prev => ({
              ...prev,
              dataSizes: {
                ...prev.dataSizes,
                processes: processGroups.length
              }
            }));
          } else {
            // Aucun processus trouvé
            setProcessGroups([]);
          }
        }
        
        // Traiter les données des hôtes
        if (!hosts.error && hosts.data) {
          setHosts(hosts.data);
          setPerformanceMetrics(prev => ({
            ...prev,
            dataSizes: {
              ...prev.dataSizes,
              hosts: hosts.data.length
            }
          }));
        }
        
        // Traiter les données des services
        if (!services.error && services.data) {
          setServices(services.data);
          setPerformanceMetrics(prev => ({
            ...prev,
            dataSizes: {
              ...prev.dataSizes,
              services: services.data.length
            }
          }));
        }
      }
      
      const endTime = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        loadTime: endTime - startTime,
        lastRefresh: new Date()
      }));
      
    } catch (error: any) {
      console.error('Erreur lors du chargement des données de la zone:', error);
      setError('Erreur lors du chargement des données pour la zone sélectionnée.');
    } finally {
      setIsLoading(prev => ({ ...prev, zoneDetails: false }));
    }
  };

  // Fonction optimisée pour charger toutes les données de l'API en une seule fois
  const loadAllData = async () => {
    const startTime = performance.now();
    
    try {
      setIsLoading(prev => ({ 
        ...prev, 
        problems: true, 
        managementZones: true, 
        vitalForGroupMZs: true,
        vitalForEntrepriseMZs: true,
        initialLoadComplete: false,
        dashboardData: true
      }));
      
      // Vérifier si le backend est en ligne
      const isBackendConnected = await checkBackendStatus();
      setBackendConnected(isBackendConnected);
      
      if (!isBackendConnected) {
        setError("Le serveur backend n'est pas accessible. Veuillez vérifier votre connexion.");
        setIsLoading(prev => ({ 
          ...prev,
          problems: false, 
          managementZones: false,
          vitalForGroupMZs: false,
          vitalForEntrepriseMZs: false,
          initialLoadComplete: true,
          dashboardData: false
        }));
        return;
      }
      
      // Récupérer les MZ VFG et VFE depuis le fichier .env (via le backend)
      try {
        // Nous récupérons directement les VFG et VFE du backend sans passer par l'API Dynatrace
        const [vitalForGroupResponse, vitalForEntrepriseResponse] = await Promise.all([
          optimizedApiMethods.getVitalForGroupMZs(),
          optimizedApiMethods.getVitalForEntrepriseMZs()
        ]);
        
        // Traitement des MZ VFG
        if (!vitalForGroupResponse.error && vitalForGroupResponse.data) {
          const vfgData = vitalForGroupResponse.data as VitalForGroupMZsResponse;
          if (vfgData.mzs && Array.isArray(vfgData.mzs) && vfgData.mzs.length > 0) {
            // Créer directement les MZ à partir des noms du fichier .env
            const vfgMZs: ManagementZone[] = vfgData.mzs.map(mzName => ({
              id: `env-${mzName.replace(/\s+/g, '-')}`,
              name: mzName,
              code: mzName.replace(/^.*?([A-Z0-9]+).*$/, '$1') || 'MZ',
              icon: getZoneIcon(mzName),
              problemCount: 0,
              apps: Math.floor(Math.random() * 15) + 1,      // Valeurs aléatoires pour démo
              services: Math.floor(Math.random() * 30) + 5,
              hosts: Math.floor(Math.random() * 20) + 2,
              availability: `${(99 + (Math.random() * 1)).toFixed(2)}%`,
              status: "healthy" as "healthy" | "warning",
              color: getZoneColor(mzName),
              dt_url: "#"
            }));
            
            // Définir les MZ VFG
            setVitalForGroupMZs(vfgMZs);
            
            // Pour compatibilité, utiliser aussi ces MZ comme liste complète
            setManagementZones(vfgMZs);
          }
        }
        
        // Traitement des MZ VFE
        if (!vitalForEntrepriseResponse.error && vitalForEntrepriseResponse.data) {
          const vfeData = vitalForEntrepriseResponse.data as VitalForGroupMZsResponse;
          if (vfeData.mzs && Array.isArray(vfeData.mzs) && vfeData.mzs.length > 0) {
            // Créer directement les MZ à partir des noms du fichier .env
            const vfeMZs: ManagementZone[] = vfeData.mzs.map(mzName => ({
              id: `env-${mzName.replace(/\s+/g, '-')}`,
              name: mzName,
              code: mzName.replace(/^.*?([A-Z0-9]+).*$/, '$1') || 'MZ',
              icon: getZoneIcon(mzName),
              problemCount: 0,
              apps: Math.floor(Math.random() * 15) + 1,      // Valeurs aléatoires pour démo
              services: Math.floor(Math.random() * 30) + 5,
              hosts: Math.floor(Math.random() * 20) + 2,
              availability: `${(99 + (Math.random() * 1)).toFixed(2)}%`,
              status: "healthy" as "healthy" | "warning",
              color: getZoneColor(mzName),
              dt_url: "#"
            }));
            
            // Définir les MZ VFE
            setVitalForEntrepriseMZs(vfeMZs);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des MZs:', error);
        // Ne pas afficher d'erreur critique - nous continuons avec les MZ du .env
      }
      
      // Si une zone est sélectionnée, charger ses données détaillées
      if (selectedZone) {
        await loadZoneData(selectedZone);
      } else if (vitalForGroupMZs.length > 0 || vitalForEntrepriseMZs.length > 0) {
        // Récupérer les données pour la première zone disponible par défaut
        const currentMzResponse = await optimizedApiMethods.getCurrentManagementZone();
        
        // Correction pour le typage de management_zone
        // Ajouter un cast vers any pour accéder à management_zone
        const currentMzData = currentMzResponse.data as any;
        
        if (currentMzData && currentMzData.management_zone) {
          const currentMzName = currentMzData.management_zone;
          
          // Charger les données de résumé et problèmes pour la MZ actuelle
          const { summary, problems } = await optimizedApiMethods.loadDashboardData(currentMzName);
          
          if (!summary.error && summary.data) {
            setSummaryData(summary.data as SummaryData);
          }
          
          if (!problems.error && problems.data) {
            const problemsData = problems.data as ProblemResponse[];
            
            if (Array.isArray(problemsData)) {
              // Transformer les données en format attendu par le frontend
              const formattedProblems: Problem[] = problemsData.map((problem: ProblemResponse) => ({
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
              
              setActiveProblems(formattedProblems);
              setPerformanceMetrics(prev => ({
                ...prev,
                dataSizes: {
                  ...prev.dataSizes,
                  problems: formattedProblems.length
                }
              }));
              
              // Mettre à jour les compteurs de problèmes pour les MZs VFG
              if (vitalForGroupMZs.length > 0) {
                const updatedVfgMZs: ManagementZone[] = vitalForGroupMZs.map(zone => {
                  const zoneProblems = formattedProblems.filter((p: Problem) => p.zone.includes(zone.name));
                  return {
                    ...zone,
                    problemCount: zoneProblems.length,
                    status: zoneProblems.length > 0 ? "warning" : "healthy"
                  };
                });
                
                setVitalForGroupMZs(updatedVfgMZs);
              }
              
              // Mettre à jour les compteurs de problèmes pour les MZs VFE
              if (vitalForEntrepriseMZs.length > 0) {
                const updatedVfeMZs: ManagementZone[] = vitalForEntrepriseMZs.map(zone => {
                  const zoneProblems = formattedProblems.filter((p: Problem) => p.zone.includes(zone.name));
                  return {
                    ...zone,
                    problemCount: zoneProblems.length,
                    status: zoneProblems.length > 0 ? "warning" : "healthy"
                  };
                });
                
                setVitalForEntrepriseMZs(updatedVfeMZs);
              }
            }
          }
        }
      }
      
      // Mettre à jour les métriques de performance
      const endTime = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        loadTime: endTime - startTime,
        lastRefresh: new Date()
      }));
      
    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setIsLoading(prev => ({ 
        ...prev, 
        problems: false, 
        managementZones: false,
        vitalForGroupMZs: false,
        vitalForEntrepriseMZs: false,
        initialLoadComplete: true,
        dashboardData: false
      }));
    }
  };

  // Fonction pour définir la zone sélectionnée et charger ses données
  const setSelectedZoneAndLoadData = (zoneId: string | null) => {
    setSelectedZone(zoneId);
    if (zoneId) {
      loadZoneData(zoneId);
    }
  };

  // Fonction pour rafraîchir les données
  const refreshData = async () => {
    setError(null);
    
    // Rafraîchir tous les caches côté serveur et client
    await optimizedApiMethods.refreshAllCaches();
    
    // Recharger toutes les données
    await loadAllData();
  };

  // Valeur du contexte
  const value: OptimizedAppContextType = {
    activeProblems,
    managementZones,
    vitalForGroupMZs,
    vitalForEntrepriseMZs,
    selectedZone,
    sidebarCollapsed,
    currentPage,
    activeTab,
    processGroups,
    hosts,
    services,
    summaryData,
    isLoading,
    error,
    backendConnected,
    performanceMetrics,
    
    setSelectedZone: setSelectedZoneAndLoadData,
    setSidebarCollapsed,
    setCurrentPage,
    setActiveTab,
    refreshData,
    loadZoneData,
    loadAllData
  };

  return (
    <OptimizedAppContext.Provider value={value}>
      {children}
    </OptimizedAppContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte de l'application optimisée
export const useOptimizedApp = (): OptimizedAppContextType => {
  const context = useContext(OptimizedAppContext);
  if (context === undefined) {
    throw new Error('useOptimizedApp must be used within an OptimizedAppProvider');
  }
  return context;
};