type Fn = (...args: unknown[]) => unknown;

export const FluxUtils = ((): {
  debounce: <T extends Fn>(fn: T, wait?: number, useRAF?: boolean) => (...args: Parameters<T>) => void;
  throttle: <T extends Fn>(fn: T, limit?: number) => (...args: Parameters<T>) => void;
  memoize: <T extends Fn>(fn: T, maxSize?: number, ttl?: number) => (...args: Parameters<T>) => ReturnType<T>;
  batchAppend: (parent: HTMLElement, elements: Node[]) => void;
  qs: (selector: string, root?: Document | Element) => Element | null;
  qsa: (selector: string, root?: Document | Element) => Element[];
  chunk: <T>(array: T[], size: number) => T[][];
  retry: <T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number) => Promise<T>;
  parallelLimit: <T>(tasks: (() => Promise<T>)[], limit?: number) => Promise<T[]>;
  fastHash: (str: string) => number;
  watchForChild: (parentSelector: string, childSelector: string, timeout?: number) => Promise<Element>;
  noop: () => void;
} => {
  'use strict';

  function debounce<T extends Fn>(fn: T, wait = 150, useRAF = false): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let rafId: number | undefined;
    return (...args: Parameters<T>): void => {
      const later = (): void => {
        timeout = undefined;
        if (useRAF) {
          if (rafId !== undefined) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => { fn(...args); });
        } else {
          fn(...args);
        }
      };
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function throttle<T extends Fn>(fn: T, limit = 100): (...args: Parameters<T>) => void {
    let inThrottle = false;
    let lastArgs: Parameters<T> | undefined;
    return (...args: Parameters<T>): void => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          if (lastArgs !== undefined) {
            fn(...lastArgs);
            lastArgs = undefined;
          }
        }, limit);
      } else {
        lastArgs = args;
      }
    };
  }

  function memoize<T extends Fn>(fn: T, maxSize = 100, ttl = 60000): (...args: Parameters<T>) => ReturnType<T> {
    const cache = new Map<string, { value: ReturnType<T>; time: number }>();
    return (...args: Parameters<T>): ReturnType<T> => {
      const key = JSON.stringify(args);
      const entry = cache.get(key);
      const now = Date.now();
      if (entry !== undefined && (now - entry.time) < ttl) {
        cache.delete(key);
        cache.set(key, entry);
        return entry.value;
      }
      const result = fn(...args) as ReturnType<T>;
      cache.set(key, { value: result, time: now });
      if (cache.size > maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) cache.delete(firstKey);
      }
      return result;
    };
  }

  function batchAppend(parent: HTMLElement, elements: Node[]): void {
    const fragment = document.createDocumentFragment();
    for (const el of elements) {
      fragment.appendChild(el);
    }
    parent.appendChild(fragment);
  }

  function qs(selector: string, root: Document | Element = document): Element | null {
    return root.querySelector(selector);
  }

  function qsa(selector: string, root: Document | Element = document): Element[] {
    return Array.from(root.querySelectorAll(selector));
  }

  function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async function retry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 500): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
      }
    }
    throw new Error('unreachable');
  }

  async function parallelLimit<T>(tasks: (() => Promise<T>)[], limit = 6): Promise<T[]> {
    const results: T[] = new Array<T>(tasks.length);
    let index = 0;
    const worker = async (): Promise<void> => {
      while (index < tasks.length) {
        const i = index++;
        const task = tasks[i];
        if (task !== undefined) {
          results[i] = await task();
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
    return results;
  }

  function fastHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash;
  }

  function watchForChild(
    parentSelector: string,
    childSelector: string,
    timeout = 30000
  ): Promise<Element> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(childSelector);
      if (existing !== null) {
        resolve(existing);
        return;
      }

      const parent = document.querySelector(parentSelector);
      if (parent === null) {
        reject(new Error('Parent not found: ' + parentSelector));
        return;
      }

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node instanceof Element) {
                if (node.matches(childSelector)) {
                  observer.disconnect();
                  clearTimeout(timer);
                  resolve(node);
                  return;
                }
                const found = node.querySelector(childSelector);
                if (found !== null) {
                  observer.disconnect();
                  clearTimeout(timer);
                  resolve(found);
                  return;
                }
              }
            }
          }
        }
      });

      observer.observe(parent, { childList: true, subtree: false });

      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error('Timeout waiting for child: ' + childSelector));
      }, timeout);
    });
  }

  function noop(): void { /* no-op */ }

  return {
    debounce, throttle, memoize, batchAppend, qs, qsa,
    chunk, retry, parallelLimit, fastHash, watchForChild, noop,
  };
})();