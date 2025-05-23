import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../api/endpoints';

interface TopologyViewDebugProps {
  entityType: string;
  managementZone?: string;
  onNodeClick?: (node: any) => void;
}

const TopologyViewDebug: React.FC<TopologyViewDebugProps> = ({ 
  entityType, 
  managementZone,
  onNodeClick 
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [entityType, managementZone]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = managementZone 
        ? `${API_BASE_URL}/topology/${entityType}?mz=${encodeURIComponent(managementZone)}`
        : `${API_BASE_URL}/topology/${entityType}`;
      
      console.log('DEBUG: Fetching URL:', url);
      
      const response = await fetch(url);
      console.log('DEBUG: Response status:', response.status);
      
      const responseData = await response.json();
      console.log('DEBUG: Full response data:', responseData);
      
      setData(responseData);
    } catch (err) {
      console.error('DEBUG: Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-400">
        <p>Erreur: {error}</p>
        <button onClick={fetchData} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
          Réessayer
        </button>
      </div>
    );
  }

  // Extraire les entités depuis différents formats possibles
  const entities = data?.entities || data?.data?.entities || data?.results || [];
  const entityCount = Array.isArray(entities) ? entities.length : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-slate-800 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
        <p>Type: {entityType}</p>
        <p>Zone: {managementZone || 'All'}</p>
        <p>Entités trouvées: {entityCount}</p>
        <p>Structure de données: {JSON.stringify(Object.keys(data || {}))}</p>
      </div>

      <div className="bg-slate-800 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Première entité (si disponible)</h3>
        {entityCount > 0 ? (
          <pre className="text-xs overflow-auto">
            {JSON.stringify(entities[0], null, 2)}
          </pre>
        ) : (
          <p className="text-slate-400">Aucune entité</p>
        )}
      </div>

      <div className="bg-slate-800 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Toutes les entités</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-auto">
          {entities.map((entity: any, index: number) => (
            <div 
              key={entity.entityId || entity.id || index}
              className="bg-slate-700 p-2 rounded cursor-pointer hover:bg-slate-600"
              onClick={() => onNodeClick && onNodeClick(entity)}
            >
              <p className="font-medium">{entity.displayName || entity.name || entity.entityId || entity.id || 'Sans nom'}</p>
              <p className="text-xs text-slate-400">{entity.type || 'Type inconnu'}</p>
              {entity.entityId && <p className="text-xs text-slate-500">ID: {entity.entityId}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopologyViewDebug;