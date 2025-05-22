import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Clock, Server, Database, BarChart } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useProblems } from '../contexts/ProblemsContext';
import { ManagementZone } from '../api/types';

/**
 * Composant de Vue d'Ensemble qui présente un récapitulatif des dashboards VFG et VFE
 * avec des cartes interactives côte à côte
 */
const OverviewDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    vitalForGroupMZs, 
    vitalForEntrepriseMZs,
    isLoading 
  } = useApp();
  
  const {
    vfgProblems,
    vfeProblems,
    vfgProblems72h,
    vfeProblems72h,
    refreshAll,
    getAggregatedProblems,
    getAggregatedProblems72h,
    isLoading: problemsLoading
  } = useProblems();
  
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  
  // États pour stocker les zones avec leurs comptages de problèmes
  const [vfgZonesWithProblemCount, setVfgZonesWithProblemCount] = useState<Array<ManagementZone & { problemCount: number }>>([]);
  const [vfeZonesWithProblemCount, setVfeZonesWithProblemCount] = useState<Array<ManagementZone & { problemCount: number }>>([]);
  
  // Récupérer les problèmes agrégés
  const aggregatedActiveProblems = getAggregatedProblems();
  const aggregatedProblems72h = getAggregatedProblems72h();
  
  // Effet pour forcer le chargement initial des données - optimisé avec cache avancé
  useEffect(() => {
    const loadInitialData = async () => {
      console.log("Chargement initial des données depuis OverviewDashboard");

      try {
        // Vérifier si des données existent dans sessionStorage pour accélérer l'affichage
        const hasSessionData = sessionStorage.getItem('dashboardData');

        if (hasSessionData) {
          try {
            const parsedData = JSON.parse(hasSessionData);
            // Pré-initialisation rapide pour l'affichage immédiat
            console.log("🚀 Utilisation des données en session pour affichage instantané");
            // Le reste sera chargé par le ProblemsContext
          } catch (e) {
            console.error("Erreur lors du parsing des données en session:", e);
          }
        }

        // Priorité élevée pour le chargement initial
        if (!initialLoadComplete) {
          if (window.navigator && 'setAppBadge' in window.navigator) {
            // @ts-ignore - API moderne pour indiquer une activité au niveau du navigateur
            window.navigator.setAppBadge();
          }

          // Suppression des requêtes non-critiques sur la version mobile
          const isMobile = window.innerWidth < 768;
          if (isMobile) {
            console.log("📱 Mode mobile détecté - optimisation du chargement");
            // En mobile, charger en priorité les problèmes critiques uniquement
            await refreshAll(false); // Pas de force refresh, utiliser le cache si récent
          } else {
            // Sur desktop, chargement complet mais parallélisé
            await Promise.all([
              // Priorité 1: Chargement immédiat des données des problèmes pour affichage rapide
              refreshAll(!hasSessionData), // Force refresh seulement si pas de données en session

              // Initialisation des zones même avant d'avoir les données finales
              new Promise(resolve => {
                // Initier le chargement sans attendre les résultats complets
                setTimeout(resolve, 10);
              })
            ]);
          }
        } else {
          // Chargement silencieux en arrière-plan pour les visites ultérieures
          console.log("🔄 Rafraîchissement silencieux des données");
          refreshAll(false).catch(e => console.error("Erreur de rafraîchissement silencieux:", e));
        }

        // Sauvegarder les données dans sessionStorage pour accès rapide ultérieur
        const dataToSave = {
          vfgStats: { ...vfgStats },
          vfeStats: { ...vfeStats },
          timestamp: Date.now()
        };
        sessionStorage.setItem('dashboardData', JSON.stringify(dataToSave));

        console.log("Chargement initial terminé avec succès");

        // S'assurer que même sans problèmes, les zones sont initialisées
        if (vitalForGroupMZs.length > 0 && vfgZonesWithProblemCount.length === 0) {
          console.log("Initialisation forcée des zones VFG");
          setVfgZonesWithProblemCount(vitalForGroupMZs.map(zone => ({
            ...zone,
            problemCount: vfgProblems.filter(p =>
              p.zone && p.zone.includes(zone.name)
            ).length
          })));
        }

        if (vitalForEntrepriseMZs.length > 0 && vfeZonesWithProblemCount.length === 0) {
          console.log("Initialisation forcée des zones VFE");
          setVfeZonesWithProblemCount(vitalForEntrepriseMZs.map(zone => ({
            ...zone,
            problemCount: vfeProblems.filter(p =>
              p.zone && p.zone.includes(zone.name)
            ).length
          })));
        }

        setLastRefreshTime(new Date());
      } catch (error) {
        console.error("Erreur lors du chargement initial des données:", error);
      }
    };

    loadInitialData();
  }, []); // Exécuté uniquement au montage du composant
  
  // Effet pour calculer les problèmes par zone pour VFG, y compris au chargement initial
  useEffect(() => {
    console.log(`Mise à jour des zones VFG avec ${vfgProblems.length} problèmes (même s'il n'y en a pas)`);

    if (vitalForGroupMZs.length > 0) {
      const updatedZones = vitalForGroupMZs.map(zone => {
        // Compter les problèmes pour cette zone
        const problemCount = vfgProblems.filter(p =>
          p.zone && p.zone.includes(zone.name)
        ).length;

        return {
          ...zone,
          problemCount
        };
      });

      setVfgZonesWithProblemCount(updatedZones);
    }
  }, [vfgProblems, vitalForGroupMZs]);

  // Effet pour calculer les problèmes par zone pour VFE, y compris au chargement initial
  useEffect(() => {
    console.log(`Mise à jour des zones VFE avec ${vfeProblems.length} problèmes (même s'il n'y en a pas)`);

    if (vitalForEntrepriseMZs.length > 0) {
      const updatedZones = vitalForEntrepriseMZs.map(zone => {
        // Compter les problèmes pour cette zone
        const problemCount = vfeProblems.filter(p =>
          p.zone && p.zone.includes(zone.name)
        ).length;

        return {
          ...zone,
          problemCount
        };
      });

      setVfeZonesWithProblemCount(updatedZones);
    }
  }, [vfeProblems, vitalForEntrepriseMZs]);
  
  // Calcul des statistiques VFG
  const vfgStats = {
    totalZones: vitalForGroupMZs.length,
    activeProblems: vfgProblems.length,
    recentProblems: vfgProblems72h.length,
    criticalZones: vfgZonesWithProblemCount.filter(zone => zone.problemCount > 0).length,
  };

  // Calcul des statistiques VFE
  const vfeStats = {
    totalZones: vitalForEntrepriseMZs.length,
    activeProblems: vfeProblems.length,
    recentProblems: vfeProblems72h.length,
    criticalZones: vfeZonesWithProblemCount.filter(zone => zone.problemCount > 0).length,
  };

  // Déterminer les zones critiques (top 3)
  const topVfgCriticalZones = vfgZonesWithProblemCount
    .filter(zone => zone.problemCount > 0)
    .sort((a, b) => b.problemCount - a.problemCount)
    .slice(0, 3);

  const topVfeCriticalZones = vfeZonesWithProblemCount
    .filter(zone => zone.problemCount > 0)
    .sort((a, b) => b.problemCount - a.problemCount)
    .slice(0, 3);
    
  // Fonction de rafraîchissement manuel
  const handleRefresh = async () => {
    console.log("Rafraîchissement manuel des données depuis OverviewDashboard");
    await refreshAll(true);
    setLastRefreshTime(new Date());
  };

  // Améliorations d'UX pour le chargement
  const loading = isLoading.problems || problemsLoading.vfg || problemsLoading.vfe;

  // État pour contrôler le spinner visuel UNIQUEMENT pendant le chargement initial
  const [initialLoadComplete, setInitialLoadComplete] = useState(() => {
    // Vérifier si nous avons déjà chargé cette page dans cette session
    const hasLoadedBefore = sessionStorage.getItem('dashboardLoaded');
    return hasLoadedBefore === 'true';
  });

  // Effet pour masquer le skeleton loader après le chargement des données
  useEffect(() => {
    // Si les données sont chargées ou si le délai maximum est atteint
    if ((!loading && vfgProblems.length > 0) || (!loading && vfeProblems.length > 0)) {
      // Délai court pour une transition fluide
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
        // Marquer que nous avons déjà chargé cette page
        sessionStorage.setItem('dashboardLoaded', 'true');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, vfgProblems.length, vfeProblems.length]);

  return (
    <>
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
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700
              disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
              flex items-center gap-2"
          >
            <Clock size={16} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Chargement...' : 'Rafraîchir'}</span>
          </button>
        </div>
      </div>

      {/* Section problèmes globaux - DÉPLACÉE EN HAUT */}
      <div
        onClick={() => navigate('/problems/unified')}
        className="p-5 mb-6 rounded-lg border cursor-pointer transition-all
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
                  {initialLoadComplete ?
                    `${aggregatedActiveProblems.length} actif${aggregatedActiveProblems.length !== 1 ? 's' : ''}` :
                    <div className="inline-block w-16 h-5 bg-red-900/30 rounded animate-pulse"></div>
                  }
                </span>
              </div>

              <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-800/30 rounded-md px-3 py-1.5">
                <Clock size={14} className="text-amber-400" />
                <span className="text-amber-300 text-sm font-medium">
                  {initialLoadComplete ?
                    `${aggregatedProblems72h.length} récent${aggregatedProblems72h.length !== 1 ? 's' : ''} (72h)` :
                    <div className="inline-block w-24 h-5 bg-amber-900/30 rounded animate-pulse"></div>
                  }
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
              <div className="text-3xl font-bold text-blue-400 mb-1">
              {initialLoadComplete ? vfgStats.totalZones : (
                <div className="h-8 w-16 bg-blue-900/30 rounded animate-pulse"></div>
              )}
            </div>
              <div className="text-sm text-slate-400">Management Zones</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-red-400 mb-1">
                {initialLoadComplete ? vfgStats.activeProblems : (
                  <div className="h-8 w-16 bg-red-900/30 rounded animate-pulse"></div>
                )}
              </div>
              <div className="text-sm text-slate-400">Problèmes Actifs</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-amber-400 mb-1">
                {initialLoadComplete ? vfgStats.recentProblems : (
                  <div className="h-8 w-16 bg-amber-900/30 rounded animate-pulse"></div>
                )}
              </div>
              <div className="text-sm text-slate-400">Problèmes Récents (72h)</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-orange-400 mb-1">
                {initialLoadComplete ? vfgStats.criticalZones : (
                  <div className="h-8 w-16 bg-orange-900/30 rounded animate-pulse"></div>
                )}
              </div>
              <div className="text-sm text-slate-400">Zones Critiques</div>
            </div>
          </div>

          {/* Zones critiques - toujours afficher la section */}
          <div>
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              Zones critiques à surveiller
            </h4>
            <div className="space-y-2">
              {topVfgCriticalZones.length > 0 ? (
                topVfgCriticalZones.map(zone => (
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
                ))
              ) : (
                <div className="bg-slate-800/70 border border-slate-700 p-3 rounded-md text-slate-400 text-center">
                  Aucune zone critique actuellement
                </div>
              )}
            </div>
          </div>

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
              <div className="text-3xl font-bold text-amber-400 mb-1">
                {initialLoadComplete ? vfeStats.totalZones : (
                  <div className="h-8 w-16 bg-amber-900/30 rounded animate-pulse"></div>
                )}
              </div>
              <div className="text-sm text-slate-400">Management Zones</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-red-400 mb-1">
                {initialLoadComplete ? vfeStats.activeProblems : (
                  <div className="h-8 w-16 bg-red-900/30 rounded animate-pulse"></div>
                )}
              </div>
              <div className="text-sm text-slate-400">Problèmes Actifs</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-amber-400 mb-1">
                {initialLoadComplete ? vfeStats.recentProblems : (
                  <div className="h-8 w-16 bg-amber-900/30 rounded animate-pulse"></div>
                )}
              </div>
              <div className="text-sm text-slate-400">Problèmes Récents (72h)</div>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-md border border-slate-700">
              <div className="text-3xl font-bold text-orange-400 mb-1">
                {initialLoadComplete ? vfeStats.criticalZones : (
                  <div className="h-8 w-16 bg-orange-900/30 rounded animate-pulse"></div>
                )}
              </div>
              <div className="text-sm text-slate-400">Zones Critiques</div>
            </div>
          </div>

          {/* Zones critiques - toujours afficher la section */}
          <div>
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              Zones critiques à surveiller
            </h4>
            <div className="space-y-2">
              {topVfeCriticalZones.length > 0 ? (
                topVfeCriticalZones.map(zone => (
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
                ))
              ) : (
                <div className="bg-slate-800/70 border border-slate-700 p-3 rounded-md text-slate-400 text-center">
                  Aucune zone critique actuellement
                </div>
              )}
            </div>
          </div>

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

      {/* Section Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {/* Total Hosts */}

        {/* Overlay de chargement élégant - visible uniquement pendant le tout premier chargement */}
        {!initialLoadComplete && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-slate-800 p-8 rounded-lg border border-indigo-700 shadow-xl max-w-md w-full">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-900/50 border-2 border-t-indigo-500 border-r-indigo-500 border-b-indigo-300 border-l-indigo-300 animate-spin mb-4"></div>
                <h3 className="text-xl font-semibold text-white mb-2">Préparation du tableau de bord</h3>
                <p className="text-slate-300 mb-4">
                  Récupération des alertes et incidents en cours sur les systèmes critiques...
                </p>
                <div className="flex items-center gap-2 text-indigo-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse delay-150"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          </div>
        )}
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
    </>
  );
};

export default OverviewDashboard;