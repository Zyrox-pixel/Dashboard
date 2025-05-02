import React, { useMemo, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import DashboardBase from '../components/dashboard/DashboardBase';
import { useApp } from '../contexts/AppContext';
import { AppProvider, OptimizedAppProvider } from '../contexts/AppContext';

// Correction de l'interface pour être compatible avec useParams
interface DashboardParams {
  [key: string]: string | undefined; // Ajout de l'index signature
  type?: string;
  optimized?: string;
}

/**
 * Tableau de bord unifié qui remplace les quatre composants de dashboard existants
 * Utilise les paramètres d'URL pour déterminer le type et le mode d'optimisation
 */
const UnifiedDashboard: React.FC = () => {
  // Récupérer les paramètres de l'URL
  const params = useParams<DashboardParams>();
  const type = params.type || 'vfg';
  const isOptimized = params.optimized === 'true';
  
  // Identifier les paramètres du tableau de bord
  const dashboardProps = useMemo(() => {
    switch (type) {
      case 'vfe':
        return {
          title: isOptimized ? "Vital for Entreprise (Optimisé)" : "Vital for Entreprise",
          variant: 'vfe' as 'vfg' | 'vfe',
        };
      case 'vfg':
      default:
        return {
          title: isOptimized ? "Vital for Group (Optimisé)" : "Vital for Group",
          variant: 'vfg' as 'vfg' | 'vfe',
        };
    }
  }, [type, isOptimized]);
  
  // Sélectionner le bon contexte selon le mode d'optimisation
  const ContextProvider = isOptimized ? OptimizedAppProvider : AppProvider;
  
  // Composant interne qui accède au contexte
  const DashboardWithContext: React.FC = () => {
    const appContext = useApp();
    const { refreshData } = appContext;
    
    // Utiliser useEffect pour charger les données au montage du composant
    // et passer le type de dashboard correct (vfg ou vfe)
    useEffect(() => {
      // Passer le type de dashboard à la fonction refreshData
      refreshData(dashboardProps.variant as 'vfg' | 'vfe');
    }, [dashboardProps.variant, refreshData]);
    
    return (
      <DashboardBase 
        title={dashboardProps.title}
        variant={dashboardProps.variant}
        optimized={isOptimized}
        context={appContext}
      />
    );
  };
  
  return (
    <ContextProvider>
      <DashboardWithContext />
    </ContextProvider>
  );
};

export default UnifiedDashboard;