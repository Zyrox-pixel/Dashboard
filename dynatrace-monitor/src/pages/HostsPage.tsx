import React, { useState, useEffect, useMemo } from 'react';
import { useHostsData } from '../hooks/useHostsData';
import Layout from '../components/layout/Layout';
import { RefreshCw, Server, Database, HardDrive, Search, AlertCircle } from 'lucide-react';
import { Host } from '../api/types';

const HostsPage: React.FC = () => {
  // État pour la pagination et le filtrage
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
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

  // Calculer les hosts filtrés en fonction de la recherche
  const filteredHosts = useMemo(() => {
    if (!searchTerm.trim()) return hosts;
    
    return hosts.filter(host => 
      host.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      host.os_version.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [hosts, searchTerm]);

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
  }, [searchTerm, itemsPerPage]);

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
            <h1 className="text-2xl font-bold mb-1">Hosts</h1>
            <p className="text-sm text-slate-500">
              Management Zone: <span className="font-medium text-blue-600">{mzAdmin || 'Non configurée'}</span>
              {mzAdmin && <> • {totalHosts} machines</>}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Configuré via la variable mzadmin dans le fichier .of du backend
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
              Dernier rafraîchissement: <span className="font-medium">{formattedLastRefreshTime}</span>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
                ${isLoading 
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
            >
              <RefreshCw size={16} className={`${isLoading ? 'animate-spin' : ''}`} />
              <span>Rafraîchir</span>
            </button>
          </div>
        </div>

        {/* Barre de recherche et contrôles */}
        <div className="flex justify-between items-center mb-5">
          <div className="relative w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom ou système..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <label htmlFor="itemsPerPage" className="mr-2 text-sm text-slate-500">Afficher:</label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 focus:outline-none"
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
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={18} />
              <span className="font-medium">Erreur:</span> {error}
            </div>
          </div>
        ) : !mzAdmin ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle size={18} />
              <span className="font-medium">Configuration requise:</span> 
              Veuillez configurer la variable mzadmin dans le fichier .of du backend
            </div>
          </div>
        ) : (
          <>
            {/* Tableau des hosts */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm mb-5">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Host
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      OS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      CPU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      RAM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {isLoading && paginatedHosts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin w-10 h-10 border-4 border-slate-300 border-t-blue-500 rounded-full mb-3"></div>
                          <p>Chargement des données...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedHosts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center">
                          <Server size={40} className="text-slate-300 mb-3" />
                          <p>Aucun host trouvé</p>
                          {searchTerm && <p className="text-sm mt-1">Essayez de modifier votre recherche</p>}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedHosts.map((host: Host) => (
                      <tr key={host.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-blue-100 text-blue-800">
                              <Server size={16} />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-slate-900">{host.name}</div>
                              <div className="text-xs text-slate-500">{host.id.substring(0, 10)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {host.os_version.toLowerCase().includes('windows') ? (
                              <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-md bg-blue-100 text-blue-800 mr-2">
                                <span className="text-xs">W</span>
                              </div>
                            ) : host.os_version.toLowerCase().includes('linux') ? (
                              <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-md bg-green-100 text-green-800 mr-2">
                                <span className="text-xs">L</span>
                              </div>
                            ) : (
                              <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-md bg-slate-100 text-slate-800 mr-2">
                                <span className="text-xs">O</span>
                              </div>
                            )}
                            <span className="text-sm text-slate-600">{host.os_version}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {host.cpu !== null ? (
                            <div className="flex items-center">
                              <div className="w-20 bg-slate-200 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    host.cpu > 80 ? 'bg-red-500' : 
                                    host.cpu > 50 ? 'bg-amber-500' : 
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${host.cpu}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm text-slate-600">{host.cpu}%</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Non disponible</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {host.ram !== null ? (
                            <div className="flex items-center">
                              <div className="w-20 bg-slate-200 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    host.ram > 80 ? 'bg-red-500' : 
                                    host.ram > 50 ? 'bg-amber-500' : 
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${host.ram}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm text-slate-600">{host.ram}%</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Non disponible</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <a 
                            href={host.dt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
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
                <div className="text-sm text-slate-500">
                  Affichage de {filteredHosts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} à {Math.min(currentPage * itemsPerPage, filteredHosts.length)} sur {filteredHosts.length} hosts
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded-md border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                  >
                    &laquo;
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded-md border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
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
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'border border-slate-300 hover:bg-slate-100'
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
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'border border-slate-300 hover:bg-slate-100'
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
                                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                  : 'border border-slate-300 hover:bg-slate-100'
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
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded-md border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                  >
                    &rsaquo;
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded-md border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                  >
                    &raquo;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default HostsPage;