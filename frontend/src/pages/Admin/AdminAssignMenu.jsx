import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { usePagePermission } from '../../hooks/usePagePermission';
import { Card } from '../../components/Card';
import Button from '../../components/Button';

const PER_PAGE = 10;

function roleLabel(role) {
  return (role?.role_name || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminAssignMenu() {
  const { canEdit } = usePagePermission();
  const [roles, setRoles] = useState([]);
  const [allMenus, setAllMenus] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addMenuId, setAddMenuId] = useState('');
  const [page, setPage] = useState(1);

  const selectedRole = roles.find((r) => String(r.id) === selectedRoleId);

  useEffect(() => {
    Promise.all([
      api.get('/roles'),
      api.get('/admin/menus/flat'),
    ]).then(([rolesRes, menusRes]) => {
      setRoles(rolesRes.data.data || []);
      setAllMenus(menusRes.data.data || []);
      if ((rolesRes.data.data || []).length > 0 && !selectedRoleId) {
        setSelectedRoleId(String((rolesRes.data.data)[0].id));
      }
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setPage(1);
    if (!selectedRoleId) {
      setRows([]);
      return;
    }
    setLoading(true);
    api.get('/admin/role-menu-permissions', { params: { role_id: selectedRoleId } })
      .then(({ data }) => {
        const list = (data.data || []).map((p) => ({
          menu_id: p.menu_id,
          menu_name: p.menu?.menu_name || `Menu #${p.menu_id}`,
          can_view: p.can_view ?? false,
          can_create: p.can_create ?? false,
          can_edit: p.can_edit ?? false,
          can_delete: p.can_delete ?? false,
        }));
        setRows(list);
      })
      .catch(() => {
        toast.error('Failed to load permissions');
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [selectedRoleId]);

  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const to = Math.min(currentPage * PER_PAGE, total);
  const paginatedRows = rows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const assignedMenuIds = rows.map((r) => r.menu_id);
  const availableMenus = allMenus.filter((m) => !assignedMenuIds.includes(m.id));

  const handleToggle = (menuId, field, value) => {
    setRows((prev) =>
      prev.map((r) =>
        r.menu_id === menuId ? { ...r, [field]: value } : r
      )
    );
  };

  const handleAddMenu = () => {
    if (!addMenuId) return;
    const menu = allMenus.find((m) => String(m.id) === addMenuId);
    if (!menu) return;
    setRows((prev) => [
      ...prev,
      {
        menu_id: menu.id,
        menu_name: menu.menu_name,
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false,
      },
    ]);
    setAddMenuId('');
  };

  const handleRemoveRow = (menuId) => {
    setRows((prev) => prev.filter((r) => r.menu_id !== menuId));
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const perms = rows.map((r) => ({
        menu_id: r.menu_id,
        can_view: r.can_view,
        can_create: r.can_create,
        can_edit: r.can_edit,
        can_delete: r.can_delete,
      }));
      await api.post('/admin/assign-menu-bulk', { role_id: Number(selectedRoleId), permissions: perms });
      toast.success('Permissions saved');
      api.get('/admin/role-menu-permissions', { params: { role_id: selectedRoleId } })
        .then(({ data }) => {
          const list = (data.data || []).map((p) => ({
            menu_id: p.menu_id,
            menu_name: p.menu?.menu_name || `Menu #${p.menu_id}`,
            can_view: p.can_view ?? false,
            can_create: p.can_create ?? false,
            can_edit: p.can_edit ?? false,
            can_delete: p.can_delete ?? false,
          }));
          setRows(list);
        });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading && roles.length === 0) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Assign Menu to Role</h2>
      <Card>
        <div className="flex flex-wrap gap-4 items-center mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[180px]"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r.id} value={String(r.id)}>{roleLabel(r)}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleSave} disabled={saving || !selectedRoleId || !canEdit}>
            {saving ? 'Saving...' : 'Save permissions'}
          </Button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Menus listed below are assigned to the selected role. Change the role above to edit another role&apos;s menus.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Menu</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">View</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Edit</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading menus for role...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No menus assigned to this role. Add one below.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => (
                  <tr key={r.menu_id} className="border-t">
                    <td className="px-4 py-2 text-sm font-medium">{r.menu_name}</td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={r.can_view}
                        disabled={!canEdit}
                        onChange={(e) => handleToggle(r.menu_id, 'can_view', e.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={r.can_edit}
                        disabled={!canEdit}
                        onChange={(e) => handleToggle(r.menu_id, 'can_edit', e.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(r.menu_id)}
                        disabled={!canEdit}
                        className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > PER_PAGE && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-600">
              Showing {from} to {to} of {total} menus
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                Page {currentPage} of {lastPage}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={currentPage >= lastPage}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {selectedRoleId && availableMenus.length > 0 && canEdit && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
            <span className="text-sm text-gray-600">Add menu to this role:</span>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[160px]"
              value={addMenuId}
              onChange={(e) => setAddMenuId(e.target.value)}
            >
              <option value="">Select menu...</option>
              {availableMenus.map((m) => (
                <option key={m.id} value={String(m.id)}>{m.menu_name}</option>
              ))}
            </select>
            <Button type="button" variant="secondary" onClick={handleAddMenu} disabled={!addMenuId}>
              Add
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
