import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { API_BASE_URL } from '../../api/endpoints';

interface Node {
  id: string;
  name: string;
  type: string;
  status?: 'healthy' | 'warning' | 'critical';
  metrics?: {
    cpu?: number;
    responseTime?: number;
    errorRate?: number;
  };
}

interface Link {
  source: string;
  target: string;
  type: string;
  strength?: number;
}

interface TopologyViewProps {
  entityType: string;
  managementZone?: string;
  showMetrics?: boolean;
  onNodeClick?: (node: Node) => void;
}

const TopologyView: React.FC<TopologyViewProps> = ({ 
  entityType, 
  managementZone,
  showMetrics = true,
  onNodeClick 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    fetchTopologyData();
  }, [entityType, managementZone]);

  const fetchTopologyData = async () => {
    try {
      setLoading(true);
      const url = managementZone 
        ? `${API_BASE_URL}/topology/${entityType}?mz=${encodeURIComponent(managementZone)}`
        : `${API_BASE_URL}/topology/${entityType}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Transformer les données Dynatrace en format D3
      const transformedNodes: Node[] = data.entities?.map((entity: any) => ({
        id: entity.entityId,
        name: entity.displayName || entity.name,
        type: entity.type,
        status: determineStatus(entity),
        metrics: extractMetrics(entity)
      })) || [];

      const transformedLinks: Link[] = [];
      
      // Extraire les relations
      data.entities?.forEach((entity: any) => {
        entity.toRelationships?.forEach((rel: any) => {
          rel.targets?.forEach((target: any) => {
            transformedLinks.push({
              source: entity.entityId,
              target: target.id,
              type: rel.type
            });
          });
        });
      });

      setNodes(transformedNodes);
      setLinks(transformedLinks);
    } catch (error) {
      console.error('Error fetching topology:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineStatus = (entity: any): 'healthy' | 'warning' | 'critical' => {
    // Logique pour déterminer le statut basé sur les métriques
    if (entity.properties?.errorRate > 5) return 'critical';
    if (entity.properties?.errorRate > 1) return 'warning';
    return 'healthy';
  };

  const extractMetrics = (entity: any) => {
    return {
      cpu: entity.properties?.cpuUsage,
      responseTime: entity.properties?.responseTime,
      errorRate: entity.properties?.errorRate
    };
  };

  useEffect(() => {
    if (!svgRef.current || loading || nodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Nettoyer le SVG existant
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Définir les gradients pour les liens
    const defs = svg.append("defs");
    
    // Gradient pour les liens normaux
    const linkGradient = defs.append("linearGradient")
      .attr("id", "linkGradient")
      .attr("gradientUnits", "userSpaceOnUse");
    
    linkGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#60a5fa")
      .attr("stop-opacity", 0.6);
    
    linkGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.8);

    // Créer la simulation de force
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    // Créer les liens
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "url(#linkGradient)")
      .attr("stroke-width", 2)
      .attr("opacity", 0.6);

    // Créer les groupes de nœuds
    const nodeGroup = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(d.id);
        if (onNodeClick) onNodeClick(d);
      })
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Ajouter les cercles des nœuds
    nodeGroup.append("circle")
      .attr("r", d => d.type === 'SERVICE' ? 35 : 30)
      .attr("fill", d => {
        switch (d.status) {
          case 'critical': return '#ef4444';
          case 'warning': return '#f59e0b';
          default: return '#10b981';
        }
      })
      .attr("stroke", d => selectedNode === d.id ? '#fff' : 'none')
      .attr("stroke-width", 3)
      .attr("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))");

    // Ajouter les icônes ou texte
    nodeGroup.append("text")
      .text(d => d.name.substring(0, 2).toUpperCase())
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .attr("font-size", "14px");

    // Ajouter les labels
    nodeGroup.append("text")
      .text(d => d.name)
      .attr("y", 50)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#e2e8f0");

    // Ajouter les métriques si activées
    if (showMetrics) {
      nodeGroup.each(function(d) {
        const group = d3.select(this);
        if (d.metrics?.errorRate !== undefined) {
          group.append("rect")
            .attr("x", -30)
            .attr("y", -50)
            .attr("width", 60)
            .attr("height", 20)
            .attr("rx", 10)
            .attr("fill", d.metrics.errorRate > 5 ? '#dc2626' : '#059669')
            .attr("opacity", 0.8);
          
          group.append("text")
            .text(`${d.metrics.errorRate.toFixed(1)}%`)
            .attr("y", -35)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "11px");
        }
      });
    }

    // Mettre à jour les positions à chaque tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
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

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, links, loading, showMetrics, selectedNode, onNodeClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />
      
      {/* Légende */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 p-4 rounded-lg backdrop-blur">
        <h4 className="text-sm font-semibold text-slate-200 mb-2">Légende</h4>
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

      {/* Contrôles */}
      <div className="absolute top-4 right-4 space-y-2">
        <button
          onClick={fetchTopologyData}
          className="bg-slate-800/90 p-2 rounded-lg backdrop-blur hover:bg-slate-700 transition-colors"
          title="Rafraîchir"
        >
          <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TopologyView;