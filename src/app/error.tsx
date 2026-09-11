'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: 12 }}>Algo deu errado</h1>
        <p style={{ marginBottom: 20, color: '#64748b' }}>{error.message || 'Erro inesperado ao carregar a página.'}</p>
        <button
          onClick={() => reset()}
          style={{
            border: 'none',
            background: '#0ea5e9',
            color: '#fff',
            borderRadius: 10,
            padding: '10px 16px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
