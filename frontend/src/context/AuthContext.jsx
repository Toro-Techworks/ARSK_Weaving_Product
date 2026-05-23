import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/client';
import {
  getProductOwnerSession,
  getStoredUser,
  getToken,
  removeStoredUser,
  removeToken,
  setProductOwnerSession,
  setStoredUser,
  setToken,
} from '../utils/auth';

function mergeUserWithProductOwnerFlag(userData, isProductOwner) {
  if (!userData) return null;
  return { ...userData, is_product_owner: Boolean(isProductOwner) };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = getStoredUser();
    const isPO = getProductOwnerSession();
    return mergeUserWithProductOwnerFlag(stored, isPO);
  });
  const [menus, setMenus] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setMenus([]);
      setPermissions({});
      setPermissionsLoaded(false);
      setLoading(false);
      removeStoredUser();
      return;
    }
    try {
      const userRes = await api.get('/user');
      const userData = userRes.data.user;
      const isPO = Boolean(userRes.data.is_product_owner || userData?.is_product_owner);
      setProductOwnerSession(isPO);
      const merged = mergeUserWithProductOwnerFlag(userData, isPO);
      setUser(merged);
      setStoredUser(merged);
      if (isPO) {
        setMenus([]);
        setPermissions({});
        setPermissionsLoaded(true);
      } else {
        const menusRes = await api.get('/menus/user').catch(() => ({ data: { data: [], permissions: {} } }));
        setMenus(menusRes.data.data || []);
        setPermissions(menusRes.data.permissions || {});
        setPermissionsLoaded(true);
      }
    } catch {
      setUser(null);
      setMenus([]);
      setPermissions({});
      setPermissionsLoaded(false);
      removeToken();
      removeStoredUser();
      setProductOwnerSession(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refreshMenus = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const { data } = await api.get('/menus/user');
      setMenus(data.data || []);
      setPermissions(data.permissions || {});
      setPermissionsLoaded(true);
    } catch {
      setMenus([]);
      setPermissions({});
      setPermissionsLoaded(false);
    }
  }, []);

  // Refetch menus/permissions when tab becomes visible so Assign Menu changes apply without re-login
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && getToken()) refreshMenus();
    };
    window.addEventListener('visibilitychange', onVisibilityChange);
    return () => window.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refreshMenus]);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/login', { username, password });
    setToken(data.token);
    const isPO = Boolean(data.is_product_owner || data.user?.is_product_owner);
    setProductOwnerSession(isPO);
    const merged = mergeUserWithProductOwnerFlag(data.user, isPO);
    setUser(merged);
    setStoredUser(merged);
    if (isPO) {
      setMenus([]);
      setPermissions({});
      setPermissionsLoaded(true);
    } else {
      const menusRes = await api.get('/menus/user').catch(() => ({ data: { data: [], permissions: {} } }));
      setMenus(menusRes.data.data || []);
      setPermissions(menusRes.data.permissions || {});
      setPermissionsLoaded(true);
    }
    return data;
  }, []);

  const setAuth = useCallback((token, userData) => {
    setToken(token);
    setUser(userData);
    setStoredUser(userData);
    api.get('/menus/user').then((r) => {
      setMenus(r.data.data || []);
      setPermissions(r.data.permissions || {});
      setPermissionsLoaded(true);
    }).catch(() => { setMenus([]); setPermissions({}); setPermissionsLoaded(false); });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch (_) {}
    removeToken();
    removeStoredUser();
    setProductOwnerSession(false);
    setUser(null);
    setMenus([]);
    setPermissions({});
    setPermissionsLoaded(false);
  }, []);

  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.role);
  }, [user]);

  const canView = useCallback((menuKey) => {
    const p = permissions[menuKey];
    return p ? !!p.view : false;
  }, [permissions]);

  const canEdit = useCallback((menuKey) => {
    const p = permissions[menuKey];
    return p ? !!p.edit : false;
  }, [permissions]);

  const token = getToken();
  const authenticated = Boolean(token);
  const isProductOwner = Boolean(
    getProductOwnerSession() || user?.is_product_owner,
  );

  return (
    <AuthContext.Provider value={{ user, authenticated, isProductOwner, menus, permissions, permissionsLoaded, loading, login, logout, setAuth, fetchUser, hasRole, refreshMenus, canView, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
