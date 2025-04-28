import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ChevronLeft, Clock, AlertTriangle, ExternalLink, RefreshCw, Cpu, Activity, Server, Filter, Loader, Database, Search, ArrowUp, ArrowDown, X, Check, Monitor, Sliders } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ManagementZone, Problem, ProcessGroup, Host, Service } from '../../api/types';
import ProblemsList from './ProblemsList';
import PaginatedTable, { Column } from '../common/PaginatedTable';
import { useApp } from '../../contexts/AppContext';
import AdvancedOsFilter from '../common/AdvancedOsFilter';
import FilterBadges from '../common/FilterBadges';

interface OsFilter {
  type: string;
  versions: string[];
}

interface ZoneDetailsProps {
  zone: ManagementZone;
  problems: Problem[];
  processGroups: ProcessGroup[];
  hosts: Host[];
  services: Service[];
  activeTab: string;
  onBackClick: () => void;
  onTabChange: (tab: string) => void;
  isLoading?: boolean;
}

const ZoneDetails: React.FC<ZoneDetailsProps> = ({
  zone,
  problems,
  processGroups,
  hosts,
  services,
  activeTab,
  onBackClick,
  onTabChange,
  isLoading = false
}) => {
  const { isDarkTheme } = useTheme();
  const { refreshData } = useApp();
  
  // États pour le tri et la recherche
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' | null }>({
    key: '',
    direction: null
  });
  
  // États pour la recherche
  const [hostSearchTerm, setHostSearchTerm] = useState<string>('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState<string>('');
  
  // États pour les filtres avancés
  const [showAdvancedOsFilter, setShowAdvancedOsFilter] = useState<boolean>(false);
  const [osFilters, setOsFilters] = useState<OsFilter[]>([]);
  
  // Filtrer les problèmes pour la zone courante (mémorisé)
  const zoneProblems = useMemo(() => 
    problems.filter(problem => problem.zone === zone.name),
    [problems, zone.name]
  );

  // Déterminer les couleurs en fonction de la zone et du thème (mémorisé)
  const zoneColors = useMemo(() => {
    const colors = {
      red: {
        bg: isDarkTheme ? 'bg-red-500/10' : 'bg-red-100',
        text: isDarkTheme ? 'text-red-400' : 'text-red-600',
        border: isDarkTheme ? 'border-red-500/30' : 'border-red-200',
        highlight: 'bg-red-500',
      },
      amber: {
        bg: isDarkTheme ? 'bg-amber-500/10' : 'bg-amber-100',
        text: isDarkTheme ? 'text-amber-400' : 'text-amber-600',
        border: isDarkTheme ? 'border-amber-500/30' : 'border-amber-200',
        highlight: 'bg-amber-500',
      },
      orange: {
        bg: isDarkTheme ? 'bg-orange-500/10' : 'bg-orange-100',
        text: isDarkTheme ? 'text-orange-400' : 'text-orange-600',
        border: isDarkTheme ? 'border-orange-500/30' : 'border-orange-200',
        highlight: 'bg-orange-500',
      },
      blue: {
        bg: isDarkTheme ? 'bg-blue-500/10' : 'bg-blue-100',
        text: isDarkTheme ? 'text-blue-400' : 'text-blue-600',
        border: isDarkTheme ? 'border-blue-500/30' : 'border-blue-200',
        highlight: 'bg-blue-500',
      },
      emerald: {
        bg: isDarkTheme ? 'bg-emerald-500/10' : 'bg-emerald-100',
        text: isDarkTheme ? 'text-emerald-400' : 'text-emerald-600',
        border: isDarkTheme ? 'border-emerald-500/30' : 'border-emerald-200',
        highlight: 'bg-emerald-500',
      },
      purple: {
        bg: isDarkTheme ? 'bg-purple-500/10' : 'bg-purple-100',
        text: isDarkTheme ? 'text-purple-400' : 'text-purple-600',
        border: isDarkTheme ? 'border-purple-500/30' : 'border-purple-200',
        highlight: 'bg-purple-500',
      },
      green: {
        bg: isDarkTheme ? 'bg-green-500/10' : 'bg-green-100',
        text: isDarkTheme ? 'text-green-400' : 'text-green-600',
        border: isDarkTheme ? 'border-green-500/30' : 'border-green-200',
        highlight: 'bg-green-500',
      }
    };
    
    return colors[zone.color] || colors.blue;
  }, [zone.color, isDarkTheme]);
  
  // Fonction pour gérer le tri des colonnes
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' | null = 'ascending';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else if (sortConfig.direction === 'descending') {
        direction = null;
      }
    }
    
    setSortConfig({ key, direction });
  };
  
  // Fonction pour normaliser les données d'hôte au format attendu
  const normalizeHostData = (hostData: any): Host[] => {
    if (!hostData || !Array.isArray(hostData)) {
      console.log("normalizeHostData: Les données ne sont pas un tableau", hostData);
      return [];
    }
    
    // Transformer les données d'hôte au format attendu
    return hostData.map(host => ({
      id: host.id,
      name: host.name,
      cpu: host.cpu,
      ram: host.ram,
      os_version: host.os_version || "Non spécifié",
      dt_url: host.dt_url
    }));
  };
  
  // Normaliser les données d'hôte
  const normalizedHosts = useMemo(() => {
    return normalizeHostData(hosts);
  }, [hosts]);
  
  // Fonction pour obtenir les données triées et filtrées
  // Fonction modifiée dans ZoneDetails.tsx pour corriger la logique de filtrage

