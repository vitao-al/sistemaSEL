'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HttpClientError } from '@/lib/http/client';
import { subscribeDataSync } from './data-sync';

type Options = {
  refreshMs?: number;
  enabled?: boolean;
  onUnauthorized?: () => void;
};

/**
 * Dados “ao vivo”: refetch em invalidação (mesma aba + BroadcastChannel) + polling espaçado só com aba visível.
 */
export function useLiveQuery<T>(key: string, fetcher: () => Promise<T>, options?: Options) {
  const refreshMs = options?.refreshMs ?? 90_000;
  const enabled = options?.enabled ?? true;
  const onUnauthorizedRef = useRef(options?.onUnauthorized);
  onUnauthorizedRef.current = options?.onUnauthorized;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const initialRef = useRef(false);

  const load = useCallback(async () => {
    if (!initialRef.current) {
      setLoading(true);
    }
    try {
      setError(null);
      const result = await fetcherRef.current();
      setData(result);
    } catch (e) {
      if (e instanceof HttpClientError && e.status === 401) {
        onUnauthorizedRef.current?.();
        return;
      }
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados.');
    } finally {
      initialRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await load();
    };

    void run();

    const unsub = subscribeDataSync(keys => {
      if (keys.includes(key)) void run();
    });

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      void run();
    };

    const intervalId = window.setInterval(tick, refreshMs);
    document.addEventListener('visibilitychange', tick);

    return () => {
      cancelled = true;
      unsub();
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [enabled, key, load, refreshMs]);

  return { data, loading, error, refetch: load };
}
