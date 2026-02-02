/**
 * Architect Advanced Monitoring & Alerts Dashboard
 * 
 * An ultra-immersive, high-fidelity monitoring interface.
 * Features:
 * - Neon-etched status cards
 * - Glass-vibrant alerts list
 * - Real-time service connectivity telemetry
 * - Advanced filtering logic
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Bell, 
  BarChart, 
  Briefcase,
  Terminal,
  Search,
  Filter,
  RefreshCw,
  Zap,
  Shield,
  Info,
  ChevronRight,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { getMonitoringAlerts, getAlertStatsByCategory, type MonitoringAlert } from '@/services/monitoringService';
import { toast } from 'sonner';
import { useAppSelector } from '@/hooks/useRedux';


const MonitoringDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchAlerts = async () => {
    try {
      setIsRefreshing(true);
      const filters: any = {};
      
      if (filter !== 'all') {
        if (filter === 'resolved') {
          filters.status = 'resolved';
        } else {
          filters.severity = filter === 'critical' ? 'critical' : filter === 'warning' ? 'high' : 'low';
        }
      }
      
      const data = await getMonitoringAlerts(filters);
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Failed to load monitoring alerts');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    // Auto-refresh alerts every 30 seconds
    const intervalId = setInterval(() => {
      fetchAlerts();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [filter]);

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          alert.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          alert.message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    critical: alerts.filter(a => (a.severity === 'critical' || a.severity === 'high') && a.status === 'firing').length,
    warning: alerts.filter(a => a.severity === 'medium' && a.status === 'firing').length,
    info: alerts.filter(a => a.severity === 'low' && a.status === 'firing').length,
    healthy: alerts.filter(a => a.status === 'resolved').length
  };

  const formatAlertTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return timestamp;
    }
  };

  const getSeverityDisplay = (severity: string): 'critical' | 'warning' | 'info' | 'healthy' => {
    if (severity === 'critical' || severity === 'high') return 'critical';
    if (severity === 'medium') return 'warning';
    if (severity === 'low') return 'info';
    return 'info';
  };

  if (loading) {
    return (
      <div className="architect-root min-h-screen p-6 lg:p-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Loading Alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="architect-root min-h-screen p-6 lg:p-10 relative overflow-hidden -m-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {isDark && <div className="mesh-aura" />}
      
      <div className="relative z-10 max-w-7xl mx-auto space-y-10">
        
        {/* Advanced Header - From Reference */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx("p-6 flex items-center justify-between rounded-3xl border shadow-[0_0_30px_rgba(99,102,241,0.1)]", isDark ? "architect-card border-indigo-500/20" : "bg-white border-gray-200")}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 relative group">
              <Monitor size={24} className="group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-indigo-500/10 blur-lg rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold tracking-widest uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>LinkedEye</span>
                <span className="text-indigo-400 font-bold">Services</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Service Status</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                 <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
                 <div className="absolute w-3 h-3 bg-emerald-500 rounded-full" />
              </div>
              <span className="text-sm font-bold text-emerald-400 tracking-tight">Connected</span>
            </div>
            <div className="hidden md:block text-right">
               <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Last Synchronized</p>
               <p className="text-xs font-mono text-slate-400">{new Date().toLocaleTimeString()} IST</p>
            </div>
          </div>
        </motion.header>

        {/* Stats Grid - From Reference Image */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatsCardReference 
             label="CRITICAL" 
             value={stats.critical} 
             variant="red" 
             icon={<AlertTriangle size={32} />} 
             delay={0.1}
           />
           <StatsCardReference 
             label="WARNING" 
             value={stats.warning} 
             variant="amber" 
             icon={<Zap size={32} />} 
             delay={0.2}
           />
           <StatsCardReference 
             label="INFO" 
             value={stats.info} 
             variant="blue" 
             icon={<Info size={32} />} 
             delay={0.3}
           />
           <StatsCardReference 
             label="HEALTHY" 
             value={stats.healthy} 
             variant="emerald" 
             icon={<CheckCircle size={32} />} 
             delay={0.4}
           />
        </div>

        {/* Filters & Actions Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col lg:flex-row gap-6 items-center"
        >
          <div className={clsx("p-2 flex flex-wrap gap-2 flex-1 rounded-3xl border", isDark ? "architect-card" : "bg-white border-gray-200")}>
            {['all', 'critical', 'warning', 'info', 'resolved'].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t as any)}
                className={clsx(
                  "px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  filter === t 
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" 
                    : "text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
                )}
              >
                {t === 'all' ? 'All Alerts' : t}
              </button>
            ))}
          </div>

          <div className={clsx("flex items-center px-4 py-2 w-full lg:w-96 group focus-within:border-indigo-500/50 transition-all rounded-3xl border", isDark ? "architect-card" : "bg-white border-gray-200")}>
            <Search size={18} className="text-slate-600 group-focus-within:text-indigo-400" />
            <input 
              type="text"
              placeholder="Search alert vectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none focus:ring-0 text-sm w-full ml-3 ${isDark ? 'text-white placeholder:text-slate-700' : 'text-gray-900 placeholder:text-gray-400'}`}
            />
          </div>

          <div className="flex gap-3">
             <button 
               onClick={fetchAlerts}
               disabled={isRefreshing}
               className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl disabled:opacity-50"
             >
                <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
             </button>
             <button className="px-6 h-12 rounded-2xl bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20">
                Configure Vector
             </button>
          </div>
        </motion.div>

        {/* Alerts List - Architect Grid */}
        <div className="space-y-4">
           <AnimatePresence mode='popLayout'>
            {filteredAlerts.map((alert, idx) => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="group reveal-stagger"
              >
                <div                 className={clsx(
                  "p-6 flex flex-col md:flex-row gap-6 items-start relative overflow-hidden transition-all duration-300 rounded-3xl border",
                  isDark ? "architect-card hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]" : "bg-white border-gray-200 shadow-sm hover:shadow-md",
                  "border-l-4",
                  getSeverityDisplay(alert.severity) === 'critical' ? "border-l-red-500" : 
                  getSeverityDisplay(alert.severity) === 'warning' ? "border-l-amber-500" : 
                  getSeverityDisplay(alert.severity) === 'info' ? "border-l-blue-500" : "border-l-emerald-500"
                )}>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                       <h3 className={`text-lg font-bold tracking-tight group-hover:text-indigo-400 transition-colors uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>
                         {alert.name}
                       </h3>
                       <div className={clsx(
                         "px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/5",
                         getSeverityDisplay(alert.severity) === 'critical' ? "bg-red-500/10 text-red-500" :
                         getSeverityDisplay(alert.severity) === 'warning' ? "bg-amber-500/10 text-amber-500" :
                         getSeverityDisplay(alert.severity) === 'info' ? "bg-blue-500/10 text-blue-500" :
                         "bg-emerald-500/10 text-emerald-500"
                       )}>
                         {alert.severity}
                       </div>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      {alert.message || 'No description available'}
                    </p>
                    <div className="pt-4 flex flex-wrap items-center gap-6 text-[11px] font-bold text-slate-600">
                      <span className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-700" />
                        Time: <span className="text-slate-400">{formatAlertTime(alert.startsAt)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Briefcase size={14} className="text-slate-700" />
                        Source: <span className="text-slate-400 font-mono tracking-tighter">{alert.source}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Monitor size={14} className="text-slate-700" />
                        Status: <span className="text-slate-400 font-mono italic">{alert.status}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col gap-2 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-white/5 pl-0 md:pl-6">
                     <button 
                       onClick={() => navigate(`/monitoring/alerts/${alert.id}`)}
                       className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition-all"
                     >
                        Drill Down
                     </button>
                     {alert.status === 'firing' && (
                       <button className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition-all">
                          Acknowledge
                       </button>
                     )}
                  </div>
                </div>
              </motion.div>
            ))}
           </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

interface StatsCardRefProps {
  label: string;
  value: number;
  variant: 'red' | 'amber' | 'blue' | 'emerald';
  icon: React.ReactNode;
  delay: number;
}

const StatsCardReference: React.FC<StatsCardRefProps> = ({ label, value, variant, icon, delay }) => {
  const colors = {
    red: "border-red-500/30 text-red-500 shadow-red-500/5",
    amber: "border-amber-500/30 text-amber-500 shadow-amber-500/5",
    blue: "border-blue-500/30 text-blue-500 shadow-blue-500/5",
    emerald: "border-emerald-500/30 text-emerald-500 shadow-emerald-500/5"
  };

  const glowColors = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={clsx(
        "architect-card p-8 flex items-center justify-between group cursor-pointer border overflow-hidden",
        colors[variant]
      )}
    >
       <div className="relative z-10">
          <h2 className="text-6xl font-bold tracking-tighter mb-2 font-mono group-hover:scale-105 transition-transform">{value}</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{label}</p>
       </div>
       <div className="relative z-10 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all">
          {icon}
       </div>
       
       {/* Ambient Glow */}
       <div className={clsx(
         "absolute -bottom-8 -right-8 w-24 h-24 blur-3xl opacity-10 group-hover:opacity-30 transition-opacity",
         glowColors[variant]
       )} />
    </motion.div>
  );
};

export default MonitoringDashboardPage;
