import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Layout from '../components/layout/Layout';
import ProblemsList from '../components/dashboard/ProblemsList';
import { ChevronLeft, Clock } from 'lucide-react';
import { Problem } from '../api/types';

/**
 * Page dédiée à l'affichage des problèmes des dernières 72 heures
 */
const RecentProblemsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { problemsLast72h, isLoading, refreshData } = useApp();
  
  // État local pour empêcher les actualisations trop fréquentes
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [localProblems, setLocalProblems] = useState<Problem[]>([]);
  
  // Récupérer le paramètre de type de dashboard depuis l'URL
  const dashboardType = new URLSearchParams(location.search).get('dashboard') || 'vfg';
  
  // Synchroniser les problèmes locaux avec les problèmes globaux
  useEffect(() => {
    if (problemsLast72h && problemsLast72h.length > 0) {
      console.log(`Mise à jour des problèmes 72h locaux sur la page avec ${problemsLast72h.length} problèmes`);
      setLocalProblems(problemsLast72h);
    }
  }, [problemsLast72h]);
  
  // Forcer un rafraîchissement des données une seule fois au chargement
  useEffect(() => {
    // Utiliser un flag pour éviter les boucles infinies
    const loadOnce = async () => {
      console.log(`Loading recent problems with dashboard type: ${dashboardType}`);
      try {
        // Spécifiez false comme second paramètre pour indiquer que ce n'est pas un rafraîchissement de problèmes actifs
        await refreshData(dashboardType as 'vfg' | 'vfe', false);
        setLastRefreshTime(Date.now());
      } catch (error) {
        console.error("Erreur lors du chargement initial des problèmes 72h:", error);
      }
    };
    
    loadOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardType]);
  
  // Gestionnaire pour les rafraîchissements manuels
  const handleManualRefresh = useCallback(async (refreshedProblems: Problem[]) => {
    // Mettre à jour la dernière heure de rafraîchissement
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;
    
    // Limiter les rafraîchissements à un toutes les 5 secondes
    if (timeSinceLastRefresh < 5000) {
      console.log(`Rafraîchissement ignoré : dernier rafraîchissement il y a seulement ${timeSinceLastRefresh}ms`);
      return;
    }
    
    console.log(`Rafraîchissement manuel des problèmes 72h : ${refreshedProblems.length} problèmes reçus`);
    
    // Mettre à jour notre état local immédiatement
    setLocalProblems(refreshedProblems);
    setLastRefreshTime(now);
  }, [lastRefreshTime]);
  
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
              {localProblems.length}
            </div>
          </div>
        </div>

        {/* Section des problèmes */}
        {isLoading.problems && localProblems.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-t-4 border-b-4 border-amber-500 rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-400">Chargement des problèmes...</span>
          </div>
        ) : localProblems && localProblems.length > 0 ? (
          <ProblemsList 
            problems={localProblems} 
            title="Tous les problèmes des dernières 72h"
            showRefreshButton={true}
            onRefresh={handleManualRefresh}
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