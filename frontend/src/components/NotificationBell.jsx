import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatRelativeTime } from '../utils/relativeTime';

const POLL_MS = 30_000;

const PANEL_Z = 10000;

const panelShellStyle = {
  position: 'fixed',
  zIndex: PANEL_Z,
  width: 'min(calc(100vw - 2rem), 22rem)',
  maxWidth: 'calc(100vw - 2rem)',
  backgroundColor: '#ffffff',
  opacity: 1,
  isolation: 'isolate',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.22)',
  overflow: 'hidden',
  outline: 'none',
};

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
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

  const canViewNotifications = user?.role === 'super_admin' || user?.role === 'admin';

  const updatePanelPosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPanelPos({
      top: r.bottom + 8,
      right: Math.max(16, window.innerWidth - r.right),
    });
  }, []);

  const fetchUnread = useCallback(() => {
    if (!canViewNotifications) return;
    api
      .get('/notifications/unread-count')
      .then(({ data }) => setUnreadCount(Number(data.unread_count) || 0))
      .catch(() => {});
  }, [canViewNotifications]);

  const loadPreviewAndMarkRead = useCallback(() => {
    if (!canViewNotifications) return;
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
  }, [canViewNotifications]);

  useEffect(() => {
    if (!canViewNotifications) return undefined;
    fetchUnread();
    const id = window.setInterval(fetchUnread, POLL_MS);
    return () => window.clearInterval(id);
  }, [canViewNotifications, fetchUnread]);

  useEffect(() => {
    const onMarkedRead = () => setUnreadCount(0);
    window.addEventListener('app-notifications-marked-read', onMarkedRead);
    return () => window.removeEventListener('app-notifications-marked-read', onMarkedRead);
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const t = window.setTimeout(() => {
      panelRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const toggle = () => {
    if (!open) {
      setOpen(true);
      loadPreviewAndMarkRead();
    } else {
      setOpen(false);
    }
  };

  if (!canViewNotifications) return null;

  const badge =
    unreadCount > 0 ? (
      <span
        className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none shadow-sm"
        aria-hidden
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    ) : null;

  const panelNode =
    open && typeof document !== 'undefined' ? (
      createPortal(
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Activity"
          className="focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          style={{
            ...panelShellStyle,
            top: panelPos.top,
            right: panelPos.right,
          }}
        >
          <div
            className="border-b border-slate-200 px-4 py-3 flex items-start justify-between gap-2"
            style={{ backgroundColor: '#f1f5f9' }}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                Activity
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                Recent changes across the system
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-200/80 hover:text-slate-800"
              aria-label="Close activity panel"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
          <div
            className="max-h-[min(20rem,50vh)] overflow-y-auto"
            style={{ backgroundColor: '#ffffff' }}
          >
            {loadingPreview && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: '#64748b' }}>
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: '#64748b' }}>
                No activity yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100" style={{ backgroundColor: '#ffffff' }}>
                {items.map((row) => (
                  <li
                    key={row.id}
                    className="px-4 py-3 transition-colors"
                    style={{ backgroundColor: '#ffffff' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <div className="flex gap-2.5">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${actionDotClass(row.action)}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                          Actor
                        </p>
                        <p className="text-xs font-medium truncate" style={{ color: '#1e293b' }}>
                          {row.actor_name || row.user_name || 'System'}
                        </p>
                        <p className="text-xs line-clamp-2 mt-0.5" style={{ color: '#475569' }}>
                          {row.description || '—'}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>
                          {formatModule(row.module)}
                          {row.record_id != null ? ` · #${row.record_id}` : ''} ·{' '}
                          {formatRelativeTime(row.created_at)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-slate-200 p-2" style={{ backgroundColor: '#f1f5f9' }}>
            <Link
              to="/admin/notifications"
              className="block w-full text-center text-sm font-medium text-[#3c3a8f] py-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eef2ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => setOpen(false)}
            >
              View all activity
            </Link>
          </div>
        </div>,
        document.body,
      )
    ) : null;

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="relative p-2.5 rounded-xl text-[#3c3a8f] hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
        {badge}
      </button>
      {panelNode}
    </div>
  );
}
