import React, { useState, useEffect } from 'react';
import ModernHeader from './ModernHeader';
import ModernSidebar from './ModernSidebar';
import { useApp } from '../../contexts/AppContext';

interface ModernLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Layout modernisé avec design amélioré, animations et nouvelles fonctionnalités
 */
const ModernLayout: React.FC<ModernLayoutProps> = ({ 
  children, 
  title, 
  subtitle 
}) => {
  const { refreshData, isLoading } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Préférence de sidebar depuis localStorage
  useEffect(() => {
    const storedPreference = localStorage.getItem('sidebar-collapsed');
    if (storedPreference !== null) {
      setSidebarCollapsed(storedPreference === 'true');
    } else {
      // Par défaut, collapsé sur mobile, étendu sur desktop
      setSidebarCollapsed(window.innerWidth < 768);
    }
  }, []);
  
  // Sauvegarder préférence
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', newState.toString());
  };
  
  // Handler de rafraîchissement avec animation
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement', error);
    } finally {
      // Garantir une animation minimale même si le rafraîchissement est rapide
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };
  
  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <ModernSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar} 
      />
      
      {/* Main content */}
      <div 
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        } flex flex-col`}
      >
        {/* Header */}
        <ModernHeader 
          title={title} 
          subtitle={subtitle} 
          onRefresh={handleRefresh}
          isLoading={isRefreshing || isLoading.dashboardData}
        />
        
        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {/* Page transition animation */}
          <div className="animate-fade-in-up max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-slate-900 border-t border-slate-800 py-3 px-6 text-center text-xs text-slate-500">
          <p>Dynatrace Dashboard &copy; {new Date().getFullYear()} - Version 2.0.0</p>
        </footer>
      </div>
    </div>
  );
};

// Animation nécessaire pour la transition des pages
const keyframes = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const style = document.createElement('style');
style.innerHTML = keyframes;
document.head.appendChild(style);

// Ajouter la classe d'animation au tailwind
if (typeof window !== 'undefined') {
  const originalStyles = window.getComputedStyle(document.documentElement);
  const originalContent = originalStyles.getPropertyValue('content') || '';
  
  document.documentElement.style.setProperty(
    'content', 
    originalContent + ' .animate-fade-in-up{animation:fadeInUp 0.3s ease-out forwards;}'
  );
}

export default ModernLayout;