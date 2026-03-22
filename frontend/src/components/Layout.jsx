import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getIcon, getIconForMenu } from './iconsMap';
import { AnimatedPage } from './AnimatedPage';
import { defaultTransition } from '../utils/motion';

const sidebarBg = '#3c3a8f';

function isPathActive(path, pathname) {
  if (!path) return false;
  if (pathname === path) return true;
  if (path === '/') return false;
  return pathname.startsWith(path + '/');
}

/** True if any descendant leaf route matches current path (for auto-expanding menu groups). */
function menuSubtreeHasActive(nodes, pathname) {
  if (!nodes?.length) return false;
  for (const node of nodes) {
    const p = node.route_path || node.path;
    if (p && isPathActive(p, pathname)) return true;
    if (node.children?.length && menuSubtreeHasActive(node.children, pathname)) return true;
  }
  return false;
}

function NavLink({ item, collapsed, onNavigate, isSubmenu = false }) {
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

  const textSize = isSubmenu ? 'text-xs' : 'text-sm';
  const py = isSubmenu ? 'py-2' : 'py-2.5';

  return (
    <Wrapper {...wrapperProps}>
      <Link
        to={path}
        onClick={handleClick}
        className={`group flex items-center gap-3 px-3 ${py} rounded-xl transition-all duration-200 ${
          collapsed ? 'justify-center' : ''
        } ${
          isActive
            ? 'bg-white/20 text-white shadow-md shadow-black/10 ring-1 ring-white/25'
            : 'text-white/85 hover:bg-white/10 hover:text-white hover:shadow-sm'
        }`}
        title={collapsed ? label : undefined}
      >
        {Icon && (
          <Icon
            className={`w-5 h-5 shrink-0 transition-colors ${
              isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
            }`}
            aria-hidden
          />
        )}
        {!collapsed && <span className={`truncate leading-snug ${textSize} font-medium`}>{label}</span>}
      </Link>
    </Wrapper>
  );
}

function mapMenuToNav(menu) {
  const Icon = getIconForMenu(menu);
  const item = {
    id: menu.id,
    menu_key: menu.menu_key,
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

function SidebarGroup({ item, collapsed, onNavigate, nested = false }) {
  const location = useLocation();
  const children = item.children || [];
  const hasActiveChild = menuSubtreeHasActive(children, location.pathname);
  const [open, setOpen] = useState(hasActiveChild);
  const Icon = item.iconComponent;
  const label = item.menu_name || item.label;

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild, location.pathname]);

  if (children.length === 0 && item.path) {
    return <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} isSubmenu={nested} />;
  }
  if (children.length === 0) return null;

  const childList = (
    <>
      {children.map((child) =>
        child.children?.length ? (
          <SidebarGroup
            key={child.menu_key || child.id || child.path}
            item={child}
            collapsed={collapsed}
            onNavigate={onNavigate}
            nested
          />
        ) : (
          <NavLink
            key={child.menu_key || child.id || child.path}
            item={child}
            collapsed={collapsed}
            onNavigate={onNavigate}
            isSubmenu
          />
        )
      )}
    </>
  );

  const parentActive = hasActiveChild;

  return (
    <div className={`mb-1 ${nested && !collapsed ? 'ml-1' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          collapsed ? 'justify-center' : 'justify-between'
        } ${
          parentActive
            ? 'bg-white/18 text-white ring-1 ring-white/25 shadow-sm'
            : 'text-white/85 hover:bg-white/10 hover:text-white'
        } ${open && !parentActive ? 'bg-white/8' : ''}`}
        title={collapsed ? (open ? `${label} (collapse)` : `${label} (expand)`) : undefined}
        aria-expanded={open}
      >
        <span className={`flex items-center gap-3 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
          {Icon && (
            <Icon
              className={`w-5 h-5 shrink-0 transition-colors ${
                parentActive ? 'text-white' : 'text-white/70'
              }`}
              aria-hidden
            />
          )}
          {!collapsed && <span className="truncate leading-snug">{label}</span>}
        </span>
        {!collapsed && (
          <ChevronRight
            className={`w-4 h-4 shrink-0 transition-transform text-white/70 ${open ? 'rotate-90' : ''}`}
            aria-hidden
          />
        )}
      </button>
      {open && !collapsed && (
        <div
          className={
            nested
              ? 'mt-1 ml-2 pl-2 space-y-0.5 border-l border-white/15'
              : 'mt-1 ml-3 pl-3 space-y-0.5 border-l border-white/20'
          }
        >
          {childList}
        </div>
      )}
      {open && collapsed && (
        <div className="mt-1 space-y-0.5 flex flex-col items-center border-t border-white/10 pt-1 mx-0.5">
          {childList}
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
      <div
        className={`px-4 py-5 border-b border-white/10 flex gap-2 ${
          collapsed ? 'flex-col items-center' : 'items-start justify-between'
        }`}
      >
        <div className={`min-w-0 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div>
              <div className="font-bold text-xl tracking-tight text-white leading-none">TORO ERP</div>
              <p className="text-[11px] font-medium text-white/50 uppercase tracking-widest mt-1.5">Weaving</p>
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/20"
              title="TORO ERP"
            >
              T
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1 shrink-0 ${collapsed ? 'flex-col' : ''}`}>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-2 rounded-xl hover:bg-white/10 text-white/90 hidden lg:inline-flex transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="p-2 rounded-xl hover:bg-white/10 text-white/90 lg:hidden transition-colors"
            aria-label="Close menu"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1.5">
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
          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-white transition-all duration-200 ${
            location.pathname === '/settings/profile'
              ? 'bg-white/20 ring-1 ring-white/25 shadow-sm'
              : 'bg-white/8 hover:bg-white/12'
          } ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? user?.name : undefined}
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <User
              className={`w-5 h-5 shrink-0 transition-colors ${
                location.pathname === '/settings/profile' ? 'text-white' : 'text-white/80 group-hover:text-white'
              }`}
            />
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
          className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white text-sm hover:bg-white/10 transition-all duration-200 ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0 text-white/75 group-hover:text-white" aria-hidden />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-toro-surface overflow-hidden">
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
          fixed lg:relative inset-y-0 left-0 z-40 flex flex-col text-white transition-all duration-300 ease-out shrink-0 h-screen
          shadow-[4px_0_24px_-4px_rgba(60,58,143,0.35)]
          w-64
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar: always visible; on mobile shows hamburger + title */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center gap-3 shrink-0 shadow-sm shadow-slate-200/40">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-1 rounded-xl hover:bg-slate-100 text-[#3c3a8f]"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-semibold text-slate-800 truncate">
              Weaving Production Management
            </h1>
            <p className="text-xs text-slate-500 truncate hidden sm:block">TORO ERP · Operations</p>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 min-h-0">
          <AnimatePresence mode="wait">
            <AnimatedPage key={location.pathname}>{children}</AnimatedPage>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
