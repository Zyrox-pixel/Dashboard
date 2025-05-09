import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, ExternalLink, CheckCircle, ChevronDown, ChevronUp, 
  Clock, Server, Database, Cpu, Users, BarChart3, Shield, RefreshCw, 
  Monitor, Zap, Layers, Cloud, Code, Network, Workflow
} from 'lucide-react';
import { Problem } from '../../api/types';

interface ProblemCardProps {
  problem: Problem;
  showDetailsByDefault?: boolean;
  index?: number;
}

const ProblemCard: React.FC<ProblemCardProps> = ({ 
  problem, 
  showDetailsByDefault = false,
  index = 0 
}) => {
  // États pour gérer l'expansion/réduction de la carte
  const [expanded, setExpanded] = useState<boolean>(showDetailsByDefault);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  
  // Références pour les animations et interactions
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Vérifier si le problème est résolu
  const isResolved = problem.resolved || false;

  // Effet de montage avec délai pour les animations séquentielles
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100 + (index * 50)); // Décalage basé sur l'index
    return () => clearTimeout(timer);
  }, [index]);
  
  // Effet pour animer l'expansion/réduction du contenu
  useEffect(() => {
    if (isAnimating && contentRef.current) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300); // Durée de l'animation
      
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);
  
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
  
  // Fonction vide pour remplacer l'effet sonore
  const playToggleSound = () => {
    // Ne fait rien - suppression des effets sonores
  };
  
  // Toggle pour étendre/réduire la carte
  const toggleExpand = () => {
    setIsAnimating(true);
    setExpanded(!expanded);
    playToggleSound();
  };
  
  // Fonction pour obtenir l'icône appropriée pour le type de problème
  const getProblemTypeIcon = () => {
    const type = problem.type?.toLowerCase() || '';
    
    if (type.includes('infrastructure') || type.includes('host')) {
      return <Server size={14} className="text-cyan-400" />;
    } else if (type.includes('database')) {
      return <Database size={14} className="text-purple-400" />;
    } else if (type.includes('cpu') || type.includes('performance')) {
      return <Cpu size={14} className="text-amber-400" />;
    } else if (type.includes('service') || type.includes('application')) {
      return <RefreshCw size={14} className="text-emerald-400" />;
    } else if (type.includes('security')) {
      return <Shield size={14} className="text-red-400" />;
    } else if (type.includes('network')) {
      return <Network size={14} className="text-blue-400" />;
    } else if (type.includes('cloud')) {
      return <Cloud size={14} className="text-indigo-400" />;
    } else if (type.includes('code') || type.includes('exception')) {
      return <Code size={14} className="text-fuchsia-400" />;
    } else if (type.includes('process') || type.includes('workflow')) {
      return <Workflow size={14} className="text-orange-400" />;
    } else {
      return <Monitor size={14} className="text-blue-400" />;
    }
  };
  
  // Fonction pour obtenir la sévérité du problème
  const getSeverityClass = () => {
    if (isResolved) {
      return {
        bgColor: 'bg-emerald-500',
        textColor: 'text-emerald-500',
        borderColor: 'border-emerald-500/30',
        hoverBgColor: 'bg-emerald-900/20',
        glowColor: 'rgba(0, 255, 170, 0.5)'
      };
    }
    
    if (problem.impact === 'ÉLEVÉ') {
      return {
        bgColor: 'bg-red-500',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
        hoverBgColor: 'bg-red-900/20',
        glowColor: 'rgba(255, 53, 94, 0.5)'
      };
    } else if (problem.impact === 'MOYEN') {
      return {
        bgColor: 'bg-amber-500',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/30',
        hoverBgColor: 'bg-amber-900/20',
        glowColor: 'rgba(255, 165, 0, 0.5)'
      };
    } else {
      return {
        bgColor: 'bg-blue-500',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        hoverBgColor: 'bg-blue-900/20',
        glowColor: 'rgba(0, 158, 255, 0.5)'
      };
    }
  };
  
  // Classes de sévérité
  const severityClasses = getSeverityClass();
  
  return (
    <div 
      ref={cardRef}
      className={`relative rounded-xl overflow-hidden border ${
        expanded ? severityClasses.borderColor : 'border-indigo-900/30'
      } bg-[#14152e] transition-all duration-300 ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      } hover:shadow-lg ${
        isHovered ? 'shadow-lg' : ''
      }`}
      style={{
        transitionDelay: `${index * 50}ms`,
        boxShadow: isHovered ? `0 10px 25px rgba(0, 0, 0, 0.2), 0 0 10px ${severityClasses.glowColor}` : ''
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Indicateur de statut (barre colorée) */}
      <div className={`absolute top-0 left-0 w-1 h-full ${severityClasses.bgColor}`}></div>
      
      {/* En-tête du problème - Toujours visible */}
      <div 
        className={`flex justify-between items-center py-3 px-4 border-b ${
          expanded ? severityClasses.borderColor : 'border-indigo-900/30'
        } ${expanded ? 'bg-indigo-950/40' : ''} cursor-pointer transition-all duration-300`}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3 flex-grow">
          {/* Icône de statut */}
          {isResolved ? (
            <div className="relative">
              <CheckCircle className="text-emerald-500 flex-shrink-0" size={18} />
              {isHovered && (
                <span className="absolute -inset-1 bg-emerald-500/20 rounded-full blur animate-pulse-cosmic -z-10"></span>
              )}
            </div>
          ) : (
            <div className="relative">
              <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
              {isHovered && (
                <span className="absolute -inset-1 bg-red-500/20 rounded-full blur animate-pulse-cosmic -z-10"></span>
              )}
            </div>
          )}
          
          {/* Titre et sous-titre */}
          <div className="min-w-0 flex-grow">
            <div className="font-medium text-white flex items-center gap-2 flex-wrap">
              <span className="truncate">{problem.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-md whitespace-nowrap ${
                isResolved 
                  ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-red-900/50 text-red-300 border border-red-500/30'
              }`}>
                {problem.code}
              </span>
            </div>
            <div className="text-xs text-indigo-300 truncate">{problem.subtitle}</div>
          </div>
        </div>
        
        {/* Côté droit: durée et bouton pour étendre/réduire */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-indigo-200 flex items-center gap-1 whitespace-nowrap">
            <Clock size={12} className={severityClasses.textColor} />
            <span>{problem.time}</span>
          </div>
          {expanded ? 
            <ChevronUp size={16} className={severityClasses.textColor} /> : 
            <ChevronDown size={16} className="text-indigo-400" />
          }
        </div>
      </div>
      
      {/* Deuxième ligne: informations sur la machine et la durée - Toujours visible */}
      <div className="flex flex-wrap items-center justify-between py-2 px-4 bg-indigo-950/30 border-b border-indigo-900/30">
        {/* Informations sur l'entité impactée */}
        <div className="flex items-center gap-1 text-sm">
          <Server size={14} className="text-cyan-400" />
          <span className="text-cyan-300 font-medium mr-1">Entité impactée:</span>
          <span className="text-indigo-100">{hostInfo !== "Non spécifié" ? hostInfo : "Non spécifiée"}</span>
        </div>
        
        {/* Durée du problème */}
        {problem.duration && (
          <div className="flex items-center gap-1 text-sm">
            <Clock size={14} className="text-amber-400" />
            <span className="text-amber-300 font-medium mr-1">Durée:</span>
            <span className="text-indigo-100">{problem.duration}</span>
          </div>
        )}
      </div>
      
      {/* Détails du problème - Visibles uniquement lorsque la carte est étendue */}
      <div 
        ref={contentRef}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        } ${isAnimating ? 'transition-timing-function' : ''}`}
      >
        <div className="p-3 bg-indigo-950/20 border-b border-indigo-900/30">
          {/* Grille pour les métriques détaillées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            {/* Type de problème */}
            <div className="bg-[#191a3a]/80 backdrop-blur-sm rounded-lg p-2 border border-indigo-900/30 hover:border-indigo-800/30 transition-colors duration-300 hover:bg-[#1b1c3b]">
              <div className="flex items-center gap-1 mb-1">
                {getProblemTypeIcon()}
                <div className="text-xs uppercase text-indigo-400">TYPE DE PROBLÈME</div>
              </div>
              <div className="text-sm text-indigo-100">{problem.type}</div>
            </div>
            
            {/* Hôte/Machine affecté */}
            <div className="bg-[#191a3a]/80 backdrop-blur-sm rounded-lg p-2 border border-indigo-900/30 hover:border-indigo-800/30 transition-colors duration-300 hover:bg-[#1b1c3b]">
              <div className="flex items-center gap-1 mb-1">
                <Server size={14} className="text-cyan-400" />
                <div className="text-xs uppercase text-indigo-400">ENTITÉ IMPACTÉE</div>
              </div>
              <div className="text-sm">
                {hostInfo ? (
                  <span className="font-medium text-cyan-300">{hostInfo.replace(/^HOST:\s*/, '')}</span>
                ) : (
                  <span className="text-indigo-400">Non spécifié</span>
                )}
              </div>
            </div>
            
            {/* Zone affectée */}
            <div className="bg-[#191a3a]/80 backdrop-blur-sm rounded-lg p-2 border border-indigo-900/30 hover:border-indigo-800/30 transition-colors duration-300 hover:bg-[#1b1c3b]">
              <div className="flex items-center gap-1 mb-1">
                <Shield size={14} className="text-emerald-400" />
                <div className="text-xs uppercase text-indigo-400">ZONE AFFECTÉE</div>
              </div>
              <div className="text-sm text-indigo-100">{problem.zone}</div>
            </div>
            
            {/* Services impactés */}
            {problem.servicesImpacted && (
              <div className="bg-[#191a3a]/80 backdrop-blur-sm rounded-lg p-2 border border-indigo-900/30 hover:border-indigo-800/30 transition-colors duration-300 hover:bg-[#1b1c3b]">
                <div className="flex items-center gap-1 mb-1">
                  <RefreshCw size={14} className="text-blue-400" />
                  <div className="text-xs uppercase text-indigo-400">SERVICES IMPACTÉS</div>
                </div>
                <div className="text-sm flex items-center gap-1">
                  <span className="text-blue-400 font-bold">{problem.servicesImpacted}</span>
                  <span className="text-indigo-400">service(s)</span>
                </div>
              </div>
            )}
            
            {/* Temps de réponse */}
            {problem.responseTime && (
              <div className="bg-[#191a3a]/80 backdrop-blur-sm rounded-lg p-2 border border-indigo-900/30 hover:border-indigo-800/30 transition-colors duration-300 hover:bg-[#1b1c3b]">
                <div className="flex items-center gap-1 mb-1">
                  <Clock size={14} className="text-amber-400" />
                  <div className="text-xs uppercase text-indigo-400">TEMPS DE RÉPONSE</div>
                </div>
                <div className="text-sm text-amber-400">{problem.responseTime}</div>
              </div>
            )}
            
            {/* Utilisation CPU */}
            {problem.cpuUsage && (
              <div className="bg-[#191a3a]/80 backdrop-blur-sm rounded-lg p-2 border border-indigo-900/30 hover:border-indigo-800/30 transition-colors duration-300 hover:bg-[#1b1c3b]">
                <div className="flex items-center gap-1 mb-1">
                  <Cpu size={14} className="text-red-400" />
                  <div className="text-xs uppercase text-indigo-400">UTILISATION CPU</div>
                </div>
                <div className="text-sm text-red-400">{problem.cpuUsage}</div>
              </div>
            )}
            
            {/* Taux d'erreur */}
            {problem.errorRate && (
              <div className="bg-[#191a3a]/80 backdrop-blur-sm rounded-lg p-2 border border-indigo-900/30 hover:border-indigo-800/30 transition-colors duration-300 hover:bg-[#1b1c3b]">
                <div className="flex items-center gap-1 mb-1">
                  <AlertTriangle size={14} className="text-red-400" />
                  <div className="text-xs uppercase text-indigo-400">TAUX D'ERREUR</div>
                </div>
                <div className="text-sm text-red-400">{problem.errorRate}</div>
              </div>
            )}
            
            {/* Utilisateurs affectés */}
            {problem.usersAffected && (
              <div className="bg-[#191a3a]/80 backdrop-blur-sm rounded-lg p-2 border border-indigo-900/30 hover:border-indigo-800/30 transition-colors duration-300 hover:bg-[#1b1c3b]">
                <div className="flex items-center gap-1 mb-1">
                  <Users size={14} className="text-blue-400" />
                  <div className="text-xs uppercase text-indigo-400">UTILISATEURS AFFECTÉS</div>
                </div>
                <div className="text-sm text-indigo-100">{problem.usersAffected}</div>
              </div>
            )}
            
            {/* Transactions échouées */}
            {problem.failedTransactions && (
              <div className="bg-[#191a3a]/80 backdrop-blur-sm rounded-lg p-2 border border-indigo-900/30 hover:border-indigo-800/30 transition-colors duration-300 hover:bg-[#1b1c3b]">
                <div className="flex items-center gap-1 mb-1">
                  <BarChart3 size={14} className="text-red-400" />
                  <div className="text-xs uppercase text-indigo-400">TRANSACTIONS ÉCHOUÉES</div>
                </div>
                <div className="text-sm text-indigo-100">{problem.failedTransactions}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Pied de page - Toujours visible */}
      <div className="flex justify-between items-center py-2 px-4 border-t border-indigo-900/30">
        {/* Niveau d'impact */}
        <div className="flex items-center gap-2 text-xs text-indigo-400">
          <span>Impact:</span>
          <span className={`uppercase px-2 py-0.5 rounded-md text-xs font-medium ${
            problem.impact === 'MOYEN' 
              ? 'bg-amber-900/60 text-amber-300 border border-amber-800/30' 
              : problem.impact === 'ÉLEVÉ' 
                ? 'bg-red-900/60 text-red-300 border border-red-800/30' 
                : 'bg-blue-900/60 text-blue-300 border border-blue-800/30'
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
              ? 'text-emerald-400 hover:text-emerald-300 group'
              : 'text-indigo-400 hover:text-indigo-300 group'
          } transition-colors duration-300`}
        >
          <ExternalLink size={12} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform duration-300" />
          <span className="relative">
            Détails complets
            <span className="absolute inset-x-0 bottom-0 h-px bg-current scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
          </span>
        </a>
      </div>
      
      {/* Les styles spécifiques pour les animations ont été déplacés dans animations.css */}
    </div>
  );
};

export default ProblemCard;