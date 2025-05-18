import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import UnifiedDashboard from '../pages/UnifiedDashboard';
import { AppProvider } from '../contexts/AppContext';
import { ProblemsProvider } from '../contexts/ProblemsContext';

describe('Dashboard Navigation Bug Fix', () => {
  const MockProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <AppProvider>
        <ProblemsProvider>
          {children}
        </ProblemsProvider>
      </AppProvider>
    );
  };

  test('should reset problems when switching between dashboard tabs', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard/vfg']}>
        <MockProviders>
          <Routes>
            <Route path="/dashboard/:type" element={<UnifiedDashboard />} />
          </Routes>
        </MockProviders>
      </MemoryRouter>
    );

    // Attendre que le premier dashboard soit chargé
    await waitFor(() => {
      expect(screen.getByText(/Vital for Group/i)).toBeInTheDocument();
    });

    // Capturer l'instance du composant DashboardBase
    const firstDashboardKey = screen.getByTestId('dashboard-container').getAttribute('data-key');

    // Naviguer vers VFE
    // Note: Dans un vrai test, nous utiliserions les liens de navigation
    window.history.pushState({}, '', '/dashboard/vfe');
    
    // Attendre que le deuxième dashboard soit chargé
    await waitFor(() => {
      expect(screen.getByText(/Vital for Entreprise/i)).toBeInTheDocument();
    });

    // Vérifier que le composant a été recréé avec une nouvelle clé
    const secondDashboardKey = screen.getByTestId('dashboard-container').getAttribute('data-key');
    expect(secondDashboardKey).not.toBe(firstDashboardKey);
  });

  test('problems should be filtered correctly by dashboard variant', async () => {
    // Mock des problèmes avec différentes zones
    const mockProblems = [
      { id: '1', zone: 'VFG_Zone_1', title: 'VFG Problem' },
      { id: '2', zone: 'VFE_Zone_1', title: 'VFE Problem' },
      { id: '3', zone: 'Detection_Zone_1', title: 'Detection Problem' },
    ];

    // Rendu du dashboard VFG
    render(
      <MemoryRouter initialEntries={['/dashboard/vfg']}>
        <MockProviders>
          <Routes>
            <Route path="/dashboard/:type" element={<UnifiedDashboard />} />
          </Routes>
        </MockProviders>
      </MemoryRouter>
    );

    // Les problèmes VFG doivent être visibles
    await waitFor(() => {
      expect(screen.queryByText('VFG Problem')).toBeInTheDocument();
      expect(screen.queryByText('VFE Problem')).not.toBeInTheDocument();
      expect(screen.queryByText('Detection Problem')).not.toBeInTheDocument();
    });
  });
});