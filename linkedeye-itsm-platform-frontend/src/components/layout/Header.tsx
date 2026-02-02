import { useState } from 'react';
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

  const userMenuRef = useClickOutside<HTMLDivElement>(() => setUserMenuOpen(false));
  const notificationsRef = useClickOutside<HTMLDivElement>(() => setNotificationsOpen(false));

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const getPageTitle = () => {
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
  };

  const mockNotifications = [
    {
      id: '1',
      type: 'incident',
      title: 'Critical incident assigned',
      message: 'INC0015847 has been assigned to you',
      time: '5 min ago',
      unread: true,
      icon: <Activity size={16} className="text-red-400" />,
    },
    {
      id: '2',
      type: 'change',
      title: 'Change approved',
      message: 'CHG0012456 has been approved',
      time: '1 hour ago',
      unread: true,
      icon: <Shield size={16} className="text-emerald-400" />,
    },
    {
      id: '3',
      type: 'alert',
      title: 'SLA Warning',
      message: 'INC0015842 is approaching SLA breach',
      time: '2 hours ago',
      unread: false,
      icon: <Clock size={16} className="text-amber-400" />,
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
        'fixed top-0 right-0 h-14 flex items-center justify-between px-6 z-[100] transition-all duration-300',
        'bg-[var(--bg-card)] border-b border-[var(--border-color)]',
        sidebarCollapsed ? 'left-[72px]' : 'left-[260px]'
      )}
      role="banner"
    >
      {/* Left - Page Title, System Status, Client Selector, and Search */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            {getPageTitle()}
          </h1>
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 6px #10b981' }} />
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Operational</span>
          </div>
        </div>

        {/* Client Selector - for admin users */}
        <ClientSelector
          isAdmin={user?.role === 'admin' || user?.role === 'super_admin'}
          userClientId={user?.client_id}
        />

        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            placeholder="Search incidents by ID, title, assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 pl-10 pr-4 py-2.5 rounded-lg text-[13px] transition-all duration-200 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Refresh Button */}
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
          title="Refresh"
          aria-label="Refresh page"
        >
          <RefreshCw size={20} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Notifications */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            aria-haspopup="true"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold text-white bg-[var(--color-danger)]">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-96 rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl"
              role="menu"
              aria-orientation="vertical"
            >
              <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-primary)]">
                  Notifications
                </h3>
                <button className="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] focus:outline-none focus:underline">
                  Mark all as read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {mockNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={clsx(
                      'px-5 py-4 cursor-pointer transition-colors hover:bg-[var(--bg-secondary)]',
                      notification.unread && 'bg-[var(--color-primary-subtle)]'
                    )}
                    role="menuitem"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-xl bg-[var(--bg-secondary)]">
                        {notification.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate text-[var(--text-primary)]">
                            {notification.title}
                          </p>
                          {notification.unread && (
                            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                          )}
                        </div>
                        <p className="text-sm truncate mt-0.5 text-[var(--text-secondary)]">
                          {notification.message}
                        </p>
                        <p className="text-xs mt-1.5 flex items-center gap-1 text-[var(--text-muted)]">
                          <Clock size={10} />
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-[var(--bg-secondary)]">
                <button className="w-full text-center text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] focus:outline-none focus:underline">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings - hidden on mobile */}
        <button
          onClick={() => navigate('/settings')}
          className="hidden md:flex w-10 h-10 rounded-lg items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>

        {/* User Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]">
              {userInitials}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {user?.displayName || `${user?.firstName} ${user?.lastName}` || 'Rajkumar Madhu'}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {user?.jobTitle || 'Sr. DevOps Engineer'}
              </p>
            </div>
            <ChevronDown
              size={16}
              className={clsx(
                'hidden lg:block transition-transform duration-200 text-[var(--text-muted)]',
                userMenuOpen && 'rotate-180'
              )}
            />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl"
              role="menu"
              aria-orientation="vertical"
            >
              <div className="px-5 py-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate text-[var(--text-primary)]">
                      {user?.displayName || `${user?.firstName} ${user?.lastName}` || 'Rajkumar Madhu'}
                    </p>
                    <p className="text-sm truncate text-[var(--text-secondary)]">
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
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] focus:outline-none focus:bg-[var(--bg-secondary)]"
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
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] focus:outline-none focus:bg-[var(--bg-secondary)]"
                  role="menuitem"
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
              </div>
              <div className="py-2 border-t border-[var(--border-color)]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-[var(--color-danger)] transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-none focus:bg-red-50 dark:focus:bg-red-500/10"
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
