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
    console.log('Debugging problem data for host extraction:', problem.id);
    
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
        console.log("Strong match with enterprise server pattern:", name);
        return true;
      }
      
      // Pattern pour les serveurs commençant par s suivi de chiffres
      const sServerPattern = /^s[a-z0-9]\d{2,}[a-z0-9]*$/i;
      if (sServerPattern.test(name)) {
        console.log("Good match with s-server pattern:", name);
        return true;
      }
      
      // Le pattern pour les serveurs avec format sv##, s### ou sv#### est fortement susceptible d'être un serveur
      if (/^s[a-z]?\d{2,}[a-z0-9]*$/i.test(lowerName)) {
        console.log("Likely a server with sv## or s### pattern:", name);
        return true;
      }
      
      // Si le nom commence par win/srv suivi de chiffres, c'est probablement un serveur windows
      if (/^(win|srv)[a-z0-9]*\d+/i.test(lowerName)) {
        console.log("Likely a Windows server:", name);
        return true;
      }
      
      // Si le nom contient des segments séparés par des points, ressemble à un FQDN et contient des chiffres
      if (/^[a-z0-9][-a-z0-9]*\.[a-z0-9][-a-z0-9.]+$/i.test(lowerName) && /\d/.test(lowerName)) {
        console.log("Likely a FQDN with numbers:", name);
        return true;
      }
      
      // Certains mots courts ou expressions génériques ne devraient jamais être considérés comme des hôtes
      if (name.length < 6 && !/\d/.test(name)) {
        console.log("Too short without numbers, not a hostname:", name);
        return false;
      }
      
      // Filtrer les cas où le nom contient des mots comme "error", "warning", "critical" 
      // au milieu de la chaîne (par exemple "script error handling")
      for (const word of excludedWords) {
        if (lowerName.includes(word) && lowerName !== word) {
          console.log(`Contains excluded word "${word}", not a hostname:`, name);
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
      console.log('Using explicit impacted field from backend:', problem.impacted);
      return problem.impacted;
    }
    
    // PRIORITÉ 2: Utiliser le champ host s'il existe
    if (problem.host && problem.host !== "Non spécifié") {
      console.log('Using explicit host field from backend:', problem.host);
      return problem.host;
    }
    
    // PRIORITÉ 3: Utiliser impactedEntities s'il existe et contient des entités
    if (problem.impactedEntities && Array.isArray(problem.impactedEntities)) {
      for (const entity of problem.impactedEntities) {
        // Vérifier d'abord si c'est un HOST (priorité la plus élevée)
        if (entity.entityId && entity.entityId.type === 'HOST' && entity.name) {
          console.log('Found HOST in impactedEntities:', entity.name);
          return entity.name;
        }
      }
      
      // Si aucun HOST n'est trouvé, chercher d'autres types d'entités (SERVICE, PROCESS_GROUP, etc.)
      for (const entity of problem.impactedEntities) {
        if (entity.entityId && entity.name) {
          console.log(`Found ${entity.entityId.type} in impactedEntities:`, entity.name);
          return entity.name;
        }
      }
    }
    
    // PRIORITÉ 4: Rechercher dans rootCauseEntity
    if (problem.rootCauseEntity && problem.rootCauseEntity.name) {
      if (isValidHostname(problem.rootCauseEntity.name)) {
        console.log('Using valid rootCauseEntity:', problem.rootCauseEntity.name);
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
        console.log(`Found valid host after "${pattern}":`, match[1]);
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
          console.log(`Found valid host with server pattern:`, match);
          return match;
        }
      }
    }
    
    // Si aucun nom d'hôte valide n'a été trouvé, retourner "Non spécifié"
    console.log('No valid hostname found for problem:', problem.id);
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
        {/* Informations sur l'entité impactée */}
        <div className="flex items-center gap-1 text-sm">
          <Server size={14} className="text-blue-400" />
          <span className="text-blue-300 font-medium mr-1">Entité impactée:</span>
          <span className="text-slate-300">{hostInfo !== "Non spécifié" ? hostInfo : "Non spécifiée"}</span>
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
                <div className="text-xs uppercase text-slate-400">ENTITÉ IMPACTÉE</div>
              </div>
              <div className="text-sm text-slate-300">
                {hostInfo ? (
                  <span className="font-medium text-blue-300">{hostInfo.replace(/^HOST:\s*/, '')}</span>
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