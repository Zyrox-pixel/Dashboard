import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { isDarkTheme } = useTheme();

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
        {/* Beta feedback badge */}
        <a
          href="mailto:Rayane.Bennasr@externe.bnpparibas.com"
          className={`flex items-center text-xs px-3 py-1.5 rounded-full transition-all duration-300 ${
            isDarkTheme
              ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/70'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
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