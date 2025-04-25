import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Home, AlertTriangle, Star, Award, Grid, Server, Code, Layers } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const { isDarkTheme } = useTheme();

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
              to="/vfa" 
              className={`flex items-center gap-3 py-3 ${
                sidebarCollapsed ? 'px-0 justify-center' : 'px-5'
              } ${
                isDarkTheme 
                  ? 'text-slate-400 hover:bg-slate-700 hover:text-white' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Award size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Vital for Anthropic</span>}
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
      
      <div className={`mt-auto p-4 border-t ${isDarkTheme ? 'border-slate-700' : 'border-slate-200'}`}>
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