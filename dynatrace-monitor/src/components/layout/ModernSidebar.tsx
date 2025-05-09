import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Home,
  Zap,
  Database,
  Network,
  Layers,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface ModernSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

/**
 * Sidebar futuriste avec design immersif, effets 3D et animations
 */
const ModernSidebar: React.FC<ModernSidebarProps> = ({ 
  collapsed = false,
  onToggle 
}) => {
  const location = useLocation();
  const { activeProblems } = useApp();
  
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Fonction vide pour remplacer l'effet sonore
  const playButtonSound = () => {
    // Ne fait rien - suppression des effets sonores
  };

  // Gestion des effets de transition lors du toggle
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);
  
  // Déterminer si un lien est actif
  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };
  
  // Classes pour les liens
  const getLinkClasses = (path: string) => {
    const active = isActive(path);
    const isHovered = hoveredItem === path;
    
    return `
      relative flex items-center gap-3 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300
      ${active 
        ? 'text-white bg-indigo-600/20 border-l-2 border-indigo-500' 
        : 'text-indigo-300 hover:text-white hover:bg-indigo-800/30 border-l-2 border-transparent'}
      ${collapsed ? 'justify-center' : ''}
      ${isHovered ? 'transform scale-105' : ''}
    `;
  };

  // Structure des sections et éléments de menu
  const menuSections = [
    {
      id: 'main',
      title: 'PRINCIPAL',
      items: [
        {
          path: '/overview',
          icon: <Home size={20} />,
          label: 'Vue d\'ensemble',
          badge: null
        },
        {
          path: '/dashboard/vfg',
          icon: <BarChart3 size={20} />,
          label: 'Dashboard VFG',
          badge: null
        },
        {
          path: '/dashboard/vfe',
          icon: <BarChart3 size={20} />,
          label: 'Dashboard VFE',
          badge: null
        },
        {
          path: '/problems',
          icon: <AlertTriangle size={20} />,
          label: 'Problèmes',
          badge: activeProblems.length || null
        }
      ]
    },
    {
      id: 'resources',
      title: 'RESSOURCES',
      items: [
        {
          path: '/hosts',
          icon: <Server size={20} />,
          label: 'Hosts',
          badge: null
        },
        {
          path: '/services',
          icon: <Activity size={20} />,
          label: 'Services',
          badge: null
        },
        {
          path: '/processes',
          icon: <ShieldCheck size={20} />,
          label: 'Process Groups',
          badge: null
        },
        {
          path: '/network',
          icon: <Network size={20} />,
          label: 'Réseau',
          badge: null
        }
      ]
    },
    {
      id: 'analytics',
      title: 'ANALYTIQUES',
      items: [
        {
          path: '/problems/recent',
          icon: <Clock size={20} />,
          label: 'Historique (72h)',
          badge: null
        },
        {
          path: '/metrics',
          icon: <Sparkles size={20} />,
          label: 'Métriques avancées',
          badge: null
        },
        {
          path: '/capacity',
          icon: <Layers size={20} />,
          label: 'Capacité système',
          badge: null
        }
      ]
    }
  ];
  
  return (
    <aside 
      className={`h-screen bg-[#0d0d23] border-r border-indigo-900/30 fixed top-0 left-0 z-20 transition-all duration-500 
        ${collapsed ? 'w-20' : 'w-72'} 
        ${isAnimating ? 'menu-animating' : ''}`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-[72px] px-5 border-b border-indigo-900/30">
        {!collapsed ? (
          <Link 
            to="/" 
            className="flex items-center gap-3 transition-all duration-300 transform hover:scale-105"
            onMouseEnter={() => playButtonSound()}
          >
            <div className="h-10 w-10 relative group">
              {/* Effet d'arrière-plan animé */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-600 animate-gradient-shift"></div>
              
              {/* Effet de lueur */}
              <div className="absolute inset-0 rounded-xl blur-md bg-indigo-500/50 group-hover:bg-indigo-500/70 transition-all duration-500 animate-pulse-cosmic"></div>
              
              {/* Logo principal */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg border border-indigo-500/30 backdrop-blur-md">
                <Zap className="text-white w-5 h-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white">Dynatrace</span>
              <span className="text-xs text-indigo-400">Moniteur Avancé</span>
            </div>
          </Link>
        ) : (
          <div className="h-10 w-10 relative mx-auto">
            {/* Effet d'arrière-plan animé */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-600 animate-gradient-shift"></div>
            
            {/* Effet de lueur */}
            <div className="absolute inset-0 rounded-xl blur-md bg-indigo-500/50 transition-all duration-500 animate-pulse-cosmic"></div>
            
            {/* Logo principal */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg border border-indigo-500/30 backdrop-blur-md">
              <Zap className="text-white w-5 h-5" />
            </div>
          </div>
        )}
        
        {/* Bouton de toggle */}
        {onToggle && (
          <button 
            onClick={() => {
              onToggle();
              setIsAnimating(true);
              playButtonSound();
            }}
            className="text-indigo-400 hover:text-indigo-300 w-8 h-8 flex items-center justify-center rounded-lg border border-indigo-800/30 bg-indigo-900/20 hover:bg-indigo-800/30 transition-all duration-300"
            aria-label={collapsed ? "Étendre le menu" : "Réduire le menu"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>
      
      {/* Navigation - Corps du menu */}
      <div className={`py-5 px-3 h-[calc(100vh-72px)] flex flex-col overflow-hidden ${collapsed ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
        {menuSections.map((section) => (
          <div key={section.id} className="mb-6">
            {/* Titre de section - visible uniquement en mode étendu */}
            {!collapsed && (
              <div className="flex items-center px-4 mb-2">
                <div className="h-px flex-grow bg-indigo-900/50"></div>
                <span className="text-xs text-indigo-500 font-medium mx-2">{section.title}</span>
                <div className="h-px flex-grow bg-indigo-900/50"></div>
              </div>
            )}
            
            {/* Séparation en mode réduit */}
            {collapsed && section.id !== 'main' && (
              <div className="h-px bg-indigo-900/50 w-10 mx-auto my-4"></div>
            )}
            
            {/* Items de menu */}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={getLinkClasses(item.path)}
                    onMouseEnter={() => {
                      setHoveredItem(item.path);
                      playButtonSound();
                    }}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {/* Conteneur de l'icône avec effets */}
                    <div className={`relative ${isActive(item.path) ? 'text-indigo-400' : 'text-indigo-400'}`}>
                      {/* Indicateur de badge */}
                      {item.badge && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-white text-xs flex items-center justify-center border border-red-900/30 shadow-lg animate-pulse-cosmic">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                      
                      {/* Effet de halo pour les items actifs ou survolés */}
                      {(isActive(item.path) || hoveredItem === item.path) && (
                        <span className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full -z-10"></span>
                      )}
                      
                      {item.icon}
                    </div>
                    
                    {/* Label - uniquement visible en mode étendu */}
                    {!collapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span className={`${isActive(item.path) ? 'text-white' : ''} transition-all duration-300`}>
                          {item.label}
                        </span>
                        
                        {/* Badge pour les problèmes actifs */}
                        {item.badge && item.badge > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 text-xs border border-red-800/30 min-w-[24px] text-center">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Effet de lueur pour les items actifs */}
                    {isActive(item.path) && !collapsed && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-full bg-indigo-500 opacity-70 glow-effect"></div>
                    )}
                    
                    {/* Tooltip pour mode réduit */}
                    {collapsed && (
                      <div className={`absolute left-full ml-3 rounded-lg py-1.5 px-3 bg-[#191a3a]/95 backdrop-blur-xl border border-indigo-800/30 shadow-xl 
                        whitespace-nowrap z-50 flex items-center gap-2 text-white text-sm
                        transition-all duration-300 
                        ${hoveredItem === item.path ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}
                      >
                        {item.label}
                        {item.badge && item.badge > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-300 text-xs border border-red-800/30 min-w-[20px] text-center">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        
        {/* Profil et paramètres (en bas) */}
        <div className="mt-auto px-2">
          <Link
            to="/settings"
            className={getLinkClasses('/settings')}
            onMouseEnter={() => {
              setHoveredItem('/settings');
              playButtonSound();
            }}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="relative text-indigo-400">
              <Settings size={20} />
            </div>
            {!collapsed && <span>Paramètres</span>}
            
            {/* Tooltip pour mode réduit */}
            {collapsed && (
              <div className={`absolute left-full ml-3 rounded-lg py-1.5 px-3 bg-[#191a3a]/95 backdrop-blur-xl border border-indigo-800/30 shadow-xl 
                whitespace-nowrap z-50 flex items-center gap-2 text-white text-sm
                transition-all duration-300 
                ${hoveredItem === '/settings' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}
              >
                Paramètres
              </div>
            )}
          </Link>
          
          {/* Profil utilisateur - uniquement en mode étendu */}
          {!collapsed && (
            <div className="flex items-center gap-3 mt-3 px-4 pt-3 border-t border-indigo-900/30">
              <div className="relative h-10 w-10 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-600 animate-gradient-shift"></div>
                <div className="absolute inset-0 flex items-center justify-center text-white font-medium shadow-inner">
                  AP
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">Admin</span>
                <span className="text-xs text-indigo-400">administrateur</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Les styles pour les animations avancées ont été déplacés dans animations.css */}
    </aside>
  );
};

export default ModernSidebar;