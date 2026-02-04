/**
 * Network Topology Visualization Component
 *
 * An advanced, interactive network topology visualization with:
 * - Hierarchical layer-based layout (f_swi → r_swi → e_swi → s_hw)
 * - 3D-style device icons with vendor-specific styling
 * - Animated connection lines showing data flow
 * - Real-time status indicators
 * - Drag-and-drop node positioning
 * - Zoom and pan controls
 * - Device detail tooltips
 * - Connection highlighting on hover
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TopologyData,
  TopologyNode,
  TopologyEdge,
  NetworkLayerType,
  DeviceVendor,
  NetworkLayerInfo,
  DeviceVendorInfo,
} from '../../types';
import { getStatusColor, getLayerColor, formatBandwidth, formatUptime } from '../../services/infrastructureService';
import {
  Shield,
  Network,
  Share2,
  Server,
  Box,
  Database,
  Wifi,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Download,
  ChevronDown,
  Activity,
  Cpu,
  HardDrive,
  Thermometer,
} from 'lucide-react';

// =====================================
// Types
// =====================================

interface NetworkTopologyVisualizationProps {
  data: TopologyData;
  width?: number;
  height?: number;
  onNodeClick?: (node: TopologyNode) => void;
  onEdgeClick?: (edge: TopologyEdge) => void;
  onPositionChange?: (positions: Record<string, { x: number; y: number }>) => void;
  showMetrics?: boolean;
  showConnections?: boolean;
  showPorts?: boolean;
  viewMode?: '2d' | '3d';
}

interface NodePosition {
  x: number;
  y: number;
}

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

// =====================================
// Device Icon Components
// =====================================

const DeviceIcon3D: React.FC<{
  category: string;
  vendor?: DeviceVendor | null;
  status: string;
  size?: number;
}> = ({ category, vendor, status, size = 60 }) => {
  const statusColor = getStatusColor(status);
  const vendorColor = vendor ? DeviceVendorInfo[vendor]?.color || '#6b7280' : '#6b7280';

  // 3D-style SVG device representations
  const renderDevice = () => {
    switch (category.toLowerCase()) {
      case 'firewall':
        return (
          <g>
            {/* 3D Firewall Box */}
            <defs>
              <linearGradient id={`fw-gradient-${status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={vendorColor} stopOpacity="1" />
                <stop offset="100%" stopColor={vendorColor} stopOpacity="0.6" />
              </linearGradient>
              <filter id="fw-shadow">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3" />
              </filter>
            </defs>
            {/* Main body */}
            <rect x="5" y="15" width="50" height="30" rx="3" fill={`url(#fw-gradient-${status})`} filter="url(#fw-shadow)" />
            {/* Top face (3D effect) */}
            <polygon points="5,15 15,5 55,5 55,15" fill={vendorColor} opacity="0.8" />
            <polygon points="55,5 65,15 55,15" fill={vendorColor} opacity="0.5" />
            {/* Status LED */}
            <circle cx="52" cy="20" r="3" fill={statusColor}>
              <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Ports */}
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={10 + i * 10} y="38" width="6" height="4" rx="1" fill="#333" />
            ))}
            {/* Shield icon overlay */}
            <Shield size={16} className="absolute" style={{ transform: 'translate(22px, 22px)' }} color="#fff" opacity={0.8} />
          </g>
        );

      case 'router':
        return (
          <g>
            <defs>
              <linearGradient id={`rtr-gradient-${status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={vendorColor} stopOpacity="1" />
                <stop offset="100%" stopColor={vendorColor} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Router body */}
            <rect x="5" y="20" width="50" height="25" rx="2" fill={`url(#rtr-gradient-${status})`} filter="url(#fw-shadow)" />
            {/* 3D top */}
            <polygon points="5,20 12,12 55,12 55,20" fill={vendorColor} opacity="0.7" />
            <polygon points="55,12 62,20 55,20" fill={vendorColor} opacity="0.4" />
            {/* Antennas */}
            <rect x="15" y="5" width="3" height="15" fill="#333" />
            <rect x="42" y="5" width="3" height="15" fill="#333" />
            <circle cx="16.5" cy="5" r="3" fill="#666" />
            <circle cx="43.5" cy="5" r="3" fill="#666" />
            {/* Status LED */}
            <circle cx="50" cy="25" r="2.5" fill={statusColor}>
              <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
            </circle>
            {/* Ports */}
            {[0, 1, 2].map((i) => (
              <rect key={i} x={12 + i * 12} y="38" width="8" height="5" rx="1" fill="#333" />
            ))}
          </g>
        );

      case 'switch':
        return (
          <g>
            <defs>
              <linearGradient id={`sw-gradient-${status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={vendorColor} stopOpacity="1" />
                <stop offset="100%" stopColor={vendorColor} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Switch body (rack-mount style) */}
            <rect x="2" y="22" width="56" height="20" rx="2" fill={`url(#sw-gradient-${status})`} filter="url(#fw-shadow)" />
            {/* 3D effect */}
            <polygon points="2,22 5,18 58,18 58,22" fill={vendorColor} opacity="0.7" />
            <polygon points="58,18 61,22 58,22" fill={vendorColor} opacity="0.4" />
            {/* Port bank */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <rect key={i} x={6 + i * 6} y="28" width="4" height="8" rx="0.5" fill="#333" />
            ))}
            {/* Activity LEDs */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <circle key={i} cx={8 + i * 6} cy="25" r="1.5" fill={i % 3 === 0 ? statusColor : '#22c55e'}>
                {i % 2 === 0 && (
                  <animate attributeName="opacity" values="1;0.3;1" dur={`${0.5 + i * 0.1}s`} repeatCount="indefinite" />
                )}
              </circle>
            ))}
          </g>
        );

      case 'server':
        return (
          <g>
            <defs>
              <linearGradient id={`srv-gradient-${status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#374151" stopOpacity="1" />
                <stop offset="100%" stopColor="#1f2937" stopOpacity="1" />
              </linearGradient>
            </defs>
            {/* Server tower */}
            <rect x="12" y="5" width="36" height="50" rx="3" fill={`url(#srv-gradient-${status})`} filter="url(#fw-shadow)" />
            {/* 3D effect */}
            <polygon points="12,5 16,2 48,2 48,5" fill="#4b5563" />
            <polygon points="48,2 52,5 48,5" fill="#374151" />
            {/* Drive bays */}
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <rect x="16" y={10 + i * 12} width="28" height="8" rx="1" fill="#1f2937" stroke="#4b5563" strokeWidth="0.5" />
                <circle cx="40" cy={14 + i * 12} r="2" fill={i === 0 ? statusColor : '#22c55e'}>
                  <animate attributeName="opacity" values="1;0.4;1" dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
            {/* Ventilation grille */}
            <rect x="16" y="46" width="28" height="6" rx="1" fill="#111" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={i} x1={18 + i * 4} y1="47" x2={18 + i * 4} y2="51" stroke="#333" strokeWidth="1" />
            ))}
          </g>
        );

      case 'virtual_machine':
        return (
          <g>
            <defs>
              <linearGradient id={`vm-gradient-${status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            {/* VM container (dashed border for virtual) */}
            <rect
              x="10" y="10" width="40" height="40" rx="5"
              fill={`url(#vm-gradient-${status})`}
              stroke="#a78bfa"
              strokeWidth="2"
              strokeDasharray="4,2"
              filter="url(#fw-shadow)"
            />
            {/* Inner box */}
            <rect x="18" y="18" width="24" height="24" rx="2" fill="#1f2937" opacity="0.8" />
            {/* VM icon */}
            <Box size={16} style={{ transform: 'translate(22px, 22px)' }} color="#fff" />
            {/* Status indicator */}
            <circle cx="45" cy="15" r="4" fill={statusColor}>
              <animate attributeName="r" values="4;5;4" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        );

      default:
        return (
          <g>
            <rect x="10" y="10" width="40" height="40" rx="5" fill={vendorColor} opacity="0.8" filter="url(#fw-shadow)" />
            <Cpu size={20} style={{ transform: 'translate(20px, 20px)' }} color="#fff" />
            <circle cx="45" cy="15" r="3" fill={statusColor} />
          </g>
        );
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 60 60">
      {renderDevice()}
    </svg>
  );
};

