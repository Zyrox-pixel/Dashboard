import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Layout from '../components/layout/Layout';
import ProblemsList from '../components/dashboard/ProblemsList';
import { ChevronLeft, Clock } from 'lucide-react';

/**
 * Page dédiée à l'affichage des problèmes des dernières 72 heures
 */
const RecentProblemsPage: React.FC = () => {
  const navigate = useNavigate();
  const { problemsLast72h, isLoading } = useApp();
  
  // Navigation retour vers le tableau de bord
  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <Layout title="Problèmes Récents (72h)">
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
                Problèmes des 72 dernières heures
              </h2>
              <p className="text-slate-300">
                Liste des incidents récents survenus au cours des 72 dernières heures
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
        ) : (
          <ProblemsList 
            problems={problemsLast72h || []} 
            title="Problèmes des dernières 72h"
          />
        )}
      </div>
    </Layout>
  );
};

export default RecentProblemsPage;