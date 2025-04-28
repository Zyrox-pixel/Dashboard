// src/components/common/AdvancedProcessGroupFilter.tsx
import React, { useState, useMemo } from 'react';
import { X, Check, ChevronDown, ChevronUp, Filter, Info, Cpu, Database, Server, Layers } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ProcessGroup } from '../../api/types';

interface ProcessGroupFilter {
  type: 'technology' | 'process_type';
  values: string[];
}

interface AdvancedProcessGroupFilterProps {
  processGroups: ProcessGroup[];
  selectedFilters: ProcessGroupFilter[];
  onFilterChange: (filters: ProcessGroupFilter[]) => void;
  onClose: () => void;
}

const AdvancedProcessGroupFilter: React.FC<AdvancedProcessGroupFilterProps> = ({
  processGroups,
  selectedFilters,
  onFilterChange,
  onClose
}) => {
  const { isDarkTheme } = useTheme();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('technology');
  
  // Extraire toutes les technologies uniques
  const technologies = useMemo(() => {
    const techSet = new Set<string>();
    processGroups.forEach(process => {
      if (process.technology) {
        techSet.add(process.technology);
      }
    });
    return Array.from(techSet).sort();
  }, [processGroups]);
  
  // Définir les types de process groups
  const processTypes = [
    { id: 'technology', label: 'Technologie', icon: <Cpu size={14} /> },
    { id: 'database', label: 'Base de données', icon: <Database size={14} /> },
    { id: 'server', label: 'Serveur', icon: <Server size={14} /> }
  ];
  
  // Compter les process groups par technologie
  const technologyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    technologies.forEach(tech => {
      counts[tech] = processGroups.filter(p => p.technology === tech).length;
    });
    return counts;
  }, [processGroups, technologies]);
  
  // Compter les process groups par type
  const processTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    processTypes.forEach(type => {
      counts[type.id] = processGroups.filter(p => p.type === type.id).length;
    });
    return counts;
  }, [processGroups, processTypes]);
  
  // Vérifier si une valeur est sélectionnée pour un type de filtre
  const isValueSelected = (filterType: ProcessGroupFilter['type'], value: string): boolean => {
    const filter = selectedFilters.find(f => f.type === filterType);
    if (!filter) return false;
    return filter.values.includes(value);
  };
  
  // Basculer la sélection d'une valeur
  const toggleValueSelection = (filterType: ProcessGroupFilter['type'], value: string) => {
    const newFilters = [...selectedFilters];
    const filterIndex = newFilters.findIndex(f => f.type === filterType);
    
    if (filterIndex === -1) {
      // Créer un nouveau filtre avec cette valeur
      newFilters.push({
        type: filterType,
        values: [value]
      });
    } else {
      // Manipuler un filtre existant
      const filter = {...newFilters[filterIndex]};
      
      if (filter.values.includes(value)) {
        // Retirer la valeur
        filter.values = filter.values.filter(v => v !== value);
        
        // Si plus aucune valeur, retirer le filtre
        if (filter.values.length === 0) {
          newFilters.splice(filterIndex, 1);
        } else {
          newFilters[filterIndex] = filter;
        }
      } else {
        // Ajouter la valeur
        filter.values = [...filter.values, value];
        newFilters[filterIndex] = filter;
      }
    }
    
    onFilterChange(newFilters);
  };
  
  // Effacer tous les filtres
  const clearAllFilters = () => {
    onFilterChange([]);
  };
  
  // Obtenir le nombre total de filtres appliqués
  const getSelectedFiltersCount = (): number => {
    return selectedFilters.reduce((count, filter) => count + filter.values.length, 0);
  };
  
  // Obtenir l'icône pour une technologie
  const getTechnologyIcon = (tech: string): React.ReactNode => {
    const techLower = tech.toLowerCase();
    
    if (techLower.includes('java')) {
      return <span className="text-orange-500">☕</span>;
    } else if (techLower.includes('python')) {
      return <span className="text-green-500">🐍</span>;
    } else if (techLower.includes('node') || techLower.includes('javascript')) {
      return <span className="text-yellow-500">⚡</span>;
    } else if (techLower.includes('.net') || techLower.includes('dotnet')) {
      return <span className="text-blue-500">🔷</span>;
    } else if (techLower.includes('go')) {
      return <span className="text-blue-500">🐹</span>;
    } else if (techLower.includes('php')) {
      return <span className="text-indigo-500">🐘</span>;
    } else if (techLower.includes('ruby')) {
      return <span className="text-red-500">💎</span>;
    } else if (techLower.includes('database') || techLower.includes('sql')) {
      return <Database size={14} className="text-blue-500" />;
    }
    
    return <Cpu size={14} className="text-slate-400" />;
  };
  
  return (
    <div className={`p-4 rounded-lg shadow-lg border ${
      isDarkTheme 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-white border-slate-200'
    } max-w-4xl w-full`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Filter className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} size={18} />
          <h3 className="font-medium">Filtrer les process groups</h3>
          {getSelectedFiltersCount() > 0 && (
            <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full ${
              isDarkTheme
                ? 'bg-indigo-900/50 text-indigo-300'
                : 'bg-indigo-100 text-indigo-700'
            }`}>
              {getSelectedFiltersCount()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedFilters.length > 0 && (
            <button 
              onClick={clearAllFilters}
              className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${
                isDarkTheme 
                  ? 'text-indigo-400 hover:bg-slate-700' 
                  : 'text-indigo-600 hover:bg-slate-50'
              }`}
            >
              <X size={12} />
              <span>Effacer tous les filtres</span>
            </button>
          )}
          
          <button 
            onClick={onClose}
            className={`p-1 rounded-full ${
              isDarkTheme 
                ? 'hover:bg-slate-700 text-slate-400' 
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {/* Information explicative */}
      <div className={`p-3 mb-4 rounded-md flex items-start gap-3 ${
        isDarkTheme ? 'bg-indigo-900/20 border border-indigo-900/30' : 'bg-indigo-50 border border-indigo-100'
      } text-sm`}>
        <div className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}>
          <Info size={16} />
        </div>
        <div className={isDarkTheme ? 'text-indigo-300' : 'text-indigo-700'}>
          Filtrez les process groups par technologie ou type de processus. Vous pouvez combiner plusieurs filtres.
        </div>
      </div>
      
      {/* Catégories de filtres */}
      <div className="space-y-3">
        {/* Filtre par technologie */}
        <div className={`border rounded-lg overflow-hidden ${
          isDarkTheme ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div 
            className={`flex items-center justify-between p-3 cursor-pointer ${
              expandedCategory === 'technology'
                ? isDarkTheme 
                  ? 'bg-indigo-900/30 text-indigo-300' 
                  : 'bg-indigo-50 text-indigo-700'
                : isDarkTheme
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
            onClick={() => setExpandedCategory(expandedCategory === 'technology' ? null : 'technology')}
          >
            <div className="flex items-center gap-2">
              <Layers className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} size={18} />
              <span className="font-medium">Par technologie</span>
              
              {selectedFilters.find(f => f.type === 'technology') && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isDarkTheme 
                    ? 'bg-indigo-800 text-indigo-300' 
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {selectedFilters.find(f => f.type === 'technology')?.values.length || 0} sélectionné(s)
                </span>
              )}
            </div>
            
            <div>
              {expandedCategory === 'technology' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          
          {expandedCategory === 'technology' && (
            <div className={`p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ${
              isDarkTheme ? 'bg-slate-800' : 'bg-white'
            }`}>
              {technologies.map(tech => (
                <div 
                  key={tech} 
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    isValueSelected('technology', tech)
                      ? isDarkTheme 
                        ? 'bg-indigo-900/20 border-indigo-700 text-indigo-300' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : isDarkTheme
                        ? 'bg-slate-700/30 border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                  } border cursor-pointer hover:border-indigo-400`}
                  onClick={() => toggleValueSelection('technology', tech)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${
                      isValueSelected('technology', tech)
                        ? isDarkTheme
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-600 text-white'
                        : isDarkTheme
                          ? 'bg-slate-700 border border-slate-600'
                          : 'bg-white border border-slate-300'
                    }`}>
                      {isValueSelected('technology', tech) && <Check size={10} />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getTechnologyIcon(tech)}
                      <span>{tech}</span>
                    </div>
                  </div>
                  <span className={`ml-2 flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                    isDarkTheme 
                      ? 'bg-slate-700 text-slate-300' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {technologyCounts[tech]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Filtre par type de process */}
        <div className={`border rounded-lg overflow-hidden ${
          isDarkTheme ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div 
            className={`flex items-center justify-between p-3 cursor-pointer ${
              expandedCategory === 'process_type'
                ? isDarkTheme 
                  ? 'bg-indigo-900/30 text-indigo-300' 
                  : 'bg-indigo-50 text-indigo-700'
                : isDarkTheme
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
            onClick={() => setExpandedCategory(expandedCategory === 'process_type' ? null : 'process_type')}
          >
            <div className="flex items-center gap-2">
              <Cpu className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} size={18} />
              <span className="font-medium">Par type de process</span>
              
              {selectedFilters.find(f => f.type === 'process_type') && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isDarkTheme 
                    ? 'bg-indigo-800 text-indigo-300' 
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {selectedFilters.find(f => f.type === 'process_type')?.values.length || 0} sélectionné(s)
                </span>
              )}
            </div>
            
            <div>
              {expandedCategory === 'process_type' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          
          {expandedCategory === 'process_type' && (
            <div className={`p-2 grid grid-cols-1 gap-2 ${
              isDarkTheme ? 'bg-slate-800' : 'bg-white'
            }`}>
              {processTypes.map(type => (
                <div 
                  key={type.id} 
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    isValueSelected('process_type', type.id)
                      ? isDarkTheme 
                        ? 'bg-indigo-900/20 border-indigo-700 text-indigo-300' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : isDarkTheme
                        ? 'bg-slate-700/30 border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                  } border cursor-pointer hover:border-indigo-400`}
                  onClick={() => toggleValueSelection('process_type', type.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${
                      isValueSelected('process_type', type.id)
                        ? isDarkTheme
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-600 text-white'
                        : isDarkTheme
                          ? 'bg-slate-700 border border-slate-600'
                          : 'bg-white border border-slate-300'
                    }`}>
                      {isValueSelected('process_type', type.id) && <Check size={10} />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {type.icon}
                      <span>{type.label}</span>
                    </div>
                  </div>
                  <span className={`ml-2 flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                    isDarkTheme 
                      ? 'bg-slate-700 text-slate-300' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {processTypeCounts[type.id]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Zone de regroupement intelligent (optionnelle, future extension) */}
        <div className={`border rounded-lg overflow-hidden border-dashed ${
          isDarkTheme ? 'border-slate-600' : 'border-slate-300'
        }`}>
          <div className={`flex items-center justify-between p-3 ${
            isDarkTheme ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <div className="flex items-center gap-2">
              <Layers size={18} />
              <span className="font-medium">Regroupements intelligents</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                isDarkTheme ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
              }`}>
                Bientôt disponible
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-4 gap-2">
        <button
          onClick={clearAllFilters}
          className={`px-3 py-1.5 rounded border text-sm ${
            isDarkTheme 
              ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
              : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Réinitialiser
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
};

export default AdvancedProcessGroupFilter;