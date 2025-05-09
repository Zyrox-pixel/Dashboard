import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw, Menu, X, Bell, Search, ChevronDown, Settings,
  MessageCircle, Moon, Sun, Zap, Globe, AlertTriangle,
  BarChart3
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp } from '../../contexts/AppContext';

interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

/**
 * Header modernisé avec design futuriste, animations et effets visuels avancés
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
  const [searchValue, setSearchValue] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [animateRefresh, setAnimateRefresh] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
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
  
  // Effet sonore pour les boutons
  const playButtonSound = () => {
    try {
      const audio = new Audio('data:audio/mp3;base64,SUQzAwAAAAAAJlRQRTEAAAAcAAAAU291bmRKYXkuY29tIFNvdW5kIEVmZmVjdHMA//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAADAAAGhgBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVWqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqr///////////////////////////////////////////8AAAA8TEFNRTMuMTAwAZYAAAAAAAAAABSAJAJAQgAAgAAAA+alYZQPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uAxAAABGQDe7QQAAI0gCV2lYABwwAVgcABAAAAB4HgZASAYBT8PAIAgfD9D8EAUF+nwNyfoAwPAxJBAkCQNwMBAEAOA9PAsDwOA30+XAgCQJAYDgSBIFAPSQQJAkDcDwdyOxdJGIAQPAcBwSBAD4D8Bfgh/gHAIB+h//6fZwQCvH8B/LhfgQEYuH////qBIRDDLiQZIBQbY8XGPnxsRJgIAFICIGHzhIE5CSkCBX8jAABgdZgO8JpnQALnARrHC5RiwMABgDGCpj/0eZeMfLsOFOsMBfA5YT43RVwsDdKL+MBx+RJxnEoxKCmr5X6qKjkvcPDJuN5gNY3IqBgINMjLAQBJOyVRZZH8fxIy2CwKJCUSDIwlMpJibZWu///7mmSaSlJlT/+6kkaUT///+pgCBISEhIUsBRUFf/+RJRUu7u7vJCZZVlXd3f3kib//u7vklTOv8ZlT/WVZTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==');
      audio.volume = 0.15;
      audio.play();
    } catch (e) {
      console.log('Sound effect not supported');
    }
  };
  
  // Gérer le clic sur le bouton de rafraîchissement
  const handleRefreshClick = () => {
    if (onRefresh && !isLoading) {
      setAnimateRefresh(true);
      playButtonSound();
      
      // Effet visuel pour le bouton de rafraîchissement
      onRefresh();
      
      // Réinitialiser l'animation après 1s
      setTimeout(() => {
        setAnimateRefresh(false);
      }, 1000);
    }
  };
  
  // Fermer les modales lorsqu'on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Fermer les notifications si on clique à l'extérieur
      if (
        notificationRef.current && 
        !notificationRef.current.contains(event.target as Node) &&
        showNotifications
      ) {
        setShowNotifications(false);
      }
      
      // Fermer le menu utilisateur si on clique à l'extérieur
      if (
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target as Node) &&
        document.querySelector('.user-menu-dropdown') &&
        !document.querySelector('.user-menu-dropdown')?.contains(event.target as Node)
      ) {
        const dropdown = document.querySelector('.user-menu-dropdown');
        if (dropdown) {
          dropdown.classList.remove('opacity-100', 'visible');
          dropdown.classList.add('opacity-0', 'invisible');
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);
  
  // Focus automatique sur le champ de recherche quand il est affiché
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Animation du titre
  const renderAnimatedTitle = () => {
    return (
      <div className="relative flex items-center">
        <h1 className="text-lg font-bold text-white relative">{title}
          {/* Effet de lueur derrière le texte */}
          <span className="absolute inset-0 blur-sm bg-indigo-500/20 -z-10"></span>
        </h1>
        {subtitle && (
          <p className="text-xs text-indigo-300 ml-2 opacity-80">{subtitle}</p>
        )}

        {/* Particules d'arrière-plan du titre */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute w-1 h-1 rounded-full bg-indigo-500/70"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `glow-float ${3 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <header 
      className={`sticky top-0 z-30 w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-[#14152e]/95 backdrop-blur-xl shadow-xl border-b border-indigo-900/30 py-2' 
          : 'bg-[#14152e] py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center">
          {/* Logo et titre */}
          <div className="flex items-center">
            {/* Mobile menu toggle */}
            <button 
              className="lg:hidden mr-3 text-indigo-400 hover:text-indigo-300 transition-all duration-300"
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                playButtonSound();
              }}
              aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-lg border border-indigo-800/30 bg-indigo-900/20 hover:bg-indigo-800/30 transition-all duration-300">
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </div>
            </button>
            
            {/* Logo */}
            <div className="flex items-center mr-4">
              <div className="h-10 w-10 relative group">
                {/* Effet d'arrière-plan animé */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-600 animate-gradient-shift"></div>
                
                {/* Effet de lueur */}
                <div className="absolute inset-0 rounded-xl blur-md bg-indigo-500/50 group-hover:bg-indigo-500/70 transition-all duration-500 animate-pulse-cosmic"></div>
                
                {/* Logo principal */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg border border-indigo-500/30 backdrop-blur-md">
                  <Zap className="text-white w-5 h-5" />
                </div>
              </div>
            </div>
            
            {/* Titre et sous-titre */}
            {renderAnimatedTitle()}
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Barre de recherche */}
            <div className={`relative transition-all duration-300 ${showSearch ? 'w-64' : 'w-8'}`}>
              {showSearch ? (
                <div className="relative">
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Rechercher..." 
                    className={`w-full py-1.5 pl-8 pr-10 bg-[#191a3a]/80 backdrop-blur-md border ${
                      isSearchFocused 
                        ? 'border-indigo-500/50 ring-2 ring-indigo-500/20' 
                        : 'border-indigo-800/30'
                    } rounded-lg text-sm text-white focus:outline-none transition-all duration-300`}
                  />
                  <Search 
                    size={14} 
                    className="absolute left-2.5 top-[calc(50%-7px)] text-indigo-400"
                  />
                  <button 
                    className="absolute right-2 top-[calc(50%-8px)] text-indigo-400 hover:text-indigo-300 transition-colors duration-200" 
                    onClick={() => {
                      setShowSearch(false);
                      setSearchValue('');
                      playButtonSound();
                    }}
                  >
                    <X size={16} />
                  </button>
                  
                  {/* Effet de lueur au focus */}
                  {isSearchFocused && (
                    <div className="absolute inset-0 -z-10 rounded-lg blur-md bg-indigo-600/10"></div>
                  )}
                </div>
              ) : (
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-indigo-800/30 bg-indigo-900/20 text-indigo-400 hover:bg-indigo-800/30 hover:text-indigo-300 transition-all duration-300" 
                  onClick={() => {
                    setShowSearch(true);
                    playButtonSound();
                  }}
                  aria-label="Rechercher"
                >
                  <Search size={16} />
                </button>
              )}
            </div>
            
            {/* Toggle de thème */}
            <button 
              onClick={() => {
                toggleTheme();
                playButtonSound();
              }}
              aria-label={isDarkTheme ? "Activer le mode clair" : "Activer le mode sombre"}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-indigo-800/30 bg-indigo-900/20 text-indigo-400 hover:bg-indigo-800/30 hover:text-indigo-300 transition-all duration-300 overflow-hidden"
            >
              <div className="relative z-10">
                {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
              </div>
              
              {/* Effet d'ondulation au clic */}
              <span className="absolute w-0 h-0 rounded-full bg-indigo-500/30 transform scale-0 transition-transform duration-500 ease-out peer-hover:scale-100"></span>
            </button>
            
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-indigo-800/30 bg-indigo-900/20 text-indigo-400 hover:bg-indigo-800/30 hover:text-indigo-300 transition-all duration-300"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  playButtonSound();
                }}
                aria-label="Notifications"
              >
                <Bell size={16} />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-white text-xs flex items-center justify-center border border-red-900/30 shadow-lg animate-pulse-cosmic">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                )}
              </button>
              
              {/* Dropdown de notifications */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-[#191a3a]/95 backdrop-blur-xl border border-indigo-800/30 shadow-2xl z-50 transition-all duration-300 animate-fade-in-up">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Notifications</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-900/60 text-indigo-300 border border-indigo-800/30">
                        {notifications} nouvelle{notifications !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications > 0 ? (
                        activeProblems.slice(0, 5).map((problem, index) => (
                          <div 
                            key={`notification-${index}`} 
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-indigo-900/30 transition-colors duration-200 border border-indigo-900/20"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-900/30 border border-red-800/30 flex items-center justify-center text-red-400">
                              <AlertTriangle size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white truncate">{problem.title}</p>
                              <p className="text-xs text-indigo-300 truncate">{problem.subtitle}</p>
                              <div className="flex items-center mt-1">
                                <span className="text-[10px] text-indigo-400">{problem.time}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <div className="w-16 h-16 mx-auto rounded-full bg-indigo-900/30 border border-indigo-800/30 flex items-center justify-center text-indigo-400 mb-3">
                            <Bell size={24} />
                          </div>
                          <p className="text-sm text-indigo-300">Aucune nouvelle notification</p>
                          <p className="text-xs text-indigo-400 mt-1">Vous êtes à jour !</p>
                        </div>
                      )}
                    </div>
                    
                    {notifications > 0 && (
                      <button className="w-full mt-3 py-2 rounded-lg bg-indigo-900/40 hover:bg-indigo-800/40 text-indigo-300 text-sm transition-colors duration-200 border border-indigo-800/30">
                        Voir toutes les notifications
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Feedback link */}
            <a
              href="mailto:Rayane.Bennasr@externe.bnpparibas.com"
              className="hidden md:flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm transition-all duration-300 bg-indigo-900/20 hover:bg-indigo-800/30 text-indigo-300 hover:text-indigo-200 border border-indigo-800/30"
              title="Envoyer un feedback"
              onClick={playButtonSound}
            >
              <MessageCircle size={14} />
              <span className="inline flex items-center bg-blue-900/70 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-semibold">
                BETA
                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              </span>
            </a>
            
            {/* Refresh button with advanced animation */}
            {onRefresh && (
              <button 
                onClick={handleRefreshClick}
                disabled={isLoading}
                className="relative overflow-hidden rounded-lg py-1.5 px-3 text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-1.5 btn-primary disabled:before:hidden"
                aria-label="Actualiser les données"
              >
                <RefreshCw 
                  size={14} 
                  className={`transition-all duration-300 ${
                    animateRefresh ? 'animate-spin text-white' : isLoading ? 'animate-spin text-white/80' : 'text-white'
                  }`} 
                />
                <span className="hidden sm:inline relative z-10">
                  {isLoading ? 'Chargement...' : 'Actualiser'}
                </span>
                
                {/* Effet de particules au clic */}
                {animateRefresh && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={`refresh-particle-${i}`}
                        className="absolute w-1 h-1 rounded-full bg-white"
                        style={{
                          transform: `rotate(${i * 45}deg) translateY(-15px)`,
                          opacity: 0,
                          animation: `particle-fade-out 0.5s ease-out forwards ${i * 0.05}s`
                        }}
                      ></div>
                    ))}
                  </div>
                )}
              </button>
            )}
            
            {/* Profil */}
            <div className="relative group" ref={userMenuRef}>
              <button 
                className="flex items-center gap-2 hover:bg-indigo-800/30 rounded-lg p-1.5 transition-all duration-300 border border-indigo-800/30 bg-indigo-900/20"
                onClick={playButtonSound}
                aria-label="Profil utilisateur"
              >
                <div className="relative h-7 w-7 rounded-lg overflow-hidden">
                  {/* Gradient de fond animé */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-600 animate-gradient-shift"></div>
                  
                  {/* Avatar utilisateur */}
                  <div className="absolute inset-0 flex items-center justify-center text-white font-medium text-xs shadow-inner">
                    AP
                  </div>
                </div>
                <span className="hidden md:block text-sm text-indigo-300">Admin</span>
                <ChevronDown size={14} className="text-indigo-400" />
              </button>
              
              {/* Menu dropdown avancé */}
              <div className="user-menu-dropdown absolute right-0 mt-2 w-60 bg-[#191a3a]/95 backdrop-blur-xl border border-indigo-800/30 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right group-hover:translate-y-0 translate-y-2 z-50">
                <div className="p-3">
                  {/* En-tête profil */}
                  <div className="flex items-center gap-3 border-b border-indigo-900/30 pb-3 mb-2">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-600 animate-gradient-shift flex items-center justify-center text-white font-medium shadow-lg">
                      AP
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">Admin Dynatrace</h4>
                      <p className="text-xs text-indigo-400">Administrateur</p>
                    </div>
                  </div>
                  
                  {/* Menu options */}
                  <div className="space-y-1 pt-1">
                    <a href="#" className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-300 hover:bg-indigo-800/30 rounded-lg transition-colors duration-200">
                      <Settings size={14} className="text-indigo-400" />
                      <span>Paramètres</span>
                    </a>
                    <a href="#" className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-300 hover:bg-indigo-800/30 rounded-lg transition-colors duration-200">
                      <Globe size={14} className="text-indigo-400" />
                      <span>Langue</span>
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-indigo-900/70 text-indigo-300">FR</span>
                    </a>
                    <a href="#" className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors duration-200 mt-2 border-t border-indigo-900/30 pt-2">
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
        </div>
        
        {/* Menu mobile - avec animation améliorée */}
        <div 
          className={`lg:hidden transition-all duration-500 overflow-hidden ease-in-out ${
            isMenuOpen 
              ? 'max-h-[300px] opacity-100 py-4' 
              : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex flex-col space-y-2 mt-2">
            <a 
              href="/dashboard/vfg" 
              className="text-indigo-300 hover:text-white py-2 px-3 rounded-lg hover:bg-indigo-800/30 transition-all duration-300 border border-transparent hover:border-indigo-800/30 flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center text-indigo-400">
                <BarChart3 size={18} />
              </span>
              <span>Dashboard VFG</span>
            </a>
            <a 
              href="/dashboard/vfe" 
              className="text-indigo-300 hover:text-white py-2 px-3 rounded-lg hover:bg-indigo-800/30 transition-all duration-300 border border-transparent hover:border-indigo-800/30 flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center text-indigo-400">
                <BarChart3 size={18} />
              </span>
              <span>Dashboard VFE</span>
            </a>
            <a 
              href="/problems/unified" 
              className="text-indigo-300 hover:text-white py-2 px-3 rounded-lg hover:bg-indigo-800/30 transition-all duration-300 border border-transparent hover:border-indigo-800/30 flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center text-red-400 relative">
                <AlertTriangle size={18} />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                )}
              </span>
              <span>Problèmes</span>
              {notifications > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 text-xs border border-red-800/30">
                  {notifications}
                </span>
              )}
            </a>
          </div>
        </div>
      </div>
      
      {/* Les styles pour les animations avancées ont été déplacés dans animations.css */}
    </header>
  );
};

export default ModernHeader;