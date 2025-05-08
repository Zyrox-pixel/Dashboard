import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Server, 
  Activity, 
  Clock,
  Settings,
  BarChart3,
  ShieldCheck,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface ModernSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

/**
 * Sidebar modernisée avec design amélioré et nouvelles fonctionnalités
 */
const ModernSidebar: React.FC<ModernSidebarProps> = ({ 
  collapsed = false,
  onToggle 
}) => {
  const location = useLocation();
  const { activeProblems } = useApp();
  
  // Déterminer si un lien est actif
  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };
  
  // Classes pour les liens
  const getLinkClasses = (path: string) => {
    const active = isActive(path);
    return `
      flex items-center gap-3 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200
      ${active 
        ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500' 
        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'}
      ${collapsed ? 'justify-center' : ''}
    `;
  };
  
  return (
    <aside className={`h-screen bg-slate-900 border-r border-slate-800 fixed top-0 left-0 z-20 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">DT</span>
            </div>
            <span className="text-lg font-bold text-white">Dynatrace</span>
          </Link>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg mx-auto">
            <span className="text-white font-bold text-sm">DT</span>
          </div>
        )}
        
        {/* Bouton de toggle */}
        {onToggle && (
          <button 
            onClick={onToggle}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="py-6 px-2">
        <ul className="space-y-1">
          {/* Section principale */}
          <li>
            <Link to="/dashboard/vfg" className={getLinkClasses('/dashboard/vfg')}>
              <LayoutDashboard size={20} />
              {!collapsed && <span>Dashboard VFG</span>}
            </Link>
          </li>
          <li>
            <Link to="/dashboard/vfe" className={getLinkClasses('/dashboard/vfe')}>
              <BarChart3 size={20} />
              {!collapsed && <span>Dashboard VFE</span>}
            </Link>
          </li>
          <li>
            <Link to="/problems/unified" className={getLinkClasses('/problems')}>
              <div className="relative">
                <AlertTriangle size={20} />
                {activeProblems.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {activeProblems.length > 9 ? '9+' : activeProblems.length}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Problèmes</span>
                  {activeProblems.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 text-xs border border-red-700/30">
                      {activeProblems.length}
                    </span>
                  )}
                </div>
              )}
            </Link>
          </li>
          
          {/* Séparateur */}
          <li className="my-4">
            <div className={`h-px bg-slate-800 ${!collapsed ? 'mx-3' : 'mx-auto w-8'}`}></div>
            {!collapsed && <span className="text-xs text-slate-600 px-3 mt-3 block">RESSOURCES</span>}
          </li>
          
          {/* Ressources */}
          <li>
            <Link to="/hosts" className={getLinkClasses('/hosts')}>
              <Server size={20} />
              {!collapsed && <span>Hosts</span>}
            </Link>
          </li>
          <li>
            <Link to="/services" className={getLinkClasses('/services')}>
              <Activity size={20} />
              {!collapsed && <span>Services</span>}
            </Link>
          </li>
          <li>
            <Link to="/processes" className={getLinkClasses('/processes')}>
              <ShieldCheck size={20} />
              {!collapsed && <span>Process Groups</span>}
            </Link>
          </li>
          
          {/* Séparateur */}
          <li className="my-4">
            <div className={`h-px bg-slate-800 ${!collapsed ? 'mx-3' : 'mx-auto w-8'}`}></div>
            {!collapsed && <span className="text-xs text-slate-600 px-3 mt-3 block">HISTORIQUE</span>}
          </li>
          
          {/* Historique */}
          <li>
            <Link to="/problems/recent" className={getLinkClasses('/problems/recent')}>
              <Clock size={20} />
              {!collapsed && <span>Problèmes récents (72h)</span>}
            </Link>
          </li>
          
          {/* Profil et paramètres (en bas) */}
          <li className="fixed bottom-8 left-0 right-0 px-2">
            <Link to="/settings" className={getLinkClasses('/settings')}>
              <Settings size={20} />
              {!collapsed && <span>Paramètres</span>}
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default ModernSidebar;