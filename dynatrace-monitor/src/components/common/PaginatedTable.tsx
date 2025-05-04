import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Interface pour définir la structure des colonnes du tableau
 */
export interface Column<T> {
  key: string;
  label: string | React.ReactNode;
  className?: string;
  cellClassName?: string;
  render?: (item: T) => React.ReactNode;
}

/**
 * Props pour le composant PaginatedTable
 */
interface PaginatedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  emptyMessage?: string;
}

/**
 * Composant de tableau paginé optimisé
 * Gère efficacement l'affichage des grandes quantités de données
 */
const PaginatedTable = <T extends { id?: string }>({
  data,
  columns,
  pageSize = 1000, // Augmenté à 1000 éléments par page pour afficher toutes les applications
  emptyMessage = "Aucune donnée disponible"
}: PaginatedTableProps<T>) => {
  const { isDarkTheme } = useTheme();
  const [page, setPage] = useState(0);
  
  // Calculer les données pour la page actuelle (mémorisé)
  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);
  
  // Calculer le nombre total de pages (mémorisé)
  const totalPages = useMemo(() => Math.ceil(data.length / pageSize), [data.length, pageSize]);
  
  // Fonction optimisée pour changer de page
  const handlePageChange = useCallback((newPage: number) => {
    setPage(Math.max(0, Math.min(newPage, totalPages - 1)));
  }, [totalPages]);
  
  // Calculer les boutons de pagination à afficher
  const paginationButtons = useMemo(() => {
    // Afficher au maximum 5 boutons de pagination
    const buttons = [];
    let startPage: number;
    
    if (totalPages <= 5) {
      // Si moins de 5 pages, afficher toutes les pages
      startPage = 0;
    } else if (page < 2) {
      // Si on est au début, afficher les 5 premières pages
      startPage = 0;
    } else if (page > totalPages - 3) {
      // Si on est à la fin, afficher les 5 dernières pages
      startPage = totalPages - 5;
    } else {
      // Sinon, centrer sur la page actuelle
      startPage = page - 2;
    }
    
    // Créer les boutons
    for (let i = 0; i < Math.min(5, totalPages); i++) {
      const pageNum = startPage + i;
      if (pageNum >= 0 && pageNum < totalPages) {
        buttons.push(
          <button
            key={pageNum}
            onClick={() => handlePageChange(pageNum)}
            className={`w-8 h-8 flex items-center justify-center rounded text-sm ${
              page === pageNum
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            {pageNum + 1}
          </button>
        );
      }
    }
    
    return buttons;
  }, [totalPages, page, handlePageChange]);
  
  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className={`${isDarkTheme ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
            {columns.map((col) => (
              <th 
                key={col.key} 
                className={`text-left p-3 font-medium text-xs text-slate-400 ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => (
              <tr 
                key={item.id || `row-${index}`} 
                className={`${isDarkTheme ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}
              >
                {columns.map((col) => (
                  <td 
                    key={`${item.id || index}-${col.key}`} 
                    className={`p-3 ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Pagination controls - only show if we have multiple pages */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-3 border-t border-slate-700 mt-2">
          <div className="text-xs text-slate-400">
            Affichage de {page * pageSize + 1} à {Math.min((page + 1) * pageSize, data.length)} sur {data.length} éléments
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0}
              className={`w-8 h-8 flex items-center justify-center rounded ${
                page === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:bg-slate-700'
              }`}
              aria-label="Page précédente"
            >
              <ChevronLeft size={14} />
            </button>
            
            {paginationButtons}
            
            <button 
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages - 1}
              className={`w-8 h-8 flex items-center justify-center rounded ${
                page === totalPages - 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:bg-slate-700'
              }`}
              aria-label="Page suivante"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginatedTable;