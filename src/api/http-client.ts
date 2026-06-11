/**
 * FluxFind HTTP Client Module
 * High-performance request layer with caching, retry, rate-limit handling, and batch support
 *
 * @module api/http-client
 * @license GPL-2.0-only
 */

import { FluxUtils } from '../core/utils';
import { FluxConstants } from '../config/constants';

interface RequestOptions {
  cache?: boolean;
  retries?: number;
  headers?: Record<string, string>;
}

interface BatchRequest {
  url: string;
  params: Record<string, string>;
}

export const FluxHttpClient = ((): {
  get: (url: string, params?: Record<string, string>, options?: RequestOptions) => Promise<unknown>;
  post: (url: string, body: unknown, options?: RequestOptions) => Promise<unknown>;
  batchGet: (requests: BatchRequest[], options?: { cache?: boolean; concurrency?: number }) => Promise<unknown[]>;
  clearCache: () => void;
} => {
  'use strict';

  const CACHE = new Map<number, { data: unknown; t: number }>();
  const CACHE_TTL = 30000;
  const MAX_CACHE_ENTRIES = 200;

  function cacheKey(url: string): number {
    return FluxUtils.fastHash(url);
  }

  function cacheGet(url: string): unknown {
    const hash = cacheKey(url);
    const entry = CACHE.get(hash);
    if (entry !== undefined && (Date.now() - entry.t) < CACHE_TTL) {
      return entry.data;
    }
    if (entry !== undefined) CACHE.delete(hash);
    return undefined;
  }

  function cacheSet(url: string, data: unknown): void {
    const hash = cacheKey(url);
    CACHE.set(hash, { data, t: Date.now() });
    if (CACHE.size > MAX_CACHE_ENTRIES) {
      const first = CACHE.keys().next().value;
      if (first !== undefined) CACHE.delete(first);
    }
  }

  function buildUrl(base: string, params: Record<string, string> = {}): string {
    const url = new URL(base);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return url.toString();
  }

  async function get(url: string, params: Record<string, string> = {}, options: RequestOptions = {}): Promise<unknown> {
    const { cache = false, retries = FluxConstants.RETRY.MAX_RETRIES, headers = {} } = options;
    const fullUrl = buildUrl(url, params);

    if (cache) {
      const cached = cacheGet(fullUrl);
      if (cached !== undefined) return cached;
    }

    const data = await _requestWithRetry('GET', fullUrl, null, {
      ...headers,
      'Accept': 'application/json',
    }, retries);

    if (cache) cacheSet(fullUrl, data);
    return data;
  }

  async function post(url: string, body: unknown, options: RequestOptions = {}): Promise<unknown> {
    const { retries = FluxConstants.RETRY.MAX_RETRIES, headers = {} } = options;
    return _requestWithRetry('POST', url, body, {
      ...headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }, retries);
  }

  function _requestWithRetry(method: string, url: string, body: unknown, headers: Record<string, string>, maxRetries: number): Promise<unknown> {
    return FluxUtils.retry(() => _doRequest(method, url, body, headers), maxRetries, FluxConstants.RETRY.BASE_DELAY);
  }

  function _doRequest(method: string, url: string, body: unknown, headers: Record<string, string>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest === 'undefined') {
        const fetchOptions: RequestInit = {
          method,
          headers,
          credentials: 'include',
        };
        if (body !== null) fetchOptions.body = JSON.stringify(body);

        void fetch(url, fetchOptions)
          .then(response => {
            if (response.status === 429) {
              reject(new Error('RATE_LIMITED'));
            } else if (!response.ok) {
              reject(new Error(`HTTP ${String(response.status)}`));
            } else {
              return response.json() as Promise<unknown>;
            }
            return undefined;
          })
          .then(data => { if (data !== undefined) resolve(data); })
          .catch((err: unknown) => {
            if (err instanceof Error && err.message === 'RATE_LIMITED') reject(err);
            else reject(new Error('Network error'));
          });
        return;
      }

      const requestConfig: GM_XHRDetails = {
        method: method as 'GET' | 'POST',
        url,
        headers,
        anonymous: false,
        timeout: 15000,
        onload: function (response: GM_XHRResponse) {
          if (response.status === 429) {
            reject(new Error('RATE_LIMITED'));
            return;
          }
          if (response.status >= 200 && response.status < 300) {
            try {
              resolve(JSON.parse(response.responseText) as unknown);
            } catch {
              resolve(response.responseText);
            }
          } else {
            reject(new Error(`HTTP ${String(response.status)}`));
          }
        },
        onerror: function () {
          reject(new Error('Network error'));
        },
        ontimeout: function () {
          reject(new Error('Timeout'));
        },
      };

      if (body !== null) {
        requestConfig.data = JSON.stringify(body);
      }

      GM_xmlhttpRequest(requestConfig);
    });
  }

  async function batchGet(requests: BatchRequest[], options: { cache?: boolean; concurrency?: number } = {}): Promise<unknown[]> {
    const { cache = false, concurrency = 6 } = options;
    const tasks = requests.map(r => (): Promise<unknown> => get(r.url, r.params, { cache }));
    return FluxUtils.parallelLimit(tasks, concurrency);
  }

  function clearCache(): void {
    CACHE.clear();
  }

  return { get, post, batchGet, clearCache };
})();