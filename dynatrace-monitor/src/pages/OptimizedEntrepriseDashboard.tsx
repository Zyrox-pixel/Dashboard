import React from 'react';
import DashboardBase from '../components/dashboard/DashboardBase';
import { useApp } from '../contexts/AppContext';

/**
 * Dashboard optimisé pour Vital for Entreprise
 * Utilise le composant DashboardBase avec les paramètres appropriés
 */
const OptimizedEntrepriseDashboard: React.FC = () => {
  const appContext = useApp();
  
  return (
    <DashboardBase
      title="Vital for Entreprise (Optimisé)"
      variant="vfe"
      optimized={true}
      context={appContext}
    />
  );
};

export default OptimizedEntrepriseDashboard;