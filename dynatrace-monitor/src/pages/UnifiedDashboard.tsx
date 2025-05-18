import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import DashboardBase from '../components/dashboard/DashboardBase';
import { useApp } from '../contexts/AppContext';
import { AppProvider, OptimizedAppProvider } from '../contexts/AppContext';
import { useProblems } from '../contexts/ProblemsContext';
import { DashboardVariant } from '../api/types';
import cacheService, { CACHE_DURATIONS } from '../utils/cacheService';

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
          variant: 'vfe' as DashboardVariant,
        };
      case 'detection':
        return {
          title: isOptimized ? "Detection CTL (Optimisé)" : "Detection CTL",
          variant: 'detection' as DashboardVariant,
        };
      case 'encryption':
        return {
          title: isOptimized ? "Security Encryption (Optimisé)" : "Security Encryption",
          variant: 'encryption' as DashboardVariant,
        };
      case 'vfg':
      default:
        return {
          title: isOptimized ? "Vital for Group (Optimisé)" : "Vital for Group",
          variant: 'vfg' as DashboardVariant,
        };
    }
  }, [type, isOptimized]);
  
  // Sélectionner le bon contexte selon le mode d'optimisation
  const ContextProvider = isOptimized ? OptimizedAppProvider : AppProvider;
  
  // Composant interne qui accède au contexte
  const DashboardWithContext: React.FC = () => {
    const appContext = useApp();
    const { refreshData } = appContext;
    const { setCurrentAppType } = useProblems();
    
    // État pour suivre le chargement des données
    const [isLoading, setIsLoading] = useState(false);
    
    // Utiliser un ref pour suivre si l'initialisation a déjà été effectuée
    const initializedRef = useRef<{ [key: string]: boolean }>({});
    
    // Mettre à jour le type d'application courant quand la variante change
    useEffect(() => {
      // Informer le contexte des problèmes du type d'application actuel
      setCurrentAppType(dashboardProps.variant);
      console.log(`[UnifiedDashboard] Setting current app type to ${dashboardProps.variant}`);
    }, [dashboardProps.variant, setCurrentAppType]);
    
    // Charger les données une seule fois par type de dashboard avec gestion du cache
    useEffect(() => {
      const variant = dashboardProps.variant;
      
      // Vérifier si les données sont en cache
      const cacheKey = `dashboard:${variant}:initialized`;
      const cachedData = cacheService.get(cacheKey);
      
      // Si les données sont en cache, marquer comme initialisé
      if (cachedData) {
        console.log(`[UnifiedDashboard] Using cached data for ${variant}`);
        initializedRef.current[variant] = true;
        return;
      }
      
      // Vérifier si ce type de dashboard a déjà été initialisé
      if (!initializedRef.current[variant]) {
        console.log(`[UnifiedDashboard] Initializing dashboard data for ${variant}`);
        setIsLoading(true);
        
        // Charger les données
        refreshData(variant, false)
          .then(() => {
            // Mettre en cache l'état d'initialisation
            cacheService.set(cacheKey, true, { 
              ttl: CACHE_DURATIONS.MANAGEMENT_ZONES,
              category: 'dashboard'
            });
            
            // Marquer comme initialisé
            initializedRef.current[variant] = true;
          })
          .catch(error => {
            console.error(`[UnifiedDashboard] Error initializing data for ${variant}:`, error);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }, [dashboardProps.variant, refreshData]); // Inclure refreshData dans les dépendances
    
    return (
      <DashboardBase 
        key={`dashboard-${dashboardProps.variant}`}
        title={dashboardProps.title}
        variant={dashboardProps.variant}
        optimized={isOptimized}
        context={appContext}
      />
    );
  };
  
  return (
    <DashboardWithContext />
  );
};

export default UnifiedDashboard;
