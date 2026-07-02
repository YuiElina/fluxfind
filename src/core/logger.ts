import type { LogLevel } from '../types/storage';

type LoggerModule = 'App' | 'Thumbnails' | 'GamesAPI' | 'Geolocation' | 'ServerBrowser' | 'RegionFilter' | 'AdRemover' | 'Settings' | 'Router' | 'HTTP' | 'SmartSearch' | 'General';

const timers = new Map<string, number>();

export const FluxLogger = ((): {
  init: () => void;
  debug: (mod: LoggerModule, msg: string, ...args: unknown[]) => void;
  info: (mod: LoggerModule, msg: string, ...args: unknown[]) => void;
  warn: (mod: LoggerModule, msg: string, ...args: unknown[]) => void;
  error: (mod: LoggerModule, msg: string, ...args: unknown[]) => void;
  timeStart: (label: string) => void;
  timeEnd: (label: string, mod?: LoggerModule) => number;
  group: (mod: LoggerModule, label: string) => void;
  groupEnd: () => void;
} => {
  'use strict';

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

  const CONSOLE_METHOD: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error'> = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
  };

  function prefix(): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `[FLUXFIND] [${hh}:${mm}:${ss}.${ms}]`;
  }

  function shouldLog(threshold: LogLevel): boolean {
    return enabled && LEVEL_PRIORITY[threshold] >= LEVEL_PRIORITY[level];
  }

  function log(threshold: LogLevel, mod: LoggerModule, msg: string, ...args: unknown[]): void {
    if (!shouldLog(threshold)) return;

    const fullPrefix = `${prefix()} [${mod}]`;
    const method = CONSOLE_METHOD[threshold];
    const style = STYLES[threshold];

    if (args.length > 0) {
      console[method](`%c${fullPrefix} ${msg}`, style, ...args);
    } else {
      console[method](`%c${fullPrefix} ${msg}`, style);
    }
  }

  function debug(mod: LoggerModule, msg: string, ...args: unknown[]): void {
    log('DEBUG', mod, msg, ...args);
  }

  function info(mod: LoggerModule, msg: string, ...args: unknown[]): void {
    log('INFO', mod, msg, ...args);
  }

  function warn(mod: LoggerModule, msg: string, ...args: unknown[]): void {
    log('WARN', mod, msg, ...args);
  }

  function error(mod: LoggerModule, msg: string, ...args: unknown[]): void {
    log('ERROR', mod, msg, ...args);
  }

  function timeStart(label: string): void {
    timers.set(label, performance.now());
  }

  function timeEnd(label: string, mod: LoggerModule = 'General'): number {
    const start = timers.get(label);
    timers.delete(label);
    if (start === undefined) return 0;
    const elapsed = Math.round((performance.now() - start) * 100) / 100;
    log('DEBUG', mod, `⏱ ${label}: ${String(elapsed)}ms`);
    return elapsed;
  }

  function group(mod: LoggerModule, label: string): void {
    if (!enabled) return;
    console.group(`%c${prefix()} [${mod}] ${label}`, 'color: #9C27B0; font-weight: bold');
  }

  function groupEnd(): void {
    if (!enabled) return;
    console.groupEnd();
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

  return { init, debug, info, warn, error, timeStart, timeEnd, group, groupEnd };
})();