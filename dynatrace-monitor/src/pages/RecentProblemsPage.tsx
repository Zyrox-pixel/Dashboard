import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Layout from '../components/layout/Layout';
import ProblemsList from '../components/dashboard/ProblemsList';
import { ChevronLeft, Clock } from 'lucide-react';

/**
 * Page dédiée à l'affichage des problèmes des dernières 72 heures
 */
const RecentProblemsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { problemsLast72h, isLoading, refreshData } = useApp();
  
  // Récupérer le paramètre de type de dashboard depuis l'URL
  const dashboardType = new URLSearchParams(location.search).get('dashboard') || 'vfg';
  
  // Forcer un rafraîchissement des données une seule fois au chargement
  useEffect(() => {
    // Utiliser un flag pour éviter les boucles infinies
    const loadOnce = async () => {
      console.log(`Loading recent problems with dashboard type: ${dashboardType}`);
      await refreshData(dashboardType as 'vfg' | 'vfe');
    };
    
    loadOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardType]);
  
  // Navigation retour vers le bon tableau de bord
  const handleBackClick = () => {
    navigate(`/dashboard/${dashboardType}`);
  };

  // Déterminer le titre en fonction du type de dashboard
  const title = dashboardType === 'vfg' 
    ? "Tous les problèmes (72h) - Vital for Group" 
    : "Tous les problèmes (72h) - Vital for Entreprise";
  
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
        <div className="p-4 bg-amber-900/20 border border-amber-800 rounded-lg mb-6">
          <div className="flex items-start gap-4">
            <Clock className="text-amber-500" size={24} />
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">
                Tous les problèmes des 72 dernières heures
              </h2>
              <p className="text-slate-300">
                Liste complète de tous les incidents survenus au cours des 72 dernières heures
              </p>
            </div>
            <div className="ml-auto flex items-center justify-center w-10 h-10 rounded-full bg-amber-950 text-white font-bold">
              {problemsLast72h ? problemsLast72h.length : 0}
            </div>
          </div>
        </div>

        {/* Section des problèmes */}
        {isLoading.problems ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-t-4 border-b-4 border-amber-500 rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-400">Chargement des problèmes...</span>
          </div>
        ) : problemsLast72h && problemsLast72h.length > 0 ? (
          <ProblemsList 
            problems={problemsLast72h} 
            title="Tous les problèmes des dernières 72h"
            showRefreshButton={false}
          />
        ) : (
          <div className="p-6 rounded-lg bg-slate-800 border border-slate-700 text-center">
            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun problème sur les 72 dernières heures</h3>
            <p className="text-slate-400">
              Aucun incident n'a été détecté pour cette période. Tout fonctionne normalement.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RecentProblemsPage;