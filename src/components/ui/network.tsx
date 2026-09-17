import React, { useEffect, useState, useRef, useCallback } from 'react';

// Hook simples para detectar estado da conexão e tentar reconectar à API de health.
export function useNetworkStatus(pollPath = '/api/health') {
  const [online, setOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attemptsRef = useRef(0);

  const check = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(pollPath, { cache: 'no-store', credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setOnline(true);
      setLastChecked(new Date());
      attemptsRef.current = 0;
    } catch (err) {
      setOnline(false);
      setError(err instanceof Error ? err.message : String(err));
      attemptsRef.current += 1;
    } finally {
      setChecking(false);
    }
  }, [pollPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleOnline() {
      // When browser reports online, verify by calling the health endpoint.
      void check();
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // initial background check when mounting
    if (!navigator.onLine) {
      setOnline(false);
    } else {
      void check();
    }

    const interval = setInterval(() => {
      // if offline, try periodic reconnect attempts (exponential backoff-ish)
      if (!navigator.onLine) return;
      if (!online) void check();
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [check, online]);

  return { online, checking, lastChecked, error, check } as const;
}

export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
  const { online, checking, lastChecked, error, check } = useNetworkStatus();

  if (online) return null;

  return (
    <div style={{ background: '#fff3f2', color: '#7f1d1d', padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <strong>Sem conexão com a internet</strong>
        <span style={{ opacity: 0.9 }}>O aplicativo detectou perda de conexão. Alguns dados podem não estar atualizados.</span>
        <div>
          <button onClick={() => { void check(); onRetry?.(); }} style={{ marginRight: 8 }}>Tentar novamente</button>
          <button onClick={() => window.location.reload()}>Recarregar página</button>
        </div>
      </div>
      {checking && <div style={{ marginTop: 8, fontSize: 12 }}>Verificando disponibilidade...</div>}
      {error && <div style={{ marginTop: 8, fontSize: 12, color: '#9f1239' }}>Erro: {error}</div>}
      {lastChecked && <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>Última verificação: {lastChecked.toLocaleTimeString()}</div>}
    </div>
  );
}

export default OfflineBanner;
