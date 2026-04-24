import type { LoggerPort, LogLevel } from '@/lib/ports/logger.port';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(current: LogLevel, min: LogLevel): boolean {
  return LEVEL_ORDER[current] >= LEVEL_ORDER[min];
}

function parseMinLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function serialize(bindings: Record<string, unknown>, message: string, meta?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    ...bindings,
    message,
    ...meta,
  };
  return JSON.stringify(payload);
}

export class ConsoleLogger implements LoggerPort {
  readonly level: LogLevel;

  constructor(
    private readonly bindings: Record<string, unknown> = {},
    minLevel?: LogLevel
  ) {
    this.level = minLevel ?? parseMinLevel();
  }

  child(bindings: Record<string, unknown>): LoggerPort {
    return new ConsoleLogger({ ...this.bindings, ...bindings }, this.level);
  }

  private emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (!shouldLog(level, this.level)) return;

    const line = serialize(this.bindings, message, meta);
    switch (level) {
      case 'debug':
        console.debug(line);
        break;
      case 'info':
        console.info(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      case 'error':
        console.error(line);
        break;
      default:
        console.log(line);
    }
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.emit('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.emit('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.emit('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.emit('error', message, meta);
  }
}
