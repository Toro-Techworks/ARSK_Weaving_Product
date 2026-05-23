import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProductOwnerRoute({ children }) {
  const { user, authenticated, loading, isProductOwner } = useAuth();

  if (!authenticated) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-400 border-t-transparent" />
        <p className="text-slate-400 text-sm">Loading console…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!isProductOwner) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold text-white">Product owner access only</p>
        <p className="text-sm text-slate-400 max-w-md">
          Sign in with the ToroTech product owner account to open this console. ERP users cannot access this area.
        </p>
        <a
          href="/login"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  return children;
}
