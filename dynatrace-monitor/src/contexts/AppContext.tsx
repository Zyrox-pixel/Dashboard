import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, CACHE_TYPES } from '../api';
import { 
  Problem, 
  ManagementZone, 
  ProcessGroup, 
  VitalForGroupMZsResponse,
  ProblemResponse,
  ProcessResponse,
  Host,
  Service
} from '../api/types';
import { Database, Shield, Key, Globe, Server, Grid, Building, CreditCard } from 'lucide-react';

// Définition du type pour le contexte de l'application
interface AppContextType {
  activeProblems: Problem[];
  managementZones: ManagementZone[];
  vitalForGroupMZs: ManagementZone[];
  selectedZone: string | null;
  sidebarCollapsed: boolean;
  currentPage: number;
  activeTab: string;
  processGroups: ProcessGroup[];
  hosts: Host[];
  services: Service[];
  isLoading: {
    problems: boolean;
    managementZones: boolean;
    zoneDetails: boolean;
    vitalForGroupMZs: boolean;
    initialLoadComplete: boolean;
  };
  error: string | null;
  backendConnected: boolean;
  
  // Fonctions pour modifier l'état
  setSelectedZone: (zoneId: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: number) => void;
  setActiveTab: (tab: string) => void;
  refreshData: () => void;
}

