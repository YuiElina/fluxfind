import type { LogLevel } from '../types/storage';

export const FluxLogger = ((): {
  init: () => void;
  debug: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
} => {
  let enabled = false;
  let level: LogLevel = 'INFO';

  const LEVEL_PRIORITY: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  const STYLES: Record<LogLevel, string> = {
    DEBUG: 'color: #888',
    INFO: 'color: #2196F3',
    WARN: 'color: #FF9800; font-weight: bold',
    ERROR: 'color: #F44336; font-weight: bold',
  };

  function prefix(): string {
    const ts = new Date().toISOString().slice(11, 23);
    return `[FLUXFIND] [${ts}]`;
  }

  function shouldLog(threshold: LogLevel): boolean {
    return enabled && LEVEL_PRIORITY[threshold] >= LEVEL_PRIORITY[level];
  }

  function debug(msg: string, ...args: unknown[]): void {
    if (!shouldLog('DEBUG')) return;
    console.debug('%c' + prefix() + ' ' + msg, STYLES.DEBUG, ...args);
  }

  function info(msg: string, ...args: unknown[]): void {
    if (!shouldLog('INFO')) return;
    console.info('%c' + prefix() + ' ' + msg, STYLES.INFO, ...args);
  }

  function warn(msg: string, ...args: unknown[]): void {
    if (!shouldLog('WARN')) return;
    console.warn('%c' + prefix() + ' ' + msg, STYLES.WARN, ...args);
  }

  function error(msg: string, ...args: unknown[]): void {
    if (!shouldLog('ERROR')) return;
    console.error('%c' + prefix() + ' ' + msg, STYLES.ERROR, ...args);
  }

  function init(): void {
    try {
      enabled = typeof GM_getValue !== 'undefined'
        ? String(GM_getValue('FLUXFIND_enableLogs', 'false')) === 'true'
        : localStorage.getItem('FLUXFIND_enableLogs') === 'true';

      const rawLevel = (typeof GM_getValue !== 'undefined'
        ? GM_getValue('FLUXFIND_logLevel', 'INFO')
        : localStorage.getItem('FLUXFIND_logLevel')) ?? 'INFO';

      if (typeof rawLevel === 'string' && rawLevel in LEVEL_PRIORITY) {
        level = rawLevel as LogLevel;
      }
    } catch {
      // use defaults
    }
  }

  return { init, debug, info, warn, error };
})();