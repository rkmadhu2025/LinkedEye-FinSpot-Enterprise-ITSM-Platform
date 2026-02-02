import { Outlet, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useRedux';
import { Eye, Zap, Bot, TrendingUp, Shield, Network } from 'lucide-react';

const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel - LinkedEye Reference Design */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden flex-col justify-center p-[60px] text-white"
        style={{
          background: 'linear-gradient(135deg, #0f1c3f 0%, #1e3a5f 50%, #2d4a6f 100%)'
        }}
      >
        {/* Animated Background */}
        <div
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-pulse-slow pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'
          }}
        />

        {/* Brand Section */}
        <div className="relative z-10 mb-[60px]">
          <div
            className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-6"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
            }}
          >
            <Eye size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 tracking-tight">LinkedEye-FinSpot</h1>
          <p className="text-lg text-white/80">Enterprise Incident Management Platform</p>
        </div>

        {/* Features List */}
        <div className="relative z-10 flex flex-col gap-5">
          <FeatureItem
            icon={<Zap size={20} />}
            iconClass="bg-linkedeye-icon-yellow text-navy-700"
            title="Real-time Incident Tracking"
            description="Monitor and resolve incidents as they happen"
          />
          <FeatureItem
            icon={<Bot size={20} />}
            iconClass="bg-linkedeye-icon-pink text-white"
            title="AI-Powered Automation"
            description="StackStorm & ML-driven auto-remediation"
          />
          <FeatureItem
            icon={<TrendingUp size={20} />}
            iconClass="bg-linkedeye-icon-orange text-white"
            title="Grafana & Prometheus Integration"
            description="Embedded metrics and alerting workflows"
          />
          <FeatureItem
            icon={<Shield size={20} />}
            iconClass="bg-linkedeye-icon-green text-white"
            title="Financial-Grade Security"
            description="SOC 2, GDPR, and audit-ready compliance"
          />
          <FeatureItem
            icon={<Network size={20} />}
            iconClass="bg-linkedeye-icon-blue text-white"
            title="Network Topology Mapping"
            description="Full infrastructure visibility"
          />
        </div>

        {/* System Status */}
        <div
          className="absolute bottom-10 left-[60px] right-[60px] flex gap-6 p-5 rounded-xl backdrop-blur-sm"
          style={{ background: 'rgba(255, 255, 255, 0.05)' }}
        >
          <StatusItem text="All Systems Operational" />
          <StatusItem text="12 Environments Active" />
          <StatusItem text="99.98% Uptime" />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div
        className="w-full lg:w-[540px] lg:min-w-[540px] bg-white flex flex-col justify-center p-10 lg:p-[60px]"
        style={{ boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.1)' }}
      >
        <div className="w-full max-w-[420px] mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

interface FeatureItemProps {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  description: string;
}

const FeatureItem = ({ icon, iconClass, title, description }: FeatureItemProps) => (
  <div
    className="flex items-center gap-4 p-4 rounded-xl backdrop-blur-sm transition-all duration-300 hover:translate-x-2"
    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-[15px] font-semibold mb-0.5">{title}</div>
      <div className="text-[13px] text-white/70">{description}</div>
    </div>
  </div>
);

const StatusItem = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2.5">
    <div
      className="w-2.5 h-2.5 rounded-full bg-success-500"
      style={{ animation: 'pulse-dot 2s infinite' }}
    />
    <span className="text-xs text-white/80">{text}</span>
  </div>
);

export default AuthLayout;
