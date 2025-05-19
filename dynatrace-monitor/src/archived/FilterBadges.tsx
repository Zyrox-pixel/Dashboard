import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface FilterBadge {
  id: string;
  categoryId: string;
  categoryLabel: string; 
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface FilterBadgesProps {
  badges: FilterBadge[];
  onRemoveBadge: (categoryId: string, value?: string) => void;
  onClearAllBadges: () => void;
}

const FilterBadges: React.FC<FilterBadgesProps> = ({
  badges,
  onRemoveBadge,
  onClearAllBadges
}) => {
  const { isDarkTheme } = useTheme();
  
  if (badges.length === 0) {
    return null;
  }
  
  // Fonction pour obtenir la couleur selon le type et la valeur du filtre
  const getBadgeColor = (badge: FilterBadge): string => {
    // Si une couleur spécifique est fournie, l'utiliser
    if (badge.color) {
      return badge.color;
    }
    
    // Couleurs par défaut
    if (isDarkTheme) {
      return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50';
    } else {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };
  
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      <span className={`text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
        Filtres actifs:
      </span>
      
      {badges.map(badge => (
        <span 
          key={`${badge.categoryId}-${badge.value}`}
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${getBadgeColor(badge)}`}
        >
          {badge.icon}
          <span className="font-medium">{badge.categoryLabel}:</span>
          <span>{badge.label}</span>
          <button
            onClick={() => onRemoveBadge(badge.categoryId, badge.value)}
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

export default FilterBadges;