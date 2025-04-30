import React from 'react';
import { Shield, Loader, AlertOctagon, RefreshCw, Clock, BarChart } from 'lucide-react';
import Layout from '../layout/Layout';
import ProblemsList from './ProblemsList';
import ManagementZoneList from './ManagementZoneList';
import ZoneDetails from './ZoneDetails';
import { AppContextType } from '../../contexts/AppContext';

interface DashboardBaseProps {
  title: string;
  variant: 'vfg' | 'vfe';
  optimized?: boolean;
  context: AppContextType;
}

/**
 * Composant de base réutilisable pour les tableaux de bord (standard et optimisé)
 * Cela permet d'éviter la duplication entre les 4 composants de dashboard
 */
const DashboardBase: React.FC<DashboardBaseProps> = ({ 
  title, 
  variant, 
  optimized = false,
  context
}) => {
  const { 
    activeProblems,
    vitalForGroupMZs, 
    vitalForEntrepriseMZs,
    selectedZone, 
    setSelectedZone,
    activeTab,
    setActiveTab,
    processGroups,
    hosts,
    services,
    summaryData,
    isLoading,
    error,
    backendConnected,
    performanceMetrics,
    refreshData
  } = context;
  
  // Déterminer les zones à afficher selon la variante
  const zones = variant === 'vfg' ? vitalForGroupMZs : vitalForEntrepriseMZs;
  
  // Déterminer les couleurs de l'interface selon la variante
  const colors = {
    primary: variant === 'vfg' ? 'blue' : 'amber',
    accent: variant === 'vfg' ? 'blue-500' : 'amber-500',
    text: variant === 'vfg' ? 'blue-600' : 'amber-600',
    darkText: variant === 'vfg' ? 'blue-400' : 'amber-400',
    bgLight: variant === 'vfg' ? 'blue-100' : 'amber-100',
    bgDark: variant === 'vfg' ? 'blue-900/20' : 'amber-900/20',
    borderLight: variant === 'vfg' ? 'blue-200' : 'amber-200',
    borderDark: variant === 'vfg' ? 'blue-800' : 'amber-800',
  };
  
  // Gérer le clic sur une zone
  const handleZoneClick = (zoneId: string) => {
    setSelectedZone(zoneId);
    setActiveTab('hosts');
  };
  
  // Gérer le clic sur le bouton retour
  const handleBackClick = () => {
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
  
  // Afficher un écran de chargement si le chargement initial n'est pas terminé
  if (!isLoading.initialLoadComplete || (isLoading.dashboardData && optimized)) {
    return (
      <Layout title={title}>
        <div className="flex flex-col items-center justify-center h-64">
          <div className={`w-16 h-16 border-t-4 border-b-4 border-${colors.accent} rounded-full animate-spin mb-4`}></div>
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
          <AlertOctagon className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-xl text-red-600 dark:text-red-400 mb-4">Le serveur backend n'est pas accessible</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">
            Impossible de se connecter au serveur. Vérifiez que le backend est démarré et que votre connexion est active.
          </p>
          <button 
            onClick={() => refreshData()}
            className={`px-6 py-3 bg-${colors.accent} text-white rounded-md hover:bg-${colors.primary}-700 flex items-center gap-2`}
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
          <AlertOctagon className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-xl text-red-600 dark:text-red-400 mb-4">Une erreur est survenue</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">{error}</p>
          <button 
            onClick={() => refreshData()}
            className={`px-6 py-3 bg-${colors.accent} text-white rounded-md hover:bg-${colors.primary}-700 flex items-center gap-2`}
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
        <div className={`flex flex-col items-center justify-center h-64 p-10 mt-20 bg-${colors.bgLight} border border-${colors.borderLight} rounded-lg dark:bg-${colors.bgDark} dark:border-${colors.borderDark}`}>
          <Shield className={`w-16 h-16 text-${colors.accent} mb-4`} />
          <p className={`text-xl text-${colors.text} dark:text-${colors.darkText} mb-4`}>Aucune Management Zone trouvée</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">
            Aucune Management Zone n'a été trouvée. Vérifiez votre configuration.
          </p>
          <button 
            onClick={() => refreshData()}
            className={`px-6 py-3 bg-${colors.accent} text-white rounded-md hover:bg-${colors.primary}-700 flex items-center gap-2`}
          >
            <RefreshCw size={18} />
            <span>Actualiser</span>
          </button>
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
        <div className={`mb-6 p-4 bg-${colors.primary}-500/10 border border-${colors.borderLight} rounded-lg dark:bg-${colors.bgDark} dark:border-${colors.borderDark}`}>
          <div className="flex items-start gap-4">
            <BarChart className={`text-${colors.accent} mt-1`} size={24} />
            <div className="flex-1">
              <h2 className={`text-lg font-semibold text-${colors.text} dark:text-${colors.darkText} mb-1`}>Optimisation des performances</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                  <p className="text-slate-600 dark:text-slate-300 flex items-center">
                    <Clock className={`mr-2 text-${colors.accent}`} size={16} />
                    Temps de chargement: <span className={`ml-2 font-semibold text-${colors.text} dark:text-${colors.darkText}`}>{formatLoadTime(performanceMetrics.loadTime)}</span>
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
              className={`px-4 py-2 bg-${colors.accent} text-white rounded hover:bg-${colors.primary}-700 flex items-center gap-2 ml-auto`}
            >
              <RefreshCw size={16} />
              <span>Rafraîchir</span>
            </button>
          </div>
        </div>
      )}
    
      {(isLoading.vitalForGroupMZs || isLoading.problems) && !isLoading.initialLoadComplete ? (
        <div className="flex justify-center items-center h-64">
          <Loader className={`w-10 h-10 text-${colors.accent} animate-spin`} />
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
          <div className={`mb-6 p-4 bg-${colors.primary}-500/10 border border-${colors.borderLight} rounded-lg dark:bg-${colors.bgDark} dark:border-${colors.borderDark}`}>
            <div className="flex items-start gap-4">
              <Shield className={`text-${colors.accent} mt-1`} size={24} />
              <div>
                <h2 className={`text-lg font-semibold text-${colors.text} dark:text-${colors.darkText} mb-1`}>{title}</h2>
                <p className="text-slate-600 dark:text-slate-300">
                  {variant === 'vfg' 
                    ? 'Supervision des applications critiques du groupe.'
                    : 'Supervision des applications critiques pour l\'entreprise.'}
                  {optimized && ' (Version optimisée)'}
                </p>
              </div>
            </div>
          </div>
        
          {/* Afficher les données de résumé si disponibles */}
          {summaryData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800 dark:bg-slate-800 p-4 rounded-lg border border-slate-700 dark:border-slate-700">
                <div className="text-xs text-slate-400 dark:text-slate-400 mb-1">Hôtes</div>
                <div className="text-xl font-bold text-white dark:text-white">{summaryData.hosts?.count || 0}</div>
                <div className="text-sm text-slate-400 dark:text-slate-400">
                  CPU Moyen: <span className={
                    (summaryData.hosts?.avg_cpu || 0) > 80 ? 'text-red-500' : 
                    (summaryData.hosts?.avg_cpu || 0) > 60 ? 'text-yellow-500' : 
                    'text-green-500'
                  }>
                    {summaryData.hosts?.avg_cpu || 0}%
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-800 dark:bg-slate-800 p-4 rounded-lg border border-slate-700 dark:border-slate-700">
                <div className="text-xs text-slate-400 dark:text-slate-400 mb-1">Services</div>
                <div className="text-xl font-bold text-white dark:text-white">{summaryData.services?.count || 0}</div>
                <div className="text-sm text-slate-400 dark:text-slate-400">
                  Taux d'erreur: <span className={
                    (summaryData.services?.avg_error_rate || 0) > 5 ? 'text-red-500' : 
                    (summaryData.services?.avg_error_rate || 0) > 1 ? 'text-yellow-500' : 
                    'text-green-500'
                  }>
                    {summaryData.services?.avg_error_rate || 0}%
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-800 dark:bg-slate-800 p-4 rounded-lg border border-slate-700 dark:border-slate-700">
                <div className="text-xs text-slate-400 dark:text-slate-400 mb-1">Requêtes</div>
                <div className="text-xl font-bold text-white dark:text-white">{summaryData.requests?.total || 0}</div>
                <div className="text-sm text-slate-400 dark:text-slate-400">
                  Moyenne horaire: {summaryData.requests?.hourly_avg || 0}
                </div>
              </div>
              
              <div className="bg-slate-800 dark:bg-slate-800 p-4 rounded-lg border border-slate-700 dark:border-slate-700">
                <div className="text-xs text-slate-400 dark:text-slate-400 mb-1">Problèmes</div>
                <div className="text-xl font-bold text-white dark:text-white">{summaryData.problems?.count || 0}</div>
                <div className="text-sm text-slate-400 dark:text-slate-400">
                  <span className={(summaryData.problems?.count || 0) > 0 ? 'text-red-500' : 'text-green-500'}>
                    {(summaryData.problems?.count || 0) > 0 ? 'Problèmes actifs' : 'Aucun problème'}
                  </span>
                </div>
              </div>
            </div>
          )}
        
          {/* Liste des problèmes */}
          <ProblemsList 
            problems={activeProblems} 
            title={`Problèmes actifs sur ${title}`} 
          />
          
          {/* Liste des zones */}
          <ManagementZoneList 
            zones={zones} 
            onZoneClick={handleZoneClick} 
          />
        </>
      )}
    </Layout>
  );
};

export default DashboardBase;