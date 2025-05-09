import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Layout from '../components/layout/Layout';
import ProblemsList from '../components/dashboard/ProblemsList';
import { ChevronLeft, Clock, Calendar } from 'lucide-react';
import { Problem } from '../api/types';

/**
 * Page dédiée à l'affichage des problèmes des dernières 72 heures
 */
const RecentProblemsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { problemsLast72h, isLoading, refreshData } = useApp();

  // Options prédéfinies pour la sélection de période
  const timeframeOptions = [
    { value: "-24h", label: "24 heures" },
    { value: "-48h", label: "48 heures" },
    { value: "-72h", label: "72 heures" }, // Option par défaut
    { value: "-7d", label: "7 jours" },
    { value: "-14d", label: "14 jours" },
    { value: "-30d", label: "30 jours" }
  ];

  // État local pour empêcher les actualisations trop fréquentes
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [localProblems, setLocalProblems] = useState<Problem[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("-72h"); // 72h par défaut

  // Récupérer le paramètre de type de dashboard depuis l'URL
  const dashboardType = new URLSearchParams(location.search).get('dashboard') || 'vfg';
  
  // Synchroniser les problèmes locaux avec les problèmes globaux
  useEffect(() => {
    if (problemsLast72h && problemsLast72h.length > 0) {
      console.log(`Mise à jour des problèmes 72h locaux sur la page avec ${problemsLast72h.length} problèmes`);
      setLocalProblems(problemsLast72h);
    }
  }, [problemsLast72h]);
  
  // Forcer un rafraîchissement des données lorsque la période change ou au chargement
  useEffect(() => {
    // Utiliser un flag pour éviter les boucles infinies
    const loadProblems = async () => {
      console.log(`Loading recent problems with dashboard type: ${dashboardType} and timeframe: ${selectedTimeframe}`);
      try {
        // Passer la période sélectionnée pour le chargement des problèmes récents
        // Spécifiez false comme second paramètre pour indiquer que ce n'est pas un rafraîchissement de problèmes actifs
        await refreshData(dashboardType as 'vfg' | 'vfe', false, selectedTimeframe);
        setLastRefreshTime(Date.now());
      } catch (error) {
        console.error(`Erreur lors du chargement des problèmes pour la période ${selectedTimeframe}:`, error);
      }
    };

    loadProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardType, selectedTimeframe]);
  
  // Gestionnaire pour les rafraîchissements manuels
  const handleManualRefresh = useCallback(async () => {
    // Mettre à jour la dernière heure de rafraîchissement
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;

    // Limiter les rafraîchissements à un toutes les 5 secondes
    if (timeSinceLastRefresh < 5000) {
      console.log(`Rafraîchissement ignoré : dernier rafraîchissement il y a seulement ${timeSinceLastRefresh}ms`);
      return;
    }

    console.log(`Rafraîchissement manuel des problèmes pour la période ${selectedTimeframe}`);

    try {
      // Rafraîchir les données avec la période sélectionnée
      await refreshData(dashboardType as 'vfg' | 'vfe', false, selectedTimeframe);
      setLastRefreshTime(now);
    } catch (error) {
      console.error(`Erreur lors du rafraîchissement manuel des problèmes pour la période ${selectedTimeframe}:`, error);
    }
  }, [lastRefreshTime, selectedTimeframe, dashboardType, refreshData]);
  
  // Navigation retour vers le bon tableau de bord
  const handleBackClick = () => {
    navigate(`/dashboard/${dashboardType}`);
  };

  // Fonction pour obtenir le libellé de la période sélectionnée
  const getTimeframeLabel = useCallback((value: string) => {
    const option = timeframeOptions.find(opt => opt.value === value);
    return option ? option.label : "72 heures"; // Fallback à 72h si non trouvé
  }, [timeframeOptions]);

  // Gestion du changement de période
  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTimeframe(e.target.value);
  };

  // Déterminer le titre en fonction du type de dashboard et de la période
  const timeframeLabel = getTimeframeLabel(selectedTimeframe);
  const title = dashboardType === 'vfg'
    ? `Tous les problèmes (${timeframeLabel}) - Vital for Group`
    : `Tous les problèmes (${timeframeLabel}) - Vital for Entreprise`;
  
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
                Tous les problèmes des {timeframeLabel}
              </h2>
              <p className="text-slate-300">
                Liste complète de tous les incidents survenus au cours des {timeframeLabel}
              </p>

              {/* Sélecteur de période */}
              <div className="mt-3 flex items-center">
                <Calendar className="text-amber-500 mr-2" size={16} />
                <label htmlFor="timeframeSelector" className="text-white mr-2">Période:</label>
                <select
                  id="timeframeSelector"
                  className="bg-slate-800 text-white py-1 px-2 rounded border border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={selectedTimeframe}
                  onChange={handleTimeframeChange}
                >
                  {timeframeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
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
            title={`Tous les problèmes des ${timeframeLabel}`}
            showRefreshButton={true}
            onRefresh={handleManualRefresh}
          />
        ) : (
          <div className="p-6 rounded-lg bg-slate-800 border border-slate-700 text-center">
            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun problème sur les {timeframeLabel}</h3>
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