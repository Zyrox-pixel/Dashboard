import React from 'react';
import { RefreshCw, Search, Moon, Sun } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { refreshData } = useApp();
  const { isDarkTheme, toggleTheme } = useTheme();

  return (
    <header className={`h-14 px-6 flex items-center justify-between sticky top-0 z-20 ${
      isDarkTheme 
        ? 'bg-slate-800/90 border-slate-700' 
        : 'bg-white/90 border-slate-200'
    } border-b shadow-sm backdrop-blur-sm`}>
      <h1 className="font-semibold text-lg">
        {subtitle ? (
          <div className="flex items-center gap-2">
            <span>{title}</span>
            <span className="text-slate-400">/</span>
            <span className="text-red-400">{subtitle}</span>
          </div>
        ) : (
          title
        )}
      </h1>
      
      <div className="relative max-w-md w-full mx-4">
        <input 
          type="text" 
          className={`w-full h-9 pl-9 pr-4 rounded-full ${
            isDarkTheme 
              ? 'bg-slate-700/50 border-slate-600 text-white' 
              : 'bg-slate-100 border-slate-200 text-slate-900'
          } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50`} 
          placeholder="Rechercher..." 
        />
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
          isDarkTheme ? 'text-slate-400' : 'text-slate-500'
        }`} size={14} />
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={() => refreshData()}
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            isDarkTheme 
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`} 
          title="Rafraîchir les données"
        >
          <RefreshCw size={14} />
        </button>
        
        <button 
          onClick={toggleTheme}
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            isDarkTheme 
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`} 
          title="Changer de thème"
        >
          {isDarkTheme ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer ${
          isDarkTheme 
            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
            isDarkTheme 
              ? 'bg-indigo-900/30 text-indigo-400' 
              : 'bg-indigo-100 text-indigo-700'
          } font-semibold`}>
            A
          </div>
          <span className="text-sm font-medium">Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Header;