import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { RequireViewPermission } from './components/RequireViewPermission';
import Auth from './pages/Auth';
import AccessDenied from './pages/AccessDenied';
import Dashboard from './pages/Dashboard';
import { CompanyList, CompanyForm } from './pages/Companies';
import { OrderList, OrderForm } from './pages/Orders';
import { LoomList, LoomForm } from './pages/Looms';
import { LoomDailyEntry, LoomEntryForm, ProductionReport } from './pages/LoomProduction';
import { PaymentList, PaymentForm } from './pages/Payments';
import { ExpenseList, ExpenseForm } from './pages/Expenses';
import { GstIn, GstInAdd, GstOut } from './pages/Gst';
import { GstSummaryReport, OrderSummaryReport, LoomEfficiencyReport } from './pages/Reports';
import { Profile } from './pages/Settings';
import { YarnStockList, YarnStockEntry } from './pages/YarnStock';
import { AdminUserList, AdminCreateUser, AdminAssignMenu } from './pages/Admin';

function CompanyEditPage() {
  const { id } = useParams();
  return <CompanyForm id={id} onSuccess={() => window.history.back()} />;
}
function OrderEditPage() {
  const { id } = useParams();
  return <OrderForm id={id} onSuccess={() => window.history.back()} />;
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
      <Route path="/register" element={<Auth />} />
      <Route path="/signup" element={<Auth />} />
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
      <Route path="/companies/add" element={<ProtectedRoute><RequireViewPermission menuKey="companies"><Layout><CompanyForm onSuccess={() => window.history.back()} /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/companies/:id/edit" element={<ProtectedRoute><RequireViewPermission menuKey="companies"><Layout><CompanyEditPage /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/orders" element={<ProtectedRoute><RequireViewPermission menuKey="orders"><Layout><OrderList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/orders/create" element={<ProtectedRoute><RequireViewPermission menuKey="orders"><Layout><OrderForm onSuccess={() => window.history.back()} /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/orders/:id/edit" element={<ProtectedRoute><RequireViewPermission menuKey="orders"><Layout><OrderEditPage /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/loom-production/looms" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.looms"><Layout><LoomList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/loom-production/looms/add" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.looms"><Layout><LoomForm onSuccess={() => window.history.back()} /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/loom-production/daily" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.daily"><Layout><LoomDailyEntry /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/loom-production/daily/add" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.daily"><Layout><LoomEntryForm onSuccess={() => window.history.back()} /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/loom-production/report" element={<ProtectedRoute><RequireViewPermission menuKey="loom_production.report"><Layout><ProductionReport /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/payments" element={<ProtectedRoute><RequireViewPermission menuKey="payments"><Layout><><PaymentForm onSuccess={() => {}} /><PaymentList /></></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><RequireViewPermission menuKey="expenses"><Layout><><ExpenseForm onSuccess={() => {}} /><ExpenseList /></></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/gst/in" element={<ProtectedRoute><RequireViewPermission menuKey="gst"><Layout><GstIn /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/gst/in/add" element={<ProtectedRoute><RequireViewPermission menuKey="gst"><Layout><GstInAdd onSuccess={() => window.history.back()} /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/gst/out" element={<ProtectedRoute><RequireViewPermission menuKey="gst"><Layout><GstOut /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/reports/gst-summary" element={<ProtectedRoute><RequireViewPermission menuKey="reports.gst_summary"><Layout><GstSummaryReport /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/reports/order-summary" element={<ProtectedRoute><RequireViewPermission menuKey="reports.order_summary"><Layout><OrderSummaryReport /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/reports/loom-efficiency" element={<ProtectedRoute><RequireViewPermission menuKey="reports.loom_efficiency"><Layout><LoomEfficiencyReport /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/yarn-stock" element={<ProtectedRoute><RequireViewPermission menuKey="yarn_stock"><Layout><YarnStockList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/yarn-stock/entry" element={<ProtectedRoute><RequireViewPermission menuKey="yarn_stock"><Layout><YarnStockEntry /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/yarn-stock/entry/:orderId" element={<ProtectedRoute><RequireViewPermission menuKey="yarn_stock"><Layout><YarnStockEntry /></Layout></RequireViewPermission></ProtectedRoute>} />

      <Route path="/admin/users" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.users"><Layout><AdminUserList /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/users/create" element={<ProtectedRoute roles={['super_admin', 'admin']}><RequireViewPermission menuKey="admin.users.create"><Layout><AdminCreateUser /></Layout></RequireViewPermission></ProtectedRoute>} />
      <Route path="/admin/assign-menu" element={<ProtectedRoute roles={['super_admin']}><RequireViewPermission menuKey="admin.assign-menu"><Layout><AdminAssignMenu /></Layout></RequireViewPermission></ProtectedRoute>} />
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
