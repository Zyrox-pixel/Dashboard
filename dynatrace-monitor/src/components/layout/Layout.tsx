import React, { ReactNode, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title, subtitle }) => {
  const { sidebarCollapsed } = useApp();
  const { isDarkTheme } = useTheme();

  // Dynamically apply body styles based on theme
  useEffect(() => {
    document.body.style.overflowX = 'hidden';
    document.body.className = isDarkTheme 
      ? 'bg-slate-950 text-slate-200 font-sans antialiased'
      : 'bg-slate-50 text-slate-800 font-sans antialiased';
    
    return () => {
      document.body.style.overflowX = '';
      document.body.className = '';
    };
  }, [isDarkTheme]);
  
  return (
    <div className={`flex min-h-screen ${
      isDarkTheme 
        ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white' 
        : 'bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900'
    }`}>
      {/* Background pattern overlay for premium feel */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={`absolute inset-0 ${isDarkTheme ? 'bg-dots-pattern opacity-5' : 'bg-dots-pattern opacity-20'}`}></div>
        {/* Subtle gradient overlay at the top of the screen */}
        <div className={`absolute top-0 left-0 right-0 h-64 ${
            isDarkTheme 
              ? 'bg-gradient-to-b from-indigo-900/10 to-transparent' 
              : 'bg-gradient-to-b from-indigo-100/20 to-transparent'
          }`}></div>
        {/* Subtle gradient overlay at the bottom of the screen */}
        <div className={`absolute bottom-0 left-0 right-0 h-64 ${
            isDarkTheme 
              ? 'bg-gradient-to-t from-slate-950/80 to-transparent' 
              : 'bg-gradient-to-t from-slate-100/50 to-transparent'
          }`}></div>
      </div>
      
      <Sidebar />
      
      <main className={`relative z-10 flex-1 transition-all duration-400 ease-out ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <Header title={title} subtitle={subtitle} />
        
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 md:px-8">
          {/* Content container with premium subtle animation */}
          <div className="animate-fade-in-up">
            {children}
          </div>
        </div>

        {/* Footer avec informations premium */}
        <footer className={`mt-auto py-6 px-6 ${
          isDarkTheme 
            ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800/40' 
            : 'bg-gradient-to-r from-white via-slate-50 to-white border-t border-slate-200/70'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <span className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                © {new Date().getFullYear()} BNP Paribas - SEC06
              </span>
              <span className={`hidden sm:inline-block h-1 w-1 rounded-full ${isDarkTheme ? 'bg-slate-600' : 'bg-slate-300'}`}></span>
              <span className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                PRODSEC Dashboard v.1.0.0
              </span>
            </div>

            <div className={`flex items-center space-x-4 text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
              {/* Liens supprimés selon demande utilisateur */}
            </div>
          </div>
        </footer>
      </main>

      {/* Style global pour les animations */}
      <style>{`
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Layout;
