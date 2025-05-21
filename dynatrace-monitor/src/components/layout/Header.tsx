import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Sun, Moon, Bell, Search, Mail, HelpCircle, User, X, Menu, 
  ChevronDown, RefreshCw, DownloadCloud, Settings
} from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
  const [notificationCount] = useState<number>(3);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [timeFromLastRefresh, setTimeFromLastRefresh] = useState<string>("Actualisation: 2 min");
  
  // Effet de synchronisation du temps écoulé depuis la dernière actualisation
  useEffect(() => {
    const interval = setInterval(() => {
      // Incrémenter le temps écoulé (en conditions réelles, cela serait basé sur un timestamp stocké)
      const minutes = parseInt(timeFromLastRefresh.split(': ')[1].split(' ')[0]) + 1;
      setTimeFromLastRefresh(`Actualisation: ${minutes} min`);
    }, 60000); // Mettre à jour chaque minute
    
    return () => clearInterval(interval);
  }, [timeFromLastRefresh]);
  
  // Fonction pour simuler une actualisation des données
  const handleRefresh = () => {
    if (isRefreshing) return; // Éviter les clics multiples
    
    setIsRefreshing(true);
    
    // Simuler le temps de chargement
    setTimeout(() => {
      setIsRefreshing(false);
      setTimeFromLastRefresh("Actualisation: 0 min");
    }, 1500);
  };
  
  // Gérer l'affichage/masquage de la recherche
  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
  };

  return (
    <header className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 ${
      isDarkTheme
        ? 'bg-slate-900/80 border-slate-700/50'
        : 'bg-white/90 border-slate-200/70'
    } border-b shadow-sm backdrop-blur-md transition-all duration-300`}>
      {/* Partie gauche - Titre et navigation */}
      <div className="flex items-center">
        {/* Option: Bouton mobile pour ouvrir le menu (à relier au contexte) */}
        <button className="lg:hidden mr-3 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
          <Menu size={20} />
        </button>
      
        {/* Titre et sous-titre avec animations au chargement */}
        <div className="flex flex-col fade-in">
          <h1 className={`font-bold text-lg sm:text-xl ${isDarkTheme ? 'text-gradient' : ''}`}>
            {subtitle ? (
              <div className="flex items-center gap-2">
                <span>{title}</span>
                <span className="text-slate-400">/</span>
                <span className={`${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}>{subtitle}</span>
              </div>
            ) : (
              title
            )}
          </h1>
          <div className="hidden md:block text-xs text-slate-400">{timeFromLastRefresh}</div>
        </div>
        
        {/* Bouton d'actualisation */}
        <button 
          className={`ml-4 p-1.5 rounded-full transition-all duration-300 ${
            isDarkTheme
              ? 'bg-slate-800/80 text-slate-300 hover:bg-indigo-900/50 hover:text-indigo-300'
              : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600'
          } ${isRefreshing ? 'animate-spin' : ''}`}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Partie droite - Actions et profil */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Champ de recherche - visible uniquement en mode recherche */}
        {isSearchVisible && (
          <div className={`absolute top-full left-0 right-0 p-3 ${
            isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          } border-b shadow-lg slide-in-down`}>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher des services, problèmes, ou zones..."
                className={`w-full pl-10 pr-10 py-2 rounded-lg ${
                  isDarkTheme 
                    ? 'bg-slate-700 text-white border-slate-600 focus:border-indigo-500' 
                    : 'bg-slate-100 text-slate-900 border-slate-300 focus:border-indigo-500'
                } border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all`}
                autoFocus
              />
              <button 
                className={`absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200`}
                onClick={toggleSearch}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      
        {/* Bouton de recherche */}
        <button 
          className={`p-2 rounded-full transition-all duration-300 ${
            isDarkTheme
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
          }`}
          onClick={toggleSearch}
        >
          <Search size={18} />
        </button>
        
        {/* Bouton de téléchargement/export */}
        <button 
          className={`hidden sm:block p-2 rounded-full transition-all duration-300 ${
            isDarkTheme
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
          }`}
        >
          <DownloadCloud size={18} />
        </button>
        
        {/* Bouton de notifications avec badge */}
        <div className="relative">
          <button 
            className={`p-2 rounded-full transition-all duration-300 ${
              isDarkTheme
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bell size={18} />
            {notificationCount > 0 && (
              <span className={`absolute top-0.5 right-1 w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold ${
                isDarkTheme ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {notificationCount}
              </span>
            )}
          </button>
        </div>
        
        {/* Bouton d'aide */}
        <button 
          className={`hidden sm:block p-2 rounded-full transition-all duration-300 ${
            isDarkTheme
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
          }`}
        >
          <HelpCircle size={18} />
        </button>
        
        {/* Séparateur */}
        <div className={`hidden sm:block h-6 w-px mx-1 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
        
        {/* Bouton pour changer de thème */}
        <button 
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-all duration-300 ${
            isDarkTheme ? 'text-amber-300 hover:bg-slate-800' : 'text-indigo-600 hover:bg-slate-100'
          }`}
        >
          {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        {/* Beta feedback badge */}
        <a
          href="mailto:Rayane.Bennasr@externe.bnpparibas.com"
          className={`hidden sm:flex items-center text-xs px-3 py-1.5 rounded-full transition-all duration-300 ${
            isDarkTheme
              ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/70 hover:shadow-sm hover:shadow-blue-900/20'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:shadow-sm'
          }`}
        >
          <span className="font-bold mr-1.5">BETA</span>
          <span className={isDarkTheme ? 'text-blue-400' : 'text-blue-600'}>Envoyer un feedback</span>
        </a>
        
        {/* Profil utilisateur avec indication de rôle */}
        <div className="hidden md:flex items-center ml-2">
          <div className={`w-8 h-8 rounded-full overflow-hidden border-2 ${
            isDarkTheme ? 'border-indigo-600' : 'border-indigo-500'
          }`}>
            <div className={`w-full h-full flex items-center justify-center ${
              isDarkTheme ? 'bg-indigo-900' : 'bg-indigo-100'
            }`}>
              <User size={16} className={isDarkTheme ? 'text-indigo-300' : 'text-indigo-700'} />
            </div>
          </div>
          <div className="ml-2 hidden lg:block">
            <div className="text-sm font-medium">Utilisateur</div>
            <div className="text-xs text-slate-400">Administrateur</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;