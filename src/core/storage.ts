export const FluxStorage = ((): {
  get: (name: string) => string | null;
  getJSON: <T>(name: string, defaultValue: T) => T;
  getBool: (name: string, defaultValue?: boolean) => boolean;
  getNumber: (name: string, defaultValue?: number) => number;
  set: (name: string, value: string | number | boolean) => boolean;
  setJSON: (name: string, value: unknown) => boolean;
  setBool: (name: string, value: boolean) => boolean;
  remove: (name: string) => boolean;
  listKeys: () => string[];
  has: (name: string) => boolean;
  initDefaults: (defaults: Record<string, unknown>) => void;
  migrateLegacy: () => number;
  key: (name: string) => string;
} => {
  'use strict';

  const PREFIX = 'FLUXFIND_';

  function k(name: string): string {
    return PREFIX + name;
  }

  function get(name: string): string | null {
    const key = k(name);
    try {
      if (typeof GM_getValue !== 'undefined') {
        const saved = GM_getValue(key);
        if (saved !== undefined && saved !== null) return saved as string;
      }
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function getJSON<T>(name: string, defaultValue: T): T {
    const raw = get(name);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  function getBool(name: string, defaultValue = false): boolean {
    const raw = get(name);
    if (raw === null) return defaultValue;
    return raw === 'true';
  }

  function getNumber(name: string, defaultValue = 0): number {
    const raw = get(name);
    if (raw === null) return defaultValue;
    const num = Number(raw);
    return isNaN(num) ? defaultValue : num;
  }

  function set(name: string, value: string | number | boolean): boolean {
    const key = k(name);
    const str = String(value);
    try {
      if (typeof GM_setValue !== 'undefined') {
        GM_setValue(key, str);
      }
      localStorage.setItem(key, str);
      return true;
    } catch {
      return false;
    }
  }

  function setJSON(name: string, value: unknown): boolean {
    return set(name, JSON.stringify(value));
  }

  function setBool(name: string, value: boolean): boolean {
    return set(name, value ? 'true' : 'false');
  }

  function remove(name: string): boolean {
    const key = k(name);
    try {
      if (typeof GM_deleteValue !== 'undefined') {
        GM_deleteValue(key);
      }
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function listKeys(): string[] {
    const keys: string[] = [];
    const prefixLen = PREFIX.length;
    try {
      if (typeof GM_listValues !== 'undefined') {
        const all = GM_listValues();
        for (const key of all) {
          if (key.startsWith(PREFIX)) keys.push(key.slice(prefixLen));
        }
        return keys;
      }
    } catch { /* fallback */ }
    for (let i = 0; i < localStorage.length; i++) {
      const keyName = localStorage.key(i);
      if (keyName?.startsWith(PREFIX) === true) {
        keys.push(keyName.slice(prefixLen));
      }
    }
    return keys;
  }

  function has(name: string): boolean {
    const key = k(name);
    try {
      if (typeof GM_getValue !== 'undefined') {
        return GM_getValue(key) !== undefined;
      }
    } catch { /* fallback */ }
    return localStorage.getItem(key) !== null;
  }

  function initDefaults(defaults: Record<string, unknown>): void {
    for (const [prop, value] of Object.entries(defaults)) {
      if (!has(prop)) {
        if (typeof value === 'boolean') {
          setBool(prop, value);
        } else if (typeof value === 'object' && value !== null) {
          setJSON(prop, value);
        } else {
          set(prop, value as string | number | boolean);
        }
      }
    }
  }

  function migrateLegacy(): number {
    const migrated = getBool('_legacy_migrated');
    if (migrated) return 0;

    let count = 0;
    const migrationMap: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const keyName = localStorage.key(i);
      if (keyName?.startsWith('ROLOCATE_') === true) {
        const newName = keyName.slice('ROLOCATE_'.length).toLowerCase();
        migrationMap[keyName] = newName;
      }
    }

    for (const [oldKey, newName] of Object.entries(migrationMap)) {
      const value = localStorage.getItem(oldKey);
      set(newName, value ?? '');
      localStorage.removeItem(oldKey);
      count++;
    }

    setBool('_legacy_migrated', true);
    return count;
  }

  return {
    get, getJSON, getBool, getNumber,
    set, setJSON, setBool, remove,
    listKeys, has, initDefaults,
    migrateLegacy, key: k,
  };
})();