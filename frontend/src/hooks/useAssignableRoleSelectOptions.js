import { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { normalizePaginatedResponse } from '../utils/pagination';
import { GENERIC_CODE_TYPES, FALLBACK_ROLE_OPTIONS } from '../constants/genericCodeTypes';
import { useGenericCode, toSelectLabel } from './useGenericCode';

const CANONICAL_ROLE_ORDER = ['super_admin', 'admin', 'user'];

/** Cached role_name → id map to avoid repeated /roles calls when opening modals. */
let rolesIdMapCache = null;
let rolesIdMapCacheAt = 0;
const ROLES_MAP_TTL_MS = 120_000;

function getValidRolesCache() {
  return rolesIdMapCache && Object.keys(rolesIdMapCache).length > 0 ? rolesIdMapCache : null;
}

/**
 * Fetch all roles (usually one HTTP request; extra pages in parallel if needed).
 * @returns {Promise<Record<string, number|string>>}
 */
async function loadRolesIdMap() {
  const now = Date.now();
  const cached = getValidRolesCache();
  if (cached && now - rolesIdMapCacheAt < ROLES_MAP_TTL_MS) {
    return cached;
  }

  const first = await api.get('/roles', { params: { per_page: 100, page: 1 } });
  const n1 = normalizePaginatedResponse(first.data);
  let rows = [...n1.data];

  if (n1.last_page > 1) {
    const pages = [];
    for (let p = 2; p <= n1.last_page; p += 1) {
      pages.push(
        api.get('/roles', { params: { per_page: 100, page: p } }).then((res) => normalizePaginatedResponse(res.data).data),
      );
    }
    const chunks = await Promise.all(pages);
    chunks.forEach((chunk) => {
      rows = rows.concat(chunk);
    });
  }

  const m = {};
  rows.forEach((r) => {
    const name = r?.role_name ?? r?.roleName;
    const id = r?.id;
    if (name != null && id != null) m[String(name)] = id;
  });
  rolesIdMapCache = m;
  rolesIdMapCacheAt = Date.now();
  return m;
}

/**
 * Role dropdown options for admin user screens: labels/order from **active** generic_codes (`roles`)
 * plus `/roles` for ids. Roles are loaded in one batched request and cached briefly.
 *
 * @param {{ currentUserRole: string, enabled?: boolean }} options
 */
export function useAssignableRoleSelectOptions({ currentUserRole, enabled = true }) {
  const canAssignManagedRoles = currentUserRole === 'super_admin' || currentUserRole === 'admin';
  const { options: genericRoleOptions } = useGenericCode(GENERIC_CODE_TYPES.ROLES, {
    fallback: FALLBACK_ROLE_OPTIONS,
    enabled,
    includeInactive: false,
  });

  const [idByRoleName, setIdByRoleName] = useState(() => getValidRolesCache() || {});
  const [loadingRoles, setLoadingRoles] = useState(() => !getValidRolesCache());

  useEffect(() => {
    if (!enabled) {
      setLoadingRoles(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingRoles(true);
    loadRolesIdMap()
      .then((m) => {
        if (!cancelled) setIdByRoleName(m);
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
    const fromGeneric = canAssignManagedRoles
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
      if (canAssignManagedRoles) {
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

    const allowedNames = new Set(
      genericRoleOptions.map((o) => (o.value != null ? String(o.value) : '')).filter(Boolean),
    );
    const entries = Object.entries(idByRoleName);
    if (entries.length === 0 || allowedNames.size === 0) {
      return [];
    }
    return entries
      .filter(([roleName]) => {
        if (!allowedNames.has(roleName)) return false;
        if (!canAssignManagedRoles && roleName !== 'user') return false;
        return true;
      })
      .map(([roleName, id]) => ({
        value: String(id),
        label: toSelectLabel(roleName),
        _roleName: roleName,
      }))
      .sort((a, b) => {
        if (!canAssignManagedRoles) return Number(a.value) - Number(b.value);
        const ia = CANONICAL_ROLE_ORDER.indexOf(a._roleName);
        const ib = CANONICAL_ROLE_ORDER.indexOf(b._roleName);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      })
      .map(({ value, label }) => ({ value, label }));
  }, [genericRoleOptions, idByRoleName, canAssignManagedRoles]);

  return {
    roleSelectOptions,
    /** True only while `/roles` map is loading (generic codes use local fallback immediately). */
    loading: loadingRoles,
  };
}
