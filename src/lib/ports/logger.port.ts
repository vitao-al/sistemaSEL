/**
 * Porta de logging: agnóstica ao provedor (console, OpenTelemetry, Pino, etc.).
 * Implementações em `src/lib/infrastructure/logging/`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerPort {
  readonly level: LogLevel;
  child(bindings: Record<string, unknown>): LoggerPort;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
