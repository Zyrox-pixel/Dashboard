import React, { useState } from 'react';
import { Shield, Server, Activity, Database, AlertTriangle, ChevronRight, Lock, ExternalLink, UserCheck, BarChart } from 'lucide-react';
import { ManagementZone } from '../../api/types';

interface ZoneCardProps {
  zone: ManagementZone;
  onZoneClick: (zoneId: string) => void;
  highlighted?: boolean;
  variant?: 'standard' | 'compact' | 'expanded';
  design?: 'modern' | 'glass' | 'neumorph' | '3d';
}

/**
 * Carte de Management Zone premium avec plusieurs variantes de design
 */
const ZoneCard: React.FC<ZoneCardProps> = ({
  zone,
  onZoneClick,
  highlighted = false,
  variant = 'standard',
  design = 'modern'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Déterminer les classes CSS en fonction du design
  const getDesignClasses = () => {
    switch (design) {
      case 'glass':
        return 'glass-card card-3d-effect';
      case 'neumorph':
        return 'card-neu card-3d-effect';
      case '3d':
        return 'card-3d card-3d-effect';
      case 'modern':
      default:
        return 'card card-hover card-3d-effect';
    }
  };
  
  // Déterminer l'icône à afficher
  const renderIcon = () => {
    if (zone.icon) return zone.icon;
    
    // Icône par défaut
    return <Shield className="animate-pulse-subtle" size={20} />;
  };
  
  // Déterminer la couleur d'accentuation basée sur le statut et le nombre de problèmes
  const getAccentColor = () => {
    if (zone.problemCount > 0) return 'red';
    if (zone.status === 'healthy') return 'green';
    return 'amber';
  };
  
  const accentColor = getAccentColor();
  
  // Calculer le pourcentage de disponibilité pour la barre de progression
  const availabilityPercent = parseFloat(zone.availability.replace('%', ''));
  
  // Version compacte (pour affichage en grid)
  if (variant === 'compact') {
    return (
      <div 
        className={`rounded-xl overflow-hidden transition-all duration-300 cursor-pointer shadow-lg border border-slate-700/10 transform perspective-1000 hover:translate-y-[-2px] hover:shadow-xl active:translate-y-0 active:shadow-inner ${getDesignClasses()} ${
          highlighted ? 'ring-2 ring-indigo-500/70 ring-offset-2 ring-offset-slate-900' : ''
        }`}
        onClick={() => onZoneClick(zone.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`p-4 bg-gradient-to-br ${accentColor === 'red' ? 'from-red-900/20 to-red-950/10' : 
          accentColor === 'green' ? 'from-emerald-900/20 to-emerald-950/10' :
          'from-amber-900/20 to-amber-950/10'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`relative p-2 rounded-full ${
              accentColor === 'red' ? 'bg-red-900/30 text-red-400' : 
              accentColor === 'green' ? 'bg-emerald-900/30 text-emerald-400' :
              'bg-amber-900/30 text-amber-400'
            }`}>
              {/* Effet de lueur */}
              <div className={`absolute inset-0 w-full h-full rounded-full ${
                accentColor === 'red' ? 'bg-red-700/20' : 
                accentColor === 'green' ? 'bg-emerald-700/20' :
                'bg-amber-700/20'
              } blur-md animate-pulse-slow`}></div>
              {renderIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate">{zone.name}</h3>
              <p className="text-xs text-slate-400">{zone.code}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-slate-900/70 rounded-lg p-2 text-center shadow-md border border-slate-700/40 relative animate-subtle-bounce" style={{animationDelay: '0ms'}}>
              <p className="text-xs text-slate-500 tracking-wide">Services</p>
              <p className="text-lg font-bold text-white">{zone.services}</p>
              <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-30 bg-gradient-to-br from-blue-500/20 to-transparent transition-opacity duration-300 pointer-events-none"></div>
            </div>
            <div className="bg-slate-900/70 rounded-lg p-2 text-center shadow-md border border-slate-700/40 relative animate-subtle-bounce" style={{animationDelay: '100ms'}}>
              <p className="text-xs text-slate-500 tracking-wide">Hôtes</p>
              <p className="text-lg font-bold text-white">{zone.hosts}</p>
              <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-30 bg-gradient-to-br from-purple-500/20 to-transparent transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
          
          {/* Problèmes */}
          {zone.problemCount > 0 && (
            <div className="flex items-center justify-between mt-3 p-2 rounded-lg bg-red-900/30 border border-red-700/40 shadow-md">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-xs text-red-300">Problèmes actifs:</span>
              </div>
              <span className="font-bold text-red-300">{zone.problemCount}</span>
            </div>
          )}
          
          {/* Bouton de détails qui apparaît au survol */}
          <div className={`mt-3 transition-all duration-300 ${isHovered ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'}`}>
            <div className="flex items-center justify-center w-full py-1.5 bg-slate-700/70 backdrop-blur-sm rounded-md text-sm text-white shadow-md hover-glow transition-all duration-300">
              <span>Voir les détails</span>
              <ChevronRight size={14} className="ml-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Version étendue (pour vue détaillée)
  if (variant === 'expanded') {
    return (
      <div 
        className={`rounded-xl overflow-hidden transition-all duration-300 cursor-pointer shadow-lg border border-slate-700/10 transform perspective-1000 hover:translate-y-[-2px] hover:shadow-xl active:translate-y-0 active:shadow-inner ${getDesignClasses()} ${
          highlighted ? 'ring-2 ring-indigo-500/70 ring-offset-2 ring-offset-slate-900' : ''
        }`}
        onClick={() => onZoneClick(zone.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header avec gradient */}
        <div className={`p-5 ${
          accentColor === 'red' ? 'bg-gradient-to-br from-red-900/20 to-red-950/10' : 
          accentColor === 'green' ? 'bg-gradient-to-br from-emerald-900/20 to-emerald-950/10' :
          'bg-gradient-to-br from-amber-900/20 to-amber-950/10'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`relative p-3 rounded-lg ${
                accentColor === 'red' ? 'bg-red-900/30 text-red-400' : 
                accentColor === 'green' ? 'bg-emerald-900/30 text-emerald-400' :
                'bg-amber-900/30 text-amber-400'
              } shadow-md border border-slate-700/40`}>
                {/* Effet de lueur */}
                <div className={`absolute inset-0 w-full h-full rounded-lg ${
                  accentColor === 'red' ? 'bg-red-700/20' : 
                  accentColor === 'green' ? 'bg-emerald-700/20' :
                  'bg-amber-700/20'
                } blur-md animate-pulse-slow`}></div>
                {renderIcon()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white text-shadow-sm">{zone.name}</h3>
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <Lock size={12} className="text-slate-500" />
                  {zone.code}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className={`px-2.5 py-1 rounded-full ${
                zone.status === 'healthy' 
                  ? 'badge-success' 
                  : 'badge-warning'
              } flex items-center gap-1.5 shadow-sm`}>
                <span className={`w-2 h-2 rounded-full ${
                  zone.status === 'healthy' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 animate-pulse'
                }`}></span>
                {zone.status === 'healthy' ? 'Sain' : 'Dégradé'}
              </div>
              
              {/* Badge de problèmes */}
              {zone.problemCount > 0 && (
                <div className="mt-2 badge-error flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle size={12} className="text-red-400" />
                  {zone.problemCount} problème{zone.problemCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
          
          {/* Statistiques principales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="glass-dark rounded-lg p-3 border border-slate-700/50 transform-gpu hover:-translate-y-1 hover:border-blue-700/30 transition-all duration-300 shadow-lg animate-subtle-bounce" style={{animationDelay: '0ms'}}>
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-blue-400" />
                <span className="text-sm text-slate-300">Services</span>
              </div>
              <p className="text-2xl font-bold text-white text-shadow-sm">{zone.services}</p>
              <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-30 bg-gradient-to-br from-blue-500/20 to-transparent transition-opacity duration-300 pointer-events-none"></div>
            </div>
            <div className="glass-dark rounded-lg p-3 border border-slate-700/50 transform-gpu hover:-translate-y-1 hover:border-purple-700/30 transition-all duration-300 shadow-lg animate-subtle-bounce relative" style={{animationDelay: '100ms'}}>
              <div className="flex items-center gap-2 mb-2">
                <Server size={14} className="text-purple-400" />
                <span className="text-sm text-slate-300">Hôtes</span>
              </div>
              <p className="text-2xl font-bold text-white text-shadow-sm">{zone.hosts}</p>
              <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-30 bg-gradient-to-br from-purple-500/20 to-transparent transition-opacity duration-300 pointer-events-none"></div>
            </div>
            <div className="glass-dark rounded-lg p-3 border border-slate-700/50 transform-gpu hover:-translate-y-1 hover:border-emerald-700/30 transition-all duration-300 shadow-lg animate-subtle-bounce relative" style={{animationDelay: '200ms'}}>
              <div className="flex items-center gap-2 mb-2">
                <Database size={14} className="text-emerald-400" />
                <span className="text-sm text-slate-300">Applications</span>
              </div>
              <p className="text-2xl font-bold text-white text-shadow-sm">{zone.apps}</p>
              <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-30 bg-gradient-to-br from-emerald-500/20 to-transparent transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
          
          {/* Barre d'état */}
          <div className="mb-3">
            <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full ${
                  zone.problemCount > 0 
                    ? 'bg-gradient-to-r from-red-500 via-red-700 to-red-500 animate-wave'
                    : 'bg-gradient-to-r from-green-500 to-green-600 animate-shimmer'
                }`}
                style={{ width: `${Math.min(100, availabilityPercent)}%`, backgroundSize: '200% 200%' }}
              ></div>
            </div>
          </div>
          
          {/* Informations supplémentaires */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700/40">
            <div className="flex items-center gap-2">
              <UserCheck size={14} className="text-blue-400" />
              <span className="text-xs text-slate-400">Dernière mise à jour: {new Date().toLocaleTimeString()}</span>
            </div>
            
            {/* Liens externes */}
            <div className="flex items-center">
              <a 
                href={zone.dt_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover-glow transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={12} />
                <span>Dynatrace</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Version standard (par défaut)
  return (
    <div 
      className={`rounded-xl overflow-hidden transition-all duration-300 cursor-pointer shadow-lg border border-slate-700/10 transform hover:translate-y-[-2px] hover:shadow-xl active:translate-y-0 active:shadow-inner ${getDesignClasses()} ${
        highlighted ? 'ring-2 ring-indigo-500/70 ring-offset-2 ring-offset-slate-900' : ''
      }`}
      onClick={() => onZoneClick(zone.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Bandeau de problèmes en haut si présents */}
      {zone.problemCount > 0 && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-red-900/40 border-b border-red-700/40 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs text-red-300">Problèmes actifs détectés</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-red-700/50 text-red-300 text-xs font-medium">{zone.problemCount}</span>
        </div>
      )}
      
      <div className={`p-4 ${
        accentColor === 'red' ? 'bg-gradient-to-br from-red-900/20 to-red-950/10' : 
        accentColor === 'green' ? 'bg-gradient-to-br from-emerald-900/20 to-emerald-950/10' :
        'bg-gradient-to-br from-amber-900/20 to-amber-950/10'
      }`}>
        <div className="flex justify-between items-start mb-4">
          {/* Icône et nom */}
          <div className="flex items-center gap-3">
            <div className={`relative p-2 rounded-full ${
              accentColor === 'red' ? 'bg-red-900/40 text-red-400' : 
              accentColor === 'green' ? 'bg-emerald-900/40 text-emerald-400' :
              'bg-amber-900/40 text-amber-400'
            } border border-slate-700/30 shadow-md`}>
              {/* Effet de lueur */}
              <div className={`absolute inset-0 w-full h-full rounded-full ${
                accentColor === 'red' ? 'bg-red-700/20' : 
                accentColor === 'green' ? 'bg-emerald-700/20' :
                'bg-amber-700/20'
              } blur-md animate-pulse-slow`}></div>
              {renderIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-white text-base text-shadow-sm">{zone.name}</h3>
              <p className="text-xs text-slate-400">{zone.code}</p>
            </div>
          </div>
          
          {/* Statut */}
          <div className={`${
            zone.status === 'healthy' 
              ? 'badge-success' 
              : 'badge-warning'
          } flex items-center gap-1.5 shadow-sm`}>
            <span className={`w-2 h-2 rounded-full ${
              zone.status === 'healthy' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 animate-pulse'
            }`}></span>
            {zone.status === 'healthy' ? 'Sain' : 'Dégradé'}
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-dark rounded-lg p-2 text-center shadow-md border border-slate-700/40 hover:border-blue-700/30 transition-all duration-300 relative animate-subtle-bounce" style={{animationDelay: '0ms'}}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity size={12} className="text-blue-400" />
              <span className="text-xs text-slate-500 tracking-wide">Services</span>
            </div>
            <p className="text-lg font-bold text-white text-shadow-sm">{zone.services}</p>
            <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-30 bg-gradient-to-br from-blue-500/20 to-transparent transition-opacity duration-300 pointer-events-none"></div>
          </div>
          <div className="glass-dark rounded-lg p-2 text-center shadow-md border border-slate-700/40 hover:border-purple-700/30 transition-all duration-300 relative animate-subtle-bounce" style={{animationDelay: '100ms'}}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Server size={12} className="text-purple-400" />
              <span className="text-xs text-slate-500 tracking-wide">Hôtes</span>
            </div>
            <p className="text-lg font-bold text-white text-shadow-sm">{zone.hosts}</p>
            <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-30 bg-gradient-to-br from-purple-500/20 to-transparent transition-opacity duration-300 pointer-events-none"></div>
          </div>
          <div className="glass-dark rounded-lg p-2 text-center shadow-md border border-slate-700/40 hover:border-emerald-700/30 transition-all duration-300 relative animate-subtle-bounce" style={{animationDelay: '200ms'}}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart size={12} className="text-emerald-400" />
              <span className="text-xs text-slate-500 tracking-wide">Apps</span>
            </div>
            <p className="text-lg font-bold text-white text-shadow-sm">{zone.apps}</p>
            <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-30 bg-gradient-to-br from-emerald-500/20 to-transparent transition-opacity duration-300 pointer-events-none"></div>
          </div>
        </div>
        
        {/* Barre d'état */}
        <div className="mt-3 mb-2">
          <div className="w-full h-1.5 bg-slate-900/80 rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full rounded-full ${
                zone.problemCount > 0 
                  ? 'bg-gradient-to-r from-red-500 via-red-700 to-red-500 animate-wave' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 animate-shimmer'
              }`}
              style={{ width: `${Math.min(100, availabilityPercent)}%`, backgroundSize: '200% 200%' }}
            ></div>
          </div>
        </div>
        
        {/* Bouton de détails qui devient plus visible au survol */}
        <div className={`mt-3 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-70'}`}>
          <div className="flex items-center justify-center w-full py-1.5 bg-slate-700/70 backdrop-blur-sm rounded-md text-sm text-white hover:bg-slate-600/70 hover-glow transition-all duration-300 shadow-md">
            <span>Voir les détails</span>
            <ChevronRight size={14} className="ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneCard;