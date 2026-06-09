/**
 * FluxFind Core Utilities
 * High-performance general utilities: debounce, throttle, memoize, batch DOM, MutationObserver helpers
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

    /**
     * Watch a parent element for a child matching childSelector to appear.
     * Uses childList-only observer on the parent — much faster than subtree:true on body.
     * Returns a Promise that resolves with the child element.
     * @param {string} parentSelector - The parent element to watch (e.g. '#game-instances')
     * @param {string} childSelector  - The child to wait for (e.g. '#rbx-public-game-server-item-container')
     * @param {number} timeout        - Max wait time in ms
     */
    function watchForChild(parentSelector, childSelector, timeout = 30000) {
        return new Promise((resolve, reject) => {
            // First: check if already present (fast path)
            const existing = document.querySelector(childSelector);
            if (existing) { FluxLogger.info('watchForChild: already present: ' + childSelector); return resolve(existing); }

            // Find the parent
            const parent = document.querySelector(parentSelector);
            if (!parent) {
                FluxLogger.info('watchForChild: parent not found: ' + parentSelector);
                return reject(new Error('Parent not found: ' + parentSelector));
            }

            FluxLogger.info('watchForChild: observing parent ' + parentSelector + ' for child ' + childSelector);

            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        // Check added nodes
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === 1) {
                                if (node.matches && node.matches(childSelector)) {
                                    observer.disconnect();
                                    clearTimeout(timer);
                                    resolve(node);
                                    return;
                                }
                                if (node.querySelector && node.querySelector(childSelector)) {
                                    observer.disconnect();
                                    clearTimeout(timer);
                                    resolve(node.querySelector(childSelector));
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
                FluxLogger.info('watchForChild: timeout waiting for ' + childSelector);
                reject(new Error('Timeout waiting for child: ' + childSelector));
            }, timeout);
        });
    }

    /**
     * Watch a parent for a child to be REMOVED (like chat-container).
     */
    function watchForChildRemoval(parentSelector, childSelector, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(childSelector);
            if (!existing) { return resolve(); } // Already gone

            const parent = existing.parentNode;
            if (!parent) { return resolve(); }

            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        for (const node of mutation.removedNodes) {
                            if (node.nodeType === 1 && (node.matches && node.matches(childSelector) || node.querySelector && node.querySelector(childSelector))) {
                                observer.disconnect();
                                clearTimeout(timer);
                                resolve();
                                return;
                            }
                        }
                    }
                }
            });

            observer.observe(parent, { childList: true, subtree: false });

            const timer = setTimeout(() => {
                observer.disconnect();
                reject(new Error('Timeout waiting for removal: ' + childSelector));
            }, timeout);
        });
    }

    return {
        debounce, throttle, memoize, batchAppend, qs, qsa,
        chunk, retry, parallelLimit, lazy, once, fastHash,
        watchForChild, watchForChildRemoval,
        noop: () => {}
    };
})();