// =====================================
// Node Component
// =====================================

const TopologyNodeComponent: React.FC<{
  node: TopologyNode;
  position: NodePosition;
  isSelected: boolean;
  isHighlighted: boolean;
  showMetrics: boolean;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
  onClick: () => void;
}> = ({ node, position, isSelected, isHighlighted, showMetrics, onDragStart, onClick }) => {
  const layerColor = getLayerColor(node.layer);
  const statusColor = getStatusColor(node.health_status);

  return (
    <g
      transform={`translate(${position.x - 40}, ${position.y - 40})`}
      style={{ cursor: 'pointer' }}
      onMouseDown={(e) => onDragStart(e, node.id)}
      onClick={onClick}
    >
      {/* Selection/Highlight ring */}
      {(isSelected || isHighlighted) && (
        <circle
          cx="40" cy="40" r="45"
          fill="none"
          stroke={isSelected ? '#3b82f6' : '#f59e0b'}
          strokeWidth="3"
          strokeDasharray={isHighlighted ? '5,3' : 'none'}
        >
          <animate attributeName="stroke-opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Layer color background */}
      <circle cx="40" cy="40" r="38" fill={layerColor} opacity="0.15" />

      {/* Device icon */}
      <g transform="translate(10, 10)">
        <DeviceIcon3D
          category={node.device_category}
          vendor={node.device_vendor}
          status={node.health_status}
          size={60}
        />
      </g>

      {/* Hostname label */}
      <text
        x="40" y="90"
        textAnchor="middle"
        fill="#f3f4f6"
        fontSize="11"
        fontWeight="600"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
      >
        {node.hostname.length > 15 ? `${node.hostname.substring(0, 12)}...` : node.hostname}
      </text>

      {/* Model label */}
      {node.device_model && (
        <text
          x="40" y="102"
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="9"
        >
          {node.device_model}
        </text>
      )}

      {/* Status indicator */}
      <circle cx="65" cy="15" r="6" fill={statusColor} stroke="#1f2937" strokeWidth="2">
        <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Metrics overlay */}
      {showMetrics && node.metrics && (
        <g transform="translate(5, 110)">
          <rect x="0" y="0" width="70" height="35" rx="4" fill="#1f2937" opacity="0.9" />
          {node.metrics.cpu_usage !== null && (
            <g transform="translate(5, 10)">
              <Cpu size={10} color="#9ca3af" />
              <text x="14" y="8" fill="#f3f4f6" fontSize="8">{node.metrics.cpu_usage.toFixed(0)}%</text>
            </g>
          )}
          {node.metrics.memory_usage !== null && (
            <g transform="translate(40, 10)">
              <HardDrive size={10} color="#9ca3af" />
              <text x="14" y="8" fill="#f3f4f6" fontSize="8">{node.metrics.memory_usage.toFixed(0)}%</text>
            </g>
          )}
          {node.metrics.uptime_seconds !== null && (
            <g transform="translate(5, 25)">
              <Activity size={10} color="#22c55e" />
              <text x="14" y="8" fill="#22c55e" fontSize="8">{formatUptime(node.metrics.uptime_seconds)}</text>
            </g>
          )}
        </g>
      )}

      {/* Port count badge */}
      {node.port_count !== null && node.port_count > 0 && (
        <g transform="translate(60, 60)">
          <circle cx="0" cy="0" r="10" fill="#374151" stroke="#4b5563" />
          <text x="0" y="4" textAnchor="middle" fill="#f3f4f6" fontSize="9" fontWeight="bold">
            {node.port_count}
          </text>
        </g>
      )}
    </g>
  );
};

// =====================================
// Connection Component
// =====================================

const TopologyEdgeComponent: React.FC<{
  edge: TopologyEdge;
  sourcePos: NodePosition;
  targetPos: NodePosition;
  isHighlighted: boolean;
  onClick: () => void;
}> = ({ edge, sourcePos, targetPos, isHighlighted, onClick }) => {
  const statusColor = getStatusColor(edge.status);
  const isActive = edge.status === 'active';

  // Calculate bezier curve control points
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const midX = (sourcePos.x + targetPos.x) / 2;
  const midY = (sourcePos.y + targetPos.y) / 2;
  const curvature = Math.min(Math.abs(dy) * 0.3, 80);

  const pathD = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY - curvature} ${targetPos.x} ${targetPos.y}`;

  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      {/* Connection line shadow */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={isHighlighted ? 6 : 4}
        strokeLinecap="round"
      />

      {/* Main connection line */}
      <path
        d={pathD}
        fill="none"
        stroke={isHighlighted ? '#f59e0b' : statusColor}
        strokeWidth={isHighlighted ? 4 : 2}
        strokeLinecap="round"
        strokeDasharray={edge.relationship_type === 'RUNS_ON' ? '8,4' : 'none'}
        opacity={isActive ? 1 : 0.5}
      />

      {/* Animated data flow particles */}
      {isActive && (
        <>
          <circle r="3" fill="#fff">
            <animateMotion dur="2s" repeatCount="indefinite">
              <mpath href={`#path-${edge.id}`} />
            </animateMotion>
          </circle>
          <path id={`path-${edge.id}`} d={pathD} fill="none" stroke="none" />
        </>
      )}

      {/* Bandwidth label */}
      {edge.bandwidth_mbps && (
        <g transform={`translate(${midX}, ${midY - curvature / 2 - 10})`}>
          <rect x="-20" y="-8" width="40" height="16" rx="4" fill="#1f2937" opacity="0.9" />
          <text x="0" y="4" textAnchor="middle" fill="#9ca3af" fontSize="8">
            {formatBandwidth(edge.bandwidth_mbps)}
          </text>
        </g>
      )}

      {/* Relationship type indicator for special connections */}
      {edge.relationship_type !== 'CONNECTS_TO' && (
        <g transform={`translate(${midX - 30}, ${midY - curvature / 2 + 5})`}>
          <rect x="0" y="0" width="60" height="14" rx="3" fill="#374151" stroke={statusColor} strokeWidth="1" />
          <text x="30" y="10" textAnchor="middle" fill="#f3f4f6" fontSize="7">
            {edge.relationship_type}
          </text>
        </g>
      )}
    </g>
  );
};

