import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './hooks/useRedux';
import ErrorBoundary from './components/ErrorBoundary';

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
      <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Layouts (loaded eagerly as they wrap most routes)
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages (lazy loaded)
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));

// Main Pages (lazy loaded)
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));

// Incident Pages (lazy loaded)
const IncidentsListPage = lazy(() => import('./pages/incidents/IncidentsListPage'));
const IncidentCreatePage = lazy(() => import('./pages/incidents/IncidentCreatePage'));
const IncidentDetailPage = lazy(() => import('./pages/incidents/IncidentDetailPage'));
const IncidentEditPage = lazy(() => import('./pages/incidents/IncidentEditPage'));

// Change Management Pages (lazy loaded)
const ChangeDashboardPage = lazy(() => import('./pages/changes/ChangeDashboardPage'));
const ChangesListPage = lazy(() => import('./pages/changes/ChangesListPage'));
const ChangeCreatePage = lazy(() => import('./pages/changes/ChangeCreatePage'));
const ChangeDetailPage = lazy(() => import('./pages/changes/ChangeDetailPage'));
const ChangeCalendarPage = lazy(() => import('./pages/changes/ChangeCalendarPage'));

// Problem Management Pages (lazy loaded)
const ProblemsListPage = lazy(() => import('./pages/problems/ProblemsListPage'));
const ProblemCreatePage = lazy(() => import('./pages/problems/ProblemCreatePage'));
const ProblemDetailPage = lazy(() => import('./pages/problems/ProblemDetailPage'));
const ProblemEditPage = lazy(() => import('./pages/problems/ProblemEditPage'));

// Asset Pages (lazy loaded)
const AssetsListPage = lazy(() => import('./pages/assets/AssetsListPage'));
const AssetCreatePage = lazy(() => import('./pages/assets/AssetCreatePage'));
const AssetDetailPage = lazy(() => import('./pages/assets/AssetDetailPage'));
const MyAssetsPage = lazy(() => import('./pages/assets/MyAssetsPage'));

// Network Pages (lazy loaded)
const NetworkDevicesPage = lazy(() => import('./pages/network/NetworkDevicesPage'));
const NetworkTopologyPage = lazy(() => import('./pages/network/NetworkTopologyPage'));
const NetworkDeviceDetailPage = lazy(() => import('./pages/network/NetworkDeviceDetailPage'));

// Monitoring Pages (lazy loaded)
const MonitoringDashboardPage = lazy(() => import('./pages/monitoring/MonitoringDashboardPage'));
const MetricsLogsVisualizationPage = lazy(() => import('./pages/monitoring/MetricsLogsVisualizationPage'));
const IntegrationsPage = lazy(() => import('./pages/monitoring/IntegrationsPage'));
const IntegrationDetailPage = lazy(() => import('./pages/monitoring/IntegrationDetailPage'));
const LogsPage = lazy(() => import('./pages/monitoring/LogsPage'));
const AlertDetailPage = lazy(() => import('./pages/monitoring/AlertDetailPage'));

