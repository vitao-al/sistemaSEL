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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof window==='undefined'||!window.console)return;var o=console.error;console.error=function(){var a=[];for(var i=0;i<arguments.length;i++){var x=arguments[i];if(x instanceof Error){var m=(x.message&&!x.message.includes('(')&&!x.message.includes('at '))?x.message:'Falha na operação';a.push('[Erro: '+m+']');}else if(typeof x==='function'){a.push('[Função protegida]');}else{a.push(x);}}o.apply(console,a);};})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
