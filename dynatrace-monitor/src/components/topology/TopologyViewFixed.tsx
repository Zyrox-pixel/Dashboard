import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { API_BASE_URL } from '../../api/endpoints';

interface TopologyViewFixedProps {
  entityType: string;
  managementZone?: string;
  showMetrics?: boolean;
  onNodeClick?: (node: any) => void;
}

const TopologyViewFixed: React.FC<TopologyViewFixedProps> = ({ 
  entityType, 
  managementZone,
  showMetrics = true,
  onNodeClick 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<any[]>([]);

  useEffect(() => {
    fetchTopologyData();
  }, [entityType, managementZone]);

  const fetchTopologyData = async () => {
    try {
      setLoading(true);
      const url = managementZone 
        ? `${API_BASE_URL}/topology/${entityType}?mz=${encodeURIComponent(managementZone)}`
        : `${API_BASE_URL}/topology/${entityType}`;
      
      console.log('Fetching from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Response received:', data);
      console.log('Entities found:', data.entities?.length || 0);
      
      setEntities(data.entities || []);
    } catch (error) {
      console.error('Error fetching topology:', error);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const determineColor = (entity: any) => {
    // Check for problems first
    if (entity.problems && entity.problems.length > 0) return '#ef4444';
    
    // Then check metrics
    const props = entity.properties || {};
    if (props.errorRate > 5 || props.availability < 95) return '#ef4444';
    if (props.errorRate > 1 || props.availability < 99) return '#f59e0b';
    return '#10b981';
  };

  useEffect(() => {
    if (!svgRef.current || loading || entities.length === 0) return;

    console.log('Drawing', entities.length, 'entities');

    const width = 900;
    const height = 600;
    
    // Clear SVG
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Create container group
    const g = svg.append("g");

    // Add zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);

    // Extract links from relationships
    const links: any[] = [];
    entities.forEach((entity: any) => {
      // Check if toRelationships exists and is an array
      if (entity.toRelationships && Array.isArray(entity.toRelationships)) {
        entity.toRelationships.forEach((rel: any) => {
          if (rel.targets && Array.isArray(rel.targets)) {
            rel.targets.forEach((target: any) => {
              // Check if target exists in our entities
              if (entities.find(e => e.entityId === target.id)) {
                links.push({
                  source: entity.entityId,
                  target: target.id,
                  type: rel.type
                });
              }
            });
          }
        });
      }
      
      // Also check fromRelationships
      if (entity.fromRelationships && Array.isArray(entity.fromRelationships)) {
        entity.fromRelationships.forEach((rel: any) => {
          if (rel.sources && Array.isArray(rel.sources)) {
            rel.sources.forEach((source: any) => {
              // Check if source exists in our entities
              if (entities.find(e => e.entityId === source.id)) {
                links.push({
                  source: source.id,
                  target: entity.entityId,
                  type: rel.type
                });
              }
            });
          }
        });
      }
    });

    console.log('Found', links.length, 'relationships');

    // Prepare nodes data with D3 types
    const nodes = entities.map(entity => ({
      id: entity.entityId,
      name: entity.displayName || entity.name || entity.entityId,
      type: entity.type,
      color: determineColor(entity),
      entity: entity, // Keep original entity for click handler
      // D3 force simulation properties
      x: undefined as number | undefined,
      y: undefined as number | undefined,
      vx: undefined as number | undefined,
      vy: undefined as number | undefined,
      fx: undefined as number | null | undefined,
      fy: undefined as number | null | undefined
    }));

    // Create force simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    // Draw links
    const link = g.append("g")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2);

    // Draw nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Add circles
    node.append("circle")
      .attr("r", 40)
      .attr("fill", d => d.color)
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2);

    // Add text labels
    node.append("text")
      .text(d => {
        const name = d.name;
        return name.length > 25 ? name.substring(0, 25) + '...' : name;
      })
      .attr("x", 0)
      .attr("y", 60)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .style("font-size", "12px");

    // Add click handler
    node.on("click", (event, d: any) => {
      event.stopPropagation();
      if (onNodeClick && d.entity) {
        onNodeClick(d.entity);
      }
    });

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
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

    return () => {
      simulation.stop();
    };
  }, [entities, loading, onNodeClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <p className="text-lg">Aucune entité trouvée</p>
          <p className="text-sm mt-2">Type: {entityType}</p>
          <p className="text-sm">Zone: {managementZone || 'Toutes'}</p>
          <button 
            onClick={fetchTopologyData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Rafraîchir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <svg ref={svgRef} className="w-full h-full"></svg>
      
      {/* Legend */}
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
      
      {/* Stats */}
      <div className="absolute top-4 right-4 bg-slate-800/90 p-3 rounded-lg backdrop-blur">
        <div className="text-xs text-slate-400">
          {entities.length} services
        </div>
      </div>
      
      {/* Controls */}
      <div className="absolute top-4 left-4 bg-slate-800/90 p-2 rounded-lg backdrop-blur">
        <p className="text-xs text-slate-400">
          Utilisez la molette pour zoomer • Glissez pour déplacer
        </p>
      </div>
    </div>
  );
};

export default TopologyViewFixed;