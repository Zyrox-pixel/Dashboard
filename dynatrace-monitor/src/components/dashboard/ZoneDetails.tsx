import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ChevronLeft, Clock, AlertTriangle, ExternalLink, RefreshCw, Cpu, Activity, Server, Filter, Loader, Database, Search, ArrowUp, ArrowDown, X, Check, Monitor, Sliders } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ManagementZone, Problem, ProcessGroup, Host, Service } from '../../api/types';
import ProblemsList from './ProblemsList';
import PaginatedTable, { Column } from '../common/PaginatedTable';
import AdvancedFilter, { FilterCategory, FilterValue, FilterItem } from '../common/AdvancedFilter';
import FilterBadges, { FilterBadge } from '../common/FilterBadges';
import axios from 'axios';
import { API_BASE_URL } from '../../api/endpoints';

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
  const [showAdvancedFilter, setShowAdvancedFilter] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'os' | 'service' | 'process' | null>(null);
  
  // États pour les filtres
  const [osFilters, setOsFilters] = useState<FilterValue[]>([]);
  const [serviceFilters, setServiceFilters] = useState<FilterValue[]>([]);
  const [processFilters, setProcessFilters] = useState<FilterValue[]>([]);
  
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
  const getSortedData = <T extends {}>( data: T[], searchTerm: string = ''): T[] => {
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
  
  // Helper pour obtenir l'icône du système d'exploitation - DÉPLACÉ ICI AVANT SON UTILISATION
  const getOsIcon = (osVersion: string = '', small: boolean = false) => {
    const size = small ? 14 : 18;
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
    
    return <Monitor size={size} className="text-slate-400" />;
  };
  
  // Helper pour obtenir l'icône d'une technologie - DÉPLACÉ ICI AVANT SON UTILISATION
  const getTechnologyIcon = (tech: string) => {
    const techLower = tech.toLowerCase();
    
    if (techLower.includes('java')) {
      return <span className="text-orange-500">☕</span>;
    } else if (techLower.includes('python')) {
      return <span className="text-green-500">🐍</span>;
    } else if (techLower.includes('node') || techLower.includes('javascript')) {
      return <span className="text-yellow-500">⚡</span>;
    } else if (techLower.includes('.net') || techLower.includes('dotnet')) {
      return <span className="text-blue-500">🔷</span>;
    } else if (techLower.includes('go')) {
      return <span className="text-blue-500">🐹</span>;
    } else if (techLower.includes('php')) {
      return <span className="text-indigo-500">🐘</span>;
    } else if (techLower.includes('ruby')) {
      return <span className="text-red-500">💎</span>;
    } else if (techLower.includes('database') || techLower.includes('sql')) {
      return <Database size={14} className="text-blue-500" />;
    }
    
    return <Activity size={14} className="text-slate-400" />;
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
  
  // Obtenir les données triées pour les hôtes
  const sortedHosts = useMemo(() => getSortedData(normalizedHosts, hostSearchTerm), 
    [normalizedHosts, sortConfig, hostSearchTerm]);
  
  // Obtenir les données triées pour les services
  const sortedServices = useMemo(() => getSortedData(services, serviceSearchTerm), 
    [services, sortConfig, serviceSearchTerm]);

  // Préparer les catégories de filtres pour les OS
  const osFilterCategories = useMemo((): FilterCategory[] => {
    // Calculer toutes les versions OS par type
    const osVersionsByType = new Map<string, {version: string, count: number}[]>();
    
    normalizedHosts.forEach(host => {
      if (!host.os_version) return;
      
      // Déterminer le type d'OS
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
      
      // Récupérer les versions existantes pour ce type d'OS
      const versions = osVersionsByType.get(osType) || [];
      
      // Trouver si cette version existe déjà
      const existingVersion = versions.find(v => v.version === host.os_version);
      
      if (existingVersion) {
        existingVersion.count++;
      } else {
        versions.push({ version: host.os_version, count: 1 });
      }
      
      osVersionsByType.set(osType, versions);
    });
    
    // Convertir la map en catégories de filtres
    return Array.from(osVersionsByType.entries()).map(([osType, versions]) => ({
      id: osType,
      label: osType,
      icon: getOsIcon(osType),
      items: versions.map(v => ({
        id: v.version,
        label: v.version,
        value: v.version,
        count: v.count,
        icon: getOsIcon(osType, true)
      }))
    }));
  }, [normalizedHosts]);
  
  // Préparer les catégories de filtres pour les services
  const serviceFilterCategories = useMemo((): FilterCategory[] => {
    // Technologies
    const technologies = new Map<string, number>();
    services.forEach(service => {
      if (service.technology) {
        const count = technologies.get(service.technology) || 0;
        technologies.set(service.technology, count + 1);
      }
    });
    
    const technologyCategory: FilterCategory = {
      id: 'technology',
      label: 'Technologies',
      icon: <Activity size={18} />,
      items: Array.from(technologies.entries()).map(([tech, count]) => ({
        id: tech,
        label: tech,
        value: tech,
        count,
        icon: getTechnologyIcon(tech)
      }))
    };
    
    // Temps de réponse (en secondes)
    const responseTimeBuckets = [
      { id: 'fast', label: 'Rapide (<0.5s)', range: [0, 0.5] },
      { id: 'medium', label: 'Moyen (0.5-2s)', range: [0.5, 2] },
      { id: 'slow', label: 'Lent (>2s)', range: [2, Infinity] }
    ];
    
    const responseTimeCategory: FilterCategory = {
      id: 'response_time',
      label: 'Temps de réponse',
      icon: <Clock size={18} />,
      items: responseTimeBuckets.map(bucket => ({
        id: bucket.id,
        label: bucket.label,
        value: bucket.id,
        count: services.filter(s => 
          s.response_time !== null && 
          s.response_time >= bucket.range[0] && 
          s.response_time < bucket.range[1]
        ).length,
        icon: bucket.id === 'fast' ? <span className="text-green-500">⚡</span> :
              bucket.id === 'medium' ? <span className="text-yellow-500">⏱</span> :
              <span className="text-red-500">🐢</span>
      }))
    };
    
    // Taux d'erreur
    const errorRateBuckets = [
      { id: 'normal', label: 'Normal (<1%)', range: [0, 1] },
      { id: 'elevated', label: 'Élevé (1-5%)', range: [1, 5] },
      { id: 'critical', label: 'Critique (>5%)', range: [5, Infinity] }
    ];
    
    const errorRateCategory: FilterCategory = {
      id: 'error_rate',
      label: 'Taux d\'erreur',
      icon: <AlertTriangle size={18} />,
      items: errorRateBuckets.map(bucket => ({
        id: bucket.id,
        label: bucket.label,
        value: bucket.id,
        count: services.filter(s => 
          s.error_rate !== null && 
          s.error_rate >= bucket.range[0] && 
          s.error_rate < bucket.range[1]
        ).length,
        icon: bucket.id === 'normal' ? <span className="text-green-500">✓</span> :
              bucket.id === 'elevated' ? <span className="text-yellow-500">⚠</span> :
              <span className="text-red-500">⛔</span>
      }))
    };
    
    return [technologyCategory, responseTimeCategory, errorRateCategory];
  }, [services]);
  
  // Préparer les catégories de filtres pour les process groups
  const processFilterCategories = useMemo((): FilterCategory[] => {
    // Technologies
    const technologies = new Map<string, number>();
    processGroups.forEach(process => {
      if (process.technology) {
        const count = technologies.get(process.technology) || 0;
        technologies.set(process.technology, count + 1);
      }
    });
    
    const technologyCategory: FilterCategory = {
      id: 'technology',
      label: 'Technologies',
      icon: <Activity size={18} />,
      items: Array.from(technologies.entries()).map(([tech, count]) => ({
        id: tech,
        label: tech,
        value: tech,
        count,
        icon: getTechnologyIcon(tech)
      }))
    };
    
    // Types de process
    const processTypes = [
      { id: 'technology', label: 'Technologie', icon: <Cpu size={14} /> },
      { id: 'database', label: 'Base de données', icon: <Database size={14} /> },
      { id: 'server', label: 'Serveur', icon: <Server size={14} /> }
    ];
    
    const processTypeCategory: FilterCategory = {
      id: 'process_type',
      label: 'Types de processus',
      icon: <Cpu size={18} />,
      items: processTypes.map(type => ({
        id: type.id,
        label: type.label,
        value: type.id,
        count: processGroups.filter(p => p.type === type.id).length,
        icon: type.icon
      }))
    };
    
    return [technologyCategory, processTypeCategory];
  }, [processGroups]);
  
  // Convertir les filtres en badges pour l'affichage
  const getOsFilterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    
    osFilters.forEach(filter => {
      const category = osFilterCategories.find(c => c.id === filter.categoryId);
      if (!category) return;
      
      if (filter.values.length === 0) {
        // Tous les éléments sont sélectionnés
        badges.push({
          id: `${filter.categoryId}-all`,
          categoryId: filter.categoryId,
          categoryLabel: category.label,
          value: '',
          label: 'Tous',
          icon: category.icon
        });
      } else {
        // Éléments spécifiques sélectionnés
        filter.values.forEach(value => {
          const item = category.items.find(i => i.value === value);
          if (!item) return;
          
          badges.push({
            id: `${filter.categoryId}-${value}`,
            categoryId: filter.categoryId,
            categoryLabel: category.label,
            value,
            label: item.label,
            icon: item.icon
          });
        });
      }
    });
    
    return badges;
  }, [osFilters, osFilterCategories]);
  
  const getServiceFilterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    
    serviceFilters.forEach(filter => {
      const category = serviceFilterCategories.find(c => c.id === filter.categoryId);
      if (!category) return;
      
      if (filter.values.length === 0) {
        // Tous les éléments sont sélectionnés
        badges.push({
          id: `${filter.categoryId}-all`,
          categoryId: filter.categoryId,
          categoryLabel: category.label,
          value: '',
          label: 'Tous',
          icon: category.icon
        });
      } else {
        // Éléments spécifiques sélectionnés
        filter.values.forEach(value => {
          const item = category.items.find(i => i.value === value);
          if (!item) return;
          
          badges.push({
            id: `${filter.categoryId}-${value}`,
            categoryId: filter.categoryId,
            categoryLabel: category.label,
            value,
            label: item.label,
            icon: item.icon
          });
        });
      }
    });
    
    return badges;
  }, [serviceFilters, serviceFilterCategories]);
  
  const getProcessFilterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    
    processFilters.forEach(filter => {
      const category = processFilterCategories.find(c => c.id === filter.categoryId);
      if (!category) return;
      
      if (filter.values.length === 0) {
        // Tous les éléments sont sélectionnés
        badges.push({
          id: `${filter.categoryId}-all`,
          categoryId: filter.categoryId,
          categoryLabel: category.label,
          value: '',
          label: 'Tous',
          icon: category.icon
        });
      } else {
        // Éléments spécifiques sélectionnés
        filter.values.forEach(value => {
          const item = category.items.find(i => i.value === value);
          if (!item) return;
          
          badges.push({
            id: `${filter.categoryId}-${value}`,
            categoryId: filter.categoryId,
            categoryLabel: category.label,
            value,
            label: item.label,
            icon: item.icon
          });
        });
      }
    });
    
    return badges;
  }, [processFilters, processFilterCategories]);
  
  // Filtrer les hôtes en fonction des filtres OS
  const filteredHosts = useMemo(() => {
    if (osFilters.length === 0) return sortedHosts;
    
    return sortedHosts.filter(host => {
      const osVersion = host.os_version || '';
      
      // Déterminer le type d'OS
      let hostOsType = "Autre";
      if (osVersion.toLowerCase().includes('linux')) {
        hostOsType = "Linux";
      } else if (osVersion.toLowerCase().includes('windows')) {
        hostOsType = "Windows";
      } else if (osVersion.toLowerCase().includes('unix')) {
        hostOsType = "Unix";
      } else if (osVersion.toLowerCase().includes('aix')) {
        hostOsType = "AIX";
      } else if (osVersion.toLowerCase().includes('mac') || osVersion.toLowerCase().includes('darwin')) {
        hostOsType = "MacOS";
      }
      
      // Vérifier si ce type d'OS est sélectionné
      const osTypeFilter = osFilters.find(f => f.categoryId === hostOsType);
      
      if (!osTypeFilter) return false;
      
      // Si values est vide, toutes les versions sont sélectionnées
      if (osTypeFilter.values.length === 0) return true;
      
      // Sinon, vérifier si cette version spécifique est sélectionnée
      return osTypeFilter.values.includes(osVersion);
    });
  }, [sortedHosts, osFilters]);
  
  // Filtrer les services en fonction des filtres
  const filteredServices = useMemo(() => {
    if (serviceFilters.length === 0) return sortedServices;
    
    return sortedServices.filter(service => {
      // Vérifier chaque type de filtre
      return serviceFilters.every(filter => {
        // Si aucune valeur sélectionnée, considérer comme match
        if (filter.values.length === 0) return true;
        
        switch (filter.categoryId) {
          case 'technology':
            return filter.values.includes(service.technology);
            
          case 'response_time':
            if (service.response_time === null) return false;
            
            const responseTime = service.response_time;
            return (
              (filter.values.includes('fast') && responseTime < 100) ||
              (filter.values.includes('medium') && responseTime >= 100 && responseTime < 500) ||
              (filter.values.includes('slow') && responseTime >= 500)
            );
            
          case 'error_rate':
            if (service.error_rate === null) return false;
            
            const errorRate = service.error_rate;
            return (
              (filter.values.includes('normal') && errorRate < 1) ||
              (filter.values.includes('elevated') && errorRate >= 1 && errorRate < 5) ||
              (filter.values.includes('critical') && errorRate >= 5)
            );
            
          default:
            return true;
        }
      });
    });
  }, [sortedServices, serviceFilters]);
  
  // Filtrer les process groups en fonction des filtres
  const filteredProcessGroups = useMemo(() => {
    if (processFilters.length === 0) return processGroups;
    
    return processGroups.filter(process => {
      // Vérifier chaque type de filtre
      return processFilters.every(filter => {
        // Si aucune valeur sélectionnée, considérer comme match
        if (filter.values.length === 0) return true;
        
        switch (filter.categoryId) {
          case 'technology':
            return filter.values.includes(process.technology);
            
          case 'process_type':
            return filter.values.includes(process.type);
            
          default:
            return true;
        }
      });
    });
  }, [processGroups, processFilters]);
  
  // Définition des colonnes pour les tableaux
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
            (service.response_time > 2 ? 'text-red-500' : 
            service.response_time > 1 ? 'text-yellow-500' : 
            'text-green-500') : 
            'text-slate-400'
        }`}>
          {service.response_time !== null ? `${service.response_time} s` : 'N/A'}
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

  // Optimiser le gestionnaire d'événements avec useCallback
  const handleTabClick = useCallback((tab: string) => {
    onTabChange(tab);
  }, [onTabChange]);
  
  // Gérer la suppression d'un filtre OS
  const handleRemoveOsFilter = useCallback((categoryId: string, value?: string) => {
    setOsFilters(prev => {
      const newFilters = [...prev];
      const filterIndex = newFilters.findIndex(f => f.categoryId === categoryId);
      
      if (filterIndex === -1) return prev;
      
      if (!value) {
        // Supprimer tout le filtre
        return newFilters.filter(f => f.categoryId !== categoryId);
      }
      
      // Supprimer une valeur spécifique
      const filter = {...newFilters[filterIndex]};
      filter.values = filter.values.filter(v => v !== value);
      
      if (filter.values.length === 0) {
        // Si plus aucune valeur, supprimer le filtre
        return newFilters.filter(f => f.categoryId !== categoryId);
      }
      
      newFilters[filterIndex] = filter;
      return newFilters;
    });
  }, []);
  
  // Gérer la suppression d'un filtre de service
  const handleRemoveServiceFilter = useCallback((categoryId: string, value?: string) => {
    setServiceFilters(prev => {
      const newFilters = [...prev];
      const filterIndex = newFilters.findIndex(f => f.categoryId === categoryId);
      
      if (filterIndex === -1) return prev;
      
      if (!value) {
        // Supprimer tout le filtre
        return newFilters.filter(f => f.categoryId !== categoryId);
      }
      
      // Supprimer une valeur spécifique
      const filter = {...newFilters[filterIndex]};
      filter.values = filter.values.filter(v => v !== value);
      
      if (filter.values.length === 0) {
        // Si plus aucune valeur, supprimer le filtre
        return newFilters.filter(f => f.categoryId !== categoryId);
      }
      
      newFilters[filterIndex] = filter;
      return newFilters;
    });
  }, []);
  
  // Gérer la suppression d'un filtre de process
  const handleRemoveProcessFilter = useCallback((categoryId: string, value?: string) => {
    setProcessFilters(prev => {
      const newFilters = [...prev];
      const filterIndex = newFilters.findIndex(f => f.categoryId === categoryId);
      
      if (filterIndex === -1) return prev;
      
      if (!value) {
        // Supprimer tout le filtre
        return newFilters.filter(f => f.categoryId !== categoryId);
      }
      
      // Supprimer une valeur spécifique
      const filter = {...newFilters[filterIndex]};
      filter.values = filter.values.filter(v => v !== value);
      
      if (filter.values.length === 0) {
        // Si plus aucune valeur, supprimer le filtre
        return newFilters.filter(f => f.categoryId !== categoryId);
      }
      
      newFilters[filterIndex] = filter;
      return newFilters;
    });
  }, []);

  // Données de comptage réelles basées sur les tableaux actuels
  const realCounts = useMemo(() => ({
    hosts: hosts?.length || 0,
    services: services?.length || 0,
    apps: processGroups?.length || 0
  }), [hosts, services, processGroups]);
  
  // Log pour vérifier les valeurs
  useEffect(() => {
    if (!isLoading) {
      console.log(`Comptages réels pour ${zone.name}:`, realCounts);
    }
  }, [isLoading, realCounts, zone.name]);

  // États pour gérer les chargements locaux
  const [isRefreshingProblems, setIsRefreshingProblems] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [localRefreshNotification, setLocalRefreshNotification] = useState<string | null>(null);
  const [localZoneProblems, setLocalZoneProblems] = useState<Problem[]>([]);
  
  // Obtenir l'état de chargement des problèmes depuis le contexte
  const appContext = useApp();
  
  // Mettre à jour l'état local quand l'état de chargement des problèmes change
  useEffect(() => {
    if (!isRefreshingAll) { // Ne pas écraser notre état local pendant un rafraîchissement direct
      setIsRefreshingProblems(appContext.isLoading.problems);
    }
  }, [appContext.isLoading.problems, isRefreshingAll]);
  
  // Fonction pour rafraîchir directement les données de la zone
  const directRefreshZoneData = async () => {
    // Éviter les doubles rafraîchissements
    if (isRefreshingAll) return;
    
    // Activer l'état de rafraîchissement et afficher une notification immédiate
    setIsRefreshingAll(true);
    
    // Afficher un message de notification visible immédiatement
    const notification = document.createElement('div');
    notification.className = 'fixed top-5 right-5 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50';
    notification.innerHTML = `
      <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Rafraîchissement des données en cours...</span>
    `;
    document.body.appendChild(notification);
    
    setLocalRefreshNotification("Rafraîchissement des données en cours...");
    
    try {
      // Récupérer le type de dashboard actuel (vfg ou vfe)
      const dashboardType = window.location.pathname.includes('vfe') ? 'vfe' : 'vfg';
      
      // 1. D'abord, rafraîchir les problèmes
      try {
        setIsRefreshingProblems(true);
        const problemsParams = {
          status: "OPEN",
          debug: 'true', // Force le rafraîchissement
          type: dashboardType
        };
        
        console.log("Rafraîchissement direct des problèmes...");
        const problemsResponse = await axios.get(`${API_BASE_URL}/problems`, { params: problemsParams });
        
        if (problemsResponse.data) {
          // Filtrer pour la zone actuelle
          const zoneName = zone.name;
          const zoneProblems = problemsResponse.data.filter((problem: any) => problem.zone === zoneName);
          
          // Transformer les données en format Problem
          const formattedProblems: Problem[] = zoneProblems.map((problem: any) => {
            // Extraire le nom de l'hôte à partir des entités impactées
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
            
            return {
              id: problem.id || `PROB-${Math.random().toString(36).substr(2, 9)}`,
              title: problem.title || "Problème inconnu",
              code: problem.id ? problem.id.substring(0, 7) : "UNKNOWN",
              subtitle: `${problem.zone || "Non spécifié"} - Impact: ${problem.impact || "INCONNU"}`,
              time: problem.start_time ? `Depuis ${problem.start_time}` : "Récent",
              type: problem.impact === "INFRASTRUCTURE" ? "Problème d'Infrastructure" : "Problème de Service",
              status: problem.status === "OPEN" ? "critical" : "warning",
              impact: problem.impact === "INFRASTRUCTURE" ? "ÉLEVÉ" : problem.impact === "SERVICE" ? "MOYEN" : "FAIBLE",
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
          
          // Mettre à jour l'état local
          setLocalZoneProblems(formattedProblems);
          console.log(`Rafraîchissement des problèmes terminé. ${formattedProblems.length} problèmes trouvés.`);
        }
      } catch (problemError) {
        console.error("Erreur lors du rafraîchissement des problèmes:", problemError);
      } finally {
        setIsRefreshingProblems(false);
      }
      
      // 2. Définir la Management Zone pour les prochaines requêtes
      try {
        setLocalRefreshNotification("Configuration de la Management Zone...");
        await axios.post(`${API_BASE_URL}/set-management-zone`, { name: zone.name });
        console.log(`Management Zone définie sur: ${zone.name}`);
      } catch (mzError) {
        console.error("Erreur lors de la définition de la Management Zone:", mzError);
      }
      
      // 3. Rafraîchir les caches côté serveur
      try {
        setLocalRefreshNotification("Rafraîchissement des caches...");
        await axios.post(`${API_BASE_URL}/refresh/all`);
        console.log("Caches rafraîchis avec succès");
      } catch (cacheError) {
        console.error("Erreur lors du rafraîchissement des caches:", cacheError);
      }
      
      // 4. Notification finale
      setLocalRefreshNotification("Rafraîchissement terminé !");
      setTimeout(() => {
        setLocalRefreshNotification(null);
      }, 2000);
      
      // Ajouter un délai pour assurer que toutes les requêtes sont terminées
      console.log("Préparation au rechargement de la page...");
      
      // Utiliser une approche plus directe pour éviter les problèmes de rendu
      // Forcer un rechargement complet de la page après un délai suffisant
      setTimeout(() => {
        console.log("Rechargement de la page pour afficher les données fraîches");
        
        // Désactiver l'indicateur de chargement juste avant le rechargement
        setIsRefreshingAll(false);
        setIsRefreshingProblems(false);
        
        // Forcer un rechargement complet sans utiliser le cache
        window.location.reload(true);
      }, 1500);
      
    } catch (error) {
      console.error("Erreur lors du rafraîchissement global:", error);
      setLocalRefreshNotification("Erreur lors du rafraîchissement");
      setTimeout(() => {
        setLocalRefreshNotification(null);
        setIsRefreshingAll(false);
        setIsRefreshingProblems(false);
      }, 3000);
    }
  };
  
  // Afficher l'état de chargement pour les détails de la zone
  // Note: Ne pas utiliser appContext.isLoading ici car cela peut causer une boucle infinie de chargement
  if (isLoading && !isRefreshingAll) {
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
      {isRefreshingProblems && (
        <div className="fixed bottom-5 right-5 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-pulse">
          <RefreshCw size={16} className="animate-spin" />
          <span>Rafraîchissement des problèmes en cours...</span>
        </div>
      )}
    
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
            onClick={() => {
              // Utiliser directRefreshZoneData pour un rafraîchissement complet
              directRefreshZoneData();
              // Forcer une notification visuelle immédiate à l'utilisateur
              setLocalRefreshNotification("Rafraîchissement des données en cours...");
            }}
            disabled={isRefreshingAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-70 text-sm"
          >
            <RefreshCw size={14} className={`${isRefreshingAll ? 'animate-spin' : ''}`} />
            <span>{isRefreshingAll ? 'Rafraîchissement...' : 'Rafraîchir'}</span>
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
          <div className="text-xl font-bold">{realCounts.apps}</div>
        </div>
        <div className={`p-3 rounded-lg border ${
          isDarkTheme ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400 mb-1">Services</div>
          <div className="text-xl font-bold">{realCounts.services}</div>
        </div>
        <div className={`p-3 rounded-lg border ${
          isDarkTheme ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400 mb-1">Hôtes</div>
          <div className="text-xl font-bold">{realCounts.hosts}</div>
        </div>
      </div>
      
      {/* Problèmes actifs pour cette zone */}
      {zoneProblems.length > 0 && (
        <ProblemsList 
          problems={zoneProblems} 
          title={`Problèmes actifs dans ${zone.name}`} 
        />
      )}
      
      {/* Navigation par onglets */}
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
      
      {/* Contenu des onglets - Hôtes */}
      {activeTab === 'hosts' && (
        <section className={`rounded-lg overflow-hidden ${
          isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        } border`}>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center p-3 border-b border-slate-700">
              <h2 className="font-semibold flex items-center gap-2">
                <Server className={zoneColors.text} size={16} />
                <span>Hôtes</span>
                <span className="text-xs text-slate-400 ml-2">({filteredHosts.length})</span>
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
                  onClick={() => {
                    setFilterType('os');
                    setShowAdvancedFilter(true);
                  }}
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
                  <span>Filtres avancés {osFilters.length > 0 && `(${osFilters.length})`}</span>
                </button>
              </div>
            </div>
            
            {/* Afficher les badges de filtres actifs */}
            {osFilters.length > 0 && (
              <FilterBadges
                badges={getOsFilterBadges}
                onRemoveBadge={handleRemoveOsFilter}
                onClearAllBadges={() => setOsFilters([])}
              />
            )}
            
            {/* Section principale du tableau */}
            <PaginatedTable 
              data={filteredHosts}
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
      
      {/* Contenu des onglets - Services */}
      {activeTab === 'services' && (
        <section className={`rounded-lg overflow-hidden ${
          isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        } border`}>
          <div className="flex justify-between items-center p-3 border-b border-slate-700">
            <h2 className="font-semibold flex items-center gap-2">
              <Activity className={zoneColors.text} size={16} />
              <span>Services</span>
              <span className="text-xs text-slate-400 ml-2">({filteredServices.length})</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-2 dark:bg-blue-900 dark:text-blue-200">
                Dernières 30 minutes
              </span>
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
              
              <button 
                onClick={() => {
                  setFilterType('service');
                  setShowAdvancedFilter(true);
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm ${
                  isDarkTheme 
                    ? serviceFilters.length > 0 
                      ? 'border-indigo-600 bg-indigo-700/30 text-indigo-400' 
                      : 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                    : serviceFilters.length > 0 
                      ? 'border-indigo-600 bg-indigo-100 text-indigo-600' 
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Filter size={14} />
                <span>Filtres avancés {serviceFilters.length > 0 && `(${serviceFilters.length})`}</span>
              </button>
            </div>
          </div>

          {/* Bannière d'information pour les métriques de service */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-sm border-b border-blue-100 dark:border-blue-800">
            <Clock size={14} className="text-blue-500 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300">
              Les métriques sont rafraîchies toutes les 30 minutes et les temps de réponse sont en secondes
            </span>
          </div>

          {/* Afficher les badges de filtres actifs */}
          {serviceFilters.length > 0 && (
            <FilterBadges
              badges={getServiceFilterBadges}
              onRemoveBadge={handleRemoveServiceFilter}
              onClearAllBadges={() => setServiceFilters([])}
            />
          )}

          <PaginatedTable 
            data={filteredServices}
            columns={serviceColumns}
            pageSize={20}
            emptyMessage={
              serviceFilters.length > 0
                ? "Aucun service ne correspond aux filtres sélectionnés."
                : "Aucun service trouvé pour cette management zone."
            }
          />
        </section>
      )}
      
      {/* Contenu des onglets - Process Groups */}
      {activeTab === 'process-groups' && (
        <section className={`rounded-lg overflow-hidden ${
          isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        } border`}>
          <div className="flex justify-between items-center p-3 border-b border-slate-700">
            <h2 className="font-semibold flex items-center gap-2">
              <Cpu className={zoneColors.text} size={16} />
              <span>Process Groups</span>
              <span className="text-xs text-slate-400 ml-2">({filteredProcessGroups.length})</span>
            </h2>
            <button 
              onClick={() => {
                setFilterType('process');
                setShowAdvancedFilter(true);
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm ${
                isDarkTheme 
                  ? processFilters.length > 0 
                    ? 'border-indigo-600 bg-indigo-700/30 text-indigo-400' 
                    : 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                  : processFilters.length > 0 
                    ? 'border-indigo-600 bg-indigo-100 text-indigo-600' 
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Filter size={14} />
              <span>Filtres avancés {processFilters.length > 0 && `(${processFilters.length})`}</span>
            </button>
          </div>

          {/* Afficher les badges de filtres actifs */}
          {processFilters.length > 0 && (
            <FilterBadges
              badges={getProcessFilterBadges}
              onRemoveBadge={handleRemoveProcessFilter}
              onClearAllBadges={() => setProcessFilters([])}
            />
          )}

          <PaginatedTable 
            data={filteredProcessGroups}
            columns={processColumns}
            pageSize={20}
            emptyMessage={
              processFilters.length > 0
                ? "Aucun process group ne correspond aux filtres sélectionnés."
                : "Aucun process group trouvé pour cette management zone."
            }
          />
        </section>
      )}
      
      {/* Popup du filtre avancé */}
      {showAdvancedFilter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          {filterType === 'os' && (
            <AdvancedFilter
              title="Filtrer par système d'exploitation"
              description="Sélectionnez un type d'OS pour voir toutes ses versions, ou cliquez sur une version spécifique."
              categories={osFilterCategories}
              selectedFilters={osFilters}
              onFilterChange={setOsFilters}
              onClose={() => setShowAdvancedFilter(false)}
            />
          )}
          
          {filterType === 'service' && (
            <AdvancedFilter
              title="Filtrer les services"
              description="Filtrez les services par technologie, performance ou statut. Vous pouvez combiner plusieurs filtres."
              categories={serviceFilterCategories}
              selectedFilters={serviceFilters}
              onFilterChange={setServiceFilters}
              onClose={() => setShowAdvancedFilter(false)}
            />
          )}
          
          {filterType === 'process' && (
            <AdvancedFilter
              title="Filtrer les process groups"
              description="Filtrez les process groups par technologie ou type de processus. Vous pouvez combiner plusieurs filtres."
              categories={processFilterCategories}
              selectedFilters={processFilters}
              onFilterChange={setProcessFilters}
              onClose={() => setShowAdvancedFilter(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ZoneDetails;