import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMenuKeyForPath } from '../utils/routeMenuKey';

/**
 * Returns view/edit permission for the current route's menu.
 * Use in page components to disable add/edit/delete/save when canEdit is false.
 */
export function usePagePermission() {
  const { pathname } = useLocation();
  const { canView, canEdit } = useAuth();
  const menuKey = useMemo(() => getMenuKeyForPath(pathname), [pathname]);
  return {
    menuKey,
    canView: menuKey ? canView(menuKey) : true,
    canEdit: menuKey ? canEdit(menuKey) : false,
  };
}
