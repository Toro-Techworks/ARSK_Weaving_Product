import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatRelativeTime } from '../utils/relativeTime';

const POLL_MS = 30_000;

function formatModule(module) {
  if (!module) return '—';
  return module
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

function actionDotClass(action) {
  const a = String(action || '').toLowerCase();
  if (a === 'create') return 'bg-emerald-500';
  if (a === 'update') return 'bg-blue-500';
  if (a === 'delete') return 'bg-red-500';
  return 'bg-slate-400';
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const rootRef = useRef(null);

  const isSuperAdmin = user?.role === 'super_admin';

  const fetchUnread = useCallback(() => {
    if (!isSuperAdmin) return;
    api
      .get('/notifications/unread-count')
      .then(({ data }) => setUnreadCount(Number(data.unread_count) || 0))
      .catch(() => {});
  }, [isSuperAdmin]);

  const loadPreviewAndMarkRead = useCallback(() => {
    if (!isSuperAdmin) return;
    setLoadingPreview(true);
    api
      .get('/notifications/preview')
      .then(({ data }) => {
        setItems(Array.isArray(data.items) ? data.items : []);
        setUnreadCount(Number(data.unread_count) || 0);
        return api.post('/notifications/mark-read');
      })
      .then(() => {
        setUnreadCount(0);
      })
      .catch(() => {})
      .finally(() => setLoadingPreview(false));
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    fetchUnread();
    const id = window.setInterval(fetchUnread, POLL_MS);
    return () => window.clearInterval(id);
  }, [isSuperAdmin, fetchUnread]);

  useEffect(() => {
    const onMarkedRead = () => setUnreadCount(0);
    window.addEventListener('app-notifications-marked-read', onMarkedRead);
    return () => window.removeEventListener('app-notifications-marked-read', onMarkedRead);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setOpen(true);
      loadPreviewAndMarkRead();
    } else {
      setOpen(false);
    }
  };

  if (!isSuperAdmin) return null;

  const badge =
    unreadCount > 0 ? (
      <span
        className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none shadow-sm"
        aria-hidden
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    ) : null;

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative p-2.5 rounded-xl text-[#3c3a8f] hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
        {badge}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80 z-50 overflow-hidden"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <p className="text-sm font-semibold text-slate-800">Activity</p>
            <p className="text-xs text-slate-500 mt-0.5">Recent changes across the system</p>
          </div>
          <div className="max-h-[min(20rem,50vh)] overflow-y-auto">
            {loadingPreview && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((row) => (
                  <li key={row.id} className="px-4 py-3 hover:bg-slate-50/80 transition-colors">
                    <div className="flex gap-2.5">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${actionDotClass(row.action)}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Actor</p>
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {row.actor_name || row.user_name || 'System'}
                        </p>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{row.description || '—'}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {formatModule(row.module)}
                          {row.record_id != null ? ` · #${row.record_id}` : ''} · {formatRelativeTime(row.created_at)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-slate-100 p-2 bg-slate-50/50">
            <Link
              to="/admin/notifications"
              role="menuitem"
              className="block w-full text-center text-sm font-medium text-[#3c3a8f] py-2 rounded-lg hover:bg-indigo-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              View all activity
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
