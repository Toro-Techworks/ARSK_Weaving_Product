import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/Card';
import Button from '../../components/Button';
import { usePagePermission } from '../../hooks/usePagePermission';
import { useAuth } from '../../context/AuthContext';

const FIRST_COLUMN_WIDTH = 200;
const MENU_CELL_WIDTH = 140;
const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 56;

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
    () => FIRST_COLUMN_WIDTH + menus.length * MENU_CELL_WIDTH,
    [menus.length]
  );

  const listHeight = 500;

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">User Menu Permissions</h2>
        <div className="text-gray-500 py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">User Menu Permissions</h2>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Permissions'}
          </Button>
        )}
      </div>
      <Card className="p-0 overflow-hidden">
        <p className="px-6 py-2 text-sm text-gray-600 border-b border-gray-100">
          Rows = Users, Columns = Menus. View = access menu; Edit = view + edit. Uncheck both = no access (menu hidden in sidebar).
        </p>
        <div className="overflow-x-auto">
          <div style={{ minWidth: tableWidth }}>
            <div
              className="flex sticky top-0 z-20 bg-gray-50 border-b border-gray-200"
              style={{ height: HEADER_HEIGHT }}
            >
              <div
                className="sticky left-0 z-20 shrink-0 flex items-center px-3 border-r border-gray-200 font-medium text-gray-700 text-sm bg-gray-50"
                style={{ width: FIRST_COLUMN_WIDTH, minWidth: FIRST_COLUMN_WIDTH }}
              >
                User
              </div>
              <div className="flex shrink-0">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className="flex flex-col items-center justify-center px-2 border-r border-gray-200"
                    style={{ width: MENU_CELL_WIDTH, minWidth: MENU_CELL_WIDTH }}
                  >
                    <span className="text-xs font-medium text-gray-700 truncate w-full text-center" title={menu.menu_name}>
                      {menu.menu_name}
                    </span>
                    <span className="text-xs text-gray-500">View / Edit</span>
                  </div>
                ))}
              </div>
            </div>
            {users.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No users.</div>
            ) : (
              <div
                className="overflow-y-auto overflow-x-hidden"
                style={{ maxHeight: listHeight, width: tableWidth }}
              >
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex border-b border-gray-100 bg-white hover:bg-gray-50/80"
                    style={{ minHeight: ROW_HEIGHT }}
                  >
                    <div
                      className="sticky left-0 z-10 shrink-0 flex items-center px-3 border-r border-gray-200 bg-white"
                      style={{ width: FIRST_COLUMN_WIDTH, minWidth: FIRST_COLUMN_WIDTH }}
                    >
                      <span className="text-sm font-medium text-gray-900 truncate" title={user.name}>
                        {user.name}
                      </span>
                    </div>
                    <div className="flex shrink-0">
                      {menus.map((menu) => {
                        const p = getPermission(permissions, user.id, menu.id);
                        return (
                          <div
                            key={menu.id}
                            className="flex items-center justify-center gap-3 px-2 border-r border-gray-100"
                            style={{ width: MENU_CELL_WIDTH, minWidth: MENU_CELL_WIDTH }}
                          >
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={p.view}
                                disabled={!canEdit}
                                onChange={(e) => handleViewChange(user.id, menu.id, e.target.checked)}
                                className="rounded border-gray-300 text-brand focus:ring-brand"
                              />
                              <span className="text-gray-600">View</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={p.edit}
                                disabled={!canEdit}
                                onChange={(e) => handleEditChange(user.id, menu.id, e.target.checked)}
                                className="rounded border-gray-300 text-brand focus:ring-brand"
                              />
                              <span className="text-gray-600">Edit</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
