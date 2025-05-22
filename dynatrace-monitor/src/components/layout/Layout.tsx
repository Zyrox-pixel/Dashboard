import React, { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AnimatedBackground from '../common/AnimatedBackground';
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
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false); // Commence sans transition

  // Effet de transition doux lors du changement de route
  useEffect(() => {
    // Déclencher l'animation seulement si ce n'est pas le premier chargement
    setIsTransitioning(true);
    
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

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
    <div 
      className={`flex min-h-screen ${
        isDarkTheme 
          ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white' 
          : 'bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900'
      }`}
    >
      {/* Arrière-plan animé spectaculaire */}
      <AnimatedBackground />
      
      <Sidebar />
      
      <main 
        className={`relative z-10 flex-1 transition-all duration-400 ease-out ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header title={title} subtitle={subtitle} />
        
        <div 
          className="max-w-7xl mx-auto px-4 py-5 sm:px-6 md:px-8 overflow-hidden"
        >
          {/* Content container avec animation de glissement */}
          <div
            className={isTransitioning ? 'page-slide' : ''}
          >
            {children}
          </div>
        </div>

        {/* Footer avec informations premium et animations */}
        <footer 
          className={`mt-auto py-6 px-6 backdrop-blur-sm ${
            isDarkTheme 
              ? 'bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-slate-950/90 border-t border-slate-800/50' 
              : 'bg-gradient-to-r from-white/90 via-slate-50/80 to-white/90 border-t border-slate-200/70'
          }`}
        >
          <div 
            className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center"
          >
            <div className="flex items-center space-x-3 mb-4 sm:mb-0">
              <span 
                className={`text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}
              >
                © {new Date().getFullYear()} BNP Paribas - SEC06
              </span>
              <span 
                className={`hidden sm:inline-block h-1 w-1 rounded-full ${isDarkTheme ? 'bg-indigo-500' : 'bg-indigo-400'}`}
              />
              <span 
                className={`text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}
              >
                PRODSEC Dashboard v.1.0.0
              </span>
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isDarkTheme 
                    ? 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50 text-indigo-400 border border-indigo-700/30' 
                    : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-600 border border-indigo-300/50'
                }`}
              >
                ENTERPRISE
              </span>
            </div>

            <div 
              className={`flex items-center space-x-4 text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}
            >
            </div>
          </div>
        </footer>
      </main>

      {/* Style global pour les animations et effets */}
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
        
        @keyframes slide-up-down {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(15px);
          }
          100% {
            transform: translateY(0);
          }
        }
        
        .page-slide {
          animation: slide-up-down 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        
        /* Scrollbar personnalisée */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${isDarkTheme ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.5)'};
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${isDarkTheme ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.3)'};
          border-radius: 4px;
          transition: background 0.3s ease;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${isDarkTheme ? 'rgba(99, 102, 241, 0.7)' : 'rgba(99, 102, 241, 0.5)'};
        }
        
        /* Sélection de texte personnalisée */
        ::selection {
          background: ${isDarkTheme ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'};
          color: ${isDarkTheme ? '#e2e8f0' : '#334155'};
        }
      `}</style>
    </div>
  );
};

export default Layout;
