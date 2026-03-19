'use client';

import { ToastProvider } from '@/components/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
