import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import ProblemsList from '../dashboard/ProblemsList';
import { Problem } from '../../api/types';
import axios from 'axios';
import { API_BASE_URL } from '../../api/endpoints';

/**
 * Composant pour afficher tous les problèmes (VFG et VFE) combinés
 * Utilise une approche directe avec l'API backend pour éviter les problèmes de state
 * et les requêtes en boucle causés par l'utilisation du AppContext
 */
const AllProblemsView: React.FC = () => {
  const navigate = useNavigate();
  const requestInProgress = useRef<boolean>(false);
  
  // États locaux pour les problèmes
  const [activeProblems, setActiveProblems] = useState<Problem[]>([]);
  const [recentProblems, setRecentProblems] = useState<Problem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'active' | 'recent'>('active');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  
  // Problèmes à afficher selon l'onglet actif
  const problemsToDisplay = activeTab === 'active' ? activeProblems : recentProblems;
  
  // Charger les problèmes directement depuis l'API (sans passer par le context)
  const loadProblems = async () => {
    // Éviter les requêtes simultanées
    if (requestInProgress.current) {
      console.log('Une requête est déjà en cours, annulation...');
      return;
    }
    
    requestInProgress.current = true;
    setIsRefreshing(true);
    setError(null);
    
    try {
      console.log('Chargement de tous les problèmes (VFG et VFE)...');
      
      // Utiliser Promise.all pour les deux requêtes parallèles
      const [activeResponse, recentResponse] = await Promise.all([
        // Problèmes actifs avec timeout pour éviter les requêtes bloquantes
        axios.get(`${API_BASE_URL}/problems`, {
          params: {
            status: "OPEN",
            from: "-60d",
            debug: "true"
          },
          timeout: 30000 // 30 secondes max
        }),
        
        // Problèmes récents des 72 dernières heures
        axios.get(`${API_BASE_URL}/problems`, {
          params: {
            status: "ALL", // Récupérer tous les problèmes (ouverts et résolus)
            from: "now-72h", // Des dernières 72 heures
            debug: "true"
          },
          timeout: 30000 // 30 secondes max
        })
      ]);
      
      console.log('Réponses reçues:', {
        active: activeResponse.data?.length || 0,
        recent: recentResponse.data?.length || 0
      });
      
      // Transformer les données
      const formattedActiveProblems = formatProblems(activeResponse.data || [], false);
      const formattedRecentProblems = formatProblems(recentResponse.data || [], true);
      
      // Mettre à jour les états
      setActiveProblems(formattedActiveProblems);
      setRecentProblems(formattedRecentProblems);
      setLastRefreshTime(new Date());
      
    } catch (error) {
      console.error('Erreur lors du chargement des problèmes:', error);
      setError('Erreur lors du chargement des problèmes. Veuillez réessayer.');
    } finally {
      // Petite temporisation pour l'UX
      setTimeout(() => {
        setIsRefreshing(false);
        requestInProgress.current = false;
      }, 500);
    }
  };
  
  // Formater les données de problèmes
  const formatProblems = (problems: any[], is72h: boolean): Problem[] => {
    if (!Array.isArray(problems)) {
      console.error('Les problèmes ne sont pas un tableau:', problems);
      return [];
    }
    
    console.log(`Formatage de ${problems.length} problèmes${is72h ? ' (72h)' : ''}`);
    
    // Afficher un exemple de problème pour le debug
    if (problems.length > 0) {
      console.log(`Exemple de problème brut:`, problems[0]);
    }
    
    return problems.map((problem) => {
      // Extraire le nom de l'hôte à partir des entités impactées (priorité)
      let hostName = '';
      
      // PRIORITÉ 1: Utiliser directement impactedEntities
      if (problem.impactedEntities && Array.isArray(problem.impactedEntities)) {
        const hostEntity = problem.impactedEntities.find((entity: any) => 
          entity.entityId && entity.entityId.type === 'HOST' && entity.name);
        if (hostEntity) {
          hostName = hostEntity.name;
        }
      }
      
      // PRIORITÉ 2: Si pas trouvé, utiliser le champ host ou impacted s'ils existent
      if (!hostName) {
        if (problem.host && problem.host !== "Non spécifié") {
          hostName = problem.host;
        } else if (problem.impacted && problem.impacted !== "Non spécifié") {
          hostName = problem.impacted;
        }
      }
      
      // PRIORITÉ 3: Si toujours pas trouvé, chercher dans le titre ou d'autres propriétés
      if (!hostName && problem.title) {
        // Parfois le nom d'hôte est dans le titre avec format "Host X is..."
        const hostMatch = problem.title.match(/Host\s+([^\s]+)/i);
        if (hostMatch && hostMatch[1]) {
          hostName = hostMatch[1];
        }
      }
      
      // Adapter le format d'affichage du temps en fonction du contexte (problèmes récents vs actifs)
      let timeDisplay = "Récent";
      
      if (problem.start_time) {
        // Format standard de start_time
        timeDisplay = is72h ? `Détecté le ${problem.start_time}` : `Depuis ${problem.start_time}`;
      } else if (problem.startTime) {
        // Conversion timestamp en date si nécessaire
        try {
          const startDate = new Date(problem.startTime);
          const formattedDate = startDate.toLocaleString('fr-FR');
          timeDisplay = is72h ? `Détecté le ${formattedDate}` : `Depuis ${formattedDate}`;
        } catch (e) {
          console.error('Erreur de conversion de startTime:', e);
        }
      }
      
      // Détermination de l'impact
      let impact: "ÉLEVÉ" | "MOYEN" | "FAIBLE" = "MOYEN";
      if (problem.impact) {
        if (typeof problem.impact === 'string') {
          if (problem.impact.toUpperCase() === "INFRASTRUCTURE") {
            impact = "ÉLEVÉ";
          } else if (problem.impact.toUpperCase() === "SERVICE") {
            impact = "MOYEN";
          } else if (problem.impact.toUpperCase() === "APPLICATION") {
            impact = "FAIBLE";
          }
        }
      } else if (problem.severityLevel) {
        // Essayer avec severityLevel si impact n'est pas disponible
        if (problem.severityLevel.toUpperCase() === "AVAILABILITY") {
          impact = "ÉLEVÉ";
        } else if (problem.severityLevel.toUpperCase() === "ERROR") {
          impact = "MOYEN";
        } else if (problem.severityLevel.toUpperCase() === "PERFORMANCE") {
          impact = "MOYEN";
        } else {
          impact = "FAIBLE";
        }
      }
      
      // Détermination du statut
      let problemStatus: "critical" | "warning" | "low" = "warning";
      if (problem.status) {
        if (problem.status === "OPEN") {
          problemStatus = "critical";
        } else {
          problemStatus = "warning";
        }
      } else {
        // Si pas de statut, utiliser resolved
        problemStatus = problem.resolved ? "warning" : "critical";
      }
      
      // Zone - parfois dans problem.zone, parfois dans managementZones
      let zone = "Non spécifié";
      if (problem.zone) {
        zone = problem.zone;
      } else if (problem.managementZones && problem.managementZones.length > 0) {
        // Prendre la première management zone
        zone = problem.managementZones[0].name;
      } else if (problem.matching_mz) {
        // Si le backend a déjà trouvé et ajouté la MZ correspondante
        zone = problem.matching_mz;
      }
      
      // Services impactés
      let servicesImpacted = "0";
      if (problem.affected_entities !== undefined) {
        servicesImpacted = problem.affected_entities.toString();
      } else if (problem.affectedEntities !== undefined) {
        servicesImpacted = problem.affectedEntities.toString();
      } else if (problem.impactedEntities && Array.isArray(problem.impactedEntities)) {
        const serviceEntities = problem.impactedEntities.filter((entity: any) => 
          entity.entityId && entity.entityId.type === 'SERVICE');
        servicesImpacted = serviceEntities.length.toString();
      }
      
      return {
        id: problem.id || `PROB-${Math.random().toString(36).substr(2, 9)}`,
        title: problem.title || "Problème inconnu",
        code: problem.id ? problem.id.substring(0, 7) : "UNKNOWN",
        subtitle: `${zone} - Impact: ${impact}`,
        time: timeDisplay,
        type: impact === "ÉLEVÉ" ? "Problème d'Infrastructure" : "Problème de Service",
        status: problemStatus,
        impact: impact,
        zone: zone,
        servicesImpacted: servicesImpacted,
        dt_url: problem.dt_url || "#",
        duration: problem.duration || "",
        resolved: problem.resolved || false,
        host: hostName,
        impacted: hostName,
        impactedEntities: problem.impactedEntities,
        rootCauseEntity: problem.rootCauseEntity
      };
    });
  };
  
  // Charger les problèmes au premier rendu
  useEffect(() => {
    loadProblems();
    
    // Configurer un intervalle de rafraîchissement toutes les 5 minutes
    const intervalId = setInterval(() => {
      console.log('Rafraîchissement automatique des problèmes...');
      loadProblems();
    }, 300000); // 5 minutes
    
    // Nettoyer l'intervalle lors du démontage du composant
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  // Gérer le changement d'onglet
  const handleTabChange = (tab: 'active' | 'recent') => {
    setActiveTab(tab);
  };
  
  // Retour au tableau de bord
  const handleBackClick = () => {
    navigate('/');
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
          onClick={loadProblems}
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
              Tous les Problèmes {activeTab === 'active' ? 'Actifs' : 'des 72 dernières heures'}
            </h2>
            <p className="text-slate-300">
              {activeTab === 'active' 
                ? "Suivi en temps réel de tous les incidents et anomalies actuellement actifs (VFG et VFE)"
                : "Historique consolidé de tous les incidents survenus durant les 72 dernières heures (VFG et VFE)"}
            </p>
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
            <span>Récents (72h)</span>
            {recentProblems?.length > 0 && (
              <span className="ml-2 bg-amber-900/60 text-amber-200 rounded-full px-2 py-0.5 text-xs">
                {recentProblems.length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Contenu de l'onglet actif */}
      <div className="mt-6">
        {isRefreshing && problemsToDisplay.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-400">Chargement des problèmes...</span>
          </div>
        ) : problemsToDisplay.length > 0 ? (
          <ProblemsList 
            problems={problemsToDisplay || []} 
            title={activeTab === 'active' ? "Tous les problèmes actifs" : "Tous les problèmes des 72 dernières heures"}
            showRefreshButton={true}
            onRefresh={loadProblems}
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

export default AllProblemsView;