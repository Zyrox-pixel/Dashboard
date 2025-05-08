import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, Home, AlertTriangle, Star, Award, Grid, 
  Layers, Shield, Activity, Command, Settings
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

// Définir les types pour les fonctions
type MenuItemKey = 'home' | 'problems' | 'vfg' | 'vfe' | 'other' | 'activity' | 'settings';
type ColorType = 'indigo' | 'amber' | 'red' | 'blue' | 'green' | 'purple';

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const { isDarkTheme } = useTheme();
  const [activeItem, setActiveItem] = useState<MenuItemKey>('home');
  
  // Effet pour suivre la page active
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/') setActiveItem('home');
    else if (path.startsWith('/problems')) setActiveItem('problems');
    else if (path.startsWith('/vfg')) setActiveItem('vfg');
    else if (path.startsWith('/vfe')) setActiveItem('vfe');
    else if (path.startsWith('/other')) setActiveItem('other');
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Générer une classe CSS pour les éléments de menu avec animation
  const getMenuItemClass = (itemKey: MenuItemKey): string => {
    const baseClasses = `group relative flex items-center gap-3 py-3.5 rounded-xl
                        ${sidebarCollapsed ? 'px-0 justify-center mx-1' : 'px-3 mx-3'} 
                        transition-all duration-200 ease-in-out`;
    
    // Si l'élément est actif
    if (activeItem === itemKey) {
      return `${baseClasses} ${
        isDarkTheme 
          ? 'bg-gradient-to-r from-indigo-900/80 to-purple-900/40 text-white shadow-md shadow-indigo-900/30' 
          : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 shadow-sm shadow-indigo-200'
      }`;
    }
    
    // Élément inactif
    return `${baseClasses} ${
      isDarkTheme 
        ? 'text-slate-400 hover:bg-slate-800/70 hover:text-white' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;
  };
  
  // Animation spéciale pour Vital for Group et Enterprise
  const getVitalItemClass = (itemKey: MenuItemKey, color: ColorType): string => {
    const baseClasses = `group relative flex items-center gap-3 py-3.5 rounded-xl
                        ${sidebarCollapsed ? 'px-0 justify-center mx-1' : 'px-3 mx-3'} 
                        transition-all duration-300 ease-out`;
    
    // Si l'élément est actif
    if (activeItem === itemKey) {
      return `${baseClasses} ${
        isDarkTheme 
          ? `bg-gradient-to-r from-${color}-900/60 to-${color}-800/30 text-white shadow-md shadow-${color}-900/30` 
          : `bg-gradient-to-r from-${color}-100 to-${color}-50 text-${color}-800 shadow-sm shadow-${color}-200`
      }`;
    }
    
    // Élément inactif avec effet de lueur
    return `${baseClasses} ${
      isDarkTheme 
        ? `text-${color}-400 hover:bg-${color}-900/20 hover:text-${color}-300 hover:shadow-sm hover:shadow-${color}-800/20` 
        : `text-${color}-600 hover:bg-${color}-50 hover:text-${color}-700 hover:shadow-sm hover:shadow-${color}-200`
    }`;
  };
  
  // Animation de l'icône
  const getIconClass = (itemKey: MenuItemKey): string => {
    const baseClasses = "flex-shrink-0 transition-transform duration-300";
    return activeItem === itemKey 
      ? `${baseClasses} scale-110` 
      : baseClasses;
  };
  
  // Effet de brillance derrière les icônes pour l'effet 3D
  const getIconGlow = (itemKey: MenuItemKey, color: ColorType = 'indigo') => {
    if (!isDarkTheme) return null;
    
    return (
      <div 
        className={`absolute inset-0 w-10 h-10 rounded-full 
                   ${activeItem === itemKey ? `bg-${color}-600/20 animate-pulse-slow` : 'bg-transparent'} 
                   blur-md transition-opacity duration-500 opacity-70`}
        style={{ left: sidebarCollapsed ? '50%' : '14px', transform: sidebarCollapsed ? 'translateX(-50%)' : 'none' }}
      ></div>
    );
  };

  return (
    <aside 
      className={`fixed h-full z-30 transition-all duration-500 ease-out ${
        isDarkTheme 
          ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 border-r border-slate-700/40 shadow-xl shadow-black/30' 
          : 'bg-gradient-to-b from-white to-slate-50 border-r border-slate-200 shadow-lg shadow-slate-200/30'
      } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
    >
      {/* En-tête avec logo et bouton de collapse */}
      <div className={`h-20 flex items-center px-5 ${
        isDarkTheme ? 'border-b border-slate-700/50' : 'border-b border-slate-200/70'
      }`}>
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Logo avec effet de lueur */}
          <div className="relative">
            <div className={`absolute inset-0 w-9 h-9 bg-blue-500 rounded-full blur-md opacity-60 ${
              isDarkTheme ? 'animate-pulse-slow' : ''
            }`}></div>
            <Shield className="text-indigo-500 relative z-10 flex-shrink-0" size={22} />
          </div>
          
          {/* Titre avec animation d'apparition */}
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <div className="flex flex-col">
                <span className={`font-bold text-base whitespace-nowrap ${
                  isDarkTheme ? 'text-white' : 'text-slate-800'
                }`}>
                  Dynatrace Monitor
                </span>
                <span className="text-xs text-slate-500">
                  Enterprise Edition
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Bouton de collapse avec animation */}
        <button 
          onClick={toggleSidebar} 
          className={`ml-auto w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            isDarkTheme 
              ? 'bg-slate-800 text-slate-300 hover:bg-indigo-900 hover:text-indigo-400 hover:shadow-md hover:shadow-indigo-900/30' 
              : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 hover:shadow-sm hover:shadow-indigo-300/30'
          }`}
        >
          <ChevronLeft size={16} className={sidebarCollapsed ? 'rotate-180' : ''} />
        </button>
      </div>
      
      {/* Navigation principale */}
      <div className="py-6 flex flex-col h-[calc(100%-5rem)]">
        {/* Tableau de bord */}
        <div className={`px-4 mb-1 ${sidebarCollapsed ? 'text-center' : ''}`}>
          <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
            isDarkTheme ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {!sidebarCollapsed ? 'Tableau de bord' : ''}
          </div>
          
          <nav className="space-y-1">
            {/* Bouton Accueil */}
            <Link 
              to="/"
              onClick={() => setActiveItem('home')}
              className={getMenuItemClass('home')}
            >
              {getIconGlow('home')}
              <Home size={18} className={getIconClass('home')} />
              
              {!sidebarCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">Vue d'ensemble</span>
              )}
              
              {/* Indicateur actif */}
              {activeItem === 'home' && !sidebarCollapsed && (
                <div className="ml-auto w-1.5 h-5 rounded-full bg-indigo-500"></div>
              )}
            </Link>
            
            {/* Bouton Problèmes */}
            <Link 
              to="/problems/unified?dashboard=all"
              onClick={() => setActiveItem('problems')}
              className={getMenuItemClass('problems')}
            >
              {getIconGlow('problems', 'red')}
              <AlertTriangle size={18} className={getIconClass('problems')} />
              
              {!sidebarCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">Problèmes</span>
              )}
              
              {/* Badge pour nombre de problèmes */}
              <div className={`${sidebarCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} 
                              px-1.5 py-0.5 rounded-full text-xs font-medium
                              ${isDarkTheme ? 'bg-red-900/70 text-red-300' : 'bg-red-100 text-red-700'}`}>
                Tous
              </div>
            </Link>
          </nav>
        </div>
        
        {/* Applications critiques */}
        <div className={`px-4 mt-4 ${sidebarCollapsed ? 'text-center' : ''}`}>
          <div className={`text-xs font-semibold uppercase tracking-wider mb-3 mt-2 ${
            isDarkTheme ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {!sidebarCollapsed ? 'Applications' : ''}
          </div>
          
          <nav className="space-y-2">
            {/* Vital for Group */}
            <Link 
              to="/vfg"
              onClick={() => setActiveItem('vfg')}
              className={getVitalItemClass('vfg', 'indigo')}
            >
              {getIconGlow('vfg', 'indigo')}
              <div className={`relative flex-shrink-0 ${getIconClass('vfg')}`}>
                <Star 
                  size={18} 
                  className={`${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} 
                            ${activeItem === 'vfg' ? 'animate-pulse-slow' : ''}`} 
                />
              </div>
              
              {!sidebarCollapsed && (
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300
                                ${activeItem === 'vfg' ? 'tracking-wide' : ''}`}>
                  Vital for Group
                </span>
              )}
              
              {/* Animation subtile d'arrière-plan pour les éléments actifs */}
              {activeItem === 'vfg' && (
                <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-grid-pattern"></div>
                </div>
              )}
            </Link>
            
            {/* Vital for Enterprise */}
            <Link 
              to="/vfe"
              onClick={() => setActiveItem('vfe')}
              className={getVitalItemClass('vfe', 'amber')}
            >
              {getIconGlow('vfe', 'amber')}
              <div className={`relative flex-shrink-0 ${getIconClass('vfe')}`}>
                <Award 
                  size={18} 
                  className={`${isDarkTheme ? 'text-amber-400' : 'text-amber-600'} 
                            ${activeItem === 'vfe' ? 'animate-pulse-slow' : ''}`} 
                />
              </div>
              
              {!sidebarCollapsed && (
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300
                                ${activeItem === 'vfe' ? 'tracking-wide' : ''}`}>
                  Vital for Enterprise
                </span>
              )}
              
              {/* Animation subtile d'arrière-plan pour les éléments actifs */}
              {activeItem === 'vfe' && (
                <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-grid-pattern"></div>
                </div>
              )}
            </Link>
            
            {/* Other */}
            <Link 
              to="/other"
              onClick={() => setActiveItem('other')}
              className={getMenuItemClass('other')}
            >
              {getIconGlow('other')}
              <Grid size={18} className={getIconClass('other')} />
              
              {!sidebarCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">Other</span>
              )}
            </Link>
          </nav>
        </div>
        
        {/* Espace supplémentaire pour l'esthétique */}
        <div className="flex-grow"></div>
        
        {/* Footer avec version */}
        <div className={`px-4 py-3 mt-auto ${
          isDarkTheme ? 'border-t border-slate-700/40' : 'border-t border-slate-200/70'
        }`}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
            isDarkTheme 
              ? 'bg-gradient-to-r from-indigo-900/20 via-blue-900/20 to-indigo-900/10 shadow-inner shadow-black/20' 
              : 'bg-gradient-to-r from-indigo-50 to-blue-50 shadow-inner shadow-blue-100/30'
          }`}>
            <Command size={16} className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} />
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className={`text-xs font-medium ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                  Enterprise Edition
                </span>
                <span className="text-[10px] text-slate-500">v2.3.8</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Style global pour les motifs d'arrière-plan */}
      <style>{`
        .bg-grid-pattern {
          background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 8px 8px;
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;