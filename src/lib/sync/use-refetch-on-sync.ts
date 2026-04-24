'use client';

import { useEffect, useRef } from 'react';
import { subscribeDataSync } from './data-sync';

/**
 * Refetch quando outra aba invalida as chaves + polling lento com aba visível (sem martelar o banco).
 */
export function useRefetchOnSyncInvalidate(refetch: () => void | Promise<void>, keys: string[], pollMs = 120_000) {
  const keysRef = useRef(keys);
  keysRef.current = keys;

  useEffect(() => {
    const unsub = subscribeDataSync(invalidated => {
      if (invalidated.some(k => keysRef.current.includes(k))) void refetch();
    });

    const tick = () => {
      if (document.visibilityState === 'visible') void refetch();
    };

    const intervalId = window.setInterval(tick, pollMs);
    document.addEventListener('visibilitychange', tick);

    return () => {
      unsub();
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refetch, pollMs]);
}
