import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider } from './contexts/AppContext';
import { ProblemsProvider } from './contexts/ProblemsContext';
import { useZoneStatusPreloader } from './hooks/useZoneStatusPreloader';
import { Shield } from 'lucide-react';
import AppWithLayout from './AppWithLayout';

// Composant de splash screen premium
const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      {/* Overlay avec motif */}
      <div className="absolute inset-0 bg-dots-pattern opacity-10"></div>
      
      {/* Gradient subtil autour du logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-slow"></div>
      
      <div className="flex flex-col items-center relative z-10">
        {/* Logo avec animation de pulsation */}
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl animate-pulse-slow"
               style={{ transform: 'scale(1.5)' }}></div>
          <div className="relative p-5 rounded-full bg-gradient-to-br from-indigo-900/80 to-indigo-800/50 border border-indigo-700/50 shadow-lg shadow-indigo-900/50 animate-float">
            <Shield className="text-indigo-400 w-12 h-12" />
          </div>
        </div>
        
        {/* Nom de l'application avec animation de texte */}
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-500 mb-2">
          PRODSEC Monitor
        </h1>
        
        <div className="text-base text-slate-400 mb-8">SEC06 | BNP Paribas</div>
        
        {/* Indicateur de chargement */}
        <div className="flex items-center gap-2">
          <div className="loader">
            <div className="loader-inner"></div>
          </div>
          <span className="text-sm text-slate-400 animate-pulse">Chargement des données...</span>
        </div>
      </div>
      
      {/* Pied de page subtil */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} BNP Paribas • v1.0.0
      </div>
      
      {/* Style pour l'animation du loader */}
      <style>{`
        .loader {
          width: 24px;
          height: 24px;
          position: relative;
        }
        
        .loader:after,
        .loader:before {
          content: '';
          position: absolute;
          border-radius: 50%;
          animation: loader 2s linear infinite;
        }
        
        .loader:after {
          width: 100%;
          height: 100%;
          border: 2px solid transparent;
          border-top-color: rgba(99, 102, 241, 1);
          border-right-color: rgba(99, 102, 241, 0.3);
          border-bottom-color: rgba(99, 102, 241, 0.1);
          top: 0;
          left: 0;
        }
        
        .loader:before {
          width: 80%;
          height: 80%;
          border: 2px solid transparent;
          border-top-color: rgba(59, 130, 246, 1);
          border-right-color: rgba(59, 130, 246, 0.3);
          border-bottom-color: rgba(59, 130, 246, 0.1);
          top: 10%;
          left: 10%;
          animation-duration: 1.5s;
          animation-direction: reverse;
        }
        
        @keyframes loader {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Composant pour précharger les statuts des zones dès le démarrage de l'application
const ZoneStatusPreloader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preloadZoneStatuses } = useZoneStatusPreloader();
  const [isLoading, setIsLoading] = useState(true);
  
  // Précharger les statuts des zones dès le montage du composant
  useEffect(() => {
    // Exécuter le préchargement immédiatement au démarrage
    console.log('Préchargement global des statuts de zones');
    
    const loadData = async () => {
      await preloadZoneStatuses(false);
      
      // Simuler un temps de chargement minimum pour une meilleure expérience utilisateur
      // (évite un flash trop rapide de l'écran de chargement)
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    };
    
    loadData();
  }, [preloadZoneStatuses]);
  
  // Afficher un splash screen pendant le chargement
  if (isLoading) {
    return <SplashScreen />;
  }
  
  return (
    <>{children}</>
  );
};

// Structure principale de l'application
function App() {
  // Effet pour définir des styles globaux
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <ThemeProvider>
      <AppProvider>
        <ProblemsProvider>
          <ZoneStatusPreloader>
            <Router>
              <AppWithLayout />
            </Router>
          </ZoneStatusPreloader>
        </ProblemsProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
