import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Page redirection - Cette page redirige vers la vue unifiée des problèmes
 * car nous avons fusionné cette fonctionnalité dans UnifiedProblemsView et AllProblemsView
 */
const RecentProblemsPage: React.FC = () => {
  // Rediriger vers la vue unifiée des problèmes qui peut maintenant afficher différentes périodes
  return <Navigate to="/problems/unified" replace />;
};

export default RecentProblemsPage;