import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api';
import { Problem, ManagementZone, ProcessGroup } from '../api/types';

// Définition du type pour le contexte de l'application
interface AppContextType {
  activeProblems: Problem[];
  managementZones: ManagementZone[];
  selectedZone: string | null;
  sidebarCollapsed: boolean;
  currentPage: number;
  activeTab: string;
  financeProcessGroups: ProcessGroup[];
  isLoading: {
    problems: boolean;
    managementZones: boolean;
    zoneDetails: boolean;
  };
  
  // Fonctions pour modifier l'état
  setSelectedZone: (zoneId: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: number) => void;
  setActiveTab: (tab: string) => void;
  refreshData: () => void;
}

// Création du contexte
const AppContext = createContext<AppContextType | undefined>(undefined);

// Données factices pour les problèmes actifs (à remplacer par des données de l'API)
const mockActiveProblems: Problem[] = [
  {
    id: "PROB-1",
    title: "Latence élevée sur API Clients",
    code: "AP26378",
    subtitle: "JARVIS CRM - Management Zone: Finance Core",
    time: "Il y a 37 minutes",
    type: "Dégradation de performance",
    responseTime: "2.7s (seuil: 1.5s)",
    servicesImpacted: "2",
    usersAffected: "~450",
    impact: "MOYEN",
    status: "warning",
    zone: "Finance Core"
  },
  {
    id: "PROB-2",
    title: "CPU élevé sur serveur de base de données",
    code: "AP24782",
    subtitle: "ERP Global - Management Zone: Core Business",
    time: "Il y a 1 heure",
    type: "Utilisation ressources",
    cpuUsage: "92% (seuil: 80%)",
    host: "s02vl8822471.fr.net.intra",
    duration: "58 minutes",
    impact: "ÉLEVÉ",
    status: "critical",
    zone: "Core Business"
  },
  {
    id: "PROB-3",
    title: "Timeout sur le service de paiement",
    code: "AP19875",
    subtitle: "Payments Gateway - Management Zone: Financial Services",
    time: "Il y a 3 heures",
    type: "Erreur application",
    errorRate: "4.2% (seuil: 1%)",
    servicesImpacted: "1",
    failedTransactions: "143",
    impact: "FAIBLE",
    status: "low",
    zone: "Financial Services"
  }
];

// Fournisseur du contexte
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [activeProblems, setActiveProblems] = useState<Problem[]>(mockActiveProblems);
  const [managementZones, setManagementZones] = useState<ManagementZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('process-groups');
  const [isLoading, setIsLoading] = useState({
    problems: false,
    managementZones: false,
    zoneDetails: false
  });

  // Données pour Finance Core Process Groups (à remplacer par des données de l'API)
  const financeProcessGroups: ProcessGroup[] = [
    { 
      name: "seod", 
      technology: "n/ac",
      icon: <></>,
      type: "technology"
    },
    { 
      name: "PRODSEC AP26378 Go filebeat", 
      technology: "GO",
      icon: <></>,
      type: "technology"
    },
    // ... autres process groups
  ];

  // Charger les données initiales
  useEffect(() => {
    fetchData();
  }, []);

  // Fonction pour charger les données de l'API
  const fetchData = async () => {
    try {
      setIsLoading(prev => ({ ...prev, problems: true, managementZones: true }));
      
      // Charger les problèmes (à implémenter avec l'API réelle)
      // const problemsResponse = await api.getProblems();
      // if (!problemsResponse.error) {
      //   setActiveProblems(problemsResponse.data);
      // }
      
      // Charger les management zones (à implémenter avec l'API réelle)
      // const zonesResponse = await api.getManagementZones();
      // if (!zonesResponse.error) {
      //   setManagementZones(zonesResponse.data);
      // }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, problems: false, managementZones: false }));
    }
  };

  // Fonction pour rafraîchir les données
  const refreshData = () => {
    fetchData();
  };

  // Valeur du contexte
  const value: AppContextType = {
    activeProblems,
    managementZones,
    selectedZone,
    sidebarCollapsed,
    currentPage,
    activeTab,
    financeProcessGroups,
    isLoading,
    
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