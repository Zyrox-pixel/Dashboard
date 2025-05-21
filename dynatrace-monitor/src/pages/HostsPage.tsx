import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useHostsData } from '../hooks/useHostsData';
import Layout from '../components/layout/Layout';
import { RefreshCw, Server, Database, HardDrive, Search, AlertCircle, Filter, Monitor } from 'lucide-react';
import AdvancedFilter, { FilterCategory, FilterValue, FilterItem } from '../components/common/AdvancedFilter';
import UnifiedFilterBadges, { FilterBadge } from '../components/common/UnifiedFilterBadges';
import { Host } from '../api/types';

const HostsPage: React.FC = () => {
  // État pour la pagination et le filtrage
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // États pour les filtres avancés
  const [showAdvancedFilter, setShowAdvancedFilter] = useState<boolean>(false);
  const [osFilters, setOsFilters] = useState<FilterValue[]>([]);
  
  // Utiliser notre hook personnalisé pour les données des hosts
  const { 
    hosts, 
    totalHosts, 
    isLoading, 
    error, 
    lastRefreshTime,
    mzAdmin,
    refreshData
  } = useHostsData();

  // Helper pour obtenir l'icône du système d'exploitation
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

  // Extraire la liste des OS uniques des hôtes
  const uniqueOperatingSystems = useMemo(() => {
    if (!hosts || hosts.length === 0) return [];
    
    const osSet = new Set<string>();
    
    hosts.forEach(host => {
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
  }, [hosts]);
  
  // Préparer les catégories de filtres pour les OS
  const osFilterCategories = useMemo((): FilterCategory[] => {
    // Calculer toutes les versions OS par type
    const osVersionsByType = new Map<string, {version: string, count: number}[]>();
    
    hosts.forEach(host => {
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
  }, [hosts]);

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
          type: filter.categoryId,  // 'categoryId' devient 'type'
          typeLabel: category.label,  // 'categoryLabel' devient 'typeLabel'
          value: '',
          valueLabel: 'Tous',  // 'label' devient 'valueLabel'
          icon: category.icon
        });
      } else {
        // Éléments spécifiques sélectionnés
        filter.values.forEach(value => {
          const item = category.items.find(i => i.value === value);
          if (!item) return;
          
          badges.push({
            id: `${filter.categoryId}-${value}`,
            type: filter.categoryId,
            typeLabel: category.label,
            value,
            valueLabel: item.label,
            icon: item.icon
          });
        });
      }
    });
    
    return badges;
  }, [osFilters, osFilterCategories]);

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

  // Calculer les hosts filtrés en fonction de la recherche et des filtres
  const filteredHosts = useMemo(() => {
    // Commencer par filtrer par termes de recherche
    let filtered = searchTerm.trim() 
      ? hosts.filter(host => 
          host.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          host.os_version.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : hosts;
    
    // Ensuite, appliquer les filtres OS
    if (osFilters.length > 0) {
      filtered = filtered.filter(host => {
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
    }
    
    return filtered;
  }, [hosts, searchTerm, osFilters]);

  // Calculer les hosts paginés
  const paginatedHosts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHosts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHosts, currentPage, itemsPerPage]);

  // Calculer le nombre total de pages
  const totalPages = useMemo(() => 
    Math.ceil(filteredHosts.length / itemsPerPage)
  , [filteredHosts, itemsPerPage]);

  // Effet pour réinitialiser la page courante lorsque le filtrage change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, osFilters]);

  // Gérer le changement de page
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Formatage de la date du dernier rafraîchissement
  const formattedLastRefreshTime = lastRefreshTime 
    ? new Intl.DateTimeFormat('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit' 
      }).format(lastRefreshTime)
    : 'Jamais';

  // Fonction pour rafraîchir manuellement les données
  const handleRefresh = () => {
    refreshData(true);
  };

  return (
    <Layout title="Inventory" subtitle="Hosts">
      <div className="px-6 py-4 w-full">
        {/* En-tête avec titre et statistiques */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-slate-800 dark:text-white">Hosts</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Management Zone: <span className="font-medium text-blue-700 dark:text-blue-400">{mzAdmin || 'Non configurée'}</span>
              {mzAdmin && <> • <span className="font-semibold text-slate-700 dark:text-slate-200">{totalHosts}</span> machines</>}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configuré via la variable MZ_ADMIN dans le fichier .env du backend
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Dernier rafraîchissement: <span className="font-medium">{formattedLastRefreshTime}</span>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
                ${isLoading 
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/50'
                }`}
            >
              <RefreshCw size={16} className={`${isLoading ? 'animate-spin' : ''}`} />
              <span>Rafraîchir</span>
            </button>
          </div>
        </div>

        {/* Barre de recherche et contrôles */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="relative w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par nom ou système..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <button
              onClick={() => setShowAdvancedFilter(true)}
              className={`flex items-center gap-1 px-3 py-2 rounded-md border text-sm ${
                osFilters.length > 0
                  ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Filter size={16} />
              <span>Filtrer par OS {osFilters.length > 0 && `(${osFilters.length})`}</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <label htmlFor="itemsPerPage" className="mr-2 text-sm text-slate-600 dark:text-slate-300">Afficher:</label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>
        </div>

        {/* Affichage des résultats ou messages */}
        {/* Afficher les badges de filtres actifs */}
        {osFilters.length > 0 && (
          <div className="mb-5">
            <UnifiedFilterBadges
              badges={getOsFilterBadges}
              onRemoveBadge={handleRemoveOsFilter}
              onClearAllBadges={() => setOsFilters([])}
            />
          </div>
        )}

        {!mzAdmin || error ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <AlertCircle size={18} />
              <span className="font-medium">Chargement impossible:</span> 
              Impossible de charger les données des hôtes. Veuillez rafraîchir la page ou réessayer plus tard.
            </div>
          </div>
        ) : (
          <>
            {/* Tableau des hosts */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm mb-5">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider w-[40%]">
                      Host
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider w-[20%]">
                      OS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider w-[10%]">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider w-[10%]">
                      CPU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider w-[10%]">
                      RAM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider w-[10%]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
  {isLoading && paginatedHosts.length === 0 ? (
    <tr>
      <td colSpan={6} className="px-6 py-24 text-center text-slate-600 dark:text-slate-300">
        <div className="flex flex-col items-center max-w-xl mx-auto">
          {/* Spinner amélioré avec animation de pulse */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-blue-100/50 dark:bg-blue-900/20 animate-pulse"></div>
            </div>
            <div className="animate-spin w-24 h-24 border-4 border-slate-200/40 dark:border-slate-700/40 border-t-blue-500 dark:border-t-blue-400 rounded-full"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 flex items-center justify-center">
                <Server size={28} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          {/* Titre et texte explicatif */}
          <h3 className="font-semibold text-xl mt-6 mb-2 text-blue-600 dark:text-blue-400">Récupération des hosts</h3>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-6">Nous récupérons les données des hosts depuis Dynatrace. Cette opération peut prendre quelques instants...</p>
          
          {/* Barre de progression animée */}
          <div className="w-full max-w-md h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
            <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 dark:from-blue-500 dark:to-indigo-600 rounded-full"
                 style={{width: '80%', animation: 'progress-bar-animation 2s infinite ease-in-out alternate'}}>
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Récupération des lots de données...</p>
          
          {/* Style pour l'animation de la barre de progression */}
          <style>
            {`
              @keyframes progress-bar-animation {
                0% { width: 15%; }
                50% { width: 40%; }
                75% { width: 65%; }
                100% { width: 85%; }
              }
            `}
          </style>
        </div>
      </td>
    </tr>
                  ) : paginatedHosts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col items-center">
                          <Server size={40} className="text-slate-400 dark:text-slate-500 mb-3" />
                          <p>Aucun host trouvé</p>
                          {searchTerm && <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">Essayez de modifier votre recherche</p>}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedHosts.map((host: Host) => (
                      <tr key={host.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                              <Server size={16} />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-slate-900 dark:text-white">{host.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{host.id.substring(0, 10)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {host.os_version.toLowerCase().includes('windows') ? (
                              <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 mr-2">
                                <span className="text-xs">W</span>
                              </div>
                            ) : host.os_version.toLowerCase().includes('linux') ? (
                              <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-md bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 mr-2">
                                <span className="text-xs">L</span>
                              </div>
                            ) : (
                              <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 mr-2">
                                <span className="text-xs">O</span>
                              </div>
                            )}
                            <span className="text-sm text-slate-700 dark:text-slate-300">{host.os_version}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {host.code ? (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 mr-2">
                                <span className="text-xs">C</span>
                              </div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{host.code}</span>
                            </div>
                          ) : host.metadata?.Code ? (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 mr-2">
                                <span className="text-xs">C</span>
                              </div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{host.metadata.Code}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-slate-400">Non disponible</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {host.cpu !== null ? (
                            <div className="flex items-center">
                              <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    host.cpu > 80 ? 'bg-red-500 dark:bg-red-600' : 
                                    host.cpu > 50 ? 'bg-amber-500 dark:bg-amber-600' : 
                                    'bg-green-500 dark:bg-green-600'
                                  }`}
                                  style={{ width: `${host.cpu}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">{host.cpu}%</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-slate-400">Non disponible</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {host.ram !== null ? (
                            <div className="flex items-center">
                              <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    host.ram > 80 ? 'bg-red-500 dark:bg-red-600' : 
                                    host.ram > 50 ? 'bg-amber-500 dark:bg-amber-600' : 
                                    'bg-green-500 dark:bg-green-600'
                                  }`}
                                  style={{ width: `${host.ram}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">{host.ram}%</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-slate-400">Non disponible</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          <a 
                            href={host.dt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
                          >
                            Voir dans Dynatrace
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Affichage de {filteredHosts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} à {Math.min(currentPage * itemsPerPage, filteredHosts.length)} sur {filteredHosts.length} hosts
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    &laquo;
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    &lsaquo;
                  </button>

                  {/* Pages */}
                  {totalPages <= 7 ? (
                    // Si moins de 7 pages, afficher toutes les pages
                    [...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => handlePageChange(i + 1)}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === i + 1
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                            : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))
                  ) : (
                    // Sinon, afficher une pagination avec ellipses
                    <>
                      {/* Première page */}
                      <button
                        onClick={() => handlePageChange(1)}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === 1
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                            : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        1
                      </button>

                      {/* Ellipse de gauche si nécessaire */}
                      {currentPage > 3 && (
                        <span className="px-2 py-1 text-slate-500">...</span>
                      )}

                      {/* Pages autour de la page courante */}
                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Afficher seulement les pages proches de la page courante
                        return (
                          pageNum !== 1 &&
                          pageNum !== totalPages &&
                          Math.abs(currentPage - pageNum) <= 1 && (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                  : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        );
                      })}

                      {/* Ellipse de droite si nécessaire */}
                      {currentPage < totalPages - 2 && (
                        <span className="px-2 py-1 text-slate-500">...</span>
                      )}

                      {/* Dernière page */}
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === totalPages
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                            : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    &rsaquo;
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    &raquo;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Popup du filtre avancé */}
      {showAdvancedFilter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <AdvancedFilter
            title="Filtrer par système d'exploitation"
            description="Sélectionnez un type d'OS pour voir toutes ses versions, ou cliquez sur une version spécifique."
            categories={osFilterCategories}
            selectedFilters={osFilters}
            onFilterChange={setOsFilters}
            onClose={() => setShowAdvancedFilter(false)}
          />
        </div>
      )}
    </Layout>
  );
};

export default HostsPage;
