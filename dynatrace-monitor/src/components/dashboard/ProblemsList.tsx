import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import ProblemCard from '../common/ProblemCard';
import { Problem } from '../../api/types';
import { useApp } from '../../contexts/AppContext';

interface ProblemsListProps {
  problems: Problem[];
  zoneFilter?: string;
  title?: string;
  showRefreshButton?: boolean;
}

const ProblemsList: React.FC<ProblemsListProps> = ({ 
  problems, 
  zoneFilter,
  title = "Problèmes assignés aux Management Zones",
  showRefreshButton = true
}) => {
  const { refreshData, isLoading } = useApp();
  
  // Récupérer le type de dashboard actuel (vfg ou vfe)
  const dashboardType = window.location.pathname.includes('vfe') ? 'vfe' : 'vfg';
  
  // Fonction pour rafraîchir uniquement les problèmes
  const handleRefreshProblems = () => {
    refreshData(dashboardType as 'vfg' | 'vfe', true);
  };
  // Si un filtre de zone est fourni, filtrer les problèmes pour cette zone
  const filteredProblems = zoneFilter 
    ? problems.filter(problem => problem.zone === zoneFilter)
    : problems;

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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500" />
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {title}
            <div className="ml-1 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full font-bold text-xs">
              {filteredProblems.length}
            </div>
          </h2>
        </div>
        
        {/* Bouton de rafraîchissement des problèmes en temps réel */}
        {showRefreshButton && (
          <button 
            onClick={handleRefreshProblems}
            disabled={isLoading.problems}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Rafraîchir les problèmes en temps réel"
          >
            <RefreshCw size={12} className={`${isLoading.problems ? 'animate-spin' : ''}`} />
            {isLoading.problems ? 'Rafraîchissement...' : 'Rafraîchir'}
          </button>
        )}
      </div>
      
      {filteredProblems.map(problem => (
        <ProblemCard key={problem.id} problem={problem} />
      ))}
    </section>
  );
};

export default ProblemsList;