import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layers, Search, CheckCircle2, AlertTriangle, LayoutGrid, List, ArrowDownUp, RefreshCw, Filter } from 'lucide-react';
import ZoneCard from '../common/ZoneCard';
import { ManagementZone } from '../../api/types';
import { useZoneStatusPreloader } from '../../hooks/useZoneStatusPreloader';

// Type pour les filtres
interface ZoneFilters {
  showProblemsOnly: boolean;
  showDegradedOnly: boolean;
  sortBy: 'name' | 'problems' | 'hosts' | 'services' | 'availability';
}

interface ModernManagementZoneListProps {
  zones: ManagementZone[];
  onZoneClick: (zoneId: string) => void;
  title?: string;
  subtitle?: string;
  variant?: 'vfg' | 'vfe' | 'vfp' | 'vfa' | 'detection' | 'security';
  loading?: boolean;
  onRefresh?: () => void;
}

/**
 * Liste ultra-moderne des Management Zones avec différents modes d'affichage,
 * filtrage, tri et effets visuels avancés
 */
const ModernManagementZoneList: React.FC<ModernManagementZoneListProps> = ({ 
  zones, 
  onZoneClick,
  title = "Management Zones",
  subtitle = "Sélectionnez une zone pour afficher ses détails",
  variant = 'vfg',
  loading = false,
  onRefresh
}) => {
  // Utiliser le préchargeur de statuts pour les Management Zones
  const { isPreloaded, applyPreloadedStatuses } = useZoneStatusPreloader();
  
  // Mode d'affichage fixé en grille
  const viewMode = 'grid';
  
  // Design fixé en neumorphique
  const cardDesign = 'neumorph';
  
  // État pour le filtre de recherche avec persistance
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('managementZoneSearch') || '';
  });

  // Sauvegarder le terme de recherche dans localStorage
  useEffect(() => {
    localStorage.setItem('managementZoneSearch', searchTerm);
  }, [searchTerm]);
  
  // État pour les filtres avec persistance via localStorage
  const [filters, setFilters] = useState<ZoneFilters>(() => {
    // Récupérer les préférences stockées ou utiliser les valeurs par défaut
    const savedFilters = localStorage.getItem('managementZoneFilters');
    return savedFilters ? JSON.parse(savedFilters) : {
      showProblemsOnly: false,
      showDegradedOnly: false,
      sortBy: 'name'
    };
  });
  
  // Sauvegarder les filtres dans localStorage quand ils changent
  useEffect(() => {
    localStorage.setItem('managementZoneFilters', JSON.stringify(filters));
  }, [filters]);
  
  // État pour contrôler l'animation de défilement
  const [scrolling, setScrolling] = useState(false);
  
  // Animation de défilement
  useEffect(() => {
    if (scrolling) {
      const timeout = setTimeout(() => setScrolling(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [scrolling]);
  
  // State pour forcer la mise à jour de l'UI quand les données des zones changent
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  // Utilise useRef pour suivre la dernière structure de données des zones
  const prevZonesRef = useRef<string>('');
  
  // Ref pour suivre si le composant est monté
  const isMountedRef = useRef(true);
  
  // Effect pour nettoyer le ref quand le composant se démonte
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  
  // Appliquer les statuts préchargés aux zones si disponibles
  const zonesWithPreloadedStatus = useMemo(() => {
    if (isPreloaded && zones.length > 0) {
      console.log(`Appliquer les statuts préchargés aux ${zones.length} Management Zones`);
      return applyPreloadedStatuses(zones, variant);
    }
    return zones;
  }, [zones, isPreloaded, applyPreloadedStatuses, variant]);
  
  useEffect(() => {
    // Ce useEffect force une mise à jour du composant dès que les zones changent,
    // avec une priorité maximale pour éliminer la latence visible
    
    // Fonction pour mettre à jour l'affichage immédiatement
    const updateZonesDisplay = () => {
      if (!isMountedRef.current) return;
      
      if (zonesWithPreloadedStatus && zonesWithPreloadedStatus.length > 0) {
        // Créer une empreinte de la structure actuelle des zones avec leurs statuts
        const zonesHash = JSON.stringify(zonesWithPreloadedStatus.map(z => ({id: z.id, problemCount: z.problemCount, status: z.status})));
        
        // Comparer avec la structure précédente
        if (zonesHash !== prevZonesRef.current) {
          // Mettre à jour l'empreinte immédiatement
          prevZonesRef.current = zonesHash;
          
          // Log des zones avec problèmes
          const zonesWithProblems = zonesWithPreloadedStatus.filter(z => z.problemCount > 0);
          console.log(`Actualisation immédiate de l'affichage: ${zonesWithPreloadedStatus.length} zones, dont ${zonesWithProblems.length} avec problèmes (préchargé: ${isPreloaded})`);
          
          // Forcer la mise à jour avec un nouvel horodatage - exécution hautement prioritaire
          setLastRefresh(Date.now());
        }
      }
    };
    
    // Utiliser une microtask pour exécution immédiate avec priorité maximale
    queueMicrotask(updateZonesDisplay);
    
    // Assurer que l'affichage est mis à jour avant et après le paint du navigateur
    // pour éliminer complètement la latence perceptible
    const firstRender = requestAnimationFrame(() => {
      updateZonesDisplay();
      
      // Second requestAnimationFrame pour capturer tous les cas de figure
      const secondRender = requestAnimationFrame(() => {
        updateZonesDisplay();
      });
      
      return () => cancelAnimationFrame(secondRender);
    });
    
    return () => cancelAnimationFrame(firstRender);
  }, [zonesWithPreloadedStatus, isPreloaded]);
  
  // Filtrer et trier les zones avec useMemo pour éviter les recalculs inutiles
  // Le lastRefresh force la réévaluation même si la référence aux zones n'a pas changé
  const filteredZones = useMemo(() => {
    // Prioriser l'affichage des zones avec problèmes en premier
    const zonesWithProblems = zonesWithPreloadedStatus.filter(z => z.problemCount > 0);
    const zonesWithoutProblems = zonesWithPreloadedStatus.filter(z => z.problemCount === 0);
    const prioritizedZones = [...zonesWithProblems, ...zonesWithoutProblems];
    
    return prioritizedZones
      .filter(zone => {
        // Filtre de recherche
        if (searchTerm && !zone.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        // Filtre de problèmes
        if (filters.showProblemsOnly && zone.problemCount === 0) {
          return false;
        }
        
        // Filtre de statut
        if (filters.showDegradedOnly && zone.status === 'healthy') {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Tri prioritaire par problèmes si 'sortBy' n'est pas 'problems'
        if (filters.sortBy !== 'problems' && a.problemCount !== b.problemCount) {
          return b.problemCount - a.problemCount;
        }
        
        // Appliquer le tri demandé
        switch (filters.sortBy) {
          case 'problems':
            return b.problemCount - a.problemCount;
          case 'hosts':
            return b.hosts - a.hosts;
          case 'services':
            return b.services - a.services;
          case 'availability':
            return parseFloat(b.availability) - parseFloat(a.availability);
          case 'name':
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [zonesWithPreloadedStatus, searchTerm, filters, lastRefresh]);
  
  // Définir les classes CSS pour le thème en fonction de la variante
  const determineThemeColor = () => {
    switch(variant) {
      case 'vfg':
        return 'indigo';
      case 'vfe':
        return 'amber';
      case 'detection':
        return 'emerald';
      case 'security':
        return 'orange';
      case 'vfp':
        return 'green';
      case 'vfa':
        return 'purple';
      default:
        return 'indigo';
    }
  };
  
  const themeColor = determineThemeColor();
  
  // Défilement fluide vers une section
  const scrollToSection = (id: string) => {
    setScrolling(true);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Gérer le rafraîchissement avec préchargement
  const handleRefresh = () => {
    if (onRefresh) {
      // Force un nouveau préchargement des statuts et un rechargement complet depuis le backend
      console.log('Rafraîchir avec préchargement et forcer le rechargement depuis le backend');
      onRefresh();
    }
  };
  
  return (
    <section className={`rounded-lg overflow-hidden bg-slate-800 border border-slate-700 transition-all duration-300 ${
      scrolling ? 'opacity-90' : 'opacity-100'
    }`}>
      {/* En-tête avec titre et contrôles */}
      <div className="p-5 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4">
          {/* Titre et sous-titre */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg bg-${themeColor}-500/10 text-${themeColor}-400 border border-${themeColor}-500/30`}>
              <Layers size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-sm text-slate-400">{subtitle}</p>
              
              {/* Statistiques rapides */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-green-400" />
                  <span className="text-xs text-slate-300">
                    {zonesWithPreloadedStatus.filter(z => z.status === 'healthy').length} zones saines
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className="text-xs text-slate-300">
                    {zonesWithPreloadedStatus.filter(z => z.problemCount > 0).length} zones avec problèmes
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contrôles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Rafraîchir */}
            {onRefresh && (
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className={`p-2 rounded-full ${loading ? 'bg-slate-700 text-slate-500' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                title="Force un rechargement complet depuis le backend"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
            
            {/* Les contrôles de changement de mode d'affichage et de design ont été retirés */}
          </div>
        </div>
        
        {/* Barre de recherche et filtres */}
        <div className="mt-5 flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
          {/* Recherche */}
          <div className="w-full md:w-1/2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Rechercher une zone..." 
              className="w-full py-2 pl-10 pr-4 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <button 
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setSearchTerm('')}
              >
                <span className="text-slate-400 hover:text-white">✕</span>
              </button>
            )}
          </div>
          
          {/* Filtres */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="problems-filter" 
                className="h-4 w-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
                checked={filters.showProblemsOnly}
                onChange={() => setFilters((prev: ZoneFilters) => ({ ...prev, showProblemsOnly: !prev.showProblemsOnly }))} 
              />
              <label htmlFor="problems-filter" className="ml-2 text-sm text-slate-300">
                Avec problèmes
              </label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="degraded-filter" 
                className="h-4 w-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
                checked={filters.showDegradedOnly}
                onChange={() => setFilters((prev: ZoneFilters) => ({ ...prev, showDegradedOnly: !prev.showDegradedOnly }))} 
              />
              <label htmlFor="degraded-filter" className="ml-2 text-sm text-slate-300">
                État dégradé
              </label>
            </div>
            
            {/* Tri */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-600">
                <ArrowDownUp size={14} />
                <span className="hidden sm:inline">Trier</span>
              </button>
              
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="py-1">
                  {[
                    { id: 'name', label: 'Par nom' },
                    { id: 'problems', label: 'Par problèmes' },
                    { id: 'hosts', label: 'Par nombre d\'hôtes' },
                    { id: 'services', label: 'Par nombre de services' },
                    { id: 'availability', label: 'Par disponibilité' }
                  ].map(option => (
                    <button 
                      key={option.id}
                      onClick={() => setFilters((prev: ZoneFilters) => ({ ...prev, sortBy: option.id as ZoneFilters['sortBy'] }))}
                      className={`flex items-center w-full px-4 py-2 text-sm ${
                        filters.sortBy === option.id ? `text-${themeColor}-400` : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full mr-2 ${filters.sortBy === option.id ? `bg-${themeColor}-500` : 'bg-transparent'}`}></span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Barre d'informations */}
      <div className="px-5 py-3 bg-slate-900/60 border-b border-slate-700 flex flex-wrap items-center justify-between">
        <div className="text-sm text-slate-400">
          {filteredZones.length} zone{filteredZones.length !== 1 ? 's' : ''} trouvée{filteredZones.length !== 1 ? 's' : ''}
          {searchTerm && ` pour "${searchTerm}"`}
          {filters.showProblemsOnly && ' avec problèmes'}
          {filters.showDegradedOnly && ' en état dégradé'}
        </div>
        
        {/* Navigation rapide horizontale pour les grandes listes */}
        {filteredZones.length > 9 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs text-slate-500">Aller à:</span>
            {filteredZones.filter((_, i) => i % 6 === 0).map((zone, i) => (
              <button 
                key={i}
                onClick={() => scrollToSection(`zone-${zone.id}`)}
                className={`px-2 py-0.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap`}
              >
                {zone.name.substring(0, 15)}{zone.name.length > 15 ? '...' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Liste des zones */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-slate-600 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400">Chargement des management zones...</p>
          </div>
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="flex items-center justify-center p-16">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 mb-4">
              <Filter size={24} className="text-slate-500" />
            </div>
            <p className="text-slate-400 text-lg mb-2">Aucune zone ne correspond aux critères</p>
            <p className="text-slate-500 text-sm">Essayez de modifier vos filtres ou votre recherche</p>
            <button 
              onClick={() => {
                // Réinitialiser les filtres et les sauvegarder
                setSearchTerm('');
                const defaultFilters: ZoneFilters = {
                  showProblemsOnly: false,
                  showDegradedOnly: false,
                  sortBy: 'name'
                };
                setFilters(defaultFilters);
                localStorage.setItem('managementZoneFilters', JSON.stringify(defaultFilters));
                localStorage.setItem('managementZoneSearch', '');
              }}
              className="mt-4 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredZones.map(zone => (
            <div key={zone.id} id={`zone-${zone.id}`}>
              <ZoneCard 
                zone={zone} 
                onZoneClick={onZoneClick}
                variant="standard"
                design={cardDesign}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination ou chargement infini */}
      {filteredZones.length > 12 && (
        <div className="p-5 border-t border-slate-700 flex justify-center">
          <button 
            className={`px-4 py-2 rounded-md text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 flex items-center gap-2`}
          >
            <span>Charger plus de zones</span>
            <RefreshCw size={14} />
          </button>
        </div>
      )}
    </section>
  );
};

export default ModernManagementZoneList;
