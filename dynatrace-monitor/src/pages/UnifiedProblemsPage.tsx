import React from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import UnifiedProblemsView from '../components/dashboard/UnifiedProblemsView';
import AllProblemsView from '../components/common/AllProblemsView';

/**
 * Page unifiée pour afficher tous les types de problèmes (actifs, récents, tous)
 * Remplace les anciennes pages séparées
 */
const UnifiedProblemsPage: React.FC = () => {
  const location = useLocation();
  
  // Récupérer le paramètre de type de dashboard depuis l'URL
  const dashboardType = new URLSearchParams(location.search).get('dashboard') || 'all';
  
  // Détecter le type de problèmes à afficher en fonction du chemin
  const problemType = location.pathname.includes('/active') 
    ? 'active' 
    : location.pathname.includes('/recent') 
      ? 'recent' 
      : 'all';
  
  // Déterminer le titre en fonction du type de dashboard et de problèmes
  let title = "Surveillance des Problèmes";
  
  if (dashboardType !== 'all') {
    title += dashboardType === 'vfg' 
      ? " - Vital for Group" 
      : " - Vital for Entreprise";
  }
  
  if (problemType === 'active') {
    title += " - Problèmes Actifs";
  } else if (problemType === 'recent') {
    title += " - Problèmes Récents (72h)";
  } else {
    title += " - Tous les Problèmes";
  }
  return (
    <Layout title={title}>
      {dashboardType === 'all' ? (
        <AllProblemsView problemType={problemType} />
      ) : (
        <UnifiedProblemsView 
          title={title}
          variant={dashboardType as 'vfg' | 'vfe'}
          problemType={problemType}
        />
      )}
    </Layout>
  );
};

export default UnifiedProblemsPage;
