import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import UnifiedDashboard from './pages/UnifiedDashboard';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Route par défaut - Redirige vers VFG */}
          <Route path="/" element={<Navigate to="/dashboard/vfg" replace />} />
          
          {/* Routes vers le tableau de bord unifié */}
          <Route path="/dashboard/:type" element={<UnifiedDashboard />} />
          <Route path="/dashboard/:type/:optimized" element={<UnifiedDashboard />} />
          
          {/* Routes de compatibilité avec l'ancienne structure */}
          <Route path="/vfg" element={<Navigate to="/dashboard/vfg" replace />} />
          <Route path="/vfe" element={<Navigate to="/dashboard/vfe" replace />} />
          <Route path="/optimized" element={<Navigate to="/dashboard/vfg/true" replace />} />
          <Route path="/vfg-optimized" element={<Navigate to="/dashboard/vfg/true" replace />} />
          <Route path="/vfe-optimized" element={<Navigate to="/dashboard/vfe/true" replace />} />
          
          {/* Routes supplémentaires pour la compatibilité */}
          <Route path="/problems" element={<Navigate to="/dashboard/vfg" replace />} />
          <Route path="/hosts" element={<Navigate to="/dashboard/vfg" replace />} />
          <Route path="/services" element={<Navigate to="/dashboard/vfg" replace />} />
          
          {/* Redirection des routes non trouvées vers la page d'accueil */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;