import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import UnifiedProblemsView from '../components/dashboard/UnifiedProblemsView';
import { useApp } from '../contexts/AppContext';
import { Problem } from '../api/types';

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
  const { activeProblems, problemsLast72h, refreshData } = useApp();
  
  // État local pour stocker les problèmes combinés
  const [combinedActiveProblems, setCombinedActiveProblems] = useState<Problem[]>([]);
  const [combinedRecentProblems, setCombinedRecentProblems] = useState<Problem[]>([]);
  
  // Récupérer le paramètre de type de dashboard depuis l'URL
  const dashboardType = new URLSearchParams(location.search).get('dashboard');
  
  // Déterminer le titre - pour tous les problèmes si aucun type spécifié
  const title = !dashboardType
    ? "Surveillance Unifiée des Problèmes - Tous les Environnements"
    : dashboardType === 'vfg'
      ? "Surveillance des Problèmes - Vital for Group"
      : "Surveillance des Problèmes - Vital for Entreprise";
  
  // Effet pour combiner ou filtrer les problèmes selon le contexte
  useEffect(() => {
    // Si un type de dashboard est spécifié, filtrer les problèmes pour ce type
    if (dashboardType) {
      // Nous gardons le comportement original pour les vues spécifiques
      refreshData(dashboardType as 'vfg' | 'vfe', true);
    } else {
      // Pour la vue globale, nous devons charger les problèmes des deux types
      const loadAllProblems = async () => {
        // Actualiser les problèmes VFG
        await refreshData('vfg', true);
        // Actualiser les problèmes VFE
        await refreshData('vfe', true);
      };
      
      loadAllProblems();
      
      // Combiner les problèmes des deux environnements
      // Note: ceci utilise simplement les problèmes déjà présents dans le contexte
      // puisque refreshData prend du temps pour s'actualiser
      setCombinedActiveProblems(activeProblems);
      setCombinedRecentProblems(problemsLast72h);
    }
  }, [dashboardType, refreshData]);
  
  // Combiner les problèmes lors des mises à jour du contexte
  useEffect(() => {
    // Seulement pour la vue unifiée (sans dashboard spécifié)
    if (!dashboardType) {
      setCombinedActiveProblems(activeProblems);
      setCombinedRecentProblems(problemsLast72h);
    }
  }, [activeProblems, problemsLast72h, dashboardType]);
  
  // Utiliser un composant CustomProblemsView factice pour afficher les problèmes combinés
  // ou la vue standard pour les vues spécifiques
  return (
    <Layout title={title}>
      {!dashboardType ? (
        // Vue unifiée pour tous les problèmes
        <UnifiedProblemsView 
          title={title}
          variant="combined"
          allProblems={combinedActiveProblems}
          allRecent72hProblems={combinedRecentProblems}
        />
      ) : (
        // Vue filtrée pour un type spécifique
        <UnifiedProblemsView 
          title={title}
          variant={dashboardType as 'vfg' | 'vfe'}
        />
      )}
    </Layout>
  );
};

export default UnifiedProblemsPage;