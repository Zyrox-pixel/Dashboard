import React, { useMemo, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import DashboardBase from '../components/dashboard/DashboardBase';
import { useApp } from '../contexts/AppContext';
import { useDashboardCache } from '../hooks/useDashboardCache';
import { AppProvider, OptimizedAppProvider } from '../contexts/AppContext';

// Correction de l'interface pour être compatible avec useParams
interface DashboardParams {
  [key: string]: string | undefined;
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
  
  // Composant interne qui accède au contexte et utilise le cache
  const DashboardWithContext: React.FC = () => {
    const appContext = useApp();
    const { refreshData } = appContext;
    
    // Utiliser notre hook de cache pour gérer les données du dashboard
    const dashboardCache = useDashboardCache(dashboardProps.variant);
    const { 
      activeProblems, 
      recentProblems, 
      isLoading, 
      error, 
      refreshData: refreshCachedData,
      initialLoadComplete
    } = dashboardCache;
    
    // Synchroniser les données entre le contexte global et notre cache local
    useEffect(() => {
      // Charger les données une seule fois au premier rendu
      if (!initialLoadComplete) {
        console.log(`Initializing cached dashboard data for ${dashboardProps.variant}`);
        refreshCachedData(false);
      }
    }, [dashboardProps.variant, initialLoadComplete, refreshCachedData]);
    
    // Combiner les données du contexte et du cache
    const enhancedContext = {
      ...appContext,
      activeProblems: activeProblems.length > 0 ? activeProblems : appContext.activeProblems,
      problemsLast72h: recentProblems.length > 0 ? recentProblems : appContext.problemsLast72h,
      isLoading: {
        ...appContext.isLoading,
        problems: isLoading
      },
      refreshData: async (variant?: 'vfg' | 'vfe', active?: boolean, timeframe?: string) => {
        // Utiliser notre système de cache pour le rafraîchissement
        await refreshCachedData(true);
        // Appeler aussi le refreshData original pour maintenir la compatibilité
        return refreshData(variant, active, timeframe);
      }
    };
    
    return (
      <DashboardBase 
        title={dashboardProps.title}
        variant={dashboardProps.variant}
        optimized={isOptimized}
        context={enhancedContext}
      />
    );
  };
  
  return (
    <DashboardWithContext />
  );
};

export default UnifiedDashboard;
