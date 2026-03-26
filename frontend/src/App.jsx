import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { RequireViewPermission } from './components/RequireViewPermission';
import Auth from './pages/Auth';
import AccessDenied from './pages/AccessDenied';
import Dashboard from './pages/Dashboard';
import { CompanyList } from './pages/Companies';
import { OrderList } from './pages/Orders';
import { LoomList } from './pages/Looms';
import { LoomDailyEntry, ProductionReport } from './pages/LoomProduction';
import { PaymentList } from './pages/Payments';
import { ExpenseList } from './pages/Expenses';
import { OrderSummaryReport, LoomEfficiencyReport } from './pages/Reports';
import ProductionReportPage from './pages/ProductionReportPage';
import YarnConsumptionReportPage from './pages/YarnConsumptionReportPage';
import { Profile } from './pages/Settings';
import { AdminUserList, AdminPermissionMatrix } from './pages/Admin';
import { WeavingUnitList } from './pages/WeavingUnits';
import { WeaverList } from './pages/Weavers';

const YarnStockListLazy = lazy(() => import('./pages/YarnStock').then(m => ({ default: m.YarnStockList })));
const YarnStockEntryLazy = lazy(() => import('./pages/YarnStock').then(m => ({ default: m.YarnStockEntry })));
const AdminUserListLazy = lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminUserList })));
const AdminPermissionMatrixLazy = lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminPermissionMatrix })));

function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" role="status" aria-label="Loading page">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
        <p className="text-gray-600 text-sm">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && roles.length) {
    const allowed = roles.includes(user.role) || (user.role === 'owner' && roles.includes('super_admin'));
    if (!allowed) return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/access-denied" element={<ProtectedRoute><Layout><AccessDenied /></Layout></ProtectedRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RequireViewPermission menuKey="dashboard">
              <Layout><Dashboard /></Layout>
            </RequireViewPermission>
          </ProtectedRoute>
        }
      />
      <Route path="/companies" element={<ProtectedRoute><RequireViewPermission menuKey="companies"><Layout><CompanyList /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/orders" element={<ProtectedRoute><RequireViewPermission menuKey="orders"><Layout><OrderList /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/loom-production/looms" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.looms"><Layout><LoomList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/loom-production/daily" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.daily"><Layout><LoomDailyEntry /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/loom-production/report" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.report"><Layout><ProductionReport /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/payments" element={<ProtectedRoute><RequireViewPermission menuKey="payments"><Layout><PaymentList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><RequireViewPermission menuKey="expenses"><Layout><ExpenseList /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/reports/order-summary" element={<ProtectedRoute><RequireViewPermission menuKey="reports.order_summary"><Layout><OrderSummaryReport /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/reports/loom-efficiency" element={<ProtectedRoute><RequireViewPermission menuKey="reports.loom_efficiency"><Layout><LoomEfficiencyReport /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/reports/production" element={<ProtectedRoute><RequireViewPermission menuKey="reports.production"><Layout><ProductionReportPage /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/reports/yarn-consumption" element={<ProtectedRoute><RequireViewPermission menuKey="reports.yarn_consumption"><Layout><YarnConsumptionReportPage /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/yarn-stock" element={<ProtectedRoute><RequireViewPermission menuKey="yarn_stock"><Layout><Suspense fallback={<PageLoader />}><YarnStockListLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/yarn-stock/entry" element={<ProtectedRoute><RequireViewPermission menuKey="yarn_stock"><Layout><Suspense fallback={<PageLoader />}><YarnStockEntryLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/yarn-stock/entry/:orderId" element={<ProtectedRoute><RequireViewPermission menuKey="yarn_stock"><Layout><Suspense fallback={<PageLoader />}><YarnStockEntryLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/admin/users" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.users"><Layout><Suspense fallback={<PageLoader />}><AdminUserListLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<ProtectedRoute roles={['super_admin']}><RequireViewPermission menuKey="admin.permissions"><Layout><Suspense fallback={<PageLoader />}><AdminPermissionMatrixLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/weaving-units" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.weaving_units"><Layout><WeavingUnitList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/weavers" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.weavers"><Layout><WeaverList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/settings/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
