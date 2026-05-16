import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PortalShell } from './portal/PortalShell';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { PlanningPage } from './pages/PlanningPage';
import { CohortsPage } from './pages/CohortsPage';
import { CohortDetailPage } from './pages/CohortDetailPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { TechniciansPage } from './pages/TechniciansPage';
import { ImplementationPage } from './pages/ImplementationPage';
import { LicensesPage } from './pages/LicensesPage';
import { LicenseProgramsPage } from './pages/LicenseProgramsPage';
import { RecruitmentPage } from './pages/RecruitmentPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { InternalDocsPage } from './pages/InternalDocsPage';
import { ModuleHubPage } from './core/ModuleHubPage';
import { FinanceWorkspace } from './finance/FinanceWorkspace';
import { FinanceOverviewPage } from './finance/pages/FinanceOverviewPage';
import { FinanceCashflowPage } from './finance/pages/FinanceCashflowPage';
import { FinanceCadastrosPage } from './finance/pages/FinanceCadastrosPage';
import { FinanceReceivablesPage } from './finance/pages/FinanceReceivablesPage';
import { FinancePayablesPage } from './finance/pages/FinancePayablesPage';
import { FinanceReportsPage } from './finance/pages/FinanceReportsPage';
import { FinanceReconciliationPage } from './finance/pages/FinanceReconciliationPage';
import { FinanceTransactionsPage } from './finance/pages/FinanceTransactionsPage';
import { FinanceAdvancedPage } from './finance/pages/FinanceAdvancedPage';
import { FinanceSimulationPage } from './finance/pages/FinanceSimulationPage';
import { api } from './services/api';
import {
  INTERNAL_AUTH_CHANGED_EVENT,
  hasAnyPermission,
  internalSessionStore,
  type InternalPermission,
  type InternalRole,
  type InternalSessionData,
  type InternalSessionUser
} from './auth/session';
import { defaultRouteForUser, visibleNavItemsForUser } from './auth/navigation';
import {
  FINANCE_BASE_PATH,
  FINANCE_PERMISSIONS,
  TECHNICAL_BASE_PATH
} from './core/modules';
const INTERNAL_TAB_INITIALIZED_KEY = 'orquestrador_internal_tab_initialized_v1';
type KanbanAlertCounts = {
  implementation: number;
  support: number;
};

const LEGACY_TECHNICAL_PATHS = [
  '/dashboard',
  '/calendario',
  '/planejar',
  '/turmas',
  '/clientes',
  '/tecnicos',
  '/implementacao',
  '/suporte',
  '/processos-seletivos',
  '/licencas',
  '/documentacao',
  '/admin'
] as const;

function ProtectedRoute({
  user,
  permissions,
  requiredRole,
  fallback,
  children
}: {
  user: InternalSessionUser;
  permissions: InternalPermission[];
  requiredRole?: InternalRole;
  fallback: string;
  children: ReactNode;
}) {
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={fallback} replace />;
  }
  if (!hasAnyPermission(user, permissions)) {
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}

