/**
 * Pipeline FIFO para mutações HTTP (POST/PUT/PATCH/DELETE) fora de /api/auth.
 * Garante ordem estável (primeiro a entrar, primeiro a sair) e intervalo mínimo
 * entre conclusões para reduzir pressão no banco.
 */

const MUTATION_COOLDOWN_MS = 10_000;

type Listener = (state: { busy: boolean; coolingDown: boolean; nextAllowedAt: number | null }) => void;

const listeners = new Set<Listener>();

let pipelineTail: Promise<void> = Promise.resolve();

let busy = false;
let coolingDown = false;
let nextAllowedAt: number | null = null;

function emit() {
  const state = { busy, coolingDown, nextAllowedAt };
  listeners.forEach(l => {
    try {
      l(state);
    } catch {
      /* noop */
    }
  });
}

function sleep(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

export function subscribeMutationPipeline(listener: Listener) {
  listeners.add(listener);
  listener({ busy, coolingDown, nextAllowedAt });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Enfileira execução em série (FIFO) e aplica espera após cada conclusão.
 */
export function runSerializedMutation<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    pipelineTail = pipelineTail.then(async () => {
      busy = true;
      coolingDown = false;
      nextAllowedAt = null;
      emit();
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      } finally {
        busy = false;
        coolingDown = true;
        nextAllowedAt = Date.now() + MUTATION_COOLDOWN_MS;
        emit();
        await sleep(MUTATION_COOLDOWN_MS);
        coolingDown = false;
        nextAllowedAt = null;
        emit();
      }
    });
  });
}

export function isMutationPipelineBlocked(): boolean {
  return busy || coolingDown;
}
