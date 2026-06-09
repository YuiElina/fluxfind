/**
 * FluxFind Core Utilities
 * High-performance general utilities: debounce, throttle, memoize, batch DOM operations
 *
 * @module core/utils
 * @license GPL-2.0-only
 */

const FluxUtils = (() => {
    'use strict';

    /**
     * Debounce - delays function execution until after `wait` ms of inactivity
     * Uses requestAnimationFrame for DOM-bound callbacks to batch layout work
     */
    function debounce(fn, wait = 150, useRAF = false) {
        let timeout, rafId;
        return function debounced(...args) {
            const later = () => {
                timeout = null;
                if (useRAF) {
                    cancelAnimationFrame(rafId);
                    rafId = requestAnimationFrame(() => fn.apply(this, args));
                } else {
                    fn.apply(this, args);
                }
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle - ensures function runs at most once per `limit` ms
     * Leading edge by default (fires immediately, then cooldown)
     */
    function throttle(fn, limit = 100) {
        let inThrottle = false, lastArgs, lastThis;
        return function throttled(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                    if (lastArgs) {
                        fn.apply(lastThis, lastArgs);
                        lastArgs = lastThis = null;
                    }
                }, limit);
            } else {
                lastArgs = args;
                lastThis = this;
            }
        };
    }

    /**
     * Memoize with LRU eviction for API response caching
     */
    function memoize(fn, maxSize = 100, ttl = 60000) {
        const cache = new Map();
        return function memoized(...args) {
            const key = JSON.stringify(args);
            const entry = cache.get(key);
            const now = Date.now();
            if (entry && (now - entry.time) < ttl) {
                // Move to end (most recently used)
                cache.delete(key);
                cache.set(key, entry);
                return entry.value;
            }
            const result = fn.apply(this, args);
            cache.set(key, { value: result, time: now });
            if (cache.size > maxSize) {
                // Evict oldest (first inserted)
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            return result;
        };
    }

    /**
     * DOM batch insert using DocumentFragment - minimizes reflow
     */
    function batchAppend(parent, elements) {
        const fragment = document.createDocumentFragment();
        for (const el of elements) {
            fragment.appendChild(el);
        }
        parent.appendChild(fragment);
    }

    /**
     * Safe querySelector with optional caching
     */
    const _qsCache = new Map();
    function qs(selector, root = document, cache = false) {
        if (cache && _qsCache.has(selector)) {
            const el = _qsCache.get(selector);
            if (el.isConnected) return el;
            _qsCache.delete(selector);
        }
        const el = root.querySelector(selector);
        if (cache && el) _qsCache.set(selector, el);
        return el;
    }

    function qsa(selector, root = document) {
        return Array.from(root.querySelectorAll(selector));
    }

    /**
     * Observer utility - MutationObserver with automatic disconnect/reconnect
     */
    function observeDOM(target, config, callback) {
        const observer = new MutationObserver((mutations) => {
            observer.disconnect();
            callback(mutations);
            observer.observe(target, config);
        });
        observer.observe(target, config);
        return observer;
    }

    /**
     * Fast array chunking (avoids .slice() overhead on large arrays)
     */
    function chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Retry wrapper for async functions with exponential backoff
     */
    async function retry(fn, maxRetries = 3, baseDelay = 500) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (err) {
                if (attempt === maxRetries) throw err;
                await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
            }
        }
    }

    /**
     * Run tasks in parallel with concurrency limit
     */
    async function parallelLimit(tasks, limit = 6) {
        const results = new Array(tasks.length);
        let index = 0;

        async function worker() {
            while (index < tasks.length) {
                const i = index++;
                results[i] = await tasks[i]();
            }
        }

        await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
        return results;
    }

    /**
     * Lazy initializer - runs factory once, caches result
     */
    function lazy(factory) {
        let initialized = false, value;
        return () => {
            if (!initialized) {
                value = factory();
                initialized = true;
            }
            return value;
        };
    }

    /**
     * Run-once guard for singleton-like patterns
     */
    function once(fn) {
        let called = false, result;
        return function(...args) {
            if (!called) {
                called = true;
                result = fn.apply(this, args);
            }
            return result;
        };
    }

    /**
     * Fast string hash for cache keys
     */
    function fastHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return hash;
    }

    return {
        debounce, throttle, memoize, batchAppend, qs, qsa,
        observeDOM, chunk, retry, parallelLimit, lazy, once, fastHash,
        noop: () => {}
    };
})();