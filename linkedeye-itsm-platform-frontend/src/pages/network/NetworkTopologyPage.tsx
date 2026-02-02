import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { List, ZoomIn, ZoomOut, Maximize2, RefreshCw, Server, Router, Monitor, Database, Cloud, Wifi } from 'lucide-react';
import { Card, CardBody, Button, Badge, Select, Spinner } from '@/components/ui';
import { useAppSelector } from '@/hooks/useRedux';
import { networkService } from '@/services/networkService';

interface NetworkNode {
  id: string;
  name: string;
  type: 'router' | 'switch' | 'server' | 'firewall' | 'database' | 'cloud' | 'workstation';
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  x: number;
  y: number;
  connections: string[];
  metrics?: {
    cpu?: number;
    memory?: number;
    bandwidth?: number;
  };
}

const NetworkTopologyPage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [zoom, setZoom] = useState(100);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopology();
  }, []);

  const fetchTopology = async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      const topologies = await networkService.getTopologies();
      if (topologies && topologies.length > 0) {
        // Use the first active topology
        const topology = topologies[0];
        const backendNodes = topology.nodes || [];
        const edges = topology.edges || [];

        // Generate default positions if nodes don't have x/y coordinates
        const generateDefaultPosition = (index: number, total: number) => {
          const angle = (2 * Math.PI * index) / total - Math.PI / 2; // Start from top
          const radius = Math.min(200, 80 + total * 15); // Dynamic radius based on node count
          return {
            x: 450 + radius * Math.cos(angle),
            y: 300 + radius * Math.sin(angle)
          };
        };

        // Calculate bounding box and scale nodes to fit
        const padding = 80; // Padding around nodes
        const viewWidth = 900;
        const viewHeight = 600;

        // Find min/max coordinates from backend data
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        backendNodes.forEach((node: any) => {
          if (node.x !== undefined && node.y !== undefined) {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
          }
        });

        // Transform backend nodes to frontend structure
        const transformedNodes: NetworkNode[] = backendNodes.map((node: any, index: number) => {
          let position;

          if (node.x !== undefined && node.y !== undefined && minX !== Infinity) {
            // Scale positions to fit in viewBox with padding
            const dataWidth = maxX - minX || 1;
            const dataHeight = maxY - minY || 1;
            const scaleX = (viewWidth - 2 * padding) / dataWidth;
            const scaleY = (viewHeight - 2 * padding) / dataHeight;
            const scale = Math.min(scaleX, scaleY, 1.5); // Cap scale to prevent nodes from being too spread

            position = {
              x: padding + (node.x - minX) * scale + (viewWidth - 2 * padding - dataWidth * scale) / 2,
              y: padding + (node.y - minY) * scale + (viewHeight - 2 * padding - dataHeight * scale) / 2
            };
          } else {
            position = generateDefaultPosition(index, backendNodes.length);
          }

          return {
            id: node.id || `node-${index}`,
            name: node.name || node.hostname || `Node ${index + 1}`,
            type: (node.type || node.device_type || 'server') as NetworkNode['type'],
            status: (node.status || 'unknown') as NetworkNode['status'],
            x: position.x,
            y: position.y,
            connections: [],
            metrics: node.metrics || undefined
          };
        });

        // Map edges to connections
        edges.forEach((edge: any) => {
          const sourceId = edge.source || edge.source_id;
          const targetId = edge.target || edge.target_id;
          const sourceNode = transformedNodes.find(n => n.id === sourceId || n.id === String(sourceId));
          if (sourceNode && targetId) {
            sourceNode.connections.push(String(targetId));
          }
        });

        setNodes(transformedNodes);
      } else {
         // No topologies found - show empty state
         setNodes([]);
         setError(null); // Clear error since empty is valid
      }
    } catch (err: any) {
      console.error("Failed to fetch topology:", err);
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to load network topology.";
      setError(errorMessage);
      setNodes([]); // Clear nodes on error
    } finally {
      setLoading(false);
    }
  };

  const filteredNodes = useMemo(() => {
    if (filter === 'all') return nodes;
    return nodes.filter(node => node.status === filter);
  }, [filter, nodes]);

  const getNodeIcon = (type: NetworkNode['type']) => {
    const iconProps = { size: 24, className: 'text-white' };
    switch (type) {
      case 'router': return <Router {...iconProps} />;
      case 'switch': return <Wifi {...iconProps} />;
      case 'server': return <Server {...iconProps} />;
      case 'firewall': return <Server {...iconProps} />;
      case 'database': return <Database {...iconProps} />;
      case 'cloud': return <Cloud {...iconProps} />;
      case 'workstation': return <Monitor {...iconProps} />;
      default: return <Server {...iconProps} />;
    }
  };

  const getNodeColor = (status: NetworkNode['status']) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      case 'offline': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getNodeBgClass = (status: NetworkNode['status']) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 10, 150));
  const handleZoomOut = () => setZoom(Math.max(zoom - 10, 50));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="text-center max-w-md">
          <p className="text-red-500 mb-4 font-medium">{error}</p>
          <Button onClick={fetchTopology} leftIcon={<RefreshCw size={16} />} disabled={loading}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show empty state if no nodes
  if (!loading && nodes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Network Topology</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Visual representation of network infrastructure</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/network/devices">
              <Button variant="outline" leftIcon={<List size={16} />}>List View</Button>
            </Link>
            <Button variant="outline" leftIcon={<RefreshCw size={16} />} onClick={fetchTopology} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Server size={48} className="text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Network Topology Found</h3>
              <p className="text-gray-500 mb-4">
                No active network topology is available. Create a topology or ensure network devices are configured.
              </p>
              <div className="flex gap-2">
                <Link to="/network/devices">
                  <Button>View Network Devices</Button>
                </Link>
                <Button variant="outline" leftIcon={<RefreshCw size={16} />} onClick={fetchTopology} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Network Topology</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Visual representation of network infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/network/devices">
            <Button variant="outline" leftIcon={<List size={16} />}>List View</Button>
          </Link>
          <Button variant="outline" leftIcon={<Maximize2 size={16} />}>Fullscreen</Button>
        </div>
      </div>

      <Card>
        <CardBody>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleZoomOut}><ZoomOut size={18} /></Button>
              <span className="text-sm text-gray-500 w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn}><ZoomIn size={18} /></Button>
              <div className={`w-px h-6 mx-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={16} />} onClick={fetchTopology} disabled={loading}>
                Refresh
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Select
                options={[
                  { value: 'all', label: 'All Devices' },
                  { value: 'healthy', label: 'Healthy Only' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'critical', label: 'Critical' },
                ]}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-36"
              />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-600">Healthy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-xs text-gray-600">Warning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-600">Critical</span>
                </div>
              </div>
            </div>
          </div>

          {/* Topology Canvas */}
          <div className="relative rounded-lg overflow-auto" style={{ height: '600px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 900 600"
              preserveAspectRatio="xMidYMid meet"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center', minWidth: '900px', minHeight: '600px' }}
            >
              {/* Connection Lines */}
              {nodes.map(node =>
                node.connections.map(targetId => {
                  const target = nodes.find(n => n.id === targetId);
                  if (!target) return null;
                  const isVisible = filteredNodes.includes(node) && filteredNodes.includes(target);
                  if (!isVisible) return null;
                  return (
                    <line
                      key={`${node.id}-${targetId}`}
                      x1={node.x}
                      y1={node.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isDark ? '#475569' : '#cbd5e1'}
                      strokeWidth="2"
                      strokeDasharray={node.status === 'critical' || target.status === 'critical' ? '5,5' : 'none'}
                    />
                  );
                })
              )}

              {/* Traffic Indicators on Lines */}
              {nodes.map(node =>
                node.connections.map(targetId => {
                  const target = nodes.find(n => n.id === targetId);
                  if (!target) return null;
                  const isVisible = filteredNodes.includes(node) && filteredNodes.includes(target);
                  if (!isVisible) return null;
                  const midX = (node.x + target.x) / 2;
                  const midY = (node.y + target.y) / 2;
                  return (
                    <g key={`traffic-${node.id}-${targetId}`}>
                      <circle cx={midX} cy={midY} r="8" fill={isDark ? '#1e293b' : 'white'} stroke={isDark ? '#475569' : '#e5e7eb'} />
                      <text x={midX} y={midY + 4} textAnchor="middle" fontSize="8" fill="#6b7280">
                        ↔
                      </text>
                    </g>
                  );
                })
              )}

              {/* Nodes */}
              {filteredNodes.map(node => (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode(node)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Node Circle */}
                  <circle
                    r="28"
                    fill={getNodeColor(node.status)}
                    className="transition-all hover:opacity-80"
                    style={{
                      filter: selectedNode?.id === node.id ? 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' : 'none',
                    }}
                  />
                  {/* Node Icon */}
                  <foreignObject x="-12" y="-12" width="24" height="24">
                    <div className="flex items-center justify-center w-full h-full">
                      {getNodeIcon(node.type)}
                    </div>
                  </foreignObject>
                  {/* Node Label */}
                  <text
                    y="45"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill={isDark ? '#e2e8f0' : '#374151'}
                  >
                    {node.name}
                  </text>
                  {/* Status Pulse Animation for Critical */}
                  {node.status === 'critical' && (
                    <circle
                      r="28"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      opacity="0.5"
                    >
                      <animate
                        attributeName="r"
                        from="28"
                        to="40"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.5"
                        to="0"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Selected Node Details */}
          {selectedNode && (
            <div className="mt-4 p-4 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getNodeBgClass(selectedNode.status)}`}>
                    {getNodeIcon(selectedNode.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{selectedNode.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{selectedNode.type}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    selectedNode.status === 'healthy' ? 'success' :
                    selectedNode.status === 'warning' ? 'warning' :
                    selectedNode.status === 'critical' ? 'danger' : 'default'
                  }
                >
                  {selectedNode.status}
                </Badge>
              </div>
              {selectedNode.metrics && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {selectedNode.metrics.cpu !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500">CPU Usage</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full rounded-full ${
                              selectedNode.metrics.cpu > 80 ? 'bg-red-500' :
                              selectedNode.metrics.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${selectedNode.metrics.cpu}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedNode.metrics.cpu}%</span>
                      </div>
                    </div>
                  )}
                  {selectedNode.metrics.memory !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500">Memory Usage</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full rounded-full ${
                              selectedNode.metrics.memory > 80 ? 'bg-red-500' :
                              selectedNode.metrics.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${selectedNode.metrics.memory}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedNode.metrics.memory}%</span>
                      </div>
                    </div>
                  )}
                  {selectedNode.metrics.bandwidth !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500">Bandwidth</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full rounded-full ${
                              selectedNode.metrics.bandwidth > 80 ? 'bg-red-500' :
                              selectedNode.metrics.bandwidth > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${selectedNode.metrics.bandwidth}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedNode.metrics.bandwidth}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Link to={`/infrastructure/hosts/${selectedNode.id}`}>
                  <Button size="sm">View Details</Button>
                </Link>
                <Link to={`/network/devices`}>
                  <Button size="sm" variant="outline">Network Devices</Button>
                </Link>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Network Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{nodes.length}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Server size={20} className="text-blue-600" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Healthy</p>
              <p className="text-2xl font-bold text-green-600">
                {nodes.filter(n => n.status === 'healthy').length}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Server size={20} className="text-green-600" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">
                {nodes.filter(n => n.status === 'warning').length}
              </p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Server size={20} className="text-yellow-600" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Critical</p>
              <p className="text-2xl font-bold text-red-600">
                {nodes.filter(n => n.status === 'critical').length}
              </p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <Server size={20} className="text-red-600" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NetworkTopologyPage;
