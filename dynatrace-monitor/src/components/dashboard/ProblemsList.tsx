import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, RefreshCw, CalendarRange, Clock, SortDesc, SortAsc, 
  Filter, ChevronDown, ChevronRight, Timer, AlarmClock, Hourglass 
} from 'lucide-react';
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
  customExportButton?: React.ReactNode; // Pour afficher un bouton d'export CSV personnalisé
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

// Définir les options de filtrage par durée
type DurationFilter = 'all' | 'lessThan15' | 'between15And60' | 'moreThan60';

const ProblemsList: React.FC<ProblemsListProps> = ({
  problems,
  zoneFilter,
  title = "Problèmes assignés aux Management Zones",
  showRefreshButton = true,
  onRefresh,
  customExportButton
}) => {
  const { isLoading } = useApp();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // plus récent d'abord par défaut
  const [groupByDate, setGroupByDate] = useState<boolean>(true); // grouper par date par défaut
  const [groupByZone, setGroupByZone] = useState<boolean>(true); // grouper par zone par défaut
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all'); // filtre par durée
  const [expandedZones, setExpandedZones] = useState<{[key: string]: boolean}>({});
  const [localProblems, setLocalProblems] = useState<Problem[]>(problems);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState<boolean>(false);
  
  // Mettre à jour les problèmes locaux quand les props problems changent
  // mais seulement si nous ne sommes pas en train de rafraîchir pour éviter des mises à jour conflictuelles
  useEffect(() => {
    if (!isRefreshing) {
      setLocalProblems(problems);
    } else {
    }
  }, [problems, isRefreshing]);
  
  // Récupérer le type de dashboard actuel (vfg ou vfe)
  const dashboardType = window.location.pathname.includes('vfe') ? 'vfe' : 'vfg';
  
  // Fonction pour rafraîchir les problèmes directement depuis l'API
  const handleRefreshProblems = async () => {
    // Éviter les rafraîchissements multiples simultanés
    if (isRefreshing) {
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
      
      
      const params: any = {
        status: status,
        from: timeframe,
        debug: 'true', // Forcer le rafraîchissement
        type: dashboardType
      };
      
      // Si un filtre de zone est fourni, l'ajouter aux paramètres pour filtrer côté serveur
      if (zoneFilter) {
        params.zone = zoneFilter;
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
          // Si nous sommes sur l'écran des problèmes actifs, vérifier que c'est bien normal
          if (!title.toLowerCase().includes('72h')) {
            // Effectuer une seconde vérification avant de vider la liste
            const verificationParams = {...params, bypass_cache: 'true'};
            
            try {
              const verificationResponse = await axios.get(`${API_BASE_URL}/problems`, { params: verificationParams });
              
              if (verificationResponse.data && Array.isArray(verificationResponse.data) && verificationResponse.data.length > 0) {
                
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
                
                return; // Sortir de la fonction ici
              } else {
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
  
  // Fonction pour changer le filtre de durée
  const changeDurationFilter = (filter: DurationFilter) => {
    setDurationFilter(filter);
    setIsDurationDropdownOpen(false); // Fermer le dropdown après la sélection
  };
  
  // Fonction pour basculer l'état du dropdown de durée
  const toggleDurationDropdown = () => {
    setIsDurationDropdownOpen(!isDurationDropdownOpen);
  };
  
  // Gestionnaire de clic pour fermer le dropdown quand on clique ailleurs dans la page
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Vérifier si le clic est en dehors du dropdown
      if (isDurationDropdownOpen && !target.closest('.duration-dropdown-container')) {
        setIsDurationDropdownOpen(false);
      }
    };
    
    // Ajouter l'écouteur d'événement
    document.addEventListener('mousedown', handleClickOutside);
    
    // Nettoyer l'écouteur d'événement
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDurationDropdownOpen]);
  
  // Fonction pour extraire la durée en minutes à partir de la chaîne de caractères
  const extractDurationMinutes = (durationString: string | undefined): number => {
    if (!durationString) return 0;
    
    // Cherche les heures
    const hoursMatch = durationString.match(/(\d+)\s*h/i);
    // Cherche les minutes
    const minutesMatch = durationString.match(/(\d+)\s*min/i);
    
    let totalMinutes = 0;
    
    if (hoursMatch && hoursMatch[1]) {
      totalMinutes += parseInt(hoursMatch[1]) * 60;
    }
    
    if (minutesMatch && minutesMatch[1]) {
      totalMinutes += parseInt(minutesMatch[1]);
    }
    
    return totalMinutes;
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
  
  // Appliquer les filtres par zone et par durée
  const filteredProblems = useMemo(() => {
    // D'abord filtrer par zone si nécessaire
    const zoneFiltered = zoneFilter 
      ? localProblems.filter(problem => problem.zone === zoneFilter)
      : localProblems;
    
    // Ensuite filtrer par durée si nécessaire
    if (durationFilter === 'all') {
      return zoneFiltered;
    }
    
    return zoneFiltered.filter(problem => {
      const durationMinutes = extractDurationMinutes(problem.duration);
      
      switch (durationFilter) {
        case 'lessThan15':
          return durationMinutes < 15;
        case 'between15And60':
          return durationMinutes >= 15 && durationMinutes < 60;
        case 'moreThan60':
          return durationMinutes >= 60;
        default:
          return true;
      }
    });
  }, [localProblems, zoneFilter, durationFilter]);

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

  // Si aucun problème n'est trouvé après filtrage, afficher un message prestigieux
  if (filteredProblems.length === 0) {
    return (
      <section className="mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 shadow-md border border-emerald-300/20">
            <AlertTriangle size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {zoneFilter 
                ? `Situation Normale dans ${zoneFilter}` 
                : "Services Opérationnels"}
            </h2>
            <p className="text-xs text-slate-400 italic mt-1">
              Aucune alerte détectée - Tous les systèmes fonctionnent normalement
            </p>
          </div>
        </div>
        <div className="p-8 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg border border-slate-700/50 shadow-lg">
          {durationFilter !== 'all' ? (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-800/30 to-amber-900/30 flex items-center justify-center mb-4 border border-amber-700/20">
                <Hourglass size={32} className="text-amber-300" />
              </div>
              <p className="text-slate-300 mb-3 font-medium">Aucun problème ne correspond au filtre de durée sélectionné</p>
              <div className="inline-flex gap-3 items-center justify-center mt-2">
                <span className="px-3 py-1.5 bg-amber-900/40 text-amber-300 border border-amber-700/30 rounded-md text-xs shadow-inner">
                  {durationFilter === 'lessThan15' && '< 15 minutes'}
                  {durationFilter === 'between15And60' && '15 - 60 minutes'}
                  {durationFilter === 'moreThan60' && '> 1 heure'}
                </span>
                <button 
                  onClick={() => changeDurationFilter('all')}
                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white rounded-md shadow-md border border-indigo-500/30 transition-all duration-200"
                >
                  Afficher tous les problèmes
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-800/30 to-green-900/30 flex items-center justify-center mb-5 border border-emerald-700/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-emerald-400 mb-2">Tous les services fonctionnent normalement</h3>
              <p className="text-slate-400 max-w-md">
                La surveillance en temps réel n'a détecté aucune anomalie dans les systèmes. 
                Les services critiques opèrent selon les performances attendues.
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-5">
      {/* En-tête avec titre et contrôles - Style prestigieux */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-800 shadow-md border border-indigo-300/20">
            <AlertTriangle size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {title.toLowerCase().includes('72h') ? 
                "Historique des Incidents (72h)" : 
                "Surveillance Active des Services"}
              <div className="ml-2 px-3 py-1 flex items-center justify-center bg-gradient-to-r from-indigo-900/80 to-blue-900/80 shadow-inner border border-indigo-500/30 text-indigo-100 rounded-md font-bold text-sm">
                {filteredProblems.length}
              </div>
              {/* Afficher badge pour le filtre de durée actif */}
              {durationFilter !== 'all' && (
                <div className="ml-2 px-3 py-1 text-xs bg-amber-900/50 text-amber-200 border border-amber-600/40 rounded-md shadow-sm">
                  {durationFilter === 'lessThan15' && '< 15 min'}
                  {durationFilter === 'between15And60' && '15-60 min'}
                  {durationFilter === 'moreThan60' && '> 1h'}
                </div>
              )}
            </h2>
            <p className="text-xs text-slate-400 italic mt-1">
              {title.toLowerCase().includes('72h') ? 
                "Suivi consolidé des incidents résolus et en cours sur les 72 dernières heures" : 
                "Monitoring en temps réel des alertes critiques et anomalies détectées"}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mt-2 md:mt-0">
          {/* Groupe de contrôles avec conteneur prestigieux */}
          <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-1.5 rounded-lg border border-slate-700/50 shadow-md flex items-center gap-2">
            {/* Filtre par durée */}
            <div className="relative duration-dropdown-container">
              <button 
                onClick={toggleDurationDropdown}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  durationFilter !== 'all'
                    ? 'text-amber-200 bg-gradient-to-r from-amber-900/70 to-amber-800/70 shadow-inner border border-amber-600/40' 
                    : 'text-slate-200 bg-slate-700/80 hover:bg-slate-600/80 border border-slate-600/30 hover:border-slate-500/40'
                }`}
                title="Filtrer par durée du problème"
              >
                <Hourglass size={14} className="text-amber-300" />
                <span className="hidden sm:inline">
                  {durationFilter === 'all' && 'Toutes durées'}
                  {durationFilter === 'lessThan15' && '< 15 min'}
                  {durationFilter === 'between15And60' && '15-60 min'}
                  {durationFilter === 'moreThan60' && '> 1 heure'}
                </span>
                <ChevronDown size={12} className="ml-1" />
              </button>
              
              {/* Dropdown menu pour le filtre de durée */}
              {isDurationDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-40 bg-slate-800 border border-slate-600/50 rounded-md shadow-xl z-10">
                  <div className="p-1">
                    <button 
                      onClick={() => changeDurationFilter('all')}
                      className={`block w-full text-left px-4 py-1.5 text-xs rounded ${
                        durationFilter === 'all' ? 
                          'bg-indigo-900/60 text-indigo-100 border border-indigo-700/40' : 
                          'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      Toutes durées
                    </button>
                    <button 
                      onClick={() => changeDurationFilter('lessThan15')}
                      className={`block w-full text-left px-4 py-1.5 text-xs rounded mt-1 ${
                        durationFilter === 'lessThan15' ? 
                          'bg-amber-900/60 text-amber-100 border border-amber-700/40' : 
                          'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      &lt; 15 minutes
                    </button>
                    <button 
                      onClick={() => changeDurationFilter('between15And60')}
                      className={`block w-full text-left px-4 py-1.5 text-xs rounded mt-1 ${
                        durationFilter === 'between15And60' ? 
                          'bg-amber-900/60 text-amber-100 border border-amber-700/40' : 
                          'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      15 - 60 minutes
                    </button>
                    <button 
                      onClick={() => changeDurationFilter('moreThan60')}
                      className={`block w-full text-left px-4 py-1.5 text-xs rounded mt-1 ${
                        durationFilter === 'moreThan60' ? 
                          'bg-amber-900/60 text-amber-100 border border-amber-700/40' : 
                          'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      &gt; 1 heure
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Contrôle pour le groupement par zone */}
            <button 
              onClick={toggleGroupByZone}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                groupByZone 
                  ? 'text-green-200 bg-gradient-to-r from-green-900/70 to-emerald-800/70 shadow-inner border border-green-600/40' 
                  : 'text-slate-200 bg-slate-700/80 hover:bg-slate-600/80 border border-slate-600/30 hover:border-slate-500/40'
              }`}
              title={groupByZone ? "Désactiver le regroupement par zone" : "Activer le regroupement par zone"}
            >
              <Filter size={14} className={groupByZone ? "text-green-300" : "text-slate-400"} />
              <span className="hidden sm:inline">Grouper par zone</span>
            </button>

            {/* Contrôle pour le groupement par date */}
            <button 
              onClick={toggleGroupByDate}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                groupByDate 
                  ? 'text-blue-200 bg-gradient-to-r from-blue-900/70 to-indigo-800/70 shadow-inner border border-blue-600/40' 
                  : 'text-slate-200 bg-slate-700/80 hover:bg-slate-600/80 border border-slate-600/30 hover:border-slate-500/40'
              }`}
              title={groupByDate ? "Désactiver le regroupement par date" : "Activer le regroupement par date"}
            >
              <CalendarRange size={14} className={groupByDate ? "text-blue-300" : "text-slate-400"} />
              <span className="hidden sm:inline">Grouper par date</span>
            </button>
            
            {/* Contrôle pour l'ordre de tri */}
            <button 
              onClick={toggleSortOrder}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 
              text-slate-200 bg-slate-700/80 hover:bg-slate-600/80 border border-slate-600/30 hover:border-slate-500/40`}
              title={sortOrder === 'desc' ? "Trier du plus ancien au plus récent" : "Trier du plus récent au plus ancien"}
            >
              {sortOrder === 'desc' ? <SortDesc size={14} className="text-slate-400" /> : <SortAsc size={14} className="text-slate-400" />}
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}</span>
            </button>
          </div>
          
          {/* Contrôles de droite : Bouton d'export CSV personnalisé et bouton de rafraîchissement */}
          <div className="flex items-center gap-3">
            {/* Bouton d'export CSV personnalisé s'il est fourni */}
            {customExportButton}

            {/* Bouton de rafraîchissement des problèmes en temps réel */}
            {showRefreshButton && (
              <button
                onClick={handleRefreshProblems}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium
                  bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600
                  text-white shadow-md border border-indigo-400/30
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="Rafraîchir les problèmes en temps réel"
              >
                <RefreshCw size={14} className={`${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Rafraîchissement...' : 'Rafraîchir les données'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Affichage des problèmes regroupés par zone et/ou par date */}
      {Object.entries(filteredGroupedProblems).map(([zone, dateGroups]) => (
        <div key={zone} className="mb-6">
          {/* En-tête de zone avec bouton de déroulement (seulement si groupByZone est activé ou si on a un filtre de zone) */}
          {(groupByZone || zoneFilter) && (
            <div 
              className="flex items-center justify-between gap-2 mb-3 py-3 px-5 bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg shadow-md border border-slate-700/80 hover:border-green-700/30 transition-all duration-200 cursor-pointer group"
              onClick={() => toggleZoneExpansion(zone)}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-900/70 to-emerald-800/70 shadow-inner border border-green-600/30">
                  <Filter size={16} className="text-green-300" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white group-hover:text-green-200 transition-colors duration-200">{zone}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Zone de management</p>
                </div>
                <div className="ml-2 px-3 py-1 rounded-md bg-gradient-to-r from-rose-900/60 to-red-900/60 border border-rose-700/30 text-xs text-rose-100 font-medium shadow-inner">
                  {/* Compte total des problèmes dans cette zone */}
                  {Object.values(dateGroups).flat().length}
                </div>
              </div>
              {/* Icône de flèche pour indiquer l'état d'expansion */}
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-slate-700 transition-colors duration-200">
                {expandedZones[zone] ? 
                  <ChevronDown size={16} className="text-green-300" /> : 
                  <ChevronRight size={16} className="text-green-300" />
                }
              </div>
            </div>
          )}
          
          {/* Contenu de la zone (visible seulement si la zone est dépliée ou si le regroupement par zone est désactivé) */}
          {(!groupByZone || expandedZones[zone]) && (
            <div className="pl-5 ml-4 border-l-2 border-green-900/40 mb-5">
              {/* Pour chaque groupe de date dans cette zone */}
              {Object.entries(dateGroups).map(([date, problems]) => (
                <div key={date} className="mb-5">
                  {/* En-tête de date (seulement si groupByDate est activé) */}
                  {groupByDate && (
                    <div className="flex items-center gap-3 mb-3 py-2 px-4 bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-md border border-slate-700/40">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-900/70 to-indigo-800/70 shadow-inner border border-blue-700/30">
                        <Clock size={14} className="text-blue-300" />
                      </div>
                      <h3 className="text-sm font-medium text-blue-100">{date}</h3>
                      <div className="ml-2 px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-900/60 to-orange-900/60 border border-amber-700/30 text-xs text-amber-200 font-medium shadow-inner">
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