import React from 'react';
import { ChevronLeft, Clock, AlertTriangle, ExternalLink, RefreshCw, Cpu, Activity, Server, Filter, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ManagementZone, Problem, ProcessGroup, Host, Service } from '../../api/types';
import ProblemsList from './ProblemsList';
import ProcessGroupRow from '../common/ProcessGroupRow';
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
  const zoneProblems = problems.filter(problem => problem.zone === zone.name);

  // Déterminer les couleurs en fonction de la zone et du thème
  const getZoneColors = () => {
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
  };

  const zoneColors = getZoneColors();

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
      
      {/* Navigation par onglets */}
      <div className="flex border-b mb-5 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => onTabChange('process-groups')}
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
        <button 
          onClick={() => onTabChange('services')}
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
          onClick={() => onTabChange('hosts')}
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
      </div>
      
      {/* Contenu des onglets */}
      {activeTab === 'process-groups' && (
        <section className={`rounded-lg overflow-hidden ${
          isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        } border`}>
          <div className="flex justify-between items-center p-3 border-b border-slate-700">
            <h2 className="font-semibold flex items-center gap-2">
              <Cpu className={zoneColors.text} size={16} />
              <span>Process Groups</span>
            </h2>
            <button className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm ${
              isDarkTheme ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}>
              <Filter size={12} />
              <span>Filtrer</span>
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr className={`${isDarkTheme ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                <th className="text-left p-3 font-medium text-xs text-slate-400">Nom</th>
                <th className="text-left p-3 font-medium text-xs text-slate-400">Technologie</th>
                <th className="text-right p-3 font-medium text-xs text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {processGroups.length > 0 ? (
                processGroups.map((process, index) => (
                  <ProcessGroupRow key={index} process={process} index={index} />
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    Aucun process group trouvé pour cette management zone.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
            </h2>
            <button className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm ${
              isDarkTheme ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}>
              <Filter size={12} />
              <span>Filtrer</span>
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr className={`${isDarkTheme ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                <th className="text-left p-3 font-medium text-xs text-slate-400">Nom</th>
                <th className="text-left p-3 font-medium text-xs text-slate-400">Technologie</th>
                <th className="text-left p-3 font-medium text-xs text-slate-400">Temps de réponse</th>
                <th className="text-left p-3 font-medium text-xs text-slate-400">Taux d'erreur</th>
                <th className="text-left p-3 font-medium text-xs text-slate-400">Requêtes</th>
                <th className="text-right p-3 font-medium text-xs text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {services.length > 0 ? (
                services.map((service, index) => (
                  <tr key={index} className={`${isDarkTheme ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <td className="p-3 font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${service.status === 'Actif' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {service.name}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{service.technology}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      {service.response_time ? `${service.response_time} ms` : 'N/A'}
                    </td>
                    <td className="p-3 text-sm">
                      <span className={`${
                        service.error_rate ? 
                          (service.error_rate > 5 ? 'text-red-500' : 
                          service.error_rate > 1 ? 'text-yellow-500' : 
                          'text-green-500') : 
                          'text-green-500'
                      }`}>
                        {service.error_rate ? `${service.error_rate}%` : '0%'}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      {service.requests || 'N/A'}
                    </td>
                    <td className="p-3 text-right">
                      <a 
                        href={service.dt_url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-400 hover:underline dark:text-red-400"
                      >
                        <ExternalLink size={12} />
                        Dynatrace
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Aucun service trouvé pour cette management zone.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
      
      {/* Onglet Hôtes */}
      {activeTab === 'hosts' && (
        <section className={`rounded-lg overflow-hidden ${
          isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        } border`}>
          <div className="flex justify-between items-center p-3 border-b border-slate-700">
            <h2 className="font-semibold flex items-center gap-2">
              <Server className={zoneColors.text} size={16} />
              <span>Hôtes</span>
            </h2>
            <button className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm ${
              isDarkTheme ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}>
              <Filter size={12} />
              <span>Filtrer</span>
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr className={`${isDarkTheme ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                <th className="text-left p-3 font-medium text-xs text-slate-400">Nom</th>
                <th className="text-left p-3 font-medium text-xs text-slate-400">CPU</th>
                <th className="text-left p-3 font-medium text-xs text-slate-400">RAM</th>
                <th className="text-right p-3 font-medium text-xs text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {hosts.length > 0 ? (
                hosts.map((host, index) => (
                  <tr key={index} className={`${isDarkTheme ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <td className="p-3 font-medium text-sm">{host.name}</td>
                    <td className="p-3 text-sm">
                      <span className={`${
                        host.cpu ? 
                          (host.cpu > 80 ? 'text-red-500' : 
                          host.cpu > 60 ? 'text-yellow-500' : 
                          'text-green-500') : 
                          'text-slate-400'
                      }`}>
                        {host.cpu ? `${host.cpu}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      <span className={`${
                        host.ram ? 
                          (host.ram > 80 ? 'text-red-500' : 
                          host.ram > 60 ? 'text-yellow-500' : 
                          'text-green-500') : 
                          'text-slate-400'
                      }`}>
                        {host.ram ? `${host.ram}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <a 
                        href={host.dt_url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-400 hover:underline dark:text-red-400"
                      >
                        <ExternalLink size={12} />
                        Dynatrace
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Aucun hôte trouvé pour cette management zone.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

export default ZoneDetails;