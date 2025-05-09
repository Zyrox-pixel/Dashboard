import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import './styles/animations.css'; // Import des animations personnalisées
import './App.css'; // Import des styles spécifiques pour les composants
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);