// =====================================
// Layer Group Component
// =====================================

const LayerGroup: React.FC<{
  layer: NetworkLayerType;
  bounds: { minX: number; maxX: number; y: number };
  nodeCount: number;
}> = ({ layer, bounds, nodeCount }) => {
  const layerInfo = NetworkLayerInfo[layer];
  const width = bounds.maxX - bounds.minX + 160;

  return (
    <g transform={`translate(${bounds.minX - 80}, ${bounds.y - 60})`}>
      {/* Layer background */}
      <rect
        x="0" y="0"
        width={width}
        height="180"
        rx="10"
        fill={layerInfo.color}
        opacity="0.05"
        stroke={layerInfo.color}
        strokeWidth="1"
        strokeDasharray="8,4"
      />

      {/* Layer label */}
      <g transform="translate(10, 20)">
        <rect x="0" y="0" width="160" height="30" rx="5" fill={layerInfo.color} opacity="0.2" />
        <text x="10" y="20" fill={layerInfo.color} fontSize="12" fontWeight="bold">
          {layerInfo.name}
        </text>
        <text x="130" y="20" fill="#9ca3af" fontSize="10">
          ({nodeCount})
        </text>
      </g>

      {/* Layer description */}
      <text x="10" y="60" fill="#6b7280" fontSize="9">
        {layerInfo.description}
      </text>
    </g>
  );
};

