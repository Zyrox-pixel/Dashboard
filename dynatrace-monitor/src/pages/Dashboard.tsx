import React from 'react';
import DashboardBase from '../components/dashboard/DashboardBase';
import { useApp } from '../contexts/AppContext';

/**
 * Dashboard simplifié pour Vital for Group
 * Utilise le composant DashboardBase avec les paramètres appropriés
 */
const Dashboard: React.FC = () => {
  const appContext = useApp();
  
  return (
    <DashboardBase
      title="Vital for Group"
      variant="vfg"
      context={appContext}
    />
  );
};

export default Dashboard;