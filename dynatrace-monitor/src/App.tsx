import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider } from './contexts/AppContext';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vfg" element={<Dashboard />} />
            {/* Ajoutez d'autres routes si nécessaire */}
          </Routes>
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;