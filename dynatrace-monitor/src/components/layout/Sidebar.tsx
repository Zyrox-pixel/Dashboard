import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, Home, AlertTriangle, Star, Award, Grid, 
  Layers, Shield, Activity, Command, Settings, Key, Globe, User
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

// Définir les types pour les fonctions
type MenuItemKey = 'home' | 'problems' | 'vfg' | 'vfe' | 'detection' | 'security' | 'fce_security' | 'network_filtering' | 'identity' | 'hosts' | 'activity' | 'settings';
type ColorType = 'indigo' | 'amber' | 'red' | 'blue' | 'green' | 'purple' | 'cyan' | 'pink';

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const { isDarkTheme } = useTheme();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState<MenuItemKey>('home');
  const [hoverItem, setHoverItem] = useState<string | null>(null);
  
  // Effet pour suivre la page active - se déclenche à chaque changement de route
  useEffect(() => {
    const path = location.pathname;
    console.log('📍 [Sidebar] Changement de route détecté:', path);
    
    let newActiveItem: MenuItemKey;
    
    if (path === '/' || path.startsWith('/overview')) {
      newActiveItem = 'home';
    } else if (path.startsWith('/problems')) {
      newActiveItem = 'problems';
    } else if (path.startsWith('/vfg') || path.startsWith('/dashboard/vfg')) {
      newActiveItem = 'vfg';
    } else if (path.startsWith('/vfe') || path.startsWith('/dashboard/vfe')) {
      newActiveItem = 'vfe';
    } else if (path.startsWith('/detection') || path.startsWith('/dashboard/detection')) {
      newActiveItem = 'detection';
    } else if (path.startsWith('/security') || path.startsWith('/dashboard/security')) {
      newActiveItem = 'security';
    } else if (path.startsWith('/fce-security') || path.startsWith('/dashboard/fce-security')) {
      newActiveItem = 'fce_security';
    } else if (path.startsWith('/network-filtering') || path.startsWith('/dashboard/network-filtering')) {
      newActiveItem = 'network_filtering';
    } else if (path.startsWith('/identity') || path.startsWith('/dashboard/identity')) {
      newActiveItem = 'identity';
    } else if (path.startsWith('/hosts')) {
      newActiveItem = 'hosts';
    } else if (path.startsWith('/settings')) {
      newActiveItem = 'settings';
    } else if (path.startsWith('/activity')) {
      newActiveItem = 'activity';
    } else {
      newActiveItem = 'home'; // Par défaut
    }
    
    setActiveItem(newActiveItem);
    console.log('📍 [Sidebar] Onglet actif mis à jour:', newActiveItem);
  }, [location.pathname]); // Dépendance sur le pathname

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Générer une classe CSS premium pour les éléments de menu
  const getMenuItemClass = (itemKey: MenuItemKey): string => {
    const isActive = activeItem === itemKey;
    
    const baseClasses = `group relative flex items-center gap-3 py-3.5 rounded-xl
                        ${sidebarCollapsed ? 'px-0 justify-center mx-1' : 'px-3.5 mx-3'} 
                        transition-all duration-300`;
    
    // Si l'élément est actif
    if (isActive) {
      return `${baseClasses} ${
        isDarkTheme 
          ? 'bg-gradient-to-r from-indigo-900/80 via-indigo-900/60 to-indigo-800/40 text-white shadow-lg shadow-indigo-900/30 border border-indigo-700/50' 
          : 'bg-gradient-to-r from-indigo-100 via-indigo-50 to-white text-indigo-700 shadow-md shadow-indigo-200/50 border border-indigo-200'
      }`;
    }
    
    // Animation au survol
    return `${baseClasses} ${
      isDarkTheme 
        ? 'text-slate-400 hover:bg-gradient-to-r hover:from-slate-800/70 hover:via-slate-800/50 hover:to-transparent hover:text-white hover:border hover:border-slate-700/30' 
        : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-100 hover:via-slate-50 hover:to-white hover:text-slate-900 hover:border hover:border-slate-200/70'
    }`;
  };
  
  // Animation spéciale pour Vital for Group/Enterprise et Domain
  const getVitalItemClass = (itemKey: MenuItemKey, color: ColorType): string => {
    const isActive = activeItem === itemKey;
    
    // Classes de base avec transitions fluides
    const baseClasses = `group relative flex items-center gap-3 py-3.5 rounded-xl
                        ${sidebarCollapsed ? 'px-0 justify-center mx-1' : 'px-3.5 mx-3'} 
                        transition-all duration-300 ease-out`;
    
    // Si l'élément est actif - style premium avec dégradé enrichi
    if (isActive) {
      return `${baseClasses} ${
        isDarkTheme 
          ? `bg-gradient-to-r from-${color}-900/70 via-${color}-800/50 to-${color}-900/30 text-white shadow-lg shadow-${color}-900/40 border border-${color}-700/50` 
          : `bg-gradient-to-r from-${color}-100 via-${color}-50 to-white text-${color}-700 shadow-md shadow-${color}-300/40 border border-${color}-200/70`
      }`;
    }
    
    // Élément inactif avec effet de lueur au survol
    return `${baseClasses} ${
      isDarkTheme 
        ? `text-${color}-400 hover:bg-gradient-to-r hover:from-${color}-900/30 hover:to-transparent hover:text-${color}-300 hover:shadow-sm hover:border hover:border-${color}-700/30 hover:shadow-${color}-900/20` 
        : `text-${color}-600 hover:bg-gradient-to-r hover:from-${color}-50 hover:to-transparent hover:text-${color}-700 hover:shadow-sm hover:border hover:border-${color}-200/70 hover:shadow-${color}-200/30`
    }`;
  };
  
  // Animation de l'icône
  const getIconClass = (itemKey: MenuItemKey): string => {
    const baseClasses = "flex-shrink-0 transition-transform duration-300";
    return activeItem === itemKey 
      ? `${baseClasses} scale-110 animate-pulse-subtle` 
      : baseClasses;
  };
  
  // Effet de brillance derrière les icônes pour l'effet 3D
  const getIconGlow = (itemKey: MenuItemKey, color: ColorType = 'indigo') => {
    if (!isDarkTheme) return null;
    
    return (
      <div 
        className={`absolute inset-0 w-10 h-10 rounded-full 
                   ${activeItem === itemKey ? `bg-${color}-600/20 animate-pulse-slow` : 'bg-transparent'} 
                   blur-xl transition-opacity duration-500 opacity-70`}
        style={{ left: sidebarCollapsed ? '50%' : '14px', transform: sidebarCollapsed ? 'translateX(-50%)' : 'none' }}
      ></div>
    );
  };

  return (
    <aside 
      className={`fixed h-full z-30 transition-all duration-500 ease-out ${
        isDarkTheme 
          ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-r border-slate-800/40 shadow-xl shadow-black/40' 
          : 'bg-gradient-to-b from-white via-slate-50 to-white border-r border-slate-200/70 shadow-lg shadow-slate-200/30'
      } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
    >
      {/* En-tête avec logo et bouton de collapse */}
      <div className={`h-20 flex items-center px-5 ${
        isDarkTheme ? 'border-b border-slate-800/50' : 'border-b border-slate-200/70'
      }`}>
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Logo avec effet premium */}
          <div className="relative">
            <div className={`absolute inset-0 w-9 h-9 bg-indigo-500/30 rounded-full blur-xl opacity-70 ${
              isDarkTheme ? 'animate-pulse-slow' : ''
            }`}></div>
            <div className={`relative z-10 p-2 rounded-full ${
              isDarkTheme 
                ? 'bg-gradient-to-br from-indigo-900/80 to-indigo-800/50 border border-indigo-700/50' 
                : 'bg-gradient-to-br from-indigo-100 to-white border border-indigo-200'
            }`}>
              <Shield className={`${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} flex-shrink-0`} size={16} />
            </div>
          </div>
          
          {/* Titre avec animation d'apparition */}
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <div className="flex flex-col">
                <span className={`font-bold text-base whitespace-nowrap ${
                  isDarkTheme 
                    ? 'text-gradient text-shadow-sm' 
                    : 'text-indigo-700'
                }`}>
                  PRODSEC Monitor
                </span>
                <span className="text-xs text-slate-500">
                  SEC06
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Bouton de collapse avec animation premium */}
        <button
          onClick={toggleSidebar}
          className={`ml-auto w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            isDarkTheme
              ? 'bg-slate-800 text-slate-300 hover:bg-indigo-900 hover:text-indigo-400 hover:shadow-md hover:shadow-indigo-900/30 border border-slate-700/50'
              : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 hover:shadow-sm hover:shadow-indigo-300/30 border border-slate-200'
          }`}
        >
          <ChevronLeft size={16} className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
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
              to="/overview"
              onClick={() => setActiveItem('home')}
              className={getMenuItemClass('home')}
              onMouseEnter={() => setHoverItem('home')}
              onMouseLeave={() => setHoverItem(null)}
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
              onMouseEnter={() => setHoverItem('problems')}
              onMouseLeave={() => setHoverItem(null)}
            >
              {getIconGlow('problems', 'red')}
              <AlertTriangle size={18} className={getIconClass('problems')} />
              
              {!sidebarCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">Problèmes</span>
              )}
              
              {/* Badge pour nombre de problèmes */}
              <div className={`${sidebarCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} 
                              px-1.5 py-0.5 rounded-full text-xs font-semibold
                              ${isDarkTheme ? 'bg-red-900/70 text-red-300 border border-red-700/30' : 'bg-red-100 text-red-700 border border-red-200/70'}`}>
                VFG+VFE
              </div>
            </Link>
          </nav>
        </div>
        
        {/* Applications critiques */}
        <div className={`px-4 mt-5 ${sidebarCollapsed ? 'text-center' : ''}`}>
          <div className={`text-xs font-semibold uppercase tracking-wider mb-3 mt-2 ${
            isDarkTheme ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {!sidebarCollapsed ? 'Applications' : ''}
          </div>
          
          <nav className="space-y-2">
            {/* Vital for Group */}
            <Link 
              to="/vfg"
              className={getVitalItemClass('vfg', 'indigo')}
              onMouseEnter={() => setHoverItem('vfg')}
              onMouseLeave={() => setHoverItem(null)}
            >
              {getIconGlow('vfg', 'indigo')}
              <div className={`relative flex-shrink-0 ${getIconClass('vfg')}`}>
                <Star 
                  size={18} 
                  className={`${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} 
                            ${activeItem === 'vfg' ? 'animate-pulse-subtle' : ''}`} 
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
              onMouseEnter={() => setHoverItem('vfe')}
              onMouseLeave={() => setHoverItem(null)}
            >
              {getIconGlow('vfe', 'amber')}
              <div className={`relative flex-shrink-0 ${getIconClass('vfe')}`}>
                <Award 
                  size={18} 
                  className={`${isDarkTheme ? 'text-amber-400' : 'text-amber-600'} 
                            ${activeItem === 'vfe' ? 'animate-pulse-subtle' : ''}`} 
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
          </nav>
        </div>

        {/* Domain */}
        <div className={`px-4 mt-5 ${sidebarCollapsed ? 'text-center' : ''}`}>
          <div className={`text-xs font-semibold uppercase tracking-wider mb-3 mt-2 ${
            isDarkTheme ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {!sidebarCollapsed ? 'Domain' : ''}
          </div>
          
          <nav className="space-y-2">
            {/* Detection & CTL */}
            <Link 
              to="/detection"
              onClick={() => setActiveItem('detection')}
              className={getVitalItemClass('detection', 'blue')}
              onMouseEnter={() => setHoverItem('detection')}
              onMouseLeave={() => setHoverItem(null)}
            >
              {getIconGlow('detection', 'blue')}
              <div className={`relative flex-shrink-0 ${getIconClass('detection')}`}>
                <Shield 
                  size={18} 
                  className={`${isDarkTheme ? 'text-blue-400' : 'text-blue-600'} 
                            ${activeItem === 'detection' ? 'animate-pulse-subtle' : ''}`} 
                />
              </div>
              
              {!sidebarCollapsed && (
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300
                                ${activeItem === 'detection' ? 'tracking-wide' : ''}`}>
                  Détection & CTL
                </span>
              )}
              
              {/* Animation subtile d'arrière-plan pour les éléments actifs */}
              {activeItem === 'detection' && (
                <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-grid-pattern"></div>
                </div>
              )}
            </Link>
            
            {/* Security & Encryption */}
            <Link 
              to="/security"
              className={getVitalItemClass('security', 'red')}
              onMouseEnter={() => setHoverItem('security')}
              onMouseLeave={() => setHoverItem(null)}
            >
              {getIconGlow('security', 'red')}
              <div className={`relative flex-shrink-0 ${getIconClass('security')}`}>
                <Key 
                  size={18} 
                  className={`${isDarkTheme ? 'text-red-400' : 'text-red-600'} 
                            ${activeItem === 'security' ? 'animate-pulse-subtle' : ''}`} 
                />
              </div>
              
              {!sidebarCollapsed && (
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300
                                ${activeItem === 'security' ? 'tracking-wide' : ''}`}>
                  Security & Encryption
                </span>
              )}
              
              {/* Animation subtile d'arrière-plan pour les éléments actifs */}
              {activeItem === 'security' && (
                <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-grid-pattern"></div>
                </div>
              )}
            </Link>
            
            {/* FCE Security */}
            <Link 
              to="/fce-security"
              className={getVitalItemClass('fce_security', 'purple')}
              onMouseEnter={() => setHoverItem('fce_security')}
              onMouseLeave={() => setHoverItem(null)}
            >
              {getIconGlow('fce_security', 'purple')}
              <div className={`relative flex-shrink-0 ${getIconClass('fce_security')}`}>
                <Shield 
                  size={18} 
                  className={`${isDarkTheme ? 'text-purple-400' : 'text-purple-600'} 
                            ${activeItem === 'fce_security' ? 'animate-pulse-subtle' : ''}`} 
                />
              </div>
              
              {!sidebarCollapsed && (
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300
                                ${activeItem === 'fce_security' ? 'tracking-wide' : ''}`}>
                  FCE Security
                </span>
              )}
              
              {/* Animation subtile d'arrière-plan pour les éléments actifs */}
              {activeItem === 'fce_security' && (
                <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-grid-pattern"></div>
                </div>
              )}
            </Link>
            
            {/* Network Filtering */}
            <Link 
              to="/network-filtering"
              className={getVitalItemClass('network_filtering', 'cyan')}
              onMouseEnter={() => setHoverItem('network_filtering')}
              onMouseLeave={() => setHoverItem(null)}
            >
              {getIconGlow('network_filtering', 'cyan')}
              <div className={`relative flex-shrink-0 ${getIconClass('network_filtering')}`}>
                <Globe 
                  size={18} 
                  className={`${isDarkTheme ? 'text-cyan-400' : 'text-cyan-600'} 
                            ${activeItem === 'network_filtering' ? 'animate-pulse-subtle' : ''}`} 
                />
              </div>
              
              {!sidebarCollapsed && (
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300
                                ${activeItem === 'network_filtering' ? 'tracking-wide' : ''}`}>
                  Network Filtering
                </span>
              )}
              
              {/* Animation subtile d'arrière-plan pour les éléments actifs */}
              {activeItem === 'network_filtering' && (
                <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-grid-pattern"></div>
                </div>
              )}
            </Link>
            
            {/* Identity */}
            <Link 
              to="/identity"
              className={getVitalItemClass('identity', 'pink')}
              onMouseEnter={() => setHoverItem('identity')}
              onMouseLeave={() => setHoverItem(null)}
            >
              {getIconGlow('identity', 'pink')}
              <div className={`relative flex-shrink-0 ${getIconClass('identity')}`}>
                <User 
                  size={18} 
                  className={`${isDarkTheme ? 'text-pink-400' : 'text-pink-600'} 
                            ${activeItem === 'identity' ? 'animate-pulse-subtle' : ''}`} 
                />
              </div>
              
              {!sidebarCollapsed && (
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300
                                ${activeItem === 'identity' ? 'tracking-wide' : ''}`}>
                  Identity
                </span>
              )}
              
              {/* Animation subtile d'arrière-plan pour les éléments actifs */}
              {activeItem === 'identity' && (
                <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-grid-pattern"></div>
                </div>
              )}
            </Link>
          </nav>
        </div>
        
        {/* Inventory section */}
        <div className={`px-4 mt-5 ${sidebarCollapsed ? 'text-center' : ''}`}>
          <div className={`text-xs font-semibold uppercase tracking-wider mb-3 mt-2 ${
            isDarkTheme ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {!sidebarCollapsed ? 'Inventory' : ''}
          </div>
          
          <nav className="space-y-2">
            {/* Hosts */}
            <Link 
              to="/hosts"
              onClick={() => setActiveItem('hosts')}
              className={getVitalItemClass('hosts', 'green')}
              onMouseEnter={() => setHoverItem('hosts')}
              onMouseLeave={() => setHoverItem(null)}
            >
              {getIconGlow('hosts', 'green')}
              <div className={`relative flex-shrink-0 ${getIconClass('hosts')}`}>
                <Layers 
                  size={18} 
                  className={`${isDarkTheme ? 'text-green-400' : 'text-green-600'} 
                            ${activeItem === 'hosts' ? 'animate-pulse-subtle' : ''}`} 
                />
              </div>
              
              {!sidebarCollapsed && (
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300
                                ${activeItem === 'hosts' ? 'tracking-wide' : ''}`}>
                  Hosts
                </span>
              )}
              
              {/* Animation subtile d'arrière-plan pour les éléments actifs */}
              {activeItem === 'hosts' && (
                <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-grid-pattern"></div>
                </div>
              )}
            </Link>
          </nav>
        </div>
        
        {/* Espace supplémentaire pour l'esthétique */}
        <div className="flex-grow"></div>
        
        {/* Footer avec version */}
        <div className={`px-4 py-3 mt-auto ${
          isDarkTheme ? 'border-t border-slate-800/40' : 'border-t border-slate-200/70'
        }`}>
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${
            isDarkTheme
              ? 'bg-gradient-to-r from-slate-800/40 via-slate-900/40 to-slate-800/30 shadow-inner shadow-black/10 border border-slate-700/30'
              : 'bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-indigo-50/30 shadow-inner shadow-blue-100/30 border border-slate-200/50'
          }`}>
            {/* BNP Paribas Logo */}
            <div className="relative flex-shrink-0">
              <div className={`absolute inset-0 w-6 h-6 bg-green-500/20 rounded-full blur-md opacity-60 ${isDarkTheme ? 'animate-pulse-slow' : ''}`}></div>
              <div className={`relative z-10 px-1 py-0.5 rounded-sm ${
                isDarkTheme ? 'bg-green-900/60 border border-green-700/30' : 'bg-green-100 border border-green-200'
              }`}>
                <span className={`text-xs font-bold ${isDarkTheme ? 'text-green-400' : 'text-green-700'}`}>BNP</span>
              </div>
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className={`text-xs font-medium ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                  BNP Paribas
                </span>
                <span className="text-[10px] text-slate-500">v1.0.0</span>
              </div>
            )}
          </div>

          {/* Developer credit and feedback link */}
          {!sidebarCollapsed && (
            <div className={`mt-3 px-2 py-2 rounded-lg text-center ${
              isDarkTheme 
                ? 'bg-gradient-to-b from-slate-800/50 to-slate-900/40 border border-slate-700/30' 
                : 'bg-gradient-to-b from-slate-100/70 to-slate-50/70 border border-slate-200/50'
            }`}>
              <div className="flex flex-col items-center">
                <span className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                  Développé par
                </span>
                <a
                  href="mailto:Rayane.Bennasr@externe.bnpparibas.com"
                  className={`text-xs font-medium mt-1 ${
                    isDarkTheme ? 'text-blue-400 hover:text-blue-300 hover-glow' : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  Rayane Ben Nasr
                </a>
                <div className={`flex items-center mt-2 px-2 py-0.5 rounded ${
                  isDarkTheme ? 'bg-blue-900/30 border border-blue-700/20' : 'bg-blue-100/70 border border-blue-200/50'
                }`}>
                  <span className={`text-[10px] font-bold ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'} mr-1`}>BETA</span>
                  <span className="text-[9px] text-slate-500">Vos retours sont précieux</span>
                </div>
              </div>
            </div>
          )}
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

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
