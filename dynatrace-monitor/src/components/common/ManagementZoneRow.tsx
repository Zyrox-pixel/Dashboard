import React from 'react';
import { ManagementZone } from '../../api/types';

interface ManagementZoneRowProps {
  zone: ManagementZone;
  onZoneClick: (zoneId: string) => void;
}

const ManagementZoneRow: React.FC<ManagementZoneRowProps> = ({ zone, onZoneClick }) => {
  return (
    <div 
      onClick={() => onZoneClick(zone.id)}
      className="border-t first:border-t-0 border-slate-700 py-3 px-2 grid grid-cols-12 gap-2 items-center hover:bg-slate-700/20 cursor-pointer dark:border-slate-700 dark:hover:bg-slate-700/20"
    >
      {/* Icône et nom */}
      <div className="col-span-3 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
          zone.status === 'healthy' 
            ? 'bg-green-500/10 text-green-400 dark:bg-green-500/10 dark:text-green-400' 
            : 'bg-red-500/10 text-red-400 dark:bg-red-500/10 dark:text-red-400'
        }`}>
          {zone.icon}
        </div>
        <div>
          <div className="font-semibold flex items-center gap-1.5 text-white dark:text-white">
            {zone.name}
            {zone.problemCount > 0 && (
              <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold dark:bg-red-500 dark:text-white">
                {zone.problemCount}
              </div>
            )}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-400">{zone.code}</div>
        </div>
      </div>
      
      {/* Applications */}
      <div className="col-span-2 text-right">
        <div className="text-xs text-slate-500 mb-1 dark:text-slate-500">Applications:</div>
        <div className="font-medium text-white dark:text-white">{zone.apps}</div>
      </div>
      
      {/* Services */}
      <div className="col-span-2 text-right">
        <div className="text-xs text-slate-500 mb-1 dark:text-slate-500">Services:</div>
        <div className="font-medium text-white dark:text-white">
          {zone.services === 0 && zone.hosts > 0 ? (
            <span className="text-yellow-400">Chargement...</span>
          ) : (
            zone.services
          )}
        </div>
      </div>
      
      {/* Hôtes */}
      <div className="col-span-2 text-right">
        <div className="text-xs text-slate-500 mb-1 dark:text-slate-500">Hôtes:</div>
        <div className="font-medium text-white dark:text-white">{zone.hosts}</div>
      </div>
      
      {/* Disponibilité */}
      <div className="col-span-2 text-right">
        <div className="text-xs text-slate-500 mb-1 dark:text-slate-500">Disponibilité:</div>
        <div className={`font-medium ${
          parseFloat(zone.availability) < 99 
            ? 'text-yellow-500 dark:text-yellow-500' 
            : 'text-green-500 dark:text-green-500'
        }`}>{zone.availability}</div>
      </div>
      
      {/* Statut et bouton */}
      <div className="col-span-1 flex items-center">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
            zone.status === 'healthy' 
              ? 'bg-green-500 shadow-sm shadow-green-500/50 dark:bg-green-500 dark:shadow-green-500/50' 
              : 'bg-yellow-500 shadow-sm shadow-yellow-500/50 dark:bg-yellow-500 dark:shadow-yellow-500/50'
          }`}></span>
          <span className="text-xs text-slate-400 dark:text-slate-400">{zone.status === 'healthy' ? 'Sain' : 'Dégradé'}</span>
        </div>
      </div>
      
      <div className="col-span-1">
        <a 
          href="#" 
          className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-red-900/20 text-red-400 text-xs hover:bg-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <span>Détails</span>
        </a>
      </div>
    </div>
  );
};

export default ManagementZoneRow;