import React, { useState, useMemo } from 'react';
import { X, Check, ChevronDown, ChevronUp, Filter, Info } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface FilterItem {
  id: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
  count?: number;
  color?: string;
}

export interface FilterCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: FilterItem[];
}

export interface FilterValue {
  categoryId: string;
  values: string[];
}

interface AdvancedFilterProps {
  title: string;
  description: string;
  categories: FilterCategory[];
  selectedFilters: FilterValue[];
  onFilterChange: (filters: FilterValue[]) => void;
  onClose: () => void;
}

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  title,
  description,
  categories,
  selectedFilters,
  onFilterChange,
  onClose
}) => {
  const { isDarkTheme } = useTheme();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    categories.length > 0 ? categories[0].id : null
  );
  
  // Vérifier si une valeur est sélectionnée pour une catégorie
  const isValueSelected = (categoryId: string, value: string): boolean => {
    const filter = selectedFilters.find(f => f.categoryId === categoryId);
    if (!filter) return false;
    return filter.values.includes(value);
  };
  
  // Déterminer l'état de sélection d'une catégorie entière
  const getCategorySelectionState = (categoryId: string): 'all' | 'some' | 'none' => {
    const filter = selectedFilters.find(f => f.categoryId === categoryId);
    if (!filter) return 'none';
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'none';
    
    if (filter.values.length === 0) return 'all'; // Toutes les valeurs sélectionnées
    if (filter.values.length === category.items.length) return 'all';
    if (filter.values.length > 0) return 'some';
    
    return 'none';
  };
  
  // Basculer la sélection d'une catégorie entière
  const toggleCategory = (categoryId: string) => {
    const currentState = getCategorySelectionState(categoryId);
    const newFilters = [...selectedFilters.filter(f => f.categoryId !== categoryId)];
    
    if (currentState === 'none' || currentState === 'some') {
      // Sélectionner toutes les valeurs (tableau vide signifie "tout sélectionné")
      newFilters.push({ categoryId, values: [] });
    }
    // Si 'all' est l'état actuel, supprimer le filtre le désélectionne
    
    onFilterChange(newFilters);
  };
  
  // Basculer la sélection d'une valeur spécifique
  const toggleValue = (categoryId: string, value: string) => {
    const filterIndex = selectedFilters.findIndex(f => f.categoryId === categoryId);
    const newFilters = [...selectedFilters];
    
    if (filterIndex === -1) {
      // Catégorie non présente dans les filtres, ajouter cette valeur spécifique
      newFilters.push({ 
        categoryId, 
        values: [value]
      });
    } else {
      // Catégorie existe dans les filtres
      const filter = {...newFilters[filterIndex]};
      const category = categories.find(c => c.id === categoryId);
      const allValues = category?.items.map(item => item.value) || [];
      
      if (filter.values.length === 0) {
        // Toutes les valeurs sont actuellement sélectionnées, exclure toutes sauf celle-ci
        const valuesToKeep = [value];
        filter.values = valuesToKeep;
      } else if (filter.values.includes(value)) {
        // Cette valeur est déjà sélectionnée, la désélectionner
        filter.values = filter.values.filter(v => v !== value);
        
        // Si plus aucune valeur, supprimer le filtre complètement
        if (filter.values.length === 0) {
          newFilters.splice(filterIndex, 1);
        } else {
          newFilters[filterIndex] = filter;
        }
      } else {
        // Cette valeur n'est pas sélectionnée, la sélectionner
        filter.values.push(value);
        newFilters[filterIndex] = filter;
      }
    }
    
    onFilterChange(newFilters);
  };
  
  // Effacer tous les filtres
  const clearAllFilters = () => {
    onFilterChange([]);
  };
  
  // Obtenir le nombre total de filtres sélectionnés
  const getSelectedCount = (): number => {
    let count = 0;
    
    selectedFilters.forEach(filter => {
      const category = categories.find(c => c.id === filter.categoryId);
      if (!category) return;
      
      if (filter.values.length === 0) {
        // Toutes les valeurs sélectionnées
        count += 1;
      } else {
        // Valeurs spécifiques sélectionnées
        count += filter.values.length;
      }
    });
    
    return count;
  };
  
  return (
    <div className={`p-4 rounded-lg shadow-lg border max-h-[90vh] overflow-y-auto ${
      isDarkTheme 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-white border-slate-200'
    } w-full`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Filter className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} size={18} />
          <h3 className="font-medium">{title}</h3>
          {getSelectedCount() > 0 && (
            <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full ${
              isDarkTheme
                ? 'bg-indigo-900/50 text-indigo-300'
                : 'bg-indigo-100 text-indigo-700'
            }`}>
              {getSelectedCount()}
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
          {description}
        </div>
      </div>
      
      {/* Catégories de filtres */}
      <div className="space-y-3">
        {categories.map(category => {
          const selectionState = getCategorySelectionState(category.id);
          const isExpanded = expandedCategory === category.id;
          
          return (
            <div 
              key={category.id} 
              className={`border rounded-lg overflow-hidden ${
                isDarkTheme ? 'border-slate-700' : 'border-slate-200'
              }`}
            >
              <div 
                className={`flex items-center justify-between p-3 cursor-pointer ${
                  isExpanded
                    ? isDarkTheme 
                      ? 'bg-indigo-900/30 text-indigo-300' 
                      : 'bg-indigo-50 text-indigo-700'
                    : isDarkTheme
                      ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
              >
                <div className="flex items-center gap-2">
                  {category.icon}
                  <span className="font-medium">{category.label}</span>
                  
                  {selectionState === 'some' && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      isDarkTheme 
                        ? 'bg-indigo-800 text-indigo-300' 
                        : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      Partiel
                    </span>
                  )}
                  
                  <span className="text-xs opacity-70">
                    ({category.items.length} {category.items.length !== 1 ? 'éléments' : 'élément'})
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategory(category.id);
                    }}
                    className={`px-2 py-0.5 rounded text-xs ${
                      selectionState !== 'none'
                        ? isDarkTheme 
                          ? 'bg-indigo-700 text-white' 
                          : 'bg-indigo-600 text-white'
                        : isDarkTheme 
                          ? 'bg-slate-600 text-slate-300' 
                          : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {selectionState === 'none' ? 'Sélectionner tout' : 'Désélectionner'}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCategory(isExpanded ? null : category.id);
                    }}
                    className={`p-1 rounded-full ${
                      isDarkTheme 
                        ? 'hover:bg-slate-600 text-slate-300' 
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
              
              {/* Liste des éléments */}
              {isExpanded && (
                <div className={`p-2 grid grid-cols-1 md:grid-cols-2 gap-2 ${
                  isDarkTheme ? 'bg-slate-800' : 'bg-white'
                }`}>
                  {category.items.map(item => {
                    const isSelected = isValueSelected(category.id, item.value);
                    return (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between p-2 rounded text-sm ${
                          isSelected
                            ? isDarkTheme 
                              ? 'bg-indigo-900/20 border-indigo-700 text-indigo-300' 
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : isDarkTheme
                              ? 'bg-slate-700/30 border-slate-700 text-slate-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                        } border cursor-pointer hover:border-indigo-400`}
                        onClick={() => toggleValue(category.id, item.value)}
                        title={item.label}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${
                            isSelected
                              ? isDarkTheme
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-600 text-white'
                              : isDarkTheme
                                ? 'bg-slate-700 border border-slate-600'
                                : 'bg-white border border-slate-300'
                          }`}>
                            {isSelected && <Check size={10} />}
                          </div>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {item.icon}
                            <span className="block text-ellipsis overflow-hidden">{item.label}</span>
                          </div>
                        </div>
                        {item.count !== undefined && (
                          <span className={`ml-2 flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                            isDarkTheme 
                              ? 'bg-slate-700 text-slate-300' 
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {item.count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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

export default AdvancedFilter;