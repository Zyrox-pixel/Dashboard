// src/components/common/FilterBadges.tsx
import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface OsFilter {
  type: string;
  versions: string[];
}

interface FilterBadgesProps {
  filters: OsFilter[];
  onRemoveFilter: (type: string, version?: string) => void;
  onClearAllFilters: () => void;
}

const FilterBadges: React.FC<FilterBadgesProps> = ({
  filters,
  onRemoveFilter,
  onClearAllFilters
}) => {
  const { isDarkTheme } = useTheme();
  
  if (filters.length === 0) {
    return null;
  }
  
  // Get the icon for an OS type
  const getOsTypeIcon = (osType: string): React.ReactNode => {
    switch(osType.toLowerCase()) {
      case 'linux':
        return <span className="text-orange-500">🐧</span>;
      case 'windows':
        return <span className="text-blue-500">🪟</span>;
      case 'macos':
        return <span className="text-gray-500">🍎</span>;
      case 'unix':
      case 'aix':
        return <span className="text-purple-500">🖥️</span>;
      default:
        return null;
    }
  };
  
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      <span className={`text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
        Filtres actifs:
      </span>
      
      {filters.map(filter => (
        <span 
          key={filter.type}
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${
            isDarkTheme
              ? 'bg-indigo-900/30 text-indigo-300 border border-indigo-700/50'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}
        >
          {getOsTypeIcon(filter.type)}
          <span>{filter.type}</span>
          <button
            onClick={() => onRemoveFilter(filter.type)}
            className={`ml-1 p-0.5 rounded-full ${
              isDarkTheme
                ? 'hover:bg-indigo-800 text-indigo-300'
                : 'hover:bg-indigo-100 text-indigo-600'
            }`}
          >
            <X size={10} />
          </button>
        </span>
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

export default FilterBadges;