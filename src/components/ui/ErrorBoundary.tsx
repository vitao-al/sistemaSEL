import React from 'react';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Here we could log to an external service in production.
    // For now we keep it minimal and safe.
    // console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <h2>Ocorreu um erro inesperado</h2>
          <p style={{ maxWidth: 720, margin: '8px auto' }}>
            {this.state.error?.message && !this.state.error.message.includes('(') && !this.state.error.message.includes('at ') && !this.state.error.message.includes('function')
              ? this.state.error.message
              : 'Ocorreu um erro inesperado na exibição deste conteúdo. Por favor, tente recarregar a página.'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => window.location.reload()}>Recarregar</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
