import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import ProblemsList from './ProblemsList';
import ManagementZoneList from './ManagementZoneList';
import ModernManagementZoneList from './ModernManagementZoneList';
import ZoneDetails from './ZoneDetails';
import { AppContextType } from '../../contexts/AppContext';
import { Shield, Loader, AlertTriangle, RefreshCw, Clock, BarChart, ChevronLeft, Check, Server } from 'lucide-react';


interface DashboardBaseProps {
  title: string;
  variant: 'vfg' | 'vfe';
  optimized?: boolean;
  context: AppContextType;
}

/**
 * Composant de base réutilisable pour les tableaux de bord (standard et optimisé)
 * Permet d'éviter la duplication entre les 4 composants de dashboard
 */
const DashboardBase: React.FC<DashboardBaseProps> = ({ 
  title, 
  variant, 
  optimized = false,
  context
}) => {
  const navigate = useNavigate();
  const { 
    activeProblems,
    problemsLast72h, // Nouvel état pour les problèmes des 72 dernières heures
    vitalForGroupMZs, 
    vitalForEntrepriseMZs,
    selectedZone, 
    setSelectedZone,
    activeTab,
    setActiveTab,
    processGroups,
    hosts,
    services,
    isLoading,
    error,
    backendConnected,
    performanceMetrics,
    refreshData
  } = context;
  
  // État pour le nouvel onglet de problèmes (actifs ou 72h)
  const [problemTab, setProblemTab] = useState('active'); // 'active' ou 'recent'
  
  // État pour suivre la progression du chargement
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Effet pour simuler la progression du chargement
  useEffect(() => {
    // Seulement si nous sommes en chargement et que la progression n'est pas à 100%
    if (isLoading.zoneDetails && selectedZone && loadingProgress < 98) {
      const timer = setTimeout(() => {
        // Incrémenter la progression
        let increment = 1;
        
        // Progression plus rapide au début
        if (loadingProgress < 30) {
          increment = 2;
        } 
        // Ralentissement au milieu (simulation de traitement)
        else if (loadingProgress < 60) {
          increment = 0.8;
        } 
        // Très lent autour de 60-80% (simuler un travail intensif)
        else if (loadingProgress < 80) {
          increment = 0.5;
        } 
        // Accélération finale
        else {
          increment = 1;
        }
        
        setLoadingProgress(prev => Math.min(prev + increment, 98));
      }, 50); // Ajustez ce délai pour contrôler la vitesse globale
      
      return () => clearTimeout(timer);
    } else if (!isLoading.zoneDetails) {
      // Réinitialiser la progression quand le chargement est terminé
      setLoadingProgress(0);
    }
  }, [isLoading.zoneDetails, selectedZone, loadingProgress]);
  
  // Déterminer les zones à afficher selon la variante
  const zones = variant === 'vfg' ? vitalForGroupMZs : vitalForEntrepriseMZs;
  
  // Déterminer les classes CSS selon la variante (pas de template strings dynamiques)
  const cssClasses = {
    accent: variant === 'vfg' ? 'text-blue-500' : 'text-amber-500',
    accentBg: variant === 'vfg' ? 'bg-blue-500' : 'bg-amber-500',
    text: variant === 'vfg' ? 'text-blue-600' : 'text-amber-600',
    darkText: variant === 'vfg' ? 'text-blue-400' : 'text-amber-400',
    bgLight: variant === 'vfg' ? 'bg-blue-100' : 'bg-amber-100',
    bgLightOpacity: variant === 'vfg' ? 'bg-blue-500/10' : 'bg-amber-500/10',
    bgDark: variant === 'vfg' ? 'bg-blue-900/20' : 'bg-amber-900/20',
    borderLight: variant === 'vfg' ? 'border-blue-200' : 'border-amber-200',
    borderDark: variant === 'vfg' ? 'border-blue-800' : 'border-amber-800',
    hoverBg: variant === 'vfg' ? 'hover:bg-blue-700' : 'hover:bg-amber-700',
  };
  
  // Gérer le clic sur une zone
  const handleZoneClick = (zoneId: string) => {
    console.log(`Zone clicked: ${zoneId}`);
    setSelectedZone(zoneId);
    setActiveTab('hosts');
  };
  
  // Gérer le clic sur le bouton retour
  const handleBackClick = () => {
    // Avant d'effacer la zone, s'assurer que les problèmes ne sont pas en cours de chargement
    if (isLoading.problems) {
      console.log("Attendez que les problèmes finissent de se charger avant de retourner...");
      // Ajouter un délai pour éviter de revenir pendant un refresh
      setTimeout(() => {
        setSelectedZone(null);
      }, 500);
      return;
    }
    setSelectedZone(null);
  };
  
  // Gérer le changement d'onglet
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Trouver la zone sélectionnée
  const currentZone = zones.find(zone => zone.id === selectedZone);
  
  // Formatter le temps de chargement pour l'affichage (pour version optimisée)
  const formatLoadTime = (timeMs: number): string => {
    if (timeMs < 1000) {
      return `${timeMs.toFixed(0)} ms`;
    }
    return `${(timeMs / 1000).toFixed(2)} s`;
  };
  
  console.log("Dashboard render state:", {
    isLoading,
    backendConnected,
    error,
    selectedZone,
    currentZone,
    zonesCount: zones.length
  });
  
  // Afficher un écran de chargement si le chargement initial n'est pas terminé
  if (!isLoading.initialLoadComplete || (isLoading.dashboardData && optimized)) {
    return (
      <Layout title={title}>
        <div className="flex flex-col items-center justify-center h-64">
          <div className={`w-16 h-16 border-t-4 border-b-4 ${cssClasses.accent} rounded-full animate-spin mb-4`}></div>
          <p className="text-xl text-slate-400">Chargement des données...</p>
        </div>
      </Layout>
    );
  }
  
  // Afficher un message d'erreur si le backend n'est pas connecté
  if (!backendConnected) {
    return (
      <Layout title={title}>
        <div className="flex flex-col items-center justify-center h-64 p-10 mt-20 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-xl text-red-600 dark:text-red-400 mb-4">Le serveur backend n'est pas accessible</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">
            Impossible de se connecter au serveur. Vérifiez que le backend est démarré et que votre connexion est active.
          </p>
          <button 
            onClick={() => refreshData()}
            className={`px-6 py-3 ${cssClasses.accentBg} text-white rounded-md ${cssClasses.hoverBg} flex items-center gap-2`}
          >
            <RefreshCw size={18} />
            <span>Réessayer</span>
          </button>
        </div>
      </Layout>
    );
  }
  
  // Afficher un message d'erreur générale si nécessaire
  if (error) {
    return (
      <Layout title={title}>
        <div className="flex flex-col items-center justify-center h-64 p-10 mt-20 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-xl text-red-600 dark:text-red-400 mb-4">Une erreur est survenue</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">{error}</p>
          <button 
            onClick={() => {
              setSelectedZone(null); // Réinitialiser la zone sélectionnée
              refreshData();
            }}
            className={`px-6 py-3 ${cssClasses.accentBg} text-white rounded-md ${cssClasses.hoverBg} flex items-center gap-2`}
          >
            <RefreshCw size={18} />
            <span>Réessayer</span>
          </button>
        </div>
      </Layout>
    );
  }
  
  // Si aucune MZ n'est trouvée après le chargement
  if (zones.length === 0 && 
     (variant === 'vfg' ? !isLoading.vitalForGroupMZs : !isLoading.vitalForEntrepriseMZs)) {
    return (
      <Layout title={title}>
        <div className={`flex flex-col items-center justify-center h-64 p-10 mt-20 ${cssClasses.bgLight} border ${cssClasses.borderLight} rounded-lg dark:${cssClasses.bgDark} dark:${cssClasses.borderDark}`}>
          <Shield className={`w-16 h-16 ${cssClasses.accent} mb-4`} />
          <p className={`text-xl ${cssClasses.text} dark:${cssClasses.darkText} mb-4`}>Aucune Management Zone trouvée</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">
            Aucune Management Zone n'a été trouvée. Vérifiez votre configuration.
          </p>
          <button 
            onClick={() => refreshData()}
            className={`px-6 py-3 ${cssClasses.accentBg} text-white rounded-md ${cssClasses.hoverBg} flex items-center gap-2`}
          >
            <RefreshCw size={18} />
            <span>Actualiser</span>
          </button>
        </div>
      </Layout>
    );
  }
  
  // Afficher l'écran de chargement des détails de zone
  if (isLoading.zoneDetails && selectedZone) {
    return (
      <Layout title={title} subtitle={currentZone?.name}>
        <button 
          onClick={handleBackClick}
          className="mb-5 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <ChevronLeft size={14} />
          <span>Retour aux Management Zones</span>
        </button>
        
        <div className="flex flex-col items-center justify-center max-w-md mx-auto p-8">
          {/* En-tête avec icône */}
          <div className="flex items-center mb-6">
            <div className={`p-3 rounded-full ${cssClasses.bgLightOpacity} ${cssClasses.accent}`}>
              {currentZone?.icon || <Shield size={24} />}
            </div>
            <div className="ml-4">
              <h3 className="font-bold text-lg">Chargement en cours</h3>
              <p className="text-slate-400 text-sm">Préparation des données de la zone</p>
            </div>
          </div>
          
          {/* Simulateur d'étapes de chargement */}
          <div className="w-full space-y-4 mb-8">
            {/* Étape 1 - simulée comme complétée */}
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Check className="text-green-500" size={16} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Connexion à la zone</p>
                <p className="text-xs text-slate-400">Authentification réussie</p>
              </div>
            </div>
            
            {/* Étape 2 - avec animation de chargement */}
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center relative">
                <div className={`absolute inset-0 rounded-full border-2 border-transparent ${cssClasses.accent.replace('text', 'border')} animate-spin`} 
                  style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent' }}></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Récupération des métriques</p>
                <div className="flex items-center">
                  <div className="h-1.5 w-24 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${cssClasses.accentBg} rounded-full`}
                      style={{ width: `${loadingProgress}%`, transition: 'width 0.3s ease-out' }}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs text-slate-400">{Math.round(loadingProgress)}%</span>
                </div>
              </div>
            </div>
            
            {/* Étape 3 - en attente */}
            <div className="flex items-center opacity-60">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Server size={14} className="text-slate-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Préparation des données</p>
                <p className="text-xs text-slate-400">En attente...</p>
              </div>
            </div>
          </div>
          
          {/* Ligne de progression globale avec animation */}
          <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full ${cssClasses.accentBg}`} 
              style={{ 
                width: `${loadingProgress}%`,
                transition: 'width 0.3s ease-out'
              }}
            ></div>
          </div>
          
          {/* Message explicatif */}
          <p className="text-sm text-slate-400 text-center">
            Préparation des informations détaillées pour <span className={cssClasses.text}>{currentZone?.name}</span>.
            <br/>Cette opération peut prendre quelques instants...
          </p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout
      title={title}
      subtitle={currentZone?.name}
    >
      {/* Section des métriques de performance (version optimisée uniquement) */}
      {optimized && performanceMetrics && (
        <div className={`mb-6 p-4 ${cssClasses.bgLightOpacity} border ${cssClasses.borderLight} rounded-lg dark:${cssClasses.bgDark} dark:${cssClasses.borderDark}`}>
          <div className="flex items-start gap-4">
            <BarChart className={cssClasses.accent} size={24} />
            <div className="flex-1">
              <h2 className={`text-lg font-semibold ${cssClasses.text} dark:${cssClasses.darkText} mb-1`}>Optimisation des performances</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                  <p className="text-slate-600 dark:text-slate-300 flex items-center">
                    <Clock className={`mr-2 ${cssClasses.accent}`} size={16} />
                    Temps de chargement: <span className={`ml-2 font-semibold ${cssClasses.text} dark:${cssClasses.darkText}`}>{formatLoadTime(performanceMetrics.loadTime)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Dernier rafraîchissement: <span className="ml-2 font-semibold">{performanceMetrics.lastRefresh.toLocaleTimeString()}</span>
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Entities: <span className="ml-2 font-semibold">{performanceMetrics.dataSizes.services + performanceMetrics.dataSizes.hosts} total</span>
                  </p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => refreshData()}
              className={`px-4 py-2 ${cssClasses.accentBg} text-white rounded ${cssClasses.hoverBg} flex items-center gap-2 ml-auto`}
            >
              <RefreshCw size={16} />
              <span>Rafraîchir</span>
            </button>
          </div>
        </div>
      )}
    
      {(isLoading.vitalForGroupMZs || isLoading.problems) && !isLoading.initialLoadComplete ? (
        <div className="flex justify-center items-center h-64">
          <Loader className={`w-10 h-10 ${cssClasses.accent} animate-spin`} />
        </div>
      ) : selectedZone && currentZone ? (
        // Vue détaillée d'une Management Zone
        <ZoneDetails
          zone={currentZone}
          problems={activeProblems.filter(p => p.zone.includes(currentZone.name))}
          processGroups={processGroups || []}
          hosts={hosts || []}
          services={services || []}
          activeTab={activeTab}
          onBackClick={handleBackClick}
          onTabChange={handleTabChange}
          isLoading={isLoading.zoneDetails}
        />
      ) : (
        <>
          {/* Bannière d'introduction */}
          <div className={`mb-6 p-4 ${cssClasses.bgLightOpacity} border ${cssClasses.borderLight} rounded-lg dark:${cssClasses.bgDark} dark:${cssClasses.borderDark}`}>
            <div className="flex items-start gap-4">
              <Shield className={cssClasses.accent} size={24} />
              <div>
                <h2 className={`text-lg font-semibold ${cssClasses.text} dark:${cssClasses.darkText} mb-1`}>{title}</h2>
                <p className="text-slate-600 dark:text-slate-300">
                  {variant === 'vfg' 
                    ? 'Supervision des applications critiques du groupe.'
                    : 'Supervision des applications critiques pour l\'entreprise.'}
                  {optimized && ' (Version optimisée)'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Cartes des problèmes avec navigation */}
          {/* Carte unifiée des problèmes avec Vue 3D stylisée */}
          <div 
            onClick={() => navigate(`/problems/unified?dashboard=${variant}`)}
            className="p-5 rounded-lg border cursor-pointer transition-all mb-6 
                      hover:shadow-lg border-slate-700 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 
                      hover:bg-gradient-to-br hover:from-slate-700 hover:via-slate-800 hover:to-slate-700"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-indigo-600/30 to-blue-900/30 border border-blue-500/30 shadow-md">
                <Shield className="text-blue-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                  SURVEILLANCE DES PROBLÈMES
                  <span className="ml-2 bg-blue-900/40 text-blue-300 rounded-lg px-2 py-0.5 text-xs border border-blue-700/30">
                    NOUVEAU
                  </span>
                </h3>
                <p className="text-slate-400 mt-1">
                  Vue unifiée des incidents actifs et passés avec analyses détaillées
                </p>
                
                <div className="flex flex-wrap mt-3 gap-3">
                  <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/30 rounded-md px-3 py-1.5">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-red-300 text-sm font-medium">
                      {activeProblems.length} actif{activeProblems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-800/30 rounded-md px-3 py-1.5">
                    <Clock size={14} className="text-amber-400" />
                    <span className="text-amber-300 text-sm font-medium">
                      {problemsLast72h ? problemsLast72h.length : 0} récent{(!problemsLast72h || problemsLast72h.length !== 1) ? 's' : ''} (72h)
                    </span>
                  </div>
                  
                  <div className="ml-auto flex items-center">
                    <span className="px-3 py-1 text-sm text-slate-400">Voir tous les problèmes</span>
                    <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center border border-blue-600/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Liste des zones avec design moderne */}
          <ModernManagementZoneList 
            zones={zones} 
            onZoneClick={handleZoneClick}
            title={variant === 'vfg' ? "Management Zones Vital for Group" : "Management Zones Vital for Enterprise"}
            variant={variant}
            loading={isLoading.dashboardData}
            onRefresh={() => refreshData(variant, false)}
          />
        </>
      )}
    </Layout>
  );
};

export default DashboardBase;