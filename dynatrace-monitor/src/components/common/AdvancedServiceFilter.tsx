// src/components/common/AdvancedServiceFilter.tsx
import React, { useState, useMemo } from 'react';
import { X, Check, ChevronDown, ChevronUp, Filter, Info, Activity, Clock, AlertOctagon, BarChart } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Service } from '../../api/types';

interface ServiceFilter {
  type: 'technology' | 'response_time' | 'error_rate' | 'status';
  values: string[];
}

interface AdvancedServiceFilterProps {
  services: Service[];
  selectedFilters: ServiceFilter[];
  onFilterChange: (filters: ServiceFilter[]) => void;
  onClose: () => void;
}

const AdvancedServiceFilter: React.FC<AdvancedServiceFilterProps> = ({
  services,
  selectedFilters,
  onFilterChange,
  onClose
}) => {
  const { isDarkTheme } = useTheme();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('technology');
  
  // Extraire toutes les technologies uniques
  const technologies = useMemo(() => {
    const techSet = new Set<string>();
    services.forEach(service => {
      if (service.technology) {
        techSet.add(service.technology);
      }
    });
    return Array.from(techSet).sort();
  }, [services]);
  
  // Définir les buckets de temps de réponse
  const responseTimeBuckets = [
    { id: 'fast', label: 'Rapide (<100ms)', range: [0, 100] },
    { id: 'medium', label: 'Moyen (100-500ms)', range: [100, 500] },
    { id: 'slow', label: 'Lent (>500ms)', range: [500, Infinity] }
  ];
  
  // Définir les buckets de taux d'erreur
  const errorRateBuckets = [
    { id: 'normal', label: 'Normal (<1%)', range: [0, 1] },
    { id: 'elevated', label: 'Élevé (1-5%)', range: [1, 5] },
    { id: 'critical', label: 'Critique (>5%)', range: [5, Infinity] }
  ];
  
  // Définir les statuts possibles
  const statuses = [
    { id: 'active', label: 'Actif' },
    { id: 'inactive', label: 'Inactif' },
    { id: 'degraded', label: 'Dégradé' }
  ];
  
  // Compter les services par technologie
  const technologyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    technologies.forEach(tech => {
      counts[tech] = services.filter(s => s.technology === tech).length;
    });
    return counts;
  }, [services, technologies]);
  
  // Compter les services par bucket de temps de réponse
  const responseTimeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    responseTimeBuckets.forEach(bucket => {
      counts[bucket.id] = services.filter(s => 
        s.response_time !== null && 
        s.response_time >= bucket.range[0] && 
        s.response_time < bucket.range[1]
      ).length;
    });
    return counts;
  }, [services, responseTimeBuckets]);
  
  // Compter les services par bucket de taux d'erreur
  const errorRateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    errorRateBuckets.forEach(bucket => {
      counts[bucket.id] = services.filter(s => 
        s.error_rate !== null && 
        s.error_rate >= bucket.range[0] && 
        s.error_rate < bucket.range[1]
      ).length;
    });
    return counts;
  }, [services, errorRateBuckets]);
  
  // Compter les services par statut
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    statuses.forEach(status => {
      counts[status.id] = services.filter(s => s.status === status.label).length;
    });
    return counts;
  }, [services, statuses]);
  
  // Vérifier si une valeur est sélectionnée pour un type de filtre
  const isValueSelected = (filterType: ServiceFilter['type'], value: string): boolean => {
    const filter = selectedFilters.find(f => f.type === filterType);
    if (!filter) return false;
    return filter.values.includes(value);
  };
  
  // Basculer la sélection d'une valeur
  const toggleValueSelection = (filterType: ServiceFilter['type'], value: string) => {
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
    }
    
    return <Activity size={14} className="text-slate-400" />;
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
          <h3 className="font-medium">Filtrer les services</h3>
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
          Filtrez les services par technologie, performance ou statut. Vous pouvez combiner plusieurs filtres.
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
              <Activity className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} size={18} />
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
        
        {/* Filtre par temps de réponse */}
        <div className={`border rounded-lg overflow-hidden ${
          isDarkTheme ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div 
            className={`flex items-center justify-between p-3 cursor-pointer ${
              expandedCategory === 'response_time'
                ? isDarkTheme 
                  ? 'bg-indigo-900/30 text-indigo-300' 
                  : 'bg-indigo-50 text-indigo-700'
                : isDarkTheme
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
            onClick={() => setExpandedCategory(expandedCategory === 'response_time' ? null : 'response_time')}
          >
            <div className="flex items-center gap-2">
              <Clock className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} size={18} />
              <span className="font-medium">Par temps de réponse</span>
              
              {selectedFilters.find(f => f.type === 'response_time') && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isDarkTheme 
                    ? 'bg-indigo-800 text-indigo-300' 
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {selectedFilters.find(f => f.type === 'response_time')?.values.length || 0} sélectionné(s)
                </span>
              )}
            </div>
            
            <div>
              {expandedCategory === 'response_time' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          
          {expandedCategory === 'response_time' && (
            <div className={`p-2 grid grid-cols-1 gap-2 ${
              isDarkTheme ? 'bg-slate-800' : 'bg-white'
            }`}>
              {responseTimeBuckets.map(bucket => (
                <div 
                  key={bucket.id} 
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    isValueSelected('response_time', bucket.id)
                      ? isDarkTheme 
                        ? 'bg-indigo-900/20 border-indigo-700 text-indigo-300' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : isDarkTheme
                        ? 'bg-slate-700/30 border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                  } border cursor-pointer hover:border-indigo-400`}
                  onClick={() => toggleValueSelection('response_time', bucket.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${
                      isValueSelected('response_time', bucket.id)
                        ? isDarkTheme
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-600 text-white'
                        : isDarkTheme
                          ? 'bg-slate-700 border border-slate-600'
                          : 'bg-white border border-slate-300'
                    }`}>
                      {isValueSelected('response_time', bucket.id) && <Check size={10} />}
                    </div>
                    <span className={
                      bucket.id === 'fast' ? 'text-green-500' :
                      bucket.id === 'medium' ? 'text-yellow-500' :
                      'text-red-500'
                    }>{bucket.label}</span>
                  </div>
                  <span className={`ml-2 flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                    isDarkTheme 
                      ? 'bg-slate-700 text-slate-300' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {responseTimeCounts[bucket.id]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Filtre par taux d'erreur */}
        <div className={`border rounded-lg overflow-hidden ${
          isDarkTheme ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div 
            className={`flex items-center justify-between p-3 cursor-pointer ${
              expandedCategory === 'error_rate'
                ? isDarkTheme 
                  ? 'bg-indigo-900/30 text-indigo-300' 
                  : 'bg-indigo-50 text-indigo-700'
                : isDarkTheme
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
            onClick={() => setExpandedCategory(expandedCategory === 'error_rate' ? null : 'error_rate')}
          >
            <div className="flex items-center gap-2">
              <AlertOctagon className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} size={18} />
              <span className="font-medium">Par taux d'erreur</span>
              
              {selectedFilters.find(f => f.type === 'error_rate') && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isDarkTheme 
                    ? 'bg-indigo-800 text-indigo-300' 
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {selectedFilters.find(f => f.type === 'error_rate')?.values.length || 0} sélectionné(s)
                </span>
              )}
            </div>
            
            <div>
              {expandedCategory === 'error_rate' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          
          {expandedCategory === 'error_rate' && (
            <div className={`p-2 grid grid-cols-1 gap-2 ${
              isDarkTheme ? 'bg-slate-800' : 'bg-white'
            }`}>
              {errorRateBuckets.map(bucket => (
                <div 
                  key={bucket.id} 
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    isValueSelected('error_rate', bucket.id)
                      ? isDarkTheme 
                        ? 'bg-indigo-900/20 border-indigo-700 text-indigo-300' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : isDarkTheme
                        ? 'bg-slate-700/30 border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                  } border cursor-pointer hover:border-indigo-400`}
                  onClick={() => toggleValueSelection('error_rate', bucket.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${
                      isValueSelected('error_rate', bucket.id)
                        ? isDarkTheme
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-600 text-white'
                        : isDarkTheme
                          ? 'bg-slate-700 border border-slate-600'
                          : 'bg-white border border-slate-300'
                    }`}>
                      {isValueSelected('error_rate', bucket.id) && <Check size={10} />}
                    </div>
                    <span className={
                      bucket.id === 'normal' ? 'text-green-500' :
                      bucket.id === 'elevated' ? 'text-yellow-500' :
                      'text-red-500'
                    }>{bucket.label}</span>
                  </div>
                  <span className={`ml-2 flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                    isDarkTheme 
                      ? 'bg-slate-700 text-slate-300' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {errorRateCounts[bucket.id]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Filtre par statut */}
        <div className={`border rounded-lg overflow-hidden ${
          isDarkTheme ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div 
            className={`flex items-center justify-between p-3 cursor-pointer ${
              expandedCategory === 'status'
                ? isDarkTheme 
                  ? 'bg-indigo-900/30 text-indigo-300' 
                  : 'bg-indigo-50 text-indigo-700'
                : isDarkTheme
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
            onClick={() => setExpandedCategory(expandedCategory === 'status' ? null : 'status')}
          >
            <div className="flex items-center gap-2">
              <BarChart className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} size={18} />
              <span className="font-medium">Par statut</span>
              
              {selectedFilters.find(f => f.type === 'status') && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isDarkTheme 
                    ? 'bg-indigo-800 text-indigo-300' 
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {selectedFilters.find(f => f.type === 'status')?.values.length || 0} sélectionné(s)
                </span>
              )}
            </div>
            
            <div>
              {expandedCategory === 'status' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          
          {expandedCategory === 'status' && (
            <div className={`p-2 grid grid-cols-1 gap-2 ${
              isDarkTheme ? 'bg-slate-800' : 'bg-white'
            }`}>
              {statuses.map(status => (
                <div 
                  key={status.id} 
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    isValueSelected('status', status.id)
                      ? isDarkTheme 
                        ? 'bg-indigo-900/20 border-indigo-700 text-indigo-300' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : isDarkTheme
                        ? 'bg-slate-700/30 border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                  } border cursor-pointer hover:border-indigo-400`}
                  onClick={() => toggleValueSelection('status', status.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${
                      isValueSelected('status', status.id)
                        ? isDarkTheme
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-600 text-white'
                        : isDarkTheme
                          ? 'bg-slate-700 border border-slate-600'
                          : 'bg-white border border-slate-300'
                    }`}>
                      {isValueSelected('status', status.id) && <Check size={10} />}
                    </div>
                    <span className={
                      status.id === 'active' ? 'text-green-500' :
                      status.id === 'inactive' ? 'text-slate-400' :
                      'text-yellow-500'
                    }>{status.label}</span>
                  </div>
                  <span className={`ml-2 flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                    isDarkTheme 
                      ? 'bg-slate-700 text-slate-300' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {statusCounts[status.id]}
                  </span>
                </div>
              ))}
            </div>
          )}
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

export default AdvancedServiceFilter;