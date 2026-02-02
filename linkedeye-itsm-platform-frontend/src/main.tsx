import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { store } from './store';
import { initializeAuth } from './store/slices/authSlice';
import './styles/index.css';
import './styles/infrastructure.css';
import './styles/architect.css';

// Log environment info for debugging (development only)
if (import.meta.env.DEV) {
  console.log('🚀 App Initializing...');
  console.log('📍 API URL:', import.meta.env.VITE_API_URL || '/api');
  console.log('🌍 Environment:', import.meta.env.MODE);
  console.log('🔗 Current URL:', window.location.href);
}

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
  if (import.meta.env.DEV) {
    console.error('Error Source:', event.filename, 'Line:', event.lineno);
  }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

// Initialize auth state on app startup
store.dispatch(initializeAuth());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="color: #ef4444; margin-bottom: 1rem;">Critical Error</h1>
        <p style="color: #6b7280;">Root element (#root) not found in DOM.</p>
        <p style="color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem;">Please check the HTML structure.</p>
      </div>
    </div>
  `;
} else {
  try {
    if (import.meta.env.DEV) console.log('✅ Root element found, rendering app...');
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#fff',
                    color: '#1f2937',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </BrowserRouter>
          </QueryClientProvider>
        </Provider>
      </React.StrictMode>
    );
    if (import.meta.env.DEV) console.log('✅ App rendered successfully');
  } catch (error) {
    console.error('❌ Failed to render app:', error);
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
        <div style="text-align: center; padding: 2rem; max-width: 600px;">
          <h1 style="color: #ef4444; margin-bottom: 1rem;">Application Error</h1>
          <p style="color: #6b7280; margin-bottom: 1rem;">Failed to initialize the application.</p>
          <pre style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; text-align: left; overflow: auto; font-size: 0.875rem;">
${error instanceof Error ? error.stack : String(error)}
          </pre>
          <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}
