import React, { useState } from 'react';
import { Layers, Filter, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import ManagementZoneRow from '../common/ManagementZoneRow';
import { ManagementZone } from '../../api/types';
import { useTheme } from '../../contexts/ThemeContext';

interface ManagementZoneListProps {
  zones: ManagementZone[];
  onZoneClick: (zoneId: string) => void;
}

const ManagementZoneList: React.FC<ManagementZoneListProps> = ({ zones, onZoneClick }) => {
  const { isDarkTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Limite à 20 management zones par page
  
  // Pagination
  const totalPages = Math.ceil(zones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, zones.length);
  const currentZones = zones.slice(startIndex, endIndex);
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  return (
    <section className={`p-4 rounded-lg ${
      isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    } border`}>
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Layers className="text-red-500" size={18} />
          <h2 className="text-lg font-semibold">Management Zones Vital for Group</h2>
        </div>
        <button className={`flex items-center gap-1 px-3 py-1 rounded-lg border text-sm ${
          isDarkTheme ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
        }`}>
          <Filter size={12} />
          <span>Filtrer</span>
        </button>
      </div>
      
      <div className={`p-3 mb-4 rounded-md flex items-start gap-3 ${
        isDarkTheme ? 'bg-slate-700/50' : 'bg-slate-100'
      } text-sm`}>
        <div className="text-blue-500 mt-0.5">
          <Info size={14} />
        </div>
        <div>
          Cliquez sur une Management Zone pour voir les détails de ses applications, services et hôtes.
        </div>
      </div>
      
      {/* Liste des Management Zones */}
      <div className={`mb-4 rounded-md overflow-hidden ${
        isDarkTheme ? 'bg-slate-800/80' : 'bg-white'
      }`}>
        {currentZones.map((zone) => (
          <ManagementZoneRow 
            key={zone.id} 
            zone={zone} 
            onZoneClick={onZoneClick}
          />
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-3 border-t border-slate-700">
          <div className="text-xs text-slate-400">
            Affichage de {startIndex + 1} à {endIndex} sur {zones.length} zones
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`w-8 h-8 flex items-center justify-center rounded ${
                currentPage === 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:bg-slate-700'
              }`}
            >
              <ChevronLeft size={14} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-8 h-8 flex items-center justify-center rounded text-sm ${
                  currentPage === pageNum
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700'
                }`}
              >
                {pageNum}
              </button>
            ))}
            
            <button 
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`w-8 h-8 flex items-center justify-center rounded ${
                currentPage === totalPages
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:bg-slate-700'
              }`}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ManagementZoneList;