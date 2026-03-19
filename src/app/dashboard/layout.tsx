'use client';

// Layout das rotas internas do dashboard.
// Injeta o provider de toasts para que páginas filhas possam disparar feedback global.

import { ToastProvider } from '@/components/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
