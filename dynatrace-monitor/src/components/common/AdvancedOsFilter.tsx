// src/components/common/AdvancedOsFilter.tsx
import React, { useState, useMemo } from 'react';
import { X, Check, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Host } from '../../api/types';

interface OsVersion {
  osType: string;
  version: string;
  count: number;
}

interface OsFilter {
  type: string;
  versions: string[];
}

interface AdvancedOsFilterProps {
  hosts: Host[];
  selectedFilters: OsFilter[];
  onFilterChange: (filters: OsFilter[]) => void;
  onClose: () => void;
}

const AdvancedOsFilter: React.FC<AdvancedOsFilterProps> = ({
  hosts,
  selectedFilters,
  onFilterChange,
  onClose
}) => {
  const { isDarkTheme } = useTheme();
  const [expandedOS, setExpandedOS] = useState<string | null>(null);
  
  // Extract all OS types and versions
  const osVersions = useMemo(() => {
    const versions: OsVersion[] = [];
    const osTypesMap = new Map<string, Set<string>>();
    
    // First pass: collect all OS types and versions
    hosts.forEach(host => {
      if (!host.os_version) return;
      
      // Determine OS type
      let osType = "Autre";
      if (host.os_version.toLowerCase().includes('linux')) {
        osType = "Linux";
      } else if (host.os_version.toLowerCase().includes('windows')) {
        osType = "Windows";
      } else if (host.os_version.toLowerCase().includes('unix')) {
        osType = "Unix";
      } else if (host.os_version.toLowerCase().includes('aix')) {
        osType = "AIX";
      } else if (host.os_version.toLowerCase().includes('mac') || host.os_version.toLowerCase().includes('darwin')) {
        osType = "MacOS";
      }
      
      // Extract version
      let version = host.os_version;
      
      // Add to map
      if (!osTypesMap.has(osType)) {
        osTypesMap.set(osType, new Set<string>());
      }
      osTypesMap.get(osType)?.add(version);
    });
    
    // Second pass: count occurrences and create objects
    Array.from(osTypesMap.entries()).forEach(([osType, versionSet]) => {
      versionSet.forEach(version => {
        const count = hosts.filter(host => 
          host.os_version === version
        ).length;
        
        versions.push({
          osType,
          version,
          count
        });
      });
    });
    
    return versions;
  }, [hosts]);
  
  // Group versions by OS type
  const groupedVersions = useMemo(() => {
    const grouped = new Map<string, OsVersion[]>();
    
    osVersions.forEach(version => {
      if (!grouped.has(version.osType)) {
        grouped.set(version.osType, []);
      }
      grouped.get(version.osType)?.push(version);
    });
    
    // Sort versions within each OS type by count (descending)
    grouped.forEach((versions, osType) => {
      grouped.set(osType, versions.sort((a, b) => b.count - a.count));
    });
    
    return grouped;
  }, [osVersions]);
  
  // Get unique OS types
  const osTypes = useMemo(() => 
    Array.from(groupedVersions.keys()).sort(), 
    [groupedVersions]
  );
  
  // Check if an OS type is selected (all or some versions)
  const isOsTypeSelected = (osType: string): 'all' | 'some' | 'none' => {
    const filter = selectedFilters.find(f => f.type === osType);
    if (!filter) return 'none';
    
    const totalVersions = groupedVersions.get(osType)?.length || 0;
    if (filter.versions.length === 0) return 'all'; // All versions selected
    if (filter.versions.length === totalVersions) return 'all';
    return 'some';
  };
  
  // Check if a specific version is selected
  const isVersionSelected = (osType: string, version: string): boolean => {
    const filter = selectedFilters.find(f => f.type === osType);
    if (!filter) return false;
    if (filter.versions.length === 0) return true; // All versions selected
    return filter.versions.includes(version);
  };
  
  // Toggle OS type selection
  const toggleOsType = (osType: string) => {
    const currentState = isOsTypeSelected(osType);
    const newFilters = [...selectedFilters.filter(f => f.type !== osType)];
    
    if (currentState === 'none' || currentState === 'some') {
      // Select all versions
      newFilters.push({ type: osType, versions: [] });
    }
    // If 'all' is current state, removing the filter deselects it
    
    onFilterChange(newFilters);
  };
  
  // Toggle specific version selection
  const toggleVersion = (osType: string, version: string) => {
    const filterIndex = selectedFilters.findIndex(f => f.type === osType);
    const newFilters = [...selectedFilters];
    
    if (filterIndex === -1) {
      // OS type not in filters, add it with this version
      const allVersions = groupedVersions.get(osType)?.map(v => v.version) || [];
      const versionsToAdd = allVersions.filter(v => v !== version);
      newFilters.push({ type: osType, versions: versionsToAdd });
    } else {
      // OS type exists in filters
      const filter = {...newFilters[filterIndex]};
      const allVersions = groupedVersions.get(osType)?.map(v => v.version) || [];
      
      if (filter.versions.length === 0) {
        // All versions are selected, now exclude this one
        filter.versions = allVersions.filter(v => v !== version);
      } else if (filter.versions.includes(version)) {
        // This version is excluded, remove it from exclusions (include it)
        filter.versions = filter.versions.filter(v => v !== version);
        // If no exclusions left, simplify to "all versions"
        if (filter.versions.length === 0 || filter.versions.length === allVersions.length) {
          filter.versions = [];
        }
      } else {
        // This version is included, add it to exclusions
        filter.versions.push(version);
      }
      
      newFilters[filterIndex] = filter;
    }
    
    onFilterChange(newFilters);
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    onFilterChange([]);
  };
  
  // Get the total count of selected OS versions
  const getSelectedCount = (): number => {
    let count = 0;
    
    selectedFilters.forEach(filter => {
      if (filter.versions.length === 0) {
        // All versions selected
        count += groupedVersions.get(filter.type)?.length || 0;
      } else {
        // Only count specific versions
        const totalVersions = groupedVersions.get(filter.type)?.length || 0;
        count += totalVersions - filter.versions.length;
      }
    });
    
    return count;
  };
  
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
        return <Filter size={14} className="text-slate-400" />;
    }
  };
  
  // Render a badge with the count of selected filters
  const renderSelectedBadge = () => {
    const count = getSelectedCount();
    if (count === 0) return null;
    
    return (
      <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full ${
        isDarkTheme
          ? 'bg-indigo-900/50 text-indigo-300'
          : 'bg-indigo-100 text-indigo-700'
      }`}>
        {count}
      </span>
    );
  };
  
  return (
    <div className={`p-4 rounded-lg shadow-lg border ${
      isDarkTheme 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-white border-slate-200'
    } max-w-3xl w-full`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Filter className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} size={18} />
          <h3 className="font-medium">Filtrer par système d'exploitation</h3>
          {renderSelectedBadge()}
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
      
      <div className="space-y-2">
        {osTypes.map(osType => {
          const versions = groupedVersions.get(osType) || [];
          const selectionState = isOsTypeSelected(osType);
          const isExpanded = expandedOS === osType;
          
          return (
            <div 
              key={osType} 
              className={`border rounded-lg overflow-hidden ${
                isDarkTheme 
                  ? 'border-slate-700' 
                  : 'border-slate-200'
              }`}
            >
              {/* OS Type Header */}
              <div 
                className={`flex items-center justify-between p-3 cursor-pointer ${
                  selectionState !== 'none'
                    ? isDarkTheme 
                      ? 'bg-indigo-900/30 text-indigo-300' 
                      : 'bg-indigo-50 text-indigo-700'
                    : isDarkTheme
                      ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
                onClick={() => toggleOsType(osType)}
              >
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center h-6 w-6 rounded ${
                    selectionState !== 'none'
                      ? isDarkTheme
                        ? 'bg-indigo-600/50'
                        : 'bg-indigo-100'
                      : isDarkTheme
                        ? 'bg-slate-800'
                        : 'bg-white'
                  }`}>
                    {getOsTypeIcon(osType)}
                  </div>
                  
                  <span className="font-medium">{osType}</span>
                  
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
                    ({versions.length} version{versions.length !== 1 ? 's' : ''})
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectionState !== 'none' && (
                    <Check size={16} className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} />
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedOS(isExpanded ? null : osType);
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
              
              {/* Versions List */}
              {isExpanded && (
                <div className={`p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ${
                  isDarkTheme ? 'bg-slate-800' : 'bg-white'
                }`}>
                  {versions.map(version => (
                    <div 
                      key={version.version} 
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        isVersionSelected(osType, version.version)
                          ? isDarkTheme 
                            ? 'bg-indigo-900/20 border-indigo-700 text-indigo-300' 
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : isDarkTheme
                            ? 'bg-slate-700/30 border-slate-700 text-slate-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                      } border cursor-pointer hover:border-indigo-400`}
                      onClick={() => toggleVersion(osType, version.version)}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${
                          isVersionSelected(osType, version.version)
                            ? isDarkTheme
                              ? 'bg-indigo-600 text-white'
                              : 'bg-indigo-600 text-white'
                            : isDarkTheme
                              ? 'bg-slate-700 border border-slate-600'
                              : 'bg-white border border-slate-300'
                        }`}>
                          {isVersionSelected(osType, version.version) && <Check size={10} />}
                        </div>
                        <span className="truncate" title={version.version}>{version.version}</span>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isDarkTheme 
                          ? 'bg-slate-700 text-slate-300' 
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {version.count}
                      </span>
                    </div>
                  ))}
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

export default AdvancedOsFilter;