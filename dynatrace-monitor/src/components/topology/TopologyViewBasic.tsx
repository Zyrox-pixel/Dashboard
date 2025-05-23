import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { API_BASE_URL } from '../../api/endpoints';

interface TopologyViewBasicProps {
  entityType: string;
  managementZone?: string;
  showMetrics?: boolean;
  onNodeClick?: (node: any) => void;
}

const TopologyViewBasic: React.FC<TopologyViewBasicProps> = ({ 
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
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Fetched entities:', data.entities?.length || 0);
      setEntities(data.entities || []);
    } catch (error) {
      console.error('Error:', error);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!svgRef.current || loading || entities.length === 0) return;

    const width = 800;
    const height = 600;
    
    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Create a simple grid layout
    const cols = Math.ceil(Math.sqrt(entities.length));
    const rows = Math.ceil(entities.length / cols);
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    // Create nodes
    const nodeGroup = svg.selectAll("g")
      .data(entities)
      .enter()
      .append("g")
      .attr("transform", (d, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + cellHeight / 2;
        return `translate(${x}, ${y})`;
      })
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (onNodeClick) onNodeClick(d);
      });

    // Add circles
    nodeGroup.append("circle")
      .attr("r", 30)
      .attr("fill", "#3b82f6")
      .attr("stroke", "#1e40af")
      .attr("stroke-width", 2);

    // Add text
    nodeGroup.append("text")
      .text(d => (d.displayName || d.name || d.entityId || '').substring(0, 20))
      .attr("text-anchor", "middle")
      .attr("y", 50)
      .attr("font-size", "12px")
      .attr("fill", "#e2e8f0");

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
          <p>Aucune entité trouvée</p>
          <p className="text-sm mt-2">Type: {entityType}</p>
          <p className="text-sm">Zone: {managementZone || 'Toutes'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-lg">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default TopologyViewBasic;