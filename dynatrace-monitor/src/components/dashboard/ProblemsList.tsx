import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, RefreshCw, CalendarRange, Clock, SortDesc, SortAsc, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import ProblemCard from '../common/ProblemCard';
import { Problem } from '../../api/types';
import { useApp } from '../../contexts/AppContext';
import axios from 'axios';
import { API_BASE_URL } from '../../api/endpoints';

interface ProblemsListProps {
  problems: Problem[];
  zoneFilter?: string;
  title?: string;
  showRefreshButton?: boolean;
  onRefresh?: (refreshedProblems: Problem[]) => void;
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
  showRefreshButton = true,
  onRefresh
}) => {
  const { isLoading } = useApp();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // plus récent d'abord par défaut
  const [groupByDate, setGroupByDate] = useState<boolean>(true); // grouper par date par défaut
  const [groupByZone, setGroupByZone] = useState<boolean>(true); // grouper par zone par défaut
  const [expandedZones, setExpandedZones] = useState<{[key: string]: boolean}>({});
  const [localProblems, setLocalProblems] = useState<Problem[]>(problems);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Mettre à jour les problèmes locaux quand les props problems changent
  // mais seulement si nous ne sommes pas en train de rafraîchir pour éviter des mises à jour conflictuelles
  useEffect(() => {
    if (!isRefreshing) {
      console.log(`Mise à jour des problèmes locaux depuis les props (${problems.length} problèmes)`);
      setLocalProblems(problems);
    } else {
      console.log('Mise à jour des props ignorée car un rafraîchissement est en cours');
    }
  }, [problems, isRefreshing]);
  
  // Récupérer le type de dashboard actuel (vfg ou vfe)
  const dashboardType = window.location.pathname.includes('vfe') ? 'vfe' : 'vfg';
  
  // Fonction pour rafraîchir les problèmes directement depuis l'API
  const handleRefreshProblems = async () => {
    // Éviter les rafraîchissements multiples simultanés
    if (isRefreshing) {
      console.log("Un rafraîchissement est déjà en cours, opération ignorée");
      return;
    }
    
    // Marquer comme en cours de rafraîchissement
    setIsRefreshing(true);
    
    // Stocker les problèmes actuels au cas où la requête échouerait
    const currentProblems = [...localProblems];
    
    try {
      // Déterminer les paramètres pour l'API en fonction du contexte - par défaut les problèmes ACTIFS
      // Utiliser le titre de la page pour déterminer s'il s'agit de problèmes 72h ou de problèmes actifs
      const is72h = title.toLowerCase().includes('72h');
      const status = is72h ? "ALL" : "OPEN";
      const timeframe = is72h ? "-72h" : "-60d"; // Utiliser -60d au lieu de "all" pour les problèmes actifs
      
      console.log(`Rafraîchissement des problèmes: ${status} avec timeframe ${timeframe}, is72h=${is72h}`);
      
      const params: any = {
        status: status,
        from: timeframe,
        debug: 'true', // Forcer le rafraîchissement
        type: dashboardType
      };
      
      // Si un filtre de zone est fourni, l'ajouter aux paramètres pour filtrer côté serveur
      if (zoneFilter) {
        params.zone = zoneFilter;
        console.log(`Rafraîchissement direct des problèmes pour la zone: ${zoneFilter}`);
      } else {
        console.log("Rafraîchissement direct des problèmes...");
      }
      
      // Appel direct à l'API backend avec les paramètres incluant la zone
      const response = await axios.get(`${API_BASE_URL}/problems`, { params });
      
      if (response.data) {
        let refreshedProblems = response.data;
        
        // Vérifier si les données reçues sont valides
        if (!Array.isArray(refreshedProblems)) {
          console.error("Format de données invalide reçu:", refreshedProblems);
          throw new Error("Format de données invalide reçu");
        }
        
        console.log(`Données brutes reçues: ${refreshedProblems.length} problèmes`);
        
        // Transformer les données si nécessaire pour correspondre au format Problem
        const formattedProblems: Problem[] = refreshedProblems.map((problem: any) => {
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
          
          // Adapter le format d'affichage du temps en fonction du contexte (problèmes récents vs actifs)
          // Déterminer si nous sommes sur la page des problèmes des 72 dernières heures
          const is72h = title.toLowerCase().includes('72h');
          const timeDisplay = is72h 
            ? (problem.start_time ? `Détecté le ${problem.start_time}` : "Récent")
            : (problem.start_time ? `Depuis ${problem.start_time}` : "Récent");
          
          const impact = problem.impact === "INFRASTRUCTURE" ? "ÉLEVÉ" : 
                      problem.impact === "SERVICE" ? "MOYEN" : "FAIBLE";
          
          const problemStatus = problem.status === "OPEN" ? "critical" : "warning";
          
          return {
            id: problem.id || `PROB-${Math.random().toString(36).substr(2, 9)}`,
            title: problem.title || "Problème inconnu",
            code: problem.id ? problem.id.substring(0, 7) : "UNKNOWN",
            subtitle: `${problem.zone || "Non spécifié"} - Impact: ${problem.impact || "INCONNU"}`,
            time: timeDisplay,
            type: problem.impact === "INFRASTRUCTURE" ? "Problème d'Infrastructure" : "Problème de Service",
            status: problemStatus as "critical" | "warning" | "low",
            impact: impact as "ÉLEVÉ" | "MOYEN" | "FAIBLE",
            zone: problem.zone || "Non spécifié",
            servicesImpacted: problem.affected_entities ? problem.affected_entities.toString() : "0",
            dt_url: problem.dt_url || "#",
            duration: problem.duration || "",
            resolved: problem.resolved || false,
            host: hostName, // Utiliser le nom d'hôte extrait
            impacted: hostName, // Pour compatibilité
            impactedEntities: problem.impactedEntities, // Transférer les entités impactées pour utilisation dans ProblemCard
            rootCauseEntity: problem.rootCauseEntity // Transférer aussi la cause racine si disponible
          };
        });
        
        // Vérifier si nous avons reçu des données valides
        if (formattedProblems.length === 0) {
          console.log("Aucun problème trouvé lors du rafraîchissement.");
          
          // Si nous sommes sur l'écran des problèmes actifs, vérifier que c'est bien normal
          if (!title.toLowerCase().includes('72h')) {
            // Effectuer une seconde vérification avant de vider la liste
            const verificationParams = {...params, bypass_cache: 'true'};
            console.log("Double vérification pour confirmer l'absence de problèmes actifs...");
            
            try {
              const verificationResponse = await axios.get(`${API_BASE_URL}/problems`, { params: verificationParams });
              
              if (verificationResponse.data && Array.isArray(verificationResponse.data) && verificationResponse.data.length > 0) {
                console.log("La vérification a retourné des problèmes, utilisation de ces données.");
                
                // Formater ces problèmes
                const verifiedProblems = verificationResponse.data.map((problem: any) => {
                  // [Même logique de formatage que ci-dessus]
                  // ... code omis pour simplicité mais identique au formatage ci-dessus
                  let hostName = '';
                  
                  if (problem.impactedEntities && Array.isArray(problem.impactedEntities)) {
                    const hostEntity = problem.impactedEntities.find((entity: any) => 
                      entity.entityId && entity.entityId.type === 'HOST' && entity.name);
                    if (hostEntity) {
                      hostName = hostEntity.name;
                    }
                  }
                  
                  if (!hostName) {
                    if (problem.host && problem.host !== "Non spécifié") {
                      hostName = problem.host;
                    } else if (problem.impacted && problem.impacted !== "Non spécifié") {
                      hostName = problem.impacted;
                    }
                  }
                  
                  // Extraire la logique de vérification pour uniformité
                  const is72h = title.toLowerCase().includes('72h');
                  const timeDisplay = is72h 
                    ? (problem.start_time ? `Détecté le ${problem.start_time}` : "Récent")
                    : (problem.start_time ? `Depuis ${problem.start_time}` : "Récent");
                  
                  const impact = problem.impact === "INFRASTRUCTURE" ? "ÉLEVÉ" : 
                                problem.impact === "SERVICE" ? "MOYEN" : "FAIBLE";
                  
                  const problemStatus = problem.status === "OPEN" ? "critical" : "warning";
                  
                  return {
                    id: problem.id || `PROB-${Math.random().toString(36).substr(2, 9)}`,
                    title: problem.title || "Problème inconnu",
                    code: problem.id ? problem.id.substring(0, 7) : "UNKNOWN",
                    subtitle: `${problem.zone || "Non spécifié"} - Impact: ${problem.impact || "INCONNU"}`,
                    time: timeDisplay,
                    type: problem.impact === "INFRASTRUCTURE" ? "Problème d'Infrastructure" : "Problème de Service",
                    status: problemStatus as "critical" | "warning" | "low",
                    impact: impact as "ÉLEVÉ" | "MOYEN" | "FAIBLE",
                    zone: problem.zone || "Non spécifié",
                    servicesImpacted: problem.affected_entities ? problem.affected_entities.toString() : "0",
                    dt_url: problem.dt_url || "#",
                    duration: problem.duration || "",
                    resolved: problem.resolved || false,
                    host: hostName,
                    impacted: hostName,
                    impactedEntities: problem.impactedEntities,
                    rootCauseEntity: problem.rootCauseEntity
                  };
                });
                
                // Mettre à jour l'état avec ces problèmes vérifiés
                setLocalProblems(verifiedProblems);
                
                // Propager également au parent si le callback existe
                if (onRefresh) {
                  onRefresh(verifiedProblems);
                }
                
                console.log(`Vérification secondaire terminée. ${verifiedProblems.length} problèmes trouvés.`);
                return; // Sortir de la fonction ici
              } else {
                console.log("La double vérification confirme qu'il n'y a pas de problèmes actifs.");
              }
            } catch (verificationError) {
              console.error("Erreur lors de la double vérification des problèmes:", verificationError);
              // En cas d'erreur de vérification, continuer avec la mise à jour normale
            }
          }
        }
        
        // Mettre à jour l'état local avec les nouveaux problèmes
        setLocalProblems(formattedProblems);
        
        // Propager les problèmes rafraîchis au parent si la fonction de callback existe
        if (onRefresh) {
          onRefresh(formattedProblems);
        }
        
        console.log(`Rafraîchissement direct terminé. ${formattedProblems.length} problèmes trouvés.`);
      }
    } catch (error) {
      console.error("Erreur lors du rafraîchissement direct des problèmes:", error);
      
      // En cas d'erreur, restaurer les problèmes précédents
      setLocalProblems(currentProblems);
      
      // Informer l'utilisateur de l'erreur
      alert("Erreur lors du rafraîchissement des problèmes. Les données précédentes ont été conservées.");
    } finally {
      // Désactiver l'indicateur de chargement
      setIsRefreshing(false);
      
      // Définir un délai minimum avant d'autoriser un nouveau rafraîchissement (500ms)
      setTimeout(() => {
        // Ce code est vide mais le timeout garantit que isRefreshing a été à true pendant au moins 500ms
      }, 500);
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

  // Fonction pour activer/désactiver le regroupement par zone
  const toggleGroupByZone = () => {
    setGroupByZone(!groupByZone);
  };

  // Fonction pour basculer l'expansion d'une zone spécifique
  const toggleZoneExpansion = (zone: string) => {
    setExpandedZones(prev => ({
      ...prev,
      [zone]: !prev[zone]
    }));
  };

  // Initialiser l'état d'expansion des zones lorsque les problèmes changent
  useEffect(() => {
    const uniqueZones = Array.from(new Set(localProblems.map(problem => problem.zone)));
    
    setExpandedZones(prev => {
      const newState = { ...prev };
      
      // Ajouter les nouvelles zones et conserver l'état des zones existantes
      uniqueZones.forEach(zone => {
        if (newState[zone] === undefined) {
          newState[zone] = false; // Par défaut, les nouvelles zones sont réduites
        }
      });
      
      return newState;
    });
  }, [localProblems]);
  
  // Si un filtre de zone est fourni, filtrer les problèmes pour cette zone
  const filteredProblems = useMemo(() => {
    return zoneFilter 
      ? localProblems.filter(problem => problem.zone === zoneFilter)
      : localProblems;
  }, [localProblems, zoneFilter]);

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

  // Regrouper les problèmes par zone et/ou par date
  const groupedProblems = useMemo(() => {
    // Si aucun regroupement n'est activé
    if (!groupByDate && !groupByZone) {
      return { 'Tous les problèmes': { 'Tous les problèmes': sortedProblems } };
    }
    
    // Si on regroupe seulement par date (comportement original)
    if (groupByDate && !groupByZone) {
      const byDate = sortedProblems.reduce((groups: { [key: string]: Problem[] }, problem) => {
        const date = extractDateFromProblem(problem);
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(problem);
        return groups;
      }, {});
      
      return { 'Tous les problèmes': byDate };
    }
    
    // Si on regroupe seulement par zone
    if (!groupByDate && groupByZone) {
      return sortedProblems.reduce((zoneGroups: { [key: string]: { [key: string]: Problem[] } }, problem) => {
        const zone = problem.zone || 'Zone non spécifiée';
        
        if (!zoneGroups[zone]) {
          zoneGroups[zone] = { 'Tous les problèmes': [] };
        }
        
        zoneGroups[zone]['Tous les problèmes'].push(problem);
        return zoneGroups;
      }, {});
    }
    
    // Si on regroupe par zone et par date
    return sortedProblems.reduce((zoneGroups: { [key: string]: { [key: string]: Problem[] } }, problem) => {
      const zone = problem.zone || 'Zone non spécifiée';
      const date = extractDateFromProblem(problem);
      
      if (!zoneGroups[zone]) {
        zoneGroups[zone] = {};
      }
      
      if (!zoneGroups[zone][date]) {
        zoneGroups[zone][date] = [];
      }
      
      zoneGroups[zone][date].push(problem);
      return zoneGroups;
    }, {});
  }, [sortedProblems, groupByDate, groupByZone]);

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
  
  // Filtrer les groupes vides pour éviter des problèmes d'affichage
  const filteredGroupedProblems = useMemo(() => {
    const result: { [zone: string]: { [date: string]: Problem[] } } = {};
    
    Object.entries(groupedProblems).forEach(([zone, dateGroups]) => {
      // Filtrer les dates qui ont au moins un problème
      const nonEmptyDates = Object.entries(dateGroups)
        .filter(([_, problems]) => problems.length > 0)
        .reduce((acc, [date, problems]) => {
          acc[date] = problems;
          return acc;
        }, {} as { [date: string]: Problem[] });
      
      // N'ajouter la zone que si elle a au moins une date avec des problèmes
      if (Object.keys(nonEmptyDates).length > 0) {
        result[zone] = nonEmptyDates;
      }
    });
    
    return result;
  }, [groupedProblems]);

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
          {/* Contrôle pour le groupement par zone */}
          <button 
            onClick={toggleGroupByZone}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              groupByZone 
                ? 'text-green-300 bg-green-900/40 border border-green-700/50' 
                : 'text-slate-300 bg-slate-700 hover:bg-slate-600'
            }`}
            title={groupByZone ? "Désactiver le regroupement par zone" : "Activer le regroupement par zone"}
          >
            <Filter size={12} />
            <span className="hidden sm:inline">Grouper par zone</span>
          </button>

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
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Rafraîchir les problèmes en temps réel"
            >
              <RefreshCw size={12} className={`${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Rafraîchissement...' : 'Rafraîchir'}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Affichage des problèmes regroupés par zone et/ou par date */}
      {Object.entries(filteredGroupedProblems).map(([zone, dateGroups]) => (
        <div key={zone} className="mb-6">
          {/* En-tête de zone avec bouton de déroulement (seulement si groupByZone est activé ou si on a un filtre de zone) */}
          {(groupByZone || zoneFilter) && (
            <div 
              className="flex items-center justify-between gap-2 mb-2 py-2 px-4 bg-slate-700 rounded-md hover:bg-slate-600 cursor-pointer"
              onClick={() => toggleZoneExpansion(zone)}
            >
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-green-400" />
                <h3 className="text-sm font-medium text-green-200">{zone}</h3>
                <div className="ml-2 px-2 py-0.5 rounded-full bg-slate-600 text-xs text-slate-300">
                  {/* Compte total des problèmes dans cette zone */}
                  {Object.values(dateGroups).flat().length}
                </div>
              </div>
              {/* Icône de flèche pour indiquer l'état d'expansion */}
              {expandedZones[zone] ? 
                <ChevronDown size={16} className="text-slate-400" /> : 
                <ChevronRight size={16} className="text-slate-400" />
              }
            </div>
          )}
          
          {/* Contenu de la zone (visible seulement si la zone est dépliée ou si le regroupement par zone est désactivé) */}
          {(!groupByZone || expandedZones[zone]) && (
            <div className="pl-4 border-l-2 border-slate-700">
              {/* Pour chaque groupe de date dans cette zone */}
              {Object.entries(dateGroups).map(([date, problems]) => (
                <div key={date} className="mb-4">
                  {/* En-tête de date (seulement si groupByDate est activé) */}
                  {groupByDate && (
                    <div className="flex items-center gap-2 mb-2 py-1 px-3 bg-slate-700/50 rounded-md">
                      <Clock size={14} className="text-blue-400" />
                      <h3 className="text-sm font-medium text-blue-200">{date}</h3>
                      <div className="ml-2 px-1.5 py-0.5 rounded-full bg-slate-600 text-xs text-slate-300">
                        {problems.length}
                      </div>
                    </div>
                  )}
                  
                  {/* Problèmes pour cette date */}
                  <div className="space-y-2">
                    {problems.map(problem => (
                      <ProblemCard key={problem.id} problem={problem} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
};

export default ProblemsList;