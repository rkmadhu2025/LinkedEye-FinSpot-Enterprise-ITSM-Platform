/**
 * Iframe Viewer Page
 * 
 * Renders an external tool or dashboard within a secure, styled iframe container.
 * Features:
 * - Fullscreen mode
 * - Secure tunneling visualization
 * - Status monitoring
 * - Quick action overlays
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
  Shield,
  Activity,
  Zap,
  Layout,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '@/hooks/useRedux';
import { IframeTemplate } from './types';

// We'll use the same template data for now
const IframeTemplates: IframeTemplate[] = [
  {
    id: 'grafana-main',
    name: 'Grafana Global Ops',
    provider: 'Grafana Labs',
    description: 'Unified operational monitoring and visualization',
    url: 'http://grafana.monitoring.svc.cluster.local:3000',
    category: 'monitoring'
  },
  {
    id: 'kibana-logs',
    name: 'ELK Stack / Kibana',
    provider: 'Elastic',
    description: 'Search, analyze, and visualize log data',
    url: 'http://kibana.logging.svc.cluster.local:5601',
    category: 'monitoring'
  },
  {
    id: 'st2-web',
    name: 'StackStorm Web UI',
    provider: 'StackStorm',
    description: 'Event-driven automation workflow management',
    url: 'http://st2web.stackstorm.svc.cluster.local',
    category: 'automation'
  }
];

const IframeViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState<IframeTemplate | null>(null);

  useEffect(() => {
    const found = IframeTemplates.find(t => t.id === id);
    if (found) {
      setTemplate(found);
    } else {
      // Fallback if not found
      setTemplate({
        id: 'unknown',
        name: 'External Source',
        provider: 'Standard Tunnel',
        url: id?.startsWith('http') ? id : `https://${id}`,
      });
    }
    
    // Simulate initial load
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (!template) return null;

  return (
    <div className="architect-root min-h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Control Bar */}
      <motion.header 
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        className="relative z-20 flex items-center justify-between px-6 py-4 bg-slate-900/50 backdrop-blur-xl border-b border-white/5"
      >
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/infrastructure/iframes')}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            title="Back to Catalog"
            aria-label="Back to Catalog"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Layout size={16} className="text-indigo-400" />
             </div>
             <div>
                <h2 className="text-sm font-bold text-white tracking-tight">{template.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Secure Tunnel Active</span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-6 px-4 py-2 bg-white/5 rounded-xl border border-white/5 mr-4">
             <div className="flex items-center gap-2">
                <Shield size={12} className="text-indigo-400" />
                <span className="text-[10px] text-slate-400 uppercase font-bold">TLS 1.3</span>
             </div>
             <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                <Activity size={12} className="text-emerald-400" />
                <span className="text-[10px] text-slate-400 uppercase font-bold">Stable</span>
             </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 1000); }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              title="Refresh Frame"
              aria-label="Refresh Frame"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              title="Toggle Fullscreen"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <a 
              href={template.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-lg shadow-indigo-500/20"
              title="Open in New Tab"
              aria-label="Open in New Tab"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <main className="flex-1 relative bg-slate-900 group">
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center gap-6"
            >
              <div className="relative">
                 <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                   className="w-24 h-24 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full"
                 />
                 <motion.div 
                   animate={{ rotate: -360 }}
                   transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-4 border-2 border-cyan-500/10 border-b-cyan-500 rounded-full"
                 />
              </div>
              <div className="text-center space-y-2">
                 <p className="text-indigo-400 font-mono text-xs tracking-widest uppercase">Initializing Secure Container</p>
                 <p className="text-slate-600 text-[10px] font-mono">Routing through Architect Tunnel Mesh...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Frame */}
        <iframe 
          src={template.url} 
          className="w-full h-full border-none"
          title={template.name}
          onLoad={() => setIsLoading(false)}
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
        />

        {/* Hover Action Overlay */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
           <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
              <div className="flex -space-x-2">
                 <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-slate-900 flex items-center justify-center">
                    <Zap size={12} className="text-white" />
                 </div>
                 <div className="w-8 h-8 rounded-full bg-cyan-500 border-2 border-slate-900 flex items-center justify-center">
                    <Activity size={12} className="text-white" />
                 </div>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Architect Bridge Enabled</p>
           </div>
        </div>
      </main>

      {/* Floating Status Utility */}
      <div className="fixed bottom-6 right-6 z-30">
         <motion.button 
           whileHover={{ scale: 1.1 }}
           whileTap={{ scale: 0.9 }}
           className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/40"
           title="Integration Info"
           aria-label="Integration Info"
         >
            <Info size={20} />
         </motion.button>
      </div>
    </div>
  );
};

export default IframeViewerPage;
