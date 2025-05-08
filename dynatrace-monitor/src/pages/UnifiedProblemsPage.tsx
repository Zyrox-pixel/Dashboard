import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import UnifiedProblemsView from '../components/dashboard/UnifiedProblemsView';

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
  const dashboardType = new URLSearchParams(location.search).get('dashboard') || 'vfg';
  
  // Déterminer le titre en fonction du type de dashboard
  const title = dashboardType === 'vfg' 
    ? "Surveillance des Problèmes - Vital for Group" 
    : "Surveillance des Problèmes - Vital for Entreprise";
  
  return (
    <Layout title={title}>
      <UnifiedProblemsView 
        title={title}
        variant={dashboardType as 'vfg' | 'vfe'}
      />
    </Layout>
  );
};

export default UnifiedProblemsPage;