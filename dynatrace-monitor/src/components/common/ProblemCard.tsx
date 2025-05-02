import React from 'react';
import { AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';
import { Problem } from '../../api/types';

interface ProblemCardProps {
  problem: Problem;
}

const ProblemCard: React.FC<ProblemCardProps> = ({ problem }) => {
  // Vérifier si le problème est résolu (nouveau champ ajouté)
  const isResolved = problem.resolved || false;
  
  return (
    <div className="relative mb-3 rounded-md overflow-hidden border border-slate-700 bg-slate-800 dark:bg-slate-800 dark:border-slate-700">
      <div className={`absolute top-0 left-0 w-1 h-full ${isResolved ? 'bg-green-500' : 'bg-red-500'}`}></div>
      
      <div className="flex justify-between items-center py-3 px-4 border-b border-slate-700 dark:border-slate-700">
        <div className="flex items-center gap-3">
          {isResolved ? (
            <CheckCircle className="text-green-500" size={18} />
          ) : (
            <AlertTriangle className="text-red-500" size={18} />
          )}
          <div>
            <div className="font-medium text-white flex items-center gap-2 dark:text-white">
              {problem.title}
              <span className={`text-xs px-2 py-0.5 rounded ${
                isResolved 
                  ? 'bg-green-900/50 text-green-400 border border-green-500/30' 
                  : 'bg-red-900/50 text-red-400 border border-red-500/30'
              } dark:${isResolved ? 'bg-green-900/50 text-green-400 border-green-500/30' : 'bg-red-900/50 text-red-400 border-red-500/30'}`}>
                {problem.code}
              </span>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-400">{problem.subtitle}</div>
          </div>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-400">
          {problem.time}
        </div>
      </div>
      
      <div className="grid grid-cols-4 py-2 px-4 text-sm">
        <div>
          <div className="text-xs uppercase text-slate-500 mb-0.5 dark:text-slate-500">TYPE</div>
          <div className="text-slate-300 dark:text-slate-300">{problem.type}</div>
        </div>
        
        {problem.responseTime && (
          <div>
            <div className="text-xs uppercase text-slate-500 mb-0.5 dark:text-slate-500">TEMPS DE RÉPONSE</div>
            <div className="text-red-500 dark:text-red-500">{problem.responseTime}</div>
          </div>
        )}
        
        {problem.cpuUsage && (
          <div>
            <div className="text-xs uppercase text-slate-500 mb-0.5 dark:text-slate-500">CPU</div>
            <div className="text-red-500 dark:text-red-500">{problem.cpuUsage}</div>
          </div>
        )}
        
        {problem.errorRate && (
          <div>
            <div className="text-xs uppercase text-slate-500 mb-0.5 dark:text-slate-500">TAUX D'ERREUR</div>
            <div className="text-red-500 dark:text-red-500">{problem.errorRate}</div>
          </div>
        )}
        
        {problem.host && (
          <div>
            <div className="text-xs uppercase text-slate-500 mb-0.5 dark:text-slate-500">HÔTE</div>
            <div className="text-slate-300 dark:text-slate-300">{problem.host}</div>
          </div>
        )}
        
        {problem.servicesImpacted && (
          <div>
            <div className="text-xs uppercase text-slate-500 mb-0.5 dark:text-slate-500">SERVICES IMPACTÉS</div>
            <div className="text-slate-300 dark:text-slate-300">{problem.servicesImpacted}</div>
          </div>
        )}
        
        {problem.usersAffected && (
          <div>
            <div className="text-xs uppercase text-slate-500 mb-0.5 dark:text-slate-500">UTILISATEURS AFFECTÉS</div>
            <div className="text-slate-300 dark:text-slate-300">{problem.usersAffected}</div>
          </div>
        )}
        
        {problem.failedTransactions && (
          <div>
            <div className="text-xs uppercase text-slate-500 mb-0.5 dark:text-slate-500">TRANSACTIONS ÉCHOUÉES</div>
            <div className="text-slate-300 dark:text-slate-300">{problem.failedTransactions}</div>
          </div>
        )}
        
        {problem.duration && (
          <div>
            <div className="text-xs uppercase text-slate-500 mb-0.5 dark:text-slate-500">DURÉE</div>
            <div className="text-slate-300 dark:text-slate-300">{problem.duration}</div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center py-2 px-4 border-t border-slate-700 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400">
          <span>Impact:</span>
          <span className={`uppercase px-2 py-0.5 rounded text-xs font-medium ${
            problem.impact === 'MOYEN' 
              ? 'bg-yellow-600 text-white dark:bg-yellow-600 dark:text-white' 
              : problem.impact === 'ÉLEVÉ' 
                ? 'bg-red-600 text-white dark:bg-red-600 dark:text-white' 
                : 'bg-green-700 text-white dark:bg-green-700 dark:text-white'
          }`}>
            {problem.impact}
          </span>
        </div>
        <a 
          href="#" 
          className={`flex items-center gap-1 text-xs ${
            isResolved
              ? 'text-green-400 hover:text-green-300 dark:text-green-400 dark:hover:text-green-300'
              : 'text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300'
          }`}
        >
          <ExternalLink size={12} />
          Détails du problème
        </a>
      </div>
    </div>
  );
};

export default ProblemCard;