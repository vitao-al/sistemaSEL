import React, { useEffect, useRef } from 'react';

export default function RetryNotice({
  message = 'Falha ao carregar os dados.',
  onRetry,
  autoRetry = true,
  intervalMs = 5000,
}: {
  message?: string;
  onRetry: () => void | Promise<void>;
  autoRetry?: boolean;
  intervalMs?: number;
}) {
  const attempts = useRef(0);

  useEffect(() => {
    if (!autoRetry) return;

    let mounted = true;
    const id = setInterval(() => {
      if (!mounted) return;
      // only attempt when browser reports online
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      attempts.current += 1;
      // call onRetry but don't await to avoid blocking
      try {
        void onRetry();
      } catch {
        // swallow - caller handles state
      }
      // limit attempts to avoid tight loops
      if (attempts.current > 10) {
        clearInterval(id);
      }
    }, intervalMs);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [autoRetry, intervalMs, onRetry]);

  return (
    <div style={{ padding: 18, textAlign: 'center', background: 'var(--surface-bg)', borderRadius: 8 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>{message}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        <button onClick={() => void onRetry()}>Tentar novamente</button>
        <button onClick={() => window.location.reload()}>Recarregar</button>
      </div>
    </div>
  );
}
