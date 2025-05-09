import React from 'react';
import { useLocation } from 'react-router-dom';
import ModernLayout from '../components/layout/ModernLayout';
import UnifiedProblemsView from '../components/dashboard/UnifiedProblemsView';
import AllProblemsView from '../components/common/AllProblemsView';


/**
 * Page dédiée à l'affichage unifié des problèmes (actifs et récents)
 * Remplace les pages séparées ActiveProblemsPage et RecentProblemsPage
 */
const UnifiedProblemsPage: React.FC = () => {
  // Nous n'utilisons pas directement les paramètres d'URL, seulement location
  const location = useLocation();
  
  // Récupérer le paramètre de type de dashboard depuis l'URL
  // Pour l'URL /problems/unified, utiliser 'all' par défaut, sinon 'vfg'
  const dashboardType = new URLSearchParams(location.search).get('dashboard') || 'all';
  
  // Déterminer le titre en fonction du type de dashboard
  const title = dashboardType === 'all'
    ? "Surveillance des Problèmes - Tous les Environnements"
    : dashboardType === 'vfg' 
      ? "Surveillance des Problèmes - Vital for Group" 
      : "Surveillance des Problèmes - Vital for Entreprise";
  
  // Utiliser le AllProblemsView lorsque dashboard=all pour éviter les problèmes de requêtes en boucle
  return (
    <ModernLayout title={title} subtitle="Analyse et gestion des alertes système">
      {dashboardType === 'all' ? (
        <AllProblemsView />
      ) : (
        <UnifiedProblemsView
          title={title}
          variant={dashboardType as 'vfg' | 'vfe'}
        />
      )}
    </ModernLayout>
  );
};

export default UnifiedProblemsPage;