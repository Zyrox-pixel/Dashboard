import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, CACHE_TYPES } from '../api';
import { 
  Problem, 
  ManagementZone, 
  ProcessGroup, 
  VitalForGroupMZsResponse,
  ProblemResponse,
  ProcessResponse 
} from '../api/types';
import { DollarSign, Building, CreditCard, Users, ShoppingCart, Truck, Database, LineChart, Shield, Key, Globe, Server, Grid } from 'lucide-react';

// Définition du type pour le contexte de l'application
interface AppContextType {
  activeProblems: Problem[];
  managementZones: ManagementZone[];
  vitalForGroupMZs: ManagementZone[]; // Nouvelle propriété pour Vital for Group
  selectedZone: string | null;
  sidebarCollapsed: boolean;
  currentPage: number;
  activeTab: string;
  processGroups: ProcessGroup[]; // Renommé de financeProcessGroups
  isLoading: {
    problems: boolean;
    managementZones: boolean;
    zoneDetails: boolean;
    vitalForGroupMZs: boolean; // Nouvel état de chargement
    initialLoadComplete: boolean; // Nouvel état pour indiquer le chargement initial
  };
  error: string | null; // Pour gérer les erreurs
  backendConnected: boolean; // Nouvel état pour indiquer si le backend est connecté
  
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
  
  // Icônes spécifiques pour les MZs de Vital for Group
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
  
  // Couleurs spécifiques pour les MZs de Vital for Group
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

// Données mockées pour les problèmes - ne pas définir par défaut
const mockActiveProblems: Problem[] = [
  {
    id: "PROB-1",
    title: "Latence élevée sur API Clients",
    code: "AP03566",
    subtitle: "ACESID - Management Zone: Vital for Group",
    time: "Il y a 37 minutes",
    type: "Dégradation de performance",
    responseTime: "2.7s (seuil: 1.5s)",
    servicesImpacted: "2",
    usersAffected: "~450",
    impact: "MOYEN",
    status: "warning",
    zone: "PRODSEC - AP03566 - ACESID"
  },
  {
    id: "PROB-2",
    title: "CPU élevé sur serveur de base de données",
    code: "AP11564",
    subtitle: "OCSP - Management Zone: Vital for Group",
    time: "Il y a 1 heure",
    type: "Utilisation ressources",
    cpuUsage: "92% (seuil: 80%)",
    host: "s02vl8822471.fr.net.intra",
    duration: "58 minutes",
    impact: "ÉLEVÉ",
    status: "critical",
    zone: "PRODSEC - AP11564 - OCSP"
  }
];

// Données statiques pour les MZs de Vital for Group (utilisées si l'API échoue)
const staticVitalForGroupMZs = [
  "PRODSEC - AP03566 - ACESID",
  "PRODSEC - AP11564 - OCSP",
  "PRODSEC - AP11038 - WebSSO ITG",
  "PRODSEC - AP07352 - REFSG",
  "PRODSEC - AP24220 - Micro-segmentation",
  "PRODSEC - AP11667 - EPV-MUT",
  "PRODSEC - AP24260 - EPV-FORTIS"
];

// Fournisseur du contexte
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Au lieu d'initialiser avec des données mockées, on initialise avec des tableaux vides
  const [activeProblems, setActiveProblems] = useState<Problem[]>([]);
  const [managementZones, setManagementZones] = useState<ManagementZone[]>([]);
  const [vitalForGroupMZs, setVitalForGroupMZs] = useState<ManagementZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('process-groups');
  const [processGroups, setProcessGroups] = useState<ProcessGroup[]>([]);
  const [backendConnected, setBackendConnected] = useState<boolean>(false); // État de connexion au backend
  const [isLoading, setIsLoading] = useState({
    problems: true,
    managementZones: true,
    zoneDetails: false,
    vitalForGroupMZs: true,
    initialLoadComplete: false // Indique si le chargement initial est terminé
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
        apps: Math.floor(Math.random() * 5) + 1,
        services: Math.floor(Math.random() * 10) + 5,
        hosts: Math.floor(Math.random() * 8) + 2,
        availability: (97 + Math.random() * 3).toFixed(1) + "%",
        status: "healthy" as "healthy" | "warning",
        color: getZoneColor(mzName),
        dt_url: "#"
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
      
      // Charger les MZs de Vital for Group
      let vfgMZs: ManagementZone[] = [];
      
      try {
        const vfgResponse = await api.getVitalForGroupMZs();
        
        if (!vfgResponse.error && vfgResponse.data) {
          const vfgData = vfgResponse.data as VitalForGroupMZsResponse;
          if (vfgData.mzs && Array.isArray(vfgData.mzs) && vfgData.mzs.length > 0) {
            vfgMZs = createMZsFromNames(vfgData.mzs);
          } else {
            // Utiliser les noms statiques si l'API renvoie un tableau vide
            vfgMZs = createMZsFromNames(staticVitalForGroupMZs);
          }
        } else {
          // Utiliser les noms statiques si l'API échoue
          vfgMZs = createMZsFromNames(staticVitalForGroupMZs);
        }
      } catch (error) {
        console.error('Error fetching Vital for Group MZs:', error);
        vfgMZs = createMZsFromNames(staticVitalForGroupMZs);
      }
      
      setVitalForGroupMZs(vfgMZs);
      
      // Sélectionner automatiquement la première MZ
      if (!selectedZone && vfgMZs.length > 0) {
        setSelectedZone(vfgMZs[0].id);
      }
      
      // Charger les problèmes
      try {
        const problemsResponse = await api.getProblems();
        
        if (!problemsResponse.error && problemsResponse.data) {
          const problemsData = problemsResponse.data as ProblemResponse[];
          
          if (Array.isArray(problemsData) && problemsData.length > 0) {
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
            const updatedVfgMZs: ManagementZone[] = vfgMZs.map(zone => {
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
      } catch (error) {
        console.error('Error fetching problems:', error);
      }
      
      // Charger les process groups si une zone est sélectionnée
      if (selectedZone) {
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
            }
          }
        } catch (error) {
          console.error('Error fetching process groups:', error);
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setIsLoading(prev => ({ 
        ...prev, 
        problems: false, 
        managementZones: false,
        vitalForGroupMZs: false,
        initialLoadComplete: true // Le chargement initial est terminé
      }));
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
    isLoading,
    error,
    backendConnected,
    
    setSelectedZone,
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