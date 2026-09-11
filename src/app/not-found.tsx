import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: 12 }}>Página não encontrada</h1>
        <p style={{ marginBottom: 20, color: '#64748b' }}>A rota acessada não existe ou foi removida.</p>
        <Link href="/dashboard" style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: 600 }}>
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
