/**
 * Map route path (pathname) to menu_key for permission checks.
 * Must match backend menus (route_path) and MenusSeeder.
 */
export const pathToMenuKey = {
  '/': 'dashboard',
  '/companies': 'companies',
  '/companies/:id/edit': 'companies',
  '/orders': 'orders',
  '/orders/:id/edit': 'orders',
  '/loom-production/looms': 'loom_production.looms',
  '/loom-production/daily': 'loom_production.daily',
  '/loom-production/report': 'loom_production.report',
  '/payments': 'payments',
  '/expenses': 'expenses',
  '/gst/in': 'gst',
  '/gst/out': 'gst',
  '/reports/gst-summary': 'reports.gst_summary',
  '/reports/order-summary': 'reports.order_summary',
  '/reports/loom-efficiency': 'reports.loom_efficiency',
  '/yarn-stock': 'yarn_stock',
  '/yarn-stock/entry': 'yarn_stock',
  '/admin/users': 'admin.users',
  '/admin/permissions': 'admin.permissions',
  '/settings/profile': 'settings.profile',
};

/**
 * Resolve current pathname to a menu_key (handles dynamic segments like :id).
 */
export function getMenuKeyForPath(pathname) {
  if (pathToMenuKey[pathname]) return pathToMenuKey[pathname];
  if (pathname.startsWith('/companies/') && pathname.endsWith('/edit')) return 'companies';
  if (pathname.startsWith('/orders/') && pathname.endsWith('/edit')) return 'orders';
  if (pathname.startsWith('/yarn-stock/entry')) return 'yarn_stock';
  return null;
}
