import { NavLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { toggleSidebar, setCurrentEnvironment } from '@/store/slices/uiSlice';
import {
  LayoutDashboard,
  AlertCircle,
  RefreshCw,
  Package,
  Server,
  Network,
  BarChart3,
  FileText,
  Users,
  UserCog,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Bug,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const { sidebarCollapsed, currentEnvironment } = useAppSelector((state) => state.ui);
  const [environmentDropdownOpen, setEnvironmentDropdownOpen] = useState(false);

  const navSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
      ],
    },
    {
      title: 'ITSM',
      items: [
        { label: 'Incidents', path: '/incidents', icon: <AlertCircle size={20} />, badge: 12 },
        { label: 'Problems', path: '/problems', icon: <Bug size={20} />, badge: 5 },
        { label: 'Changes', path: '/changes', icon: <RefreshCw size={20} />, badge: 3 },
      ],
    },
    {
      title: 'Infrastructure',
      items: [
        { label: 'Assets', path: '/assets', icon: <Package size={20} /> },
        { label: 'Network Devices', path: '/network/devices', icon: <Server size={20} /> },
        { label: 'Topology', path: '/network/topology', icon: <Network size={20} /> },
      ],
    },
    {
      title: 'Monitoring',
      items: [
        { label: 'Monitoring', path: '/monitoring', icon: <Eye size={20} /> },
        { label: 'Integrations', path: '/integrations', icon: <Plug size={20} /> },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Reports', path: '/reports', icon: <FileText size={20} /> },
        { label: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Users', path: '/users', icon: <Users size={20} /> },
        { label: 'Groups', path: '/groups', icon: <UserCog size={20} /> },
        { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
      ],
    },
  ];

  const environments = [
    { id: 'production', label: 'Production', color: 'bg-green-500' },
    { id: 'staging', label: 'Staging', color: 'bg-yellow-500' },
    { id: 'development', label: 'Development', color: 'bg-blue-500' },
    { id: 'qa', label: 'QA', color: 'bg-purple-500' },
  ];

  const currentEnv = environments.find((e) => e.id === currentEnvironment) || environments[0];

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-navy-950 text-white z-40 flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-[70px]' : 'w-[260px]'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Eye size={18} aria-hidden="true" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden min-w-0">
              <h1 className="text-sm font-bold truncate">LinkedEye-FinSpot</h1>
              <p className="text-[10px] text-gray-400 truncate">Enterprise ITSM</p>
            </div>
          )}
        </div>
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
        >
          {sidebarCollapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
        </button>
      </div>

      {/* Navigation - improved overflow handling for collapsed state */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide min-h-0">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            {!sidebarCollapsed && (
              <h3 className="px-4 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            {/* Show section title as tooltip indicator when collapsed */}
            {sidebarCollapsed && (
              <div className="h-px bg-white/10 mx-4 mb-2" aria-hidden="true" />
            )}
            <ul className="space-y-1" role="list">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-colors relative group',
                        isActive
                          ? 'bg-primary-600/20 text-white border-l-[3px] border-primary-500'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white',
                        sidebarCollapsed && 'justify-center px-2'
                      )
                    }
                    title={sidebarCollapsed ? item.label : undefined}
                    aria-label={item.label}
                  >
                    <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate text-sm">{item.label}</span>
                        {item.badge && (
                          <span
                            className="bg-danger-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            aria-label={`${item.badge} items`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {/* Badge indicator for collapsed state */}
                    {sidebarCollapsed && item.badge && (
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center"
                        aria-label={`${item.badge} items`}
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                    {/* Tooltip for collapsed state */}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                        {item.label}
                        {item.badge && <span className="ml-1 text-danger-400">({item.badge})</span>}
                      </div>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Environment Selector */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-white/10">
          <div className="relative">
            <button
              onClick={() => setEnvironmentDropdownOpen(!environmentDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={clsx('w-2 h-2 rounded-full', currentEnv.color)} />
                <span className="text-sm">{currentEnv.label}</span>
              </div>
              <ChevronDown
                size={16}
                className={clsx('transition-transform', environmentDropdownOpen && 'rotate-180')}
              />
            </button>

            {environmentDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-navy-900 rounded-lg border border-white/10 py-1 shadow-lg">
                {environments.map((env) => (
                  <button
                    key={env.id}
                    onClick={() => {
                      dispatch(setCurrentEnvironment(env.id));
                      setEnvironmentDropdownOpen(false);
                    }}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors',
                      env.id === currentEnvironment && 'bg-white/5'
                    )}
                  >
                    <span className={clsx('w-2 h-2 rounded-full', env.color)} />
                    <span className="text-sm">{env.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
