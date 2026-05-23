import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Shield, ScrollText, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/product-owner', end: true, label: 'Overview', icon: LayoutDashboard },
  { to: '/product-owner/users', label: 'User Management', icon: Users },
  { to: '/product-owner/security', label: 'Security', icon: Shield },
  { to: '/product-owner/logs', label: 'Audit Logs', icon: ScrollText },
];

export function ProductOwnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <aside className="w-64 shrink-0 bg-slate-950 text-slate-200 flex flex-col border-r border-slate-800">
        <div className="px-5 py-6 border-b border-slate-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">ToroTech</p>
          <h1 className="text-sm font-semibold text-white mt-1 leading-snug">Product Owner Console</h1>
          <p className="text-[11px] text-slate-500 mt-1">System-level access</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-200 ring-1 ring-inset ring-blue-500/40'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 truncate">{user?.name || user?.username}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">ToroTech Product Owner Console</h2>
          <p className="text-sm text-slate-500 mt-0.5">System level access and user control</p>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
