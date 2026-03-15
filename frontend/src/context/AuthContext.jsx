import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api, { getCsrfCookie } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [menus, setMenus] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setMenus([]);
      setPermissions({});
      setPermissionsLoaded(false);
      setLoading(false);
      localStorage.removeItem('user');
      return;
    }
    try {
      const [userRes, menusRes] = await Promise.all([
        api.get('/user'),
        api.get('/menus/user').catch(() => ({ data: { data: [], permissions: {} } })),
      ]);
      setUser(userRes.data.user);
      localStorage.setItem('user', JSON.stringify(userRes.data.user));
      setMenus(menusRes.data.data || []);
      setPermissions(menusRes.data.permissions || {});
      setPermissionsLoaded(true);
    } catch {
      setUser(null);
      setMenus([]);
      setPermissions({});
      setPermissionsLoaded(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refreshMenus = useCallback(async () => {
    const token = localStorage.getItem('token');
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
      if (document.visibilityState === 'visible' && localStorage.getItem('token')) refreshMenus();
    };
    window.addEventListener('visibilitychange', onVisibilityChange);
    return () => window.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refreshMenus]);

  const login = useCallback(async (email, password) => {
    await getCsrfCookie();
    const { data } = await api.post('/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    const menusRes = await api.get('/menus/user').catch(() => ({ data: { data: [], permissions: {} } }));
    setMenus(menusRes.data.data || []);
    setPermissions(menusRes.data.permissions || {});
    setPermissionsLoaded(true);
    return data;
  }, []);

  const setAuth = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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

  return (
    <AuthContext.Provider value={{ user, menus, permissions, permissionsLoaded, loading, login, logout, setAuth, fetchUser, hasRole, refreshMenus, canView, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
