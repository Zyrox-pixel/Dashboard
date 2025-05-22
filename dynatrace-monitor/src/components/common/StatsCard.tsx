import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  /** Titre de la carte */
  title: string;
  /** Valeur principale à afficher */
  value: string | number;
  /** Sous-titre ou description */
  subtitle?: string;
  /** Pourcentage de changement (positif ou négatif) */
  change?: number;
  /** Période de comparaison pour le changement */
  period?: string;
  /** Icône à afficher (component Lucide) */
  icon?: LucideIcon;
  /** Couleur d'accentuation (primary, success, warning, error) */
  accentColor?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** Style de design (default, 3d, glass, neu) */
  design?: 'default' | '3d' | 'glass' | 'neu';
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * Carte de statistiques premium et élégante pour afficher des métriques
 * importantes comme les CPU, mémoire, problèmes, etc.
 */
const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  change,
  period = '24h',
  icon: Icon,
  accentColor = 'primary',
  design = 'default',
  className = ''
}) => {
  // Déterminer les classes CSS basées sur l'accentuation
  const getAccentClasses = () => {
    switch (accentColor) {
      case 'success':
        return {
          icon: 'text-emerald-400',
          badge: 'bg-emerald-900/20 text-emerald-300 border-emerald-700/30',
          gradient: 'from-emerald-900/20 via-emerald-800/10 to-transparent',
          text: 'text-emerald-400',
          border: 'border-emerald-700/40',
          glow: 'hover:shadow-emerald-900/20',
          iconBg: 'bg-emerald-900/40',
          change: {
            positive: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/30',
            negative: 'text-red-400 bg-red-900/30 border-red-700/30'
          }
        };
      case 'warning':
        return {
          icon: 'text-amber-400',
          badge: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
          gradient: 'from-amber-900/20 via-amber-800/10 to-transparent',
          text: 'text-amber-400',
          border: 'border-amber-700/40',
          glow: 'hover:shadow-amber-900/20',
          iconBg: 'bg-amber-900/40',
          change: {
            positive: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/30',
            negative: 'text-red-400 bg-red-900/30 border-red-700/30'
          }
        };
      case 'error':
        return {
          icon: 'text-red-400',
          badge: 'bg-red-900/20 text-red-300 border-red-700/30',
          gradient: 'from-red-900/20 via-red-800/10 to-transparent',
          text: 'text-red-400',
          border: 'border-red-700/40',
          glow: 'hover:shadow-red-900/20',
          iconBg: 'bg-red-900/40',
          change: {
            positive: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/30',
            negative: 'text-red-400 bg-red-900/30 border-red-700/30'
          }
        };
      case 'info':
        return {
          icon: 'text-blue-400',
          badge: 'bg-blue-900/20 text-blue-300 border-blue-700/30',
          gradient: 'from-blue-900/20 via-blue-800/10 to-transparent',
          text: 'text-blue-400',
          border: 'border-blue-700/40',
          glow: 'hover:shadow-blue-900/20',
          iconBg: 'bg-blue-900/40',
          change: {
            positive: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/30',
            negative: 'text-red-400 bg-red-900/30 border-red-700/30'
          }
        };
      default:
        return {
          icon: 'text-indigo-400',
          badge: 'bg-indigo-900/20 text-indigo-300 border-indigo-700/30',
          gradient: 'from-indigo-900/20 via-indigo-800/10 to-transparent',
          text: 'text-indigo-400',
          border: 'border-indigo-700/40',
          glow: 'hover:shadow-indigo-900/20',
          iconBg: 'bg-indigo-900/40',
          change: {
            positive: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/30',
            negative: 'text-red-400 bg-red-900/30 border-red-700/30'
          }
        };
    }
  };
  
  // Déterminer les classes CSS basées sur le style de design
  const getDesignClasses = () => {
    switch (design) {
      case '3d':
        return 'card-3d transform-gpu hover:translate-y-[-5px] hover:rotate-x-2 hover:rotate-y-2 bg-gradient-to-br from-slate-800/90 via-slate-850 to-slate-900 border border-slate-700/50';
      case 'glass':
        return 'glass-card backdrop-blur-lg bg-slate-800/70 border border-white/10';
      case 'neu':
        return 'card-neu shadow-inner bg-slate-800 border border-slate-700/50';
      default:
        return 'card hover:scale-[1.02] bg-gradient-to-br from-slate-800/90 to-slate-900 border border-slate-700/50';
    }
  };
  
  const accentClasses = getAccentClasses();
  const designClasses = getDesignClasses();
  
  return (
    <div className={`rounded-xl overflow-hidden transition-all duration-300 ease-out hover:shadow-xl
                     ${designClasses} ${accentClasses.glow} ${className} group`}>
      {/* Élément décoratif du haut (barre colorée) */}
      <div className={`h-1 w-full bg-gradient-to-r ${accentClasses.gradient}
                      group-hover:animate-pulse-subtle`}></div>
      
      <div className="p-5 relative">
        {/* Motif de fond subtil pour l'effet premium */}
        <div className="absolute inset-0 bg-dots-pattern opacity-5 pointer-events-none"></div>
        
        <div className="flex justify-between items-start">
          {/* Titre et valeur */}
          <div className="z-10">
            <h3 className="font-medium text-sm text-slate-400 mb-2 flex items-center gap-2">
              <span className="uppercase tracking-wider">{title}</span>
              
              {/* Indicateur de changement */}
              {change !== undefined && (
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1
                              ${change >= 0 
                                ? accentClasses.change.positive
                                : accentClasses.change.negative
                              } transition-all duration-300 hover:scale-105`}>
                  <span className={`text-xs ${change >= 0 ? '▲' : '▼'}`}>{change >= 0 ? '▲' : '▼'}</span>
                  <span>{Math.abs(change)}%</span>
                </div>
              )}
            </h3>
            
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-2xl font-bold text-white text-shadow-sm">{value}</span>
            </div>
            
            {/* Sous-titre ou période avec animation au survol */}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-2 group-hover:text-slate-400 transition-colors duration-300">{subtitle}</p>
            )}
            {!subtitle && change !== undefined && (
              <p className="text-xs text-slate-500 mt-2 group-hover:text-slate-400 transition-colors duration-300">vs. {period} précédentes</p>
            )}
          </div>
          
          {/* Icône avec effet de lueur */}
          {Icon && (
            <div className="relative z-10">
              {/* Effet de lueur derrière l'icône */}
              <div className={`absolute inset-0 rounded-full ${accentClasses.iconBg} blur-md opacity-70 
                            group-hover:animate-pulse-slow`}
                   style={{ transform: 'scale(1.5)' }}></div>
                   
              {/* Conteneur de l'icône avec fond et bordure */}
              <div className={`relative z-10 p-3.5 rounded-full bg-slate-800 border ${accentClasses.border}
                            shadow-lg transition-all duration-300 group-hover:scale-110`}>
                <Icon size={22} className={`${accentClasses.icon} transition-all duration-300`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
