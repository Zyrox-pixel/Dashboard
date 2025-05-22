import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import UnifiedDashboard from './pages/UnifiedDashboard';
import UnifiedProblemsPage from './pages/UnifiedProblemsPage';
import OverviewDashboard from './pages/OverviewDashboard';
import HostsPage from './pages/HostsPage';

// Wrapper pour les pages sans Layout (pour éviter le double Layout)
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Composant qui englobe toutes les routes avec un Layout persistant
const AppWithLayout: React.FC = () => {
  return (
    <Layout title="" subtitle="">
      <Routes>
        {/* Route par défaut - Redirige vers la vue d'ensemble */}
        <Route path="/" element={<Navigate to="/overview" replace />} />

        {/* Route pour la page d'aperçu global */}
        <Route path="/overview" element={<PageWrapper><OverviewDashboard /></PageWrapper>} />
      
        {/* Routes vers le tableau de bord unifié */}
        <Route path="/dashboard/:type" element={<PageWrapper><UnifiedDashboard /></PageWrapper>} />
        <Route path="/dashboard/:type/:optimized" element={<PageWrapper><UnifiedDashboard /></PageWrapper>} />
        
        {/* Page des problèmes unifiée */}
        <Route path="/problems/unified" element={<PageWrapper><UnifiedProblemsPage /></PageWrapper>} />
        <Route path="/problems/active" element={<PageWrapper><UnifiedProblemsPage /></PageWrapper>} />
        <Route path="/problems/recent" element={<PageWrapper><UnifiedProblemsPage /></PageWrapper>} />
        
        {/* Routes pour les applications */}
        <Route path="/vfg" element={<Navigate to="/dashboard/vfg" replace />} />
        <Route path="/vfe" element={<Navigate to="/dashboard/vfe" replace />} />
        <Route path="/detection" element={<Navigate to="/dashboard/detection" replace />} />
        <Route path="/security" element={<Navigate to="/dashboard/security" replace />} />
        <Route path="/fce-security" element={<Navigate to="/dashboard/fce-security" replace />} />
        <Route path="/network-filtering" element={<Navigate to="/dashboard/network-filtering" replace />} />
        <Route path="/identity" element={<Navigate to="/dashboard/identity" replace />} />
        
        {/* Routes pour les versions optimisées */}
        <Route path="/optimized" element={<Navigate to="/dashboard/vfg/true" replace />} />
        <Route path="/vfg-optimized" element={<Navigate to="/dashboard/vfg/true" replace />} />
        <Route path="/vfe-optimized" element={<Navigate to="/dashboard/vfe/true" replace />} />
        <Route path="/detection-optimized" element={<Navigate to="/dashboard/detection/true" replace />} />
        <Route path="/security-optimized" element={<Navigate to="/dashboard/security/true" replace />} />
        <Route path="/fce-security-optimized" element={<Navigate to="/dashboard/fce-security/true" replace />} />
        <Route path="/network-filtering-optimized" element={<Navigate to="/dashboard/network-filtering/true" replace />} />
        <Route path="/identity-optimized" element={<Navigate to="/dashboard/identity/true" replace />} />
        
        {/* Routes supplémentaires pour la compatibilité */}
        <Route path="/problems" element={<Navigate to="/problems/unified" replace />} />
        <Route path="/hosts" element={<PageWrapper><HostsPage /></PageWrapper>} />
        <Route path="/services" element={<Navigate to="/dashboard/vfg" replace />} />
        <Route path="/other" element={<Navigate to="/overview" replace />} />
        
        {/* Redirection des routes non trouvées vers la page d'accueil */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default AppWithLayout;