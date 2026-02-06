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
  MessageSquare,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
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

  // Simplified Navigation Structure - Core ITSM Functions Only
  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
      ],
    },
    {
      title: 'Service Management',
      items: [
        { label: 'Incidents', path: '/incidents', icon: <AlertTriangle size={20} />, badge: 23, badgeType: 'danger' },
        { label: 'Changes', path: '/changes/dashboard', icon: <GitBranch size={20} />, badge: 5, badgeType: 'warning' },
        { label: 'Problems', path: '/problems', icon: <Search size={20} /> },
      ],
    },
    {
      title: 'Infrastructure',
      items: [
        { label: 'Assets', path: '/assets', icon: <Package size={20} /> },
        { label: 'Network', path: '/network/topology', icon: <Network size={20} /> },
        { label: 'Devices', path: '/network/devices', icon: <Server size={20} /> },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'On-Call', path: '/on-call/schedules', icon: <Phone size={20} /> },
        { label: 'SMS & Voice', path: '/communications/sms-voice', icon: <MessageSquare size={20} /> },
        { label: 'Monitoring', path: '/monitoring', icon: <Activity size={20} /> },
      ],
    },
    {
      title: 'Insights',
      items: [
        { label: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
        { label: 'Reports', path: '/reports', icon: <FileText size={20} /> },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Users', path: '/users', icon: <Users size={20} /> },
        { label: 'Teams', path: '/groups', icon: <UserCog size={20} /> },
        { label: 'Integrations', path: '/integrations', icon: <Plug size={20} /> },
        { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
      ],
    },
  ];

  // Get current selected client from the fetched clients
  const currentClient = clients.find((c) => c.id === currentEnvironment) || clients[0];

  // Get environment status color
  const getEnvStatusColor = useCallback((env: string) => {
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
  }, []);

  // Handle environment selection
  const handleEnvironmentSelect = useCallback((clientId: string) => {
    dispatch(setCurrentEnvironment(clientId));
    clientService.setSelectedClient(clientId);
    setEnvironmentDropdownOpen(false);
  }, [dispatch]);

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full z-[200] flex flex-col text-white',
        'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        'bg-gradient-to-b from-[#0c1929] via-[#0f2744] to-[#142952]',
        'shadow-[4px_0_32px_rgba(0,0,0,0.25)]',
        'border-r border-white/[0.04]',
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/[0.03] via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative px-5 py-4 flex items-center justify-between gap-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              'bg-gradient-to-br from-primary-500 to-primary-600',
              'shadow-[0_4px_16px_rgba(97,114,243,0.4)]',
              'ring-1 ring-white/10',
              'transition-transform duration-300 hover:scale-105'
            )}
          >
            <Eye size={20} className="text-white drop-shadow-sm" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
              <h1 className="text-base font-bold text-white truncate tracking-tight">
                LinkedEye
              </h1>
              <p className="text-[10px] text-white/40 truncate font-medium">
                FinSpot Enterprise
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => dispatch(toggleSidebar())}
          className={clsx(
            'p-2 rounded-lg flex-shrink-0',
            'transition-all duration-200',
            'hover:bg-white/[0.08] active:bg-white/[0.12]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50'
          )}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={18} className="text-white/50 transition-colors group-hover:text-white/70" />
          ) : (
            <ChevronLeft size={18} className="text-white/50 transition-colors group-hover:text-white/70" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav
        className="relative flex-1 overflow-y-auto py-4 px-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        style={{ height: 'calc(100vh - 140px)' }}
      >
        {navSections.map((section, sectionIndex) => (
          <div
            key={section.title}
            className="mb-5"
            style={{
              animationDelay: `${sectionIndex * 50}ms`,
            }}
          >
            {!sidebarCollapsed && (
              <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {section.title}
              </h3>
            )}
            {sidebarCollapsed && (
              <div className="h-px mx-3 mb-2 bg-white/[0.08]" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg',
                        'transition-all duration-200 ease-out group',
                        sidebarCollapsed && 'justify-center px-2',
                        isActive
                          ? clsx(
                              'bg-gradient-to-r from-primary-600 to-primary-500',
                              'text-white shadow-[0_4px_16px_rgba(97,114,243,0.35)]',
                              'ring-1 ring-white/10'
                            )
                          : clsx(
                              'text-white/60',
                              'hover:text-white hover:bg-white/[0.06]',
                              'active:bg-white/[0.10]'
                            )
                      )
                    }
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={clsx(
                            'w-5 h-5 flex-shrink-0 transition-transform duration-200',
                            !isActive && 'group-hover:scale-110'
                          )}
                        >
                          {item.icon}
                        </span>
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 truncate text-sm font-medium">
                              {item.label}
                            </span>
                            {item.badge !== undefined && (
                              <span
                                className={clsx(
                                  'px-2 py-0.5 text-[10px] font-semibold rounded-full text-white',
                                  'transition-transform duration-200 group-hover:scale-105',
                                  item.badgeType === 'warning'
                                    ? 'bg-warning-500 shadow-[0_2px_8px_rgba(234,179,8,0.3)]'
                                    : 'bg-danger-500 shadow-[0_2px_8px_rgba(239,68,68,0.3)]'
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}

                        {/* Tooltip for collapsed state */}
                        {sidebarCollapsed && (
                          <div
                            className={clsx(
                              'absolute left-full ml-3 px-3 py-2 rounded-lg whitespace-nowrap z-50',
                              'opacity-0 invisible pointer-events-none',
                              'group-hover:opacity-100 group-hover:visible',
                              'transition-all duration-200 ease-out',
                              'bg-gray-900/95 backdrop-blur-sm',
                              'border border-white/10 shadow-xl',
                              'text-white text-xs font-medium'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {item.label}
                              {item.badge !== undefined && (
                                <span
                                  className={clsx(
                                    'px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                                    item.badgeType === 'warning'
                                      ? 'bg-warning-500/20 text-warning-400'
                                      : 'bg-danger-500/20 text-danger-400'
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {/* Tooltip arrow */}
                            <div
                              className={clsx(
                                'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1',
                                'w-2 h-2 rotate-45',
                                'bg-gray-900/95 border-l border-b border-white/10'
                              )}
                            />
                          </div>
                        )}

                        {/* Badge indicator for collapsed state */}
                        {sidebarCollapsed && item.badge !== undefined && (
                          <span
                            className={clsx(
                              'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1',
                              'text-white text-[9px] font-bold rounded-full',
                              'flex items-center justify-center',
                              'ring-2 ring-[#0f2744]',
                              item.badgeType === 'warning'
                                ? 'bg-warning-500'
                                : 'bg-danger-500'
                            )}
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
      <div className="relative p-4 border-t border-white/[0.08] z-[300]">
        {!sidebarCollapsed ? (
          <div className="relative">
            <button
              onClick={() => setEnvironmentDropdownOpen(!environmentDropdownOpen)}
              className={clsx(
                'w-full px-3 py-2.5 rounded-lg text-xs font-medium text-white',
                'flex items-center gap-2.5',
                'bg-white/[0.06] hover:bg-white/[0.10]',
                'border border-white/[0.06] hover:border-white/[0.10]',
                'transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50'
              )}
              aria-expanded={environmentDropdownOpen}
              aria-haspopup="listbox"
            >
              {isLoadingClients ? (
                <div className="w-2.5 h-2.5 rounded-full bg-white/30 animate-pulse" />
              ) : (
                <div
                  className={clsx(
                    'w-2.5 h-2.5 rounded-full flex-shrink-0',
                    'ring-2 ring-white/20',
                    getEnvStatusColor(currentClient?.environment)
                  )}
                />
              )}
              <div className="flex-1 min-w-0 text-left">
                <span className="truncate block">
                  {isLoadingClients
                    ? 'Loading...'
                    : currentClient?.display_name || currentClient?.name || 'Select Client'}
                </span>
                {currentClient?.environment && (
                  <span className="text-[10px] text-white/40 truncate block">
                    {currentClient.environment.toUpperCase()}
                    {currentClient.location && ` • ${currentClient.location}`}
                  </span>
                )}
              </div>
              <ChevronDown
                size={16}
                className={clsx(
                  'flex-shrink-0 text-white/50 transition-transform duration-200',
                  environmentDropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Environment Dropdown */}
            {environmentDropdownOpen && clients.length > 0 && (
              <div
                className={clsx(
                  'absolute bottom-full left-0 right-0 mb-2 z-[9999]',
                  'rounded-xl py-2 max-h-64 overflow-y-auto',
                  'bg-gray-900 backdrop-blur-xl',
                  'border border-white/20 shadow-2xl',
                  'animate-in fade-in slide-in-from-bottom-2 duration-200'
                )}
                role="listbox"
              >
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleEnvironmentSelect(client.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white',
                      'transition-colors duration-150',
                      client.id === currentEnvironment
                        ? 'bg-primary-500/10'
                        : 'hover:bg-white/[0.06]'
                    )}
                    role="option"
                    aria-selected={client.id === currentEnvironment}
                  >
                    <div
                      className={clsx(
                        'w-2.5 h-2.5 rounded-full flex-shrink-0',
                        'ring-2 ring-white/20',
                        getEnvStatusColor(client.environment)
                      )}
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <span className="truncate block font-medium">
                        {client.display_name || client.name}
                      </span>
                      <span className="text-[10px] text-white/40 truncate block">
                        {client.client_code}
                        {client.environment && ` • ${client.environment.toUpperCase()}`}
                      </span>
                    </div>
                    {client.id === currentEnvironment && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setEnvironmentDropdownOpen(!environmentDropdownOpen)}
            className={clsx(
              'w-full flex justify-center p-2 rounded-lg',
              'transition-all duration-200 group relative',
              'hover:bg-white/[0.08]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50'
            )}
            title={currentClient?.display_name || currentClient?.name || 'Select Client'}
            aria-label="Environment selector"
          >
            <div
              className={clsx(
                'w-3 h-3 rounded-full',
                'ring-2 ring-white/20',
                'transition-transform duration-200 group-hover:scale-110',
                getEnvStatusColor(currentClient?.environment)
              )}
            />
            {/* Tooltip */}
            <div
              className={clsx(
                'absolute left-full ml-3 px-3 py-2 rounded-lg whitespace-nowrap z-50',
                'opacity-0 invisible pointer-events-none',
                'group-hover:opacity-100 group-hover:visible',
                'transition-all duration-200 ease-out',
                'bg-gray-900/95 backdrop-blur-sm',
                'border border-white/10 shadow-xl',
                'text-white text-xs'
              )}
            >
              <div className="font-medium">
                {currentClient?.display_name || currentClient?.name || 'No client'}
              </div>
              {currentClient?.environment && (
                <div className="text-white/40 text-[10px] mt-0.5">
                  {currentClient.environment.toUpperCase()}
                  {currentClient.location && ` • ${currentClient.location}`}
                </div>
              )}
              {/* Tooltip arrow */}
              <div
                className={clsx(
                  'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1',
                  'w-2 h-2 rotate-45',
                  'bg-gray-900/95 border-l border-b border-white/10'
                )}
              />
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
