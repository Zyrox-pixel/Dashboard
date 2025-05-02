import React, { useState } from 'react';
import { 
  AlertTriangle, ExternalLink, CheckCircle, ChevronDown, ChevronUp, 
  Clock, Server, Database, Cpu, Users, BarChart3, Shield, RefreshCw, Monitor
} from 'lucide-react';
import { Problem } from '../../api/types';

interface ProblemCardProps {
  problem: Problem;
}

const ProblemCard: React.FC<ProblemCardProps> = ({ problem }) => {
  // État pour gérer l'expansion/réduction de la carte
  const [expanded, setExpanded] = useState<boolean>(false);
  
  // Vérifier si le problème est résolu
  const isResolved = problem.resolved || false;

  // Extraire les informations sur la machine/hôte
  // Extraire le nom de l'hôte impacté à partir des informations disponibles
  const getHostInfo = () => {
    // 1. Vérifier d'abord si le nom de l'hôte est explicitement disponible 
    // dans la propriété host du problème
    if (problem.host && problem.host !== "Non spécifié") {
      return problem.host;
    }
    
    // 2. Si le problème a un impact ou sous-titre mentionnant un hôte, l'extraire
    if (problem.subtitle) {
      // Extraire des motifs d'hôte comme "HOST_NAME = quelquechose" ou similaire
      const hostMatch = problem.subtitle.match(/HOST[_\s]?NAME[_\s]?=\s*([^,\s]+)/i);
      if (hostMatch && hostMatch[1]) {
        return hostMatch[1];
      }
      
      // Amélioration des patterns pour extraire des informations du champ "impacted" 
      // 2.1 Chercher des motifs comme "impacted: HOST quelquechose"
      const impactedPatterns = [
        // Pattern standard: "impacted: HOSTNAME" ou "impacted HOSTNAME"
        /impacted:?\s*([a-zA-Z0-9_\.-]+)/i,
        // Pattern avec préfixe: "impacted: HOST-123ABC"
        /impacted:?\s*([a-zA-Z0-9]+-[a-zA-Z0-9_\.]+)/i,
        // Pattern plus générique: chercher après "impacted:" avec des caractères non-alphanumériques autour
        /impacted:?\s*[^a-zA-Z0-9]*\s*([a-zA-Z0-9][a-zA-Z0-9_\.-]+)/i,
        // Pattern avec le nom de l'hôte entre parenthèses ou crochets
        /impacted:?\s*[\(\[\{]([a-zA-Z0-9][a-zA-Z0-9_\.-]+)[\)\]\}]/i,
        // Pattern pour les cas où le nom est entre guillemets
        /impacted:?\s*["']([^"']+)["']/i
      ];
      
      for (const pattern of impactedPatterns) {
        const match = problem.subtitle.match(pattern);
        if (match && match[1] && match[1].length > 2) {
          // Ignorer les valeurs qui ne ressemblent pas à des noms d'hôtes (comme des nombres seuls)
          if (!/^\d+$/.test(match[1]) && match[1].toLowerCase() !== 'host') {
            return match[1];
          }
        }
      }
      
      // 2.2 Examiner également les formats spécifiques de Dynatrace
      // Chercher des motifs comme "HOST PRODSEC-HOSTNAME is affected"
      const hostAffectedMatch = problem.subtitle.match(/HOST\s+([a-zA-Z0-9][a-zA-Z0-9_\.-]+)\s+is\s+(affected|impacted)/i);
      if (hostAffectedMatch && hostAffectedMatch[1]) {
        return hostAffectedMatch[1];
      }
      
      // 2.3 Chercher des patterns spécifiques pour PRODSEC suivi d'un nom d'hôte
      const prodsecHostMatch = problem.subtitle.match(/PRODSEC[_\s\.-]+([a-zA-Z0-9][a-zA-Z0-9_\.-]+)/i);
      if (prodsecHostMatch && prodsecHostMatch[1]) {
        return prodsecHostMatch[1];
      }
    }
    
    // 3. Extraire l'hôte du titre si possible
    if (problem.title) {
      // 3.1 Rechercher les hôtes mentionnés explicitement
      const hostRegex = /\b(host|hôte|server|machine|instance)\s+([a-zA-Z0-9_\.-]+)\b/i;
      const hostMatch = problem.title.match(hostRegex);
      if (hostMatch && hostMatch[2]) {
        return hostMatch[2];
      }
      
      // 3.2 Si le titre mentionne un problème lié à l'infrastructure, chercher les noms de serveurs
      if (problem.title.toLowerCase().includes('infrastructure') && 
          problem.title.match(/[a-zA-Z0-9]+-[a-zA-Z0-9]+/)) {
        // Extraire les motifs qui ressemblent à des noms de serveurs (ex: STG1-PROD, APP-DB001)
        const serverMatch = problem.title.match(/\b([a-zA-Z0-9]+-[a-zA-Z0-9]+)\b/);
        if (serverMatch && serverMatch[1]) {
          return serverMatch[1];
        }
      }
      
      // 3.3 Rechercher l'expression "impacted" dans le titre avec les mêmes patterns
      for (const pattern of [
        /\bimpacted\s+([a-zA-Z0-9][a-zA-Z0-9_\.-]+)/i,
        /\bimpacted:?\s*[^a-zA-Z0-9]*\s*([a-zA-Z0-9][a-zA-Z0-9_\.-]+)/i,
        /\bimpacted:?\s*[\(\[\{]([a-zA-Z0-9][a-zA-Z0-9_\.-]+)[\)\]\}]/i
      ]) {
        const match = problem.title.match(pattern);
        if (match && match[1] && match[1].length > 2 && !/^\d+$/.test(match[1]) && match[1].toLowerCase() !== 'host') {
          return match[1];
        }
      }
      
      // 3.4 Chercher des indicateurs PRODSEC dans le titre également
      const prodsecTitleMatch = problem.title.match(/PRODSEC[_\s\.-]+([a-zA-Z0-9][a-zA-Z0-9_\.-]+)/i);
      if (prodsecTitleMatch && prodsecTitleMatch[1]) {
        return prodsecTitleMatch[1];
      }
    }
    
    // 4. Si le type est lié à l'infrastructure, essayer d'extraire un nom de serveur
    if (problem.type && problem.type.toLowerCase().includes('infrastructure')) {
      const titleParts = problem.title.split(/\s+/);
      // 4.1 Rechercher un mot qui ressemble à un nom de serveur (contient un tiret ou un point)
      for (const part of titleParts) {
        if ((part.includes('-') || part.includes('.')) && 
            /^[a-zA-Z0-9_\.-]+$/.test(part) && 
            part.length > 3) {
          return part;
        }
      }
      
      // 4.2 Pour les problèmes d'infrastructure, chercher aussi dans le sous-titre
      if (problem.subtitle) {
        const subtitleParts = problem.subtitle.split(/\s+/);
        for (const part of subtitleParts) {
          if ((part.includes('-') || part.includes('.')) && 
              /^[a-zA-Z0-9_\.-]+$/.test(part) && 
              part.length > 3 && 
              !/^\d+\.\d+\.\d+$/.test(part) && // Ne pas prendre les versions comme 1.2.3
              !/^\d+\.?\d*[%]?$/.test(part)) { // Ne pas prendre les pourcentages
            return part;
          }
        }
      }
    }
    
    // Par défaut, retourner la zone comme contexte ou "Non spécifié"
    return problem.zone || "Non spécifié";
  };
  
  const hostInfo = getHostInfo();
  
  // Extraire la date du problème pour l'affichage
  const startDate = problem.time?.replace('Depuis ', '') || '';
  
  // Toggle pour étendre/réduire la carte
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Fonction pour obtenir l'icône appropriée pour le type de problème
  const getProblemTypeIcon = () => {
    const type = problem.type?.toLowerCase() || '';
    
    if (type.includes('infrastructure') || type.includes('host')) {
      return <Server size={14} className="text-blue-400" />;
    } else if (type.includes('database')) {
      return <Database size={14} className="text-purple-400" />;
    } else if (type.includes('cpu') || type.includes('performance')) {
      return <Cpu size={14} className="text-amber-400" />;
    } else if (type.includes('service') || type.includes('application')) {
      return <RefreshCw size={14} className="text-green-400" />;
    } else if (type.includes('security')) {
      return <Shield size={14} className="text-red-400" />;
    } else {
      return <Monitor size={14} className="text-blue-400" />;
    }
  };
  
  return (
    <div className={`relative rounded-md overflow-hidden border ${expanded ? 'border-blue-600' : 'border-slate-700'} 
                    bg-slate-800 dark:bg-slate-800 dark:border-slate-700 transition-all 
                    hover:shadow-md ${expanded ? 'shadow-md shadow-blue-900/30' : ''}`}>
      {/* Indicateur de statut (barre colorée) */}
      <div className={`absolute top-0 left-0 w-1 h-full ${isResolved ? 'bg-green-500' : 'bg-red-500'}`}></div>
      
      {/* En-tête du problème - Toujours visible */}
      <div 
        className={`flex justify-between items-center py-3 px-4 border-b ${
          expanded ? 'border-blue-800 bg-slate-800/80' : 'border-slate-700'
        } cursor-pointer`}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3 flex-grow">
          {/* Icône de statut */}
          {isResolved ? (
            <CheckCircle className="text-green-500 flex-shrink-0" size={18} />
          ) : (
            <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
          )}
          
          {/* Titre et sous-titre */}
          <div className="min-w-0 flex-grow">
            <div className="font-medium text-white flex items-center gap-2 flex-wrap dark:text-white">
              <span className="truncate">{problem.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                isResolved 
                  ? 'bg-green-900/50 text-green-400 border border-green-500/30' 
                  : 'bg-red-900/50 text-red-400 border border-red-500/30'
              }`}>
                {problem.code}
              </span>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-400 truncate">{problem.subtitle}</div>
          </div>
        </div>
        
        {/* Côté droit: durée et bouton pour étendre/réduire */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-300 dark:text-slate-300 flex items-center gap-1 whitespace-nowrap">
            <Clock size={12} className="text-blue-400" />
            <span>{problem.time}</span>
          </div>
          {expanded ? 
            <ChevronUp size={16} className="text-blue-400" /> : 
            <ChevronDown size={16} className="text-slate-400" />
          }
        </div>
      </div>
      
      {/* Deuxième ligne: informations sur la machine et la durée - Toujours visible */}
      <div className="flex flex-wrap items-center justify-between py-2 px-4 bg-slate-800/60 border-b border-slate-700">
        {/* Informations sur la machine */}
        <div className="flex items-center gap-1 text-sm">
          <Server size={14} className="text-blue-400" />
          <span className="text-blue-300 font-medium mr-1">Machine:</span>
          <span className="text-slate-300">{hostInfo}</span>
        </div>
        
        {/* Durée du problème */}
        {problem.duration && (
          <div className="flex items-center gap-1 text-sm">
            <Clock size={14} className="text-amber-400" />
            <span className="text-amber-300 font-medium mr-1">Durée:</span>
            <span className="text-slate-300">{problem.duration}</span>
          </div>
        )}
      </div>
      
      {/* Détails du problème - Visibles uniquement lorsque la carte est étendue */}
      {expanded && (
        <div className="p-3 bg-slate-800/30 border-b border-slate-700">
          {/* Grille pour les métriques détaillées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            {/* Type de problème */}
            <div className="bg-slate-800/80 rounded p-2 border border-slate-700">
              <div className="flex items-center gap-1 mb-1">
                {getProblemTypeIcon()}
                <div className="text-xs uppercase text-slate-400">TYPE DE PROBLÈME</div>
              </div>
              <div className="text-sm text-slate-300">{problem.type}</div>
            </div>
            
            {/* Hôte/Machine affecté */}
            <div className="bg-slate-800/80 rounded p-2 border border-slate-700">
              <div className="flex items-center gap-1 mb-1">
                <Server size={14} className="text-blue-400" />
                <div className="text-xs uppercase text-slate-400">MACHINE AFFECTÉE</div>
              </div>
              <div className="text-sm text-slate-300">
                {problem.host ? (
                  <span className="font-medium text-blue-300">{problem.host.replace(/^HOST:\s*/, '')}</span>
                ) : (
                  <span className="text-slate-400">Non spécifié</span>
                )}
              </div>
            </div>
            
            {/* Zone affectée */}
            <div className="bg-slate-800/80 rounded p-2 border border-slate-700">
              <div className="flex items-center gap-1 mb-1">
                <Shield size={14} className="text-emerald-400" />
                <div className="text-xs uppercase text-slate-400">ZONE AFFECTÉE</div>
              </div>
              <div className="text-sm text-slate-300">{problem.zone}</div>
            </div>
            
            {/* Services impactés */}
            {problem.servicesImpacted && (
              <div className="bg-slate-800/80 rounded p-2 border border-slate-700">
                <div className="flex items-center gap-1 mb-1">
                  <RefreshCw size={14} className="text-blue-400" />
                  <div className="text-xs uppercase text-slate-400">SERVICES IMPACTÉS</div>
                </div>
                <div className="text-sm flex items-center gap-1">
                  <span className="text-blue-400 font-bold">{problem.servicesImpacted}</span>
                  <span className="text-slate-400">service(s)</span>
                </div>
              </div>
            )}
            
            {/* Temps de réponse */}
            {problem.responseTime && (
              <div className="bg-slate-800/80 rounded p-2 border border-slate-700">
                <div className="flex items-center gap-1 mb-1">
                  <Clock size={14} className="text-amber-400" />
                  <div className="text-xs uppercase text-slate-400">TEMPS DE RÉPONSE</div>
                </div>
                <div className="text-sm text-amber-400">{problem.responseTime}</div>
              </div>
            )}
            
            {/* Utilisation CPU */}
            {problem.cpuUsage && (
              <div className="bg-slate-800/80 rounded p-2 border border-slate-700">
                <div className="flex items-center gap-1 mb-1">
                  <Cpu size={14} className="text-red-400" />
                  <div className="text-xs uppercase text-slate-400">UTILISATION CPU</div>
                </div>
                <div className="text-sm text-red-400">{problem.cpuUsage}</div>
              </div>
            )}
            
            {/* Taux d'erreur */}
            {problem.errorRate && (
              <div className="bg-slate-800/80 rounded p-2 border border-slate-700">
                <div className="flex items-center gap-1 mb-1">
                  <AlertTriangle size={14} className="text-red-400" />
                  <div className="text-xs uppercase text-slate-400">TAUX D'ERREUR</div>
                </div>
                <div className="text-sm text-red-400">{problem.errorRate}</div>
              </div>
            )}
            
            {/* Utilisateurs affectés */}
            {problem.usersAffected && (
              <div className="bg-slate-800/80 rounded p-2 border border-slate-700">
                <div className="flex items-center gap-1 mb-1">
                  <Users size={14} className="text-blue-400" />
                  <div className="text-xs uppercase text-slate-400">UTILISATEURS AFFECTÉS</div>
                </div>
                <div className="text-sm text-slate-300">{problem.usersAffected}</div>
              </div>
            )}
            
            {/* Transactions échouées */}
            {problem.failedTransactions && (
              <div className="bg-slate-800/80 rounded p-2 border border-slate-700">
                <div className="flex items-center gap-1 mb-1">
                  <BarChart3 size={14} className="text-red-400" />
                  <div className="text-xs uppercase text-slate-400">TRANSACTIONS ÉCHOUÉES</div>
                </div>
                <div className="text-sm text-slate-300">{problem.failedTransactions}</div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Pied de page - Toujours visible */}
      <div className="flex justify-between items-center py-2 px-4 border-t border-slate-700 dark:border-slate-700">
        {/* Niveau d'impact */}
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
        
        {/* Lien vers les détails complets */}
        <a 
          href={problem.dt_url || "#"} 
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()} // Empêcher la propagation du clic
          className={`flex items-center gap-1 text-xs ${
            isResolved
              ? 'text-green-400 hover:text-green-300 dark:text-green-400 dark:hover:text-green-300'
              : 'text-blue-400 hover:text-blue-300 dark:text-blue-400 dark:hover:text-blue-300'
          }`}
        >
          <ExternalLink size={12} />
          Détails complets
        </a>
      </div>
    </div>
  );
};

export default ProblemCard;