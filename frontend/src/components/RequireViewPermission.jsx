import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps content and redirects to /access-denied if the user does not have
 * view permission for the given menu_key.
 * Use with ProtectedRoute: first check auth, then check view permission.
 */
export function RequireViewPermission({ menuKey, children }) {
  const { canView, loading, permissionsLoaded } = useAuth();

  if (loading || !permissionsLoaded) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
        <p className="text-gray-600 text-sm">Loading…</p>
      </div>
    );
  }

  if (!menuKey) return children;
  if (!canView(menuKey)) return <Navigate to="/access-denied" replace />;
  return children;
}
