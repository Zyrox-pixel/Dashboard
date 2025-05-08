import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Home, AlertTriangle, Star, Award, Grid, Server, Code, Layers, Eye, ExternalLink } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed, vitalForGroupMZs, vitalForEntrepriseMZs } = useApp();
  const { isDarkTheme } = useTheme();
  const navigate = useNavigate();
  
  // État pour le menu flottant des applications critiques
  const [showVitalAppsMenu, setShowVitalAppsMenu] = useState(false);
  
  // Statistiques rapides
  const vfgProblems = vitalForGroupMZs ? vitalForGroupMZs.reduce((total, zone) => total + zone.problemCount, 0) : 0;
  const vfeProblems = vitalForEntrepriseMZs ? vitalForEntrepriseMZs.reduce((total, zone) => total + zone.problemCount, 0) : 0;

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <aside className={`fixed h-full z-30 transition-all duration-300 ease-in-out border-r ${
      isDarkTheme 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-white border-slate-200'
    } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
      <div className={`h-16 flex items-center px-5 border-b ${
        isDarkTheme ? 'border-slate-700' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <Layers className="text-indigo-500 flex-shrink-0" />
          {!sidebarCollapsed && <span className="font-semibold whitespace-nowrap">Dynatrace Monitor</span>}
        </div>
        <button 
          onClick={toggleSidebar} 
          className={`ml-auto w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isDarkTheme 
              ? 'bg-slate-700 text-slate-300 hover:bg-indigo-900 hover:text-indigo-400' 
              : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
          }`}
        >
          <ChevronLeft size={16} />
        </button>
      </div>
      
      <div className="py-5">
        <div className={`text-xs font-semibold text-slate-500 uppercase tracking-wider ${
          sidebarCollapsed ? 'px-0 text-center' : 'px-5'
        } mb-2`}>
          {!sidebarCollapsed ? 'Tableau de bord' : '...'}
        </div>
        <ul>
          <li>
            <Link to="/" className={`flex items-center gap-3 py-3 ${
              sidebarCollapsed ? 'px-0 justify-center' : 'px-5'
            } ${
              isDarkTheme 
                ? 'text-slate-400 hover:bg-slate-700 hover:text-white' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}>
              <Home size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Vue d'ensemble</span>}
            </Link>
          </li>
          <li>
            <Link to="/problems" className={`flex items-center gap-3 py-3 ${
              sidebarCollapsed ? 'px-0 justify-center' : 'px-5'
            } ${
              isDarkTheme 
                ? 'text-slate-400 hover:bg-slate-700 hover:text-white' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}>
              <AlertTriangle size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Problèmes</span>}
            </Link>
          </li>
        </ul>
        
        <div className={`text-xs font-semibold text-slate-500 uppercase tracking-wider ${
          sidebarCollapsed ? 'px-0 text-center' : 'px-5'
        } mt-6 mb-2`}>
          {!sidebarCollapsed ? 'Applications' : '...'}
        </div>
        <ul>
          <li>
            <Link 
              to="/vfg" 
              className={`flex items-center gap-3 py-3 ${
                sidebarCollapsed ? 'px-0 justify-center' : 'px-5'
              } border-l-4 ${
                isDarkTheme 
                  ? 'bg-red-900/10 text-red-400 border-red-500' 
                  : 'bg-red-100 text-red-700 border-red-500'
              }`}
            >
              <Star size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Vital for Group</span>}
            </Link>
          </li>
          <li>
            <Link 
              to="/vfe" 
              className={`flex items-center gap-3 py-3 ${
                sidebarCollapsed ? 'px-0 justify-center' : 'px-5'
              } border-l-4 ${
                isDarkTheme 
                  ? 'bg-amber-900/10 text-amber-400 border-amber-500' 
                  : 'bg-amber-100 text-amber-700 border-amber-500'
              }`}
            >
              <Award size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Vital for Entreprise</span>}
            </Link>
          </li>
          <li>
            <Link 
              to="/other" 
              className={`flex items-center gap-3 py-3 ${
                sidebarCollapsed ? 'px-0 justify-center' : 'px-5'
              } ${
                isDarkTheme 
                  ? 'text-slate-400 hover:bg-slate-700 hover:text-white' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Grid size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Other</span>}
            </Link>
          </li>
        </ul>
        
        <div className={`text-xs font-semibold text-slate-500 uppercase tracking-wider ${
          sidebarCollapsed ? 'px-0 text-center' : 'px-5'
        } mt-6 mb-2`}>
          {!sidebarCollapsed ? 'Monitoring' : '...'}
        </div>
        <ul>
          <li>
            <Link 
              to="/hosts" 
              className={`flex items-center gap-3 py-3 ${
                sidebarCollapsed ? 'px-0 justify-center' : 'px-5'
              } ${
                isDarkTheme 
                  ? 'text-slate-400 hover:bg-slate-700 hover:text-white' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Server size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Hôtes</span>}
            </Link>
          </li>
          <li>
            <Link 
              to="/services" 
              className={`flex items-center gap-3 py-3 ${
                sidebarCollapsed ? 'px-0 justify-center' : 'px-5'
              } ${
                isDarkTheme 
                  ? 'text-slate-400 hover:bg-slate-700 hover:text-white' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Code size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Services</span>}
            </Link>
          </li>
        </ul>
      </div>
      
      {/* Nouveau raccourci flottant pour les applications critiques */}
      <div className="relative group">
        <div 
          className={`mt-auto p-4 border-t ${isDarkTheme ? 'border-slate-700' : 'border-slate-200'} cursor-pointer`}
          onMouseEnter={() => setShowVitalAppsMenu(true)}
          onMouseLeave={() => setShowVitalAppsMenu(false)}
        >
          <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md ${
            isDarkTheme 
              ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/40' 
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          }`}>
            <div className="flex items-center gap-2">
              <Star size={16} />
              {!sidebarCollapsed && <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">Applications Critiques</span>}
            </div>
            {!sidebarCollapsed && (
              <div className="flex items-center">
                <Eye size={14} />
              </div>
            )}
          </div>
          
          {/* Indicateurs d'état rapides */}
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${vfgProblems > 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span className="ml-2 text-xs text-slate-400">VFG</span>
              </div>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${vfeProblems > 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span className="ml-2 text-xs text-slate-400">VFE</span>
              </div>
            </div>
          )}
          
          {/* Menu flottant des applications critiques */}
          {showVitalAppsMenu && (
            <div 
              className="absolute z-50 bottom-20 left-full ml-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl"
              onMouseEnter={() => setShowVitalAppsMenu(true)}
              onMouseLeave={() => setShowVitalAppsMenu(false)}
            >
              <div className="p-3 border-b border-slate-700">
                <h4 className="text-sm font-semibold text-white">Applications Critiques</h4>
                <p className="text-xs text-slate-400 mt-1">Aperçu de l'état de vos applications</p>
              </div>
              
              {/* VFG Section */}
              <div className="p-3 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-900/30 text-indigo-400 border border-indigo-800/30">
                      <Star size={12} />
                    </div>
                    <span className="ml-2 text-sm font-medium text-indigo-300">Vital for Group</span>
                  </div>
                  {vfgProblems > 0 && (
                    <div className="px-1.5 py-0.5 bg-red-900/20 border border-red-800/30 rounded text-xs text-red-400">
                      {vfgProblems} problème{vfgProblems > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                
                {/* Liste des zones VFG avec problèmes (max 3) */}
                {vitalForGroupMZs && vitalForGroupMZs.filter(zone => zone.problemCount > 0).slice(0, 3).map(zone => (
                  <div 
                    key={zone.id}
                    className="mt-2 p-1.5 bg-red-900/10 border border-red-800/20 rounded-md text-xs cursor-pointer hover:bg-red-900/20"
                    onClick={() => navigate(`/vfg?zoneId=${zone.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white truncate max-w-[150px]">{zone.name}</span>
                      <span className="text-red-400">{zone.problemCount}</span>
                    </div>
                  </div>
                ))}
                
                <div 
                  className="mt-2 text-xs flex items-center justify-end text-slate-400 hover:text-white cursor-pointer"
                  onClick={() => navigate('/vfg')}
                >
                  <span>Voir toutes les zones</span>
                  <ExternalLink size={10} className="ml-1" />
                </div>
              </div>
              
              {/* VFE Section */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-900/30 text-amber-400 border border-amber-800/30">
                      <Award size={12} />
                    </div>
                    <span className="ml-2 text-sm font-medium text-amber-300">Vital for Enterprise</span>
                  </div>
                  {vfeProblems > 0 && (
                    <div className="px-1.5 py-0.5 bg-red-900/20 border border-red-800/30 rounded text-xs text-red-400">
                      {vfeProblems} problème{vfeProblems > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                
                {/* Liste des zones VFE avec problèmes (max 3) */}
                {vitalForEntrepriseMZs && vitalForEntrepriseMZs.filter(zone => zone.problemCount > 0).slice(0, 3).map(zone => (
                  <div 
                    key={zone.id}
                    className="mt-2 p-1.5 bg-red-900/10 border border-red-800/20 rounded-md text-xs cursor-pointer hover:bg-red-900/20"
                    onClick={() => navigate(`/vfe?zoneId=${zone.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white truncate max-w-[150px]">{zone.name}</span>
                      <span className="text-red-400">{zone.problemCount}</span>
                    </div>
                  </div>
                ))}
                
                <div 
                  className="mt-2 text-xs flex items-center justify-end text-slate-400 hover:text-white cursor-pointer"
                  onClick={() => navigate('/vfe')}
                >
                  <span>Voir toutes les zones</span>
                  <ExternalLink size={10} className="ml-1" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Vue globale */}
      <div className={`p-4 border-t ${isDarkTheme ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${
          isDarkTheme 
            ? 'bg-indigo-900/20 text-indigo-400' 
            : 'bg-indigo-100 text-indigo-700'
        }`}>
          <Layers size={16} />
          {!sidebarCollapsed && <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">Global View</span>}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;