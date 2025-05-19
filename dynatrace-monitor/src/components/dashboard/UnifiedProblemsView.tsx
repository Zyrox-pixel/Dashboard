import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, RefreshCw, Filter, CalendarRange, Shield, BarChart, Calendar, FileDown } from 'lucide-react';
import ProblemsList from './ProblemsList';
import { Problem } from '../../api/types';
import { useApp } from '../../contexts/AppContext';
import { useDashboardCache } from '../../hooks/useDashboardCache';
import { exportProblemsToCSV, downloadCSV } from '../../utils/exportUtils';

interface UnifiedProblemsViewProps {
  /** Titre principal de la vue */
  title: string;
  /** Variante du dashboard (vfg, vfe ou all) */
  variant: 'vfg' | 'vfe' | 'all';
  /** Filtre de zone optionnel (pour les sous-zones de management) */
  zoneFilter?: string;
  /** Type de problème à afficher (active, recent, all) */
  problemType?: 'active' | 'recent' | 'all';
}

/**
 * Composant de vue unifiée des problèmes combinant problèmes actifs et récents (72h)
 * dans une interface à onglets moderne et interactive
 */
const UnifiedProblemsView: React.FC<UnifiedProblemsViewProps> = ({ title, variant, zoneFilter, problemType }) => {
  const navigate = useNavigate();
  
  // Utiliser le contexte normal pour les informations de base
  const appContext = useApp();
  
  // Utiliser notre système de cache intelligent pour les données
  const dashboardCache = useDashboardCache(variant === 'all' ? 'unified' : variant);
  const { 
    activeProblems: cachedActiveProblems, 
    recentProblems: cachedRecentProblems,
    isLoading: cacheIsLoading, 
    error: cacheError,
    lastRefreshTime: cacheLastRefreshTime,
    refreshData: refreshCachedData,
    initialLoadComplete
  } = dashboardCache;

  // Combiner les données du contexte et du cache
  const activeProblems = cachedActiveProblems.length > 0 
    ? cachedActiveProblems 
    : appContext.activeProblems;
    
  const problemsLast72h = cachedRecentProblems.length > 0
    ? cachedRecentProblems
    : appContext.problemsLast72h;
  
  // État de chargement combiné
  const isLoading = {
    ...appContext.isLoading,
    problems: cacheIsLoading
  };

  // État local pour l'onglet actif (actifs ou récents), initialisé par la prop
  const [activeTab, setActiveTab] = useState<'active' | 'recent'>(
    problemType === 'recent' ? 'recent' : 'active'
  );

  // Options prédéfinies pour la sélection de période
  const timeframeOptions = [
    { value: "-24h", label: "24 heures" },
    { value: "-48h", label: "48 heures" },
    { value: "-72h", label: "72 heures" }, // Option par défaut
    { value: "-7d", label: "7 jours" },
    { value: "-14d", label: "14 jours" },
    { value: "-30d", label: "30 jours" }
  ];

  // État pour le rafraîchissement manuel
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Problèmes à afficher selon l'onglet actif
  const problemsToDisplay = activeTab === 'active' ? activeProblems : problemsLast72h;

  // État local pour la période sélectionnée
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("-72h"); // 72h par défaut

  // Gérer le changement d'onglet
  const handleTabChange = (tab: 'active' | 'recent') => {
    if (tab === activeTab) return; // Ne rien faire si on clique sur l'onglet déjà actif
    
    setActiveTab(tab);
    
    // Ne pas déclencher de rafraîchissement automatique lors du changement d'onglet
    // pour maintenir un comportement cohérent entre les onglets
    console.log(`Changement vers onglet ${tab}`);
  };

  // Fonction pour obtenir le libellé de la période sélectionnée
  const getTimeframeLabel = (value: string) => {
    const option = timeframeOptions.find(opt => opt.value === value);
    return option ? option.label : "72 heures"; // Fallback à 72h si non trouvé
  };

  // Gestion du changement de période
  const handleTimeframeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeframe = e.target.value;
    setSelectedTimeframe(newTimeframe);
    
    // Pour l'onglet "récent", rafraîchir automatiquement les données avec la nouvelle période
    if (activeTab === 'recent') {
      try {
        setIsRefreshing(true);
        // Rafraîchir les données avec un léger délai pour permettre à l'UI de se mettre à jour
        setTimeout(async () => {
          try {
            // Utiliser notre système de cache intelligent pour le rafraîchissement
            // En passant true pour forcer le rafraîchissement
            await refreshCachedData(true);
          } catch (error) {
            console.error('Erreur lors du rafraîchissement:', error);
          } finally {
            // Désactiver l'indicateur de rafraîchissement après un court délai
            setTimeout(() => {
              setIsRefreshing(false);
            }, 500);
          }
        }, 100);
      } catch (error) {
        console.error('Erreur lors du changement de période:', error);
        setIsRefreshing(false);
      }
    }
  };

  // Fonction de rafraîchissement avec période spécifiée
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Utiliser le système de cache intelligente pour le rafraîchissement
      // Passer la période actuelle si on est dans l'onglet "récent"
      if (activeTab === 'recent') {
        console.log(`Rafraîchissement forcé avec période ${selectedTimeframe}`);
        await refreshCachedData(true, selectedTimeframe);
      } else {
        await refreshCachedData(true);
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500); // Délai minimum pour éviter des rafraîchissements trop rapides
    }
  };

  // Effet pour récupérer les préférences sauvegardées (exécuté une seule fois au montage)
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
  }, []); // Dépendance vide = exécution uniquement au montage
  
  // Effet séparé pour sauvegarder les préférences
  useEffect(() => {
    // Utiliser un debounce pour éviter les sauvegardes trop fréquentes
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

  // Retour au tableau de bord
  const handleBackClick = () => {
    // Sauvegarder les préférences avant la navigation
    sessionStorage.setItem('lastActiveTab', activeTab);
    sessionStorage.setItem('lastTimeframe', selectedTimeframe);
    sessionStorage.setItem('lastNavigation', Date.now().toString());

    if (variant === 'all') {
      // Pour la vue "tous les problèmes", retourner à la page d'accueil
      navigate('/');
    } else {
      // Pour les vues spécifiques, comportement normal
      navigate(`/${variant}`);
    }
  };

  // Classes CSS pour les onglets
  const getTabClasses = (tab: 'active' | 'recent') => {
    const isActive = activeTab === tab;

    return `px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
      isActive
        ? 'bg-slate-800 text-white border-t border-l border-r border-slate-700'
        : 'bg-slate-900 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 border-b border-slate-700'
    } flex items-center gap-2`;
  };

  // Fonction pour exporter les problèmes en CSV
  const handleExportCSV = () => {
    // Déterminer quels problèmes exporter en fonction de l'onglet actif
    const problemsToExport = activeTab === 'active' ? activeProblems : problemsLast72h;

    // Si aucun problème, ne rien faire
    if (!problemsToExport || problemsToExport.length === 0) {
      alert('Aucun problème à exporter.');
      return;
    }

    // Générer le CSV
    const { csv, filename } = exportProblemsToCSV(
      problemsToExport,
      variant,
      zoneFilter // Passer le filtre de zone si présent (undefined par défaut)
    );

    // Télécharger le fichier
    downloadCSV(csv, filename);
  };

  // Déterminer les couleurs d'accentuation en fonction de la variante
  const accentColor = variant === 'vfg' ? 'blue' : 'amber';

  // Constantes CSS pour l'accentuation des couleurs
  const cssVariant = {
    text: `text-${accentColor}-500`,
    bg: `bg-${accentColor}-500`,
    border: `border-${accentColor}-700`,
    bgLight: `bg-${accentColor}-500/10`,
    bgDark: `bg-${accentColor}-900/20`,
    hoverBg: `hover:bg-${accentColor}-700`,
    icon: activeTab === 'active' ? <AlertTriangle className="text-red-500" size={24} /> : <Clock className="text-amber-500" size={24} />
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
          disabled={isRefreshing || isLoading.problems}
          className={`flex items-center gap-2 px-4 py-2 rounded-md ${cssVariant.bg} text-white ${cssVariant.hoverBg}
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Rafraîchir</span>
        </button>
      </div>

      {/* Bannière principale avec statistiques */}
      <div className={`p-5 ${cssVariant.bgDark} border ${cssVariant.border} rounded-lg mb-6`}>
        <div className="flex flex-wrap md:flex-nowrap items-start gap-4">
          {cssVariant.icon}
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              Problèmes {activeTab === 'active' ? 'Actifs' : `des ${getTimeframeLabel(selectedTimeframe)}`}
            </h2>
            <p className="text-slate-300">
              {activeTab === 'active'
                ? "Suivi en temps réel des incidents et anomalies actuellement actifs"
                : `Historique consolidé de tous les incidents survenus durant les ${getTimeframeLabel(selectedTimeframe)}`}
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
              <span>Dernière actualisation: {cacheLastRefreshTime.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center justify-center h-10 px-4 rounded-lg bg-slate-800 font-bold mt-2 text-white">
              {problemsToDisplay?.length || 0} problème{(problemsToDisplay?.length || 0) !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

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
            {problemsLast72h?.length > 0 && (
              <span className="ml-2 bg-amber-900/60 text-amber-200 rounded-full px-2 py-0.5 text-xs">
                {problemsLast72h.length}
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
      {isLoading.problems && !initialLoadComplete ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-400">Chargement des problèmes...</span>
          </div>
        ) : (
          <ProblemsList
            problems={problemsToDisplay || []}
            title={activeTab === 'active'
              ? "Tous les problèmes actifs"
              : `Tous les problèmes des ${getTimeframeLabel(selectedTimeframe)}`}
            showRefreshButton={true}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
};

export default UnifiedProblemsView;
