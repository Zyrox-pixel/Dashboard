import React from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
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
  const title = (() => {
    switch(dashboardType) {
      case 'all':
        return "Surveillance des Problèmes - Tous les Environnements";
      case 'vfg':
        return "Surveillance des Problèmes - Vital for Group";
      case 'vfe':
        return "Surveillance des Problèmes - Vital for Entreprise";
      case 'detection':
        return "Surveillance des Problèmes - Detection CTL";
      case 'encryption':
        return "Surveillance des Problèmes - Security Encryption";
      default:
        return "Surveillance des Problèmes";
    }
  })();
  
  // Utiliser le AllProblemsView lorsque dashboard=all pour éviter les problèmes de requêtes en boucle
  return (
    <Layout title={title}>
      {dashboardType === 'all' ? (
        <AllProblemsView />
      ) : (
        <UnifiedProblemsView 
          title={title}
          variant={dashboardType as 'vfg' | 'vfe' | 'detection' | 'encryption'}
        />
      )}
    </Layout>
  );
};

export default UnifiedProblemsPage;