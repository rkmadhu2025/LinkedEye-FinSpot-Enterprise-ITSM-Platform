import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { useClickOutside } from '@/hooks/useClickOutside';
import { logout } from '@/store/slices/authSlice';
import { toggleTheme } from '@/store/slices/uiSlice';
import ClientSelector from './ClientSelector';
import {
  Search,
  Bell,
  Settings,
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown,
  RefreshCw,
  Activity,
  Shield,
  Clock,
  X,
  Command,
} from 'lucide-react';
import clsx from 'clsx';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { sidebarCollapsed, theme } = useAppSelector((state) => state.ui);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const userMenuRef = useClickOutside<HTMLDivElement>(() => setUserMenuOpen(false));
  const notificationsRef = useClickOutside<HTMLDivElement>(() => setNotificationsOpen(false));

  const handleLogout = useCallback(async () => {
    await dispatch(logout());
    navigate('/login');
  }, [dispatch, navigate]);

  const getPageTitle = useCallback(() => {
    const path = location.pathname;
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/incidents': 'Incident Management',
      '/incidents/create': 'Create Incident',
      '/changes': 'Change Management',
      '/changes/create': 'Create Change Request',
      '/changes/calendar': 'Change Calendar',
      '/assets': 'Asset Management',
      '/assets/create': 'Create Asset',
      '/network/devices': 'Network Devices',
      '/network/topology': 'Network Topology',
      '/monitoring': 'Monitoring',
      '/integrations': 'Integrations',
      '/users': 'User Management',
      '/groups': 'Groups',
      '/roles': 'Roles',
      '/settings': 'Settings',
      '/reports': 'Reports',
      '/analytics': 'Analytics',
      '/problems': 'Problem Management',
    };
    return titles[path] || 'LinkedEye-FinSpot';
  }, [location.pathname]);

  const mockNotifications = [
    {
      id: '1',
      type: 'incident',
      title: 'Critical incident assigned',
      message: 'INC0015847 has been assigned to you',
      time: '5 min ago',
      unread: true,
      icon: <Activity size={16} className="text-danger-400" />,
    },
    {
      id: '2',
      type: 'change',
      title: 'Change approved',
      message: 'CHG0012456 has been approved',
      time: '1 hour ago',
      unread: true,
      icon: <Shield size={16} className="text-success-400" />,
    },
    {
      id: '3',
      type: 'alert',
      title: 'SLA Warning',
      message: 'INC0015842 is approaching SLA breach',
      time: '2 hours ago',
      unread: false,
      icon: <Clock size={16} className="text-warning-400" />,
    },
  ];

  const unreadCount = mockNotifications.filter((n) => n.unread).length;

  // Get user initials
  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    : 'RM';

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 h-16 flex items-center justify-between px-6 z-[100]',
        'transition-all duration-300 ease-out',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
        'border-b border-gray-200/80 dark:border-gray-800/80',
        'shadow-sm',
        sidebarCollapsed ? 'left-[72px]' : 'left-[260px]'
      )}
      role="banner"
    >
      {/* Left - Page Title, System Status, Client Selector, and Search */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
            {getPageTitle()}
          </h1>
          <div
            className={clsx(
              'hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full',
              'bg-success-50 dark:bg-success-500/10',
              'ring-1 ring-success-200 dark:ring-success-500/20'
            )}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
            <span className="text-[11px] font-medium text-success-700 dark:text-success-400">
              Operational
            </span>
          </div>
        </div>

        {/* Client Selector - for admin users */}
        <ClientSelector
          isAdmin={user?.role === 'admin' || user?.role === 'super_admin'}
          userClientId={user?.client_id}
        />

        {/* Search */}
        <div className="relative hidden md:block group">
          <div
            className={clsx(
              'absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300',
              'bg-gradient-to-r from-primary-500/10 to-primary-400/10 blur-xl',
              searchFocused && 'opacity-100'
            )}
          />
          <div className="relative">
            <Search
              size={16}
              className={clsx(
                'absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200',
                searchFocused ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
              )}
            />
            <input
              type="text"
              placeholder="Search incidents by ID, title, assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={clsx(
                'w-80 pl-10 pr-20 py-2.5 rounded-xl text-sm',
                'bg-gray-100 dark:bg-gray-800',
                'border border-transparent',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'transition-all duration-200',
                'focus:outline-none focus:bg-white dark:focus:bg-gray-900',
                'focus:border-primary-300 dark:focus:border-primary-600',
                'focus:ring-4 focus:ring-primary-500/10 dark:focus:ring-primary-400/10'
              )}
            />
            {/* Keyboard shortcut hint */}
            <div
              className={clsx(
                'absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1',
                'transition-opacity duration-200',
                searchFocused ? 'opacity-0' : 'opacity-100'
              )}
            >
              <kbd
                className={clsx(
                  'px-1.5 py-0.5 text-[10px] font-medium rounded',
                  'bg-gray-200 dark:bg-gray-700',
                  'text-gray-500 dark:text-gray-400',
                  'border border-gray-300 dark:border-gray-600'
                )}
              >
                <Command size={10} className="inline -mt-0.5" />
              </kbd>
              <kbd
                className={clsx(
                  'px-1.5 py-0.5 text-[10px] font-medium rounded',
                  'bg-gray-200 dark:bg-gray-700',
                  'text-gray-500 dark:text-gray-400',
                  'border border-gray-300 dark:border-gray-600'
                )}
              >
                K
              </kbd>
            </div>
            {/* Clear button */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={clsx(
                  'absolute right-3 top-1/2 -translate-y-1/2',
                  'p-1 rounded-full',
                  'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                  'hover:bg-gray-200 dark:hover:bg-gray-700',
                  'transition-colors duration-200'
                )}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-1.5">
        {/* Refresh Button */}
        <button
          className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            'transition-all duration-200',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'hover:text-primary-600 dark:hover:text-primary-400',
            'active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50'
          )}
          title="Refresh"
          aria-label="Refresh page"
        >
          <RefreshCw size={18} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            'transition-all duration-200',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'hover:text-primary-600 dark:hover:text-primary-400',
            'active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50'
          )}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center relative',
              'transition-all duration-200',
              'text-gray-500 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'hover:text-primary-600 dark:hover:text-primary-400',
              'active:scale-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
              notificationsOpen && 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400'
            )}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            aria-haspopup="true"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                className={clsx(
                  'absolute top-1 right-1 min-w-[18px] h-[18px] px-1',
                  'rounded-full flex items-center justify-center',
                  'text-[10px] font-bold text-white',
                  'bg-danger-500 shadow-lg shadow-danger-500/30',
                  'ring-2 ring-white dark:ring-gray-900'
                )}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className={clsx(
                'absolute right-0 top-full mt-2 w-96 rounded-2xl overflow-hidden',
                'bg-white dark:bg-gray-900',
                'border border-gray-200 dark:border-gray-800',
                'shadow-2xl shadow-gray-900/10 dark:shadow-black/30',
                'animate-in fade-in slide-in-from-top-2 duration-200'
              )}
              role="menu"
              aria-orientation="vertical"
            >
              <div
                className={clsx(
                  'px-5 py-4 flex items-center justify-between',
                  'border-b border-gray-100 dark:border-gray-800',
                  'bg-gray-50/50 dark:bg-gray-800/50'
                )}
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <button
                  className={clsx(
                    'text-xs font-medium',
                    'text-primary-600 dark:text-primary-400',
                    'hover:text-primary-700 dark:hover:text-primary-300',
                    'focus:outline-none focus:underline',
                    'transition-colors duration-200'
                  )}
                >
                  Mark all as read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {mockNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={clsx(
                      'px-5 py-4 cursor-pointer transition-colors duration-200',
                      notification.unread
                        ? 'bg-primary-50/50 dark:bg-primary-500/5'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    )}
                    role="menuitem"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={clsx(
                          'p-2.5 rounded-xl',
                          'bg-gray-100 dark:bg-gray-800'
                        )}
                      >
                        {notification.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          {notification.unread && (
                            <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm truncate mt-0.5 text-gray-600 dark:text-gray-400">
                          {notification.message}
                        </p>
                        <p className="text-xs mt-1.5 flex items-center gap-1 text-gray-400 dark:text-gray-500">
                          <Clock size={10} />
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className={clsx(
                  'px-5 py-3',
                  'bg-gray-50 dark:bg-gray-800/50',
                  'border-t border-gray-100 dark:border-gray-800'
                )}
              >
                <button
                  className={clsx(
                    'w-full text-center text-sm font-medium',
                    'text-primary-600 dark:text-primary-400',
                    'hover:text-primary-700 dark:hover:text-primary-300',
                    'focus:outline-none focus:underline',
                    'transition-colors duration-200'
                  )}
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings - hidden on mobile */}
        <button
          onClick={() => navigate('/settings')}
          className={clsx(
            'hidden md:flex w-10 h-10 rounded-xl items-center justify-center',
            'transition-all duration-200',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'hover:text-primary-600 dark:hover:text-primary-400',
            'active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50'
          )}
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2" />

        {/* User Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={clsx(
              'flex items-center gap-3 p-1.5 rounded-xl',
              'transition-all duration-200',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
              userMenuOpen && 'bg-gray-100 dark:bg-gray-800'
            )}
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div
              className={clsx(
                'w-9 h-9 rounded-full flex items-center justify-center',
                'text-white text-sm font-semibold',
                'bg-gradient-to-br from-primary-500 to-primary-600',
                'shadow-md shadow-primary-500/30',
                'ring-2 ring-white dark:ring-gray-900'
              )}
            >
              {userInitials}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {user?.displayName || `${user?.firstName} ${user?.lastName}` || 'Rajkumar Madhu'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {user?.jobTitle || 'Sr. DevOps Engineer'}
              </p>
            </div>
            <ChevronDown
              size={16}
              className={clsx(
                'hidden lg:block transition-transform duration-200',
                'text-gray-400 dark:text-gray-500',
                userMenuOpen && 'rotate-180'
              )}
            />
          </button>

          {userMenuOpen && (
            <div
              className={clsx(
                'absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden',
                'bg-white dark:bg-gray-900',
                'border border-gray-200 dark:border-gray-800',
                'shadow-2xl shadow-gray-900/10 dark:shadow-black/30',
                'animate-in fade-in slide-in-from-top-2 duration-200'
              )}
              role="menu"
              aria-orientation="vertical"
            >
              <div
                className={clsx(
                  'px-5 py-4',
                  'border-b border-gray-100 dark:border-gray-800',
                  'bg-gray-50/50 dark:bg-gray-800/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      'text-white font-bold text-lg',
                      'bg-gradient-to-br from-primary-500 to-primary-600',
                      'shadow-lg shadow-primary-500/30'
                    )}
                  >
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate text-gray-900 dark:text-white">
                      {user?.displayName || `${user?.firstName} ${user?.lastName}` || 'Rajkumar Madhu'}
                    </p>
                    <p className="text-sm truncate text-gray-500 dark:text-gray-400">
                      {user?.email || 'rajkumar.m@finspot.io'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="py-2">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setUserMenuOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-5 py-2.5 text-sm',
                    'transition-colors duration-200',
                    'text-gray-700 dark:text-gray-300',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'hover:text-gray-900 dark:hover:text-white',
                    'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800'
                  )}
                  role="menuitem"
                >
                  <User size={16} />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setUserMenuOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-5 py-2.5 text-sm',
                    'transition-colors duration-200',
                    'text-gray-700 dark:text-gray-300',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'hover:text-gray-900 dark:hover:text-white',
                    'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800'
                  )}
                  role="menuitem"
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
              </div>
              <div className="py-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={handleLogout}
                  className={clsx(
                    'w-full flex items-center gap-3 px-5 py-2.5 text-sm',
                    'transition-colors duration-200',
                    'text-danger-600 dark:text-danger-400',
                    'hover:bg-danger-50 dark:hover:bg-danger-500/10',
                    'focus:outline-none focus:bg-danger-50 dark:focus:bg-danger-500/10'
                  )}
                  role="menuitem"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
