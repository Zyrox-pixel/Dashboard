import React, { ReactNode, useEffect, useState, useRef } from 'react';
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const prevPathRef = useRef(location.pathname);

  // Gérer l'animation de glissement lors du changement de route
  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      // Déterminer la direction du glissement en fonction du chemin
      const currentPath = location.pathname;
      const prevPath = prevPathRef.current;
      
      // Logique pour déterminer la direction
      const pathOrder = ['/overview', '/dashboard/vfg', '/dashboard/vfe', '/dashboard/detection', 
                        '/dashboard/security', '/dashboard/fce-security', '/dashboard/network-filtering', 
                        '/dashboard/identity', '/hosts', '/problems'];
      
      const currentIndex = pathOrder.findIndex(path => currentPath.includes(path));
      const prevIndex = pathOrder.findIndex(path => prevPath.includes(path));
      
      if (currentIndex !== -1 && prevIndex !== -1) {
        setSlideDirection(currentIndex > prevIndex ? 'right' : 'left');
      }
      
      // Déclencher l'animation
      setIsAnimating(true);
      
      // Mettre à jour la référence du chemin précédent
      prevPathRef.current = location.pathname;
      
      // Arrêter l'animation après 500ms
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
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
          <div className={isAnimating ? 'page-transition-container' : ''}>
            <div
              className={`transition-all duration-500 ease-out ${
                isAnimating 
                  ? slideDirection === 'right'
                    ? 'animate-slide-in-right-3d'
                    : 'animate-slide-in-left-3d'
                  : ''
              }`}
            >
              {children}
            </div>
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
              {/* Performance indicator */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isDarkTheme ? 'bg-green-500' : 'bg-green-600'}`}
                />
                <span className="text-[10px]">Système opérationnel</span>
              </div>
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
        
        @keyframes slide-in-right {
          0% {
            transform: translateX(150px) scale(0.95) rotateY(-5deg);
            opacity: 0;
            filter: blur(3px);
          }
          30% {
            transform: translateX(80px) scale(0.97) rotateY(-3deg);
            opacity: 0.3;
            filter: blur(2px);
          }
          60% {
            transform: translateX(30px) scale(0.99) rotateY(-1deg);
            opacity: 0.7;
            filter: blur(1px);
          }
          100% {
            transform: translateX(0) scale(1) rotateY(0);
            opacity: 1;
            filter: blur(0);
          }
        }
        
        @keyframes slide-in-left {
          0% {
            transform: translateX(-150px) scale(0.95) rotateY(5deg);
            opacity: 0;
            filter: blur(3px);
          }
          30% {
            transform: translateX(-80px) scale(0.97) rotateY(3deg);
            opacity: 0.3;
            filter: blur(2px);
          }
          60% {
            transform: translateX(-30px) scale(0.99) rotateY(1deg);
            opacity: 0.7;
            filter: blur(1px);
          }
          100% {
            transform: translateX(0) scale(1) rotateY(0);
            opacity: 1;
            filter: blur(0);
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-origin: center center;
          perspective: 1000px;
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-origin: center center;
          perspective: 1000px;
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