const getSortedData = <T extends {}>( data: T[], searchTerm: string = '', filters: any = {}): T[] => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  let sortableData = [...data];
  
  // Filtrer les données si un terme de recherche est fourni
  if (searchTerm && sortableData.length > 0 && 'name' in sortableData[0]) {
    sortableData = sortableData.filter(item => 
      ((item as any).name || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Appliquer des filtres avancés d'OS
  if (filters.osFilters && filters.osFilters.length > 0 && sortableData.length > 0 && 'os_version' in sortableData[0]) {
    sortableData = sortableData.filter(item => {
      const osVersion = (item as any).os_version;
      if (!osVersion) return false;
      
      // Déterminer le type d'OS de l'élément
      let itemOsType = "Autre";
      if (osVersion.toLowerCase().includes('linux')) {
        itemOsType = "Linux";
      } else if (osVersion.toLowerCase().includes('windows')) {
        itemOsType = "Windows";
      } else if (osVersion.toLowerCase().includes('unix')) {
        itemOsType = "Unix";
      } else if (osVersion.toLowerCase().includes('aix')) {
        itemOsType = "AIX";
      } else if (osVersion.toLowerCase().includes('mac') || osVersion.toLowerCase().includes('darwin')) {
        itemOsType = "MacOS";
      }
      
      // Vérifier si cet OS est dans nos filtres
      for (const filter of filters.osFilters) {
        if (filter.type === itemOsType) {
          // Si versions est vide, toutes les versions sont incluses
          if (filter.versions.length === 0) {
            return true;
          }
          
          // Sinon, vérifier si cette version spécifique est dans la liste
          return filter.versions.includes(osVersion);
        }
      }
      
      // Si aucun filtre ne correspond au type d'OS, exclure cet élément
      return false;
    });
  }
  
  // Si aucun tri n'est configuré, retourner les données filtrées
  if (!sortConfig.key || !sortConfig.direction) {
    return sortableData;
  }
  
  // Trier les données
  return sortableData.sort((a, b) => {
    if (!(sortConfig.key in a) || !(sortConfig.key in b)) {
      return 0;
    }
    
    const aValue = (a as any)[sortConfig.key];
    const bValue = (b as any)[sortConfig.key];
    
    // Gestion des valeurs null ou undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    
    if (aValue < bValue) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });
};
  
  // Extraire la liste des OS uniques des hôtes
  const uniqueOperatingSystems = useMemo(() => {
    if (!normalizedHosts || normalizedHosts.length === 0) return [];
    
    const osSet = new Set<string>();
    
    normalizedHosts.forEach(host => {
      if (host.os_version) {
        // Simplifions la détection des OS pour le filtrage
        let osType = "Autre";
        
        if (host.os_version.toLowerCase().includes('linux')) {
          osType = "Linux";
        } else if (host.os_version.toLowerCase().includes('windows')) {
          osType = "Windows";
        } else if (host.os_version.toLowerCase().includes('unix')) {
          osType = "Unix";
        } else if (host.os_version.toLowerCase().includes('aix')) {
          osType = "AIX";
        } else if (host.os_version.toLowerCase().includes('mac') || host.os_version.toLowerCase().includes('darwin')) {
          osType = "MacOS";
        }
        
        osSet.add(osType);
      }
    });
    
    return Array.from(osSet);
  }, [normalizedHosts]);

  // Fonction pour supprimer un filtre
  const handleRemoveFilter = (type: string, version?: string) => {
    if (version) {
      // Supprimer une version spécifique du filtre
      const filterIndex = osFilters.findIndex(f => f.type === type);
      if (filterIndex >= 0) {
        const newFilters = [...osFilters];
        const filter = {...newFilters[filterIndex]};
        
        if (filter.versions.includes(version)) {
          // Retirer cette version de la liste d'exclusion
          filter.versions = filter.versions.filter(v => v !== version);
          
          // Si plus aucune exclusion, simplifier à "toutes les versions"
          if (filter.versions.length === 0) {
            newFilters[filterIndex] = { type, versions: [] };
          } else {
            newFilters[filterIndex] = filter;
          }
        } else {
          // Si cette version n'est pas exclue, l'ajouter aux exclusions
          const allVersions = normalizedHosts
            .filter(host => {
              const osVersion = host.os_version || "";
              let itemOsType = "Autre";
              
              if (osVersion.toLowerCase().includes('linux')) {
                itemOsType = "Linux";
              } else if (osVersion.toLowerCase().includes('windows')) {
                itemOsType = "Windows";
              } else if (osVersion.toLowerCase().includes('unix')) {
                itemOsType = "Unix";
              } else if (osVersion.toLowerCase().includes('aix')) {
                itemOsType = "AIX";
              } else if (osVersion.toLowerCase().includes('mac') || osVersion.toLowerCase().includes('darwin')) {
                itemOsType = "MacOS";
              }
              
              return itemOsType === type;
            })
            .map(host => host.os_version || "");
            
            if (!filter.versions.includes(version)) {
              filter.versions.push(version);
            }
          
          // Si toutes les versions sont exclues, supprimer le filtre
          if (filter.versions.length >= allVersions.length) {
            newFilters.splice(filterIndex, 1);
          } else {
            newFilters[filterIndex] = filter;
          }
        }
        
        setOsFilters(newFilters);
      }
    } else {
      // Supprimer un filtre complet
      setOsFilters(osFilters.filter(f => f.type !== type));
    }
  };
  
  // Fonction pour obtenir le nombre total de filtres appliqués
  const getSelectedFiltersCount = (): number => {
    let count = 0;
    
    osFilters.forEach(filter => {
      if (filter.versions.length === 0) {
        count += 1; // Compte l'OS entier comme un filtre
      } else {
        count += 1; // Compte chaque filtre de version
      }
    });
    
    return count;
  };
  
  // Obtenir les données triées et filtrées pour les hôtes
  const sortedHosts = useMemo(() => {
    return getSortedData(normalizedHosts, hostSearchTerm, { osFilters: osFilters });
  }, [normalizedHosts, sortConfig, hostSearchTerm, osFilters]);
  
  // Obtenir les données triées et filtrées pour les services
  const sortedServices = useMemo(() => {
    return getSortedData(services, serviceSearchTerm);
  }, [services, sortConfig, serviceSearchTerm]);
  
  // Définition des colonnes pour les tableaux (mémorisée)
  const processColumns = useMemo<Column<ProcessGroup>[]>(() => [
    {
      key: 'name',
      label: 'Nom',
      cellClassName: 'font-medium text-sm',
    },
    {
      key: 'technology',
      label: 'Technologie',
      cellClassName: 'text-sm',
      render: (process: ProcessGroup) => (
        <div className="flex items-center">
          {process.icon}
          <span className="ml-2">{process.technology}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      cellClassName: 'text-right',
      render: (process: ProcessGroup) => (
        <a 
          href={process.dt_url} 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-red-400 hover:underline dark:text-red-400"
        >
          <ExternalLink size={12} />
          Dynatrace
        </a>
      ),
    },
  ], []);

  const serviceColumns = useMemo(() => [
    {
      key: 'name',
      label: (
        <div className="flex items-center cursor-pointer" onClick={() => requestSort('name')}>
          Nom
          {sortConfig.key === 'name' && (
            <span className="ml-1">
              {sortConfig.direction === 'ascending' ? (
                <ArrowUp size={14} />
              ) : sortConfig.direction === 'descending' ? (
                <ArrowDown size={14} />
              ) : null}
            </span>
          )}
        </div>
      ),
      cellClassName: 'font-medium text-sm',
      render: (service: Service) => (
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${service.status === 'Actif' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          {service.name}
        </div>
      ),
    },
    {
      key: 'technology',
      label: (
        <div className="flex items-center cursor-pointer" onClick={() => requestSort('technology')}>
          Technologie
          {sortConfig.key === 'technology' && (
            <span className="ml-1">
              {sortConfig.direction === 'ascending' ? (
                <ArrowUp size={14} />
              ) : sortConfig.direction === 'descending' ? (
                <ArrowDown size={14} />
              ) : null}
            </span>
          )}
        </div>
      ),
      cellClassName: 'text-sm',
      render: (service: Service) => (
        <div className="flex items-center gap-2">
          <span className="text-sm">{service.technology}</span>
        </div>
      ),
    },
    {
      key: 'response_time',
      label: (
        <div className="flex items-center cursor-pointer" onClick={() => requestSort('response_time')}>
          Temps de réponse
          {sortConfig.key === 'response_time' && (
            <span className="ml-1">
              {sortConfig.direction === 'ascending' ? (
                <ArrowUp size={14} />
              ) : sortConfig.direction === 'descending' ? (
                <ArrowDown size={14} />
              ) : null}
            </span>
          )}
        </div>
      ),
      cellClassName: 'text-sm',
      render: (service: Service) => (
        <span className={`${
          service.response_time !== null ? 
            (service.response_time > 1000 ? 'text-red-500' : 
            service.response_time > 500 ? 'text-yellow-500' : 
            'text-green-500') : 
            'text-slate-400'
        }`}>
          {service.response_time !== null ? `${service.response_time} ms` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'error_rate',
      label: (
        <div className="flex items-center cursor-pointer" onClick={() => requestSort('error_rate')}>
          Taux d'erreur
          {sortConfig.key === 'error_rate' && (
            <span className="ml-1">
              {sortConfig.direction === 'ascending' ? (
                <ArrowUp size={14} />
              ) : sortConfig.direction === 'descending' ? (
                <ArrowDown size={14} />
              ) : null}
            </span>
          )}
        </div>
      ),
      cellClassName: 'text-sm',
      render: (service: Service) => (
        <span className={`${
          service.error_rate !== null ? 
            (service.error_rate > 5 ? 'text-red-500' : 
            service.error_rate > 1 ? 'text-yellow-500' : 
            'text-green-500') : 
            'text-green-500'
        }`}>
          {service.error_rate !== null ? `${service.error_rate}%` : '0%'}
        </span>
      ),
    },
    {
      key: 'requests',
      label: (
        <div className="flex items-center cursor-pointer" onClick={() => requestSort('requests')}>
          Requêtes
          {sortConfig.key === 'requests' && (
            <span className="ml-1">
              {sortConfig.direction === 'ascending' ? (
                <ArrowUp size={14} />
              ) : sortConfig.direction === 'descending' ? (
                <ArrowDown size={14} />
              ) : null}
            </span>
          )}
        </div>
      ),
      cellClassName: 'text-sm',
      render: (service: Service) => (
        service.requests ? service.requests.toLocaleString() : 'N/A'
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      cellClassName: 'text-right',
      render: (service: Service) => (
        <a 
          href={service.dt_url} 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-red-400 hover:underline dark:text-red-400"
        >
          <ExternalLink size={12} />
          Dynatrace
        </a>
      ),
    },
  ], [sortConfig]);

  const hostColumns = useMemo(() => [
    {
      key: 'name',
      label: (
        <div className="flex items-center cursor-pointer" onClick={() => requestSort('name')}>
          Nom
          {sortConfig.key === 'name' && (
            <span className="ml-1">
              {sortConfig.direction === 'ascending' ? (
                <ArrowUp size={14} />
              ) : sortConfig.direction === 'descending' ? (
                <ArrowDown size={14} />
              ) : null}
            </span>
          )}
        </div>
      ),
      cellClassName: 'font-medium text-sm',
    },
    {
      key: 'os_version',
      label: (
        <div className="flex items-center cursor-pointer" onClick={() => requestSort('os_version')}>
          Système d'exploitation
          {sortConfig.key === 'os_version' && (
            <span className="ml-1">
              {sortConfig.direction === 'ascending' ? (
                <ArrowUp size={14} />
              ) : sortConfig.direction === 'descending' ? (
                <ArrowDown size={14} />
              ) : null}
            </span>
          )}
        </div>
      ),
      cellClassName: 'text-sm',
      render: (host: Host) => (
        <div className="flex items-center gap-2">
          {getOsIcon(host.os_version)}
          <span>{host.os_version || 'Non spécifié'}</span>
        </div>
      ),
    },
    {
      key: 'cpu',
      label: (
        <div className="flex items-center cursor-pointer" onClick={() => requestSort('cpu')}>
          CPU
          {sortConfig.key === 'cpu' && (
            <span className="ml-1">
              {sortConfig.direction === 'ascending' ? (
                <ArrowUp size={14} />
              ) : sortConfig.direction === 'descending' ? (
                <ArrowDown size={14} />
              ) : null}
            </span>
          )}
        </div>
      ),
      cellClassName: 'text-sm',
      render: (host: Host) => (
        <span className={`${
          host.cpu !== null ? 
            (host.cpu > 80 ? 'text-red-500' : 
            host.cpu > 60 ? 'text-yellow-500' : 
            'text-green-500') : 
            'text-slate-400'
        }`}>
          {host.cpu !== null ? `${host.cpu}%` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'ram',
      label: (
        <div className="flex items-center cursor-pointer" onClick={() => requestSort('ram')}>
          RAM
          {sortConfig.key === 'ram' && (
            <span className="ml-1">
              {sortConfig.direction === 'ascending' ? (
                <ArrowUp size={14} />
              ) : sortConfig.direction === 'descending' ? (
                <ArrowDown size={14} />
              ) : null}
            </span>
          )}
        </div>
      ),
      cellClassName: 'text-sm',
      render: (host: Host) => (
        <span className={`${
          host.ram !== null ? 
            (host.ram > 80 ? 'text-red-500' : 
            host.ram > 60 ? 'text-yellow-500' : 
            'text-green-500') : 
            'text-slate-400'
        }`}>
          {host.ram !== null ? `${host.ram}%` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      cellClassName: 'text-right',
      render: (host: Host) => (
        <a 
          href={host.dt_url} 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-red-400 hover:underline dark:text-red-400"
        >
          <ExternalLink size={12} />
          Dynatrace
        </a>
      ),
    },
  ], [sortConfig]);

  // Helper pour obtenir l'icône du système d'exploitation
  const getOsIcon = (osVersion: string = '') => {
    const os = osVersion.toLowerCase();
    
    if (os.includes('linux')) {
      return <span className="text-orange-500">🐧</span>;
    } else if (os.includes('windows')) {
      return <span className="text-blue-500">🪟</span>;
    } else if (os.includes('mac') || os.includes('darwin')) {
      return <span className="text-gray-500">🍎</span>;
    } else if (os.includes('unix') || os.includes('aix')) {
      return <span className="text-purple-500">🖥️</span>;
    }
    
    return <Monitor size={14} className="text-slate-400" />;
  };

  // Optimiser le gestionnaire d'événements avec useCallback
  const handleTabClick = useCallback((tab: string) => {
    onTabChange(tab);
  }, [onTabChange]);

  // État de chargement pour les détails de la zone
  if (isLoading) {
    return (
      <div>
        <button 
          onClick={onBackClick}
          className={`mb-5 flex items-center gap-2 px-4 py-1.5 rounded-lg border ${
            isDarkTheme ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ChevronLeft size={14} />
          <span>Retour aux Management Zones</span>
        </button>
        
        <div className="flex flex-col items-center justify-center h-64">
          <Loader className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-400">Chargement des détails de la zone...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button 
        onClick={onBackClick}
        className={`mb-5 flex items-center gap-2 px-4 py-1.5 rounded-lg border ${
          isDarkTheme ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
        }`}
      >
        <ChevronLeft size={14} />
        <span>Retour aux Management Zones</span>
      </button>
      
      {/* En-tête avec infos de la zone */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl ${zoneColors.bg} ${zoneColors.text}`}>
            {zone.icon}
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${zoneColors.text}`}>
              {zone.name}
              <span className="ml-3 text-sm font-medium text-slate-400">{zone.code}</span>
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400" />
                <span className="text-xs text-slate-400">Dernière mise à jour: {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={12} className={zoneProblems.length > 0 ? "text-red-500" : "text-green-500"} />
                <span className={`text-xs ${zoneProblems.length > 0 ? "text-red-400" : "text-green-400"}`}>
                  {zoneProblems.length > 0 
                    ? `${zoneProblems.length} problème${zoneProblems.length > 1 ? 's' : ''} actif${zoneProblems.length > 1 ? 's' : ''}` 
                    : "Aucun problème"
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <a 
            href={zone.dt_url} 
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${zoneColors.bg} ${zoneColors.text}`}
          >
            <ExternalLink size={14} />
            <span>Ouvrir dans Dynatrace</span>
          </a>
          
          <button 
            onClick={refreshData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
          >
            <RefreshCw size={14} />
            <span>Rafraîchir</span>
          </button>
        </div>
      </div>
      
      {/* Statistiques générales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className={`p-3 rounded-lg border ${
          isDarkTheme ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400 mb-1">Disponibilité</div>
          <div className={`text-xl font-bold ${
            parseFloat(zone.availability) < 99 
              ? 'text-yellow-500' 
              : 'text-green-500'
          }`}>{zone.availability}</div>
        </div>
        <div className={`p-3 rounded-lg border ${
          isDarkTheme ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400 mb-1">Applications</div>
          <div className="text-xl font-bold">{zone.apps}</div>
        </div>
        <div className={`p-3 rounded-lg border ${
          isDarkTheme ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400 mb-1">Services</div>
          <div className="text-xl font-bold">{zone.services}</div>
        </div>
        <div className={`p-3 rounded-lg border ${
          isDarkTheme ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400 mb-1">Hôtes</div>
          <div className="text-xl font-bold">{zone.hosts}</div>
        </div>
      </div>
      
      {/* Problèmes actifs pour cette zone */}
      {zoneProblems.length > 0 && (
        <ProblemsList 
          problems={zoneProblems} 
          title={`Problèmes actifs dans ${zone.name}`} 
        />
      )}
      
      {/* Navigation par onglets - CHANGEMENT D'ORDRE DES ONGLETS */}
      <div className="flex border-b mb-5 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => handleTabClick('hosts')}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
            activeTab === 'hosts' 
              ? `border-${zone.color}-500 ${zoneColors.text}` 
              : `border-transparent ${
                  isDarkTheme ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
                }`
          }`}
        >
          <div className="flex items-center gap-2">
            <Server size={14} />
            <span>Hôtes</span>
          </div>
        </button>
        <button 
          onClick={() => handleTabClick('services')}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
            activeTab === 'services' 
              ? `border-${zone.color}-500 ${zoneColors.text}` 
              : `border-transparent ${
                  isDarkTheme ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
                }`
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity size={14} />
            <span>Services</span>
          </div>
        </button>
        <button 
          onClick={() => handleTabClick('process-groups')}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
            activeTab === 'process-groups' 
              ? `border-${zone.color}-500 ${zoneColors.text}` 
              : `border-transparent ${
                  isDarkTheme ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
                }`
          }`}
        >
          <div className="flex items-center gap-2">
            <Cpu size={14} />
            <span>Process Groups</span>
          </div>
        </button>
      </div>
      
      {/* Contenu des onglets - Utilisation du composant PaginatedTable */}
      
      {/* Onglet Hôtes */}
      {activeTab === 'hosts' && (
        <section className={`rounded-lg overflow-hidden ${
          isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        } border`}>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center p-3 border-b border-slate-700">
              <h2 className="font-semibold flex items-center gap-2">
                <Server className={zoneColors.text} size={16} />
                <span>Hôtes</span>
                <span className="text-xs text-slate-400 ml-2">({sortedHosts.length})</span>
              </h2>
              
              {/* Barre de recherche et bouton de filtre pour les hôtes */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input 
                    type="text" 
                    value={hostSearchTerm}
                    onChange={(e) => setHostSearchTerm(e.target.value)}
                    placeholder="Rechercher un hôte..."
                    className={`w-64 h-8 pl-8 pr-4 rounded-md ${
                      isDarkTheme 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                        : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-500'
                    } border focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  />
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                  {hostSearchTerm && (
                    <button
                      onClick={() => setHostSearchTerm('')}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-500"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowAdvancedOsFilter(!showAdvancedOsFilter)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm ${
                    isDarkTheme 
                      ? osFilters.length > 0 
                        ? 'border-indigo-600 bg-indigo-700/30 text-indigo-400' 
                        : 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                      : osFilters.length > 0 
                        ? 'border-indigo-600 bg-indigo-100 text-indigo-600' 
                        : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Filter size={14} />
                  <span>Filtres avancés {osFilters.length > 0 && `(${getSelectedFiltersCount()})`}</span>
                </button>
              </div>
            </div>
            
            {/* Afficher les badges de filtres actifs */}
            {osFilters.length > 0 && (
              <FilterBadges
                filters={osFilters}
                onRemoveFilter={handleRemoveFilter}
                onClearAllFilters={() => setOsFilters([])}
              />
            )}
            
            {/* Popup du filtre avancé des OS */}
            {showAdvancedOsFilter && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <AdvancedOsFilter
                  hosts={normalizedHosts}
                  selectedFilters={osFilters}
                  onFilterChange={setOsFilters}
                  onClose={() => setShowAdvancedOsFilter(false)}
                />
              </div>
            )}
            
            {/* Section principale du tableau */}
            <PaginatedTable 
              data={sortedHosts}
              columns={hostColumns}
              pageSize={20}
              emptyMessage={
                osFilters.length > 0
                  ? "Aucun hôte ne correspond aux filtres sélectionnés."
                  : "Aucun hôte trouvé pour cette management zone."
              }
            />
          </div>
        </section>
      )}
      
      {/* Onglet Services */}
      {activeTab === 'services' && (
        <section className={`rounded-lg overflow-hidden ${
          isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        } border`}>
          <div className="flex justify-between items-center p-3 border-b border-slate-700">
            <h2 className="font-semibold flex items-center gap-2">
              <Activity className={zoneColors.text} size={16} />
              <span>Services</span>
              <span className="text-xs text-slate-400 ml-2">({sortedServices.length})</span>
            </h2>
            
            {/* Barre de recherche pour les services */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input 
                  type="text" 
                  value={serviceSearchTerm}
                  onChange={(e) => setServiceSearchTerm(e.target.value)}
                  placeholder="Rechercher un service..."
                  className={`w-64 h-8 pl-8 pr-4 rounded-md ${
                    isDarkTheme 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                      : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-500'
                  } border focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                />
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                {serviceSearchTerm && (
                  <button
                    onClick={() => setServiceSearchTerm('')}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              <button className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm ${
                isDarkTheme ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}>
                <Filter size={12} />
                <span>Filtrer</span>
              </button>
            </div>
          </div>

          <PaginatedTable 
            data={sortedServices}
            columns={serviceColumns}
            pageSize={20}
            emptyMessage="Aucun service trouvé pour cette management zone."
          />
        </section>
      )}
      
      {/* Onglet Process Groups */}
      {activeTab === 'process-groups' && (
        <section className={`rounded-lg overflow-hidden ${
          isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        } border`}>
          <div className="flex justify-between items-center p-3 border-b border-slate-700">
            <h2 className="font-semibold flex items-center gap-2">
              <Cpu className={zoneColors.text} size={16} />
              <span>Process Groups</span>
              <span className="text-xs text-slate-400 ml-2">({processGroups.length})</span>
            </h2>
            <button className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm ${
              isDarkTheme ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}>
              <Filter size={12} />
              <span>Filtrer</span>
            </button>
          </div>

          <PaginatedTable 
            data={processGroups}
            columns={processColumns}
            pageSize={20}
            emptyMessage="Aucun process group trouvé pour cette management zone."
          />
        </section>
      )}
    </div>
  );
};

export default ZoneDetails;