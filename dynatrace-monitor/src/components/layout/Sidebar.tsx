import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, Home, AlertTriangle, Star, Award,
  Layers, Shield, Key, Globe, User,
  Sparkles, Lock,
  Shield as ShieldIcon
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusManagement } from '../../hooks/useFocusManagement';

// Définir les types pour les fonctions
type MenuItemKey = 'home' | 'problems' | 'vfg' | 'vfe' | 'detection' | 'security' | 'fce_security' | 'network_filtering' | 'identity' | 'hosts' | 'activity' | 'settings';
type ColorType = 'indigo' | 'amber' | 'red' | 'blue' | 'green' | 'purple' | 'cyan' | 'pink';

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const { isDarkTheme } = useTheme();
  const location = useLocation();
  const { handleNavigationClick, handleNavigationMouseDown } = useFocusManagement();
  const [activeItem, setActiveItem] = useState<MenuItemKey>('home');
  const [hoverItem, setHoverItem] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  
  // Effet de suivi de la souris pour l'effet parallax (optimisé)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarCollapsed) {
        const rect = sidebarRef.current.getBoundingClientRect();
        // Vérifier si la souris est dans la sidebar
        if (e.clientX >= rect.left && e.clientX <= rect.right && 
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          mousePositionRef.current = {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
          };
          
          // Utiliser requestAnimationFrame pour optimiser les performances
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          
          animationFrameRef.current = requestAnimationFrame(() => {
            setMousePosition(mousePositionRef.current);
          });
        }
      }
    };
    
    if (!sidebarCollapsed) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [sidebarCollapsed]);
  
  // Effet pour suivre la page active - se déclenche à chaque changement de route
  useEffect(() => {
    const path = location.pathname;
    console.log('📍 [Sidebar] Changement de route détecté:', path);
    
    let newActiveItem: MenuItemKey;
    
    if (path === '/' || path.startsWith('/overview')) {
      newActiveItem = 'home';
    } else if (path.startsWith('/problems')) {
      newActiveItem = 'problems';
    } else if (path.startsWith('/vfg') || path.startsWith('/dashboard/vfg')) {
      newActiveItem = 'vfg';
    } else if (path.startsWith('/vfe') || path.startsWith('/dashboard/vfe')) {
      newActiveItem = 'vfe';
    } else if (path.startsWith('/detection') || path.startsWith('/dashboard/detection')) {
      newActiveItem = 'detection';
    } else if (path.startsWith('/security') || path.startsWith('/dashboard/security')) {
      newActiveItem = 'security';
    } else if (path.startsWith('/fce-security') || path.startsWith('/dashboard/fce-security')) {
      newActiveItem = 'fce_security';
    } else if (path.startsWith('/network-filtering') || path.startsWith('/dashboard/network-filtering')) {
      newActiveItem = 'network_filtering';
    } else if (path.startsWith('/identity') || path.startsWith('/dashboard/identity')) {
      newActiveItem = 'identity';
    } else if (path.startsWith('/hosts')) {
      newActiveItem = 'hosts';
    } else if (path.startsWith('/settings')) {
      newActiveItem = 'settings';
    } else if (path.startsWith('/activity')) {
      newActiveItem = 'activity';
    } else {
      newActiveItem = 'home'; // Par défaut
    }
    
    setActiveItem(newActiveItem);
    console.log('📍 [Sidebar] Onglet actif mis à jour:', newActiveItem);
  }, [location.pathname]); // Dépendance sur le pathname

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Générer une classe CSS premium pour les éléments de menu
  const getMenuItemClass = (itemKey: MenuItemKey): string => {
    const isActive = activeItem === itemKey;
    
    const baseClasses = `group relative flex items-center gap-3 py-3.5 rounded-xl
                        ${sidebarCollapsed ? 'px-0 justify-center mx-1' : 'px-3.5 mx-3'} 
                        transition-all duration-300`;
    
    // Si l'élément est actif
    if (isActive) {
      return `${baseClasses} ${
        isDarkTheme 
          ? 'bg-gradient-to-r from-indigo-900/80 via-indigo-900/60 to-indigo-800/40 text-white shadow-lg shadow-indigo-900/30 border border-indigo-700/50' 
          : 'bg-gradient-to-r from-indigo-100 via-indigo-50 to-white text-indigo-700 shadow-md shadow-indigo-200/50 border border-indigo-200'
      }`;
    }
    
    // Animation au survol
    return `${baseClasses} ${
      isDarkTheme 
        ? 'text-slate-400 hover:bg-gradient-to-r hover:from-slate-800/70 hover:via-slate-800/50 hover:to-transparent hover:text-white hover:border hover:border-slate-700/30' 
        : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-100 hover:via-slate-50 hover:to-white hover:text-slate-900 hover:border hover:border-slate-200/70'
    }`;
  };
  
  // Animation spéciale pour Vital for Group/Enterprise et Domain
  const getVitalItemClass = (itemKey: MenuItemKey, color: ColorType): string => {
    const isActive = activeItem === itemKey;
    
    // Classes de base avec transitions fluides
    const baseClasses = `group relative flex items-center gap-3 py-3.5 rounded-xl
                        ${sidebarCollapsed ? 'px-0 justify-center mx-1' : 'px-3.5 mx-3'} 
                        transition-all duration-300 ease-out`;
    
    // Si l'élément est actif - style premium avec dégradé enrichi
    if (isActive) {
      return `${baseClasses} ${
        isDarkTheme 
          ? `bg-gradient-to-r from-${color}-900/70 via-${color}-800/50 to-${color}-900/30 text-white shadow-lg shadow-${color}-900/40 border border-${color}-700/50` 
          : `bg-gradient-to-r from-${color}-100 via-${color}-50 to-white text-${color}-700 shadow-md shadow-${color}-300/40 border border-${color}-200/70`
      }`;
    }
    
    // Élément inactif avec effet de lueur au survol
    return `${baseClasses} ${
      isDarkTheme 
        ? `text-${color}-400 hover:bg-gradient-to-r hover:from-${color}-900/30 hover:to-transparent hover:text-${color}-300 hover:shadow-sm hover:border hover:border-${color}-700/30 hover:shadow-${color}-900/20` 
        : `text-${color}-600 hover:bg-gradient-to-r hover:from-${color}-50 hover:to-transparent hover:text-${color}-700 hover:shadow-sm hover:border hover:border-${color}-200/70 hover:shadow-${color}-200/30`
    }`;
  };
  
  // Animation de l'icône
  const getIconClass = (itemKey: MenuItemKey): string => {
    const baseClasses = "flex-shrink-0 transition-transform duration-300";
    return activeItem === itemKey 
      ? `${baseClasses} scale-110 animate-pulse-subtle` 
      : baseClasses;
  };
  
  // Effet de brillance derrière les icônes pour l'effet 3D
  const getIconGlow = (itemKey: MenuItemKey, color: ColorType = 'indigo') => {
    if (!isDarkTheme) return null;
    
    return (
      <div 
        className={`absolute inset-0 w-10 h-10 rounded-full 
                   ${activeItem === itemKey ? `bg-${color}-600/20 animate-pulse-slow` : 'bg-transparent'} 
                   blur-xl transition-opacity duration-500 opacity-70`}
        style={{ left: sidebarCollapsed ? '50%' : '14px', transform: sidebarCollapsed ? 'translateX(-50%)' : 'none' }}
      ></div>
    );
  };
  
  // Composant MenuItem amélioré avec Framer Motion
  const MenuItem = ({ to, itemKey, icon: Icon, label, color = 'indigo', badge, special = false }: {
    to: string;
    itemKey: MenuItemKey;
    icon: any;
    label: string;
    color?: ColorType;
    badge?: string;
    special?: boolean;
  }) => {
    const isActive = activeItem === itemKey;
    const isHovered = hoverItem === itemKey;
    
    return (
      <div className="transition-transform duration-200 hover:translate-x-1">
        <Link
          to={to}
          data-menu-item={itemKey}
          onClick={(e) => {
            setActiveItem(itemKey);
            handleNavigationClick(e);
          }}
          onMouseDown={handleNavigationMouseDown}
          className={special ? getVitalItemClass(itemKey, color) : getMenuItemClass(itemKey)}
          tabIndex={isActive ? 0 : -1}
          onMouseEnter={() => setHoverItem(itemKey)}
          onMouseLeave={() => setHoverItem(null)}
        >
          {/* Effet de lumière animée (simplifié pour éviter le clignotement) */}
          {isActive && (
            <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.2) 0%, transparent 60%)`,
                  opacity: isActive ? 1 : 0
                }}
              />
            </div>
          )}
          
          {/* Glow effect */}
          {getIconGlow(itemKey, color)}
          
          {/* Icône avec animation réduite */}
          <div
            className={`relative flex-shrink-0 ${getIconClass(itemKey)} transition-transform duration-300`}
            style={{
              transform: isActive ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            <Icon
              size={18}
              className={`${
                isDarkTheme ? `text-${color}-400` : `text-${color}-600`
              } ${isActive ? 'animate-pulse-subtle' : ''}`}
            />
            
            {/* Effet de particules pour les éléments actifs */}
            {isActive && special && (
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`absolute w-1 h-1 bg-${color}-400 rounded-full`}
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{
                      x: [0, (i - 1) * 20],
                      y: [0, -10, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.2,
                      repeat: Infinity,
                      repeatDelay: 1
                    }}
                  />
                ))}
              </motion.div>
            )}
          </div>
          
          {/* Label avec transition CSS */}
          {!sidebarCollapsed && (
            <span
              className={`text-sm font-medium whitespace-nowrap transition-all duration-300
                        ${isActive ? 'tracking-wide' : ''}`}
            >
              {label}
            </span>
          )}
          
          {/* Badge simplifié */}
          {badge && (
            <div
              className={`${sidebarCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} 
                        px-1.5 py-0.5 rounded-full text-xs font-semibold transition-all duration-200
                        ${isDarkTheme ? `bg-${color}-900/70 text-${color}-300 border border-${color}-700/30` : `bg-${color}-100 text-${color}-700 border border-${color}-200/70`}`}
            >
              {badge}
            </div>
          )}
          
          {/* Indicateur actif simplifié */}
          {isActive && !sidebarCollapsed && (
            <div
              className={`ml-auto w-1.5 h-5 rounded-full bg-gradient-to-b from-${color}-400 to-${color}-600 transition-all duration-300`}
            />
          )}
        </Link>
      </div>
    );
  };

  return (
    <motion.aside
      ref={sidebarRef}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`fixed h-full z-30 transition-all duration-500 ease-out ${
        isDarkTheme 
          ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-r border-slate-800/40 shadow-xl shadow-black/40' 
          : 'bg-gradient-to-b from-white via-slate-50 to-white border-r border-slate-200/70 shadow-lg shadow-slate-200/30'
      } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Effet de fond statique avec transition douce */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: isDarkTheme
              ? 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)'
              : 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.02) 0%, transparent 50%)'
          }}
        />
        
        {/* Motif de grille futuriste statique */}
        <div 
          className="absolute inset-0 opacity-5" 
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 1px,
              ${isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} 1px,
              ${isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} 2px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 1px,
              ${isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} 1px,
              ${isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} 2px
            )`,
            backgroundSize: '20px 20px'
          }}
        />
      </div>
      {/* En-tête avec logo et bouton de collapse */}
      <motion.div 
        className={`relative h-20 flex items-center px-5 z-10 ${
          isDarkTheme ? 'border-b border-slate-800/50' : 'border-b border-slate-200/70'
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Logo avec effet premium et animation */}
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Effet de halo statique */}
            <div
              className={`absolute inset-0 w-10 h-10 rounded-full ${
                isDarkTheme ? 'bg-indigo-500/20' : 'bg-indigo-400/15'
              } blur-xl`}
            />
            
            {/* Logo principal avec effet 3D */}
            <div
              className={`relative z-10 p-2.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
                isDarkTheme 
                  ? 'bg-gradient-to-br from-indigo-900/90 via-indigo-800/70 to-indigo-900/50 border border-indigo-600/50 shadow-lg shadow-indigo-900/50' 
                  : 'bg-gradient-to-br from-indigo-100 via-white to-indigo-50 border border-indigo-300/70 shadow-md shadow-indigo-200/50'
              }`}
            >
              <ShieldIcon className={`${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} flex-shrink-0`} size={18} />
            </div>
          </motion.div>
          
          {/* Titre avec animation d'apparition améliorée */}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col">
                  <motion.span 
                    className={`font-bold text-base whitespace-nowrap ${
                      isDarkTheme 
                        ? 'bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent' 
                        : 'text-indigo-700'
                    }`}
                    animate={isDarkTheme ? {
                      backgroundPosition: ['0%', '100%', '0%']
                    } : {}}
                    transition={{ duration: 5, repeat: Infinity }}
                    style={{ backgroundSize: '200%' }}
                  >
                    PRODSEC Monitor
                  </motion.span>
                  <span className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                    SEC06 • Enterprise
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Bouton de collapse avec animation premium */}
        <motion.button
          onClick={toggleSidebar}
          className={`ml-auto w-8 h-8 rounded-full flex items-center justify-center ${
            isDarkTheme
              ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-slate-300 hover:from-indigo-900 hover:to-indigo-800 hover:text-indigo-300 border border-slate-700/50'
              : 'bg-gradient-to-br from-slate-100 to-white text-slate-500 hover:from-indigo-100 hover:to-indigo-50 hover:text-indigo-600 border border-slate-200'
          } transition-all duration-300 group`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ChevronLeft size={16} className="group-hover:scale-110 transition-transform" />
          </motion.div>
        </motion.button>
      </motion.div>
      
      {/* Navigation principale */}
      <motion.div 
        className="relative py-6 flex flex-col h-[calc(100%-5rem)] z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <LayoutGroup>
          {/* Tableau de bord */}
          <motion.div 
            className={`px-3 mb-4`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-xs font-semibold uppercase tracking-wider mb-3 px-3 flex items-center gap-2 ${
                    isDarkTheme ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <motion.div
                    className={`w-4 h-0.5 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-300'}`}
                    initial={{ width: 0 }}
                    animate={{ width: 16 }}
                    transition={{ delay: 0.5 }}
                  />
                  Tableau de bord
                </motion.div>
              )}
            </AnimatePresence>
            
            <nav className="space-y-1.5">
              <MenuItem
                to="/overview"
                itemKey="home"
                icon={Home}
                label="Vue d'ensemble"
                color="indigo"
              />
              
              <MenuItem
                to="/problems/unified?dashboard=all"
                itemKey="problems"
                icon={AlertTriangle}
                label="Problèmes"
                color="red"
                badge="VFG+VFE"
              />
            </nav>
          </motion.div>
        
          {/* Applications critiques */}
          <motion.div 
            className={`px-3 mt-6`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-xs font-semibold uppercase tracking-wider mb-3 px-3 flex items-center gap-2 ${
                    isDarkTheme ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <motion.div
                    className={`w-4 h-0.5 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-300'}`}
                    initial={{ width: 0 }}
                    animate={{ width: 16 }}
                    transition={{ delay: 0.6 }}
                  />
                  Applications
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] ${
                      isDarkTheme ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                    }`}
                  >
                    CRITICAL
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <nav className="space-y-1.5">
              <MenuItem
                to="/vfg"
                itemKey="vfg"
                icon={Star}
                label="Vital for Group"
                color="indigo"
                special={true}
              />
              
              <MenuItem
                to="/vfe"
                itemKey="vfe"
                icon={Award}
                label="Vital for Enterprise"
                color="amber"
                special={true}
              />
            </nav>
          </motion.div>

          {/* Domain */}
          <motion.div 
            className={`px-3 mt-6`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-xs font-semibold uppercase tracking-wider mb-3 px-3 flex items-center gap-2 ${
                    isDarkTheme ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <motion.div
                    className={`w-4 h-0.5 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-300'}`}
                    initial={{ width: 0 }}
                    animate={{ width: 16 }}
                    transition={{ delay: 0.7 }}
                  />
                  Domain
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: "spring" }}
                    className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] ${
                      isDarkTheme ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    SECURITY
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <nav className="space-y-1.5">
              <MenuItem
                to="/detection"
                itemKey="detection"
                icon={Shield}
                label="Détection & CTL"
                color="blue"
                special={true}
              />
              
              <MenuItem
                to="/security"
                itemKey="security"
                icon={Key}
                label="Security & Encryption"
                color="red"
                special={true}
              />
              
              <MenuItem
                to="/fce-security"
                itemKey="fce_security"
                icon={Lock}
                label="FCE Security"
                color="purple"
                special={true}
              />
              
              <MenuItem
                to="/network-filtering"
                itemKey="network_filtering"
                icon={Globe}
                label="Network Filtering"
                color="cyan"
                special={true}
              />
              
              <MenuItem
                to="/identity"
                itemKey="identity"
                icon={User}
                label="Identity"
                color="pink"
                special={true}
              />
            </nav>
          </motion.div>
        
          {/* Inventory section */}
          <motion.div 
            className={`px-3 mt-6`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-xs font-semibold uppercase tracking-wider mb-3 px-3 flex items-center gap-2 ${
                    isDarkTheme ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <motion.div
                    className={`w-4 h-0.5 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-300'}`}
                    initial={{ width: 0 }}
                    animate={{ width: 16 }}
                    transition={{ delay: 0.8 }}
                  />
                  Inventory
                </motion.div>
              )}
            </AnimatePresence>
            
            <nav className="space-y-1.5">
              <MenuItem
                to="/hosts"
                itemKey="hosts"
                icon={Layers}
                label="Hosts"
                color="green"
                special={true}
              />
            </nav>
          </motion.div>
        
          {/* Espace supplémentaire pour l'esthétique */}
          <div className="flex-grow"></div>
          
          {/* Footer avec version */}
          <motion.div 
            className={`px-3 py-3 mt-auto relative z-10 ${
              isDarkTheme ? 'border-t border-slate-800/40' : 'border-t border-slate-200/70'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            {/* Logo BNP Paribas avec effet premium */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl backdrop-blur-sm ${
                isDarkTheme
                  ? 'bg-gradient-to-r from-slate-800/50 via-slate-900/60 to-slate-800/50 shadow-inner shadow-black/20 border border-slate-700/40'
                  : 'bg-gradient-to-r from-indigo-50/60 via-blue-50/70 to-indigo-50/60 shadow-inner shadow-blue-100/40 border border-slate-200/60'
              }`}
            >
              {/* Logo animé */}
              <motion.div 
                className="relative flex-shrink-0"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, repeatDelay: 3 }}
              >
                <motion.div
                  className={`absolute inset-0 w-7 h-7 ${isDarkTheme ? 'bg-green-500/25' : 'bg-green-400/15'} rounded-full`}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.6, 0.2, 0.6]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.div
                  className={`relative z-10 px-1.5 py-0.5 rounded-md backdrop-blur-md ${
                    isDarkTheme 
                      ? 'bg-gradient-to-br from-green-900/80 to-green-800/60 border border-green-600/50 shadow-sm shadow-green-900/50' 
                      : 'bg-gradient-to-br from-green-100 to-green-50 border border-green-300/70 shadow-sm shadow-green-200/50'
                  }`}
                  whileHover={{ scale: 1.1 }}
                >
                  <span className={`text-xs font-bold ${isDarkTheme ? 'text-green-400' : 'text-green-700'}`}>BNP</span>
                </motion.div>
              </motion.div>
              
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col"
                  >
                    <span className={`text-xs font-medium ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                      BNP Paribas
                    </span>
                    <span className={`text-[10px] ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                      v1.0.0 • Enterprise
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Developer credit avec animations */}
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`mt-3 px-2 py-3 rounded-xl text-center backdrop-blur-sm ${
                    isDarkTheme 
                      ? 'bg-gradient-to-b from-slate-800/60 to-slate-900/50 border border-slate-700/40' 
                      : 'bg-gradient-to-b from-slate-100/80 to-slate-50/80 border border-slate-200/60'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <motion.span 
                      className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                    >
                      Développé par
                    </motion.span>
                    <motion.a
                      href="mailto:Rayane.Bennasr@externe.bnpparibas.com"
                      className={`text-xs font-medium mt-1 inline-flex items-center gap-1 ${
                        isDarkTheme 
                          ? 'text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text hover:from-blue-300 hover:to-purple-300' 
                          : 'text-blue-600 hover:text-blue-800'
                      } transition-all duration-300`}
                      whileHover={{ scale: 1.05 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                    >
                      <Sparkles size={12} className={isDarkTheme ? 'text-blue-400' : 'text-blue-600'} />
                      Rayane Ben Nasr
                    </motion.a>
                    
                    {/* Badge BETA animé */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.1, type: "spring", stiffness: 500 }}
                      whileHover={{ scale: 1.1 }}
                      className={`flex items-center mt-2 px-3 py-1 rounded-full backdrop-blur-sm ${
                        isDarkTheme 
                          ? 'bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/30' 
                          : 'bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-300/50'
                      }`}
                    >
                      <motion.span 
                        className={`text-[10px] font-bold ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'} mr-1.5`}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        BETA
                      </motion.span>
                      <span className={`text-[9px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                        Vos retours sont précieux
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </motion.div>
      
      {/* Style global pour les motifs d'arrière-plan et animations */}
      <style>{`
        /* Suppression complète du focus pour tous les liens de navigation */
        nav a:focus,
        nav a:focus-visible,
        nav a:focus-within {
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Empêcher tout ring de focus sur les liens avec data-menu-item */
        [data-menu-item]:focus,
        [data-menu-item]:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          --tw-ring-shadow: 0 0 transparent !important;
        }
        
        /* Reset des styles de focus pour éviter les artefacts visuels */
        [data-menu-item] {
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        
        .bg-grid-pattern {
          background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 8px 8px;
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        /* Effet de lueur pour les liens */
        .hover-glow {
          position: relative;
          transition: all 0.3s ease;
        }
        
        .hover-glow::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          opacity: 0;
          background: radial-gradient(circle, currentColor, transparent);
          filter: blur(8px);
          transition: opacity 0.3s ease;
          z-index: -1;
        }
        
        .hover-glow:hover::after {
          opacity: 0.3;
        }
        
        /* Scrollbar personnalisée */
        nav::-webkit-scrollbar {
          width: 4px;
        }
        
        nav::-webkit-scrollbar-track {
          background: transparent;
        }
        
        nav::-webkit-scrollbar-thumb {
          background: ${isDarkTheme ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'};
          border-radius: 2px;
        }
        
        nav::-webkit-scrollbar-thumb:hover {
          background: ${isDarkTheme ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.3)'};
        }
      `}</style>
    </motion.aside>
  );
};

export default Sidebar;
