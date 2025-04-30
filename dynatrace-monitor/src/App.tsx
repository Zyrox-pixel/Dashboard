import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import Dashboard from './pages/Dashboard';
import EntrepriseDashboard from './pages/EntrepriseDashboard';
import OptimizedDashboard from './pages/OptimizedDashboard';
import OptimizedEntrepriseDashboard from './pages/OptimizedEntrepriseDashboard';

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
            <AppProvider optimized={true}>
              <OptimizedDashboard />
            </AppProvider>
          } />
          <Route path="/vfg-optimized" element={
            <AppProvider optimized={true}>
              <OptimizedDashboard />
            </AppProvider>
          } />
          <Route path="/vfe-optimized" element={
            <AppProvider optimized={true}>
              <OptimizedEntrepriseDashboard />
            </AppProvider>
          } />
          
          {/* Redirection des routes non trouvées vers la page d'accueil */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;