// =====================================
// Main Component
// =====================================

const NetworkTopologyVisualization: React.FC<NetworkTopologyVisualizationProps> = ({
  data,
  width = 1200,
  height = 800,
  onNodeClick,
  onEdgeClick,
  onPositionChange,
  showMetrics = true,
  showConnections = true,
  showPorts = false,
  viewMode = '2d',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, panX: 0, panY: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Calculate initial positions based on hierarchical layout
  const calculateInitialPositions = useCallback(() => {
    const layers: NetworkLayerType[] = ['f_swi', 'r_swi', 'e_swi', 's_hw'];
    const layerY: Record<NetworkLayerType, number> = {
      f_swi: 100,
      r_swi: 280,
      e_swi: 460,
      s_hw: 640,
    };

    const newPositions: Record<string, NodePosition> = {};

    layers.forEach((layer) => {
      const layerNodes = data?.nodes?.filter((n) => n.layer === layer) || [];
      const nodeSpacing = Math.min(180, (width - 200) / Math.max(layerNodes.length, 1));
      const startX = (width - (layerNodes.length - 1) * nodeSpacing) / 2;

      layerNodes.forEach((node, index) => {
        // Use saved position if available, otherwise calculate
        if (node.position) {
          newPositions[node.id] = node.position;
        } else {
          newPositions[node.id] = {
            x: startX + index * nodeSpacing,
            y: layerY[layer],
          };
        }
      });
    });

    return newPositions;
  }, [data?.nodes, width]);

  // Initialize positions
  useEffect(() => {
    setPositions(calculateInitialPositions());
  }, [calculateInitialPositions]);

  // Calculate layer boundaries for group rendering
  const layerBounds = useMemo(() => {
    const bounds: Record<NetworkLayerType, { minX: number; maxX: number; y: number; count: number }> = {
      f_swi: { minX: Infinity, maxX: -Infinity, y: 100, count: 0 },
      r_swi: { minX: Infinity, maxX: -Infinity, y: 280, count: 0 },
      e_swi: { minX: Infinity, maxX: -Infinity, y: 460, count: 0 },
      s_hw: { minX: Infinity, maxX: -Infinity, y: 640, count: 0 },
    };

    data?.nodes?.forEach((node) => {
      const pos = positions[node.id];
      if (pos) {
        bounds[node.layer].minX = Math.min(bounds[node.layer].minX, pos.x);
        bounds[node.layer].maxX = Math.max(bounds[node.layer].maxX, pos.x);
        bounds[node.layer].count++;
      }
    });

    return bounds;
  }, [data?.nodes, positions]);

  // Handle node drag start
  const handleDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragNode(nodeId);
    const nodePos = positions[nodeId];
    if (nodePos && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - nodePos.x * viewState.zoom - viewState.panX,
        y: e.clientY - rect.top - nodePos.y * viewState.zoom - viewState.panY,
      });
    }
  }, [positions, viewState]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragNode && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - dragOffset.x - viewState.panX) / viewState.zoom;
      const newY = (e.clientY - rect.top - dragOffset.y - viewState.panY) / viewState.zoom;

      setPositions((prev) => ({
        ...prev,
        [dragNode]: { x: newX, y: newY },
      }));
    }
  }, [isDragging, dragNode, dragOffset, viewState]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isDragging && dragNode) {
      setIsDragging(false);
      setDragNode(null);
      if (onPositionChange) {
        onPositionChange(positions);
      }
    }
  }, [isDragging, dragNode, positions, onPositionChange]);

  // Handle node click
  const handleNodeClick = useCallback((node: TopologyNode) => {
    setSelectedNode(node.id === selectedNode ? null : node.id);

    // Highlight connected nodes and edges
    const connectedNodes = new Set<string>();
    const connectedEdges = new Set<string>();

    data?.edges?.forEach((edge) => {
      if (edge.source === node.id || edge.target === node.id) {
        connectedEdges.add(edge.id);
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      }
    });

    setHighlightedNodes(selectedNode === node.id ? new Set() : connectedNodes);
    setHighlightedEdges(selectedNode === node.id ? new Set() : connectedEdges);

    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [data?.edges, selectedNode, onNodeClick]);

  // Zoom controls
  const handleZoom = useCallback((delta: number) => {
    setViewState((prev) => ({
      ...prev,
      zoom: Math.max(0.3, Math.min(2, prev.zoom + delta)),
    }));
  }, []);

  const handleResetView = useCallback(() => {
    setViewState({ zoom: 1, panX: 0, panY: 0 });
    setPositions(calculateInitialPositions());
  }, [calculateInitialPositions]);

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ width, height, background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
      {/* Control Panel */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleZoom(0.1)}
            className="w-10 h-10 flex items-center justify-center bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl text-white transition-all backdrop-blur-sm shadow-lg"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => handleZoom(-0.1)}
            className="w-10 h-10 flex items-center justify-center bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl text-white transition-all backdrop-blur-sm shadow-lg"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleResetView}
            className="w-10 h-10 flex items-center justify-center bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl text-white transition-all backdrop-blur-sm shadow-lg"
            title="Reset View"
          >
            <Maximize2 size={18} />
          </button>
          <button
            onClick={() => setPositions(calculateInitialPositions())}
            className="w-10 h-10 flex items-center justify-center bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl text-white transition-all backdrop-blur-sm shadow-lg"
            title="Auto Layout"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Statistics Panel */}
      <div className="absolute top-4 left-4 z-10 bg-black/75 backdrop-blur-md border border-white/10 rounded-xl p-4 min-w-[200px] shadow-xl">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Activity size={14} className="text-pink-500" />
          Network Status
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-gray-300">
            <span>Total Nodes:</span>
            <span className="text-white font-mono">{data?.statistics?.total_nodes || 0}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Connections:</span>
            <span className="text-white font-mono">{data?.statistics?.total_edges || 0}</span>
          </div>
          <div className="h-px bg-white/10 my-2" />
          <div className="flex justify-between text-gray-300 items-center">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Healthy</span>
            <span className="text-white font-mono">{data?.statistics?.healthy_nodes || 0}</span>
          </div>
          <div className="flex justify-between text-gray-300 items-center">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span> Warning</span>
            <span className="text-white font-mono">{data?.statistics?.warning_nodes || 0}</span>
          </div>
          <div className="flex justify-between text-gray-300 items-center">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> Critical</span>
            <span className="text-white font-mono">{data?.statistics?.critical_nodes || 0}</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/75 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl">
        <h4 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">Network Layers</h4>
        <div className="space-y-2">
          {Object.entries(NetworkLayerInfo).map(([layer, info]) => (
            <div key={layer} className="flex items-center gap-3 text-xs">
              <div className="w-3 h-3 rounded shadow-lg" style={{ backgroundColor: info.color, boxShadow: `0 0 10px ${info.color}60` }} />
              <span className="text-gray-200">{info.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <defs>
          {/* Grid pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.5" />
          </pattern>

          {/* Glow filter for active elements */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Shadow filter */}
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background grid */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Transform group for zoom and pan */}
        <g transform={`translate(${viewState.panX}, ${viewState.panY}) scale(${viewState.zoom})`}>
          {/* Layer groups */}
          {Object.entries(layerBounds)
            .filter(([_, bounds]) => bounds.count > 0)
            .map(([layer, bounds]) => (
              <LayerGroup
                key={layer}
                layer={layer as NetworkLayerType}
                bounds={bounds}
                nodeCount={bounds.count}
              />
            ))}

          {/* Connections */}
          {showConnections &&
            data?.edges?.map((edge) => {
              const sourcePos = positions[edge.source];
              const targetPos = positions[edge.target];
              if (!sourcePos || !targetPos) return null;

              return (
                <TopologyEdgeComponent
                  key={edge.id}
                  edge={edge}
                  sourcePos={sourcePos}
                  targetPos={targetPos}
                  isHighlighted={highlightedEdges.has(edge.id)}
                  onClick={() => onEdgeClick?.(edge)}
                />
              );
            })}

          {/* Nodes */}
          {data?.nodes?.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;

            return (
              <TopologyNodeComponent
                key={node.id}
                node={node}
                position={pos}
                isSelected={selectedNode === node.id}
                isHighlighted={highlightedNodes.has(node.id)}
                showMetrics={showMetrics}
                onDragStart={handleDragStart}
                onClick={() => handleNodeClick(node)}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default NetworkTopologyVisualization;
