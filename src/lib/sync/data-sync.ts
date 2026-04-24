/**
 * Sincronização leve entre abas (BroadcastChannel) sem polling agressivo.
 * Invalidações disparam refetch nas telas que assinam a mesma chave.
 */

export const SYNC_CHANNEL_NAME = 'sistema-sel-data';

export type SyncInvalidateMessage = {
  type: 'invalidate';
  keys: string[];
};

export const SYNC_KEYS = {
  dashboardStats: 'dashboard-stats',
  eleitores: 'eleitores',
  cabos: 'cabos',
  profile: 'profile',
} as const;

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
  return channel;
}

export function broadcastInvalidateKeys(keys: string[]) {
  if (keys.length === 0) return;
  dispatchLocalInvalidate(keys);
  const ch = getChannel();
  if (!ch) return;
  const msg: SyncInvalidateMessage = { type: 'invalidate', keys };
  ch.postMessage(msg);
}

const localListeners = new Set<(keys: string[]) => void>();

function dispatchLocalInvalidate(keys: string[]) {
  localListeners.forEach(fn => {
    try {
      fn(keys);
    } catch {
      /* noop */
    }
  });
}

export function subscribeDataSync(onInvalidate: (keys: string[]) => void) {
  localListeners.add(onInvalidate);

  const ch = getChannel();
  const handler = (event: MessageEvent<SyncInvalidateMessage>) => {
    if (event.data?.type === 'invalidate' && Array.isArray(event.data.keys)) {
      onInvalidate(event.data.keys);
    }
  };

  ch?.addEventListener('message', handler);

  return () => {
    localListeners.delete(onInvalidate);
    ch?.removeEventListener('message', handler);
  };
}

/** Após mutação bem-sucedida, mapeia URL → chaves a invalidar. */
export function inferSyncKeysFromRequest(url: string, method: string): string[] {
  const m = method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) return [];

  try {
    const u = new URL(url, 'http://localhost');
    const p = u.pathname;

    if (p.startsWith('/api/eleitores')) {
      return [SYNC_KEYS.dashboardStats, SYNC_KEYS.eleitores];
    }
    if (p.startsWith('/api/cabos')) {
      return [SYNC_KEYS.dashboardStats, SYNC_KEYS.cabos];
    }
    if (p.startsWith('/api/users')) {
      return [SYNC_KEYS.profile];
    }
    if (p.startsWith('/api/auth/register')) {
      return [SYNC_KEYS.cabos, SYNC_KEYS.dashboardStats];
    }
  } catch {
    /* noop */
  }

  return [];
}