// Admin Pages (lazy loaded)
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/admin/UserDetailPage'));
const GroupsPage = lazy(() => import('./pages/admin/GroupsPage'));
const GroupDetailPage = lazy(() => import('./pages/admin/GroupDetailPage'));
const RolesPage = lazy(() => import('./pages/admin/RolesPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const ClientsPage = lazy(() => import('./pages/admin/ClientsPage'));

// Reports (lazy loaded)
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const AnalyticsPage = lazy(() => import('./pages/reports/AnalyticsPage'));

// Settings (lazy loaded)
const NotificationSettingsPage = lazy(() => import('./pages/settings/NotificationSettingsPage'));

// Profile (lazy loaded)
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

// On-Call Management (lazy loaded)
const OnCallSchedulesPage = lazy(() => import('./pages/on-call/OnCallSchedulesPage'));
const EscalationPoliciesPage = lazy(() => import('./pages/on-call/EscalationPoliciesPage'));
const EscalationDashboardPage = lazy(() => import('./pages/on-call/EscalationDashboardPage'));

// Infrastructure Pages (lazy loaded)
const InfrastructureDashboardPage = lazy(() => import('./pages/infrastructure/InfrastructureDashboardPage'));
const InfrastructureHostsPage = lazy(() => import('./pages/infrastructure/InfrastructureHostsPage'));
const InfrastructureHostDetailPage = lazy(() => import('./pages/infrastructure/InfrastructureHostDetailPage'));
const DeviceCatalogPage = lazy(() => import('./pages/infrastructure/DeviceCatalogPage'));
const VMPhysicalMappingPage = lazy(() => import('./pages/infrastructure/VMPhysicalMappingPage'));
const InfrastructureTopologyPage = lazy(() => import('./pages/infrastructure/InfrastructureTopologyPage'));
const ServerRackMonitoringPage = lazy(() => import('./pages/infrastructure/ServerRackMonitoringPage'));

// Iframe Pages (lazy loaded)
const IframeCatalogPage = lazy(() => import('./pages/iframe/IframeCatalogPage'));
const IframeViewerPage = lazy(() => import('./pages/iframe/IframeViewerPage'));

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

// Admin Route Component - requires admin or super_admin role
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAppSelector((state) => state.auth);
  const userRoles = user?.roles?.map((r: { code: string }) => r.code) || [];
  const isAdmin = userRoles.some((role: string) =>
    ['admin', 'super_admin'].includes(role)
  );

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/changes/dashboard" element={<ChangeDashboardPage />} />
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
          <Route path="/assets/my" element={<MyAssetsPage />} />
          <Route path="/assets/create" element={<AssetCreatePage />} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />
          <Route path="/assets/:id/edit" element={<AssetDetailPage />} />

          {/* Network */}
          <Route path="/network/devices" element={<NetworkDevicesPage />} />
          <Route path="/network/devices/:id" element={<NetworkDeviceDetailPage />} />
          <Route path="/network/topology" element={<NetworkTopologyPage />} />

          {/* Infrastructure (Network Flow Architecture) */}
          <Route path="/infrastructure" element={<InfrastructureDashboardPage />} />
          <Route path="/infrastructure/hosts" element={<InfrastructureHostsPage />} />
          <Route path="/infrastructure/hosts/:id" element={<InfrastructureHostDetailPage />} />
          <Route path="/infrastructure/topology" element={<InfrastructureTopologyPage />} />
          <Route path="/infrastructure/catalog" element={<DeviceCatalogPage />} />
          <Route path="/infrastructure/vm-mapping" element={<VMPhysicalMappingPage />} />
          <Route path="/infrastructure/racks" element={<ServerRackMonitoringPage />} />
          <Route path="/infrastructure/iframes" element={<IframeCatalogPage />} />
          <Route path="/infrastructure/iframes/:id" element={<IframeViewerPage />} />

          {/* Monitoring & Integrations */}
          <Route path="/monitoring" element={<MonitoringDashboardPage />} />
          <Route path="/monitoring/visualization" element={<MetricsLogsVisualizationPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/integrations/:id" element={<IntegrationDetailPage />} />
          <Route path="/monitoring/alerts/:id" element={<AlertDetailPage />} />
          <Route path="/monitoring/logs" element={<LogsPage />} />

          {/* Admin (role-guarded) */}
          <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="/users/:id" element={<AdminRoute><UserDetailPage /></AdminRoute>} />
          <Route path="/groups" element={<AdminRoute><GroupsPage /></AdminRoute>} />
          <Route path="/groups/:id" element={<AdminRoute><GroupDetailPage /></AdminRoute>} />
          <Route path="/roles" element={<AdminRoute><RolesPage /></AdminRoute>} />
          <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
          <Route path="/admin/clients" element={<AdminRoute><ClientsPage /></AdminRoute>} />

          {/* On-Call Management */}
          <Route path="/on-call/dashboard" element={<EscalationDashboardPage />} />
          <Route path="/on-call/schedules" element={<OnCallSchedulesPage />} />
          <Route path="/on-call/escalation-policies" element={<EscalationPoliciesPage />} />

          {/* User Profile & Settings */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings/notifications" element={<NotificationSettingsPage />} />

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
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
