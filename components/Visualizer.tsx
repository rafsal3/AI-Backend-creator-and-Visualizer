import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Model, Controller, Route, Middleware, ApiCollection, Api } from '../types';

// --- TYPES ---
type NodeType = 'model' | 'controller' | 'route' | 'middleware' | 'api';

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  data: Model | Controller | Route | Middleware | Api;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

interface Transform {
  x: number;
  y: number;
  k: number;
}

// --- CONSTANTS ---
const NODE_WIDTH = 180;
const NODE_HEIGHT = 50;
const COL_GAP = 250;
const ROW_GAP = 120;
const nodeTypeColors: Record<NodeType, string> = {
  model: 'border-green-500',
  controller: 'border-blue-500',
  route: 'border-purple-500',
  middleware: 'border-yellow-500',
  api: 'border-cyan-500',
};

// --- SUB-COMPONENTS ---
const VisualizerNode: React.FC<{ node: GraphNode }> = ({ node }) => (
  <g transform={`translate(${node.x}, ${node.y})`} className="cursor-pointer">
    <foreignObject x={-NODE_WIDTH / 2} y={-NODE_HEIGHT / 2} width={NODE_WIDTH} height={NODE_HEIGHT}>
      <div
        className={`flex items-center justify-center p-2 bg-gray-800 border-2 ${nodeTypeColors[node.type]} rounded-lg shadow-lg hover:bg-gray-700 transition-all w-full h-full`}
        title={node.label}
      >
        <p className="text-white text-sm font-semibold truncate text-center">{node.label}</p>
      </div>
    </foreignObject>
  </g>
);

const VisualizerEdge: React.FC<{ edge: GraphEdge; nodes: GraphNode[] }> = ({ edge, nodes }) => {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  if (!sourceNode || !targetNode) return null;

  // Draw a bezier curve from the right side of the source to the left side of the target
  const d = `M ${sourceNode.x + NODE_WIDTH / 2} ${sourceNode.y} C ${sourceNode.x + NODE_WIDTH / 2 + 75} ${sourceNode.y}, ${targetNode.x - NODE_WIDTH / 2 - 75} ${targetNode.y}, ${targetNode.x - NODE_WIDTH / 2} ${targetNode.y}`;

  return <path d={d} stroke="#4A5568" strokeWidth="2" fill="none" className="pointer-events-none" />;
};


// --- MAIN COMPONENT ---
interface VisualizerProps {
  models: Model[];
  apiCollections: ApiCollection[];
  controllers: Controller[];
  routes: Route[];
  middlewares: Middleware[];
}

