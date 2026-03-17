import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { Eye, Pencil } from 'lucide-react';
import api from '../../api/client';
import { Card } from '../../components/Card';
import Button from '../../components/Button';
import { usePagePermission } from '../../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../../hooks/useRefreshOnSameMenuClick';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_USER_COLUMN_WIDTH = 240;
const DEFAULT_MENU_CELL_WIDTH = 72;
const MIN_USER_COLUMN_WIDTH = 160;
const MIN_MENU_CELL_WIDTH = 48;
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 52;
const RESIZE_HANDLE_WIDTH = 8;

function getPermission(permissions, userId, menuId) {
  const u = permissions[userId];
  if (!u) return { view: false, edit: false };
  const m = u[menuId];
  if (!m) return { view: false, edit: false };
  return { view: !!m.view, edit: !!m.edit };
}

function setPermission(permissions, userId, menuId, { view, edit }) {
  const next = { ...permissions };
  next[userId] = { ...(next[userId] || {}) };
  next[userId][menuId] = { view: !!view, edit: !!edit };
  return next;
}

export function AdminPermissionMatrix() {
  const { canEdit } = usePagePermission();
  const { refreshMenus } = useAuth();
  const [users, setUsers] = useState([]);
  const [menus, setMenus] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userColumnWidth, setUserColumnWidth] = useState(DEFAULT_USER_COLUMN_WIDTH);
  const [menuWidths, setMenuWidths] = useState([]);
  const resizeRef = useRef(null);

  useEffect(() => {
    if (menus.length > 0 && menuWidths.length !== menus.length) {
      setMenuWidths((prev) => {
        const next = menus.map((_, i) => prev[i] ?? DEFAULT_MENU_CELL_WIDTH);
        return next;
      });
    }
  }, [menus.length, menus]);

  const handleResizeStart = useCallback((type, index, startX, startWidth) => {
    resizeRef.current = { type, index, startX, startWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      const r = resizeRef.current;
      if (!r) return;
      const delta = e.clientX - r.startX;
      const newWidth = Math.max(
        r.type === 'user' ? MIN_USER_COLUMN_WIDTH : MIN_MENU_CELL_WIDTH,
        Math.min(r.type === 'user' ? 400 : 200, r.startWidth + delta)
      );
      if (r.type === 'user') {
        setUserColumnWidth(newWidth);
      } else {
        setMenuWidths((prev) => {
          const next = [...prev];
          next[r.index] = newWidth;
          return next;
        });
      }
      // Use incremental delta: next move is relative to this position so width tracks cursor
      resizeRef.current = { ...r, startX: e.clientX, startWidth: newWidth };
    };
    const onUp = () => {
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, menusRes, mappingRes] = await Promise.all([
        api.get('/permissions/users'),
        api.get('/permissions/menus'),
        api.get('/permissions/user-menu'),
      ]);
      const userList = usersRes.data.data || [];
      const menuList = menusRes.data.data || [];
      const mapping = mappingRes.data.data || [];

      const permMap = {};
      userList.forEach((u) => {
        permMap[u.id] = {};
        menuList.forEach((m) => {
          const row = mapping.find((r) => r.user_id === u.id && r.menu_id === m.id);
          permMap[u.id][m.id] = row
            ? { view: row.view, edit: row.edit }
            : { view: false, edit: false };
        });
      });
      setUsers(userList);
      setMenus(menuList);
      setPermissions(permMap);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load permissions');
      setUsers([]);
      setMenus([]);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnSameMenuClick(load);

  const handleViewChange = useCallback((userId, menuId, checked) => {
    setPermissions((prev) => {
      const current = getPermission(prev, userId, menuId);
      const view = checked;
      const edit = checked ? current.edit : false;
      return setPermission(prev, userId, menuId, { view, edit });
    });
  }, []);

  const handleEditChange = useCallback((userId, menuId, checked) => {
    setPermissions((prev) => {
      const current = getPermission(prev, userId, menuId);
      const edit = checked;
      const view = edit ? true : current.view;
      return setPermission(prev, userId, menuId, { view, edit });
    });
  }, []);

  const handleEnableEditAllForUser = useCallback((userId) => {
    if (!menus.length) return;
    setPermissions((prev) => {
      const next = { ...prev };
      next[userId] = { ...(next[userId] || {}) };
      menus.forEach((menu) => {
        next[userId][menu.id] = { view: true, edit: true };
      });
      return next;
    });
  }, [menus]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = [];
      Object.keys(permissions).forEach((userId) => {
        Object.keys(permissions[userId]).forEach((menuId) => {
          const p = permissions[userId][menuId];
          if (p.view || p.edit) {
            payload.push({
              user_id: Number(userId),
              menu_id: Number(menuId),
              view: p.view || p.edit,
              edit: !!p.edit,
            });
          }
        });
      });
      await api.post('/permissions/save', { permissions: payload });
      toast.success('Permissions saved.');
      await refreshMenus();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [permissions, load, refreshMenus]);

  const tableWidth = useMemo(
    () =>
      userColumnWidth +
      (menuWidths.length ? menuWidths.reduce((a, b) => a + b, 0) : menus.length * DEFAULT_MENU_CELL_WIDTH),
    [userColumnWidth, menuWidths, menus.length]
  );

  const getMenuWidth = useCallback(
    (index) => menuWidths[index] ?? DEFAULT_MENU_CELL_WIDTH,
    [menuWidths]
  );

  const listHeight = 500;

  if (loading) {
    return (
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">User Menu Permissions</h2>
        <p className="text-sm text-gray-500 mb-4">Toggle permissions. Edit includes View.</p>
        <div className="text-gray-500 py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Sticky top bar: title + help + save button */}
      <div className="sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 -mx-0 px-0 mb-2 bg-[#F9FAFB] border-b border-gray-200 sm:border-0 sm:bg-transparent sm:mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">User Menu Permissions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Toggle permissions. Edit includes View.</p>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving} className="shrink-0 w-full sm:w-auto">
            {saving ? 'Saving...' : 'Save Permissions'}
          </Button>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto overflow-y-hidden">
          <div style={{ minWidth: tableWidth }}>
            {/* Sticky table header */}
            <div
              className="flex sticky top-0 z-20 bg-gray-50 border-b border-gray-200 shadow-sm"
              style={{ height: HEADER_HEIGHT }}
            >
              <div
                className="sticky left-0 z-20 shrink-0 flex items-center px-3 border-r border-gray-200 font-medium text-gray-700 text-sm bg-gray-50 relative"
                style={{ width: userColumnWidth, minWidth: userColumnWidth }}
              >
                User
                <div
                  role="separator"
                  aria-label="Resize column"
                  className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-brand/10 active:bg-brand/20 transition-colors flex items-center justify-center group"
                  style={{ width: RESIZE_HANDLE_WIDTH }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleResizeStart('user', 0, e.clientX, userColumnWidth);
                  }}
                >
                  <span className="w-0.5 h-6 bg-gray-300 group-hover:bg-brand/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex shrink-0">
                {menus.map((menu, idx) => (
                  <div
                    key={menu.id}
                    className="flex flex-col items-center justify-center border-r border-gray-200 py-1 relative"
                    style={{ width: getMenuWidth(idx), minWidth: getMenuWidth(idx) }}
                  >
                    <span className="text-xs font-medium text-gray-700 truncate w-full text-center px-0.5" title={menu.menu_name}>
                      {menu.menu_name}
                    </span>
                    <span className="flex items-center gap-0.5 text-gray-400 mt-0.5" aria-hidden>
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[10px]">|</span>
                      <Pencil className="w-3.5 h-3.5" />
                    </span>
                    <div
                      role="separator"
                      aria-label="Resize column"
                      className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-brand/10 active:bg-brand/20 transition-colors flex items-center justify-center group"
                      style={{ width: RESIZE_HANDLE_WIDTH }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleResizeStart('menu', idx, e.clientX, getMenuWidth(idx));
                      }}
                    >
                      <span className="w-0.5 h-6 bg-gray-300 group-hover:bg-brand/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {users.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">No users.</div>
            ) : (
              <div
                className="overflow-y-auto overflow-x-hidden"
                style={{ maxHeight: listHeight, width: tableWidth }}
              >
                {users.map((user, rowIndex) => {
                  const isEven = rowIndex % 2 === 0;
                  const rowBg = isEven ? 'bg-white' : 'bg-gray-50/60';
                  const stickyBg = isEven ? 'bg-white' : 'bg-gray-50/60';
                  return (
                    <div
                      key={user.id}
                      className={`group flex border-b border-gray-100 ${rowBg} hover:bg-gray-100/80 transition-colors`}
                      style={{ minHeight: ROW_HEIGHT }}
                    >
                      <div
                        className={`sticky left-0 z-10 shrink-0 flex flex-col justify-center px-3 py-1.5 border-r border-gray-200 ${stickyBg} group-hover:bg-gray-100/80 transition-colors`}
                        style={{ width: userColumnWidth, minWidth: userColumnWidth }}
                      >
                        <span className="text-sm font-medium text-gray-900 truncate" title={user.name}>
                          {user.name}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEnableEditAllForUser(user.id)}
                            className="text-xs text-brand hover:text-brand-dark hover:underline mt-0.5 text-left focus:outline-none focus:ring-1 focus:ring-brand rounded"
                          >
                            Enable edit for all
                          </button>
                        )}
                      </div>
                      <div className="flex shrink-0">
                        {menus.map((menu, idx) => {
                          const p = getPermission(permissions, user.id, menu.id);
                          return (
                            <div
                              key={menu.id}
                              className="flex items-center justify-center border-r border-gray-100 py-1.5"
                              style={{ width: getMenuWidth(idx), minWidth: getMenuWidth(idx) }}
                            >
                              <div className="flex items-center gap-1 rounded-md bg-gray-100/80 px-1.5 py-1 border border-gray-200/80">
                                <label className="cursor-pointer p-0.5 rounded hover:bg-gray-200/60 transition-colors" title="View">
                                  <input
                                    type="checkbox"
                                    checked={p.view}
                                    disabled={!canEdit}
                                    onChange={(e) => handleViewChange(user.id, menu.id, e.target.checked)}
                                    className="rounded border-gray-300 text-brand focus:ring-brand w-3.5 h-3.5"
                                    aria-label={`View ${menu.menu_name}`}
                                  />
                                </label>
                                <span className="text-gray-300 text-xs font-medium" aria-hidden>|</span>
                                <label className="cursor-pointer p-0.5 rounded hover:bg-gray-200/60 transition-colors" title="Edit">
                                  <input
                                    type="checkbox"
                                    checked={p.edit}
                                    disabled={!canEdit}
                                    onChange={(e) => handleEditChange(user.id, menu.id, e.target.checked)}
                                    className="rounded border-gray-300 text-brand focus:ring-brand w-3.5 h-3.5"
                                    aria-label={`Edit ${menu.menu_name}`}
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
