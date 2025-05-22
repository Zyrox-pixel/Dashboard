import React from 'react';
import { useLocation } from 'react-router-dom';
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
    switch (dashboardType) {
      case 'vfg':
        title += " - Vital for Group";
        break;
      case 'vfe':
        title += " - Vital for Entreprise";
        break;
      case 'detection':
        title += " - Détection & CTL";
        break;
      case 'security':
        title += " - Security & Encryption";
        break;
      case 'vfp':
        title += " - Vital for Production";
        break;
      case 'vfa':
        title += " - Vital for Analytics";
        break;
      default:
        title += " - " + dashboardType.toUpperCase();
    }
  }
  
  if (problemType === 'active') {
    title += " - Problèmes Actifs";
  } else if (problemType === 'recent') {
    title += " - Problèmes Récents (72h)";
  } else {
    title += " - Tous les Problèmes";
  }
  return (
    <>
      {dashboardType === 'all' ? (
        <AllProblemsView problemType={problemType} />
      ) : (
        <UnifiedProblemsView 
          title={title}
          variant={dashboardType as 'vfg' | 'vfe' | 'detection' | 'security' | 'vfp' | 'vfa'}
          problemType={problemType}
        />
      )}
    </>
  );
};

export default UnifiedProblemsPage;