const Visualizer: React.FC<VisualizerProps> = ({ models, apiCollections, controllers, routes, middlewares }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });

  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });

  const { nodes, edges } = useMemo(() => {
    const allApis = apiCollections.flatMap(c => c.apis);

    // 1. Create nodes for all components
    const modelNodes: GraphNode[] = models.map(m => ({ id: m.id, type: 'model', label: `${m.name}.js`, data: m, x: 0, y: 0 }));
    const controllerNodes: GraphNode[] = controllers.map(c => ({ id: c.id, type: 'controller', label: c.name, data: c, x: 0, y: 0 }));
    const routeNodes: GraphNode[] = routes.map(r => ({ id: r.id, type: 'route', label: r.name, data: r, x: 0, y: 0 }));
    const apiNodes: GraphNode[] = allApis.map(a => ({ id: a.id, type: 'api', label: `${a.method} ${a.endpoint}`, data: a, x: 0, y: 0 }));
    const middlewareNodes: GraphNode[] = middlewares.map(m => ({ id: m.id, type: 'middleware', label: m.name, data: m, x: 0, y: 0 }));
    
    const allNodes = [...modelNodes, ...controllerNodes, ...routeNodes, ...apiNodes, ...middlewareNodes];
    
    // Create maps for quick lookups by name or ID
    const modelNodeMapByName = new Map(modelNodes.map(n => [n.label, n]));
    const controllerNodeMapByName = new Map(controllerNodes.map(n => [n.label, n]));
    const routeNodeMapByName = new Map(routeNodes.map(n => [n.label, n]));
    const apiNodeMapById = new Map(apiNodes.map(n => [n.id, n]));

    // 2. Create edges based on the desired flow: Model -> Controller -> Route -> API
    const allEdges: GraphEdge[] = [];

    // Edges: Models -> Controllers (Controllers require Models)
    controllers.forEach(controller => {
      const targetNode = controllerNodeMapByName.get(controller.name);
      if (!targetNode) return;
      const matches = [...controller.code.matchAll(/require\(['"]\.\.\/models\/(\w+)['"]\)/g)];
      matches.forEach(match => {
        const modelName = `${match[1]}.js`;
        const sourceNode = modelNodeMapByName.get(modelName);
        if (sourceNode) {
          allEdges.push({ id: `${sourceNode.id}-${targetNode.id}`, source: sourceNode.id, target: targetNode.id });
        }
      });
    });

    // Edges: Controllers -> Routes (Routes require Controllers)
    routes.forEach(route => {
        const targetNode = routeNodeMapByName.get(route.name);
        if (!targetNode) return;
        const match = route.code.match(/require\(['"]\.\.\/controllers\/(.*?)['"]\)/);
        if (match) {
            const controllerName = match[1];
            const sourceNode = controllerNodeMapByName.get(controllerName);
            if (sourceNode) {
                 allEdges.push({ id: `${sourceNode.id}-${targetNode.id}`, source: sourceNode.id, target: targetNode.id });
            }
        }
    });

    // Edges: Routes -> APIs (Routes define API endpoints)
    routes.forEach(route => {
        const sourceNode = routeNodeMapByName.get(route.name);
        if (!sourceNode) return;
        const routeDefinitions = [...route.code.matchAll(/router\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g)];
        routeDefinitions.forEach(match => {
            const method = match[1].toUpperCase();
            const endpoint = match[2];
            const targetApi = allApis.find(api => api.method === method && api.endpoint === endpoint);
            if (targetApi) {
               const targetNode = apiNodeMapById.get(targetApi.id);
               if (targetNode) {
                   allEdges.push({ id: `${sourceNode.id}-${targetNode.id}`, source: sourceNode.id, target: targetNode.id });
               }
            }
        });
    });

    // 3. Position nodes in columns
    const columns: Record<NodeType, GraphNode[]> = { model: [], controller: [], route: [], api: [], middleware: [] };
    allNodes.forEach(node => {
        if(columns[node.type]) {
            columns[node.type].push(node);
        }
    });
    
    // Define the horizontal position for each column
    const colX: Record<NodeType, number> = { 
        model: 0,
        controller: COL_GAP, 
        route: COL_GAP * 2,
        api: COL_GAP * 3,
        middleware: -COL_GAP, // Off to the side, as it's not connected in this flow
    };
    
    Object.entries(columns).forEach(([type, colNodes]) => {
      const colHeight = colNodes.length * ROW_GAP;
      colNodes.forEach((node, i) => {
        node.x = colX[type as NodeType];
        node.y = i * ROW_GAP - colHeight / 2;
      });
    });
    
    return { nodes: allNodes, edges: allEdges };
  }, [apiCollections, models, controllers, routes, middlewares]);

  // Center view on initial load
  useEffect(() => {
    if (svgRef.current) {
        const { width, height } = svgRef.current.getBoundingClientRect();
        setTransform({ x: width / 2 - COL_GAP, y: height / 2, k: 1 });
    }
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { deltaY } = e;
    const scaleFactor = 0.95;
    const newScale = deltaY > 0 ? transform.k * scaleFactor : transform.k / scaleFactor;
    setTransform(t => ({...t, k: Math.max(0.1, Math.min(3, newScale))}));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startPoint.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    svgRef.current!.style.cursor = 'grabbing';
  };
  
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.clientX - startPoint.current.x;
    const y = e.clientY - startPoint.current.y;
    setTransform(t => ({...t, x, y }));
  };
  
  const onMouseUpOrLeave = () => {
    isDragging.current = false;
    if (svgRef.current) {
      svgRef.current!.style.cursor = 'grab';
    }
  };

  const resetView = useCallback(() => {
     if (svgRef.current) {
        const { width, height } = svgRef.current.getBoundingClientRect();
        setTransform({ x: width / 2 - COL_GAP, y: height / 2, k: 1 });
    }
  }, []);

  return (
    <div className="w-full h-full bg-gray-800/20 rounded-lg overflow-hidden relative border border-gray-700 select-none">
      {nodes.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
              <p>No components to visualize. Generate some code to get started!</p>
          </div>
      )}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onWheel={handleWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUpOrLeave}
        onMouseLeave={onMouseUpOrLeave}
        style={{ cursor: 'grab' }}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {edges.map(edge => (
            <VisualizerEdge key={edge.id} edge={edge} nodes={nodes} />
          ))}
          {nodes.map(node => (
            <VisualizerNode key={node.id} node={node} />
          ))}
        </g>
      </svg>
      <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
          <button onClick={resetView} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-semibold text-white" title="Reset View">
            Reset
          </button>
      </div>
    </div>
  );
};

export default Visualizer;
