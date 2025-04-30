import React from 'react';
import DashboardBase from '../components/dashboard/DashboardBase';
import { useApp } from '../contexts/AppContext';

/**
 * Dashboard optimisé pour Vital for Group
 * Utilise le composant DashboardBase avec les paramètres appropriés
 */
const OptimizedDashboard: React.FC = () => {
  const appContext = useApp();
  
  return (
    <DashboardBase
      title="Vital for Group (Optimisé)"
      variant="vfg"
      optimized={true}
      context={appContext}
    />
  );
};

export default OptimizedDashboard;