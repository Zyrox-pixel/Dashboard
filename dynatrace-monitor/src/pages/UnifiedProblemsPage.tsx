import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import UnifiedProblemsView from '../components/dashboard/UnifiedProblemsView';
import AllProblemsView from '../components/common/AllProblemsView';

interface ProblemsPageParams {
  [key: string]: string | undefined;
}

/**
 * Page dédiée à l'affichage unifié des problèmes (actifs et récents)
 * Remplace les pages séparées ActiveProblemsPage et RecentProblemsPage
 */
const UnifiedProblemsPage: React.FC = () => {
  const params = useParams<ProblemsPageParams>();
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
    <Layout title={title}>
      {dashboardType === 'all' ? (
        <AllProblemsView />
      ) : (
        <UnifiedProblemsView 
          title={title}
          variant={dashboardType as 'vfg' | 'vfe'}
        />
      )}
    </Layout>
  );
};

export default UnifiedProblemsPage;