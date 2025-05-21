import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Menu, Bell, Search, Clock, Settings, Shield, ChevronRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const { activeProblems } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSearchPopover, setShowSearchPopover] = useState(false);

  // Effet pour suivre le scroll et mettre à jour l'état
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effet pour mettre à jour l'heure
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Formatte l'heure dans un format élégant HH:MM
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formatte la date dans un format jour/mois/année
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <header 
      className={`h-16 px-5 sm:px-8 flex items-center justify-between sticky top-0 z-20 transition-all duration-500 
        ${scrolled ? 'shadow-lg' : 'shadow-md'} 
        ${isDarkTheme
          ? `bg-gradient-to-r from-slate-900/95 via-slate-900/97 to-slate-800/95 backdrop-blur-xl border-b 
             ${scrolled ? 'border-indigo-900/40' : 'border-slate-700/30'}`
          : `bg-gradient-to-r from-white/95 via-white/97 to-slate-50/95 backdrop-blur-xl border-b 
             ${scrolled ? 'border-indigo-200/50' : 'border-slate-200/30'}`
        }`}
    >
      {/* Élément décoratif - ligne supérieure subtile */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r 
        ${isDarkTheme
          ? 'from-transparent via-indigo-600/30 to-transparent'
          : 'from-transparent via-indigo-400/40 to-transparent'
        } z-30`}></div>

      {/* Partie gauche - Titre avec design moderne et animations */}
      <div className="flex items-center">
        {/* Logo subtil pour une expérience haut de gamme */}
        <div className={`hidden md:flex items-center justify-center rounded-full 
                         ${isDarkTheme ? 'bg-indigo-900/20' : 'bg-indigo-100/60'}
                         mr-3 p-1.5 border ${isDarkTheme ? 'border-indigo-700/30' : 'border-indigo-200'}`}>
          <Shield className={`${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`} size={18} />
        </div>
      
        {/* Bouton mobile pour ouvrir le menu */}
        <button 
          className={`lg:hidden mr-4 p-2 rounded-full transition-all duration-300 shadow-sm
                     ${isDarkTheme
                       ? 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-900/50 border border-slate-700/50'
                       : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-100/70 border border-slate-200/70'
                     }`}
          aria-label="Ouvrir le menu"
        >
          <Menu size={18} />
        </button>
      
        {/* Titre et sous-titre avec animation au chargement */}
        <div className="flex flex-col">
          {subtitle ? (
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`font-bold text-lg sm:text-xl ${
                  isDarkTheme 
                    ? 'text-white text-shadow-sm' 
                    : 'text-slate-800'
                } tracking-tight`}>{title}</h1>
                <div className="flex items-center">
                  <ChevronRight size={16} className={`mx-1 ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`} />
                  <span className={`font-medium text-sm sm:text-base ${
                    isDarkTheme 
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-500 text-shadow-sm' 
                      : 'text-indigo-600'
                  }`}>{subtitle}</span>
                </div>
              </div>
              <p className={`text-xs mt-0.5 ${isDarkTheme ? 'text-slate-500' : 'text-slate-500'} flex items-center gap-1.5`}>
                <span className="font-medium">SEC06</span>
                <span className="h-1 w-1 rounded-full bg-slate-600/40"></span>
                <span>{formatDate(currentTime)}</span>
              </p>
            </div>
          ) : (
            <div>
              <h1 className={`font-bold text-lg sm:text-xl ${
                isDarkTheme 
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 text-shadow-sm' 
                  : 'text-slate-800'
              } tracking-tight`}>{title}</h1>
              <p className={`text-xs mt-0.5 ${isDarkTheme ? 'text-slate-500' : 'text-slate-500'} flex items-center gap-1.5`}>
                <span className="font-medium">SEC06</span>
                <span className="h-1 w-1 rounded-full bg-slate-600/40"></span>
                <span>{formatDate(currentTime)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Partie droite - Actions et statut */}
      <div className="flex items-center gap-3">
        {/* Statut de problèmes avec badge */}
        <div className={`hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full 
                        ${activeProblems.length > 0
                          ? 'bg-gradient-to-r from-red-900/30 to-red-900/20 border border-red-700/40 text-red-400'
                          : 'bg-gradient-to-r from-emerald-900/30 to-emerald-900/20 border border-emerald-700/40 text-emerald-400'
                        } shadow-sm transition-all duration-300 hover:shadow-md`}
        >
          {activeProblems.length > 0 ? (
            <>
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                {/* Effet de halo */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-red-500 opacity-30 animate-ping"></div>
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{activeProblems.length} problème{activeProblems.length > 1 ? 's' : ''} actif{activeProblems.length > 1 ? 's' : ''}</span>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                {/* Effet de halo subtil */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-emerald-500 opacity-20 animate-pulse"></div>
              </div>
              <span className="text-xs font-medium whitespace-nowrap">Tous les systèmes opérationnels</span>
            </>
          )}
        </div>

        {/* Affichage de l'heure en cours */}
        <div className={`hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-sm
                       ${isDarkTheme 
                         ? 'bg-gradient-to-r from-slate-800/90 to-slate-800/70 border border-slate-700/50 text-slate-300' 
                         : 'bg-gradient-to-r from-slate-100 to-white border border-slate-200/70 text-slate-600'}`}>
          <Clock className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-500'} size={14} />
          <span className="text-xs font-medium">{formatTime(currentTime)}</span>
        </div>

        {/* Bouton de recherche */}
        <button 
          onClick={() => setShowSearchPopover(!showSearchPopover)}
          className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${
            isDarkTheme
              ? 'bg-gradient-to-br from-slate-800/90 to-slate-800/70 text-slate-300 hover:text-indigo-300 hover:from-slate-800 hover:to-slate-750 shadow-sm border border-slate-700/50 hover:border-indigo-700/50'
              : 'bg-gradient-to-br from-slate-100 to-white text-slate-600 hover:text-indigo-600 hover:from-white hover:to-slate-50 shadow-sm border border-slate-200 hover:border-indigo-200'
          } transform-gpu hover:scale-[1.05]`}
          aria-label="Rechercher"
        >
          <Search size={16} />
        </button>

        {/* Notifications */}
        <button 
          className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${
            isDarkTheme
              ? 'bg-gradient-to-br from-slate-800/90 to-slate-800/70 text-slate-300 hover:text-indigo-300 hover:from-slate-800 hover:to-slate-750 shadow-sm border border-slate-700/50 hover:border-indigo-700/50'
              : 'bg-gradient-to-br from-slate-100 to-white text-slate-600 hover:text-indigo-600 hover:from-white hover:to-slate-50 shadow-sm border border-slate-200 hover:border-indigo-200'
          } transform-gpu hover:scale-[1.05]`}
          aria-label="Notifications"
        >
          <Bell size={16} />
        </button>

        {/* Paramètres */}
        <button 
          className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${
            isDarkTheme
              ? 'bg-gradient-to-br from-slate-800/90 to-slate-800/70 text-slate-300 hover:text-indigo-300 hover:from-slate-800 hover:to-slate-750 shadow-sm border border-slate-700/50 hover:border-indigo-700/50'
              : 'bg-gradient-to-br from-slate-100 to-white text-slate-600 hover:text-indigo-600 hover:from-white hover:to-slate-50 shadow-sm border border-slate-200 hover:border-indigo-200'
          } transform-gpu hover:scale-[1.05]`}
          aria-label="Paramètres"
        >
          <Settings size={16} />
        </button>

        {/* Badge BETA avec effet premium */}
        <a
          href="mailto:Rayane.Bennasr@externe.bnpparibas.com"
          className={`flex items-center text-xs px-3 py-1.5 rounded-full transition-all duration-300 ml-1
                      ${isDarkTheme
                        ? 'bg-gradient-to-r from-indigo-900/60 to-blue-900/60 text-blue-300 border border-indigo-700/30 shadow-sm shadow-indigo-900/20 hover:shadow-md hover:shadow-indigo-800/30'
                        : 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-800 border border-indigo-300/50 shadow-sm hover:shadow-md hover:shadow-indigo-300/20'
                      } transform-gpu hover:scale-105`}
        >
          <span className="font-bold mr-1.5">BETA</span>
          <span className={isDarkTheme ? 'text-blue-300 font-medium' : 'text-indigo-700 font-medium'}>Feedback</span>
        </a>
      </div>
    </header>
  );
};

export default Header;
