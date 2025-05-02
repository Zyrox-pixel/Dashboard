import React from 'react';
import { ManagementZone } from '../../api/types';
import { ExternalLink, Server, Database, BarChart, Laptop } from 'lucide-react';

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
      
      {/* Applications avec lien */}
      <div className="col-span-2">
        <div className="text-xs text-slate-500 mb-1 dark:text-slate-500">Applications:</div>
        <div className="flex items-center gap-1">
          <Laptop size={14} className="text-blue-400" />
          <a
            href={process.env.REACT_APP_DYNATRACE_HOST ? `${process.env.REACT_APP_DYNATRACE_HOST}${zone.applicationUrl}` : zone.applicationUrl || "#"} 
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); }}
            className="font-medium text-blue-400 hover:text-blue-300 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <span>{zone.apps !== null && zone.apps !== undefined ? String(zone.apps) : "N/A"}</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
      
      {/* Services avec lien */}
      <div className="col-span-2">
        <div className="text-xs text-slate-500 mb-1 dark:text-slate-500">Services:</div>
        <div className="flex items-center gap-1">
          <BarChart size={14} className="text-green-400" />
          <a
            href={process.env.REACT_APP_DYNATRACE_HOST ? `${process.env.REACT_APP_DYNATRACE_HOST}${zone.serviceUrl}` : zone.serviceUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); }}
            className="font-medium text-green-400 hover:text-green-300 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
          >
            <span>{zone.services !== null && zone.services !== undefined ? String(zone.services) : "N/A"}</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
      
      {/* Hôtes avec lien */}
      <div className="col-span-2">
        <div className="text-xs text-slate-500 mb-1 dark:text-slate-500">Hôtes:</div>
        <div className="flex items-center gap-1">
          <Server size={14} className="text-purple-400" />
          <a
            href={process.env.REACT_APP_DYNATRACE_HOST ? `${process.env.REACT_APP_DYNATRACE_HOST}${zone.hostUrl}` : zone.hostUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); }}
            className="font-medium text-purple-400 hover:text-purple-300 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1"
          >
            <span>{zone.hosts !== null && zone.hosts !== undefined ? String(zone.hosts) : "N/A"}</span>
            <ExternalLink size={10} />
          </a>
        </div>
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
      
      {/* Statut */}
      <div className="col-span-1">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
            zone.status === 'healthy' 
              ? 'bg-green-500 shadow-sm shadow-green-500/50 dark:bg-green-500 dark:shadow-green-500/50' 
              : 'bg-yellow-500 shadow-sm shadow-yellow-500/50 dark:bg-yellow-500 dark:shadow-yellow-500/50'
          }`}></span>
          <span className="text-xs text-slate-400 dark:text-slate-400">{zone.status === 'healthy' ? 'Sain' : 'Dégradé'}</span>
        </div>
      </div>
      
      {/* Bouton avec lien Dynatrace */}
      <div className="col-span-1">
        <a 
          href={process.env.REACT_APP_DYNATRACE_HOST ? `${process.env.REACT_APP_DYNATRACE_HOST}${zone.dt_url}` : zone.dt_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-red-900/20 text-red-400 text-xs hover:bg-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <ExternalLink size={10} />
          <span>Dynatrace</span>
        </a>
      </div>
    </div>
  );
};

export default ManagementZoneRow;