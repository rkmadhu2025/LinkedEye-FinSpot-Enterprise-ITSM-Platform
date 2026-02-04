import { NavLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { toggleSidebar, setCurrentEnvironment } from '@/store/slices/uiSlice';
import { clientService } from '@/services/clientService';
import { Client } from '@/types';
import {
  LayoutDashboard,
  AlertTriangle,
  GitBranch,
  Search,
  Network,
  Package,
  Server,
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
  Phone,
  Activity,
  Shield,
  Globe,
  ClipboardList,
  BookOpen,
  Brain,
  MessageSquare,
  CalendarClock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  badgeType?: 'danger' | 'warning';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const { sidebarCollapsed, currentEnvironment } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);
  const [environmentDropdownOpen, setEnvironmentDropdownOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  // Fetch clients from the API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoadingClients(true);
        const data = await clientService.listClients({ status: 'active' });
        setClients(data);

        // If no current environment is set, set to first client
        if (!currentEnvironment && data.length > 0) {
          dispatch(setCurrentEnvironment(data[0].id));
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error);
        // Fallback to current user's client if API fails
        if (user?.client_id) {
          try {
            const currentClient = await clientService.getCurrentClient();
            setClients([currentClient]);
          } catch {
            console.error('Failed to fetch current client');
          }
        }
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, [dispatch, currentEnvironment, user?.client_id]);

  // LinkedEye Reference Navigation Structure
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
        { label: 'Incidents', path: '/incidents', icon: <AlertTriangle size={20} />, badge: 23, badgeType: 'danger' },
        { label: 'Changes', path: '/changes/dashboard', icon: <GitBranch size={20} />, badge: 5, badgeType: 'warning' },
        { label: 'Problems', path: '/problems', icon: <Search size={20} /> },
      ],
    },
    {
      title: 'Infrastructure',
      items: [
        { label: 'Network', path: '/network/topology', icon: <Network size={20} /> },
        { label: 'Assets', path: '/assets', icon: <Package size={20} /> },
        { label: 'Devices', path: '/network/devices', icon: <Server size={20} /> },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Escalation', path: '/on-call/dashboard', icon: <Shield size={20} /> },
        { label: 'On-Call', path: '/on-call/schedules', icon: <Phone size={20} /> },
        { label: 'Rotations', path: '/on-call/rotations', icon: <CalendarClock size={20} /> },
        { label: 'Monitoring', path: '/monitoring', icon: <Activity size={20} /> },
        { label: 'Metrics & Logs', path: '/monitoring/visualization', icon: <BarChart3 size={20} /> },
        { label: 'Alert Intelligence', path: '/alert-intelligence', icon: <Brain size={20} /> },
        { label: 'Runbooks', path: '/runbooks', icon: <BookOpen size={20} /> },
        { label: 'ChatOps', path: '/chatops', icon: <MessageSquare size={20} /> },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
        { label: 'Reports', path: '/reports', icon: <FileText size={20} /> },
        { label: 'Postmortems', path: '/postmortems', icon: <ClipboardList size={20} /> },
        { label: 'Status Pages', path: '/status-pages', icon: <Globe size={20} /> },
      ],
    },
    {
      title: 'Admin',
      items: [
        { label: 'Users', path: '/users', icon: <Users size={20} /> },
        { label: 'Groups', path: '/groups', icon: <UserCog size={20} /> },
        { label: 'Integrations', path: '/integrations', icon: <Plug size={20} /> },
        { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
      ],
    },
  ];

  // Get current selected client from the fetched clients
  const currentClient = clients.find((c) => c.id === currentEnvironment) || clients[0];

  // Get environment status color
  const getEnvStatusColor = (env: string) => {
    switch (env?.toLowerCase()) {
      case 'production':
        return 'bg-success-500';
      case 'dr':
        return 'bg-warning-500';
      case 'uat':
        return 'bg-info-500';
      case 'development':
        return 'bg-purple-500';
      case 'staging':
        return 'bg-gray-500';
      default:
        return 'bg-success-500';
    }
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full z-[200] flex flex-col text-white transition-all duration-300 ease-out',
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      style={{
        background: 'linear-gradient(180deg, #0f1c3f 0%, #1e3a5f 100%)',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)'
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
            }}
          >
            <Eye size={20} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden min-w-0">
              <h1 className="text-base font-bold text-white truncate tracking-tight">LinkedEye</h1>
              <p className="text-[10px] text-white/50 truncate font-medium">FinSpot Enterprise</p>
            </div>
          )}
        </div>
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-2 rounded-lg transition-all duration-200 flex-shrink-0 hover:scale-105"
          style={{ background: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={18} className="text-white/60" />
          ) : (
            <ChevronLeft size={18} className="text-white/60" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-4 px-3"
        style={{ height: 'calc(100vh - 140px)' }}
      >
        {navSections.map((section) => (
          <div key={section.title} className="mb-5">
            {!sidebarCollapsed && (
              <h3
                className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'rgba(255, 255, 255, 0.4)' }}
              >
                {section.title}
              </h3>
            )}
            {sidebarCollapsed && (
              <div
                className="h-px mx-3 mb-2"
                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                        sidebarCollapsed && 'justify-center px-2'
                      )
                    }
                    style={({ isActive }) => ({
                      color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                      background: isActive
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        : 'transparent',
                      boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
                    })}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 truncate text-sm">{item.label}</span>
                            {item.badge && (
                              <span
                                className="px-2 py-0.5 text-[10px] font-semibold rounded-[10px] text-white"
                                style={{
                                  background:
                                    item.badgeType === 'warning' ? '#f59e0b' : '#ef4444',
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                        {/* Tooltip for collapsed state */}
                        {sidebarCollapsed && (
                          <div
                            className="absolute left-full ml-3 px-3 py-2 rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-white text-xs"
                            style={{
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {item.label}
                              {item.badge && (
                                <span
                                  className="px-1.5 py-0.5 rounded-full text-[10px]"
                                  style={{
                                    background:
                                      item.badgeType === 'warning'
                                        ? 'rgba(245, 158, 11, 0.2)'
                                        : 'rgba(239, 68, 68, 0.2)',
                                    color:
                                      item.badgeType === 'warning' ? '#fbbf24' : '#f87171',
                                  }}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45"
                              style={{
                                background: 'rgba(15, 23, 42, 0.95)',
                                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                            />
                          </div>
                        )}
                        {/* Badge indicator for collapsed state - with extended touch target */}
                        {sidebarCollapsed && item.badge && (
                          <span
                            className="absolute -top-1 -right-1 w-5 h-5 text-white text-[9px] font-bold rounded-full flex items-center justify-center before:absolute before:inset-[-12px] before:content-['']"
                            style={{
                              background:
                                item.badgeType === 'warning' ? '#f59e0b' : '#ef4444',
                            }}
                            aria-label={`${item.badge} ${item.badgeType === 'warning' ? 'warnings' : 'alerts'}`}
                          >
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer - Client/Environment Selector */}
      <div
        className="p-4"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        {!sidebarCollapsed ? (
          <div className="relative">
            <button
              onClick={() => setEnvironmentDropdownOpen(!environmentDropdownOpen)}
              className="w-full px-3 py-2.5 rounded-lg text-xs font-medium text-white flex items-center gap-2.5 transition-colors"
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')
              }
            >
              {isLoadingClients ? (
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse" />
              ) : (
                <div className={clsx('w-2.5 h-2.5 rounded-full', getEnvStatusColor(currentClient?.environment))} />
              )}
              <div className="flex-1 min-w-0 text-left">
                <span className="truncate block">
                  {isLoadingClients
                    ? 'Loading...'
                    : currentClient?.display_name || currentClient?.name || 'Select Client'}
                </span>
                {currentClient?.environment && (
                  <span className="text-[10px] text-white/50 truncate block">
                    {currentClient.environment.toUpperCase()}
                    {currentClient.location && ` • ${currentClient.location}`}
                  </span>
                )}
              </div>
              <ChevronDown
                size={16}
                className={clsx(
                  'flex-shrink-0 transition-transform duration-200',
                  environmentDropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {environmentDropdownOpen && clients.length > 0 && (
              <div
                className="absolute bottom-full left-0 right-0 mb-2 rounded-lg py-2 max-h-64 overflow-y-auto"
                style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      dispatch(setCurrentEnvironment(client.id));
                      clientService.setSelectedClient(client.id);
                      setEnvironmentDropdownOpen(false);
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white transition-colors',
                      client.id === currentEnvironment && 'bg-white/5'
                    )}
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')
                    }
                    onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      client.id === currentEnvironment
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'transparent')
                    }
                  >
                    <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', getEnvStatusColor(client.environment))} />
                    <div className="flex-1 min-w-0 text-left">
                      <span className="truncate block">{client.display_name || client.name}</span>
                      <span className="text-[10px] text-white/50 truncate block">
                        {client.client_code}
                        {client.environment && ` • ${client.environment.toUpperCase()}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setEnvironmentDropdownOpen(!environmentDropdownOpen)}
            className="w-full flex justify-center p-2 rounded-lg transition-colors group relative"
            title={currentClient?.display_name || currentClient?.name || 'Select Client'}
          >
            <div className={clsx('w-3 h-3 rounded-full', getEnvStatusColor(currentClient?.environment))} />
            <div
              className="absolute left-full ml-3 px-3 py-2 rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-white text-xs"
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="font-medium">{currentClient?.display_name || currentClient?.name || 'No client'}</div>
              {currentClient?.environment && (
                <div className="text-white/50 text-[10px] mt-0.5">
                  {currentClient.environment.toUpperCase()}
                  {currentClient.location && ` • ${currentClient.location}`}
                </div>
              )}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45"
                style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              />
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