function FinanceModuleRoutes({ user, defaultRoute, onLogout }: { user: InternalSessionUser; defaultRoute: string; onLogout?: () => void }) {
  return (
    <Routes>
      <Route
        path={`${FINANCE_BASE_PATH}/*`}
        element={(
          <ProtectedRoute user={user} permissions={FINANCE_PERMISSIONS} requiredRole="supremo" fallback={defaultRoute}>
            <FinanceWorkspace onLogout={onLogout} />
          </ProtectedRoute>
        )}
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<FinanceOverviewPage />} />
        <Route path="transactions" element={<FinanceTransactionsPage />} />
        <Route path="receivables" element={<FinanceReceivablesPage />} />
        <Route path="payables" element={<FinancePayablesPage />} />
        <Route path="reconciliation" element={<FinanceReconciliationPage />} />
        <Route path="cashflow" element={<FinanceCashflowPage />} />
        <Route path="reports" element={<FinanceReportsPage />} />
        <Route path="cadastros" element={<FinanceCadastrosPage />} />
        <Route path="simulation" element={<FinanceSimulationPage />} />
        <Route path="advanced" element={<FinanceAdvancedPage />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Route>
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

function TechnicalModuleRoutes({ user, defaultRoute }: { user: InternalSessionUser; defaultRoute: string }) {
  return (
    <Routes>
      <Route path={TECHNICAL_BASE_PATH} element={<Navigate to={`${TECHNICAL_BASE_PATH}/calendario`} replace />} />
      <Route
        path={`${TECHNICAL_BASE_PATH}/dashboard`}
        element={(
          <ProtectedRoute user={user} permissions={['dashboard']} fallback={defaultRoute}>
            <DashboardPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/calendario`}
        element={(
          <ProtectedRoute user={user} permissions={['calendar']} fallback={defaultRoute}>
            <CalendarPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/planejar`}
        element={(
          <ProtectedRoute user={user} permissions={['calendar', 'cohorts']} fallback={defaultRoute}>
            <PlanningPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/turmas`}
        element={(
          <ProtectedRoute user={user} permissions={['cohorts']} fallback={defaultRoute}>
            <CohortsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/turmas/:id`}
        element={(
          <ProtectedRoute user={user} permissions={['cohorts']} fallback={defaultRoute}>
            <CohortDetailPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/clientes`}
        element={(
          <ProtectedRoute user={user} permissions={['clients']} fallback={defaultRoute}>
            <ClientsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/clientes/:id`}
        element={(
          <ProtectedRoute user={user} permissions={['clients']} fallback={defaultRoute}>
            <ClientDetailPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/tecnicos`}
        element={(
          <ProtectedRoute user={user} permissions={['technicians']} fallback={defaultRoute}>
            <TechniciansPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/implementacao`}
        element={(
          <ProtectedRoute user={user} permissions={['implementation']} fallback={defaultRoute}>
            <ImplementationPage boardMode="implementation" />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/suporte`}
        element={(
          <ProtectedRoute user={user} permissions={['support', 'implementation']} fallback={defaultRoute}>
            <ImplementationPage boardMode="support" />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/processos-seletivos`}
        element={(
          <ProtectedRoute user={user} permissions={['recruitment']} fallback={defaultRoute}>
            <RecruitmentPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/licencas`}
        element={(
          <ProtectedRoute user={user} permissions={['licenses']} fallback={defaultRoute}>
            <LicensesPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/licencas/programas`}
        element={(
          <ProtectedRoute user={user} permissions={['license_programs']} fallback={defaultRoute}>
            <LicenseProgramsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/documentacao`}
        element={(
          <ProtectedRoute user={user} permissions={['docs']} fallback={defaultRoute}>
            <InternalDocsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${TECHNICAL_BASE_PATH}/admin`}
        element={(
          <ProtectedRoute user={user} permissions={['admin']} fallback={defaultRoute}>
            <AdminPage />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

function InternalApp() {
  const [session, setSession] = useState<InternalSessionData | null>(() => internalSessionStore.read());
  const [loadingSession, setLoadingSession] = useState(true);
  const [kanbanAlertCounts, setKanbanAlertCounts] = useState<KanbanAlertCounts>({
    implementation: 0,
    support: 0
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const sync = () => setSession(internalSessionStore.read());
    window.addEventListener(INTERNAL_AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(INTERNAL_AUTH_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const current = internalSessionStore.read();
    if (!current) {
      setLoadingSession(false);
      return;
    }

    api.internalMe()
      .then((response) => {
        if (cancelled) return;
        const mergedSession: InternalSessionData = {
          token: current.token,
          expires_at: current.expires_at,
          user: response.user
        };
        internalSessionStore.save(mergedSession);
        setSession(mergedSession);
      })
      .catch(() => {
        if (cancelled) return;
        internalSessionStore.clear();
        setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(username: string, password: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const response = await api.internalLogin({ username, password });
      internalSessionStore.save(response);
      setSession(response);
      window.sessionStorage.setItem(INTERNAL_TAB_INITIALIZED_KEY, '1');
      navigate('/app', { replace: true });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }
  }

  function handleLogout() {
    api.internalLogout().catch(() => null).finally(() => {
      internalSessionStore.clear();
      window.sessionStorage.removeItem(INTERNAL_TAB_INITIALIZED_KEY);
      setSession(null);
    });
  }

  const user = session?.user ?? null;
  const navItems = useMemo(() => visibleNavItemsForUser(user), [user]);
  const navItemsWithAlerts = useMemo(() => navItems.map((item) => {
    if (item.to === `${TECHNICAL_BASE_PATH}/implementacao`) {
      return { ...item, badgeCount: kanbanAlertCounts.implementation };
    }
    if (item.to === `${TECHNICAL_BASE_PATH}/suporte`) {
      return { ...item, badgeCount: kanbanAlertCounts.support };
    }
    return item;
  }), [navItems, kanbanAlertCounts]);
  const defaultRoute = defaultRouteForUser(user);
  const isHubRoute = location.pathname === '/' || location.pathname === '/app';
  const isFinanceRoute = location.pathname.startsWith(FINANCE_BASE_PATH);
  const isTechnicalRoute = location.pathname.startsWith(TECHNICAL_BASE_PATH);
  const legacyFinanceTarget = location.pathname.startsWith('/financeiro')
    ? `${FINANCE_BASE_PATH}${location.pathname.slice('/financeiro'.length)}${location.search}${location.hash}`
    : null;
  const legacyTechnicalPrefix = LEGACY_TECHNICAL_PATHS.find((path) => (
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  ));
  const legacyTechnicalTarget = legacyTechnicalPrefix
    ? `${TECHNICAL_BASE_PATH}${location.pathname}${location.search}${location.hash}`
    : null;

  useEffect(() => {
    if (!session || !user) {
      setKanbanAlertCounts({ implementation: 0, support: 0 });
      return;
    }

    let cancelled = false;
    const loadKanbanAlertCounts = () => {
      api.implementationKanban()
        .then((response: any) => {
          if (cancelled) return;
          const cards = (response.columns ?? []).flatMap((column: any) => column.cards ?? []);
          setKanbanAlertCounts({
            implementation: cards.filter((card: any) => card.subcategory !== 'Suporte' && card.support_alert_level !== 'none').length,
            support: cards.filter((card: any) => card.subcategory === 'Suporte' && card.support_alert_level !== 'none').length
          });
        })
        .catch(() => {
          if (!cancelled) setKanbanAlertCounts({ implementation: 0, support: 0 });
        });
    };

    loadKanbanAlertCounts();
    const intervalId = window.setInterval(loadKanbanAlertCounts, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [session, user, location.pathname]);

  useEffect(() => {
    if (!session || !user) return;
    const tabInitialized = window.sessionStorage.getItem(INTERNAL_TAB_INITIALIZED_KEY) === '1';
    if (tabInitialized) return;
    window.sessionStorage.setItem(INTERNAL_TAB_INITIALIZED_KEY, '1');
    if (location.pathname === '/') {
      navigate('/app', { replace: true });
    }
  }, [session, user, location.pathname, navigate]);

  if (loadingSession) {
    return <p style={{ padding: '24px' }}>Carregando sessão...</p>;
  }

  if (!session || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (legacyFinanceTarget) {
    return <Navigate to={legacyFinanceTarget} replace />;
  }

  if (legacyTechnicalTarget) {
    return <Navigate to={legacyTechnicalTarget} replace />;
  }

  if (isHubRoute) {
    return <ModuleHubPage user={user} onLogout={handleLogout} />;
  }

  if (isFinanceRoute) {
    return <FinanceModuleRoutes user={user} defaultRoute="/app" onLogout={handleLogout} />;
  }

  if (!isTechnicalRoute) {
    return <Navigate to="/app" replace />;
  }

  return (
    <Layout
      onLogout={handleLogout}
      loggedUser={user.display_name || user.username}
      navItems={navItemsWithAlerts}
    >
      <TechnicalModuleRoutes user={user} defaultRoute={defaultRoute} />
    </Layout>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/portal/:slug/*" element={<PortalShell />} />
      <Route path="*" element={<InternalApp />} />
    </Routes>
  );
}
