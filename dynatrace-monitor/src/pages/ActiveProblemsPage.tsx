import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Layout from '../components/layout/Layout';
import ProblemsList from '../components/dashboard/ProblemsList';
import { ChevronLeft, AlertTriangle } from 'lucide-react';

/**
 * Page dédiée à l'affichage des problèmes actifs
 */
const ActiveProblemsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProblems, isLoading, refreshData } = useApp();
  
  // Récupérer le paramètre de type de dashboard depuis l'URL
  const dashboardType = new URLSearchParams(location.search).get('dashboard') || 'vfg';
  
  // Forcer un rafraîchissement des données une seule fois au chargement
  useEffect(() => {
    // Utiliser un flag pour éviter les boucles infinies
    const loadOnce = async () => {
      await refreshData(dashboardType as 'vfg' | 'vfe', false);
    };
    
    loadOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Navigation retour vers le bon tableau de bord
  const handleBackClick = () => {
    navigate(`/dashboard/${dashboardType}`);
  };

  // Déterminer le titre en fonction du type de dashboard
  const title = dashboardType === 'vfg' 
    ? "Problèmes Actifs - Vital for Group" 
    : "Problèmes Actifs - Vital for Entreprise";
  
  return (
    <Layout title={title}>
      <div className="space-y-6">
        {/* Bouton retour */}
        <button 
          onClick={handleBackClick}
          className="mb-2 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <ChevronLeft size={14} />
          <span>Retour au tableau de bord</span>
        </button>

        {/* En-tête de la page */}
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg mb-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-red-500" size={24} />
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">
                Problèmes Actifs
              </h2>
              <p className="text-slate-300">
                Liste complète des problèmes Dynatrace actuellement actifs sur les systèmes supervisés
              </p>
            </div>
            <div className="ml-auto flex items-center justify-center w-10 h-10 rounded-full bg-red-950 text-white font-bold">
              {activeProblems.length}
            </div>
          </div>
        </div>

        {/* Section des problèmes */}
        {isLoading.problems ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-t-4 border-b-4 border-red-500 rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-400">Chargement des problèmes...</span>
          </div>
        ) : (
          <ProblemsList 
            problems={activeProblems} 
            title="Tous les problèmes actifs"
          />
        )}
      </div>
    </Layout>
  );
};

export default ActiveProblemsPage;