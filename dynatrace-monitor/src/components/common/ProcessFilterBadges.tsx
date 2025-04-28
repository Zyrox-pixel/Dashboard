// src/components/common/ProcessFilterBadges.tsx
import React from 'react';
import { X, Cpu, Database, Server, Layers } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ProcessGroupFilter {
  type: 'technology' | 'process_type';
  values: string[];
}

interface ProcessFilterBadgesProps {
  filters: ProcessGroupFilter[];
  onRemoveFilter: (type: string, value?: string) => void;
  onClearAllFilters: () => void;
}

const ProcessFilterBadges: React.FC<ProcessFilterBadgesProps> = ({
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
      case 'process_type':
        switch (value) {
          case 'technology': return 'Technologie';
          case 'database': return 'Base de données';
          case 'server': return 'Serveur';
          default: return value;
        }
        
      default:
        return value;
    }
  };
  
  // Fonction pour obtenir l'icône selon le type et la valeur du filtre
  const getFilterIcon = (type: string, value: string): React.ReactNode => {
    switch (type) {
      case 'technology':
        // Basé sur la technologie
        const techLower = value.toLowerCase();
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
        switch (value) {
          case 'technology': return <Cpu size={12} />;
          case 'database': return <Database size={12} />;
          case 'server': return <Server size={12} />;
          default: return <Layers size={12} />;
        }
        
      default:
        return <Layers size={12} />;
    }
  };
  
  // Fonction pour obtenir la couleur selon le type de filtre
  const getFilterColor = (type: string, value: string): string => {
    if (isDarkTheme) {
      switch (type) {
        case 'technology':
          return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50';
        case 'process_type':
          if (value === 'technology') return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
          if (value === 'database') return 'bg-purple-900/30 text-purple-300 border-purple-700/50';
          if (value === 'server') return 'bg-green-900/30 text-green-300 border-green-700/50';
          return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50';
        default:
          return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50';
      }
    } else {
      switch (type) {
        case 'technology':
          return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'process_type':
          if (value === 'technology') return 'bg-blue-50 text-blue-700 border-blue-200';
          if (value === 'database') return 'bg-purple-50 text-purple-700 border-purple-200';
          if (value === 'server') return 'bg-green-50 text-green-700 border-green-200';
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
      case 'process_type':
        return 'Type';
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
            {getFilterIcon(filter.type, value)}
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

export default ProcessFilterBadges;