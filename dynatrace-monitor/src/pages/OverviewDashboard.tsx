import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Clock, Server, Database, BarChart } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';

/**
 * Composant de Vue d'Ensemble qui présente un récapitulatif des dashboards VFG et VFE
 * avec des cartes interactives côte à côte
 */
const OverviewDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    vitalForGroupMZs, 
    vitalForEntrepriseMZs, 
    activeProblems,
    problemsLast72h,
    refreshData, 
    isLoading 
  } = useApp();
  
  // État pour suivre le dernier rafraîchissement
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());

  // Effet pour charger les données initiales une seule fois
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    const loadInitialData = async () => {
      // Charger les données pour VFG et VFE uniquement si pas déjà chargées
      if (!initialLoadDoneRef.current) {
        console.log("Chargement initial des données pour la Vue d'ensemble");

        // Charger d'abord les données VFG
        await refreshData('vfg', false);

        // Puis charger les données VFE
        // Utiliser setTimeout pour permettre à React de mettre à jour l'état entre les deux chargements
        setTimeout(async () => {
          await refreshData('vfe', false);
          setLastRefreshTime(new Date());
        }, 100);

        setLastRefreshTime(new Date());
        initialLoadDoneRef.current = true;
      }
    };

    loadInitialData();
  }, [refreshData]);

  // Fonction de rafraîchissement manuel qui charge à la fois VFG et VFE
  const handleRefresh = async () => {
    console.log("Rafraîchissement manuel des données pour la Vue d'ensemble");

    // Charger d'abord les données VFG
    await refreshData('vfg', false);

    // Puis charger les données VFE
    await refreshData('vfe', false);

    setLastRefreshTime(new Date());
  };

  // Calcul des statistiques VFG
  const vfgStats = {
    totalZones: vitalForGroupMZs.length,
    activeProblems: activeProblems.filter(p => 
      vitalForGroupMZs.some(zone => p.zone?.includes(zone.name))
    ).length,
    recentProblems: problemsLast72h.filter(p => 
      vitalForGroupMZs.some(zone => p.zone?.includes(zone.name))
    ).length,
    criticalZones: vitalForGroupMZs.filter(zone => zone.problemCount > 0).length,
  };

  // Calcul des statistiques VFE
  const vfeStats = {
    totalZones: vitalForEntrepriseMZs.length,
    activeProblems: activeProblems.filter(p => 
      vitalForEntrepriseMZs.some(zone => p.zone?.includes(zone.name))
    ).length,
    recentProblems: problemsLast72h.filter(p => 
      vitalForEntrepriseMZs.some(zone => p.zone?.includes(zone.name))
    ).length,
    criticalZones: vitalForEntrepriseMZs.filter(zone => zone.problemCount > 0).length,
  };

  // Déterminer les zones critiques (top 3)
  const topVfgCriticalZones = vitalForGroupMZs
    .filter(zone => zone.problemCount > 0)
    .sort((a, b) => b.problemCount - a.problemCount)
    .slice(0, 3);

  const topVfeCriticalZones = vitalForEntrepriseMZs
    .filter(zone => zone.problemCount > 0)
    .sort((a, b) => b.problemCount - a.problemCount)
    .slice(0, 3);

  return (
    <Layout title="Vue d'Ensemble" subtitle="Supervision globale des applications critiques">
      {/* Bannière d'introduction */}
      <div className="mb-6 p-5 bg-slate-800/50 border border-slate-700 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-indigo-900/30 border border-indigo-700/30 text-indigo-400">
            <BarChart size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-1">Tableau de Bord Global</h2>
            <p className="text-slate-300">
              Vue d'ensemble unifiée des systèmes critiques pour le groupe et l'entreprise
            </p>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isLoading.problems}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
              disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
              flex items-center gap-2"
          >
            <Clock size={16} className={isLoading.problems ? 'animate-spin' : ''} />
            <span>Dernière MAJ: {lastRefreshTime.toLocaleTimeString()}</span>
          </button>
        </div>
      </div>

      {/* Grille des deux dashboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carte VFG */}
        <div 
          onClick={() => navigate('/vfg')}
          className="p-5 rounded-lg border border-blue-700 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900/20
            cursor-pointer transition-all hover:shadow-lg hover:from-slate-700 hover:via-slate-800 hover:to-blue-800/20"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-full bg-blue-900/30 border border-blue-700/30 text-blue-400">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Vital for Group</h3>
              <p className="text-slate-300">
                Supervision des applications critiques pour le groupe
              </p>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-blue-400 mb-1">{vfgStats.totalZones}</div>
              <div className="text-sm text-slate-400">Management Zones</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-red-400 mb-1">{vfgStats.activeProblems}</div>
              <div className="text-sm text-slate-400">Problèmes Actifs</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-amber-400 mb-1">{vfgStats.recentProblems}</div>
              <div className="text-sm text-slate-400">Problèmes Récents (72h)</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-orange-400 mb-1">{vfgStats.criticalZones}</div>
              <div className="text-sm text-slate-400">Zones Critiques</div>
            </div>
          </div>

          {/* Zones critiques */}
          {topVfgCriticalZones.length > 0 && (
            <div>
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                Zones critiques à surveiller
              </h4>
              <div className="space-y-2">
                {topVfgCriticalZones.map(zone => (
                  <div key={zone.id} className="bg-red-900/20 border border-red-900/30 p-2 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                        {zone.icon}
                      </span>
                      <span className="text-white">{zone.name}</span>
                    </div>
                    <span className="bg-red-900/40 text-red-300 px-2 py-1 rounded-md text-sm">
                      {zone.problemCount} problème{zone.problemCount > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton voir plus */}
          <div className="mt-4 flex justify-end">
            <span className="text-blue-400 flex items-center gap-2">
              Voir le tableau de bord
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </span>
          </div>
        </div>

        {/* Carte VFE */}
        <div 
          onClick={() => navigate('/vfe')}
          className="p-5 rounded-lg border border-amber-700 bg-gradient-to-br from-slate-800 via-slate-900 to-amber-900/20
            cursor-pointer transition-all hover:shadow-lg hover:from-slate-700 hover:via-slate-800 hover:to-amber-800/20"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-full bg-amber-900/30 border border-amber-700/30 text-amber-400">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Vital for Entreprise</h3>
              <p className="text-slate-300">
                Supervision des applications critiques pour l'entreprise
              </p>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-amber-400 mb-1">{vfeStats.totalZones}</div>
              <div className="text-sm text-slate-400">Management Zones</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-red-400 mb-1">{vfeStats.activeProblems}</div>
              <div className="text-sm text-slate-400">Problèmes Actifs</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-amber-400 mb-1">{vfeStats.recentProblems}</div>
              <div className="text-sm text-slate-400">Problèmes Récents (72h)</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-orange-400 mb-1">{vfeStats.criticalZones}</div>
              <div className="text-sm text-slate-400">Zones Critiques</div>
            </div>
          </div>

          {/* Zones critiques */}
          {topVfeCriticalZones.length > 0 && (
            <div>
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                Zones critiques à surveiller
              </h4>
              <div className="space-y-2">
                {topVfeCriticalZones.map(zone => (
                  <div key={zone.id} className="bg-red-900/20 border border-red-900/30 p-2 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                        {zone.icon}
                      </span>
                      <span className="text-white">{zone.name}</span>
                    </div>
                    <span className="bg-red-900/40 text-red-300 px-2 py-1 rounded-md text-sm">
                      {zone.problemCount} problème{zone.problemCount > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton voir plus */}
          <div className="mt-4 flex justify-end">
            <span className="text-amber-400 flex items-center gap-2">
              Voir le tableau de bord
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* Section problèmes globaux */}
      <div 
        onClick={() => navigate('/problems/unified')}
        className="p-5 mt-6 rounded-lg border cursor-pointer transition-all
                  hover:shadow-lg border-slate-700 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 
                  hover:bg-gradient-to-br hover:from-slate-700 hover:via-slate-800 hover:to-slate-700"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-gradient-to-br from-indigo-600/30 to-blue-900/30 border border-blue-500/30 shadow-md">
            <AlertTriangle className="text-red-400" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              PROBLÈMES ACTIFS
            </h3>
            <p className="text-slate-400 mt-1">
              Vue globale de tous les incidents actifs sur l'ensemble des systèmes
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
                  {problemsLast72h.length} récent{problemsLast72h.length !== 1 ? 's' : ''} (72h)
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

      {/* Section Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {/* Total Hosts */}
        <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Server size={18} className="text-green-400" />
            <h3 className="font-medium text-white">Hosts Surveillés</h3>
          </div>
          <div className="text-3xl font-bold text-green-400">
            {vitalForGroupMZs.reduce((acc, zone) => acc + zone.hosts, 0) + 
             vitalForEntrepriseMZs.reduce((acc, zone) => acc + zone.hosts, 0)}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            Serveurs sous supervision
          </div>
        </div>

        {/* Total Services */}
        <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={18} className="text-blue-400" />
            <h3 className="font-medium text-white">Services</h3>
          </div>
          <div className="text-3xl font-bold text-blue-400">
            {vitalForGroupMZs.reduce((acc, zone) => acc + zone.services, 0) + 
             vitalForEntrepriseMZs.reduce((acc, zone) => acc + zone.services, 0)}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            Services applicatifs
          </div>
        </div>

        {/* Total Apps */}
        <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Database size={18} className="text-purple-400" />
            <h3 className="font-medium text-white">Applications</h3>
          </div>
          <div className="text-3xl font-bold text-purple-400">
            {vitalForGroupMZs.reduce((acc, zone) => acc + zone.apps, 0) + 
             vitalForEntrepriseMZs.reduce((acc, zone) => acc + zone.apps, 0)}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            Process groupes
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OverviewDashboard;