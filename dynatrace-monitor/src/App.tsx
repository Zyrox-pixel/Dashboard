import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import UnifiedDashboard from './pages/UnifiedDashboard';
import UnifiedProblemsPage from './pages/UnifiedProblemsPage';
import OverviewDashboard from './pages/OverviewDashboard';
import HostsPage from './pages/HostsPage';
import { AppProvider } from './contexts/AppContext';
import { ProblemsProvider } from './contexts/ProblemsContext';
import { useZoneStatusPreloader } from './hooks/useZoneStatusPreloader';

// Composant pour précharger les statuts des zones dès le démarrage de l'application
const ZoneStatusPreloader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preloadZoneStatuses } = useZoneStatusPreloader();
  
  // Précharger les statuts des zones dès le montage du composant
  useEffect(() => {
    // Exécuter le préchargement immédiatement au démarrage
    console.log('Préchargement global des statuts de zones');
    preloadZoneStatuses(false);
  }, [preloadZoneStatuses]);
  
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <ProblemsProvider>
          <ZoneStatusPreloader>
            <Router>
              <Routes>
                {/* Route par défaut - Redirige vers la vue d'ensemble */}
                <Route path="/" element={<Navigate to="/overview" replace />} />

                {/* Route pour la page d'aperçu global */}
                <Route path="/overview" element={<OverviewDashboard />} />
              
                {/* Routes vers le tableau de bord unifié */}
                <Route path="/dashboard/:type" element={<UnifiedDashboard />} />
                <Route path="/dashboard/:type/:optimized" element={<UnifiedDashboard />} />
                
                {/* Page des problèmes unifiée */}
                <Route path="/problems/unified" element={<UnifiedProblemsPage />} />
                <Route path="/problems/active" element={<UnifiedProblemsPage />} />
                <Route path="/problems/recent" element={<UnifiedProblemsPage />} />
                
                {/* Routes pour les applications */}
                <Route path="/vfg" element={<Navigate to="/dashboard/vfg" replace />} />
                <Route path="/vfe" element={<Navigate to="/dashboard/vfe" replace />} />
                <Route path="/detection" element={<Navigate to="/dashboard/detection" replace />} />
                <Route path="/security" element={<Navigate to="/dashboard/security" replace />} />
                
                {/* Routes pour les versions optimisées */}
                <Route path="/optimized" element={<Navigate to="/dashboard/vfg/true" replace />} />
                <Route path="/vfg-optimized" element={<Navigate to="/dashboard/vfg/true" replace />} />
                <Route path="/vfe-optimized" element={<Navigate to="/dashboard/vfe/true" replace />} />
                <Route path="/detection-optimized" element={<Navigate to="/dashboard/detection/true" replace />} />
                <Route path="/security-optimized" element={<Navigate to="/dashboard/security/true" replace />} />
                
                {/* Routes supplémentaires pour la compatibilité */}
                <Route path="/problems" element={<Navigate to="/problems/unified" replace />} />
                <Route path="/hosts" element={<HostsPage />} />
                <Route path="/services" element={<Navigate to="/dashboard/vfg" replace />} />
                <Route path="/other" element={<Navigate to="/overview" replace />} />
                
                {/* Redirection des routes non trouvées vers la page d'accueil */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </ZoneStatusPreloader>
        </ProblemsProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
