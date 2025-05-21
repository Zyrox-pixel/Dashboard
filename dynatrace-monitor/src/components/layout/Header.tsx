import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { isDarkTheme } = useTheme();

  return (
    <header className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 ${
      isDarkTheme
        ? 'bg-slate-900/80 border-slate-700/50'
        : 'bg-white/90 border-slate-200/70'
    } border-b shadow-sm backdrop-blur-md transition-all duration-300`}>
      {/* Partie gauche - Titre simplifié */}
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
        </div>
      </div>

      {/* Partie droite - uniquement BETA feedback */}
      <div className="flex items-center">
        {/* Beta feedback badge */}
        <a
          href="mailto:Rayane.Bennasr@externe.bnpparibas.com"
          className={`flex items-center text-xs px-3 py-1.5 rounded-full transition-all duration-300 ${
            isDarkTheme
              ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/70 hover:shadow-sm hover:shadow-blue-900/20'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:shadow-sm'
          }`}
        >
          <span className="font-bold mr-1.5">BETA</span>
          <span className={isDarkTheme ? 'text-blue-400' : 'text-blue-600'}>Envoyer un feedback</span>
        </a>
      </div>
    </header>
  );
};

export default Header;