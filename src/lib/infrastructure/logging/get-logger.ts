import type { LoggerPort } from '@/lib/ports/logger.port';
import { ConsoleLogger } from './console-logger';

const globalKey = '__sistema_sel_logger__';

function getGlobalStore(): { logger?: LoggerPort } {
  const g = globalThis as typeof globalThis & { [globalKey]?: { logger?: LoggerPort } };
  if (!g[globalKey]) {
    g[globalKey] = {};
  }
  return g[globalKey]!;
}

/**
 * Logger padrão da aplicação (singleton por processo).
 * Em testes, pode-se injetar outro `LoggerPort` via `setLoggerForTests`.
 */
export function getLogger(): LoggerPort {
  const store = getGlobalStore();
  if (!store.logger) {
    store.logger = new ConsoleLogger({ service: 'sistema-sel' });
  }
  return store.logger;
}

/** Apenas para testes unitários. */
export function setLoggerForTests(logger: LoggerPort | null) {
  const store = getGlobalStore();
  store.logger = logger ?? undefined;
}
