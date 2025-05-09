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
 * Carte de Management Zone moderne avec plusieurs variantes de design
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
        return 'bg-slate-800/80 backdrop-blur-md border border-white/10 shadow-xl';
      case 'neumorph':
        return 'bg-slate-800 border border-slate-700 shadow-[5px_5px_10px_rgba(0,0,0,0.3),-5px_-5px_10px_rgba(255,255,255,0.05)]';
      case '3d':
        return 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700/50 shadow-lg transform-gpu hover:translate-y-[-2px] hover:shadow-xl';
      case 'modern':
      default:
        return 'bg-slate-800 border border-slate-700 shadow-md hover:shadow-lg';
    }
  };
  
  // Déterminer l'icône à afficher
  const renderIcon = () => {
    if (zone.icon) return zone.icon;
    
    // Icône par défaut
    return <Shield size={20} />;
  };
  
  // Déterminer la couleur d'accentuation basée sur le statut et le nombre de problèmes
  const getAccentColor = () => {
    if (zone.problemCount > 0) return 'red';
    if (zone.status === 'healthy') return 'green';
    return 'amber';
  };
  
  const accentColor = getAccentColor();
  const accentClasses = {
    bg: `bg-${accentColor}-600`,
    bgLight: `bg-${accentColor}-500/10`,
    text: `text-${accentColor}-400`,
    border: `border-${accentColor}-500/30`,
    gradient: `from-${accentColor}-600/10 to-${accentColor}-900/10`
  };
  
  // Calculer le pourcentage de disponibilité pour la barre de progression
  const availabilityPercent = parseFloat(zone.availability.replace('%', ''));
  
  // Version compacte (pour affichage en grid)
  if (variant === 'compact') {
    return (
      <div 
        className={`rounded-lg overflow-hidden transition-all duration-300 cursor-pointer ${getDesignClasses()} ${
          highlighted ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : ''
        }`}
        onClick={() => onZoneClick(zone.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`p-4 bg-gradient-to-br ${accentClasses.gradient}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-full ${accentClasses.bgLight} ${accentClasses.text}`}>
              {renderIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate">{zone.name}</h3>
              <p className="text-xs text-slate-400">{zone.code}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-slate-900/50 rounded p-2 text-center">
              <p className="text-xs text-slate-500">Services</p>
              <p className="text-lg font-bold text-white">{zone.services}</p>
            </div>
            <div className="bg-slate-900/50 rounded p-2 text-center">
              <p className="text-xs text-slate-500">Hôtes</p>
              <p className="text-lg font-bold text-white">{zone.hosts}</p>
            </div>
          </div>
          
          {/* Problèmes */}
          {zone.problemCount > 0 && (
            <div className="flex items-center justify-between mt-3 p-2 rounded bg-red-900/20 border border-red-700/30">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-xs text-red-300">Problèmes actifs:</span>
              </div>
              <span className="font-bold text-red-300">{zone.problemCount}</span>
            </div>
          )}
          
          {/* Bouton de détails qui apparaît au survol */}
          <div className={`mt-3 transition-all duration-300 ${isHovered ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'}`}>
            <div className="flex items-center justify-center w-full py-1.5 bg-slate-700 rounded-md text-sm text-white">
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
        className={`rounded-lg overflow-hidden transition-all duration-300 cursor-pointer ${getDesignClasses()} ${
          highlighted ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : ''
        }`}
        onClick={() => onZoneClick(zone.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header avec gradient */}
        <div className={`p-5 bg-gradient-to-br ${accentClasses.gradient}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${accentClasses.bgLight} ${accentClasses.text} shadow-md`}>
                {renderIcon()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{zone.name}</h3>
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <Lock size={12} className="text-slate-500" />
                  {zone.code}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className={`px-2.5 py-1 rounded-full ${
                zone.status === 'healthy' 
                  ? 'bg-green-900/30 text-green-300 border border-green-700/30' 
                  : 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/30'
              } text-xs font-medium flex items-center gap-1.5`}>
                <span className={`w-2 h-2 rounded-full ${
                  zone.status === 'healthy' ? 'bg-green-400' : 'bg-yellow-400'
                }`}></span>
                {zone.status === 'healthy' ? 'Sain' : 'Dégradé'}
              </div>
              
              {/* Badge de problèmes */}
              {zone.problemCount > 0 && (
                <div className="mt-2 px-2.5 py-1 rounded-full bg-red-900/30 text-red-300 border border-red-700/30 text-xs font-medium flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-red-400" />
                  {zone.problemCount} problème{zone.problemCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
          
          {/* Statistiques principales */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-blue-400" />
                <span className="text-sm text-slate-300">Services</span>
              </div>
              <p className="text-2xl font-bold text-white">{zone.services}</p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Server size={14} className="text-purple-400" />
                <span className="text-sm text-slate-300">Hôtes</span>
              </div>
              <p className="text-2xl font-bold text-white">{zone.hosts}</p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Database size={14} className="text-emerald-400" />
                <span className="text-sm text-slate-300">Applications</span>
              </div>
              <p className="text-2xl font-bold text-white">{zone.apps}</p>
            </div>
          </div>
          
          {/* Barre de disponibilité */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Disponibilité</span>
              <span className={`text-sm font-medium ${
                availabilityPercent >= 99.9 ? 'text-green-400' : 
                availabilityPercent >= 99 ? 'text-blue-400' : 
                availabilityPercent >= 95 ? 'text-yellow-400' : 'text-red-400'
              }`}>{zone.availability}</span>
            </div>
            <div className="w-full h-2 bg-slate-900/60 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  availabilityPercent >= 99.9 ? 'bg-green-500' : 
                  availabilityPercent >= 99 ? 'bg-blue-500' : 
                  availabilityPercent >= 95 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, availabilityPercent)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Informations supplémentaires */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700/50">
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
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
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
      className={`rounded-lg overflow-hidden transition-all duration-300 cursor-pointer ${getDesignClasses()} ${
        highlighted ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : ''
      }`}
      onClick={() => onZoneClick(zone.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Bandeau de problèmes en haut si présents */}
      {zone.problemCount > 0 && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-red-900/30 border-b border-red-700/30">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs text-red-300">Problèmes actifs détectés</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-red-700/40 text-red-300 text-xs font-medium">{zone.problemCount}</span>
        </div>
      )}
      
      <div className={`p-4 bg-gradient-to-br ${accentClasses.gradient}`}>
        <div className="flex justify-between items-start mb-4">
          {/* Icône et nom */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${accentClasses.bgLight} ${accentClasses.text}`}>
              {renderIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">{zone.name}</h3>
              <p className="text-xs text-slate-400">{zone.code}</p>
            </div>
          </div>
          
          {/* Statut */}
          <div className={`px-2.5 py-1 rounded-full ${
            zone.status === 'healthy' 
              ? 'bg-green-900/30 text-green-300 border border-green-700/30' 
              : 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/30'
          } text-xs font-medium flex items-center gap-1.5`}>
            <span className={`w-2 h-2 rounded-full ${
              zone.status === 'healthy' ? 'bg-green-400' : 'bg-yellow-400'
            }`}></span>
            {zone.status === 'healthy' ? 'Sain' : 'Dégradé'}
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900/60 rounded p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity size={12} className="text-blue-400" />
              <span className="text-xs text-slate-500">Services</span>
            </div>
            <p className="text-lg font-bold text-white">{zone.services}</p>
          </div>
          <div className="bg-slate-900/60 rounded p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Server size={12} className="text-purple-400" />
              <span className="text-xs text-slate-500">Hôtes</span>
            </div>
            <p className="text-lg font-bold text-white">{zone.hosts}</p>
          </div>
          <div className="bg-slate-900/60 rounded p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart size={12} className="text-emerald-400" />
              <span className="text-xs text-slate-500">Apps</span>
            </div>
            <p className="text-lg font-bold text-white">{zone.apps}</p>
          </div>
        </div>
        
        {/* Disponibilité */}
        <div className="mt-3 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Disponibilité</span>
            <span className={`text-xs font-medium ${
              availabilityPercent >= 99.9 ? 'text-green-400' : 
              availabilityPercent >= 99 ? 'text-blue-400' : 
              availabilityPercent >= 95 ? 'text-yellow-400' : 'text-red-400'
            }`}>{zone.availability}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-900/60 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                availabilityPercent >= 99.9 ? 'bg-green-500' : 
                availabilityPercent >= 99 ? 'bg-blue-500' : 
                availabilityPercent >= 95 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, availabilityPercent)}%` }}
            ></div>
          </div>
        </div>
        
        {/* Bouton de détails qui devient plus visible au survol */}
        <div className={`mt-3 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-70'}`}>
          <div className="flex items-center justify-center w-full py-1.5 bg-slate-700 rounded-md text-sm text-white hover:bg-slate-600">
            <span>Voir les détails</span>
            <ChevronRight size={14} className="ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneCard;