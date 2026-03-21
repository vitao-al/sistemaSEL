'use client';

// Página de entrada do sistema.
// Após a hidratação do estado persistido, redireciona para login ou dashboard.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const hasHydrated = useAuthStore(s => s.hasHydrated);
  const initialize = useAuthStore(s => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    // Evita redirecionamento prematuro enquanto a sessão em cookie ainda está sendo consultada.
    if (!hasHydrated) return;

    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  return null;
}
