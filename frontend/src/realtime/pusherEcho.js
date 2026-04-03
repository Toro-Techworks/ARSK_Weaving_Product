import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echoInstance = null;

/** Public channel name — must match Laravel UserActionPerformed::broadcastOn() */
export const NOTIFICATIONS_CHANNEL = 'notifications';

function resolvedCluster() {
  const c = import.meta.env.VITE_PUSHER_APP_CLUSTER ?? import.meta.env.VITE_PUSHER_CLUSTER;
  return typeof c === 'string' ? c.trim() : '';
}

export function isPusherConfigured() {
  const key = import.meta.env.VITE_PUSHER_APP_KEY;
  const hasKey = typeof key === 'string' && key.length > 0;
  const cluster = resolvedCluster();
  return hasKey && cluster.length > 0;
}

export function pusherConfigStatus() {
  const key = import.meta.env.VITE_PUSHER_APP_KEY;
  const hasKey = typeof key === 'string' && key.length > 0;
  const cluster = resolvedCluster();
  return { hasKey, clusterSet: cluster.length > 0 };
}

/**
 * Subscribe to public channel "notifications" (no /broadcasting/auth).
 * Listens for broadcastAs: UserActionPerformed → .UserActionPerformed
 */
export function startAdminActivityEcho(onMessage) {
  const key = import.meta.env.VITE_PUSHER_APP_KEY;
  const cluster = resolvedCluster();

  if (typeof key !== 'string' || !key.length) {
    console.warn('[Pusher] Set VITE_PUSHER_APP_KEY in frontend .env (same public key as Laravel PUSHER_APP_KEY).');
    return () => {};
  }
  if (!cluster.length) {
    console.error(
      '[Pusher] Set VITE_PUSHER_APP_CLUSTER in frontend .env to match PUSHER_APP_CLUSTER (e.g. ap2, mt1). Wrong cluster = no events.'
    );
    return () => {};
  }

  if (echoInstance) {
    teardownEcho();
  }

  if (import.meta.env.DEV || import.meta.env.VITE_PUSHER_DEBUG === 'true') {
    Pusher.logToConsole = true;
  }

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key,
    cluster,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
  });

  const pusherClient = echoInstance.connector?.pusher;
  if (pusherClient?.connection) {
    pusherClient.connection.bind('error', (err) => {
      console.error('[Pusher] connection error', err);
    });
    pusherClient.connection.bind('connected', () => {
      console.log('[Pusher] connected (expect wss://ws-' + cluster + '.pusher.com)');
    });
    pusherClient.connection.bind('disconnected', () => {
      console.warn('[Pusher] disconnected');
    });
  }

  echoInstance
    .channel(NOTIFICATIONS_CHANNEL)
    .subscribed(() => {
      console.log('[Pusher] subscribed to channel:', NOTIFICATIONS_CHANNEL, 'listening for .UserActionPerformed');
    })
    .listen('.UserActionPerformed', (e) => {
      console.log('EVENT RECEIVED:', e);
      if (typeof onMessage === 'function') {
        onMessage(e && typeof e === 'object' ? e : { message: String(e ?? '') });
      }
    });

  return teardownEcho;
}

export function teardownEcho() {
  if (!echoInstance) {
    return;
  }
  try {
    echoInstance.leave(NOTIFICATIONS_CHANNEL);
  } catch (_) {
    /* noop */
  }
  try {
    echoInstance.disconnect();
  } catch (_) {
    /* noop */
  }
  echoInstance = null;
}
