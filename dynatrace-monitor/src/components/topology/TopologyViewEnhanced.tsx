import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { API_BASE_URL } from '../../api/endpoints';

interface Node {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'warning' | 'critical';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: any;
  target: any;
  type: string;
}

interface TopologyViewEnhancedProps {
  entityType: string;
  managementZone?: string;
  showMetrics?: boolean;
  onNodeClick?: (node: any) => void;
}

const TopologyViewEnhanced: React.FC<TopologyViewEnhancedProps> = ({ 
  entityType, 
  managementZone,
  showMetrics = true,
  onNodeClick 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);

  useEffect(() => {
    fetchTopologyData();
  }, [entityType, managementZone]);

  const fetchTopologyData = async () => {
    try {
      setLoading(true);
      const url = managementZone 
        ? `${API_BASE_URL}/topology/${entityType}?mz=${encodeURIComponent(managementZone)}`
        : `${API_BASE_URL}/topology/${entityType}`;
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Raw API response:', data);
      console.log('Number of entities:', data.entities?.length || 0);
      
      // Transformer les entités en nœuds
      const transformedNodes: Node[] = (data.entities || []).map((entity: any) => ({
        id: entity.entityId,
        name: entity.displayName || entity.name || entity.entityId,
        type: entity.type || 'SERVICE',
        status: determineStatus(entity)
      }));

      // Créer une map pour lookup rapide
      const nodeMap = new Map(transformedNodes.map(n => [n.id, n]));
      
      // Extraire les relations
      const transformedLinks: Link[] = [];
      (data.entities || []).forEach((entity: any) => {
        if (entity.toRelationships) {
          entity.toRelationships.forEach((rel: any) => {
            if (rel.targets) {
              rel.targets.forEach((target: any) => {
                // Vérifier que la cible existe dans nos nœuds
                if (nodeMap.has(target.id)) {
                  transformedLinks.push({
                    source: entity.entityId,
                    target: target.id,
                    type: rel.type
                  });
                }
              });
            }
          });
        }
      });

      console.log(`Loaded ${transformedNodes.length} nodes and ${transformedLinks.length} links`);
      setNodes(transformedNodes);
      setLinks(transformedLinks);
    } catch (error) {
      console.error('Error:', error);
      setNodes([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const determineStatus = (entity: any): 'healthy' | 'warning' | 'critical' => {
    // Vérifier d'abord les problèmes
    if (entity.problems && entity.problems.length > 0) return 'critical';
    
    // Puis les métriques
    const props = entity.properties || {};
    if (props.errorRate > 5 || props.availability < 95) return 'critical';
    if (props.errorRate > 1 || props.availability < 99) return 'warning';
    return 'healthy';
  };

  useEffect(() => {
    if (!svgRef.current || loading || nodes.length === 0) return;

    const width = 800;
    const height = 600;
    
    // Nettoyer le SVG
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Ajouter un groupe pour le zoom
    const g = svg.append("g");

    // Ajouter le zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);

    // Créer la simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    // Ajouter les liens
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#475569")
      .attr("stroke-width", 2)
      .attr("opacity", 0.6);

    // Ajouter les nœuds
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("cursor", "pointer")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Ajouter les cercles
    node.append("circle")
      .attr("r", 35)
      .attr("fill", d => {
        switch (d.status) {
          case 'critical': return '#ef4444';
          case 'warning': return '#f59e0b';
          default: return '#10b981';
        }
      })
      .attr("stroke", d => {
        switch (d.status) {
          case 'critical': return '#dc2626';
          case 'warning': return '#d97706';
          default: return '#059669';
        }
      })
      .attr("stroke-width", 2)
      .on("click", (event, d) => {
        event.stopPropagation();
        if (onNodeClick) {
          // Retrouver l'entité originale
          const originalEntity = { entityId: d.id, displayName: d.name, type: d.type };
          onNodeClick(originalEntity);
        }
      });

    // Ajouter un effet de halo pour les nœuds critiques
    node.filter(d => d.status === 'critical')
      .append("circle")
      .attr("r", 40)
      .attr("fill", "none")
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 2)
      .attr("opacity", 0.5)
      .style("animation", "pulse 2s infinite");

    // Ajouter les labels
    node.append("text")
      .text(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name)
      .attr("text-anchor", "middle")
      .attr("y", 55)
      .attr("font-size", "12px")
      .attr("fill", "#e2e8f0");

    // Ajouter le nombre de liens si > 3
    node.each(function(d: any) {
      const linkCount = links.filter(l => 
        l.source === d.id || l.target === d.id || 
        l.source.id === d.id || l.target.id === d.id
      ).length;
      
      if (linkCount > 3) {
        d3.select(this).append("text")
          .text(linkCount)
          .attr("text-anchor", "middle")
          .attr("y", 5)
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .attr("fill", "white");
      }
    });

    // Mettre à jour les positions
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Fonctions de drag
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Ajouter le CSS pour l'animation pulse
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 0.5;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.3;
        }
        100% {
          transform: scale(1);
          opacity: 0.5;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      simulation.stop();
      document.head.removeChild(style);
    };
  }, [nodes, links, loading, onNodeClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <p>Aucune entité trouvée</p>
          <p className="text-sm mt-2">Type: {entityType}</p>
          <p className="text-sm">Zone: {managementZone || 'Toutes'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <svg ref={svgRef} className="w-full h-full"></svg>
      
      {/* Légende */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 p-3 rounded-lg backdrop-blur">
        <h4 className="text-xs font-semibold text-slate-200 mb-2">Légende</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-slate-300">Sain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-slate-300">Avertissement</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-slate-300">Critique</span>
          </div>
        </div>
      </div>
      
      {/* Statistiques */}
      <div className="absolute top-4 right-4 bg-slate-800/90 p-3 rounded-lg backdrop-blur">
        <div className="text-xs text-slate-400">
          {nodes.length} services • {links.length} relations
        </div>
      </div>
    </div>
  );
};

export default TopologyViewEnhanced;