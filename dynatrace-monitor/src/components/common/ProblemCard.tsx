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

  // Extraire les informations sur l'entité impactée (hôte, service, etc.)
  const getHostInfo = (problem: Problem): string => {
    // Liste des mots à exclure qui ne sont jamais des noms d'hôtes
    const excludedWords = [
      'segmentation', 'script', 'extension', 'status', 'service', 'such', 'still',
      'some', 'system', 'server', 'memory', 'application', 'error', 'timeout',
      'warning', 'critical', 'problem', 'issue', 'failure', 'module', 'process',
      'container', 'function', 'instance', 'request', 'being', 'response', 'health',
      'payload', 'execution', 'processing', 'action', 'object', 'storage', 'config',
      'socket', 'network', 'security', 'traffic', 'information', 'resource'
    ];
    
    // Fonction d'aide pour vérifier si un nom potentiel d'hôte est valide
    const isValidHostname = (name: string): boolean => {
      if (!name || name.length < 3 || name.length > 50) return false;
      
      // Convertir en minuscules pour la comparaison
      const lowerName = name.toLowerCase();
      
      // Vérifier si le nom est dans la liste d'exclusion
      if (excludedWords.includes(lowerName)) return false;
      
      // Pattern spécifique pour les serveurs de l'entreprise (sv01XXXXX.fr.net.intra)
      const enterpriseServerPattern = /^s[a-z0-9]\d{2,}[a-z0-9]*\.fr\.net\.intra$/i;
      if (enterpriseServerPattern.test(name)) {
        return true;
      }

      // Pattern pour les serveurs commençant par s suivi de chiffres
      const sServerPattern = /^s[a-z0-9]\d{2,}[a-z0-9]*$/i;
      if (sServerPattern.test(name)) {
        return true;
      }

      // Le pattern pour les serveurs avec format sv##, s### ou sv#### est fortement susceptible d'être un serveur
      if (/^s[a-z]?\d{2,}[a-z0-9]*$/i.test(lowerName)) {
        return true;
      }

      // Si le nom commence par win/srv suivi de chiffres, c'est probablement un serveur windows
      if (/^(win|srv)[a-z0-9]*\d+/i.test(lowerName)) {
        return true;
      }

      // Si le nom contient des segments séparés par des points, ressemble à un FQDN et contient des chiffres
      if (/^[a-z0-9][-a-z0-9]*\.[a-z0-9][-a-z0-9.]+$/i.test(lowerName) && /\d/.test(lowerName)) {
        return true;
      }

      // Certains mots courts ou expressions génériques ne devraient jamais être considérés comme des hôtes
      if (name.length < 6 && !/\d/.test(name)) {
        return false;
      }

      // Filtrer les cas où le nom contient des mots comme "error", "warning", "critical"
      // au milieu de la chaîne (par exemple "script error handling")
      for (const word of excludedWords) {
        if (lowerName.includes(word) && lowerName !== word) {
          return false;
        }
      }
      
      // Vérifier que le nom contient au moins un chiffre - très souvent les serveurs ont des numéros
      // ET commence par 's' ou a un format de nom d'hôte avec points ou tirets
      return (
        (lowerName.startsWith('s') && /\d/.test(lowerName)) ||
        (/\d/.test(lowerName) && (lowerName.includes('.') || lowerName.includes('-')))
      );
    };
    
    // PRIORITÉ 1: Utiliser le champ impacted car il a été rempli par le backend en priorité
    // C'est le champ le plus fiable car il contient déjà le meilleur nom d'hôte trouvé par le backend
    if (problem.impacted && problem.impacted !== "Non spécifié") {
      return problem.impacted;
    }

    // PRIORITÉ 2: Utiliser le champ host s'il existe
    if (problem.host && problem.host !== "Non spécifié") {
      return problem.host;
    }

    // PRIORITÉ 3: Utiliser impactedEntities s'il existe et contient des entités
    if (problem.impactedEntities && Array.isArray(problem.impactedEntities)) {
      for (const entity of problem.impactedEntities) {
        // Vérifier d'abord si c'est un HOST (priorité la plus élevée)
        if (entity.entityId && entity.entityId.type === 'HOST' && entity.name) {
          return entity.name;
        }
      }

      // Si aucun HOST n'est trouvé, chercher d'autres types d'entités (SERVICE, PROCESS_GROUP, etc.)
      for (const entity of problem.impactedEntities) {
        if (entity.entityId && entity.name) {
          return entity.name;
        }
      }
    }

    // PRIORITÉ 4: Rechercher dans rootCauseEntity
    if (problem.rootCauseEntity && problem.rootCauseEntity.name) {
      if (isValidHostname(problem.rootCauseEntity.name)) {
        return problem.rootCauseEntity.name;
      }
    }

    // PRIORITÉ 5: Rechercher après "impacted:" ou "host:" ou "server:" dans le sous-titre ou titre
    const impactedTexts = `${problem.title || ''} ${problem.subtitle || ''}`;
    const hostIndicators = [
      /\bhost:\s*([^\s,.;]+)/i,
      /\bserver:\s*([^\s,.;]+)/i,
      /\bimpacted:\s*([^\s,.;]+)/i,
      /\bon\s+([^\s,.;]+)/i,
      /\bat\s+([^\s,.;]+)/i
    ];

    for (const pattern of hostIndicators) {
      const match = impactedTexts.match(pattern);
      if (match && match[1] && isValidHostname(match[1])) {
        return match[1];
      }
    }

    // PRIORITÉ 6: Rechercher un nom d'hôte dans le titre ou sous-titre avec des patterns spécifiques
    const textToSearch = `${problem.title || ''} ${problem.subtitle || ''}`;

    // Patterns spécifiques pour les serveurs - ordre du plus spécifique au moins spécifique
    const serverPatterns = [
      /\b(s[a-z0-9]\d{2,}[a-z0-9]*\.fr\.net\.intra)\b/i,  // Format sv01XXXXX.fr.net.intra
      /\b(s[a-z0-9]\d{2,}[a-z0-9]*)\b/i,                  // Format sX##... (ex: s001, sv01, etc.)
      /\b(srv\d+[a-z0-9]*)\b/i,                           // Format srv## (serveurs standard)
      /\b(win[a-z0-9]*\d+[a-z0-9]*)\b/i,                  // Serveurs Windows avec des chiffres
      /\b([a-z][a-z0-9]{2,}-[a-z0-9]{2,})\b/i             // Serveurs avec format prefix-name (au moins 3 chars)
    ];

    for (const pattern of serverPatterns) {
      const matches = textToSearch.match(new RegExp(pattern, 'gi')) || [];
      for (const match of matches) {
        if (isValidHostname(match)) {
          return match;
        }
      }
    }

    // Si aucun nom d'hôte valide n'a été trouvé, retourner "Non spécifié"
    return "Non spécifié";
  };
  
  const hostInfo = getHostInfo(problem);

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
      return <Server size={16} className="text-blue-400" />;
    } else if (type.includes('database')) {
      return <Database size={16} className="text-purple-400" />;
    } else if (type.includes('cpu') || type.includes('performance')) {
      return <Cpu size={16} className="text-amber-400" />;
    } else if (type.includes('service') || type.includes('application')) {
      return <RefreshCw size={16} className="text-green-400" />;
    } else if (type.includes('security')) {
      return <Shield size={16} className="text-red-400" />;
    } else {
      return <Monitor size={16} className="text-blue-400" />;
    }
  };

  // Fonction pour obtenir les classes de couleur selon le statut
  const getStatusColors = () => {
    if (isResolved) {
      return {
        bg: 'bg-emerald-900/20',
        border: 'border-emerald-700/30', 
        text: 'text-emerald-400',
        gradient: 'from-emerald-700/80 to-emerald-900/50',
        glow: 'hover:shadow-emerald-900/20',
      };
    } else {
      return {
        bg: 'bg-red-900/20',
        border: 'border-red-700/30',
        text: 'text-red-400',
        gradient: 'from-red-700/80 to-red-900/50',
        glow: 'hover:shadow-red-900/20',
      };
    }
  };

  const colors = getStatusColors();
  
  return (
    <div 
      className={`relative overflow-hidden rounded-xl transition-all duration-400 ease-out
                 ${expanded 
                  ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/95 shadow-xl transform-gpu -translate-y-1' 
                  : 'bg-gradient-to-br from-slate-800/70 to-slate-900/90 shadow-lg hover:shadow-xl hover:-translate-y-1'}
                 border ${expanded ? 'border-slate-700/70' : 'border-slate-800/50'}
                 ${expanded ? 'scale-105' : 'scale-100'}
                 group`}
    >
      {/* Indicateur de statut (barre colorée) avec animation */}
      <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${colors.gradient}
                      ${expanded ? 'animate-pulse-subtle' : 'group-hover:animate-pulse-subtle'}`}>
      </div>

      {/* En-tête du problème - Toujours visible */}
      <div 
        className={`flex justify-between items-center py-4 px-5 border-b cursor-pointer transition-all duration-300
                  ${expanded 
                    ? 'border-slate-700/50 bg-gradient-to-r from-slate-800/90 to-slate-850/90' 
                    : 'border-slate-700/30 group-hover:border-slate-700/50'}`}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3.5 flex-grow min-w-0">
          {/* Icône de statut avec animation et effet de lueur */}
          <div className={`relative flex-shrink-0 ${expanded ? '' : 'group-hover:scale-110'} transition-all duration-300`}>
            {/* Effet de lueur derrière l'icône */}
            <div className={`absolute inset-0 rounded-full ${colors.bg} blur-md opacity-70 
                          ${expanded ? 'animate-pulse-slow' : 'group-hover:animate-pulse-slow'}`}
                 style={{ transform: 'scale(1.2)' }}></div>
            
            {isResolved ? (
              <CheckCircle className={`${colors.text} relative z-10`} size={20} />
            ) : (
              <AlertTriangle className={`${colors.text} relative z-10`} size={20} />
            )}
          </div>
          
          {/* Titre et sous-titre */}
          <div className="min-w-0 flex-grow">
            <div className="font-medium text-white flex items-center gap-2 flex-wrap">
              <span className="truncate">{problem.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-semibold whitespace-nowrap shadow-sm
                            ${isResolved ? 'badge-success' : 'badge-error'}`}>
                {problem.code}
              </span>
            </div>
            <div className="text-xs text-slate-400 truncate mt-0.5">{problem.subtitle}</div>
          </div>
        </div>
        
        {/* Côté droit: durée et bouton pour étendre/réduire */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className={`text-xs ${colors.text} flex items-center gap-1.5 whitespace-nowrap`}>
            <Clock size={14} className={`${colors.text}`} />
            <span className="font-medium">{problem.time}</span>
          </div>
          <div className={`transition-transform duration-300 ${expanded ? 'rotate-180' : 'group-hover:translate-y-0.5'}`}>
            <ChevronDown size={16} className={`${expanded ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400'}`} />
          </div>
        </div>
      </div>
      
      {/* Deuxième ligne: informations sur la machine et la durée - Toujours visible */}
      <div className="flex flex-wrap items-center justify-between py-3 px-5 bg-slate-800/40 backdrop-blur-sm border-b border-slate-700/30">
        {/* Informations sur l'entité impactée */}
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-900/40 border border-blue-700/30">
            <Server size={14} className="text-blue-400" />
          </div>
          <span className="text-blue-300 font-medium mr-1">Entité:</span>
          <span className="text-slate-300 font-semibold">{hostInfo !== "Non spécifié" ? hostInfo : "Non spécifiée"}</span>
        </div>
        
        {/* Durée du problème */}
        {problem.duration && (
          <div className="flex items-center gap-2 text-sm mt-2 sm:mt-0">
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-amber-900/40 border border-amber-700/30">
              <Clock size={14} className="text-amber-400" />
            </div>
            <span className="text-amber-300 font-medium mr-1">Durée:</span>
            <span className="text-slate-300 font-semibold">{problem.duration}</span>
          </div>
        )}
      </div>
      
      {/* Détails du problème - Visibles uniquement lorsque la carte est étendue */}
      {expanded && (
        <div className="p-5 bg-gradient-to-b from-slate-800/40 to-slate-850/20 border-b border-slate-700/30">
          {/* Grille pour les métriques détaillées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            {/* Type de problème */}
            <div className="glass-card p-3.5 hover-lift">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-indigo-900/40 border border-indigo-700/30">
                  {getProblemTypeIcon()}
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">TYPE DE PROBLÈME</div>
              </div>
              <div className="text-sm text-white font-medium">{problem.type}</div>
            </div>
            
            {/* Hôte/Machine affecté */}
            <div className="glass-card p-3.5 hover-lift">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-900/40 border border-blue-700/30">
                  <Server size={14} className="text-blue-400" />
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">ENTITÉ IMPACTÉE</div>
              </div>
              <div className="text-sm">
                {hostInfo ? (
                  <span className="font-medium text-blue-300">{hostInfo.replace(/^HOST:\s*/, '')}</span>
                ) : (
                  <span className="text-slate-400">Non spécifié</span>
                )}
              </div>
            </div>
            
            {/* Zone affectée */}
            <div className="glass-card p-3.5 hover-lift">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-900/40 border border-emerald-700/30">
                  <Shield size={14} className="text-emerald-400" />
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">ZONE AFFECTÉE</div>
              </div>
              <div className="text-sm text-emerald-300 font-medium">{problem.zone}</div>
            </div>
            
            {/* Services impactés */}
            {problem.servicesImpacted && (
              <div className="glass-card p-3.5 hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-900/40 border border-blue-700/30">
                    <RefreshCw size={14} className="text-blue-400" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">SERVICES IMPACTÉS</div>
                </div>
                <div className="text-sm flex items-center gap-1.5">
                  <span className="text-blue-300 font-bold">{problem.servicesImpacted}</span>
                  <span className="text-slate-400">service(s)</span>
                </div>
              </div>
            )}
            
            {/* Temps de réponse */}
            {problem.responseTime && (
              <div className="glass-card p-3.5 hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-amber-900/40 border border-amber-700/30">
                    <Clock size={14} className="text-amber-400" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">TEMPS DE RÉPONSE</div>
                </div>
                <div className="text-sm font-medium text-amber-300">{problem.responseTime}</div>
              </div>
            )}
            
            {/* Utilisation CPU */}
            {problem.cpuUsage && (
              <div className="glass-card p-3.5 hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-red-900/40 border border-red-700/30">
                    <Cpu size={14} className="text-red-400" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">UTILISATION CPU</div>
                </div>
                <div className="text-sm font-medium text-red-300">{problem.cpuUsage}</div>
              </div>
            )}
            
            {/* Taux d'erreur */}
            {problem.errorRate && (
              <div className="glass-card p-3.5 hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-red-900/40 border border-red-700/30"> 
                    <AlertTriangle size={14} className="text-red-400" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">TAUX D'ERREUR</div>
                </div>
                <div className="text-sm font-medium text-red-300">{problem.errorRate}</div>
              </div>
            )}
            
            {/* Utilisateurs affectés */}
            {problem.usersAffected && (
              <div className="glass-card p-3.5 hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-purple-900/40 border border-purple-700/30">
                    <Users size={14} className="text-purple-400" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">UTILISATEURS AFFECTÉS</div>
                </div>
                <div className="text-sm font-medium text-purple-300">{problem.usersAffected}</div>
              </div>
            )}
            
            {/* Transactions échouées */}
            {problem.failedTransactions && (
              <div className="glass-card p-3.5 hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-red-900/40 border border-red-700/30">
                    <BarChart3 size={14} className="text-red-400" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">TRANSACTIONS ÉCHOUÉES</div>
                </div>
                <div className="text-sm font-medium text-red-300">{problem.failedTransactions}</div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Pied de page - Toujours visible */}
      <div className="flex justify-between items-center py-3 px-5 border-t border-slate-700/30">
        {/* Niveau d'impact */}
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <span>Impact:</span>
          <span className={`uppercase px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
            problem.impact === 'MOYEN' 
              ? 'badge-warning' 
              : problem.impact === 'ÉLEVÉ' 
                ? 'badge-error' 
                : 'badge-success'
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
          className={`flex items-center gap-1.5 text-xs hover-glow transition-all duration-300 px-3 py-1.5 rounded-full
                     ${isResolved
                       ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 border border-emerald-700/30'
                       : 'text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 border border-indigo-700/30'
                     }
                     hover:shadow-md ${isResolved ? 'hover:shadow-emerald-900/20' : 'hover:shadow-indigo-900/20'}`}
        >
          <ExternalLink size={12} />
          Détails complets
        </a>
      </div>
    </div>
  );
};

export default ProblemCard;
