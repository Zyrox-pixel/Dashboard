import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import StatsCard from '../components/common/StatsCard';
import ZoneCard from '../components/common/ZoneCard';
import { Shield, Server, Activity, Database, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

/**
 * Page d'aperçu consolidée qui affiche les informations des tableaux de bord VFG et VFE côte à côte
 */
const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeProblems,
    problemsLast72h,
    vitalForGroupMZs,
    vitalForEntrepriseMZs,
    refreshData,
    isLoading,
    error,
    backendConnected
  } = useApp();

  // État pour suivre le dernier rafraîchissement
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Charger les données des deux tableaux de bord au montage
  useEffect(() => {
    const loadBothDashboards = async () => {
      await refreshData('vfg', false);
      await refreshData('vfe', false);
      setLastRefresh(new Date());
    };
    
    loadBothDashboards();
    
    // Refresh automatique toutes les 5 minutes
    const interval = setInterval(() => {
      loadBothDashboards();
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  // Filtrer les problèmes par type de dashboard
  const vfgProblems = activeProblems.filter(p => 
    vitalForGroupMZs.some(zone => p.zone.includes(zone.name))
  );
  
  const vfeProblems = activeProblems.filter(p => 
    vitalForEntrepriseMZs.some(zone => p.zone.includes(zone.name))
  );

  // Obtenir des statistiques de base pour chaque dashboard
  const getStats = (mzs: any[]) => {
    return {
      zones: mzs.length,
      services: mzs.reduce((sum, zone) => sum + zone.services, 0),
      hosts: mzs.reduce((sum, zone) => sum + zone.hosts, 0),
      problems: mzs.reduce((sum, zone) => sum + zone.problemCount, 0),
      healthy: mzs.filter(zone => zone.status === 'healthy').length,
    };
  };

  const vfgStats = getStats(vitalForGroupMZs);
  const vfeStats = getStats(vitalForEntrepriseMZs);

  // Calculer pourcentage de zones saines
  const getHealthPercent = (stats: any) => {
    return stats.zones > 0 ? Math.round((stats.healthy / stats.zones) * 100) : 0;
  };

  // Afficher un message de chargement si nécessaire
  if (isLoading.initialLoadComplete === false) {
    return (
      <Layout title="Vue d'ensemble">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-16 h-16 border-t-4 border-b-4 text-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-slate-400">Chargement des données...</p>
        </div>
      </Layout>
    );
  }

  // Afficher un message d'erreur si le backend n'est pas connecté
  if (!backendConnected) {
    return (
      <Layout title="Vue d'ensemble">
        <div className="flex flex-col items-center justify-center h-64 p-10 mt-20 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-xl text-red-600 dark:text-red-400 mb-4">Le serveur backend n'est pas accessible</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">
            Impossible de se connecter au serveur. Vérifiez que le backend est démarré et que votre connexion est active.
          </p>
          <button 
            onClick={() => refreshData()}
            className="px-6 py-3 bg-indigo-500 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
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
      <Layout title="Vue d'ensemble">
        <div className="flex flex-col items-center justify-center h-64 p-10 mt-20 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-xl text-red-600 dark:text-red-400 mb-4">Une erreur est survenue</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">{error}</p>
          <button 
            onClick={() => refreshData()}
            className="px-6 py-3 bg-indigo-500 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            <span>Réessayer</span>
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Vue d'ensemble">
      {/* En-tête avec bouton de rafraîchissement */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vue d'ensemble consolidée</h1>
          <p className="text-slate-400">
            Aperçu global des applications Vital4Group et Vital4Entreprise
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">
            Dernière mise à jour: {lastRefresh.toLocaleTimeString()}
          </span>
          <button 
            onClick={() => {
              refreshData('vfg', false);
              refreshData('vfe', false);
              setLastRefresh(new Date());
            }}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-700 flex items-center gap-2"
            disabled={isLoading.dashboardData}
          >
            <RefreshCw size={16} className={isLoading.dashboardData ? "animate-spin" : ""} />
            <span>Rafraîchir</span>
          </button>
        </div>
      </div>
      
      {/* Vue en deux colonnes pour VFG et VFE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne VFG */}
        <div className="flex flex-col space-y-6">
          <div className="bg-gradient-to-br from-blue-600/10 to-blue-900/10 border border-blue-700/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-500 flex items-center gap-2">
                <Shield size={20} />
                Vital for Group
              </h2>
              <button 
                onClick={() => navigate('/dashboard/vfg')}
                className="px-3 py-1.5 bg-blue-500 bg-opacity-20 text-blue-400 text-sm rounded border border-blue-500 border-opacity-30 hover:bg-opacity-30"
              >
                Voir le détail
              </button>
            </div>
            
            {/* Statistiques VFG */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <StatsCard 
                title="Management Zones" 
                value={vfgStats.zones} 
                icon={Shield}
                accentColor="primary" 
                design="3d"
              />
              <StatsCard 
                title="Services" 
                value={vfgStats.services} 
                icon={Activity}
                accentColor="info" 
                design="3d"
              />
              <StatsCard 
                title="Hosts" 
                value={vfgStats.hosts} 
                icon={Server}
                accentColor="primary" 
                design="3d"
              />
              <StatsCard 
                title="Problèmes" 
                value={vfgProblems.length} 
                icon={AlertTriangle}
                accentColor={vfgProblems.length > 0 ? "error" : "success"} 
                design="3d"
              />
            </div>
            
            {/* Zones VFG */}
            <h3 className="text-md font-semibold text-blue-400 mb-3">Zones problématiques</h3>
            <div className="space-y-3">
              {vitalForGroupMZs
                .filter(zone => zone.problemCount > 0)
                .slice(0, 3)
                .map(zone => (
                  <ZoneCard
                    key={zone.id}
                    zone={zone}
                    variant="compact"
                    design="3d"
                    onZoneClick={() => navigate(`/dashboard/vfg?zone=${zone.id}`)}
                  />
                ))}
              
              {vitalForGroupMZs.filter(zone => zone.problemCount > 0).length === 0 && (
                <div className="text-center p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-slate-400">Aucune zone problématique</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Colonne VFE */}
        <div className="flex flex-col space-y-6">
          <div className="bg-gradient-to-br from-amber-600/10 to-amber-900/10 border border-amber-700/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-amber-500 flex items-center gap-2">
                <Shield size={20} />
                Vital for Entreprise
              </h2>
              <button 
                onClick={() => navigate('/dashboard/vfe')}
                className="px-3 py-1.5 bg-amber-500 bg-opacity-20 text-amber-400 text-sm rounded border border-amber-500 border-opacity-30 hover:bg-opacity-30"
              >
                Voir le détail
              </button>
            </div>
            
            {/* Statistiques VFE */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <StatsCard 
                title="Management Zones" 
                value={vfeStats.zones} 
                icon={Shield}
                accentColor="warning" 
                design="3d"
              />
              <StatsCard 
                title="Services" 
                value={vfeStats.services} 
                icon={Activity}
                accentColor="warning" 
                design="3d"
              />
              <StatsCard 
                title="Hosts" 
                value={vfeStats.hosts} 
                icon={Server}
                accentColor="warning" 
                design="3d"
              />
              <StatsCard 
                title="Problèmes" 
                value={vfeProblems.length} 
                icon={AlertTriangle}
                accentColor={vfeProblems.length > 0 ? "error" : "success"} 
                design="3d"
              />
            </div>
            
            {/* Zones VFE */}
            <h3 className="text-md font-semibold text-amber-400 mb-3">Zones problématiques</h3>
            <div className="space-y-3">
              {vitalForEntrepriseMZs
                .filter(zone => zone.problemCount > 0)
                .slice(0, 3)
                .map(zone => (
                  <ZoneCard
                    key={zone.id}
                    zone={zone}
                    variant="compact"
                    design="3d"
                    onZoneClick={() => navigate(`/dashboard/vfe?zone=${zone.id}`)}
                  />
                ))}
              
              {vitalForEntrepriseMZs.filter(zone => zone.problemCount > 0).length === 0 && (
                <div className="text-center p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-slate-400">Aucune zone problématique</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Section des problèmes récents commune */}
      <div className="mt-8 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-400" />
            Problèmes récents (72h)
          </h2>
          <button 
            onClick={() => navigate('/problems/unified')}
            className="px-3 py-1.5 bg-red-500 bg-opacity-20 text-red-400 text-sm rounded border border-red-500 border-opacity-30 hover:bg-opacity-30"
          >
            Voir tous les problèmes
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Impact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Heure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {problemsLast72h && problemsLast72h.length > 0 ? (
                problemsLast72h.slice(0, 5).map((problem) => (
                  <tr key={problem.id} className="hover:bg-slate-800">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{problem.id.slice(-8)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        problem.impact === 'ÉLEVÉ'
                          ? 'bg-red-900/20 text-red-400 border border-red-700/30'
                          : problem.impact === 'MOYEN'
                          ? 'bg-amber-900/20 text-amber-400 border border-amber-700/30'
                          : 'bg-blue-900/20 text-blue-400 border border-blue-700/30'
                      }`}>
                        {problem.impact}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                      {problem.zone.length > 30 
                        ? `${problem.zone.substring(0, 30)}...` 
                        : problem.zone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        problem.status === 'critical'
                          ? 'bg-red-900/20 text-red-400 border border-red-700/30'
                          : problem.status === 'warning'
                          ? 'bg-amber-900/20 text-amber-400 border border-amber-700/30'
                          : 'bg-green-900/20 text-green-400 border border-green-700/30'
                      }`}>
                        {problem.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                      {problem.startTime ? new Date(problem.startTime).toLocaleString() : problem.time}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-slate-400">
                    Aucun problème récent
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default OverviewPage;