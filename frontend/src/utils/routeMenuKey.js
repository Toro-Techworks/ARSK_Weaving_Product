/**
 * Map route path (pathname) to menu_key for permission checks.
 * Must match backend menus (route_path) and MenusSeeder.
 */
export const pathToMenuKey = {
  '/': 'dashboard',
  '/companies': 'companies',
  '/companies/deleted': 'companies',
  '/companies/:id/edit': 'companies',
  '/orders': 'orders',
  '/orders/deleted': 'orders',
  '/orders/:id/edit': 'orders',
  '/loom-production/looms': 'loom_production.looms',
  '/loom-production/daily': 'loom_production.daily',
  '/loom-production/assigning': 'loom_production.assigning',
  '/payments': 'payments',
  '/expenses': 'expenses',
  '/reports/production': 'reports.production',
  '/reports/client-expenses': 'reports.client_expenses',
  '/yarn-stock': 'yarn_stock',
  '/yarn-stock/entry': 'yarn_stock',
  '/winding': 'winding',
  '/admin/users': 'admin.users',
  '/admin/permissions': 'admin.permissions',
  '/admin/notifications': 'admin.notifications',
  '/admin/weaving-units': 'admin.weaving_units',
  '/admin/weaving-units/deleted': 'admin.weaving_units',
  '/admin/winding-units': 'admin.winding_units',
  '/admin/winding-units/deleted': 'admin.winding_units',
  '/admin/weavers': 'admin.weavers',
  '/admin/weavers/deleted': 'admin.weavers',
  '/admin/loom-history': 'admin.loom_history',
  '/admin/master-settings': 'admin.master_settings',
  '/loom-production/looms/:loomId': 'loom_production.looms',
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
  if (pathname.startsWith('/loom-production/looms/') && pathname !== '/loom-production/looms') {
    return 'loom_production.looms';
  }
  return null;
}
