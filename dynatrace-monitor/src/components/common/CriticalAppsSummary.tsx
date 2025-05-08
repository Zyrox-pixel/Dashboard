import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Award, Eye, ArrowRight, AlertTriangle, Server, Code, Activity } from 'lucide-react';
import { ManagementZone, Problem } from '../../api/types';

interface CriticalAppsSummaryProps {
  vfgZones: ManagementZone[];
  vfeZones: ManagementZone[];
  activeProblems: Problem[];
  onZoneClick: (zoneId: string, type: 'vfg' | 'vfe') => void;
  className?: string;
}

/**
 * Composant offrant une vue comparative des applications critiques
 * Permet de voir et d'accéder rapidement aux deux catégories d'applications
 * depuis n'importe quelle page
 */
const CriticalAppsSummary: React.FC<CriticalAppsSummaryProps> = ({ 
  vfgZones, 
  vfeZones, 
  activeProblems,
  onZoneClick,
  className = ''
}) => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<'vfg' | 'vfe' | null>(null);
  const [hoverZone, setHoverZone] = useState<string | null>(null);
  
  // Calcul des statistiques pour VFG
  const vfgStats = {
    totalZones: vfgZones.length,
    zonesWithProblems: vfgZones.filter(zone => zone.problemCount > 0).length,
    totalProblems: vfgZones.reduce((total, zone) => total + zone.problemCount, 0),
    criticalZones: vfgZones.filter(zone => zone.problemCount >= 3).length,
    totalHosts: vfgZones.reduce((total, zone) => total + zone.hosts, 0),
    totalServices: vfgZones.reduce((total, zone) => total + zone.services, 0),
  };
  
  // Calcul des statistiques pour VFE
  const vfeStats = {
    totalZones: vfeZones.length,
    zonesWithProblems: vfeZones.filter(zone => zone.problemCount > 0).length,
    totalProblems: vfeZones.reduce((total, zone) => total + zone.problemCount, 0),
    criticalZones: vfeZones.filter(zone => zone.problemCount >= 3).length,
    totalHosts: vfeZones.reduce((total, zone) => total + zone.hosts, 0),
    totalServices: vfeZones.reduce((total, zone) => total + zone.services, 0),
  };
  
  const handleNavigate = (path: string) => {
    navigate(path);
  };
  
  // Obtenir détails survolés d'une zone
  const getHoveredZoneDetails = () => {
    if (!hoverZone) return null;
    
    const zone = [...vfgZones, ...vfeZones].find(z => z.id === hoverZone);
    if (!zone) return null;
    
    const zoneProblems = activeProblems.filter(p => p.zone.includes(zone.name));
    
    return { zone, problems: zoneProblems };
  };
  
  const hoveredZoneDetails = getHoveredZoneDetails();
  
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg overflow-hidden ${className}`}>
      <div className="flex flex-col md:flex-row">
        {/* Section VFG */}
        <div className={`flex-1 relative transition-all ${expandedSection === 'vfe' ? 'md:w-1/5' : ''}`}>
          <div 
            className={`p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-indigo-900/20 
                      cursor-pointer transition-all ${expandedSection === 'vfg' ? 'bg-gradient-to-r from-slate-800 to-indigo-800/40' : ''}`}
            onClick={() => setExpandedSection(expandedSection === 'vfg' ? null : 'vfg')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-indigo-900/30 text-indigo-400 border border-indigo-700/30">
                  <Star size={18} />
                </div>
                <h3 className="ml-3 font-bold text-white">Vital for Group</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center text-indigo-300 text-sm">
                  <Eye size={14} className="mr-1" />
                  <span>Aperçu</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate('/vfg');
                  }}
                  className="px-2 py-1 bg-indigo-600 text-white text-xs rounded flex items-center"
                >
                  <span>Voir</span>
                  <ArrowRight size={12} className="ml-1" />
                </button>
              </div>
            </div>
            
            {/* Statistiques compactes toujours visibles */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="flex items-center py-1 px-2 rounded bg-slate-700/50 border border-slate-600/50">
                <AlertTriangle size={14} className="text-red-400 mr-2" />
                <div className="text-xs">
                  <div className="text-red-300 font-medium">{vfgStats.totalProblems}</div>
                  <div className="text-slate-400">Problèmes</div>
                </div>
              </div>
              <div className="flex items-center py-1 px-2 rounded bg-slate-700/50 border border-slate-600/50">
                <Server size={14} className="text-blue-400 mr-2" />
                <div className="text-xs">
                  <div className="text-blue-300 font-medium">{vfgStats.totalHosts}</div>
                  <div className="text-slate-400">Hosts</div>
                </div>
              </div>
              <div className="flex items-center py-1 px-2 rounded bg-slate-700/50 border border-slate-600/50">
                <Code size={14} className="text-emerald-400 mr-2" />
                <div className="text-xs">
                  <div className="text-emerald-300 font-medium">{vfgStats.totalServices}</div>
                  <div className="text-slate-400">Services</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contenu étendu VFG */}
          <div className={`overflow-hidden transition-all duration-300 ${expandedSection === 'vfg' ? 'max-h-96' : 'max-h-0'}`}>
            <div className="p-4 bg-slate-800">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Applications critiques ({vfgStats.totalZones})</h4>
              
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {vfgZones.map(zone => (
                  <div 
                    key={zone.id} 
                    className={`p-2 rounded border transition-all cursor-pointer
                              ${zone.problemCount > 0 
                                ? 'bg-red-900/20 border-red-800/40 hover:bg-red-900/30' 
                                : 'bg-slate-700/30 border-slate-600/40 hover:bg-slate-700/50'}`}
                    onClick={() => onZoneClick(zone.id, 'vfg')}
                    onMouseEnter={() => setHoverZone(zone.id)}
                    onMouseLeave={() => setHoverZone(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {zone.icon || <Star size={14} className="text-indigo-400" />}
                        <span className="ml-2 text-sm text-white truncate max-w-[150px]">{zone.name}</span>
                      </div>
                      <div className="flex items-center">
                        {zone.problemCount > 0 && (
                          <div className="px-1.5 py-0.5 bg-red-900/40 text-red-300 text-xs rounded-md border border-red-800/40">
                            {zone.problemCount}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center mt-1 text-xs">
                      <div className="flex items-center text-blue-400 mr-3">
                        <Server size={12} className="mr-1" />
                        <span>{zone.hosts}</span>
                      </div>
                      <div className="flex items-center text-emerald-400">
                        <Code size={12} className="mr-1" />
                        <span>{zone.services}</span>
                      </div>
                      <div className="ml-auto text-xs text-slate-400">
                        {zone.availability}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Section VFE */}
        <div className={`flex-1 relative transition-all ${expandedSection === 'vfg' ? 'md:w-1/5' : ''}`}>
          <div 
            className={`p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-amber-900/20 
                      cursor-pointer transition-all ${expandedSection === 'vfe' ? 'bg-gradient-to-r from-slate-800 to-amber-800/40' : ''}`}
            onClick={() => setExpandedSection(expandedSection === 'vfe' ? null : 'vfe')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-amber-900/30 text-amber-400 border border-amber-700/30">
                  <Award size={18} />
                </div>
                <h3 className="ml-3 font-bold text-white">Vital for Enterprise</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center text-amber-300 text-sm">
                  <Eye size={14} className="mr-1" />
                  <span>Aperçu</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate('/vfe');
                  }}
                  className="px-2 py-1 bg-amber-600 text-white text-xs rounded flex items-center"
                >
                  <span>Voir</span>
                  <ArrowRight size={12} className="ml-1" />
                </button>
              </div>
            </div>
            
            {/* Statistiques compactes toujours visibles */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="flex items-center py-1 px-2 rounded bg-slate-700/50 border border-slate-600/50">
                <AlertTriangle size={14} className="text-red-400 mr-2" />
                <div className="text-xs">
                  <div className="text-red-300 font-medium">{vfeStats.totalProblems}</div>
                  <div className="text-slate-400">Problèmes</div>
                </div>
              </div>
              <div className="flex items-center py-1 px-2 rounded bg-slate-700/50 border border-slate-600/50">
                <Server size={14} className="text-blue-400 mr-2" />
                <div className="text-xs">
                  <div className="text-blue-300 font-medium">{vfeStats.totalHosts}</div>
                  <div className="text-slate-400">Hosts</div>
                </div>
              </div>
              <div className="flex items-center py-1 px-2 rounded bg-slate-700/50 border border-slate-600/50">
                <Code size={14} className="text-emerald-400 mr-2" />
                <div className="text-xs">
                  <div className="text-emerald-300 font-medium">{vfeStats.totalServices}</div>
                  <div className="text-slate-400">Services</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contenu étendu VFE */}
          <div className={`overflow-hidden transition-all duration-300 ${expandedSection === 'vfe' ? 'max-h-96' : 'max-h-0'}`}>
            <div className="p-4 bg-slate-800">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Applications critiques ({vfeStats.totalZones})</h4>
              
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {vfeZones.map(zone => (
                  <div 
                    key={zone.id} 
                    className={`p-2 rounded border transition-all cursor-pointer
                              ${zone.problemCount > 0 
                                ? 'bg-red-900/20 border-red-800/40 hover:bg-red-900/30' 
                                : 'bg-slate-700/30 border-slate-600/40 hover:bg-slate-700/50'}`}
                    onClick={() => onZoneClick(zone.id, 'vfe')}
                    onMouseEnter={() => setHoverZone(zone.id)}
                    onMouseLeave={() => setHoverZone(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {zone.icon || <Award size={14} className="text-amber-400" />}
                        <span className="ml-2 text-sm text-white truncate max-w-[150px]">{zone.name}</span>
                      </div>
                      <div className="flex items-center">
                        {zone.problemCount > 0 && (
                          <div className="px-1.5 py-0.5 bg-red-900/40 text-red-300 text-xs rounded-md border border-red-800/40">
                            {zone.problemCount}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center mt-1 text-xs">
                      <div className="flex items-center text-blue-400 mr-3">
                        <Server size={12} className="mr-1" />
                        <span>{zone.hosts}</span>
                      </div>
                      <div className="flex items-center text-emerald-400">
                        <Code size={12} className="mr-1" />
                        <span>{zone.services}</span>
                      </div>
                      <div className="ml-auto text-xs text-slate-400">
                        {zone.availability}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Panneau d'aperçu au survol (apparaît lorsqu'une zone est survolée) */}
      {hoveredZoneDetails && (
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${
                hoveredZoneDetails.zone.problemCount > 0 
                  ? 'bg-red-900/20 text-red-400 border border-red-800/30' 
                  : 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/30'
              }`}>
                <Activity size={16} />
              </div>
              <div className="ml-3">
                <h4 className="font-medium text-white text-sm">{hoveredZoneDetails.zone.name}</h4>
                <p className="text-xs text-slate-400">
                  {hoveredZoneDetails.zone.problemCount > 0 
                    ? `${hoveredZoneDetails.zone.problemCount} problème${hoveredZoneDetails.zone.problemCount > 1 ? 's' : ''} actif${hoveredZoneDetails.zone.problemCount > 1 ? 's' : ''}` 
                    : 'Aucun problème actif'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs px-2 py-1 rounded bg-slate-800 text-blue-300 border border-slate-700">
                {hoveredZoneDetails.zone.hosts} hosts
              </div>
              <div className="text-xs px-2 py-1 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                {hoveredZoneDetails.zone.services} services
              </div>
              <div className="text-xs px-2 py-1 rounded bg-slate-800 text-amber-300 border border-slate-700">
                {hoveredZoneDetails.zone.availability}
              </div>
            </div>
          </div>
          
          {/* Problèmes spécifiques de la zone survolée (si présents) */}
          {hoveredZoneDetails.problems.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Problèmes actifs:</div>
              <div className="space-y-1">
                {hoveredZoneDetails.problems.slice(0, 2).map((problem, idx) => (
                  <div key={idx} className="flex items-center text-xs p-1 rounded bg-slate-800/50">
                    <AlertTriangle size={12} className="text-red-400 mr-2 flex-shrink-0" />
                    <span className="text-slate-300 truncate">{problem.title || 'Problème non spécifié'}</span>
                  </div>
                ))}
                {hoveredZoneDetails.problems.length > 2 && (
                  <div className="text-xs text-slate-500 italic pl-1">
                    +{hoveredZoneDetails.problems.length - 2} autre{hoveredZoneDetails.problems.length - 2 > 1 ? 's' : ''} problème{hoveredZoneDetails.problems.length - 2 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CriticalAppsSummary;