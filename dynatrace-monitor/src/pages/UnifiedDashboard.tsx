import React, { useMemo, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import DashboardBase from '../components/dashboard/DashboardBase';
import { useApp } from '../contexts/AppContext';
import { DashboardVariant } from '../api/types';

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
  
  // Référence pour le contexte
  const appContextRef = useRef<any>(null);
  
  // Effet pour charger le cache au montage du composant
  useEffect(() => {
    // Petit délai pour s'assurer que le contexte est monté
    const timer = setTimeout(() => {
      if (appContextRef.current && appContextRef.current.loadFromCacheIfAvailable) {
        console.log('Tentative de chargement du cache pour', type);
        const cacheLoaded = appContextRef.current.loadFromCacheIfAvailable();
        if (cacheLoaded) {
          console.log('Cache chargé avec succès pour', type);
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [type]);
  
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
  
  
  // Composant interne qui accède au contexte
  const DashboardWithContext: React.FC = () => {
    const appContext = useApp();
    const { refreshData, loadFromCacheIfAvailable } = appContext;
    
    // Stocker la référence du contexte pour l'effet externe
    useEffect(() => {
      appContextRef.current = appContext;
    }, [appContext]);
    
    // Utiliser un ref pour suivre si l'initialisation a déjà été effectuée
    const initializedRef = useRef<{ [key: string]: boolean }>({});
    
    // Charger les données une seule fois par type de dashboard
    useEffect(() => {
      const variant = dashboardProps.variant;
      
      // Essayer d'abord de charger depuis le cache
      const cacheLoaded = loadFromCacheIfAvailable();
      console.log(`Tentative de chargement du cache pour ${variant}: ${cacheLoaded}`);
      
      // Si pas de cache ou s'il n'a jamais été initialisé, charger normalement
      if (!cacheLoaded && !initializedRef.current[variant]) {
        console.log(`Initializing dashboard data for ${variant}`);
        refreshData(variant, false);
        initializedRef.current[variant] = true;
      } else if (cacheLoaded) {
        console.log(`Cache chargé pour ${variant}, pas de rechargement nécessaire`);
      }
    }, [dashboardProps.variant]); // refreshData et loadFromCacheIfAvailable sont intentionnellement omis des dépendances
    
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
    <DashboardWithContext />
  );
};

export default UnifiedDashboard;