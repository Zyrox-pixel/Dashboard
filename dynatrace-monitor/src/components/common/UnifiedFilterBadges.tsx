// src/components/common/UnifiedFilterBadges.tsx
import React, { ReactNode } from 'react';
import { X, Cpu, Database, Server, Layers, Clock, Activity, AlertOctagon, BarChart } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Generic filter badge interface
export interface FilterBadge {
  id: string;
  type: string;
  value: string;
  typeLabel?: string;
  valueLabel?: string;
  icon?: ReactNode;
  color?: string;
}

export interface UnifiedFilterBadgesProps {
  badges: FilterBadge[];
  onRemoveBadge: (type: string, value?: string) => void;
  onClearAllBadges: () => void;
  showLabel?: boolean;
}

const UnifiedFilterBadges: React.FC<UnifiedFilterBadgesProps> = ({
  badges,
  onRemoveBadge,
  onClearAllBadges,
  showLabel = true
}) => {
  const { isDarkTheme } = useTheme();
  
  if (badges.length === 0) {
    return null;
  }
  
  // Get icon based on filter type and value
  const getFilterIcon = (badge: FilterBadge): ReactNode => {
    // If icon is provided directly, use it
    if (badge.icon) {
      return badge.icon;
    }
    
    // Default icons based on filter type
    switch (badge.type) {
      case 'technology':
        // Check for specific technologies
        const techLower = badge.value.toLowerCase();
        if (techLower.includes('java')) {
          return <span className="text-orange-500">☕</span>;
        } else if (techLower.includes('python')) {
          return <span className="text-green-500">🐍</span>;
        } else if (techLower.includes('node') || techLower.includes('javascript')) {
          return <span className="text-yellow-500">⚡</span>;
        } else if (techLower.includes('.net') || techLower.includes('dotnet')) {
          return <span className="text-blue-500">🔷</span>;
        } else if (techLower.includes('database') || techLower.includes('sql')) {
          return <Database size={12} />;
        } else {
          return <Layers size={12} />;
        }
      
      case 'process_type':
        switch (badge.value) {
          case 'technology': return <Cpu size={12} />;
          case 'database': return <Database size={12} />;
          case 'server': return <Server size={12} />;
          default: return <Layers size={12} />;
        }
        
      case 'response_time':
      case 'median_response_time':
        return <Clock size={12} />;
        
      case 'error_rate':
        return <AlertOctagon size={12} />;
        
      case 'status':
        return <BarChart size={12} />;
        
      default:
        return <Activity size={12} />;
    }
  };
  
  // Get color based on filter type and value
  const getBadgeColor = (badge: FilterBadge): string => {
    // If color is provided directly, use it
    if (badge.color) {
      return badge.color;
    }
    
    // Default color scheme based on dark/light mode
    const baseIndigo = isDarkTheme 
      ? 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50'
      : 'bg-indigo-50 text-indigo-700 border-indigo-200';
      
    // Process-specific colors
    if (badge.type === 'process_type') {
      if (isDarkTheme) {
        switch (badge.value) {
          case 'technology': return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
          case 'database': return 'bg-purple-900/30 text-purple-300 border-purple-700/50';
          case 'server': return 'bg-green-900/30 text-green-300 border-green-700/50';
        }
      } else {
        switch (badge.value) {
          case 'technology': return 'bg-blue-50 text-blue-700 border-blue-200';
          case 'database': return 'bg-purple-50 text-purple-700 border-purple-200';
          case 'server': return 'bg-green-50 text-green-700 border-green-200';
        }
      }
    }
    
    // Response time colors
    else if (badge.type === 'response_time' || badge.type === 'median_response_time') {
      const value = badge.value.replace('_median', '');
      if (isDarkTheme) {
        switch (value) {
          case 'fast': return 'bg-green-900/30 text-green-300 border-green-700/50';
          case 'medium': return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
          case 'slow': return 'bg-red-900/30 text-red-300 border-red-700/50';
        }
      } else {
        switch (value) {
          case 'fast': return 'bg-green-50 text-green-700 border-green-200';
          case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
          case 'slow': return 'bg-red-50 text-red-700 border-red-200';
        }
      }
    }
    
    // Error rate colors
    else if (badge.type === 'error_rate') {
      if (isDarkTheme) {
        switch (badge.value) {
          case 'normal': return 'bg-green-900/30 text-green-300 border-green-700/50';
          case 'elevated': return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
          case 'critical': return 'bg-red-900/30 text-red-300 border-red-700/50';
        }
      } else {
        switch (badge.value) {
          case 'normal': return 'bg-green-50 text-green-700 border-green-200';
          case 'elevated': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
          case 'critical': return 'bg-red-50 text-red-700 border-red-200';
        }
      }
    }
    
    // Status colors
    else if (badge.type === 'status') {
      if (isDarkTheme) {
        switch (badge.value) {
          case 'active': return 'bg-green-900/30 text-green-300 border-green-700/50';
          case 'inactive': return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
          case 'degraded': return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
        }
      } else {
        switch (badge.value) {
          case 'active': return 'bg-green-50 text-green-700 border-green-200';
          case 'inactive': return 'bg-slate-100 text-slate-600 border-slate-200';
          case 'degraded': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        }
      }
    }
    
    // Default indigo color for anything else
    return baseIndigo;
  };
  
  // Get human-readable type label
  const getTypeLabel = (badge: FilterBadge): string => {
    // If a typeLabel is provided directly, use it
    if (badge.typeLabel) {
      return badge.typeLabel;
    }
    
    // Default type labels
    switch (badge.type) {
      case 'technology': return 'Technologie';
      case 'process_type': return 'Type';
      case 'response_time': return 'Temps de réponse (moy.)';
      case 'median_response_time': return 'Temps de réponse (méd.)';
      case 'error_rate': return 'Taux d\'erreur';
      case 'status': return 'Statut';
      default: return badge.type;
    }
  };
  
  // Get human-readable value label
  const getValueLabel = (badge: FilterBadge): string => {
    // If a valueLabel is provided directly, use it
    if (badge.valueLabel) {
      return badge.valueLabel;
    }
    
    // Process type labels
    if (badge.type === 'process_type') {
      switch (badge.value) {
        case 'technology': return 'Technologie';
        case 'database': return 'Base de données';
        case 'server': return 'Serveur';
      }
    }
    
    // Response time labels
    else if (badge.type === 'response_time') {
      switch (badge.value) {
        case 'fast': return 'Rapide (<20ms)';
        case 'medium': return 'Moyen (20-100ms)';
        case 'slow': return 'Lent (>100ms)';
      }
    }
    
    // Median response time labels
    else if (badge.type === 'median_response_time') {
      switch (badge.value) {
        case 'fast_median': return 'Rapide (<20ms)';
        case 'medium_median': return 'Moyen (20-100ms)';
        case 'slow_median': return 'Lent (>100ms)';
      }
    }
    
    // Error rate labels
    else if (badge.type === 'error_rate') {
      switch (badge.value) {
        case 'normal': return 'Normal (<1%)';
        case 'elevated': return 'Élevé (1-5%)';
        case 'critical': return 'Critique (>5%)';
      }
    }
    
    // Status labels
    else if (badge.type === 'status') {
      switch (badge.value) {
        case 'active': return 'Actif';
        case 'inactive': return 'Inactif';
        case 'degraded': return 'Dégradé';
      }
    }
    
    // Default to the raw value
    return badge.value;
  };
  
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      {showLabel && (
        <span className={`text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
          Filtres actifs:
        </span>
      )}
      
      {badges.map(badge => (
        <span 
          key={badge.id || `${badge.type}-${badge.value}`}
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${getBadgeColor(badge)}`}
        >
          {getFilterIcon(badge)}
          <span className="font-medium">{getTypeLabel(badge)}:</span>
          <span>{getValueLabel(badge)}</span>
          <button
            onClick={() => onRemoveBadge(badge.type, badge.value)}
            className={`ml-1 p-0.5 rounded-full ${
              isDarkTheme
                ? 'hover:bg-slate-700 text-slate-300'
                : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      
      {badges.length > 0 && (
        <button
          onClick={onClearAllBadges}
          className={`text-xs px-2 py-1 rounded ${
            isDarkTheme
              ? 'text-slate-300 hover:bg-slate-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Effacer tout
        </button>
      )}
    </div>
  );
};

export default UnifiedFilterBadges;
