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
      
      <div className="flex items-center">
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
      </div>
    </header>
  );
};

export default Header;