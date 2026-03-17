import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getIcon } from './iconsMap';
import { AnimatedPage } from './AnimatedPage';
import { defaultTransition } from '../utils/motion';

const sidebarBg = '#312E81';

function isPathActive(path, pathname) {
  if (!path) return false;
  if (pathname === path) return true;
  if (path === '/') return false;
  return pathname.startsWith(path + '/');
}

function NavLink({ item, collapsed, onNavigate }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const path = item.route_path || item.path;
  const isActive = isPathActive(path, location.pathname);
  const Icon = item.iconComponent;
  const label = item.menu_name || item.label;
  if (!path) return null;
  const Wrapper = reduceMotion ? 'div' : motion.div;
  const wrapperProps = reduceMotion ? {} : { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, transition: defaultTransition };
  const handleClick = (e) => {
    if (path === location.pathname) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('app-refresh-page', { detail: { pathname: path } }));
    }
    onNavigate?.();
  };

  return (
    <Wrapper {...wrapperProps}>
      <Link
        to={path}
        onClick={handleClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-white text-sm transition-colors duration-200 ${
          isActive ? 'bg-white/20 ring-1 ring-white/30' : 'hover:bg-white/10'
        }`}
        title={collapsed ? label : undefined}
      >
        {Icon && <Icon className="w-5 h-5 shrink-0" />}
        {!collapsed && <span>{label}</span>}
      </Link>
    </Wrapper>
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

function SidebarGroup({ item, collapsed, onNavigate }) {
  const location = useLocation();
  const children = item.children || [];
  const hasActiveChild = children.some((c) => (c.route_path || c.path) === location.pathname);
  const [open, setOpen] = useState(hasActiveChild);
  const Icon = item.iconComponent;
  const label = item.menu_name || item.label;

  if (children.length === 0 && item.path) {
    return <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} />;
  }
  if (children.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-white text-sm transition-colors hover:bg-white/10 ${
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
              <SidebarGroup key={child.menu_key || child.path} item={child} collapsed={collapsed} onNavigate={onNavigate} />
            ) : (
              <NavLink key={child.menu_key || child.path} item={child} collapsed={collapsed} onNavigate={onNavigate} />
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, menus, logout } = useAuth();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  if (isLogin) return children;

  const navItems = (menus || []).map(mapMenuToNav);

  const sidebarContent = (
    <>
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        {!collapsed && <span className="font-semibold text-lg truncate">Toro Weaving</span>}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-lg hover:bg-white/10 hidden lg:block"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <button
          type="button"
          onClick={closeMobileMenu}
          className="p-1.5 rounded-lg hover:bg-white/10 lg:hidden"
          aria-label="Close menu"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
        {navItems.length > 0 ? (
          navItems.map((item) => {
            if (item.children?.length > 0) {
              return <SidebarGroup key={item.menu_key || item.path || item.label} item={item} collapsed={collapsed} onNavigate={closeMobileMenu} />;
            }
            if (item.route_path || item.path) {
              return <NavLink key={item.menu_key || item.path} item={item} collapsed={collapsed} onNavigate={closeMobileMenu} />;
            }
            return null;
          })
        ) : (
          <NavLink item={{ path: '/', label: 'Dashboard', route_path: '/', iconComponent: getIcon('LayoutDashboard') }} collapsed={collapsed} onNavigate={closeMobileMenu} />
        )}
      </nav>
      <div className="border-t border-white/10 p-3 space-y-2 shrink-0">
        <Link
          to="/settings/profile"
          onClick={closeMobileMenu}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-white transition-colors ${
            location.pathname === '/settings/profile' ? 'bg-white/20 ring-1 ring-white/30' : 'bg-white/10 hover:bg-white/15'
          } ${collapsed ? 'justify-center' : ''}`}
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
          onClick={() => { closeMobileMenu(); logout(); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white text-sm hover:bg-white/10 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={defaultTransition}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar: drawer on mobile, fixed on desktop */}
      <aside
        style={{ backgroundColor: sidebarBg }}
        className={`
          fixed lg:relative inset-y-0 left-0 z-40 flex flex-col text-white transition-transform duration-300 ease-out shrink-0 h-screen
          w-64
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar: always visible; on mobile shows hamburger + title */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate min-w-0">
            Weaving Production Management
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
          <AnimatePresence mode="wait">
            <AnimatedPage key={location.pathname}>{children}</AnimatedPage>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
