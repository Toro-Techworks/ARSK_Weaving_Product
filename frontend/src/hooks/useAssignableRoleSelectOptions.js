import { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { fetchAllPaginated } from '../utils/pagination';
import { GENERIC_CODE_TYPES, FALLBACK_ROLE_OPTIONS } from '../constants/genericCodeTypes';
import { useGenericCode, toSelectLabel } from './useGenericCode';

const CANONICAL_ROLE_ORDER = ['super_admin', 'admin', 'user'];

/**
 * Role dropdown options for admin user screens: labels/order from **active** generic_codes (`roles`) only
 * (same for super admins — inactive generic rows never appear). Loads `/roles` to map role_name → id.
 *
 * @param {{ currentUserRole: string, enabled?: boolean }} options
 */
export function useAssignableRoleSelectOptions({ currentUserRole, enabled = true }) {
  const isSuperAdmin = currentUserRole === 'super_admin';
  const { options: genericRoleOptions, loading: loadingGc } = useGenericCode(GENERIC_CODE_TYPES.ROLES, {
    fallback: FALLBACK_ROLE_OPTIONS,
    enabled,
    includeInactive: false,
  });

  const [idByRoleName, setIdByRoleName] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIdByRoleName({});
      setLoadingRoles(false);
      return;
    }
    let cancelled = false;
    setLoadingRoles(true);
    fetchAllPaginated(api, '/roles', { perPage: 100 })
      .then((rows) => {
        if (cancelled) return;
        const m = {};
        rows.forEach((r) => {
          const name = r?.role_name ?? r?.roleName;
          const id = r?.id;
          if (name != null && id != null) m[String(name)] = id;
        });
        setIdByRoleName(m);
      })
      .catch(() => {
        if (!cancelled) setIdByRoleName({});
      })
      .finally(() => {
        if (!cancelled) setLoadingRoles(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const roleSelectOptions = useMemo(() => {
    const fromGeneric = isSuperAdmin
      ? genericRoleOptions
      : genericRoleOptions.filter((o) => o.value === 'user');

    const mapped = fromGeneric
      .map((o) => {
        const key = o.value != null ? String(o.value) : '';
        const id = idByRoleName[key];
        if (id == null) return null;
        return { value: String(id), label: o.label || toSelectLabel(key), _roleName: key };
      })
      .filter(Boolean);

    if (mapped.length > 0) {
      let result = mapped;
      if (isSuperAdmin) {
        result = [...result].sort((a, b) => {
          const ia = CANONICAL_ROLE_ORDER.indexOf(a._roleName);
          const ib = CANONICAL_ROLE_ORDER.indexOf(b._roleName);
          const sa = ia === -1 ? 999 : ia;
          const sb = ib === -1 ? 999 : ib;
          return sa - sb;
        });
      }
      return result.map(({ value, label }) => ({ value, label }));
    }

    // Generic codes missing / mismatch: only list `/roles` rows whose name appears in current generic options (active only).
    const allowedNames = new Set(
      genericRoleOptions.map((o) => (o.value != null ? String(o.value) : '')).filter(Boolean)
    );
    const entries = Object.entries(idByRoleName);
    if (entries.length === 0 || allowedNames.size === 0) {
      return [];
    }
    return entries
      .filter(([roleName]) => {
        if (!allowedNames.has(roleName)) return false;
        if (!isSuperAdmin && roleName !== 'user') return false;
        return true;
      })
      .map(([roleName, id]) => ({
        value: String(id),
        label: toSelectLabel(roleName),
        _roleName: roleName,
      }))
      .sort((a, b) => {
        if (!isSuperAdmin) return Number(a.value) - Number(b.value);
        const ia = CANONICAL_ROLE_ORDER.indexOf(a._roleName);
        const ib = CANONICAL_ROLE_ORDER.indexOf(b._roleName);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      })
      .map(({ value, label }) => ({ value, label }));
  }, [genericRoleOptions, idByRoleName, isSuperAdmin]);

  return {
    roleSelectOptions,
    loading: loadingGc || loadingRoles,
  };
}
