import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import UnifiedDashboard from './pages/UnifiedDashboard';
import ActiveProblemsPage from './pages/ActiveProblemsPage';
import RecentProblemsPage from './pages/RecentProblemsPage';
import UnifiedProblemsPage from './pages/UnifiedProblemsPage';
import OverviewDashboard from './pages/OverviewDashboard';
import { AppProvider } from './contexts/AppContext';
import { ProblemsProvider } from './contexts/ProblemsContext';

// L'ancien loader n'est plus nécessaire car OverviewDashboard utilise maintenant le contexte ProblemsProvider

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <ProblemsProvider>
          <Router>
            <Routes>
              {/* Route par défaut - Redirige vers la vue d'ensemble */}
              <Route path="/" element={<Navigate to="/overview" replace />} />

              {/* Route pour la page d'aperçu global */}
              <Route path="/overview" element={<OverviewDashboard />} />
            
            {/* Routes vers le tableau de bord unifié */}
            <Route path="/dashboard/:type" element={<UnifiedDashboard />} />
            <Route path="/dashboard/:type/:optimized" element={<UnifiedDashboard />} />
            
            {/* Nouvelles routes pour les pages de problèmes */}
            <Route path="/problems/active" element={<ActiveProblemsPage />} />
            <Route path="/problems/recent" element={<RecentProblemsPage />} />
            <Route path="/problems/unified" element={<UnifiedProblemsPage />} />
            
            {/* Routes de compatibilité avec l'ancienne structure */}
            <Route path="/vfg" element={<Navigate to="/dashboard/vfg" replace />} />
            <Route path="/vfe" element={<Navigate to="/dashboard/vfe" replace />} />
            <Route path="/optimized" element={<Navigate to="/dashboard/vfg/true" replace />} />
            <Route path="/vfg-optimized" element={<Navigate to="/dashboard/vfg/true" replace />} />
            <Route path="/vfe-optimized" element={<Navigate to="/dashboard/vfe/true" replace />} />
            
            {/* Routes supplémentaires pour la compatibilité */}
            <Route path="/problems" element={<Navigate to="/problems/unified" replace />} />
            <Route path="/hosts" element={<Navigate to="/dashboard/vfg" replace />} />
            <Route path="/services" element={<Navigate to="/dashboard/vfg" replace />} />
            
            {/* Redirection des routes non trouvées vers la page d'accueil */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        </ProblemsProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;