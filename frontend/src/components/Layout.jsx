import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getIcon } from './iconsMap';

const sidebarBg = '#312E81';

function NavLink({ item, collapsed }) {
  const location = useLocation();
  const path = item.route_path || item.path;
  const isActive = location.pathname === path;
  const Icon = item.iconComponent;
  const label = item.menu_name || item.label;
  if (!path) return null;
  return (
    <Link
      to={path}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-white text-sm transition-colors ${
        isActive ? 'bg-[#312E81]' : 'hover:bg-white/10'
      }`}
      title={collapsed ? label : undefined}
    >
      {Icon && <Icon className="w-5 h-5 shrink-0" />}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function mapMenuToNav(menu) {
  const Icon = getIcon(menu.icon);
  const item = {
    label: menu.menu_name,
    menu_name: menu.menu_name,
    path: menu.route_path,
    route_path: menu.route_path,
    iconComponent: Icon,
    children: menu.children?.map(mapMenuToNav).filter((c) => c.path || (c.children?.length > 0)),
  };
  if (item.children?.length) {
    item.children = item.children.map((ch) => ({ ...ch, path: ch.route_path || ch.path }));
  }
  return item;
}

function SidebarGroup({ item, collapsed }) {
  const location = useLocation();
  const children = item.children || [];
  const hasActiveChild = children.some((c) => (c.route_path || c.path) === location.pathname);
  const [open, setOpen] = useState(hasActiveChild);
  const Icon = item.iconComponent;
  const label = item.menu_name || item.label;

  if (children.length === 0 && item.path) {
    return <NavLink item={item} collapsed={collapsed} />;
  }
  if (children.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-white text-sm hover:bg-white/10 transition-colors ${
          open ? 'bg-white/10' : ''
        }`}
        title={collapsed ? label : undefined}
      >
        <span className="flex items-center gap-3 min-w-0">
          {Icon && <Icon className="w-5 h-5 shrink-0" />}
          {!collapsed && <span className="truncate">{label}</span>}
        </span>
        {!collapsed && <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />}
      </button>
      {!collapsed && open && (
        <div className="ml-4 mt-1 space-y-0.5">
          {children.map((child) =>
            child.children?.length ? (
              <SidebarGroup key={child.menu_key || child.path} item={child} collapsed={collapsed} />
            ) : (
              <NavLink key={child.menu_key || child.path} item={child} collapsed={collapsed} />
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, menus, logout } = useAuth();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) return children;

  const navItems = (menus || []).map(mapMenuToNav);

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
      <aside
        style={{ backgroundColor: sidebarBg }}
        className={`flex flex-col text-white transition-all duration-200 shrink-0 h-screen ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {!collapsed && <span className="font-semibold text-lg truncate">Toro Weaving</span>}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg hover:bg-white/10"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.length > 0 ? (
            navItems.map((item) => {
              if (item.children?.length > 0) {
                return <SidebarGroup key={item.menu_key || item.path || item.label} item={item} collapsed={collapsed} />;
              }
              if (item.route_path || item.path) {
                return <NavLink key={item.menu_key || item.path} item={item} collapsed={collapsed} />;
              }
              return null;
            })
          ) : (
            <NavLink item={{ path: '/', label: 'Dashboard', route_path: '/', iconComponent: getIcon('LayoutDashboard') }} collapsed={collapsed} />
          )}
        </nav>
        <div className="border-t border-white/10 p-3 space-y-2 shrink-0">
          <Link
            to="/settings/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 text-white transition-colors hover:bg-white/15 ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? user?.name : undefined}
          >
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 shrink-0" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-white/70 truncate">{user?.role_label}</p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white text-sm hover:bg-white/10 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center shrink-0">
          <h1 className="text-lg font-semibold text-gray-900">Weaving Production Management</h1>
        </header>
        <main className="flex-1 overflow-auto p-6 min-h-0">{children}</main>
      </div>
    </div>
  );
}
