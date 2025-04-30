import React from 'react';
import DashboardBase from '../components/dashboard/DashboardBase';
import { useApp } from '../contexts/AppContext';

/**
 * Dashboard simplifié pour Vital for Entreprise
 * Utilise le composant DashboardBase avec les paramètres appropriés
 */
const EntrepriseDashboard: React.FC = () => {
  const appContext = useApp();
  
  return (
    <DashboardBase
      title="Vital for Entreprise"
      variant="vfe"
      context={appContext}
    />
  );
};

export default EntrepriseDashboard;