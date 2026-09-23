// Cliente HTTP padrão do frontend para consumo das rotas internas da API.
// Centraliza envelope de resposta, erro tipado e envio automático de cookies da sessão.

type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
};

// Erro padronizado do cliente HTTP para facilitar tratamento nas páginas/containers.
export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

// Helper único para chamadas HTTP da aplicação.
// Regras principais:
// 1) Sempre enviar JSON.
// 2) Enviar cookies da sessão automaticamente.
// 3) Tratar envelope de erro padrão da API.
export async function httpRequest<T>(url: string, init?: RequestInit): Promise<T> {
  // If running in browser and offline, fail fast with a typed error so callers can handle it.
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new HttpClientError('Sem conexão com a internet.', 0, 'NETWORK_OFFLINE');
  }

  const method = (init?.method ?? 'GET').toUpperCase();
  const isReadRequest = method === 'GET' || method === 'HEAD';

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: isReadRequest ? 'force-cache' : 'no-store',
      credentials: 'include',
    });
  } catch {
    // Falha em nível de rede/DNS/offline -> erro limpo sem vazar detalhes técnicos
    throw new HttpClientError('Erro de comunicação com o servidor. Verifique sua conexão.', 0, 'NETWORK_ERROR');
  }

  let payload: ApiEnvelope<T> | null = null;

  // Tenta parsear o payload JSON do backend.
  // Se falhar e a resposta não for OK, dispara erro de comunicação.
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    if (!response.ok) {
      throw new HttpClientError('Erro de comunicação com o servidor.', response.status);
    }
  }

  // Regras de falha: status HTTP inválido ou envelope de negócio com success=false.
  if (!response.ok || !payload?.success) {
    let message = payload?.error?.message ?? 'Erro inesperado de comunicação.';
    if (message.includes('(') || message.includes('at ') || message.includes('function') || message.includes('TypeError')) {
      message = 'Ocorreu um erro no processamento. Tente novamente.';
    }
    throw new HttpClientError(message, response.status, payload?.error?.code);
  }

  // Em caso de sucesso, devolve apenas o conteúdo de data.
  return payload.data as T;
}
