import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, RefreshCw, Filter, CalendarRange, Shield, BarChart, Calendar, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProblemsList from './ProblemsList';
import TabNavigation, { TabItem } from '../common/TabNavigation';
import { Problem } from '../../api/types';
import { useApp } from '../../contexts/AppContext';
import { useDashboardCache } from '../../hooks/useDashboardCache';
import { exportProblemsToCSV, downloadCSV } from '../../utils/exportUtils';
import { useTheme } from '../../contexts/ThemeContext';

interface UnifiedProblemsViewProps {
  /** Titre principal de la vue */
  title: string;
  /** Variante du dashboard (vfg, vfe, detection, security ou all) */
  variant: 'vfg' | 'vfe' | 'detection' | 'security' | 'fce-security' | 'network-filtering' | 'identity' | 'vfp' | 'vfa' | 'all';
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
  const { isDarkTheme } = useTheme();
  
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
  const handleTabChange = (tabId: string) => {
    const tab = tabId as 'active' | 'recent';
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
    
    // Sauvegarder la nouvelle période sans déclencher de rafraîchissement automatique
    sessionStorage.setItem('lastTimeframe', newTimeframe);
    
    // Ne plus rafraîchir automatiquement - laisser l'utilisateur décider
    // Les données seront rafraîchies la prochaine fois qu'il clique sur le bouton rafraîchir
    console.log(`Période changée vers ${newTimeframe}, pas de rafraîchissement automatique`);
    
    // Pour l'onglet "récent", ne rafraîchir que si l'utilisateur le demande explicitement
    // (Optimisation: éviter les requêtes inutiles lors des changements de période)
    if (false) { // Désactivé pour optimisation
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
        // Check how many parameters the refreshCachedData function accepts
        if (refreshCachedData.length >= 3) {
          // @ts-ignore - We're handling this dynamically
          await refreshCachedData(true, selectedTimeframe, true);
        } else {
          await refreshCachedData(true, selectedTimeframe);
        }
      } else {
        // Check how many parameters the refreshCachedData function accepts
        if (refreshCachedData.length >= 3) {
          // @ts-ignore - We're handling this dynamically
          await refreshCachedData(true, undefined, true);
        } else {
          await refreshCachedData(true);
        }
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 3000); // Délai minimum pour éviter des rafraîchissements trop rapides
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
  
  // Préparer les onglets pour le nouveau composant TabNavigation
  const tabs: TabItem[] = [
    {
      id: 'active',
      label: 'Problèmes actifs',
      icon: <AlertTriangle className="text-red-500" />,
      badge: activeProblems?.length || 0,
      badgeColor: isDarkTheme ? 'bg-red-900/60 text-red-200' : 'bg-red-100 text-red-700'
    },
    {
      id: 'recent',
      label: `Récents (${getTimeframeLabel(selectedTimeframe)})`,
      icon: <Clock className="text-amber-500" />,
      badge: problemsLast72h?.length || 0,
      badgeColor: isDarkTheme ? 'bg-amber-900/60 text-amber-200' : 'bg-amber-100 text-amber-700'
    }
  ];

  // Déterminer les couleurs d'accentuation en fonction de la variante
  let accentColor = 'blue';
  
  switch(variant) {
    case 'vfg':
      accentColor = 'blue';
      break;
    case 'vfe':
      accentColor = 'amber';
      break;
    case 'detection':
      accentColor = 'emerald';
      break;
    case 'security':
      accentColor = 'orange';
      break;
    case 'fce-security':
      accentColor = 'purple';
      break;
    case 'network-filtering':
      accentColor = 'cyan';
      break;
    case 'identity':
      accentColor = 'pink';
      break;
    case 'vfp':
      accentColor = 'green';
      break;
    case 'vfa':
      accentColor = 'purple';
      break;
    default:
      accentColor = 'blue';
  }

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

      {/* Bannière principale avec statistiques et animations */}
      <motion.div 
        className={`relative p-6 rounded-xl mb-6 overflow-hidden backdrop-blur-sm ${
          isDarkTheme 
            ? 'bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 border border-slate-700/50' 
            : 'bg-gradient-to-br from-white/90 via-slate-50/80 to-white/90 border border-slate-200/70'
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Effet de fond animé */}
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            background: [
              `radial-gradient(circle at 0% 0%, ${cssVariant.bg} 0%, transparent 50%)`,
              `radial-gradient(circle at 100% 100%, ${cssVariant.bg} 0%, transparent 50%)`,
              `radial-gradient(circle at 0% 0%, ${cssVariant.bg} 0%, transparent 50%)`
            ]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        
        <div className="relative flex flex-wrap md:flex-nowrap items-start gap-4">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            {cssVariant.icon}
          </motion.div>
          
          <div className="flex-1">
            <motion.h2 
              className="text-xl font-semibold text-white mb-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Problèmes {activeTab === 'active' ? 'Actifs' : `des ${getTimeframeLabel(selectedTimeframe)}`}
            </motion.h2>
            <motion.p 
              className={`${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {activeTab === 'active'
                ? "Suivi en temps réel des incidents et anomalies actuellement actifs"
                : `Historique consolidé de tous les incidents survenus durant les ${getTimeframeLabel(selectedTimeframe)}`}
            </motion.p>

            {/* Sélecteur de période avec animation */}
            <AnimatePresence>
              {activeTab === 'recent' && (
                <motion.div 
                  className="mt-4 flex items-center gap-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Calendar className="text-amber-500" size={16} />
                  <label htmlFor="timeframeSelector" className={`${isDarkTheme ? 'text-white' : 'text-slate-700'} font-medium`}>
                    Période:
                  </label>
                  <motion.select
                    id="timeframeSelector"
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      isDarkTheme 
                        ? 'bg-gradient-to-r from-amber-900/50 to-amber-800/50 text-amber-200 border border-amber-700/50 hover:from-amber-800/60 hover:to-amber-700/60' 
                        : 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border border-amber-300/50 hover:from-amber-200 hover:to-amber-100'
                    } focus:outline-none focus:ring-2 focus:ring-amber-500/50`}
                    value={selectedTimeframe}
                    onChange={handleTimeframeChange}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {timeframeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </motion.select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <motion.div 
            className="ml-auto flex flex-col items-end gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className={`flex items-center gap-2 text-sm ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
              <Clock size={14} />
              <span>Dernière actualisation: {cacheLastRefreshTime.toLocaleTimeString()}</span>
            </div>
            <motion.div 
              className={`flex items-center justify-center min-w-[120px] px-6 py-3 rounded-xl font-bold text-lg backdrop-blur-sm ${
                isDarkTheme 
                  ? 'bg-gradient-to-r from-indigo-900/70 to-purple-900/70 text-white border border-indigo-700/50' 
                  : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border border-indigo-300/50'
              }`}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.span
                key={problemsToDisplay?.length || 0}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {problemsToDisplay?.length || 0}
              </motion.span>
              <span className="ml-1">
                problème{(problemsToDisplay?.length || 0) !== 1 ? 's' : ''}
              </span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Navigation par onglets avec le nouveau composant */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="gradient"
        size="md"
        className="mb-6"
        rightContent={
          <motion.button
            onClick={handleExportCSV}
            className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
              ${isDarkTheme 
                ? 'bg-gradient-to-r from-green-900/50 to-green-800/50 text-green-300 hover:from-green-800/60 hover:to-green-700/60 border border-green-700/30' 
                : 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 hover:from-green-200 hover:to-green-100 border border-green-300/50'}
              flex items-center gap-2 backdrop-blur-sm shadow-sm`}
            title="Télécharger les problèmes au format CSV"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FileDown size={16} />
            <span>Export CSV</span>
          </motion.button>
        }
      />

      {/* Contenu de l'onglet actif avec animations */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="mt-6"
        >
          {isLoading.problems && !initialLoadComplete ? (
            <motion.div 
              className="flex items-center justify-center h-64"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-16 h-16 border-4 border-t-indigo-500 border-r-purple-500 border-b-pink-500 border-l-blue-500 rounded-full" />
                <motion.div
                  className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-300 rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
              <motion.span 
                className={`ml-4 text-lg ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Chargement des problèmes...
              </motion.span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <ProblemsList
                problems={problemsToDisplay || []}
                title={activeTab === 'active'
                  ? "Tous les problèmes actifs"
                  : `Tous les problèmes des ${getTimeframeLabel(selectedTimeframe)}`}
                showRefreshButton={true}
                onRefresh={handleRefresh}
              />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default UnifiedProblemsView;
