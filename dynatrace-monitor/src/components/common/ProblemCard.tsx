import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ExternalLink, CheckCircle, ChevronDown, ChevronUp, 
  Clock, Server, Database, Cpu, Users, BarChart3, Shield, RefreshCw, Monitor,
  Zap, Layers, AlertCircle, Activity, ArrowUpRight, FileWarning, 
  Bell, AlertOctagon
} from 'lucide-react';
import { Problem } from '../../api/types';

interface ProblemCardProps {
  problem: Problem;
}

// Type pour les données de métrique fictives
interface MetricData {
  time: number;
  value: number;
}

const ProblemCard: React.FC<ProblemCardProps> = ({ problem }) => {
  // État pour gérer l'expansion/réduction de la carte
  const [expanded, setExpanded] = useState<boolean>(false);
  // État pour l'animation de pulsation pour les problèmes critiques
  const [isPulsing, setPulsing] = useState<boolean>(false);
  // État pour les données de métrique simulées
  const [metricData, setMetricData] = useState<MetricData[]>([]);
  
  // Vérifier si le problème est résolu
  const isResolved = problem.resolved || false;
  // Vérifier si le problème est critique
  const isCritical = problem.impact === 'ÉLEVÉ' && !isResolved;

  // Effet pour gérer l'animation de pulsation pour les problèmes critiques
  useEffect(() => {
    if (isCritical) {
      const interval = setInterval(() => {
        setPulsing(prev => !prev);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isCritical]);

  // Effet pour générer des données métriques fictives pour la visualisation
  useEffect(() => {
    // Fonction pour générer des données de métriques aléatoires
    const generateMetricData = (): MetricData[] => {
      const data: MetricData[] = [];
      const now = Date.now();
      const isError = problem.status === 'critical' || problem.impact === 'ÉLEVÉ';
      
      // Générer 12 points de données (1 par heure sur 12 heures)
      for (let i = 0; i < 12; i++) {
        // Pour les problèmes critiques, simuler un pic de valeur au milieu du graphique
        let value;
        if (isError && i >= 5 && i <= 8) {
          value = Math.random() * 80 + 20; // Valeur élevée pour simuler une erreur
        } else {
          value = Math.random() * 40 + 10; // Valeur normale
        }
        
        data.push({
          time: now - (11 - i) * 3600 * 1000, // Horodatage pour les 12 dernières heures
          value: value
        });
      }
      
      return data;
    };
    
    setMetricData(generateMetricData());
  }, [problem.id, problem.status, problem.impact]);

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
      return <Server size={16} className="text-blue-400" />;
    } else if (type.includes('database')) {
      return <Database size={16} className="text-purple-400" />;
    } else if (type.includes('cpu') || type.includes('performance')) {
      return <Cpu size={16} className="text-amber-400" />;
    } else if (type.includes('service') || type.includes('application')) {
      return <RefreshCw size={16} className="text-green-400" />;
    } else if (type.includes('security')) {
      return <Shield size={16} className="text-red-400" />;
    } else if (type.includes('memory')) {
      return <Layers size={16} className="text-emerald-400" />;
    } else if (type.includes('disk') || type.includes('storage')) {
      return <Database size={16} className="text-amber-400" />;
    } else if (type.includes('network')) {
      return <Activity size={16} className="text-blue-400" />;
    } else if (type.includes('error') || type.includes('exception')) {
      return <AlertCircle size={16} className="text-red-400" />;
    } else if (type.includes('alert') || type.includes('warning')) {
      return <Bell size={16} className="text-amber-400" />;
    } else {
      return <Monitor size={16} className="text-blue-400" />;
    }
  };

  // Fonction pour obtenir l'icône appropriée pour l'entité impactée
  const getEntityTypeIcon = () => {
    // Vérifier s'il y a des entités impactées
    if (problem.impactedEntities && problem.impactedEntities.length > 0) {
      const entityType = problem.impactedEntities[0].entityId?.type?.toLowerCase() || '';
      
      if (entityType.includes('host')) {
        return <Server size={16} className="text-blue-400" />;
      } else if (entityType.includes('service')) {
        return <RefreshCw size={16} className="text-green-400" />;
      } else if (entityType.includes('process')) {
        return <Cpu size={16} className="text-purple-400" />;
      } else if (entityType.includes('application')) {
        return <Layers size={16} className="text-indigo-400" />;
      } else if (entityType.includes('database')) {
        return <Database size={16} className="text-amber-400" />;
      } else if (entityType.includes('custom')) {
        return <Shield size={16} className="text-emerald-400" />;
      } else if (entityType.includes('kubernetes')) {
        return <Shield size={16} className="text-blue-400" />;
      } else if (entityType.includes('browser')) {
        return <Monitor size={16} className="text-purple-400" />;
      }
    }
    
    // Par défaut, icône de serveur
    return <Server size={16} className="text-blue-400" />;
  };
  
  // Rendu du mini-graphique de métrique
  const renderMiniChart = () => {
    if (metricData.length === 0) return null;
    
    const maxValue = Math.max(...metricData.map(d => d.value));
    const chartHeight = 30;
    
    return (
      <div className="w-full h-[30px] mt-1 px-1">
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${metricData.length} ${chartHeight}`} preserveAspectRatio="none">
          {/* Ligne de tendance */}
          <path
            d={`M 0 ${chartHeight - (metricData[0].value / maxValue) * chartHeight} ${metricData.map((d, i) => `L ${i} ${chartHeight - (d.value / maxValue) * chartHeight}`).join(' ')}`}
            stroke={isResolved ? "#10b981" : problem.impact === 'ÉLEVÉ' ? "#ef4444" : problem.impact === 'MOYEN' ? "#f59e0b" : "#3b82f6"}
            strokeWidth="1.5"
            fill="none"
          />
          
          {/* Aire sous la courbe */}
          <path
            d={`M 0 ${chartHeight - (metricData[0].value / maxValue) * chartHeight} ${metricData.map((d, i) => `L ${i} ${chartHeight - (d.value / maxValue) * chartHeight}`).join(' ')} L ${metricData.length - 1} ${chartHeight} L 0 ${chartHeight} Z`}
            fill={isResolved ? "rgba(16, 185, 129, 0.1)" : problem.impact === 'ÉLEVÉ' ? "rgba(239, 68, 68, 0.1)" : problem.impact === 'MOYEN' ? "rgba(245, 158, 11, 0.1)" : "rgba(59, 130, 246, 0.1)"}
          />
          
          {/* Points pour les données critiques */}
          {problem.impact === 'ÉLEVÉ' && !isResolved && metricData.map((d, i) => (
            d.value > maxValue * 0.7 ? (
              <circle
                key={i}
                cx={i}
                cy={chartHeight - (d.value / maxValue) * chartHeight}
                r="1.5"
                fill="#ef4444"
              />
            ) : null
          ))}
        </svg>
      </div>
    );
  };
  
  // Classes de couleur pour la bordure principale en fonction de la sévérité
  const getBorderColorClass = () => {
    if (isResolved) return 'border-green-500/40';
    
    switch (problem.impact) {
      case 'ÉLEVÉ': return isPulsing ? 'border-red-500/80' : 'border-red-500/40';
      case 'MOYEN': return 'border-amber-500/40';
      default: return 'border-blue-500/40';
    }
  };
  
  // Fond en fonction de la sévérité
  const getBackgroundClass = () => {
    if (isResolved) return 'bg-slate-800/95 hover:bg-slate-800/80';
    
    switch (problem.impact) {
      case 'ÉLEVÉ': return isPulsing 
        ? 'bg-gradient-to-r from-slate-800/95 via-red-900/10 to-slate-800/95 hover:bg-slate-800/80' 
        : 'bg-slate-800/95 hover:bg-slate-800/80';
      case 'MOYEN': return 'bg-slate-800/95 hover:bg-slate-800/80';
      default: return 'bg-slate-800/95 hover:bg-slate-800/80';
    }
  };
  
  return (
    <div 
      className={`relative rounded-lg overflow-hidden border ${getBorderColorClass()} 
                ${getBackgroundClass()} transition-all duration-700 shadow-lg
                ${expanded ? 'shadow-xl' : 'shadow-md'} backdrop-blur-sm`}
      style={{
        transition: 'all 0.7s ease-in-out',
      }}
    >
      {/* Indicateur de statut (barre colorée) */}
      <div 
        className={`absolute top-0 left-0 w-1.5 h-full ${
          isResolved 
            ? 'bg-green-500' 
            : problem.impact === 'ÉLEVÉ' 
              ? isPulsing ? 'bg-red-400' : 'bg-red-500' 
              : problem.impact === 'MOYEN' 
                ? 'bg-amber-500' 
                : 'bg-blue-500'
        } transition-colors duration-700`}
      ></div>
      
      {/* Indicateur de problème critique - animation */}
      {isCritical && (
        <div className={`absolute top-0 right-0 p-1.5 transition-opacity duration-700 ${isPulsing ? 'opacity-100' : 'opacity-0'}`}>
          <AlertOctagon size={18} className="text-red-500" />
        </div>
      )}
      
      {/* En-tête du problème - Toujours visible */}
      <div 
        className={`flex justify-between items-center py-3 px-4 ${
          expanded 
            ? 'border-b border-slate-700/70 bg-slate-800/80' 
            : 'bg-transparent'
        } cursor-pointer transition-all`}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3 flex-grow">
          {/* Icône de statut */}
          <div className={`p-1.5 rounded-full ${
            isResolved 
              ? 'bg-green-500/10 text-green-500' 
              : problem.impact === 'ÉLEVÉ' 
                ? 'bg-red-500/10 text-red-500' 
                : problem.impact === 'MOYEN' 
                  ? 'bg-amber-500/10 text-amber-500' 
                  : 'bg-blue-500/10 text-blue-500'
          } transition-colors duration-300`}>
            {isResolved ? (
              <CheckCircle className="flex-shrink-0" size={20} />
            ) : (
              <AlertTriangle className="flex-shrink-0" size={20} />
            )}
          </div>
          
          {/* Titre et sous-titre */}
          <div className="min-w-0 flex-grow">
            <div className="font-medium text-white flex items-center gap-2 flex-wrap">
              <span className="truncate">{problem.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium ${
                isResolved 
                  ? 'bg-green-900/50 text-green-400 border border-green-500/30' 
                  : problem.impact === 'ÉLEVÉ'
                    ? 'bg-red-900/50 text-red-400 border border-red-500/30' 
                    : problem.impact === 'MOYEN'
                      ? 'bg-amber-900/50 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-900/50 text-blue-400 border border-blue-500/30'
              }`}>
                {problem.code}
              </span>
            </div>
            <div className="text-xs text-slate-400 truncate">{problem.subtitle}</div>
          </div>
        </div>
        
        {/* Côté droit: durée et bouton pour étendre/réduire */}
        <div className="flex items-center gap-3 ml-2">
          <div className="text-xs text-slate-300 flex items-center gap-1 whitespace-nowrap">
            <Clock size={14} className={`${
              isResolved 
                ? 'text-green-400' 
                : problem.impact === 'ÉLEVÉ' 
                  ? 'text-red-400' 
                  : problem.impact === 'MOYEN' 
                    ? 'text-amber-400' 
                    : 'text-blue-400'
            }`} />
            <span>{problem.time}</span>
          </div>
          <div className={`rounded-full p-1 ${
            expanded 
              ? 'bg-slate-700/30' 
              : 'bg-slate-700/20'
          }`}>
            {expanded ? 
              <ChevronUp size={16} className="text-slate-400" /> : 
              <ChevronDown size={16} className="text-slate-400" />
            }
          </div>
        </div>
      </div>
      
      {/* Section principale avec entité impactée et mini-graphique - Toujours visible */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-slate-800/40">
        {/* Entité impactée avec icône appropriée */}
        <div className="flex flex-col w-full md:w-auto mb-2 md:mb-0">
          <div className="text-xs uppercase text-slate-500 mb-1">Entité impactée</div>
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-md ${
              isResolved 
                ? 'bg-green-500/10' 
                : problem.impact === 'ÉLEVÉ' 
                  ? 'bg-red-500/10' 
                  : problem.impact === 'MOYEN' 
                    ? 'bg-amber-500/10' 
                    : 'bg-blue-500/10'
            }`}>
              {getEntityTypeIcon()}
            </div>
            <span className={`text-sm font-medium ${
              isResolved 
                ? 'text-green-300' 
                : problem.impact === 'ÉLEVÉ' 
                  ? 'text-red-300' 
                  : problem.impact === 'MOYEN' 
                    ? 'text-amber-300' 
                    : 'text-blue-300'
            }`}>
              {hostInfo !== "Non spécifié" ? hostInfo : "Non spécifiée"}
            </span>
          </div>
        </div>
        
        {/* Mini-graphique des métriques */}
        <div className="flex flex-col w-full md:w-auto">
          <div className="text-xs uppercase text-slate-500 mb-1">Activité des 12 dernières heures</div>
          <div className="w-full md:w-[150px] bg-slate-800/50 border border-slate-700/50 rounded-md p-1">
            {renderMiniChart()}
          </div>
        </div>
      </div>
      
      {/* Détails du problème - Visibles uniquement lorsque la carte est étendue */}
      {expanded && (
        <div className="py-3 px-4 bg-slate-800/40 border-t border-slate-700/70">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-sm font-semibold ${
              isResolved 
                ? 'text-green-400' 
                : problem.impact === 'ÉLEVÉ' 
                  ? 'text-red-400' 
                  : problem.impact === 'MOYEN' 
                    ? 'text-amber-400' 
                    : 'text-blue-400'
            }`}>Détails du problème</span>
            <div className="flex-grow h-px bg-slate-700/50"></div>
          </div>
          
          {/* Grille pour les métriques détaillées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {/* Type de problème */}
            <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1 rounded-md ${
                  isResolved 
                    ? 'bg-green-500/10' 
                    : problem.impact === 'ÉLEVÉ' 
                      ? 'bg-red-500/10' 
                      : problem.impact === 'MOYEN' 
                        ? 'bg-amber-500/10' 
                        : 'bg-blue-500/10'
                }`}>
                  {getProblemTypeIcon()}
                </div>
                <div className="text-xs uppercase text-slate-400">Type de problème</div>
              </div>
              <div className="text-sm text-slate-300 font-medium">{problem.type}</div>
            </div>
            
            {/* Zone affectée */}
            <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-md bg-emerald-500/10">
                  <Shield size={16} className="text-emerald-400" />
                </div>
                <div className="text-xs uppercase text-slate-400">Zone affectée</div>
              </div>
              <div className="text-sm text-slate-300 font-medium">{problem.zone}</div>
            </div>
            
            {/* Durée */}
            {problem.duration && (
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 rounded-md bg-amber-500/10">
                    <Clock size={16} className="text-amber-400" />
                  </div>
                  <div className="text-xs uppercase text-slate-400">Durée</div>
                </div>
                <div className="text-sm text-amber-300 font-medium">{problem.duration}</div>
              </div>
            )}
            
            {/* Services impactés */}
            {problem.servicesImpacted && (
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 rounded-md bg-blue-500/10">
                    <RefreshCw size={16} className="text-blue-400" />
                  </div>
                  <div className="text-xs uppercase text-slate-400">Services impactés</div>
                </div>
                <div className="text-sm flex items-baseline gap-1">
                  <span className="text-blue-400 font-medium">{problem.servicesImpacted}</span>
                  <span className="text-slate-500 text-xs">service(s)</span>
                </div>
              </div>
            )}
            
            {/* Temps de réponse */}
            {problem.responseTime && (
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 rounded-md bg-amber-500/10">
                    <Activity size={16} className="text-amber-400" />
                  </div>
                  <div className="text-xs uppercase text-slate-400">Temps de réponse</div>
                </div>
                <div className="text-sm text-amber-300 font-medium">{problem.responseTime}</div>
              </div>
            )}
            
            {/* Utilisation CPU */}
            {problem.cpuUsage && (
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 rounded-md bg-red-500/10">
                    <Cpu size={16} className="text-red-400" />
                  </div>
                  <div className="text-xs uppercase text-slate-400">Utilisation CPU</div>
                </div>
                <div className="text-sm text-red-300 font-medium">{problem.cpuUsage}</div>
              </div>
            )}
            
            {/* Taux d'erreur */}
            {problem.errorRate && (
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 rounded-md bg-red-500/10">
                    <AlertTriangle size={16} className="text-red-400" />
                  </div>
                  <div className="text-xs uppercase text-slate-400">Taux d'erreur</div>
                </div>
                <div className="text-sm text-red-300 font-medium">{problem.errorRate}</div>
              </div>
            )}
            
            {/* Utilisateurs affectés */}
            {problem.usersAffected && (
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 rounded-md bg-purple-500/10">
                    <Users size={16} className="text-purple-400" />
                  </div>
                  <div className="text-xs uppercase text-slate-400">Utilisateurs affectés</div>
                </div>
                <div className="text-sm text-purple-300 font-medium">{problem.usersAffected}</div>
              </div>
            )}
            
            {/* Transactions échouées */}
            {problem.failedTransactions && (
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 rounded-md bg-red-500/10">
                    <BarChart3 size={16} className="text-red-400" />
                  </div>
                  <div className="text-xs uppercase text-slate-400">Transactions échouées</div>
                </div>
                <div className="text-sm text-red-300 font-medium">{problem.failedTransactions}</div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Pied de page - Toujours visible */}
      <div className="flex justify-between items-center py-2.5 px-4 border-t border-slate-700/70">
        {/* Niveau d'impact */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Impact:</span>
          <span className={`uppercase px-2 py-0.5 rounded-full text-xs font-medium ${
            problem.impact === 'MOYEN' 
              ? 'bg-amber-600/60 text-white' 
              : problem.impact === 'ÉLEVÉ' 
                ? 'bg-red-600/60 text-white' 
                : 'bg-green-600/60 text-white'
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
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
            isResolved
              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300'
              : problem.impact === 'ÉLEVÉ'
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300'
                : problem.impact === 'MOYEN'
                  ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300'
                  : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300'
          } transition-colors`}
        >
          <ExternalLink size={12} />
          Détails complets
        </a>
      </div>
    </div>
  );
};

export default ProblemCard;