// Création du contexte
const AppContext = createContext<AppContextType | undefined>(undefined);

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
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Initialisation avec des tableaux vides
  const [activeProblems, setActiveProblems] = useState<Problem[]>([]);
  const [managementZones, setManagementZones] = useState<ManagementZone[]>([]);
  const [vitalForGroupMZs, setVitalForGroupMZs] = useState<ManagementZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('process-groups');
  const [processGroups, setProcessGroups] = useState<ProcessGroup[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState({
    problems: true,
    managementZones: true,
    zoneDetails: false,
    vitalForGroupMZs: true,
    initialLoadComplete: false
  });
  const [error, setError] = useState<string | null>(null);

  // Charger les données initiales
  useEffect(() => {
    fetchData();
  }, []);

  // Fonction pour créer des objets ManagementZone à partir des noms
  const createMZsFromNames = (mzNames: string[]): ManagementZone[] => {
    return mzNames.map((mzName: string) => {
      // Extraire l'ID (par exemple AP03566) du nom complet
      let id = "unknown";
      if (mzName.includes("AP")) {
        const match = mzName.match(/AP\d+/);
        if (match) {
          id = match[0];
        }
      }
      
      return {
        id: id,
        name: mzName,
        code: id,
        icon: getZoneIcon(mzName),
        problemCount: 0,
        apps: Math.floor(Math.random() * 5) + 1, // Valeur temporaire, à remplacer avec les vraies données
        services: Math.floor(Math.random() * 10) + 5, // Valeur temporaire, à remplacer avec les vraies données
        hosts: Math.floor(Math.random() * 8) + 2, // Valeur temporaire, à remplacer avec les vraies données
        availability: (97 + Math.random() * 3).toFixed(1) + "%", // Valeur temporaire, à remplacer avec les vraies données
        status: "healthy" as "healthy" | "warning",
        color: getZoneColor(mzName),
        dt_url: "#" // Valeur temporaire, à remplacer avec les vraies données
      };
    });
  };

  // Vérifier d'abord si le backend est en ligne
  const checkBackendStatus = async (): Promise<boolean> => {
    try {
      const statusResponse = await api.getStatus();
      return !statusResponse.error;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut du backend:', error);
      return false;
    }
  };

  // Fonction pour charger les données spécifiques à une zone
  const loadZoneData = async (zoneId: string) => {
    setIsLoading(prev => ({ ...prev, zoneDetails: true }));
    try {
      // Trouver la MZ complète à partir de l'ID
      const selectedZoneObj = vitalForGroupMZs.find(zone => zone.id === zoneId);
      if (selectedZoneObj) {
        // Définir la MZ actuelle sur le backend
        const setMzResponse = await api.setManagementZone(selectedZoneObj.name);
        
        if (setMzResponse.error) {
          console.error('Erreur lors de la définition de la MZ:', setMzResponse.error);
          setError(`Erreur lors de la définition de la MZ: ${setMzResponse.error}`);
          return;
        }
        
        // Récupérer les process groups pour cette MZ
        try {
          const processResponse = await api.getProcesses();
          
          if (!processResponse.error && processResponse.data) {
            const processData = processResponse.data as ProcessResponse[];
            
            if (Array.isArray(processData) && processData.length > 0) {
              // Transformer les données pour le frontend
              const processes: ProcessGroup[] = processData.map((process: ProcessResponse) => {
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
                  name: process.name || "Processus inconnu",
                  technology: process.technology || "Non spécifié",
                  icon: icon,
                  dt_url: process.dt_url || "#",
                  type: techLower.includes('database') ? 'database' : 'technology'
                };
              });
              
              setProcessGroups(processes);
            } else {
              // Aucun processus trouvé
              setProcessGroups([]);
            }
          } else if (processResponse.error) {
            console.error('Erreur lors de la récupération des processus:', processResponse.error);
            setProcessGroups([]);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des processus:', error);
          setProcessGroups([]);
        }
        
        // Récupérer les hosts pour cette MZ
        try {
          const hostsResponse = await api.getHosts();
          
          if (!hostsResponse.error && hostsResponse.data) {
            setHosts(hostsResponse.data as Host[]);
          } else if (hostsResponse.error) {
            console.error('Erreur lors de la récupération des hosts:', hostsResponse.error);
            setHosts([]);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des hosts:', error);
          setHosts([]);
        }
        
        // Récupérer les services pour cette MZ
        try {
          const servicesResponse = await api.getServices();
          
          if (!servicesResponse.error && servicesResponse.data) {
            setServices(servicesResponse.data as Service[]);
          } else if (servicesResponse.error) {
            console.error('Erreur lors de la récupération des services:', servicesResponse.error);
            setServices([]);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des services:', error);
          setServices([]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de la zone:', error);
      setError('Erreur lors du chargement des données pour la zone sélectionnée.');
    } finally {
      setIsLoading(prev => ({ ...prev, zoneDetails: false }));
    }
  };

  // Fonction pour charger les données de l'API
  const fetchData = async () => {
    try {
      setIsLoading(prev => ({ 
        ...prev, 
        problems: true, 
        managementZones: true, 
        vitalForGroupMZs: true,
        initialLoadComplete: false
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
          initialLoadComplete: true
        }));
        return;
      }
      
      // Charger les MZs de Vital for Group depuis l'API
      try {
        const vfgResponse = await api.getVitalForGroupMZs();
        
        if (!vfgResponse.error && vfgResponse.data) {
          const vfgData = vfgResponse.data as VitalForGroupMZsResponse;
          if (vfgData.mzs && Array.isArray(vfgData.mzs) && vfgData.mzs.length > 0) {
            const vfgMZs = createMZsFromNames(vfgData.mzs);
            setVitalForGroupMZs(vfgMZs);
            
            // Sélectionner automatiquement la première MZ si aucune n'est sélectionnée
            if (!selectedZone && vfgMZs.length > 0) {
              setSelectedZone(vfgMZs[0].id);
            }
          } else {
            console.warn('Aucune MZ Vital for Group trouvée dans la réponse API.');
            setVitalForGroupMZs([]);
          }
        } else {
          console.error('Erreur lors de la récupération des MZs Vital for Group:', vfgResponse.error);
          setVitalForGroupMZs([]);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des MZs Vital for Group:', error);
        setVitalForGroupMZs([]);
      }
      
      // Charger les problèmes
      try {
        const problemsResponse = await api.getProblems();
        
        if (!problemsResponse.error && problemsResponse.data) {
          const problemsData = problemsResponse.data as ProblemResponse[];
          
          if (Array.isArray(problemsData)) {
            // Transformer les données en format attendu par le frontend
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
            
            setActiveProblems(problems);
            
            // Mettre à jour les compteurs de problèmes pour les MZs
            if (vitalForGroupMZs.length > 0) {
              const updatedVfgMZs: ManagementZone[] = vitalForGroupMZs.map(zone => {
                const zoneProblems = problems.filter((p: Problem) => p.zone.includes(zone.name));
                return {
                  ...zone,
                  problemCount: zoneProblems.length,
                  status: zoneProblems.length > 0 ? "warning" : "healthy"
                };
              });
              
              setVitalForGroupMZs(updatedVfgMZs);
            }
          }
        } else if (problemsResponse.error) {
          console.error('Erreur lors de la récupération des problèmes:', problemsResponse.error);
          setActiveProblems([]);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des problèmes:', error);
        setActiveProblems([]);
      }
      
      // Charger les données pour la zone sélectionnée
      if (selectedZone) {
        await loadZoneData(selectedZone);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setIsLoading(prev => ({ 
        ...prev, 
        problems: false, 
        managementZones: false,
        vitalForGroupMZs: false,
        initialLoadComplete: true
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
  const refreshData = () => {
    setError(null);
    fetchData();
  };

  // Valeur du contexte
  const value: AppContextType = {
    activeProblems,
    managementZones,
    vitalForGroupMZs,
    selectedZone,
    sidebarCollapsed,
    currentPage,
    activeTab,
    processGroups,
    hosts,
    services,
    isLoading,
    error,
    backendConnected,
    
    setSelectedZone: setSelectedZoneAndLoadData,
    setSidebarCollapsed,
    setCurrentPage,
    setActiveTab,
    refreshData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte de l'application
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};