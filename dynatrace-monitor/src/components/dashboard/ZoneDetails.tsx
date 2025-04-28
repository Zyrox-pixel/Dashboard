import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ChevronLeft, Clock, AlertTriangle, ExternalLink, RefreshCw, Cpu, Activity, Server, Filter, Loader, Database, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ManagementZone, Problem, ProcessGroup, Host, Service } from '../../api/types';
import ProblemsList from './ProblemsList';
import PaginatedTable, { Column } from '../common/PaginatedTable';
import { useApp } from '../../contexts/AppContext';

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
  
  // Ajouter du debug pour voir ce qui se passe avec les données hosts
  useEffect(() => {
    console.log("Hosts reçus dans ZoneDetails:", hosts);
    console.log("Hosts est un tableau?", Array.isArray(hosts));
    if (Array.isArray(hosts)) {
      console.log("Nombre d'hôtes:", hosts.length);
      if (hosts.length > 0) {
        console.log("Premier hôte:", hosts[0]);
      }
    }
  }, [hosts]);
  
  // États pour le tri et la recherche
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' | null }>({
    key: '',
    direction: null
  });
  const [hostSearchTerm, setHostSearchTerm] = useState<string>('');
  
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
      dt_url: host.dt_url
    }));
  };
  
  // Normaliser les données d'hôte
  const normalizedHosts = useMemo(() => {
    console.log("Normalisation des hôtes...");
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
  
  // Obtenir les données triées et filtrées pour les hôtes
  const sortedHosts = useMemo(() => {
    console.log("Calcul des hôtes triés, avec", normalizedHosts.length, "hôtes");
    return getSortedData(normalizedHosts, hostSearchTerm);
  }, [normalizedHosts, sortConfig, hostSearchTerm]);
  
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
      label: 'Nom',
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
      label: 'Technologie',
      cellClassName: 'text-sm',
      render: (service: Service) => (
        <div className="flex items-center gap-2">
          <span className="text-sm">{service.technology}</span>
        </div>
      ),
    },
    {
      key: 'response_time',
      label: 'Temps de réponse',
      cellClassName: 'text-sm',
      render: (service: Service) => (
        service.response_time ? `${service.response_time} ms` : 'N/A'
      ),
    },
    {
      key: 'error_rate',
      label: 'Taux d\'erreur',
      cellClassName: 'text-sm',
      render: (service: Service) => (
        <span className={`${
          service.error_rate ? 
            (service.error_rate > 5 ? 'text-red-500' : 
            service.error_rate > 1 ? 'text-yellow-500' : 
            'text-green-500') : 
            'text-green-500'
        }`}>
          {service.error_rate ? `${service.error_rate}%` : '0%'}
        </span>
      ),
    },
    {
      key: 'requests',
      label: 'Requêtes',
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
  ], []);

  const hostColumns = useMemo(() => [
    {
      key: 'name',
      label: 'Nom',
      cellClassName: 'font-medium text-sm',
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
          host.cpu ? 
            (host.cpu > 80 ? 'text-red-500' : 
            host.cpu > 60 ? 'text-yellow-500' : 
            'text-green-500') : 
            'text-slate-400'
        }`}>
          {host.cpu ? `${host.cpu}%` : 'N/A'}
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
          host.ram ? 
            (host.ram > 80 ? 'text-red-500' : 
            host.ram > 60 ? 'text-yellow-500' : 
            'text-green-500') : 
            'text-slate-400'
        }`}>
          {host.ram ? `${host.ram}%` : 'N/A'}
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

  // Message de débogage si pas d'hôtes
  if (Array.isArray(hosts) && hosts.length === 0) {
    console.log("Aucun hôte trouvé!");
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
          <div className="flex justify-between items-center p-3 border-b border-slate-700">
            <h2 className="font-semibold flex items-center gap-2">
              <Server className={zoneColors.text} size={16} />
              <span>Hôtes</span>
              <span className="text-xs text-slate-400 ml-2">({sortedHosts.length})</span>
            </h2>
            
            {/* Barre de recherche pour les hôtes */}
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
              </div>
              
              <button className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm ${
                isDarkTheme ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}>
                <Filter size={12} />
                <span>Filtrer</span>
              </button>
            </div>
          </div>

          {/* Ajouter un message de debug si nécessaire */}
          {sortedHosts.length === 0 && (
            <div className="p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded m-4">
              <strong>Débogage:</strong> Aucun hôte trouvé. Vérifiez la console pour plus de détails.
            </div>
          )}

          <PaginatedTable 
            data={sortedHosts}
            columns={hostColumns}
            pageSize={20}
            emptyMessage="Aucun hôte trouvé pour cette management zone."
          />
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
              <span className="text-xs text-slate-400 ml-2">({services.length})</span>
            </h2>
            <button className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm ${
              isDarkTheme ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}>
              <Filter size={12} />
              <span>Filtrer</span>
            </button>
          </div>

          <PaginatedTable 
            data={services}
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