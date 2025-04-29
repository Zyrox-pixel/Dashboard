import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { OptimizedAppProvider } from './contexts/OptimizedAppContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import Dashboard from './pages/Dashboard';
import EntrepriseDashboard from './pages/EntrepriseDashboard';
import OptimizedDashboard from './pages/OptimizedDashboard';
import OptimizedEntrepriseDashboard from './pages/OptimizedEntrepriseDashboard';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Routes pour l'application standard */}
          <Route path="/" element={
            <AppProvider>
              <Dashboard />
            </AppProvider>
          } />
          <Route path="/vfg" element={
            <AppProvider>
              <Dashboard />
            </AppProvider>
          } />
          <Route path="/vfe" element={
            <AppProvider>
              <EntrepriseDashboard />
            </AppProvider>
          } />
          <Route path="/problems" element={
            <AppProvider>
              <Dashboard />
            </AppProvider>
          } />
          <Route path="/hosts" element={
            <AppProvider>
              <Dashboard />
            </AppProvider>
          } />
          <Route path="/services" element={
            <AppProvider>
              <Dashboard />
            </AppProvider>
          } />
          
          {/* Routes pour l'application optimisée */}
          <Route path="/optimized" element={
            <OptimizedAppProvider>
              <OptimizedDashboard />
            </OptimizedAppProvider>
          } />
          <Route path="/vfg-optimized" element={
            <OptimizedAppProvider>
              <OptimizedDashboard />
            </OptimizedAppProvider>
          } />
          <Route path="/vfe-optimized" element={
            <OptimizedAppProvider>
              <OptimizedEntrepriseDashboard />
            </OptimizedAppProvider>
          } />
          
          {/* Gestion des routes non trouvées */}
          <Route path="/not-found" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;