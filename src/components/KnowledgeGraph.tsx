import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { Share2, Maximize2, RefreshCw } from 'lucide-react';

interface KnowledgeGraphProps {
  data: any[];
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  category: string;
  isImportant: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
  value: number;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const graphData = useMemo(() => {
    const nodes: Node[] = data.map((item, idx) => ({
      id: item.id || `node-${idx}`,
      title: item.title || item.content?.substring(0, 20) || 'Untitled',
      category: item.category || 'General',
      isImportant: item.isImportant || false
    }));

    const links: Link[] = [];
    
    // Create links based on shared tags or categories
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const itemA = data[i];
        const itemB = data[j];
        
        let strength = 0;
        if (itemA.category === itemB.category) strength += 1;
        
        const tagsA = itemA.tags || [];
        const tagsB = itemB.tags || [];
        const commonTags = tagsA.filter((t: string) => tagsB.includes(t));
        strength += commonTags.length * 2;

        if (strength > 0) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            value: strength
          });
        }
      }
    }

    return { nodes, links };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const width = svgRef.current.clientWidth || 800;
    const height = 600;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);
    
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const simulation = d3.forceSimulation<Node>(graphData.nodes)
      .force("link", d3.forceLink<Node, Link>(graphData.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    const link = g.append("g")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    const node = g.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .call(d3.drag<any, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", d => d.isImportant ? 12 : 8)
      .attr("fill", d => {
        switch(d.category) {
          case 'Quy định - Hướng dẫn': return '#3b82f6';
          case 'Nghị quyết - Chỉ thị': return '#ef4444';
          case 'Nhân sự - Tổ chức': return '#10b981';
          default: return '#94a3b8';
        }
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("class", "shadow-lg");

    node.append("text")
      .attr("dx", 15)
      .attr("dy", 4)
      .text(d => d.title)
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "#475569")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Zoom behavior
    svg.call(d3.zoom<SVGSVGElement, any>()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      }));

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
  }, [graphData]);

  return (
    <div className="relative bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden group">
      <div className="absolute top-6 left-8 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
            <Share2 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Knowledge Graph</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bản đồ liên kết tri thức chiến lược</p>
          </div>
        </div>
      </div>

      <div className="absolute top-6 right-8 z-10 flex gap-2">
        <button className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
          <RefreshCw size={16} />
        </button>
        <button className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
          <Maximize2 size={16} />
        </button>
      </div>

      <svg ref={svgRef} className="w-full h-[600px] cursor-grab active:cursor-grabbing" />
      
      <div className="absolute bottom-6 left-8 z-10 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Quy định</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nghị quyết</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tổ chức</span>
        </div>
      </div>
    </div>
  );
};
