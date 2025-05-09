import React, { useState, useEffect } from 'react';
import { RefreshCw, Moon, Sun, Menu, X, Bell, Search, ChevronDown, Settings } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp } from '../../contexts/AppContext';

interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

/**
 * Header modernisé avec design amélioré, thèmes et fonctionnalités supplémentaires
 */
const ModernHeader: React.FC<ModernHeaderProps> = ({ 
  title, 
  subtitle, 
  onRefresh,
  isLoading = false
}) => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const { activeProblems } = useApp();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState(activeProblems.length);
  const [showSearch, setShowSearch] = useState(false);
  
  // Détecter le scroll pour appliquer des effets
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Mettre à jour les notifications basées sur les problèmes actifs
  useEffect(() => {
    setNotifications(activeProblems.length);
  }, [activeProblems]);
  
  return (
    <header 
      className={`sticky top-0 z-30 w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-slate-900/95 backdrop-blur-md shadow-lg py-2' 
          : 'bg-slate-900 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center">
          {/* Logo et titre */}
          <div className="flex items-center">
            {/* Mobile menu toggle */}
            <button 
              className="lg:hidden mr-3 text-slate-400 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            {/* Logo */}
            <div className="flex items-center mr-4">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">DT</span>
              </div>
            </div>
            
            {/* Titre et sous-titre */}
            <div>
              <h1 className="text-lg font-bold text-white">{title}</h1>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-1 md:space-x-3">
            {/* Barre de recherche */}
            <div className={`relative transition-all duration-300 ${showSearch ? 'w-64' : 'w-8'}`}>
              {showSearch ? (
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    className="w-full py-1.5 pl-3 pr-10 bg-slate-800 border border-slate-700 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" 
                  />
                  <button 
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-white" 
                    onClick={() => setShowSearch(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button 
                  className="text-slate-400 hover:text-white" 
                  onClick={() => setShowSearch(true)}
                >
                  <Search size={18} />
                </button>
              )}
            </div>
            
            {/* Notifications */}
            <div className="relative">
              <button className="text-slate-400 hover:text-white relative">
                <Bell size={18} />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                )}
              </button>
            </div>
            
            {/* Thème */}
            <button 
              onClick={toggleTheme} 
              className="text-slate-400 hover:text-white"
              aria-label={isDarkTheme ? 'Passer au thème clair' : 'Passer au thème sombre'}
            >
              {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            {/* Refresh button with animation */}
            {onRefresh && (
              <button 
                onClick={onRefresh}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 py-1.5 px-3 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">
                  {isLoading ? 'Chargement...' : 'Actualiser'}
                </span>
              </button>
            )}
            
            {/* Profil */}
            <div className="relative group">
              <button className="flex items-center gap-2 hover:bg-slate-800 rounded-md p-1.5 transition-all duration-200">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs shadow-md">
                  AP
                </div>
                <span className="hidden md:block text-sm text-slate-300">Admin</span>
                <ChevronDown size={16} className="text-slate-400" />
              </button>
              
              {/* Menu dropdown */}
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-1">
                  <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
                    <Settings size={14} />
                    <span>Paramètres</span>
                  </a>
                  <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Déconnexion</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Menu mobile */}
        <div className={`lg:hidden transition-all duration-300 overflow-hidden ${
          isMenuOpen ? 'max-h-screen opacity-100 py-4' : 'max-h-0 opacity-0'
        }`}>
          <div className="flex flex-col space-y-3 mt-2">
            <a href="/dashboard/vfg" className="text-slate-300 hover:text-white py-2 px-3 rounded-md hover:bg-slate-800">
              Dashboard VFG
            </a>
            <a href="/dashboard/vfe" className="text-slate-300 hover:text-white py-2 px-3 rounded-md hover:bg-slate-800">
              Dashboard VFE
            </a>
            <a href="/problems/unified" className="text-slate-300 hover:text-white py-2 px-3 rounded-md hover:bg-slate-800">
              Problèmes
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ModernHeader;