import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { GitBranch, Info } from 'lucide-react';
import api from '../services/api';

interface GraphNode {
  id: number;
  name: string;
  node_type: string;
  properties?: Record<string, any>;
}

interface GraphEdge {
  id: number;
  source_node_id: number;
  target_node_id: number;
  relation_type: string;
  properties?: Record<string, any>;
}

const Graph: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const response = await api.get('/graph');
      setNodes(response.data.nodes);
      setEdges(response.data.edges);
    } catch (error) {
      console.error('Failed to load graph nodes and edges:', error);
    } finally {
      setLoading(false);
    }
  };

  const onChartClick = (params: any) => {
    if (params.dataType === 'node') {
      const clickedNode = nodes.find(n => n.id === params.data.id);
      if (clickedNode) {
        setSelectedNode(clickedNode);
      }
    }
  };

  const getOption = () => {
    // Map node categories
    const categories = [
      { name: 'Document' },
      { name: 'Equipment' },
      { name: 'Incident' },
      { name: 'SOP' },
      { name: 'Regulation' },
      { name: 'Person' },
      { name: 'Date' }
    ];

    // Color definitions
    const typeColorMap: Record<string, string> = {
      'Document': '#3b82f6',
      'Equipment': '#10b981',
      'Incident': '#ef4444',
      'SOP': '#8b5cf6',
      'Regulation': '#ec4899',
      'Person': '#71717a',
      'Date': '#f59e0b'
    };

    // Format nodes for ECharts
    const chartNodes = nodes.map(node => {
      const categoryIdx = categories.findIndex(c => c.name === node.node_type);
      return {
        id: String(node.id),
        name: node.name,
        value: node.node_type,
        category: categoryIdx >= 0 ? categoryIdx : undefined,
        symbolSize: node.node_type === 'Document' ? 32 : 24,
        itemStyle: {
          color: typeColorMap[node.node_type] || '#a1a1aa'
        }
      };
    });

    // Format edges for ECharts
    const chartEdges = edges.map(edge => {
      return {
        source: String(edge.source_node_id),
        target: String(edge.target_node_id),
        value: edge.relation_type,
        label: {
          show: true,
          formatter: edge.relation_type,
          fontSize: 8,
          color: '#71717a'
        },
        lineStyle: {
          width: 1.5,
          opacity: 0.7,
          curveness: 0.1
        }
      };
    });

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return `<strong>${params.data.name}</strong><br/>Type: ${params.data.value}`;
          } else if (params.dataType === 'edge') {
            return `Relation: ${params.data.value}`;
          }
          return '';
        }
      },
      legend: [{
        data: categories.map(c => c.name),
        textStyle: { color: '#a1a1aa' },
        bottom: 10
      }],
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: chartNodes,
          links: chartEdges,
          categories: categories,
          roam: true,
          draggable: true,
          label: {
            show: true,
            position: 'right',
            color: '#fafafa',
            fontSize: 10
          },
          force: {
            repulsion: 300,
            edgeLength: 120,
            gravity: 0.08
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 3
            }
          }
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Knowledge Graph Explorer
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Explore entities and relationships extracted from industrial manuals and logs. Drag and scroll to navigate the graph.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Interactive ECharts Graph Card */}
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm w-full h-[650px] overflow-hidden relative">
          <div className="absolute top-4 left-6 z-10 flex gap-2">
            <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 font-medium">
              Double-click to expand • Click to inspect properties
            </span>
          </div>
          
          <ReactECharts
            option={getOption()}
            style={{ height: '100%', width: '100%' }}
            onEvents={{
              'click': onChartClick
            }}
          />
        </div>

        {/* Selected Node Properties Panel */}
        <div className="w-full lg:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 shrink-0 min-h-[300px]">
          <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            Node Inspector
          </h3>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Name</span>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">{selectedNode.name}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Type</span>
                <span className="inline-flex mt-1 px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400">
                  {selectedNode.node_type}
                </span>
              </div>

              {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block mb-1">Properties</span>
                  <div className="space-y-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg p-3 text-xs leading-normal">
                    {Object.entries(selectedNode.properties).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-zinc-500 font-mono">{key}:</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center text-zinc-400 text-xs gap-2">
              <GitBranch size={28} className="text-zinc-400" />
              <p>Click any node in the graph layout to inspect its operational properties.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Graph;
