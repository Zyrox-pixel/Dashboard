import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw, Menu, X, AlertTriangle, BarChart3, Zap
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp } from '../../contexts/AppContext';

interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

/**
 * Header modernisé avec design futuriste, animations et effets visuels avancés
 */
const ModernHeader: React.FC<ModernHeaderProps> = ({ 
  title, 
  subtitle, 
  onRefresh,
  isLoading = false
}) => {
  const { activeProblems } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState(activeProblems.length);
  const [animateRefresh, setAnimateRefresh] = useState(false);
  
  // Détecter le scroll pour appliquer des effets
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Mettre à jour les notifications basées sur les problèmes actifs
  useEffect(() => {
    setNotifications(activeProblems.length);
  }, [activeProblems]);
  
  // Effet visuel pour simuler un retour sonore
  const playButtonSound = () => {
    // Fonction vide - nous avons supprimé l'effet sonore pour éviter les problèmes de compatibilité
    // À l'avenir, on pourrait ajouter un effet visuel subtil ici
  };
  
  // Gérer le clic sur le bouton de rafraîchissement
  const handleRefreshClick = () => {
    if (onRefresh && !isLoading) {
      setAnimateRefresh(true);
      playButtonSound();
      
      // Effet visuel pour le bouton de rafraîchissement
      onRefresh();
      
      // Réinitialiser l'animation après 1s
      setTimeout(() => {
        setAnimateRefresh(false);
      }, 1000);
    }
  };
  
  // Plus besoin de fermer les modales car elles ont été supprimées

  // Animation du titre
  const renderAnimatedTitle = () => {
    return (
      <div className="relative flex items-center">
        <h1 className="text-lg font-bold text-white relative">{title}
          {/* Effet de lueur derrière le texte */}
          <span className="absolute inset-0 blur-sm bg-indigo-500/20 -z-10"></span>
        </h1>
        {subtitle && (
          <p className="text-xs text-indigo-300 ml-2 opacity-80">{subtitle}</p>
        )}

        {/* Particules d'arrière-plan du titre */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute w-1 h-1 rounded-full bg-indigo-500/70"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `glow-float ${3 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <header 
      className={`sticky top-0 z-30 w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-[#14152e]/95 backdrop-blur-xl shadow-xl border-b border-indigo-900/30 py-2' 
          : 'bg-[#14152e] py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center">
          {/* Logo et titre */}
          <div className="flex items-center">
            {/* Mobile menu toggle */}
            <button 
              className="lg:hidden mr-3 text-indigo-400 hover:text-indigo-300 transition-all duration-300"
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                playButtonSound();
              }}
              aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-lg border border-indigo-800/30 bg-indigo-900/20 hover:bg-indigo-800/30 transition-all duration-300">
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </div>
            </button>
            
            {/* Logo */}
            <div className="flex items-center mr-4">
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
            </div>
            
            {/* Titre et sous-titre */}
            {renderAnimatedTitle()}
          </div>
          
          {/* Actions simplifiées */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Bouton d'actualisation */}
            {onRefresh && (
              <button
                onClick={handleRefreshClick}
                disabled={isLoading}
                className="relative overflow-hidden rounded-lg py-1.5 px-3 text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-1.5 btn-primary disabled:before:hidden"
                aria-label="Actualiser les données"
              >
                <RefreshCw
                  size={14}
                  className={`transition-all duration-300 ${
                    animateRefresh ? 'animate-spin text-white' : isLoading ? 'animate-spin text-white/80' : 'text-white'
                  }`}
                />
                <span className="inline relative z-10">
                  {isLoading ? 'Chargement...' : 'Actualiser'}
                </span>

                {/* Effet de particules au clic */}
                {animateRefresh && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={`refresh-particle-${i}`}
                        className="absolute w-1 h-1 rounded-full bg-white"
                        style={{
                          transform: `rotate(${i * 45}deg) translateY(-15px)`,
                          opacity: 0,
                          animation: `particle-fade-out 0.5s ease-out forwards ${i * 0.05}s`
                        }}
                      ></div>
                    ))}
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Menu mobile - avec animation améliorée */}
        <div 
          className={`lg:hidden transition-all duration-500 overflow-hidden ease-in-out ${
            isMenuOpen 
              ? 'max-h-[300px] opacity-100 py-4' 
              : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex flex-col space-y-2 mt-2">
            <a
              href="/vfg"
              className="text-indigo-300 hover:text-white py-2 px-3 rounded-lg hover:bg-indigo-800/30 transition-all duration-300 border border-transparent hover:border-indigo-800/30 flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center text-indigo-400">
                <BarChart3 size={18} />
              </span>
              <span>Dashboard VFG</span>
            </a>
            <a
              href="/vfe"
              className="text-indigo-300 hover:text-white py-2 px-3 rounded-lg hover:bg-indigo-800/30 transition-all duration-300 border border-transparent hover:border-indigo-800/30 flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center text-indigo-400">
                <BarChart3 size={18} />
              </span>
              <span>Dashboard VFE</span>
            </a>
            <a 
              href="/problems/unified" 
              className="text-indigo-300 hover:text-white py-2 px-3 rounded-lg hover:bg-indigo-800/30 transition-all duration-300 border border-transparent hover:border-indigo-800/30 flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center text-red-400 relative">
                <AlertTriangle size={18} />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                )}
              </span>
              <span>Problèmes</span>
              {notifications > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 text-xs border border-red-800/30">
                  {notifications}
                </span>
              )}
            </a>
          </div>
        </div>
      </div>
      
      {/* Les styles pour les animations avancées ont été déplacés dans animations.css */}
    </header>
  );
};

export default ModernHeader;