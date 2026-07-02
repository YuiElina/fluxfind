import { FluxStorage } from './storage';
import { FluxLogger } from './logger';

export interface Atom<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: (value: T) => void) => () => void;
}

export function createAtom<T>(key: string, defaultValue: T): Atom<T> {
  let value: T = defaultValue;
  const raw = FluxStorage.get(key);
  if (raw !== null) {
    try { value = JSON.parse(raw) as T; } catch { /* keep default */ }
  }

  const listeners = new Set<(v: T) => void>();

  const atom: Atom<T> = {
    get(): T { return value; },
    set(next: T): void {
      if (value === next) return;
      value = next;
      FluxStorage.setJSON(key, next);
      listeners.forEach(fn => { try { fn(next); } catch (e) { FluxLogger.error('StateManager', `Subscriber error: ${String(e)}`); } });
    },
    subscribe(fn: (v: T) => void): () => void {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
  };

  return atom;
}