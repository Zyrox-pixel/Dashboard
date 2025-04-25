import React, { useState, useEffect } from 'react';
import { DollarSign, Building, CreditCard, Users, ShoppingCart, Truck, Database, LineChart } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ProblemsList from '../components/dashboard/ProblemsList';
import ManagementZoneList from '../components/dashboard/ManagementZoneList';
import ZoneDetails from '../components/dashboard/ZoneDetails';
import { Problem, ManagementZone, ProcessGroup } from '../api/types';
import { useApp } from '../contexts/AppContext';

// Données factices pour les process groups (à remplacer par des données de l'API)
const mockFinanceProcessGroups: ProcessGroup[] = [
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
  { 
    name: "OneAgent log analytics", 
    technology: "DYNATRACE",
    icon: <></>,
    type: "technology"
  },
  { 
    name: "bacula-fd", 
    technology: "Non spécifié",
    icon: <></>,
    type: "technology"
  },
  { 
    name: "[ILLUMIO] venPlatformHandler", 
    technology: "ILLUMIO, SQLITE",
    icon: <></>,
    type: "technology"
  },
  { 
    name: "cybAgent", 
    technology: "CA Workload Agent",
    icon: <></>,
    type: "technology"
  },
  { 
    name: "snmpd", 
    technology: "SQLITE, UNIX_BP2I",
    icon: <Database size={14} />,
    type: "database"
  },
  { 
    name: "BESClient", 
    technology: "BIGFIX",
    icon: <></>,
    type: "technology"
  },
  { 
    name: "systemd", 
    technology: "Non spécifié",
    icon: <></>,
    type: "technology"
  },
];

// Données factices pour les management zones (à remplacer par des données de l'API)
const mockManagementZones: ManagementZone[] = [
  {
    id: "finance-core",
    name: "Finance Core",
    code: "AP26378",
    icon: <DollarSign />,
    problemCount: 1,
    apps: 4,
    services: 13,
    hosts: 7,
    availability: "98.2%",
    status: "warning",
    color: "red"
  },
  {
    id: "core-business",
    name: "Core Business",
    code: "AP24782",
    icon: <Building />,
    problemCount: 1,
    apps: 3,
    services: 9,
    hosts: 5,
    availability: "97.8%",
    status: "warning",
    color: "amber"
  },
  {
    id: "financial-services",
    name: "Financial Services",
    code: "AP19875",
    icon: <CreditCard />,
    problemCount: 1,
    apps: 2,
    services: 6,
    hosts: 4,
    availability: "99.3%",
    status: "warning",
    color: "orange"
  },
  {
    id: "hr-systems",
    name: "HR Systems",
    code: "AP18345",
    icon: <Users />,
    problemCount: 0,
    apps: 2,
    services: 8,
    hosts: 3,
    availability: "100%",
    status: "healthy",
    color: "purple"
  },
  {
    id: "e-commerce",
    name: "E-Commerce",
    code: "AP22156",
    icon: <ShoppingCart />,
    problemCount: 0,
    apps: 3,
    services: 12,
    hosts: 6,
    availability: "99.9%",
    status: "healthy",
    color: "blue"
  },
  {
    id: "supply-chain",
    name: "Supply Chain",
    code: "AP30421",
    icon: <Truck />,
    problemCount: 0,
    apps: 2,
    services: 7,
    hosts: 4,
    availability: "100%",
    status: "healthy",
    color: "emerald"
  },
  {
    id: "crm-platform",
    name: "CRM Platform",
    code: "AP52781",
    icon: <Users />,
    problemCount: 0,
    apps: 3,
    services: 15,
    hosts: 8,
    availability: "99.7%",
    status: "healthy",
    color: "blue"
  },
  {
    id: "marketing-tools",
    name: "Marketing Tools",
    code: "AP61290",
    icon: <Database />,
    problemCount: 0,
    apps: 4,
    services: 11,
    hosts: 5,
    availability: "100%",
    status: "healthy",
    color: "purple"
  },
  {
    id: "data-platform",
    name: "Data Platform",
    code: "AP74529",
    icon: <Database />,
    problemCount: 0,
    apps: 6,
    services: 22,
    hosts: 12,
    availability: "99.5%",
    status: "healthy",
    color: "blue"
  },
  {
    id: "analytics-platform",
    name: "Analytics Platform",
    code: "AP86421",
    icon: <LineChart />,
    problemCount: 0,
    apps: 5,
    services: 18,
    hosts: 7,
    availability: "99.8%",
    status: "healthy",
    color: "green"
  }
];

const Dashboard: React.FC = () => {
  const { activeProblems } = useApp();
  const [managementZones] = useState<ManagementZone[]>(mockManagementZones);
  const [financeProcessGroups] = useState<ProcessGroup[]>(mockFinanceProcessGroups);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('process-groups');
  
  const handleZoneClick = (zoneId: string) => {
    setSelectedZone(zoneId);
    setActiveTab('process-groups');
  };
  
  const handleBackClick = () => {
    setSelectedZone(null);
  };
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Trouver la zone sélectionnée
  const currentZone = managementZones.find(zone => zone.id === selectedZone);
  
  return (
    <Layout
      title="Vital for Group"
      subtitle={currentZone?.name}
    >
      {selectedZone && currentZone ? (
        // Vue détaillée d'une Management Zone
        <ZoneDetails
          zone={currentZone}
          problems={activeProblems}
          processGroups={financeProcessGroups}
          activeTab={activeTab}
          onBackClick={handleBackClick}
          onTabChange={handleTabChange}
        />
      ) : (
        // Vue d'accueil: Problèmes puis Management Zones
        <>
          <ProblemsList problems={activeProblems} />
          <ManagementZoneList zones={managementZones} onZoneClick={handleZoneClick} />
        </>
      )}
    </Layout>
  );
};

export default Dashboard;