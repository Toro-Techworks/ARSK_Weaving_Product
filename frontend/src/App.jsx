import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { RequireViewPermission } from './components/RequireViewPermission';
import Auth from './pages/Auth';
import { ProductOwnerRoute } from './components/ProductOwner/ProductOwnerRoute';
import { ProductOwnerLayout } from './components/ProductOwner/ProductOwnerLayout';
import { ProductOwnerDashboard } from './pages/ProductOwner/Dashboard';
import { ProductOwnerUsers } from './pages/ProductOwner/Users';
import { ProductOwnerSecurity } from './pages/ProductOwner/Security';
import { ProductOwnerLogs } from './pages/ProductOwner/Logs';
import AccessDenied from './pages/AccessDenied';
import Dashboard from './pages/Dashboard';
import { CompanyList } from './pages/Companies';
import { OrderList } from './pages/Orders';
import { LoomList } from './pages/Looms';
import { LoomDetailPage } from './pages/LoomDetail';
import { LoomHistoryPage } from './pages/LoomHistory';
import { LoomDailyEntry } from './pages/LoomProduction';
import LoomAssigningPage from './pages/LoomAssigning';
import { PaymentList } from './pages/Payments';
import { ExpenseList } from './pages/Expenses';
import ProductionReportPage from './pages/ProductionReportPage';
const ExpenseReportPageLazy = lazy(() => import('./pages/ExpenseReportPage'));
import { Profile } from './pages/Settings';
import { AdminUserList, AdminPermissionMatrix } from './pages/Admin';
import { WeavingUnitList } from './pages/WeavingUnits';
import { WindingUnitList } from './pages/WindingUnits';
import { WeaverList } from './pages/Weavers';
import {
  DeletedCompaniesPage,
  DeletedOrdersPage,
  DeletedWeaversPage,
  DeletedWeavingUnitsPage,
  DeletedWindingUnitsPage,
} from './pages/DeletedEntriesPages';

const YarnStockListLazy = lazy(() => import('./pages/YarnStock').then(m => ({ default: m.YarnStockList })));
const YarnStockEntryLazy = lazy(() => import('./pages/YarnStock').then(m => ({ default: m.YarnStockEntry })));
const WindingListLazy = lazy(() => import('./pages/Winding').then(m => ({ default: m.WindingList })));
const AdminUserListLazy = lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminUserList })));
const AdminPermissionMatrixLazy = lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminPermissionMatrix })));
const AdminMasterSettingsLazy = lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminMasterSettings })));
const NotificationsPageLazy = lazy(() => import('./pages/Notifications').then(m => ({ default: m.NotificationsPage })));

function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" role="status" aria-label="Loading page">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children, roles, rolesStrict = false, allowProductOwner = false }) {
  const { user, authenticated, loading, isProductOwner } = useAuth();

  // Token-only auth: presence of token determines access.
  if (!authenticated) return <Navigate to="/login" replace />;

  // While we hydrate /user and permissions, keep user on a loader (do not bounce back to /login).
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
        <p className="text-gray-600 text-sm">Loading…</p>
      </div>
    );
  }

  // Token exists but user could not be loaded (token invalid/expired) → send to login.
  if (!user) return <Navigate to="/login" replace />;

  if (isProductOwner && !allowProductOwner) {
    return <Navigate to="/product-owner" replace />;
  }

  if (roles && roles.length) {
    let allowed = roles.includes(user.role);
    if (!rolesStrict && !allowed && user.role === 'owner' && roles.includes('super_admin')) {
      allowed = true;
    }
    if (!allowed) return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route
        path="/product-owner"
        element={
          <ProductOwnerRoute>
            <ProductOwnerLayout />
          </ProductOwnerRoute>
        }
      >
        <Route index element={<ProductOwnerDashboard />} />
        <Route path="users" element={<ProductOwnerUsers />} />
        <Route path="security" element={<ProductOwnerSecurity />} />
        <Route path="logs" element={<ProductOwnerLogs />} />
      </Route>
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
      <Route path="/companies/deleted" element={<ProtectedRoute roles={['super_admin']} rolesStrict><RequireViewPermission menuKey="companies"><Layout><DeletedCompaniesPage /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/orders" element={<ProtectedRoute><RequireViewPermission menuKey="orders"><Layout><OrderList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/orders/deleted" element={<ProtectedRoute roles={['super_admin']} rolesStrict><RequireViewPermission menuKey="orders"><Layout><DeletedOrdersPage /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/loom-production/looms" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.looms"><Layout><LoomList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/loom-production/looms/:loomId" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.looms"><Layout><LoomDetailPage /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/loom-production/daily" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.daily"><Layout><LoomDailyEntry /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/loom-production/assigning" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.assigning"><Layout><LoomAssigningPage /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/loom-production/report" element={<ProtectedRoute><Navigate to="/reports/production" replace /></ProtectedRoute>} />

      <Route path="/payments" element={<ProtectedRoute><RequireViewPermission menuKey="payments"><Layout><PaymentList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><RequireViewPermission menuKey="expenses"><Layout><ExpenseList /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/reports/production" element={<ProtectedRoute><RequireViewPermission menuKey="reports.production"><Layout><ProductionReportPage /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/reports/client-expenses" element={<ProtectedRoute><RequireViewPermission menuKey="reports.client_expenses"><Layout><Suspense fallback={<PageLoader />}><ExpenseReportPageLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/winding" element={<ProtectedRoute><RequireViewPermission menuKey="winding"><Layout><Suspense fallback={<PageLoader />}><WindingListLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/yarn-stock" element={<ProtectedRoute><RequireViewPermission menuKey="yarn_stock"><Layout><Suspense fallback={<PageLoader />}><YarnStockListLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/yarn-stock/entry" element={<ProtectedRoute><RequireViewPermission menuKey="yarn_stock"><Layout><Suspense fallback={<PageLoader />}><YarnStockEntryLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/yarn-stock/entry/:orderId" element={<ProtectedRoute><RequireViewPermission menuKey="yarn_stock"><Layout><Suspense fallback={<PageLoader />}><YarnStockEntryLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/admin/users" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.users"><Layout><Suspense fallback={<PageLoader />}><AdminUserListLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.permissions"><Layout><Suspense fallback={<PageLoader />}><AdminPermissionMatrixLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/weaving-units" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.weaving_units"><Layout><WeavingUnitList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/weaving-units/deleted" element={<ProtectedRoute roles={['super_admin']} rolesStrict><RequireViewPermission menuKey="admin.weaving_units"><Layout><DeletedWeavingUnitsPage /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/winding-units" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.winding_units"><Layout><WindingUnitList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/winding-units/deleted" element={<ProtectedRoute roles={['super_admin']} rolesStrict><RequireViewPermission menuKey="admin.winding_units"><Layout><DeletedWindingUnitsPage /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/weavers" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.weavers"><Layout><WeaverList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/weavers/deleted" element={<ProtectedRoute roles={['super_admin']} rolesStrict><RequireViewPermission menuKey="admin.weavers"><Layout><DeletedWeaversPage /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/loom-history" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.loom_history"><Layout><LoomHistoryPage /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/master-settings" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.master_settings"><Layout><Suspense fallback={<PageLoader />}><AdminMasterSettingsLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute roles={['super_admin']} rolesStrict><RequireViewPermission menuKey="admin.notifications"><Layout><Suspense fallback={<PageLoader />}><NotificationsPageLazy /></Suspense></Layout></RequireViewPermission></ProtectedRoute>} />
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
