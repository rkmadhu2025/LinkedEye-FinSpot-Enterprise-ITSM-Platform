/**
 * Iframe Catalog Page
 * 
 * Displays a catalog of external tools and dashboards that can be embedded as iframes.
 * Structured similarly to DeviceCatalogPage with layers and templates.
 * 
 * Layers:
 * - monitoring_tool: Monitoring Tools (Grafana, Kibana, Prometheus)
 * - automation_tool: Automation Platforms (StackStorm, Jenkins, GitLab)
 * - cloud_console: Cloud Management (AWS, Azure, GCP)
 * - custom_internal: Internal Dashboards & Reports
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor,
  Layout,
  Globe,
  Plus,
  Search,
  ChevronDown,
  ArrowLeft,
  Info,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAppSelector } from '@/hooks/useRedux';

import { IframeLayerType, IframeLayer, IframeTemplate } from './types';

const IframeLayers: Record<IframeLayerType, IframeLayer> = {
  monitoring: {
    id: 'monitoring',
    name: 'Operational Monitoring',
    description: 'Real-time observability and logging dashboards',
    icon: <Monitor size={24} />,
    color: '#6366f1' // Indigo
  },
  automation: {
    id: 'automation',
    name: 'Automation Command',
    description: 'Workflow automation and CI/CD pipelines',
    icon: <Zap size={24} />,
    color: '#8b5cf6' // Violet
  },
  cloud: {
    id: 'cloud',
    name: 'Cloud Infrastructure',
    description: 'Public and hybrid cloud management consoles',
    icon: <Globe size={24} />,
    color: '#0ea5e9' // Sky
  },
  internal: {
    id: 'internal',
    name: 'Internal Systems',
    description: 'Proprietary dashboards and reporting tools',
    icon: <Layout size={24} />,
    color: '#10b981' // Emerald
  }
};



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
  },
  {
    id: 'jenkins-ci',
    name: 'Jenkins Production',
    provider: 'Jenkins CI',
    description: 'Continuous Integration / Continuous Deployment',
    url: 'http://jenkins.ci.svc.cluster.local',
    category: 'automation'
  },
  {
    id: 'aws-console',
    name: 'AWS Management Console',
    provider: 'Amazon',
    description: 'Cloud infrastructure control plane',
    url: 'https://console.aws.amazon.com',
    category: 'cloud'
  }
];

const IframeTemplateCard = ({ template, onSelect }: { template: IframeTemplate, onSelect: () => void }) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={onSelect}
      className="architect-card p-5 cursor-pointer bg-white dark:bg-gray-800 border-white/5 group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all">
          <Layout className="text-indigo-400 w-6 h-6" />
        </div>
        <div className="badge-hyper text-[10px] bg-white/5">
          {template.provider}
        </div>
      </div>
      <h4 className="text-white font-bold group-hover:text-indigo-400 transition-colors">{template.name}</h4>
      <p className="text-slate-500 text-xs mt-2 leading-relaxed">{template.description}</p>
      
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-1">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Available</span>
        </div>
        <button className="p-2 bg-indigo-500 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-lg shadow-indigo-500/20">
          <Plus size={14} />
        </button>
      </div>
    </motion.div>
  );
};

const IframeCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [expandedLayers, setExpandedLayers] = useState<Set<IframeLayerType>>(new Set(['monitoring']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleLayer = (layer: IframeLayerType) => {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  return (
    <div className="architect-root min-h-screen p-8 relative overflow-hidden">
      <div className="mesh-aura" />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ x: -5 }}
            onClick={() => navigate('/dashboard')}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold heading-architect tracking-tighter">Iframe Integration Catalog</h1>
            <p className="text-slate-500 text-sm">Synchronize external intelligence and operational planes into the Architect view</p>
          </div>
        </div>

        <div className="relative group hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all focus:w-80"
          />
        </div>
      </header>

      {/* Layer Sections */}
      <div className="relative z-10 space-y-4 max-w-7xl mx-auto">
        {(Object.values(IframeLayers) as IframeLayer[]).map((layer) => (
          <div key={layer.id} className="architect-card overflow-hidden">
            <button
              onClick={() => toggleLayer(layer.id)}
              className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-6">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all group-hover:scale-110"
                  style={{ backgroundColor: `${layer.color}15`, border: `1px solid ${layer.color}30`, color: layer.color }}
                >
                  {layer.icon}
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white tracking-tight">{layer.name}</h3>
                  <p className="text-sm text-slate-500">{layer.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
                  {IframeTemplates.filter(t => t.category === layer.id).length} Blueprints
                </span>
                <div className={clsx("transition-transform duration-500 text-slate-600", expandedLayers.has(layer.id) && "rotate-180")}>
                  <ChevronDown size={20} />
                </div>
              </div>
            </button>

            {expandedLayers.has(layer.id) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-8 pt-0 border-t border-white/5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                  {IframeTemplates
                    .filter(t => t.category === layer.id && (searchQuery === '' || t.name.toLowerCase().includes(searchQuery.toLowerCase())))
                    .map((template) => (
                      <IframeTemplateCard 
                        key={template.id} 
                        template={template} 
                        onSelect={() => navigate(`/infrastructure/iframes/${template.id}`)}
                      />
                    ))
                  }
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="architect-card border-dashed border-white/10 flex flex-col items-center justify-center p-8 gap-4 text-slate-600 hover:text-indigo-400 hover:border-indigo-500/30 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center transition-transform group-hover:rotate-90">
                      <Plus size={24} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Custom Frame</span>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Info Box */}
      <footer className="relative z-10 mt-12 max-w-7xl mx-auto">
        <div className="architect-card p-6 border-indigo-500/10 flex items-start gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl">
            <Info className="text-indigo-400 w-5 h-5" />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-1">Architect Frame Logic</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Iframes integrated via the Architect Hub utilize **Secure Tunneling (TLS 1.3)** and **Dynamic Scaling**. 
              Cross-Origin Resource Sharing (CORS) must be configured on target endpoints to allow embedding from the `finspot.in` domain.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IframeCatalogPage;
