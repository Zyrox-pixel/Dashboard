import React, { useState } from 'react';
import TopologyView from '../components/topology/TopologyView';
import { Network, Layers, Activity, Server } from 'lucide-react';

const TopologyPage: React.FC = () => {
  const [selectedEntityType, setSelectedEntityType] = useState<string>('SERVICE');
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const entityTypes = [
    { value: 'SERVICE', label: 'Services', icon: <Activity className="w-4 h-4" /> },
    { value: 'HOST', label: 'Hôtes', icon: <Server className="w-4 h-4" /> },
    { value: 'PROCESS_GROUP', label: 'Processus', icon: <Layers className="w-4 h-4" /> },
    { value: 'APPLICATION', label: 'Applications', icon: <Network className="w-4 h-4" /> }
  ];

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Vue Topologique
          </h1>
          <p className="text-slate-400">
            Visualisation en temps réel de l'architecture et des dépendances
          </p>
        </div>

        {/* Sélecteur de type d'entité */}
        <div className="mb-6">
          <div className="flex gap-2">
            {entityTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedEntityType(type.value)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                  ${selectedEntityType === type.value
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                {type.icon}
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Vue principale de la topologie */}
          <div className="xl:col-span-3">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 h-[700px]">
              <TopologyView
                entityType={selectedEntityType}
                showMetrics={true}
                onNodeClick={handleNodeClick}
              />
            </div>
          </div>

          {/* Panneau de détails */}
          <div className="xl:col-span-1">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 h-[700px] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 text-slate-200">
                Détails de l'entité
              </h3>
              
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400">Nom</p>
                    <p className="font-medium text-white">{selectedNode.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-400">Type</p>
                    <p className="font-medium text-white">{selectedNode.type}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-400">Statut</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedNode.status === 'critical' ? 'bg-red-500' :
                        selectedNode.status === 'warning' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <span className="capitalize">{selectedNode.status || 'Sain'}</span>
                    </div>
                  </div>
                  
                  {selectedNode.metrics && (
                    <div className="border-t border-slate-800 pt-4">
                      <p className="text-sm text-slate-400 mb-2">Métriques</p>
                      {selectedNode.metrics.cpu !== undefined && (
                        <div className="mb-2">
                          <div className="flex justify-between text-sm">
                            <span>CPU</span>
                            <span className="text-blue-400">{selectedNode.metrics.cpu}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${selectedNode.metrics.cpu}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {selectedNode.metrics.errorRate !== undefined && (
                        <div className="mb-2">
                          <div className="flex justify-between text-sm">
                            <span>Taux d'erreur</span>
                            <span className={selectedNode.metrics.errorRate > 5 ? 'text-red-400' : 'text-green-400'}>
                              {selectedNode.metrics.errorRate}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                selectedNode.metrics.errorRate > 5 ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(selectedNode.metrics.errorRate * 10, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {selectedNode.metrics.responseTime !== undefined && (
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Temps de réponse</span>
                            <span className="text-purple-400">{selectedNode.metrics.responseTime}ms</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="border-t border-slate-800 pt-4">
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                      Voir dans Dynatrace
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">
                  Sélectionnez un nœud pour voir ses détails
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total des entités</p>
                <p className="text-2xl font-bold text-white">--</p>
              </div>
              <Layers className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Relations</p>
                <p className="text-2xl font-bold text-white">--</p>
              </div>
              <Network className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Alertes actives</p>
                <p className="text-2xl font-bold text-red-400">--</p>
              </div>
              <Activity className="w-8 h-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Santé globale</p>
                <p className="text-2xl font-bold text-green-400">--</p>
              </div>
              <Server className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopologyPage;