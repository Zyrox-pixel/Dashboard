import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Layout from '../components/layout/Layout';
import ProblemsList from '../components/dashboard/ProblemsList';
import { ChevronLeft, AlertTriangle } from 'lucide-react';

/**
 * Page dédiée à l'affichage des problèmes actifs
 */
const ActiveProblemsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProblems, isLoading, refreshData } = useApp();
  
  // Forcer le rafraîchissement des problèmes actifs lors du chargement de la page
  useEffect(() => {
    console.log("Active Problems Page: Refreshing data...");
    refreshData();
  }, [refreshData]);
  
  // Navigation retour vers le tableau de bord
  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <Layout title="Problèmes Actifs">
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