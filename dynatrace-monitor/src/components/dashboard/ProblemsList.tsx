import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ProblemCard from '../common/ProblemCard';
import { Problem } from '../../api/types';

interface ProblemsListProps {
  problems: Problem[];
  zoneFilter?: string;
  title?: string;
}

const ProblemsList: React.FC<ProblemsListProps> = ({ 
  problems, 
  zoneFilter,
  title = "Problèmes actifs sur les applications Vital for Group"
}) => {
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
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} className="text-red-500" />
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          {title}
          <div className="ml-1 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full font-bold text-xs">
            {filteredProblems.length}
          </div>
        </h2>
      </div>
      
      {filteredProblems.map(problem => (
        <ProblemCard key={problem.id} problem={problem} />
      ))}
    </section>
  );
};

export default ProblemsList;