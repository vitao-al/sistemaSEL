// Layout raiz do App Router.
// Define metadados globais e aplica o stylesheet base uma única vez para toda a aplicação.

import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Sistema SEL',
  description: 'Sistema de gestão de eleitores para campanhas políticas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
