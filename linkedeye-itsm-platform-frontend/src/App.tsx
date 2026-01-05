import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './hooks/useRedux';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Main Pages
import DashboardPage from './pages/dashboard/DashboardPage';

// Incident Pages
import IncidentsListPage from './pages/incidents/IncidentsListPage';
import IncidentCreatePage from './pages/incidents/IncidentCreatePage';
import IncidentDetailPage from './pages/incidents/IncidentDetailPage';
import IncidentEditPage from './pages/incidents/IncidentEditPage';

// Change Management Pages
import ChangesListPage from './pages/changes/ChangesListPage';
import ChangeCreatePage from './pages/changes/ChangeCreatePage';
import ChangeDetailPage from './pages/changes/ChangeDetailPage';
import ChangeCalendarPage from './pages/changes/ChangeCalendarPage';

// Problem Management Pages
import ProblemsListPage from './pages/problems/ProblemsListPage';
import ProblemCreatePage from './pages/problems/ProblemCreatePage';
import ProblemDetailPage from './pages/problems/ProblemDetailPage';
import ProblemEditPage from './pages/problems/ProblemEditPage';

// Asset Pages
import AssetsListPage from './pages/assets/AssetsListPage';
import AssetCreatePage from './pages/assets/AssetCreatePage';
import AssetDetailPage from './pages/assets/AssetDetailPage';

// Network Pages
import NetworkDevicesPage from './pages/network/NetworkDevicesPage';
import NetworkTopologyPage from './pages/network/NetworkTopologyPage';
import NetworkDeviceDetailPage from './pages/network/NetworkDeviceDetailPage';

// Monitoring Pages
import MonitoringDashboardPage from './pages/monitoring/MonitoringDashboardPage';
import IntegrationsPage from './pages/monitoring/IntegrationsPage';
import IntegrationDetailPage from './pages/monitoring/IntegrationDetailPage';

// Admin Pages
import UsersPage from './pages/admin/UsersPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import GroupsPage from './pages/admin/GroupsPage';
import GroupDetailPage from './pages/admin/GroupDetailPage';
import RolesPage from './pages/admin/RolesPage';
import SettingsPage from './pages/admin/SettingsPage';

// Reports
import ReportsPage from './pages/reports/ReportsPage';
import AnalyticsPage from './pages/reports/AnalyticsPage';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Incidents */}
          <Route path="/incidents" element={<IncidentsListPage />} />
          <Route path="/incidents/create" element={<IncidentCreatePage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/incidents/:id/edit" element={<IncidentEditPage />} />

          {/* Changes */}
          <Route path="/changes" element={<ChangesListPage />} />
          <Route path="/changes/create" element={<ChangeCreatePage />} />
          <Route path="/changes/calendar" element={<ChangeCalendarPage />} />
          <Route path="/changes/:id" element={<ChangeDetailPage />} />

          {/* Problems */}
          <Route path="/problems" element={<ProblemsListPage />} />
          <Route path="/problems/create" element={<ProblemCreatePage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage />} />
          <Route path="/problems/:id/edit" element={<ProblemEditPage />} />

          {/* Assets */}
          <Route path="/assets" element={<AssetsListPage />} />
          <Route path="/assets/create" element={<AssetCreatePage />} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />

          {/* Network */}
          <Route path="/network/devices" element={<NetworkDevicesPage />} />
          <Route path="/network/devices/:id" element={<NetworkDeviceDetailPage />} />
          <Route path="/network/topology" element={<NetworkTopologyPage />} />

          {/* Monitoring & Integrations */}
          <Route path="/monitoring" element={<MonitoringDashboardPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/integrations/:id" element={<IntegrationDetailPage />} />

          {/* Admin */}
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<GroupDetailPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Reports */}
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300">404</h1>
                <p className="text-xl text-gray-600 mt-4">Page not found</p>
                <a href="/" className="mt-6 inline-block text-primary-600 hover:text-primary-700">
                  Go back home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
