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

function getAuthTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawPersistedState = window.localStorage.getItem('voter-auth');
    if (!rawPersistedState) return null;

    const parsed = JSON.parse(rawPersistedState) as {
      state?: { token?: string | null };
      token?: string | null;
    };

    return parsed.state?.token ?? parsed.token ?? null;
  } catch {
    return null;
  }
}

export async function httpRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const authToken = getAuthTokenFromStorage();

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    if (!response.ok) {
      throw new HttpClientError('Erro de comunicação com o servidor.', response.status);
    }
  }

  if (!response.ok || !payload?.success) {
    const message = payload?.error?.message ?? 'Erro inesperado de comunicação.';
    throw new HttpClientError(message, response.status, payload?.error?.code, payload?.error?.details);
  }

  return payload.data as T;
}
