import { useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  isPusherConfigured,
  pusherConfigStatus,
  startAdminActivityEcho,
  teardownEcho,
} from '../realtime/pusherEcho';

function requestNotificationPermission() {
  if (typeof Notification === 'undefined') {
    return;
  }
  if (Notification.permission === 'granted') {
    return;
  }
  if (Notification.permission !== 'denied') {
    void Notification.requestPermission();
  }
}

function showDesktopNotification(body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }
  try {
    new Notification('ARSK ERP', {
      body,
      tag: 'arsk-activity',
      renotify: true,
    });
  } catch (_) {
    /* noop */
  }
}

function formatModuleKey(m) {
  if (!m) return '';
  return m
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

const ACTION_TOAST_LABEL = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  test: 'Test',
};

/**
 * When the logged-in user is super_admin and Pusher env is set, subscribe to public channel
 * "notifications" and listen for .UserActionPerformed (see Laravel UserActionPerformed event).
 */
export function useActivityBroadcast(isSuperAdmin) {
  useEffect(() => {
    if (!isSuperAdmin) {
      teardownEcho();
      return undefined;
    }
    if (!isPusherConfigured()) {
      const { hasKey, clusterSet } = pusherConfigStatus();
      if (hasKey && !clusterSet) {
        console.warn(
          '[Activity] super_admin: add VITE_PUSHER_APP_CLUSTER to match Laravel PUSHER_APP_CLUSTER or real-time notifications stay off.'
        );
      } else if (!hasKey) {
        console.warn(
          '[Activity] super_admin: add VITE_PUSHER_APP_KEY (and cluster) to frontend .env, then restart Vite — real-time notifications disabled.'
        );
      }
      return undefined;
    }

    requestNotificationPermission();

    startAdminActivityEcho((payload = {}) => {
      const msg = payload.message != null ? String(payload.message) : '';
      const modulePart = formatModuleKey(payload.module);
      const actionRaw = payload.action != null ? String(payload.action) : '';
      const actionPart = ACTION_TOAST_LABEL[actionRaw.toLowerCase()] || (actionRaw ? actionRaw.charAt(0).toUpperCase() + actionRaw.slice(1).toLowerCase() : '');
      const meta = [modulePart, actionPart].filter(Boolean).join(' · ');
      const toastText = meta && msg ? `${meta} — ${msg}` : msg || 'Activity';
      const desktopBody = meta && msg ? `${meta}\n${msg}` : toastText;
      showDesktopNotification(desktopBody);
      toast.success(toastText, {
        duration: 6500,
        style: { maxWidth: 'min(100vw - 2rem, 28rem)' },
      });
    });

    return () => {
      teardownEcho();
    };
  }, [isSuperAdmin]);
}
