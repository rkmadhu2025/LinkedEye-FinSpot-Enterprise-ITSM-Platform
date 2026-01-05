import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { useClickOutside } from '@/hooks/useClickOutside';
import { logout } from '@/store/slices/authSlice';
import { toggleTheme, toggleCommandPalette } from '@/store/slices/uiSlice';
import {
  Search,
  Bell,
  Settings,
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown,
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
      '/incidents': 'Incidents',
      '/incidents/create': 'Create Incident',
      '/changes': 'Change Management',
      '/changes/create': 'Create Change Request',
      '/changes/calendar': 'Change Calendar',
      '/assets': 'Assets',
      '/assets/create': 'Create Asset',
      '/network/devices': 'Network Devices',
      '/network/topology': 'Network Topology',
      '/monitoring': 'Monitoring',
      '/integrations': 'Integrations',
      '/users': 'Users',
      '/groups': 'Groups',
      '/roles': 'Roles',
      '/settings': 'Settings',
      '/reports': 'Reports',
      '/analytics': 'Analytics',
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
    },
    {
      id: '2',
      type: 'change',
      title: 'Change approved',
      message: 'CHG0012456 has been approved',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: '3',
      type: 'alert',
      title: 'SLA Warning',
      message: 'INC0015842 is approaching SLA breach',
      time: '2 hours ago',
      unread: false,
    },
  ];

  const unreadCount = mockNotifications.filter((n) => n.unread).length;

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-6 z-30 transition-all duration-300',
        sidebarCollapsed ? 'left-[70px]' : 'left-[260px]'
      )}
      role="banner"
    >
      {/* Left - Page Title */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <h1 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate max-w-[150px] md:max-w-none">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center - Search - Hidden on small screens, shown with icon button */}
      <div className="flex-1 max-w-md mx-4 md:mx-8 hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search incidents, changes, assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search"
            className="w-full pl-10 pr-12 py-2 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg text-sm
                       focus:bg-white dark:focus:bg-gray-700 focus:border-gray-300 dark:focus:border-gray-600 focus:ring-2 focus:ring-primary-500/20
                       placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white transition-all"
          />
          <button
            onClick={() => dispatch(toggleCommandPalette())}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5
                       bg-gray-200 dark:bg-gray-700 rounded text-[10px] text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Open command palette (Ctrl+K)"
          >
            <Command size={10} aria-hidden="true" />
            <span>K</span>
          </button>
        </div>
      </div>

      {/* Mobile search button */}
      <button
        onClick={() => dispatch(toggleCommandPalette())}
        className="sm:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        aria-label="Search"
      >
        <Search size={20} />
      </button>

      {/* Right - Actions */}
      <div className="flex items-center gap-1 md:gap-3">
        {/* Theme Toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />}
        </button>

        {/* Notifications */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            aria-expanded={notificationsOpen}
            aria-haspopup="true"
          >
            <Bell size={20} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-dropdown border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in"
              role="menu"
              aria-label="Notifications"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                <button className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {mockNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={clsx(
                      'px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors',
                      notification.unread && 'bg-primary-50/50 dark:bg-primary-900/20'
                    )}
                    role="menuitem"
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={clsx(
                          'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                          notification.unread ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                        )}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notification.message}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings - hidden on mobile */}
        <button
          onClick={() => navigate('/settings')}
          className="hidden md:block p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Settings"
        >
          <Settings size={20} aria-hidden="true" />
        </button>

        {/* User Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {user?.firstName?.charAt(0) || 'U'}
              {user?.lastName?.charAt(0) || ''}
            </div>
            <div className="hidden lg:block text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                {user?.displayName || `${user?.firstName} ${user?.lastName}`}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{user?.jobTitle}</p>
            </div>
            <ChevronDown
              size={16}
              className={clsx(
                'text-gray-400 transition-transform hidden lg:block',
                userMenuOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-dropdown border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in"
              role="menu"
              aria-label="User menu"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {user?.displayName || `${user?.firstName} ${user?.lastName}`}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  role="menuitem"
                >
                  <User size={16} aria-hidden="true" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  role="menuitem"
                >
                  <Settings size={16} aria-hidden="true" />
                  <span>Settings</span>
                </button>
              </div>
              <div className="py-1 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                  role="menuitem"
                >
                  <LogOut size={16} aria-hidden="true" />
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
