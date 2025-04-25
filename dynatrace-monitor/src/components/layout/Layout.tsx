import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title, subtitle }) => {
  const { sidebarCollapsed } = useApp();
  const { isDarkTheme } = useTheme();
  
  return (
    <div className={`flex min-h-screen ${
      isDarkTheme ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'
    }`}>
      <Sidebar />
      
      <main className={`flex-1 transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <Header title={title} subtitle={subtitle} />
        
        <div className="max-w-7xl mx-auto p-5">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;