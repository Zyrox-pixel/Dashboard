import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../api/endpoints';

interface TopologyViewSimpleProps {
  entityType: string;
  managementZone?: string;
  showMetrics?: boolean;
  onNodeClick?: (node: any) => void;
}

const TopologyViewSimple: React.FC<TopologyViewSimpleProps> = ({ 
  entityType, 
  managementZone,
  showMetrics = true,
  onNodeClick 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchTopologyData();
  }, [entityType, managementZone]);

  const fetchTopologyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = managementZone 
        ? `${API_BASE_URL}/topology/${entityType}?mz=${encodeURIComponent(managementZone)}`
        : `${API_BASE_URL}/topology/${entityType}`;
        
      console.log('Fetching topology from:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Topology data:', responseData);
      
      setData(responseData);
    } catch (err) {
      console.error('Error fetching topology:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Chargement de la topologie...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-400">
          <p className="mb-2">Erreur lors du chargement de la topologie:</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchTopologyData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Affichage temporaire des données brutes pour debug
  return (
    <div className="p-4">
      <div className="mb-4">
        <p className="text-sm text-slate-400">
          Type d'entité: {entityType} | Zone: {managementZone || 'Toutes'}
        </p>
      </div>
      
      {data && (
        <div className="space-y-4">
          <div className="bg-slate-800 p-4 rounded">
            <h3 className="text-lg font-semibold mb-2">Données brutes de l'API:</h3>
            <pre className="text-xs overflow-auto max-h-96 bg-slate-900 p-2 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
          
          {data.entities && (
            <div className="bg-slate-800 p-4 rounded">
              <h3 className="text-lg font-semibold mb-2">
                Entités trouvées: {data.entities.length}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.entities.slice(0, 9).map((entity: any) => (
                  <div 
                    key={entity.entityId} 
                    className="bg-slate-700 p-2 rounded cursor-pointer hover:bg-slate-600"
                    onClick={() => onNodeClick && onNodeClick(entity)}
                  >
                    <p className="text-sm font-medium">{entity.displayName || entity.entityId}</p>
                    <p className="text-xs text-slate-400">{entity.type}</p>
                  </div>
                ))}
              </div>
              {data.entities.length > 9 && (
                <p className="text-sm text-slate-400 mt-2">
                  ... et {data.entities.length - 9} autres entités
                </p>
              )}
            </div>
          )}
        </div>
      )}
      
      {!data && (
        <div className="text-center text-slate-400">
          Aucune donnée reçue
        </div>
      )}
    </div>
  );
};

export default TopologyViewSimple;