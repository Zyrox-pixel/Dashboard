import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Menu, Clock, Shield, ChevronRight } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { isDarkTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

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
