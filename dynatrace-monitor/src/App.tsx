import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider } from './contexts/AppContext';
import { OptimizedAppProvider } from './contexts/OptimizedAppContext';
import Dashboard from './pages/Dashboard';
import OptimizedDashboard from './pages/OptimizedDashboard';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Dashboard standard */}
          <Route 
            path="/" 
            element={
              <AppProvider>
                <Dashboard />
              </AppProvider>
            } 
          />
          
          {/* Dashboard VFG standard */}
          <Route 
            path="/vfg" 
            element={
              <AppProvider>
                <Dashboard />
              </AppProvider>
            } 
          />
          
          {/* Dashboard optimisé */}
          <Route 
            path="/optimized" 
            element={
              <OptimizedAppProvider>
                <OptimizedDashboard />
              </OptimizedAppProvider>
            } 
          />
          
          {/* Dashboard VFG optimisé */}
          <Route 
            path="/vfg-optimized" 
            element={
              <OptimizedAppProvider>
                <OptimizedDashboard />
              </OptimizedAppProvider>
            } 
          />
          
          {/* Route de fallback vers le dashboard standard */}
          <Route 
            path="*" 
            element={
              <AppProvider>
                <Dashboard />
              </AppProvider>
            } 
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;