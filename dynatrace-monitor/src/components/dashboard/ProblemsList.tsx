import React, { useState, useMemo } from 'react';
import { AlertTriangle, RefreshCw, CalendarRange, Clock, SortDesc, SortAsc, Filter } from 'lucide-react';
import ProblemCard from '../common/ProblemCard';
import { Problem } from '../../api/types';
import { useApp } from '../../contexts/AppContext';

interface ProblemsListProps {
  problems: Problem[];
  zoneFilter?: string;
  title?: string;
  showRefreshButton?: boolean;
}

// Helper pour extraire la date d'un problème (pour le regroupement)
const extractDateFromProblem = (problem: Problem): string => {
  // Extraire la date du champ time (ex: "Depuis 2023-04-15 14:30")
  const dateMatch = problem.time?.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch && dateMatch[1]) {
    return dateMatch[1];
  }
  return 'Date inconnue';
};

const ProblemsList: React.FC<ProblemsListProps> = ({ 
  problems, 
  zoneFilter,
  title = "Problèmes assignés aux Management Zones",
  showRefreshButton = true
}) => {
  const { refreshData, isLoading } = useApp();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // plus récent d'abord par défaut
  const [groupByDate, setGroupByDate] = useState<boolean>(true); // grouper par date par défaut
  
  // Récupérer le type de dashboard actuel (vfg ou vfe)
  const dashboardType = window.location.pathname.includes('vfe') ? 'vfe' : 'vfg';
  
  // Fonction pour rafraîchir uniquement les problèmes - version améliorée avec promesse
  const handleRefreshProblems = async () => {
    try {
      // Utiliser async/await pour gérer la promesse retournée par refreshData
      await refreshData(dashboardType as 'vfg' | 'vfe', true);
      console.log("Rafraîchissement des problèmes terminé avec succès");
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des problèmes:", error);
    }
  };

  // Fonction pour changer l'ordre de tri
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Fonction pour activer/désactiver le regroupement par date
  const toggleGroupByDate = () => {
    setGroupByDate(!groupByDate);
  };
  
  // Si un filtre de zone est fourni, filtrer les problèmes pour cette zone
  const filteredProblems = useMemo(() => {
    return zoneFilter 
      ? problems.filter(problem => problem.zone === zoneFilter)
      : problems;
  }, [problems, zoneFilter]);

  // Trier les problèmes par date
  const sortedProblems = useMemo(() => {
    return [...filteredProblems].sort((a, b) => {
      const dateA = extractDateFromProblem(a);
      const dateB = extractDateFromProblem(b);
      
      if (sortOrder === 'asc') {
        return dateA.localeCompare(dateB);
      } else {
        return dateB.localeCompare(dateA);
      }
    });
  }, [filteredProblems, sortOrder]);

  // Regrouper les problèmes par date si nécessaire
  const groupedProblems = useMemo(() => {
    if (!groupByDate) {
      return { 'Tous les problèmes': sortedProblems };
    }

    return sortedProblems.reduce((groups: { [key: string]: Problem[] }, problem) => {
      const date = extractDateFromProblem(problem);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(problem);
      return groups;
    }, {});
  }, [sortedProblems, groupByDate]);

  // Si aucun problème n'est trouvé après filtrage, afficher un message
  if (filteredProblems.length === 0) {
    return (
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-green-500" />
          <h2 className="text-lg font-bold flex items-center gap-2">
            {zoneFilter 
              ? `Aucun problème actif dans ${zoneFilter}` 
              : "Aucun problème actif"}
          </h2>
        </div>
        <div className="p-6 bg-slate-800 rounded-md border border-slate-700 text-slate-400">
          Tout semble fonctionner normalement. Aucun problème n'est détecté actuellement.
        </div>
      </section>
    );
  }

  return (
    <section className="mb-5">
      {/* En-tête avec titre et contrôles */}
      <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500" />
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {title}
            <div className="ml-1 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full font-bold text-xs">
              {filteredProblems.length}
            </div>
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Contrôle pour le groupement par date */}
          <button 
            onClick={toggleGroupByDate}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              groupByDate 
                ? 'text-blue-300 bg-blue-900/40 border border-blue-700/50' 
                : 'text-slate-300 bg-slate-700 hover:bg-slate-600'
            }`}
            title={groupByDate ? "Désactiver le regroupement par date" : "Activer le regroupement par date"}
          >
            <CalendarRange size={12} />
            <span className="hidden sm:inline">Grouper par date</span>
          </button>
          
          {/* Contrôle pour l'ordre de tri */}
          <button 
            onClick={toggleSortOrder}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600"
            title={sortOrder === 'desc' ? "Trier du plus ancien au plus récent" : "Trier du plus récent au plus ancien"}
          >
            {sortOrder === 'desc' ? <SortDesc size={12} /> : <SortAsc size={12} />}
            <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}</span>
          </button>
          
          {/* Bouton de rafraîchissement des problèmes en temps réel */}
          {showRefreshButton && (
            <button 
              onClick={handleRefreshProblems}
              disabled={isLoading.problems}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Rafraîchir les problèmes en temps réel"
            >
              <RefreshCw size={12} className={`${isLoading.problems ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoading.problems ? 'Rafraîchissement...' : 'Rafraîchir'}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Affichage des problèmes regroupés par date */}
      {Object.entries(groupedProblems).map(([date, problems]) => (
        <div key={date} className="mb-6">
          {/* Afficher l'en-tête de date seulement si groupByDate est activé */}
          {groupByDate && (
            <div className="flex items-center gap-2 mb-2 py-1 px-3 bg-slate-700/50 rounded-md">
              <Clock size={14} className="text-blue-400" />
              <h3 className="text-sm font-medium text-blue-200">{date}</h3>
              <div className="ml-2 px-1.5 py-0.5 rounded-full bg-slate-600 text-xs text-slate-300">
                {problems.length}
              </div>
            </div>
          )}
          
          {/* Afficher les problèmes de cette date */}
          <div className="space-y-2">
            {problems.map(problem => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
};

export default ProblemsList;