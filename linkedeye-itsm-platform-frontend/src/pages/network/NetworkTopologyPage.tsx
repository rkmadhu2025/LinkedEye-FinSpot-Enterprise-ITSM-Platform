import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { List, ZoomIn, ZoomOut, Maximize2, RefreshCw, Server, Router, Monitor, Database, Cloud, Wifi } from 'lucide-react';
import { Card, CardBody, Button, Badge, Select } from '@/components/ui';

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

// Sample network topology data
const networkNodes: NetworkNode[] = [
  { id: 'internet', name: 'Internet', type: 'cloud', status: 'healthy', x: 400, y: 50, connections: ['fw-01'] },
  { id: 'fw-01', name: 'FW-EDGE-01', type: 'firewall', status: 'healthy', x: 400, y: 130, connections: ['rt-core-01'], metrics: { cpu: 45, bandwidth: 78 } },
  { id: 'rt-core-01', name: 'RT-CORE-01', type: 'router', status: 'healthy', x: 400, y: 210, connections: ['sw-dist-01', 'sw-dist-02'], metrics: { cpu: 32, bandwidth: 65 } },
  { id: 'sw-dist-01', name: 'SW-DIST-01', type: 'switch', status: 'healthy', x: 250, y: 300, connections: ['srv-web-01', 'srv-web-02'], metrics: { bandwidth: 82 } },
  { id: 'sw-dist-02', name: 'SW-DIST-02', type: 'switch', status: 'warning', x: 550, y: 300, connections: ['srv-app-01', 'db-primary'], metrics: { bandwidth: 91 } },
  { id: 'srv-web-01', name: 'WEB-01', type: 'server', status: 'healthy', x: 150, y: 400, connections: [], metrics: { cpu: 55, memory: 62 } },
  { id: 'srv-web-02', name: 'WEB-02', type: 'server', status: 'healthy', x: 350, y: 400, connections: [], metrics: { cpu: 48, memory: 58 } },
  { id: 'srv-app-01', name: 'APP-01', type: 'server', status: 'critical', x: 450, y: 400, connections: [], metrics: { cpu: 92, memory: 88 } },
  { id: 'db-primary', name: 'DB-PRIMARY', type: 'database', status: 'healthy', x: 650, y: 400, connections: [], metrics: { cpu: 38, memory: 72 } },
];

const NetworkTopologyPage = () => {
  const [zoom, setZoom] = useState(100);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filteredNodes = useMemo(() => {
    if (filter === 'all') return networkNodes;
    return networkNodes.filter(node => node.status === filter);
  }, [filter]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Network Topology</h1>
          <p className="text-gray-500 mt-1">Visual representation of network infrastructure</p>
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
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleZoomOut}><ZoomOut size={18} /></Button>
              <span className="text-sm text-gray-500 w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn}><ZoomIn size={18} /></Button>
              <div className="w-px h-6 bg-gray-200 mx-2" />
              <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={16} />}>Refresh</Button>
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
          <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: '500px' }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 800 500"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
            >
              {/* Connection Lines */}
              {networkNodes.map(node =>
                node.connections.map(targetId => {
                  const target = networkNodes.find(n => n.id === targetId);
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
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      strokeDasharray={node.status === 'critical' || target.status === 'critical' ? '5,5' : 'none'}
                    />
                  );
                })
              )}

              {/* Traffic Indicators on Lines */}
              {networkNodes.map(node =>
                node.connections.map(targetId => {
                  const target = networkNodes.find(n => n.id === targetId);
                  if (!target) return null;
                  const isVisible = filteredNodes.includes(node) && filteredNodes.includes(target);
                  if (!isVisible) return null;
                  const midX = (node.x + target.x) / 2;
                  const midY = (node.y + target.y) / 2;
                  return (
                    <g key={`traffic-${node.id}-${targetId}`}>
                      <circle cx={midX} cy={midY} r="8" fill="white" stroke="#e5e7eb" />
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
                    fill="#374151"
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
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getNodeBgClass(selectedNode.status)}`}>
                    {getNodeIcon(selectedNode.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedNode.name}</h3>
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
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
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
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
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
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
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
                <Link to={`/network/devices/${selectedNode.id}`}>
                  <Button size="sm">View Details</Button>
                </Link>
                <Button size="sm" variant="outline">Create Incident</Button>
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
              <p className="text-2xl font-bold text-gray-900">{networkNodes.length}</p>
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
                {networkNodes.filter(n => n.status === 'healthy').length}
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
                {networkNodes.filter(n => n.status === 'warning').length}
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
                {networkNodes.filter(n => n.status === 'critical').length}
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
