
import { useState, useCallback } from 'react';
import { 
  Search, 
  Clock, 
  Download, 
  RefreshCw, 
  Terminal, 
  ChevronRight,
  ChevronDown,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  Spinner,
  EmptyState,
} from '@/components/ui';
import clsx from 'clsx';
import { queryLokiLogs } from '@/services/monitoringService';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/hooks/useRedux';

interface LogEntry {
  timestamp: string;
  line: string;
  labels?: Record<string, string>;
}

const LogsPage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [query, setQuery] = useState('{job="varlogs"}');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [timeRange, setTimeRange] = useState('1h');
  const [limit, setLimit] = useState(100);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
        toast.error("Please enter a LogQL query");
        return;
    }

    setIsLoading(true);
    setLogs([]); // Clear previous results
    try {
      // Calculate start/end based on timeRange
      const end = new Date();
      let start = new Date();
      
      switch(timeRange) {
        case '15m': start.setMinutes(end.getMinutes() - 15); break;
        case '1h': start.setHours(end.getHours() - 1); break;
        case '6h': start.setHours(end.getHours() - 6); break;
        case '12h': start.setHours(end.getHours() - 12); break;
        case '24h': start.setDate(end.getDate() - 1); break;
        case '7d': start.setDate(end.getDate() - 7); break;
        default: start.setHours(end.getHours() - 1);
      }

      const res = await queryLokiLogs(
        query,
        start.toISOString(),
        end.toISOString(),
        limit
      );

      // Check if backend returned success: false (e.g., Loki integration not configured)
      if (res && res.success === false) {
        toast.error(res.message || "Loki integration not configured. Please configure it in Integrations.");
        setLogs([]);
        return;
      }

      // Parse Loki response format
      // Expected structure: { data: { resultType: "streams", result: [{ stream: {}, values: [ [ts, line], ... ] }] } }
      if (res && res.data && res.data.result) {
          const flatLogs: LogEntry[] = [];
          res.data.result.forEach((stream: any) => {
              if (stream.values) {
                  stream.values.forEach((val: any[]) => {
                      flatLogs.push({
                          timestamp: val[0], // Nanoseconds usually, or ISO? Loki API usually returns nanoseconds as string
                          line: val[1],
                          labels: stream.stream
                      });
                  });
              }
          });
          
          // Sort by timestamp descending
          flatLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setLogs(flatLogs);
          
          if (flatLogs.length === 0) {
              toast.success("Query executed but returned no logs");
          }
      }

    } catch (error) {
      console.error("Failed to query logs:", error);
      toast.error("Failed to fetch logs. Check your query or integration.");
    } finally {
      setIsLoading(false);
    }
  }, [query, timeRange, limit]);

  // Handle timestamp formatting (Loki returns nanoseconds string)
  const formatTime = (ts: string) => {
      try {
        // If string length > 13, it's likely microseconds or nanoseconds
        // Javascript Date takes milliseconds
        const ms = parseInt(ts.substring(0, 13)); 
        return new Date(ms).toLocaleString();
      } catch (e) {
          return ts;
      }
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Terminal className="text-blue-500" />
            Log Explorer
           </h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Query logs using LogQL from Loki</p>
        </div>
        <div className="flex items-center gap-3">
             <Button variant="outline" leftIcon={<Download size={16} />}>Export</Button>
        </div>
      </div>

      {/* Query Bar */}
      <Card className="rounded-xl shadow-sm" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
        <div className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400 font-mono text-sm">LogQL</span>
                        <textarea
                            className={`w-full pl-16 pr-4 py-2.5 rounded-lg font-mono text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none h-12 md:h-12 leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
                            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e5e8eb' }}
                            placeholder='{job="varlogs"}'
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSearch();
                                }
                            }}
                        />
                    </div>
                </div>
                <div className="flex gap-2 items-start">
                    <Select
                        className="w-32"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        options={[
                            {value: '15m', label: 'Last 15m'},
                            {value: '1h', label: 'Last 1h'},
                            {value: '6h', label: 'Last 6h'},
                            {value: '12h', label: 'Last 12h'},
                            {value: '24h', label: 'Last 24h'},
                            {value: '7d', label: 'Last 7 days'},
                        ]}
                    />
                    <Button
                        onClick={handleSearch}
                        isLoading={isLoading}
                        leftIcon={<Search size={16} />}
                        className="h-[42px]"
                    >
                        Run Query
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Auto-refresh: Off
                </span>
                <span>•</span>
                <span>
                    Limit: {limit} lines
                </span>
            </div>
        </div>
      </Card>

      {/* Results */}
      <Card className="rounded-xl shadow-sm min-h-[400px] flex flex-col" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
          {isLoading ? (
             <div className="flex-1 flex items-center justify-center">
                 <Spinner size="lg" />
             </div>
          ) : logs.length === 0 ? (
             <EmptyState
                title="No logs found"
                description={query ? "Try adjusting your query or time range" : "Enter a LogQL query to view logs"}
                icon={<Terminal size={48} className="text-gray-500 mb-4" />}
             />
          ) : (
             <div className="flex-1 overflow-hidden flex flex-col">
                 <div className="px-4 py-2 flex justify-between items-center text-xs text-gray-400" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
                     <span>{logs.length} results found</span>
                     <div className="flex gap-2">
                         <span className="font-mono">timestamp</span>
                         <span className="font-mono">line</span>
                     </div>
                 </div>
                 <div className="overflow-auto flex-1 p-0">
                     <div className="font-mono text-xs w-full">
                        {logs.map((log, idx) => (
                            <div key={idx} className={`flex px-4 py-1.5 group ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`} style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f3f4f6' }}>
                                <div className="text-gray-500 whitespace-nowrap mr-4 w-40 flex-shrink-0 select-none">
                                    {formatTime(log.timestamp)}
                                </div>
                                <div className={`break-all whitespace-pre-wrap flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {log.line}
                                    {log.labels && (
                                        <div className="hidden group-hover:flex flex-wrap gap-1 mt-1">
                                            {Object.entries(log.labels).map(([k, v]) => (
                                                <span key={k} className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'text-gray-300' : 'text-gray-600'}`} style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }}>
                                                    {k}={v}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
             </div>
          )}
      </Card>
    </div>
  );
};

export default LogsPage;
