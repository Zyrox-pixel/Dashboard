// src/components/common/ServiceFilterBadges.tsx
import React from 'react';
import { X, Clock, Activity, AlertOctagon, BarChart } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ServiceFilter {
  type: 'technology' | 'response_time' | 'median_response_time' | 'error_rate' | 'status';
  values: string[];
}

interface ServiceFilterBadgesProps {
  filters: ServiceFilter[];
  onRemoveFilter: (type: string, value?: string) => void;
  onClearAllFilters: () => void;
}

const ServiceFilterBadges: React.FC<ServiceFilterBadgesProps> = ({
  filters,
  onRemoveFilter,
  onClearAllFilters
}) => {
  const { isDarkTheme } = useTheme();
  
  if (filters.length === 0) {
    return null;
  }
  
  // Fonction pour traduire les valeurs des filtres
  const getFilterLabel = (type: string, value: string): string => {
    switch (type) {
      case 'response_time':
        switch (value) {
          case 'fast': return 'Rapide (<20ms)';
          case 'medium': return 'Moyen (20-100ms)';
          case 'slow': return 'Lent (>100ms)';
          default: return value;
        }

      case 'median_response_time':
        switch (value) {
          case 'fast_median': return 'Rapide (<20ms)';
          case 'medium_median': return 'Moyen (20-100ms)';
          case 'slow_median': return 'Lent (>100ms)';
          default: return value;
        }
        
      case 'error_rate':
        switch (value) {
          case 'normal': return 'Normal (<1%)';
          case 'elevated': return 'Élevé (1-5%)';
          case 'critical': return 'Critique (>5%)';
          default: return value;
        }
        
      case 'status':
        switch (value) {
          case 'active': return 'Actif';
          case 'inactive': return 'Inactif';
          case 'degraded': return 'Dégradé';
          default: return value;
        }
        
      default:
        return value;
    }
  };
  
  // Fonction pour obtenir l'icône selon le type de filtre
  const getFilterIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'technology':
        return <Activity size={12} />;
      case 'response_time':
        return <Clock size={12} />;
      case 'median_response_time':
        return <Clock size={12} />;
      case 'error_rate':
        return <AlertOctagon size={12} />;
      case 'status':
        return <BarChart size={12} />;
      default:
        return null;
    }
  };
  
  // Fonction pour obtenir la couleur selon le type de filtre
  const getFilterColor = (type: string, value: string): string => {
    if (isDarkTheme) {
      switch (type) {
        case 'technology':
          return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50';
        case 'response_time':
          if (value === 'fast') return 'bg-green-900/30 text-green-300 border-green-700/50';
          if (value === 'medium') return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
          if (value === 'slow') return 'bg-red-900/30 text-red-300 border-red-700/50';
          return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50';
        case 'median_response_time':
          if (value === 'fast_median') return 'bg-green-900/30 text-green-300 border-green-700/50';
          if (value === 'medium_median') return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
          if (value === 'slow_median') return 'bg-red-900/30 text-red-300 border-red-700/50';
          return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50';
        case 'error_rate':
          if (value === 'normal') return 'bg-green-900/30 text-green-300 border-green-700/50';
          if (value === 'elevated') return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
          if (value === 'critical') return 'bg-red-900/30 text-red-300 border-red-700/50';
          return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50';
        case 'status':
          if (value === 'active') return 'bg-green-900/30 text-green-300 border-green-700/50';
          if (value === 'inactive') return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
          if (value === 'degraded') return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
          return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50';
        default:
          return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50';
      }
    } else {
      switch (type) {
        case 'technology':
          return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'response_time':
          if (value === 'fast') return 'bg-green-50 text-green-700 border-green-200';
          if (value === 'medium') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
          if (value === 'slow') return 'bg-red-50 text-red-700 border-red-200';
          return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'median_response_time':
          if (value === 'fast_median') return 'bg-green-50 text-green-700 border-green-200';
          if (value === 'medium_median') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
          if (value === 'slow_median') return 'bg-red-50 text-red-700 border-red-200';
          return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'error_rate':
          if (value === 'normal') return 'bg-green-50 text-green-700 border-green-200';
          if (value === 'elevated') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
          if (value === 'critical') return 'bg-red-50 text-red-700 border-red-200';
          return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'status':
          if (value === 'active') return 'bg-green-50 text-green-700 border-green-200';
          if (value === 'inactive') return 'bg-slate-100 text-slate-600 border-slate-200';
          if (value === 'degraded') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
          return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        default:
          return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      }
    }
  };
  
  // Traduire les types de filtres
  const getFilterTypeLabel = (type: string): string => {
    switch (type) {
      case 'technology':
        return 'Technologie';
      case 'response_time':
        return 'Temps de réponse (moy.)';
      case 'median_response_time':
        return 'Temps de réponse (méd.)';
      case 'error_rate':
        return 'Taux d\'erreur';
      case 'status':
        return 'Statut';
      default:
        return type;
    }
  };
  
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      <span className={`text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
        Filtres actifs:
      </span>
      
      {filters.map(filter => (
        filter.values.map(value => (
          <span 
            key={`${filter.type}-${value}`}
            className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${getFilterColor(filter.type, value)}`}
          >
            {getFilterIcon(filter.type)}
            <span className="font-medium">{getFilterTypeLabel(filter.type)}:</span>
            <span>{getFilterLabel(filter.type, value)}</span>
            <button
              onClick={() => onRemoveFilter(filter.type, value)}
              className={`ml-1 p-0.5 rounded-full ${
                isDarkTheme
                  ? 'hover:bg-slate-700 text-slate-300'
                  : 'hover:bg-slate-200 text-slate-600'
              }`}
            >
              <X size={10} />
            </button>
          </span>
        ))
      ))}
      
      {filters.length > 0 && (
        <button
          onClick={onClearAllFilters}
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

export default ServiceFilterBadges;