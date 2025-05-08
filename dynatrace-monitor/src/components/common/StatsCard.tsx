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
 * Carte de statistiques moderne et stylisée pour afficher des métriques
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
          icon: 'text-emerald-500',
          badge: 'bg-emerald-900/20 text-emerald-400 border-emerald-700/30',
          gradient: 'from-emerald-600/10 to-emerald-900/10',
          text: 'text-emerald-400'
        };
      case 'warning':
        return {
          icon: 'text-amber-500',
          badge: 'bg-amber-900/20 text-amber-400 border-amber-700/30',
          gradient: 'from-amber-600/10 to-amber-900/10',
          text: 'text-amber-400'
        };
      case 'error':
        return {
          icon: 'text-red-500',
          badge: 'bg-red-900/20 text-red-400 border-red-700/30',
          gradient: 'from-red-600/10 to-red-900/10',
          text: 'text-red-400'
        };
      case 'info':
        return {
          icon: 'text-blue-500',
          badge: 'bg-blue-900/20 text-blue-400 border-blue-700/30',
          gradient: 'from-blue-600/10 to-blue-900/10',
          text: 'text-blue-400'
        };
      default:
        return {
          icon: 'text-indigo-500',
          badge: 'bg-indigo-900/20 text-indigo-400 border-indigo-700/30',
          gradient: 'from-indigo-600/10 to-indigo-900/10',
          text: 'text-indigo-400'
        };
    }
  };
  
  // Déterminer les classes CSS basées sur le style de design
  const getDesignClasses = () => {
    switch (design) {
      case '3d':
        return 'card-3d bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700/50 shadow-lg';
      case 'glass':
        return 'glass bg-slate-800/80 backdrop-blur-md border border-white/10 shadow-xl';
      case 'neu':
        return 'card-neu bg-slate-800 border border-slate-700';
      default:
        return 'bg-slate-800 border border-slate-700 shadow-md';
    }
  };
  
  const accentClasses = getAccentClasses();
  const designClasses = getDesignClasses();
  
  return (
    <div className={`rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg ${designClasses} ${className}`}>
      <div className={`p-5 bg-gradient-to-br ${accentClasses.gradient}`}>
        <div className="flex justify-between items-start">
          {/* Titre et valeur */}
          <div>
            <h3 className="font-medium text-sm text-slate-400 mb-1">{title}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{value}</span>
              
              {/* Indicateur de changement */}
              {change !== undefined && (
                <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                  change >= 0 
                    ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-700/30' 
                    : 'bg-red-900/20 text-red-400 border border-red-700/30'
                }`}>
                  {change >= 0 ? '+' : ''}{change}%
                </div>
              )}
            </div>
            
            {/* Sous-titre ou période */}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
            {!subtitle && change !== undefined && (
              <p className="text-xs text-slate-500 mt-1">vs. {period} précédentes</p>
            )}
          </div>
          
          {/* Icône */}
          {Icon && (
            <div className={`p-3 rounded-full bg-slate-900/60 border border-slate-700/50 ${accentClasses.icon}`}>
              <Icon size={22} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;