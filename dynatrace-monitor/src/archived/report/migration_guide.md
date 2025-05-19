# Guide de Migration vers UnifiedFilterBadges

Ce document explique comment migrer du code existant qui utilise les composants `FilterBadges`, `ProcessFilterBadges` ou `ServiceFilterBadges` vers le nouveau composant unifié `UnifiedFilterBadges`.

## Introduction

Le nouveau composant `UnifiedFilterBadges` a été conçu pour remplacer les trois composants de filtrage précédents tout en offrant une API plus cohérente et flexible. Ce guide explique les changements nécessaires pour migrer votre code existant.

## Étapes de migration

### 1. Mise à jour des imports

Remplacez:
```tsx
import FilterBadges from '../components/common/FilterBadges';
// ou
import ProcessFilterBadges from '../components/common/ProcessFilterBadges';
// ou
import ServiceFilterBadges from '../components/common/ServiceFilterBadges';
```

Par:
```tsx
import UnifiedFilterBadges from '../components/common/UnifiedFilterBadges';
```

### 2. Adaptation des props

#### Migration depuis FilterBadges

**Ancien format**:
```tsx
interface FilterBadge {
  id: string;
  categoryId: string;
  categoryLabel: string;
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

<FilterBadges
  badges={badges}
  onRemoveBadge={handleRemoveBadge}
  onClearAllBadges={handleClearAllBadges}
/>
```

**Nouveau format**:
```tsx
// Transformation des badges
const unifiedBadges = badges.map(badge => ({
  id: badge.id,
  type: badge.categoryId,      // 'categoryId' devient 'type'
  value: badge.value,
  typeLabel: badge.categoryLabel, // 'categoryLabel' devient 'typeLabel'
  valueLabel: badge.label,     // 'label' devient 'valueLabel'
  icon: badge.icon,
  color: badge.color
}));

<UnifiedFilterBadges
  badges={unifiedBadges}
  onRemoveBadge={handleRemoveBadge}
  onClearAllBadges={handleClearAllBadges}
/>
```

#### Migration depuis ProcessFilterBadges

**Ancien format**:
```tsx
interface ProcessGroupFilter {
  type: 'technology' | 'process_type';
  values: string[];
}

<ProcessFilterBadges
  filters={filters}
  onRemoveFilter={handleRemoveFilter}
  onClearAllFilters={handleClearAllFilters}
/>
```

**Nouveau format**:
```tsx
// Transformation des filtres
const unifiedBadges = filters.flatMap(filter => 
  filter.values.map(value => ({
    id: `${filter.type}-${value}`,
    type: filter.type,
    value: value,
    // typeLabel et valueLabel sont générés automatiquement si non fournis
  }))
);

<UnifiedFilterBadges
  badges={unifiedBadges}
  onRemoveBadge={handleRemoveFilter}
  onClearAllBadges={handleClearAllFilters}
/>
```

#### Migration depuis ServiceFilterBadges

**Ancien format**:
```tsx
interface ServiceFilter {
  type: 'technology' | 'response_time' | 'median_response_time' | 'error_rate' | 'status';
  values: string[];
}

<ServiceFilterBadges
  filters={filters}
  onRemoveFilter={handleRemoveFilter}
  onClearAllFilters={handleClearAllFilters}
/>
```

**Nouveau format**:
```tsx
// Transformation des filtres
const unifiedBadges = filters.flatMap(filter => 
  filter.values.map(value => ({
    id: `${filter.type}-${value}`,
    type: filter.type,
    value: value,
    // typeLabel et valueLabel sont générés automatiquement si non fournis
  }))
);

<UnifiedFilterBadges
  badges={unifiedBadges}
  onRemoveBadge={handleRemoveFilter}
  onClearAllBadges={handleClearAllFilters}
/>
```

### 3. Options supplémentaires

Le nouveau composant `UnifiedFilterBadges` offre des fonctionnalités supplémentaires:

```tsx
<UnifiedFilterBadges
  badges={unifiedBadges}
  onRemoveBadge={handleRemoveBadge}
  onClearAllBadges={handleClearAllBadges}
  showLabel={false} // Option pour masquer le libellé "Filtres actifs:"
/>
```

## Fonctionnalités avancées

### Personnalisation des icônes et couleurs

Le composant `UnifiedFilterBadges` gère automatiquement les icônes et les couleurs en fonction du type et de la valeur du filtre. Cependant, vous pouvez toujours les personnaliser explicitement:

```tsx
const customBadge = {
  id: 'custom-filter',
  type: 'custom',
  value: 'value',
  typeLabel: 'Mon filtre', // Personnalisation du libellé du type
  valueLabel: 'Ma valeur', // Personnalisation du libellé de la valeur
  icon: <CustomIcon />,    // Personnalisation de l'icône
  color: 'bg-purple-900/30 text-purple-300 border-purple-700/50' // Personnalisation des classes de couleur
};
```

### Support des thèmes clair/sombre

Le composant utilise `useTheme` pour adapter automatiquement son apparence en fonction du thème (clair ou sombre) de l'application.

## Exemple complet

```tsx
import React, { useState } from 'react';
import UnifiedFilterBadges from '../components/common/UnifiedFilterBadges';
import { FilterIcon } from 'lucide-react';

const MyComponent = () => {
  const [filters, setFilters] = useState([
    {
      id: 'filter-1',
      type: 'status',
      value: 'active',
      // typeLabel et valueLabel sont générés automatiquement
    },
    {
      id: 'filter-2',
      type: 'technology',
      value: 'java',
      // L'icône sera automatiquement un symbole de café (☕)
    }
  ]);
  
  const handleRemoveFilter = (type, value) => {
    setFilters(filters.filter(f => !(f.type === type && f.value === value)));
  };
  
  const handleClearAllFilters = () => {
    setFilters([]);
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Liste filtrée</h2>
      
      <UnifiedFilterBadges
        badges={filters}
        onRemoveBadge={handleRemoveFilter}
        onClearAllBadges={handleClearAllFilters}
      />
      
      {/* Reste du composant */}
    </div>
  );
};

export default MyComponent;
```

## Conclusion

La migration vers `UnifiedFilterBadges` permet non seulement de réduire la duplication de code dans votre projet, mais offre également une API plus cohérente et des fonctionnalités de personnalisation plus avancées. Si vous rencontrez des problèmes pendant la migration, n'hésitez pas à consulter l'implémentation du nouveau composant pour mieux comprendre son fonctionnement.
