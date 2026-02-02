import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ChatBox from '@/components/chatbox/ChatBox';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { getCurrentUser } from '@/store/slices/authSlice';
import clsx from 'clsx';

const MainLayout = () => {
  const dispatch = useAppDispatch();
  const { sidebarCollapsed, theme } = useAppSelector((state) => state.ui);
  const { user, token } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, token, user]);

  // Apply dark mode class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div
      className={clsx(
        'min-h-screen transition-colors duration-300',
        theme === 'dark' ? 'dark' : ''
      )}
      style={{
        background: theme === 'dark' ? '#0f1c3f' : '#f4f6f9',
      }}
    >
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar />

      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main
        id="main-content"
        className={clsx(
          'pt-14 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'
        )}
        role="main"
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      {/* Floating ChatBox */}
      <ChatBox
        enableAI={true}
        greeting="Hello! I'm your IT Service Management assistant. How can I help you today?"
      />
    </div>
  );
};

export default MainLayout;
