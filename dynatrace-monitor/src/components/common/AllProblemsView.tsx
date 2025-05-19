import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Clock, RefreshCw, CheckCircle2, Calendar, FileDown } from 'lucide-react';
import ProblemsList from '../dashboard/ProblemsList';
import { Problem } from '../../api/types';
import axios from 'axios';
import { API_BASE_URL } from '../../api/endpoints';
import { useDashboardCache } from '../../hooks/useDashboardCache';
import { exportProblemsToCSV, downloadCSV } from '../../utils/exportUtils';


interface AllProblemsViewProps {
  /** Type de problème à afficher par défaut (active, recent, all) */
  problemType?: 'active' | 'recent' | 'all';
}

/**
 * Composant pour afficher tous les problèmes (VFG et VFE) combinés
 * Utilise une approche directe avec l'API backend pour éviter les problèmes de state
 */
export const AllProblemsView: React.FC<AllProblemsViewProps> = ({ problemType = 'active' }) => {
  const navigate = useNavigate();
  
  // Utiliser notre système de cache intelligent
  const dashboardCache = useDashboardCache('unified');
  const { 
    activeProblems, 
    recentProblems, 
    isLoading, 
    error, 
    lastRefreshTime,
    refreshData, 
    initialLoadComplete 
  } = dashboardCache;
  
  // États locaux pour l'interface
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'active' | 'recent'>(
    problemType === 'recent' ? 'recent' : 'active'
  );
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("-72h");
  
  // Problèmes à afficher selon l'onglet actif
  const problemsToDisplay = activeTab === 'active' ? activeProblems : recentProblems;

  // Options prédéfinies pour la sélection de période
  const timeframeOptions = [
    { value: "-24h", label: "24 heures" },
    { value: "-48h", label: "48 heures" },
    { value: "-72h", label: "72 heures" }, // Option par défaut
    { value: "-7d", label: "7 jours" },
    { value: "-14d", label: "14 jours" },
    { value: "-30d", label: "30 jours" }
  ];

  // Fonction utilitaire pour obtenir le libellé de la période
  const getTimeframeLabel = (value: string) => {
    const option = timeframeOptions.find(opt => opt.value === value);
    return option ? option.label : "72 heures";
  };

  // Retour au tableau de bord
  const handleBackClick = () => {
    sessionStorage.setItem('lastActiveTab', activeTab);
    sessionStorage.setItem('lastTimeframe', selectedTimeframe);
    sessionStorage.setItem('lastNavigation', Date.now().toString());
    navigate('/');
  };

  // Gestion du changement de période
  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeframe = e.target.value;
    setSelectedTimeframe(newTimeframe);
    if (activeTab === 'recent') {
      handleRefresh();
    }
  };

  // Gérer le changement d'onglet
  const handleTabChange = (tab: 'active' | 'recent') => {
    setActiveTab(tab);
  };

  // Fonction pour le rafraîchissement manuel
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshData(true);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  // Fonction pour exporter les problèmes en CSV
  const handleExportCSV = () => {
    const problemsToExport = activeTab === 'active' ? activeProblems : recentProblems;
    if (!problemsToExport || problemsToExport.length === 0) {
      alert('Aucun problème à exporter.');
      return;
    }
    const { csv, filename } = exportProblemsToCSV(
      problemsToExport,
      'all'
    );
    downloadCSV(csv, filename);
  };

  // Effet pour récupérer les préférences (exécuté une seule fois)
  useEffect(() => {
    // Récupérer les préférences sauvegardées (onglet actif et période)
    const lastTab = sessionStorage.getItem('lastActiveTab') as 'active' | 'recent' | null;
    const lastTimeframe = sessionStorage.getItem('lastTimeframe');

    if (lastTab) {
      setActiveTab(lastTab);
    }

    if (lastTimeframe) {
      setSelectedTimeframe(lastTimeframe);
    }
  }, []); // Exécuté uniquement au montage
  
  // Effet pour sauvegarder les préférences (sans créer de boucle)
  useEffect(() => {
    // Sauvegarder les préférences
    const savePreferences = () => {
      sessionStorage.setItem('lastActiveTab', activeTab);
      sessionStorage.setItem('lastTimeframe', selectedTimeframe);
    };
    
    // Utiliser un timer pour éviter les sauvegardes trop fréquentes
    const timerId = setTimeout(savePreferences, 300);
    
    return () => {
      clearTimeout(timerId);
    };
  }, [activeTab, selectedTimeframe]);

  // Classes CSS pour les onglets
  const getTabClasses = (tab: 'active' | 'recent') => {
    const isActive = activeTab === tab;
    return `px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
      isActive 
        ? 'bg-slate-800 text-white border-t border-l border-r border-slate-700' 
        : 'bg-slate-900 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 border-b border-slate-700'
    } flex items-center gap-2`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et bouton retour */}
      <div className="flex items-center justify-between">
        <button 
          onClick={handleBackClick}
          className="mb-2 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <Shield size={18} />
          <span>Retour au tableau de bord</span>
        </button>
        
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Rafraîchir</span>
        </button>
      </div>
      
      {/* Bannière principale avec statistiques */}
      <div className="p-5 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-indigo-800/30 rounded-lg mb-6">
        <div className="flex flex-wrap md:flex-nowrap items-start gap-4">
          <AlertTriangle size={24} className="text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              Tous les Problèmes {activeTab === 'active' ? 'Actifs' : `des ${getTimeframeLabel(selectedTimeframe)}`} (VFG + VFE)
            </h2>
            <p className="text-slate-300">
              {activeTab === 'active'
                ? "Suivi en temps réel de tous les incidents et anomalies combinés des environnements Vital for Group et Vital for Enterprise"
                : `Historique consolidé de tous les incidents survenus durant les ${getTimeframeLabel(selectedTimeframe)} sur tous les environnements critiques`}
            </p>

            {/* Sélecteur de période - uniquement visible dans l'onglet "récents" */}
            {activeTab === 'recent' && (
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
            )}
          </div>
          <div className="ml-auto flex flex-col items-end">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock size={14} />
              <span>Dernière actualisation: {lastRefreshTime?.toLocaleTimeString() || 'Jamais'}</span>
            </div>
            <div className="flex items-center justify-center h-10 px-4 rounded-lg bg-slate-800 font-bold mt-2 text-white">
              {problemsToDisplay?.length || 0} problème{(problemsToDisplay?.length || 0) !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
      
      {/* Message d'erreur */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400" />
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}
      
      {/* Navigation par onglets */}
      <div className="border-b border-slate-700 mb-4">
        <div className="flex space-x-1">
          <button
            onClick={() => handleTabChange('active')}
            className={getTabClasses('active')}
          >
            <AlertTriangle size={16} className="text-red-500" />
            <span>Problèmes actifs</span>
            {activeProblems?.length > 0 && (
              <span className="ml-2 bg-red-900/60 text-red-200 rounded-full px-2 py-0.5 text-xs">
                {activeProblems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('recent')}
            className={getTabClasses('recent')}
          >
            <Clock size={16} className="text-amber-500" />
            <span>Récents ({getTimeframeLabel(selectedTimeframe)})</span>
            {recentProblems?.length > 0 && (
              <span className="ml-2 bg-amber-900/60 text-amber-200 rounded-full px-2 py-0.5 text-xs">
                {recentProblems.length}
              </span>
            )}
          </button>

          {/* Bouton d'export CSV */}
          <button
            onClick={handleExportCSV}
            className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-200
              bg-slate-900 text-slate-400 hover:bg-slate-800/50 hover:text-green-300 border-b border-slate-700
              flex items-center gap-2 ml-auto`}
            title="Télécharger les problèmes au format CSV"
          >
            <FileDown size={16} className="text-green-500" />
            <span>Télécharger CSV</span>
          </button>
        </div>
      </div>
      
      {/* Contenu de l'onglet actif */}
      <div className="mt-6">
      {isLoading && !initialLoadComplete ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-400">Chargement des problèmes...</span>
          </div>
        ) : problemsToDisplay.length > 0 ? (
          <ProblemsList
            problems={problemsToDisplay || []}
            title={activeTab === 'active'
              ? "Tous les problèmes actifs (VFG + VFE)"
              : `Tous les problèmes des ${getTimeframeLabel(selectedTimeframe)} (VFG + VFE)`}
            showRefreshButton={true}
            onRefresh={handleRefresh}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <CheckCircle2 size={48} className="text-green-500 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Aucun problème à afficher</h3>
            <p className="text-slate-400 max-w-md">
              {activeTab === 'active' 
                ? "Tous les systèmes fonctionnent correctement. Aucun problème actif n'a été détecté."
                : "Aucun problème n'a été enregistré au cours des 72 dernières heures."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Default export for backward compatibility
export default AllProblemsView;
