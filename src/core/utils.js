/**
 * FluxFind Core Utilities
 * High-performance general utilities: debounce, throttle, memoize, batch DOM operations, waitForElement
 *
 * @module core/utils
 * @license GPL-2.0-only
 */

const FluxUtils = (() => {
    'use strict';

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

    function memoize(fn, maxSize = 100, ttl = 60000) {
        const cache = new Map();
        return function memoized(...args) {
            const key = JSON.stringify(args);
            const entry = cache.get(key);
            const now = Date.now();
            if (entry && (now - entry.time) < ttl) {
                cache.delete(key);
                cache.set(key, entry);
                return entry.value;
            }
            const result = fn.apply(this, args);
            cache.set(key, { value: result, time: now });
            if (cache.size > maxSize) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            return result;
        };
    }

    function batchAppend(parent, elements) {
        const fragment = document.createDocumentFragment();
        for (const el of elements) {
            fragment.appendChild(el);
        }
        parent.appendChild(fragment);
    }

    const _qsCache = new Map();
    function qs(selector, root = document, cache = false) {
        if (cache && _qsCache.has(selector)) {
            const el = _qsCache.get(selector);
            if (el && el.isConnected) return el;
            _qsCache.delete(selector);
        }
        const el = root.querySelector(selector);
        if (cache && el) _qsCache.set(selector, el);
        return el;
    }

    function qsa(selector, root = document) {
        return Array.from(root.querySelectorAll(selector));
    }

    function observeDOM(target, config, callback) {
        const observer = new MutationObserver((mutations) => {
            observer.disconnect();
            callback(mutations);
            observer.observe(target, config);
        });
        observer.observe(target, config);
        return observer;
    }

    function chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

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

    function lazy(factory) {
        let initialized = false, value;
        return () => {
            if (!initialized) { value = factory(); initialized = true; }
            return value;
        };
    }

    function once(fn) {
        let called = false, result;
        return function(...args) {
            if (!called) { called = true; result = fn.apply(this, args); }
            return result;
        };
    }

    function fastHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return hash;
    }

    /** Wait for a DOM element matching selector to appear, with timeout */
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const found = document.querySelector(selector);
            if (found) return resolve(found);

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) { observer.disconnect(); clearTimeout(timer); resolve(el); }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            const timer = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for: ${selector}`));
            }, timeout);
        });
    }

    return {
        debounce, throttle, memoize, batchAppend, qs, qsa,
        observeDOM, chunk, retry, parallelLimit, lazy, once, fastHash,
        waitForElement,
        noop: () => {}
    };
})();