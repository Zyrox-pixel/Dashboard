import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, RefreshCw, Filter, CalendarRange, Shield, BarChart, Calendar, FileDown } from 'lucide-react';
import ProblemsList from './ProblemsList';
import { Problem, DashboardVariant } from '../../api/types';
import { useApp } from '../../contexts/AppContext';
import { exportProblemsToCSV, downloadCSV } from '../../utils/exportUtils';

interface UnifiedProblemsViewProps {
  /** Titre principal de la vue */
  title: string;
  /** Variante du dashboard (vfg, vfe, detection, encryption ou all) */
  variant: DashboardVariant;
  /** Filtre de zone optionnel (pour les sous-zones de management) */
  zoneFilter?: string;
}

// Clé de session storage pour mémoriser les données
const PROBLEMS_CACHE_KEY = 'problemsViewData';
const PROBLEMS_CONTEXT_CACHE_KEY = 'problemsData'; // Clé utilisée par ProblemsContext
const CACHE_LIFETIME = 10 * 60 * 1000; // 10 minutes en millisecondes

/**
 * Composant de vue unifiée des problèmes combinant problèmes actifs et récents (72h)
 * dans une interface à onglets moderne et interactive
 */
const UnifiedProblemsView: React.FC<UnifiedProblemsViewProps> = ({ title, variant, zoneFilter }) => {
  const navigate = useNavigate();
  const { activeProblems, problemsLast72h, isLoading, refreshData } = useApp();

  // Référence pour éviter de déclencher un rechargement non nécessaire
  const initialLoadCompletedRef = useRef<boolean>(false);
  const dataHasBeenLoadedRef = useRef<boolean>(false);

  // État local pour l'onglet actif (actifs ou récents)
  const [activeTab, setActiveTab] = useState<'active' | 'recent'>('active');

  // Options prédéfinies pour la sélection de période
  const timeframeOptions = [
    { value: "-24h", label: "24 heures" },
    { value: "-48h", label: "48 heures" },
    { value: "-72h", label: "72 heures" }, // Option par défaut
    { value: "-7d", label: "7 jours" },
    { value: "-14d", label: "14 jours" },
    { value: "-30d", label: "30 jours" }
  ];

  // État local pour la période sélectionnée
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("-72h"); // 72h par défaut

  // Marqueur pour le rafraîchissement manuel
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  // États pour stocker les problèmes pour chaque onglet - copie locale pour réduire les rechargements
  const [cachedActiveProblems, setCachedActiveProblems] = useState<Problem[]>([]);
  const [cachedProblemsLast72h, setCachedProblemsLast72h] = useState<Problem[]>([]);

  // Problèmes à afficher selon l'onglet actif
  const problemsToDisplay = activeTab === 'active' ? cachedActiveProblems : cachedProblemsLast72h;

  // Méthode pour sauvegarder les données dans le SessionStorage
  const saveDataToSessionStorage = (activeData: Problem[], recentData: Problem[]) => {
    if (!activeData || !recentData) return;

    try {
      const dataToCache = {
        active: activeData,
        recent: recentData,
        variant: variant,
        timeframe: selectedTimeframe,
        timestamp: Date.now()
      };

      sessionStorage.setItem(PROBLEMS_CACHE_KEY, JSON.stringify(dataToCache));
      console.log(`Données des problèmes (${variant}) mises en cache dans sessionStorage`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cache:', error);
    }
  };

  // Méthode pour charger les données depuis le SessionStorage
  const loadDataFromSessionStorage = (): boolean => {
    try {
      // Essayer d'abord de charger depuis notre propre cache
      const cachedData = sessionStorage.getItem(PROBLEMS_CACHE_KEY);

      // Si les données sont trouvées, vérifier leur validité
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);

        // Vérifier si les données sont valides, concernent la même variante et ne sont pas trop anciennes
        if (
          parsedData &&
          parsedData.variant === variant &&
          Date.now() - parsedData.timestamp < CACHE_LIFETIME
        ) {
          console.log(`Utilisation des données en cache sessionStorage pour ${variant} (${new Date(parsedData.timestamp).toLocaleTimeString()})`);

          // Restaurer les données et la période
          setCachedActiveProblems(parsedData.active || []);
          setCachedProblemsLast72h(parsedData.recent || []);
          if (parsedData.timeframe) {
            setSelectedTimeframe(parsedData.timeframe);
          }

          setLastRefreshTime(new Date(parsedData.timestamp));
          return true;
        }
      }

      // Si aucune donnée n'est trouvée dans notre cache ou si elles ne sont pas valides,
      // essayer de charger depuis le cache du ProblemsContext
      const contextCache = localStorage.getItem(PROBLEMS_CONTEXT_CACHE_KEY);
      if (contextCache) {
        try {
          const parsedContextData = JSON.parse(contextCache);

          // Vérifier si les données du contexte sont récentes
          if (parsedContextData && parsedContextData.timestamp &&
              Date.now() - parsedContextData.timestamp < CACHE_LIFETIME) {

            console.log(`Utilisation des données du cache ProblemsContext pour ${variant}`);

            // Déterminer les données appropriées selon le variant
            let activeData = [];
            let recentData = [];

            if (variant === 'all') {
              // Pour le variant 'all', prendre toutes les données
              activeData = [
                ...(parsedContextData.vfgProblems || []),
                ...(parsedContextData.vfeProblems || [])
              ];
              recentData = [
                ...(parsedContextData.vfgProblems72h || []),
                ...(parsedContextData.vfeProblems72h || [])
              ];
            } else if (variant === 'vfg') {
              activeData = parsedContextData.vfgProblems || [];
              recentData = parsedContextData.vfgProblems72h || [];
            } else if (variant === 'vfe') {
              activeData = parsedContextData.vfeProblems || [];
              recentData = parsedContextData.vfeProblems72h || [];
            }

            // Dédupliquer les données si nécessaire (pour variant 'all')
            if (variant === 'all') {
              const uniqueActiveIds = new Set();
              const uniqueRecentIds = new Set();

              activeData = activeData.filter((problem: Problem) => {
                if (!uniqueActiveIds.has(problem.id)) {
                  uniqueActiveIds.add(problem.id);
                  return true;
                }
                return false;
              });

              recentData = recentData.filter((problem: Problem) => {
                if (!uniqueRecentIds.has(problem.id)) {
                  uniqueRecentIds.add(problem.id);
                  return true;
                }
                return false;
              });
            }

            // Mettre à jour nos états avec les données du contexte
            setCachedActiveProblems(activeData);
            setCachedProblemsLast72h(recentData);
            setLastRefreshTime(new Date(parsedContextData.timestamp));

            // Sauvegarder ces données dans notre propre cache pour une utilisation future
            saveDataToSessionStorage(activeData, recentData);

            return true;
          }
        } catch (e) {
          console.error('Erreur lors du parsing du cache ProblemsContext:', e);
        }
      }

      return false;
    } catch (error) {
      console.error('Erreur lors du chargement du cache:', error);
      return false;
    }
  };

  // Gérer le changement d'onglet
  const handleTabChange = (tab: 'active' | 'recent') => {
    setActiveTab(tab);
  };

  // Fonction pour obtenir le libellé de la période sélectionnée
  const getTimeframeLabel = (value: string) => {
    const option = timeframeOptions.find(opt => opt.value === value);
    return option ? option.label : "72 heures"; // Fallback à 72h si non trouvé
  };

  // Gestion du changement de période
  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeframe = e.target.value;
    setSelectedTimeframe(newTimeframe);

    // Déclencher un rafraîchissement uniquement si l'onglet actif est "recent"
    if (activeTab === 'recent') {
      refreshDataWithTimeframe(newTimeframe);
    }
  };

  // Fonction de rafraîchissement avec période spécifiée
  const refreshDataWithTimeframe = async (timeframe: string) => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Utilise le variant spécifié (vfg ou vfe), ou undefined pour 'all' (comportement par défaut)
      const dashboardType = variant === 'all' ? undefined : variant;
      // Passer la période sélectionnée comme troisième paramètre
      await refreshData(dashboardType, activeTab === 'active', timeframe);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500); // Délai minimum pour éviter des rafraîchissements trop rapides
    }
  };

  // Gérer le rafraîchissement manuel des données
  const handleRefresh = () => {
    refreshDataWithTimeframe(selectedTimeframe);
  };

  // Effet pour charger les données depuis le cache ou les récupérer au premier chargement
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

    // Si les données ont déjà été chargées, ne pas recharger
    if (dataHasBeenLoadedRef.current) {
      return;
    }

    // Vérifier si on navigue depuis une autre page avec un cache récent
    const lastNavTime = sessionStorage.getItem('lastNavigation');
    const isRecentNavigation = lastNavTime && (Date.now() - parseInt(lastNavTime)) < 5000; // 5 secondes

    if (isRecentNavigation) {
      console.log('Navigation récente détectée, utilisation prioritaire du cache');
    }

    // Essayer de charger les données depuis le cache
    const cacheLoaded = loadDataFromSessionStorage();

    // Si le cache n'est pas disponible ou expiré et qu'on n'est pas dans une navigation récente, charger les données
    if (!cacheLoaded && !isRecentNavigation) {
      console.log(`Pas de cache valide pour ${variant}, chargement des données`);
      handleRefresh();
    } else {
      // Marquer les données comme chargées même si depuis le cache
      dataHasBeenLoadedRef.current = true;

      // Si navigation récente, retirer le marqueur
      if (isRecentNavigation) {
        sessionStorage.removeItem('lastNavigation');
      }
    }
  }, [variant]); // Dépendance seulement au variant

  // Mise à jour des données de problèmes actifs lorsqu'elles changent dans le contexte
  useEffect(() => {
    if (activeProblems && activeProblems.length > 0) {
      setCachedActiveProblems(activeProblems);

      // Mise à jour du cache seulement si on a des données complètes
      if (problemsLast72h && problemsLast72h.length > 0) {
        saveDataToSessionStorage(activeProblems, problemsLast72h);
      }

      // Marquer que les données ont été chargées
      if (!dataHasBeenLoadedRef.current) {
        dataHasBeenLoadedRef.current = true;
      }
    }
  }, [activeProblems]);

  // Mise à jour des données de problèmes récents lorsqu'elles changent dans le contexte
  useEffect(() => {
    if (problemsLast72h && problemsLast72h.length > 0) {
      setCachedProblemsLast72h(problemsLast72h);

      // Mise à jour du cache seulement si on a des données complètes
      if (activeProblems && activeProblems.length > 0) {
        saveDataToSessionStorage(activeProblems, problemsLast72h);
      }

      // Marquer que les données ont été chargées
      if (!dataHasBeenLoadedRef.current) {
        dataHasBeenLoadedRef.current = true;
      }
    }
  }, [problemsLast72h]);

  // Retour au tableau de bord
  const handleBackClick = () => {
    // Forcer la sauvegarde des données avant la navigation
    if (cachedActiveProblems && cachedActiveProblems.length > 0 &&
        cachedProblemsLast72h && cachedProblemsLast72h.length > 0) {
      // Sauvegarder d'abord les données dans notre cache
      saveDataToSessionStorage(cachedActiveProblems, cachedProblemsLast72h);

      // Signaler globalement la navigation entre les pages avec cache valide
      sessionStorage.setItem('navigationFromCache', 'true');
      sessionStorage.setItem('lastActiveTab', activeTab);
      sessionStorage.setItem('lastTimeframe', selectedTimeframe);

      // Stocker l'horodatage de navigation pour vérifier la fraîcheur des données
      sessionStorage.setItem('lastNavigation', Date.now().toString());

      console.log('Données sauvegardées avant navigation');
    } else if (dataHasBeenLoadedRef.current) {
      // Méthode de secours si les données ne sont pas complètes
      sessionStorage.setItem('navigationFromCache', 'true');
    }

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
    const problemsToExport = activeTab === 'active' ? cachedActiveProblems : cachedProblemsLast72h;

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

  // Déterminer si on doit afficher le loading
  const showLoading = isLoading.problems && !dataHasBeenLoadedRef.current;

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
              <span>Dernière actualisation: {lastRefreshTime.toLocaleTimeString()}</span>
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
            {cachedActiveProblems?.length > 0 && (
              <span className="ml-2 bg-red-900/60 text-red-200 rounded-full px-2 py-0.5 text-xs">
                {cachedActiveProblems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('recent')}
            className={getTabClasses('recent')}
          >
            <Clock size={16} className="text-amber-500" />
            <span>Récents ({getTimeframeLabel(selectedTimeframe)})</span>
            {cachedProblemsLast72h?.length > 0 && (
              <span className="ml-2 bg-amber-900/60 text-amber-200 rounded-full px-2 py-0.5 text-xs">
                {cachedProblemsLast72h.length}
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
        {showLoading ? (
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