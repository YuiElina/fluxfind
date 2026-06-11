// ==UserScript==
// @name         FluxFind
// @namespace    https://github.com/YuiElina/fluxfind/
// @version      1.0.0
// @description  Enhanced Roblox server browser with filtering, region detection, smart search, and quality-of-life improvements. Free and open source alternative to paid extensions.
// @author       YuiElina
// @match        https://www.roblox.com/*
// @license      GPL-2.0-only
// @icon         https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/search.svg
// @supportURL   https://github.com/YuiElina/fluxfind
// @downloadURL  https://raw.githubusercontent.com/YuiElina/fluxfind/main/fluxfind.user.js
// @updateURL    https://raw.githubusercontent.com/YuiElina/fluxfind/main/fluxfind.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_deleteValue
// @connect      thumbnails.roblox.com
// @connect      games.roblox.com
// @connect      gamejoin.roblox.com
// @connect      presence.roblox.com
// @connect      www.roblox.com
// @connect      friends.roblox.com
// @connect      apis.roblox.com
// @connect      groups.roblox.com
// @connect      users.roblox.com
// @connect      catalog.roblox.com
// @connect      ip-api.com
// ==/UserScript==

/**
 * FluxFind - Enhanced Roblox Server Browser & Utility Suite
 * Copyright (C) 2026  FluxFind Contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Built from modular source. See build.js for module list.
 * CSS compiled from src/ui/css/*.css
 * Source: https://github.com/fluxfind/fluxfind
 */


// ====== MODULE: utils (src/core/utils.js) ======
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

// ====== MODULE: sanitizer (src/core/sanitizer.js) ======
/**
 * FluxFind Sanitizer Module
 * XSS protection, input validation, and safe DOM injection
 *
 * @module core/sanitizer
 * @license GPL-2.0-only
 */

const FluxSanitizer = (() => {
    'use strict';

    const HTML_ENTITIES = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    /**
     * Escape HTML to prevent XSS injection
     */
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[&<>"'`=\/]/g, char => HTML_ENTITIES[char] || char);
    }

    /**
     * Sanitize user ID (positive integer only)
     */
    function sanitizeUserId(id) {
        const num = parseInt(id, 10);
        return (!isNaN(num) && num > 0 && num < Number.MAX_SAFE_INTEGER) ? num : 0;
    }

    /**
     * Sanitize a generic attribute value
     */
    function sanitizeAttribute(str) {
        return String(str).replace(/[&<>"'`]/g, char => HTML_ENTITIES[char] || char);
    }

    /**
     * Validate hex color string (#RGB or #RRGGBB)
     */
    function sanitizeColor(color) {
        return /^#[0-9A-Fa-f]{3,8}$/.test(color) ? color : '#ffffff';
    }

    /**
     * Validate CSS color value (hex, rgb, rgba, named colors)
     */
    function sanitizeCssColor(value) {
        const cssColorPattern = /^(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)$/;
        return cssColorPattern.test(value) ? value : 'rgba(40,40,40,0.85)';
    }

    /**
     * Escape CSS string for use in style attributes
     */
    function escapeCssString(str) {
        return String(str).replace(/[\\"';&!]/g, '\\$&');
    }

    /**
     * Safe innerHTML setter - sanitizes first
     */
    function safeInnerHTML(element, html) {
        element.innerHTML = '';
        if (typeof html !== 'string') return;
        const sanitized = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<(\w+)\s+on\w+\s*=\s*["'][^"']*["']/gi, '<$1');
        element.innerHTML = sanitized;
    }

    /**
     * Validate URL - only allow http/https/data protocols
     */
    function sanitizeUrl(url) {
        if (typeof url !== 'string') return '';
        const trimmed = url.trim();
        if (/^(https?:|data:image\/)/i.test(trimmed)) {
            return trimmed;
        }
        return '';
    }

    /**
     * Truncate text safely to max length
     */
    function truncate(text, maxLen = 200) {
        const str = String(text);
        return str.length > maxLen ? str.slice(0, maxLen) + '\u2026' : str;
    }

    /**
     * Validate that value is a plain object (not array, not null)
     */
    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    return {
        escapeHtml,
        sanitizeUserId,
        sanitizeAttribute,
        sanitizeColor,
        sanitizeCssColor,
        escapeCssString,
        safeInnerHTML,
        sanitizeUrl,
        truncate,
        isPlainObject
    };
})();

// ====== MODULE: logger (src/core/logger.js) ======
/**
 * FluxFind Logger Module
 * Performance-conscious console logging with circular buffer and log levels
 * Always uses console.log (never debug) for maximum browser compatibility
 *
 * @module core/logger
 * @license GPL-2.0-only
 */

const FluxLogger = (() => {
    'use strict';

    const MAX_ENTRIES = 500;
    const PREFIX = '[FLUXFIND]';
    let logEnabled = true;           // CHANGED: default true so info() always visible
    let logBuffer = [];
    let bufferSize = 0;
    const MAX_BUFFER_BYTES = 512 * 1024;

    const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 };
    let currentLevel = LEVELS.INFO;  // CHANGED: default INFO

    function init() {
        logEnabled = localStorage.getItem('FLUXFIND_enableLogs') !== 'false';  // CHANGED: default ON
        const savedLevel = localStorage.getItem('FLUXFIND_logLevel');
        if (savedLevel && LEVELS[savedLevel] !== undefined) {
            currentLevel = LEVELS[savedLevel];
        }
    }

    function _shouldLog(level) {
        return logEnabled && LEVELS[level] >= currentLevel;
    }

    function _serialize(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
            try { return JSON.stringify(arg); } catch { return '[Object]'; }
        }
        return String(arg);
    }

    function _pushBuffer(level, args) {
        const msg = args.map(_serialize).join(' ');
        const entry = { t: Date.now(), l: level, m: msg };
        const size = msg.length + 50;
        logBuffer.push(entry);
        bufferSize += size;
        while (bufferSize > MAX_BUFFER_BYTES || logBuffer.length > MAX_ENTRIES) {
            const removed = logBuffer.shift();
            bufferSize -= (removed.m.length + 50);
        }
    }

    function _formatAndLog(level, consoleMethod, fallback, args) {
        if (!_shouldLog(level)) return;
        const timestamp = new Date().toISOString().slice(11, 23);
        try {
            // Use console.log for everything for max browser compat
            if (level === 'ERROR') console.error(PREFIX, `[${timestamp}]`, ...args);
            else if (level === 'WARN') console.warn(PREFIX, `[${timestamp}]`, ...args);
            else console.log(PREFIX, `[${timestamp}]`, ...args);
        } catch (e) {
            // Fallback: just log
            console.log(PREFIX, `[${timestamp}]`, ...args);
        }
        _pushBuffer(level, args);
    }

    const debug = (...args) => _formatAndLog('DEBUG', console.debug, console.log, args);
    const info  = (...args) => _formatAndLog('INFO',  console.info,  console.log, args);
    const warn  = (...args) => _formatAndLog('WARN',  console.warn,  console.warn, args);
    const error = (...args) => _formatAndLog('ERROR', console.error, console.error, args);

    function getBuffer()    { return logBuffer.slice(); }
    function clearBuffer()  { logBuffer = [];
        bufferSize = 0; }
    function setEnabled(e) { logEnabled = !!e; }
    function setLevel(l)   { if (LEVELS[l] !== undefined) currentLevel = LEVELS[l]; }

    function ifDebug(fn) { if (_shouldLog('DEBUG')) fn(); }

    function time(label, fn) {
        if (!_shouldLog('DEBUG')) return fn();
        const start = performance.now();
        const result = fn();
        const duration = (performance.now() - start).toFixed(2);
        debug(`[TIME] ${label}: ${duration}ms`);
        return result;
    }

    async function timeAsync(label, fn) {
        if (!_shouldLog('DEBUG')) return fn();
        const start = performance.now();
        const result = await fn();
        const duration = (performance.now() - start).toFixed(2);
        debug(`[TIME] ${label}: ${duration}ms`);
        return result;
    }

    return {
        init, debug, info, warn, error,
        getBuffer, clearBuffer, setEnabled, setLevel, ifDebug, time, timeAsync, LEVELS
    };
})();

// ====== MODULE: storage (src/core/storage.js) ======
/**
 * FluxFind Storage Module
 * Unified localStorage + GM_* storage with JSON serialization, default values, and migration
 *
 * @module core/storage
 * @license GPL-2.0-only
 */

const FluxStorage = (() => {
    'use strict';

    const PREFIX = 'FLUXFIND_';

    /**
     * Build a prefixed key
     */
    function key(name) {
        return PREFIX + name;
    }

    /**
     * Get a value from localStorage (prefixed).
     * Falls back to GM_getValue if available, then defaultValue.
     */
    function get(name, defaultValue = null) {
        const k = key(name);
        try {
            // Prefer GM_getValue for cross-page persistence if available
            if (typeof GM_getValue !== 'undefined') {
                const saved = GM_getValue(k);
                if (saved !== undefined && saved !== null) return saved;
            }
            const raw = localStorage.getItem(k);
            if (raw !== null) return raw;
        } catch (e) {
            FluxLogger.warn('Storage.get failed for', name, e);
        }
        return defaultValue;
    }

    /**
     * Get a JSON-parsed value
     */
    function getJSON(name, defaultValue = null) {
        const raw = get(name);
        if (raw === null || raw === undefined) return defaultValue;
        try {
            return JSON.parse(raw);
        } catch {
            return defaultValue;
        }
    }

    /**
     * Get a boolean value (stored as 'true'/'false')
     */
    function getBool(name, defaultValue = false) {
        const raw = get(name);
        if (raw === null || raw === undefined) return defaultValue;
        return raw === 'true';
    }

    /**
     * Get a number value
     */
    function getNumber(name, defaultValue = 0) {
        const raw = get(name);
        if (raw === null || raw === undefined) return defaultValue;
        const num = Number(raw);
        return isNaN(num) ? defaultValue : num;
    }

    /**
     * Set a value. Uses GM_setValue if available, else localStorage.
     */
    function set(name, value) {
        const k = key(name);
        try {
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(k, value);
            }
            localStorage.setItem(k, value);
            return true;
        } catch (e) {
            FluxLogger.warn('Storage.set failed for', name, e);
            return false;
        }
    }

    /**
     * Set a JSON-serialized value
     */
    function setJSON(name, value) {
        return set(name, JSON.stringify(value));
    }

    /**
     * Set a boolean value
     */
    function setBool(name, value) {
        return set(name, value ? 'true' : 'false');
    }

    /**
     * Delete a key
     */
    function remove(name) {
        const k = key(name);
        try {
            if (typeof GM_deleteValue !== 'undefined') {
                GM_deleteValue(k);
            }
            localStorage.removeItem(k);
            return true;
        } catch (e) {
            FluxLogger.warn('Storage.remove failed for', name, e);
            return false;
        }
    }

    /**
     * List all FluxFind keys
     */
    function listKeys() {
        const keys = [];
        const prefixLen = PREFIX.length;
        try {
            if (typeof GM_listValues !== 'undefined') {
                const all = GM_listValues();
                for (const k of all) {
                    if (k.startsWith(PREFIX)) {
                        keys.push(k.slice(prefixLen));
                    }
                }
                return keys;
            }
        } catch { /* fallback to localStorage */ }
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(PREFIX)) {
                keys.push(k.slice(prefixLen));
            }
        }
        return keys;
    }

    /**
     * Check if a key exists
     */
    function has(name) {
        const k = key(name);
        try {
            if (typeof GM_getValue !== 'undefined') {
                return GM_getValue(k) !== undefined;
            }
        } catch { /* fallback */ }
        return localStorage.getItem(k) !== null;
    }

    /**
     * Initialize defaults - sets values only if they don't already exist
     */
    function initDefaults(defaults) {
        for (const [name, value] of Object.entries(defaults)) {
            if (!has(name)) {
                if (typeof value === 'boolean') {
                    setBool(name, value);
                } else if (typeof value === 'object') {
                    setJSON(name, value);
                } else {
                    set(name, String(value));
                }
            }
        }
    }

    /**
     * Migrate legacy RoLocate keys to FluxFind keys
     */
    function migrateLegacy() {
        const migrated = getBool('_legacy_migrated');
        if (migrated) return 0;

        let count = 0;
        const migrationMap = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('ROLOCATE_')) {
                const newName = k.slice('ROLOCATE_'.length).toLowerCase();
                migrationMap[k] = newName;
            }
        }

        for (const [oldKey, newName] of Object.entries(migrationMap)) {
            const value = localStorage.getItem(oldKey);
            set(newName, value);
            localStorage.removeItem(oldKey);
            count++;
        }

        setBool('_legacy_migrated', true);
        FluxLogger.info(`Migrated ${count} legacy settings from RoLocate to FluxFind`);
        return count;
    }

    return {
        get, getJSON, getBool, getNumber,
        set, setJSON, setBool, remove,
        listKeys, has, initDefaults,
        migrateLegacy, key
    };
})();

// ====== MODULE: dom (src/core/dom.js) ======
/**
 * FluxFind DOM Module
 * Fast DOM creation, manipulation, and style injection utilities
 *
 * @module core/dom
 * @license GPL-2.0-only
 */

const FluxDOM = (() => {
    'use strict';

    /**
     * Create an element with attributes and children in one call
     * @param {string} tag - HTML tag name
     * @param {Object} [attrs] - Attributes and properties
     * @param {...(Node|string)} children - Child nodes or text
     */
    function el(tag, attrs = {}, ...children) {
        const element = document.createElement(tag);
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'dataset' && typeof value === 'object') {
                Object.assign(element.dataset, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key === 'html') {
                element.innerHTML = value;
            } else if (key === 'text') {
                element.textContent = value;
            } else if (key === 'disabled' || key === 'checked' || key === 'selected') {
                if (value) element.setAttribute(key, '');
                else element.removeAttribute(key);
            } else {
                element.setAttribute(key, value);
            }
        }
        for (const child of children) {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            } else if (child != null) {
                element.appendChild(document.createTextNode(String(child)));
            }
        }
        return element;
    }

    /**
     * Create a DocumentFragment from an array of elements
     */
    function fragment(elements) {
        const frag = document.createDocumentFragment();
        for (const elem of elements) {
            if (elem instanceof Node) frag.appendChild(elem);
        }
        return frag;
    }

    /**
     * Inject CSS styles into the document head.
     * Returns the style element for later removal.
     */
    function injectStyle(id, css) {
        let styleEl = document.getElementById(id);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = id;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = css;
        return styleEl;
    }

    /**
     * Inject CSS once (no-op if ID already exists)
     */
    function injectStyleOnce(id, css) {
        if (document.getElementById(id)) return null;
        const styleEl = document.createElement('style');
        styleEl.id = id;
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
        return styleEl;
    }

    /**
     * Remove a previously injected style element by ID
     */
    function removeStyle(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    /**
     * Toggle a class on an element
     */
    function toggleClass(element, className, condition) {
        if (condition === undefined) {
            element.classList.toggle(className);
        } else if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }

    /**
     * Check if an element is visible in the viewport (lazy loading helper)
     */
    function isInViewport(el, margin = 0) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const vw = window.innerWidth || document.documentElement.clientWidth;
        return (
            rect.top < vh + margin &&
            rect.bottom > -margin &&
            rect.left < vw + margin &&
            rect.right > -margin
        );
    }

    /**
     * Create an IntersectionObserver that calls callback once per element
     * Useful for lazy-loading images or deferred rendering
     */
    function createLazyObserver(callback, options = {}) {
        const seen = new WeakSet();
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && !seen.has(entry.target)) {
                    seen.add(entry.target);
                    callback(entry.target);
                }
            }
        }, { rootMargin: '200px', ...options });
        return observer;
    }

    /**
     * Get computed brightness of element's background (for dark mode detection)
     */
    function getBackgroundBrightness(el = document.body) {
        const bg = getComputedStyle(el).backgroundColor;
        const rgb = bg.match(/\d+/g);
        if (!rgb || rgb.length < 3) return 255; // default light
        return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    }

    /**
     * Check if page is in dark mode
     */
    function isDarkMode() {
        const bg = getComputedStyle(document.body).backgroundColor;
        const rgb = bg.match(/\d+/g);
        if (!rgb || rgb.length < 3) return false;
        const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
        return brightness < 128;
    }

    /**
     * Set CSS custom properties on an element
     */
    function setCSSVars(element, vars) {
        for (const [prop, val] of Object.entries(vars)) {
            element.style.setProperty(`--ff-${prop}`, val);
        }
    }

    /**
     * Get the current Roblox CSRF token from the page
     */
    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('data-token') : null;
    }

    return {
        el, fragment, injectStyle, injectStyleOnce, removeStyle,
        toggleClass, isInViewport, createLazyObserver,
        getBackgroundBrightness, isDarkMode, setCSSVars,
        getCsrfToken
    };
})();

// ====== MODULE: constants (src/config/constants.js) ======
/**
 * FluxFind Configuration Constants
 * All static configuration and constants in one place
 *
 * @module config/constants
 * @license GPL-2.0-only
 */

const FluxConstants = (() => {
    'use strict';

    const VERSION = '1.0.0';

    const API = {
        ROBLOX_BASE: 'https://www.roblox.com',
        GAMES_API: 'https://games.roblox.com/v1',
        THUMBNAILS_API: 'https://thumbnails.roblox.com/v1',
        FRIENDS_API: 'https://friends.roblox.com/v1',
        USERS_API: 'https://users.roblox.com/v1',
        CATALOG_API: 'https://catalog.roblox.com/v1',
        GROUPS_API: 'https://groups.roblox.com/v1',
        JOIN_API: 'https://gamejoin.roblox.com/v1',
        PRESENCE_API: 'https://presence.roblox.com/v1'
    };

    const CHUNK_SIZES = {
        THUMBNAILS: 10,
        GAME_ICONS: 10,
        GAME_VOTES: 10,
        USER_STATS: 50,
        PLAYER_THUMBS: 50,
        GROUP_ICONS: 25,
        CATALOG_ITEMS: 25
    };

    const RETRY = {
        MAX_RETRIES: 3,
        BASE_DELAY: 500,
        RATE_LIMIT_DELAY: 250,
        MAX_DELAY: 8000
    };

    const TIMING = {
        OBSERVER_DEBOUNCE: 200,
        URL_CHECK_INTERVAL: 1500,
        SERVER_REFRESH_COOLDOWN: 2000,
        POPUP_DURATION: 3000,
        ANIMATION_DURATION: 300,
        LAZY_LOAD_MARGIN: 200
    };

    const SELECTORS = {
        SERVER_LIST: '#rbx-public-game-server-item-container, .card-list',
        SERVER_ITEM: '.rbx-public-game-server-item, .game-server-item, [role="listitem"]',
        SERVER_OPTIONS: '.server-list-options',
        SERVER_JOIN_BTN: '.rbx-public-game-server-join, .game-server-join-btn',
        SERVER_STATUS: '.rbx-game-status, .rbx-public-game-server-status, .text-overflow',
        GAME_PAGE: 'div[data-testid="game-detail-page"]',
        USER_DATA_META: 'meta[name="user-data"]',
        CSRF_META: 'meta[name="csrf-token"]',
        SEARCH_BAR: '#global-header-search'
    };

    const STORAGE_KEYS = {
        SETTINGS_PREFIX: 'FLUXFIND_',
        ENABLE_LOGS: 'enableLogs',
        LOG_LEVEL: 'logLevel',
        NOTIFICATIONS: 'enablenotifications',
        REMOVE_ADS: 'removeads',
        FILTER_SERVERS: 'togglefilterserversbutton',
        RESPONSIVE_CARDS: 'responsivegamecards',
        CUSTOM_BACKGROUNDS: 'CUSTOMBACKGROUND_settings',
        VERSION: 'version',
        DARK_MODE: 'forcedarkmode',
        LEGACY_MIGRATED: '_legacy_migrated'
    };

    const DEFAULT_SETTINGS = {
        enableLogs: false,
        logLevel: 'INFO',
        enablenotifications: true,
        removeads: true,
        togglefilterserversbutton: true,
        responsivegamecards: true,
        forcedarkmode: false,
        betterprivateservers: true,
        smartsearch: true,
        disablechat: false,
        smallerrobloxsidebar: false,
        autoserverregions: true,
        autoserverregionnumber: 16
    };

    const PRESET_CONFIGURATIONS = {
        default: { name: 'Default', settings: {} },
        minimalist: {
            name: 'Minimalist',
            settings: {
                removeads: true,
                togglefilterserversbutton: false,
                responsivegamecards: false,
                smartsearch: false
            }
        },
        powerUser: {
            name: 'Power User',
            settings: {
                enableLogs: true,
                logLevel: 'DEBUG',
                enablenotifications: true,
                removeads: true,
                smartsearch: true,
                autoserverregions: true,
                autoserverregionnumber: 32
            }
        }
    };

    const SERVER_REGIONS = {
        'us-east-1': { name: 'US East', coords: [38.9072, -77.0369] },
        'us-west-1': { name: 'US West', coords: [37.7749, -122.4194] },
        'eu-west-1': { name: 'Europe West', coords: [51.5074, -0.1278] },
        'eu-east-1': { name: 'Europe East', coords: [52.2297, 21.0122] },
        'ap-southeast-1': { name: 'Southeast Asia', coords: [1.3521, 103.8198] },
        'ap-northeast-1': { name: 'East Asia', coords: [35.6762, 139.6503] },
        'sa-east-1': { name: 'South America', coords: [-23.5505, -46.6333] },
        'au-east-1': { name: 'Australia', coords: [-33.8688, 151.2093] },
        'in-west-1': { name: 'India', coords: [19.0760, 72.8777] },
        'me-west-1': { name: 'Middle East', coords: [25.2048, 55.2708] }
    };

    /** Predefined region filter chips grouped by continent */
    const REGION_CHIPS = [
        { group: 'North America', chips: [
            { label: 'Ashburn, VA', cc: 'US' },
            { label: 'Atlanta, GA', cc: 'US' },
            { label: 'Chicago, IL', cc: 'US' },
            { label: 'Dallas, TX', cc: 'US' },
            { label: 'Los Angeles, CA', cc: 'US' },
            { label: 'Miami, FL', cc: 'US' },
            { label: 'New York / New Jersey', cc: 'US' },
            { label: 'Portland, OR', cc: 'US' },
            { label: 'San Jose / Palo Alto', cc: 'US' },
            { label: 'Washington D.C.', cc: 'US' }
        ]},
        { group: 'Europe', chips: [
            { label: 'Amsterdam', cc: 'NL' },
            { label: 'Frankfurt', cc: 'DE' },
            { label: 'London', cc: 'GB' },
            { label: 'Paris', cc: 'FR' },
            { label: 'Warsaw', cc: 'PL' }
        ]},
        { group: 'Asia', chips: [
            { label: 'Hong Kong', cc: 'HK' },
            { label: 'Mumbai', cc: 'IN' },
            { label: 'Singapore', cc: 'SG' },
            { label: 'Tokyo', cc: 'JP' }
        ]},
        { group: 'Oceania', chips: [
            { label: 'Sydney', cc: 'AU' }
        ]},
        { group: 'South America', chips: [
            { label: 'São Paulo', cc: 'BR' }
        ]}
    ];

    /**
     * Maps Roblox DataCenterId (numeric string) to our region key.
     * Based on known Roblox datacenter IDs.
     */
    const DATACENTER_REGION_MAP = {
        // US East / Ashburn
        '1': 'us-east-1', '2': 'us-east-1', '3': 'us-east-1',
        // US West
        '4': 'us-west-1', '5': 'us-west-1',
        // Europe West / London/Amsterdam
        '6': 'eu-west-1', '7': 'eu-west-1', '8': 'eu-west-1',
        // Europe East / Warsaw
        '9': 'eu-east-1',
        // Southeast Asia / Singapore
        '10': 'ap-southeast-1', '11': 'ap-southeast-1',
        // East Asia / Tokyo
        '12': 'ap-northeast-1', '13': 'ap-northeast-1',
        // South America / Sao Paulo
        '14': 'sa-east-1',
        // Australia / Sydney
        '15': 'au-east-1', '16': 'au-east-1',
        // India / Mumbai
        '17': 'in-west-1', '18': 'in-west-1',
        // Middle East / Dubai
        '19': 'me-west-1', '20': 'me-west-1'
    };

    const URL_PATTERNS = {
        GAME_PAGE: /^\/games\/(\d+)/,
        HOME_PAGE: /^(\/[a-z]{2})?\/home\/?$/i,
        PROFILE_PAGE: /^\/users\/(\d+)/,
        GROUP_PAGE: /^\/groups\/(\d+)/,
        CATALOG_PAGE: /^\/catalog\/(\d+)/,
        SEARCH_PAGE: /^\/discover/,
        SERVERS_PAGE: /games\/\d+\/.+\/servers/
    };

    return {
        VERSION,
        API, CHUNK_SIZES, RETRY, TIMING,
        SELECTORS, STORAGE_KEYS, DEFAULT_SETTINGS,
        PRESET_CONFIGURATIONS, SERVER_REGIONS, DATACENTER_REGION_MAP, URL_PATTERNS
    };
})();

// ====== MODULE: http-client (src/api/http-client.js) ======
/**
 * FluxFind HTTP Client Module
 * High-performance request layer with caching, retry, rate-limit handling, and batch support
 *
 * @module api/http-client
 * @license GPL-2.0-only
 */

const FluxHttpClient = (() => {
    'use strict';

    const CACHE = new Map();
    const CACHE_TTL = 30000; // 30s default
    const MAX_CACHE_ENTRIES = 200;

    function _cacheKey(url) {
        return FluxUtils.fastHash(url);
    }

    function _cacheGet(url) {
        const hash = _cacheKey(url);
        const entry = CACHE.get(hash);
        if (entry && (Date.now() - entry.t) < CACHE_TTL) {
            return entry.data;
        }
        if (entry) CACHE.delete(hash);
        return null;
    }

    function _cacheSet(url, data) {
        const hash = _cacheKey(url);
        CACHE.set(hash, { data, t: Date.now() });
        if (CACHE.size > MAX_CACHE_ENTRIES) {
            const first = CACHE.keys().next().value;
            CACHE.delete(first);
        }
    }

    function _buildUrl(base, params = {}) {
        const url = new URL(base);
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null) url.searchParams.set(k, v);
        }
        return url.toString();
    }

    /**
     * Perform a GET request with GM_xmlhttpRequest, caching and retry support
     */
    function get(url, params = {}, options = {}) {
        const {
            cache = false,
            retries = FluxConstants.RETRY.MAX_RETRIES,
            headers = {}
        } = options;

        const fullUrl = _buildUrl(url, params);

        if (cache) {
            const cached = _cacheGet(fullUrl);
            if (cached) {
                FluxLogger.debug('Cache hit:', fullUrl);
                return Promise.resolve(cached);
            }
        }

        return _requestWithRetry('GET', fullUrl, null, {
            ...headers,
            'Accept': 'application/json'
        }, retries).then(data => {
            if (cache) _cacheSet(fullUrl, data);
            return data;
        });
    }

    /**
     * Perform a POST request
     */
    function post(url, body, options = {}) {
        const {
            retries = FluxConstants.RETRY.MAX_RETRIES,
            headers = {}
        } = options;

        return _requestWithRetry('POST', url, body, {
            ...headers,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }, retries);
    }

    function _requestWithRetry(method, url, body, headers, maxRetries) {
        return FluxUtils.retry(() => _doRequest(method, url, body, headers), maxRetries, FluxConstants.RETRY.BASE_DELAY);
    }

    function _doRequest(method, url, body, headers) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                // Fallback to fetch API
                const fetchOptions = {
                    method,
                    headers,
                    credentials: 'include'
                };
                if (body) fetchOptions.body = JSON.stringify(body);

                fetch(url, fetchOptions)
                    .then(response => {
                        if (response.status === 429) {
                            reject(new Error('RATE_LIMITED'));
                            return;
                        }
                        if (!response.ok) reject(new Error(`HTTP ${response.status}`));
                        return response.json();
                    })
                    .then(data => resolve(data))
                    .catch(err => {
                        if (err.message === 'RATE_LIMITED') reject(err);
                        else reject(new Error('Network error'));
                    });
                return;
            }

            const requestConfig = {
                method,
                url,
                headers,
                anonymous: false,
                onload: function(response) {
                    if (response.status === 429) {
                        reject(new Error('RATE_LIMITED'));
                        return;
                    }
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch (e) {
                            resolve(response.responseText);
                        }
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: function() {
                    reject(new Error('Network error'));
                },
                ontimeout: function() {
                    reject(new Error('Timeout'));
                },
                timeout: 15000
            };

            if (body) {
                requestConfig.data = JSON.stringify(body);
            }

            GM_xmlhttpRequest(requestConfig);
        });
    }

    /**
     * Batch GET requests using Promise.all with concurrency limit
     */
    async function batchGet(urls, options = {}) {
        const {
            cache = false,
            concurrency = 6
        } = options;

        const tasks = urls.map(({ url, params }) => () => get(url, params, { cache }));
        return FluxUtils.parallelLimit(tasks, concurrency);
    }

    /**
     * Clear the response cache
     */
    function clearCache() {
        CACHE.clear();
        FluxLogger.debug('HTTP cache cleared');
    }

    /**
     * Set cache TTL in milliseconds
     */
    function setCacheTTL(ttl) {
        // CACHE_TTL is const at module level; for extensibility,
        // we clear the cache to force fresh data
        clearCache();
    }

    return {
        get, post, batchGet, clearCache, setCacheTTL
    };
})();

// ====== MODULE: games (src/api/games.js) ======
/**
 * FluxFind Games API
 * Game/universe data fetching with batch support, caching, vote aggregation, and DataCenterId lookup.
 *
 * @module api/games
 * @license GPL-2.0-only
 */
const FluxGamesAPI = (() => {
    'use strict';

    const { GAMES_API, THUMBNAILS_API, JOIN_API } = FluxConstants.API;
    const { GAME_ICONS, GAME_VOTES } = FluxConstants.CHUNK_SIZES;

    function getCurrentGameId() {
        const m = window.location.href.match(/\/games\/(\d+)/);
        return m ? FluxSanitizer.sanitizeUserId(m[1]) : 0;
    }

    async function getUniverseId(placeId) {
        const safe = FluxSanitizer.sanitizeUserId(placeId);
        if (!safe) throw new Error('Invalid place ID');
        const d = await FluxHttpClient.get(`${GAMES_API}/games/multiget-place-details`, { placeIds: safe }, { cache: true });
        if (Array.isArray(d) && d.length && d[0].universeId) return d[0].universeId;
        throw new Error('Universe ID not found');
    }

    function getGameIcons(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const chunks = FluxUtils.chunk(ids, GAME_ICONS);
        const proms = chunks.map(c => FluxHttpClient.get(`${THUMBNAILS_API}/games/icons`, {
            universeIds: c.join(','), size: '512x512', format: 'Png', isCircular: 'false', returnPolicy: 'PlaceHolder'
        }, { cache: true }).then(r => r.data || []));
        return Promise.all(proms).then(rr => {
            const all = rr.flat();
            if (!all.length) throw new Error('No icons');
            if (single) { const f = all.find(d => String(d.targetId) === String(universeIds)); return f ? f.imageUrl : null; }
            const m = {};
            all.forEach(d => { if (d.imageUrl) m[d.targetId] = d.imageUrl; });
            return m;
        });
    }

    async function getGameDetails(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const d = await FluxHttpClient.get(`${GAMES_API}/games`, { universeIds: ids.join(',') }, { cache: true });
        if (single) return (d.data && d.data.length) ? d.data[0] : null;
        const m = {};
        if (d.data) d.data.forEach(g => { m[g.id] = g; });
        return m;
    }

    function getGameVotes(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const chunks = FluxUtils.chunk(ids, GAME_VOTES);
        const proms = chunks.map(c => FluxHttpClient.get(`${GAMES_API}/games/votes`, { universeIds: c.join(',') }, { cache: true }).then(r => r.data || []));
        return Promise.all(proms).then(rr => {
            const all = rr.flat();
            if (!all.length) throw new Error('No votes');
            if (single) { const f = all.find(d => String(d.id) === String(universeIds)); return f ? { upVotes: f.upVotes, downVotes: f.downVotes } : null; }
            const m = {};
            all.forEach(d => { m[d.id] = { upVotes: d.upVotes, downVotes: d.downVotes }; });
            return m;
        });
    }

    async function getFavoriteGames(userId) {
        const safe = FluxSanitizer.sanitizeUserId(userId);
        if (!safe) return [];
        const d = await FluxHttpClient.get(`${GAMES_API}/users/${safe}/favorite/games`, {}, { cache: true });
        return d.data || [];
    }

    async function joinServer(placeId, serverId) {
        return FluxHttpClient.post(`${JOIN_API}/join-game-instance`, {
            placeId: FluxSanitizer.sanitizeUserId(placeId), gameId: serverId
        }, { headers: { 'User-Agent': 'Roblox/WinInet' } });
    }

    /**
     * Fetch up to 100 public servers for a game.
     * Response: { nextPageCursor, previousPageCursor, data: [{id, maxPlayers, playing, fps, ping, playerTokens, ...}] }
     */
    async function fetchPublicServers(gameId, sortOrder = 'Asc', cursor = null, limit = 100) {
        const url = `${GAMES_API}/games/${gameId}/servers/Public?sortOrder=${sortOrder}&limit=${limit}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
        return FluxHttpClient.get(url, {}, { cache: false });
    }

    /**
     * Fetch all public servers across all pages, up to maxServers.
     */
    async function fetchAllPublicServers(gameId, sortOrder = 'Asc', maxServers = 300) {
        let allData = [];
        let cursor = null;
        let page = 0;

        do {
            const resp = await fetchPublicServers(gameId, sortOrder, cursor, 100);
            const servers = resp?.data || [];
            allData = allData.concat(servers);
            cursor = resp?.nextPageCursor || null;
            page++;
            FluxLogger.info(`Fetched page ${page}: ${servers.length} servers (total: ${allData.length})`);
        } while (cursor && allData.length < maxServers && page < 10);

        return allData;
    }

    /**
     * POST to gamejoin.roblox.com/v1/join-game to get the server connection info.
     * Extracts server IP for geolocation and/or DataCenterId mapping.
     * Returns region key or null.
     */
    async function getServerRegion(gameId, serverId) {
        try {
            const data = await FluxHttpClient.post(
                `${JOIN_API}/join-game-instance`,
                { placeId: FluxSanitizer.sanitizeUserId(gameId), gameId: serverId },
                { headers: { 'User-Agent': 'Roblox/WinInet' }, retries: 0 }
            );

            // Debug: log what we got back
            if (!data) {
                FluxLogger.info('Region lookup: POST returned falsy data for ' + serverId.substring(0, 8));
                return null;
            }

            // Response: { joinScript: { UdmuxEndpoints: [{Address,Port}], DataCenterId, ... } }
            const js = data?.joinScript || data;
            const hasJs = !!data?.joinScript;

            // Attempt 1: Geocode via server IP from UdmuxEndpoints (public IPs)
            const endpoints = js?.UdmuxEndpoints || js?.udmuxEndpoints || [];
            FluxLogger.info(`Region debug[${serverId.substring(0,8)}]: hasJoinScript=${hasJs} endpoints=${endpoints.length} dataCenterId=${js?.DataCenterId || 'none'}`);
            if (endpoints.length > 0) {
                FluxLogger.info(`Region debug[${serverId.substring(0,8)}]: first endpoint Address=${endpoints[0]?.Address || 'none'}`);
            }

            for (const ep of endpoints) {
                const epIp = ep?.Address || ep?.address || null;
                if (epIp && epIp !== '0.0.0.0' && !epIp.startsWith('10.') && !epIp.startsWith('127.') && !epIp.startsWith('192.168.')) {
                    const geo = await FluxGeolocationAPI.getRegionFromIP(epIp);
                    if (geo.region) return { city: geo.region.city, country: geo.region.country, countryCode: geo.region.countryCode };
                }
            }

            // Attempt 2: Try ServerConnections for public IPs
            const conns = js?.ServerConnections || [];
            for (const c of conns) {
                const cIp = c?.Address || c?.address || null;
                if (cIp && cIp !== '0.0.0.0' && !cIp.startsWith('10.') && !cIp.startsWith('127.') && !cIp.startsWith('192.168.')) {
                    const geo = await FluxGeolocationAPI.getRegionFromIP(cIp);
                    if (geo.region) return { city: geo.region.city, country: geo.region.country, countryCode: geo.region.countryCode };
                }
            }

            FluxLogger.info('Region lookup: no usable IP for ' + serverId);
        } catch (e) {
            FluxLogger.info('Region lookup error for ' + serverId + ': ' + e.message);
        }
        return null;
    }

    /**
     * Fetch regions for multiple server IDs using a rate-limited sequential dispatcher.
     * 250ms delay between requests to avoid 429 errors.
     * Returns Map<serverId, regionKey>.
     */
    async function fetchServerRegions(gameId, serverIds) {
        if (!serverIds || !serverIds.length) return new Map();
        const results = new Map();
        let success = 0, failed = 0;

        for (let i = 0; i < serverIds.length; i++) {
            if (i > 0) {
                // Rate-limit delay: 250ms between requests
                await new Promise(r => setTimeout(r, 250));
            }
            const sid = serverIds[i];
            const region = await getServerRegion(gameId, sid);
            if (region) { results.set(sid, region); success++; }
            else failed++;
        }

        FluxLogger.info(`Regions: ${success} found, ${failed} failed (${serverIds.length} total)`);
        return results;
    }

    async function getUserPresence(userId) {
        const safe = FluxSanitizer.sanitizeUserId(userId);
        if (!safe) return null;
        const d = await FluxHttpClient.post(
            `${FluxConstants.API.PRESENCE_API}/presence/users`,
            { userIds: [safe] },
            { cache: false }
        );
        return d.userPresences?.[0] || null;
    }

    return {
        getCurrentGameId, getUniverseId, getGameIcons, getGameDetails, getGameVotes,
        getFavoriteGames, joinServer, getServerRegion, fetchServerRegions, fetchPublicServers, fetchAllPublicServers, getUserPresence
    };
})();

// ====== MODULE: users (src/api/users.js) ======
/**
 * FluxFind Users API Module
 * User data, stats, friend counts, followers, thumbnails
 *
 * @module api/users
 * @license GPL-2.0-only
 */

const FluxUsersAPI = (() => {
    'use strict';

    const { USERS_API, FRIENDS_API, THUMBNAILS_API } = FluxConstants.API;

    /**
     * Get the current user's ID from Roblox page data
     */
    function getCurrentUserId() {
        // Primary: Roblox JS object
        try {
            const id = Roblox?.CurrentUser?.userId;
            const safeId = FluxSanitizer.sanitizeUserId(id);
            if (safeId && safeId !== 0) return safeId;
        } catch { /* fall through */ }

        // Secondary: DOM meta tag
        const meta = document.querySelector(FluxConstants.SELECTORS.USER_DATA_META);
        if (meta) {
            const fallbackId = parseInt(meta.getAttribute('data-userid'), 10);
            if (fallbackId > 0) return FluxSanitizer.sanitizeUserId(fallbackId);
        }

        return 0;
    }

    /**
     * Get user info by ID
     */
    async function getUserInfo(userId) {
        const safeId = FluxSanitizer.sanitizeUserId(userId);
        if (!safeId) return null;
        return FluxHttpClient.get(
            `${USERS_API}/users/${safeId}`,
            {},
            { cache: true }
        );
    }

    /**
     * Get user stats batch (friends, followers, following counts + info)
     */
    async function getUserStats(userId, mode = 'full') {
        const safeId = FluxSanitizer.sanitizeUserId(userId);
        if (!safeId) return null;

        if (mode === 'smartsearch') {
            const [friendCount, followerCount] = await Promise.all([
                FluxHttpClient.get(`${FRIENDS_API}/users/${safeId}/friends/count`, {}, { cache: true }),
                FluxHttpClient.get(`${FRIENDS_API}/users/${safeId}/followers/count`, {}, { cache: true })
            ]);
            return { friendCount: friendCount?.count ?? 0, followerCount: followerCount?.count ?? 0 };
        }

        const [userInfo, friendCount, followerCount, followingCount] = await Promise.all([
            getUserInfo(safeId),
            FluxHttpClient.get(`${FRIENDS_API}/users/${safeId}/friends/count`, {}, { cache: true }),
            FluxHttpClient.get(`${FRIENDS_API}/users/${safeId}/followers/count`, {}, { cache: true }),
            FluxHttpClient.get(`${FRIENDS_API}/users/${safeId}/followings/count`, {}, { cache: true })
        ]);

        return {
            userInfo,
            friendCount: friendCount?.count ?? 0,
            followerCount: followerCount?.count ?? 0,
            followingCount: followingCount?.count ?? 0
        };
    }

    /**
     * Check if a user is banned (deleted/suspended)
     */
    async function checkBannedUser(userId) {
        const info = await getUserInfo(userId);
        if (!info) return false;
        return info.isBanned === true;
    }

    /**
     * Fetch CSRF token from Roblox
     */
    async function getCsrfToken() {
        // First check DOM
        const domToken = FluxDOM.getCsrfToken();
        if (domToken) return domToken;

        // Fetch from Roblox endpoint
        try {
            const response = await fetch(`${FluxConstants.API.ROBLOX_BASE}/home`, {
                credentials: 'include'
            });
            const text = await response.text();
            const match = text.match(/data-token="([^"]+)"/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }

    return {
        getCurrentUserId,
        getUserInfo,
        getUserStats,
        checkBannedUser,
        getCsrfToken
    };
})();

// ====== MODULE: thumbnails (src/api/thumbnails.js) ======
/**
 * FluxFind Thumbnails API Module
 * Fetches player avatar thumbnails via Roblox batch API using player tokens.
 *
 * @module api/thumbnails
 * @license GPL-2.0-only
 */
const FluxThumbnailsAPI = (() => {
    'use strict';

    const { THUMBNAILS_API } = FluxConstants.API;

    async function fetchPlayerThumbnailsBatch(userIds) {
        if (!userIds || !userIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/users/avatar-headshot`,
            { userIds: userIds.join(','), size: '150x150', format: 'Png', isCircular: 'false' },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    /**
     * Batch-fetch player thumbnails by player tokens using the POST batch endpoint.
     * Tokens come from the servers/Public API response.
     * Returns array of { requestId, token, imageUrl, targetId, state }.
     */
    async function fetchPlayerThumbnailsByTokens(playerTokens, quick = false) {
        if (!playerTokens || !playerTokens.length) return [];

        const tokens = quick ? playerTokens.slice(0, 5) : playerTokens.slice(0, 250);
        const body = tokens.map((token, idx) => ({
            requestId: `${idx}:${token}:AvatarHeadshot:150x150:webp:regular::`,
            type: 'AvatarHeadShot',
            targetId: 0,
            token: String(token),
            format: 'webp',
            size: '150x150'
        }));

        try {
            const data = await FluxHttpClient.post(
                `${THUMBNAILS_API}/batch`,
                body,
                { cache: false, retries: 2 }
            );
            const rawData = data?.data || [];
            // Roblox sometimes returns data as an object keyed by index instead of an array
            const results = Array.isArray(rawData) ? rawData : Object.values(rawData);
            FluxLogger.info('Thumbnails batch: ' + results.length + ' results parsed');
            return results;
        } catch (e) {
            FluxLogger.info('Thumbnails batch failed: ' + e.message);
            return [];
        }
    }

    async function fetchGroupIconsBatch(groupIds) {
        if (!groupIds || !groupIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/groups/icons`,
            { groupIds: groupIds.join(','), size: '150x150', format: 'Png', isCircular: 'false' },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    async function fetchCatalogThumbnailsBatch(assetIds) {
        if (!assetIds || !assetIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/assets`,
            { assetIds: assetIds.join(','), size: '150x150', format: 'png', isCircular: 'false' },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    async function fetchBundleThumbnailsBatch(bundleIds) {
        if (!bundleIds || !bundleIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/bundles/thumbnails`,
            { bundleIds: bundleIds.join(','), size: '150x150', format: 'png', isCircular: 'false' },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    return {
        fetchPlayerThumbnailsBatch, fetchPlayerThumbnailsByTokens,
        fetchGroupIconsBatch, fetchCatalogThumbnailsBatch, fetchBundleThumbnailsBatch
    };
})();

// ====== MODULE: catalog (src/api/catalog.js) ======
/**
 * FluxFind Catalog API Module
 * Catalog item details and metadata fetching
 *
 * @module api/catalog
 * @license GPL-2.0-only
 */

const FluxCatalogAPI = (() => {
    'use strict';

    const { CATALOG_API } = FluxConstants.API;

    /**
     * Get catalog item details by asset ID
     */
    async function getItemDetails(assetId) {
        const safeId = FluxSanitizer.sanitizeUserId(assetId);
        if (!safeId) return null;

        return FluxHttpClient.get(
            `${CATALOG_API}/catalog/items/${safeId}/details`,
            { itemType: 'Asset' },
            { cache: true }
        ).catch(() => null);
    }

    /**
     * Search catalog items
     */
    async function searchItems(query, limit = 30) {
        const safeQuery = FluxSanitizer.escapeHtml(query);
        return FluxHttpClient.get(
            `${CATALOG_API}/search/items`,
            {
                keyword: safeQuery,
                limit,
                category: 'All'
            },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    /**
     * Get items in a bundle
     */
    async function getBundleDetails(bundleId) {
        const safeId = FluxSanitizer.sanitizeUserId(bundleId);
        if (!safeId) return null;

        return FluxHttpClient.get(
            `${CATALOG_API}/bundles/${safeId}/details`,
            {},
            { cache: true }
        ).catch(() => null);
    }

    return {
        getItemDetails,
        searchItems,
        getBundleDetails
    };
})();

// ====== MODULE: geolocation (src/api/geolocation.js) ======
/**
 * FluxFind Geolocation API
 * Maps server IP addresses to our region zones using ip-api.com (free, no API key).
 * Falls back to DataCenterId mapping if geolocation fails.
 *
 * @module api/geolocation
 * @license GPL-2.0-only
 */

const FluxGeolocationAPI = (() => {
    'use strict';

    const GEO_API = 'https://ip-api.com/json';
    const CACHE = new Map();
    const CACHE_TTL = 300000; // 5 minutes

    /** Look up IP location using ip-api.com (GM_xmlhttpRequest, CORS-free) */
    async function lookupIP(ip) {
        if (!ip || ip === '0.0.0.0') return null;

        const cached = CACHE.get(ip);
        if (cached && (Date.now() - cached.t) < CACHE_TTL) {
            return cached.data;
        }

        try {
            const data = await FluxHttpClient.get(
                `${GEO_API}/${ip}`,
                { fields: 'countryCode,country,city,regionName' },
                { cache: false, retries: 1 }
            );
            if (data && data.countryCode) {
                const result = {
                    countryCode: data.countryCode,
                    country: data.country || data.countryCode,
                    city: data.city || null,
                    regionName: data.regionName || null,
                };
                CACHE.set(ip, { data: result, t: Date.now() });
                return result;
            }
        } catch (e) {
            FluxLogger.info('IP geolocation failed for ' + ip + ': ' + e.message);
        }
        return null;
    }

    /** Get region info from IP address (cached) */
    async function getRegionFromIP(ip) {
        const geo = await lookupIP(ip);
        if (geo && geo.countryCode) {
            FluxLogger.info(`IP ${ip} → ${geo.city || geo.country} (${geo.countryCode})`);
            return { region: geo };
        }
        FluxLogger.info(`IP ${ip} → unknown region`);
        return { region: null, details: geo };
    }

    function clearCache() {
        CACHE.clear();
    }

    return { lookupIP, getRegionFromIP, clearCache };
})();

// ====== MODULE: icons (src/ui/icons.js) ======
/**
 * FluxFind Icons Module
 * Lucide-style SVG icons - no emojis, pure SVG inline
 * Each icon returns an SVG string for direct DOM injection
 *
 * @module ui/icons
 * @license GPL-2.0-only
 */

const FluxIcons = (() => {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';

    /**
     * Build SVG element from attributes and inner path data
     */
    function _svg(attrs, ...paths) {
        const size = attrs.width || 24;
        return `<svg xmlns="${NS}" width="${size}" height="${attrs.height || size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${attrs.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round" class="${attrs.className || ''}" style="${attrs.style || ''}">${paths.join('')}</svg>`;
    }

    const icons = {
        // Navigation & core
        settings:   _svg({}, '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
        search:     _svg({}, '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
        filter:     _svg({}, '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'),
        refresh:    _svg({}, '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15.36 6.36L3 16"/>'),
        close:      _svg({}, '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
        check:      _svg({}, '<path d="M20 6 9 17l-5-5"/>'),
        chevronDown:_svg({}, '<path d="m6 9 6 6 6-6"/>'),
        chevronUp:  _svg({}, '<path d="m18 15-6-6-6 6"/>'),
        chevronLeft:_svg({}, '<path d="m15 18-6-6 6-6"/>'),
        chevronRight:_svg({},'<path d="m9 18 6-6-6-6"/>'),

        // Status & feedback
        info:       _svg({}, '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
        alertTriangle: _svg({}, '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
        alertCircle:_svg({}, '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'),
        checkCircle:_svg({},'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
        xCircle:    _svg({}, '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'),
        loader:     _svg({}, '<path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>'),

        // User & social
        user:       _svg({}, '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
        users:      _svg({}, '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
        userPlus:   _svg({}, '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>'),
        userX:      _svg({}, '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>'),

        // Game & play
        play:       _svg({}, '<polygon points="5 3 19 12 5 21 5 3"/>'),
        gamepad:    _svg({}, '<line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/>'),
        server:     _svg({}, '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>'),
        zap:        _svg({}, '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
        globe:      _svg({}, '<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/><path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10"/>'),
        mapPin:     _svg({}, '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),

        // Actions
        plus:       _svg({}, '<path d="M5 12h14"/><path d="M12 5v14"/>'),
        minus:      _svg({}, '<path d="M5 12h14"/>'),
        trash:       _svg({}, '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'),
        copy:       _svg({}, '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
        download:   _svg({}, '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
        upload:     _svg({}, '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>'),
        externalLink:_svg({},'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>'),

        //Toggle & UI
        eye:        _svg({}, '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
        eyeOff:     _svg({}, '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>'),
        moon:       _svg({}, '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
        sun:        _svg({}, '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
        layout:     _svg({}, '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="3" y2="21"/>'),
        pallete:    _svg({}, '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="9.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>'),
        monitor:    _svg({}, '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'),

        // Misc
        heart:      _svg({}, '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
        star:       _svg({}, '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
        clock:      _svg({}, '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
        shield:     _svg({}, '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
        flag:       _svg({}, '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>'),
    };

    /**
     * Get icon SVG string by name
     */
    function get(name, opts = {}) {
        const { size = 18, className = '', color = '' } = opts;
        let svg = icons[name];
        if (!svg) return icons.info;

        // Apply size
        svg = svg.replace(/width="(\d+)"/, `width="${size}"`);
        svg = svg.replace(/height="(\d+)"/, `height="${size}"`);

        if (className) {
            svg = svg.replace(/class=""/, `class="${className}"`);
            if (!svg.includes('class=')) {
                svg = svg.replace('<svg', `<svg class="${className}"`);
            }
        }

        if (color) {
            svg = svg.replace('stroke="currentColor"', `stroke="${FluxSanitizer.sanitizeColor(color)}"`);
        }

        return svg;
    }

    /**
     * Create an SVG DOM element from icon name
     */
    function createElement(name, opts = {}) {
        const svgString = get(name, opts);
        const temp = document.createElement('div');
        temp.innerHTML = svgString;
        return temp.firstElementChild;
    }

    /**
     * Get base64 data URI for logo icon
     */
    function getLogoSVG(size = 56) {
        return `<svg xmlns="${NS}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" fill="#6C5CE7" fill-opacity="0.15"/>
            <path d="M12 2a8 8 0 0 1 8 8"/>
            <path d="M20 10a8 8 0 0 1-8 8"/>
            <path d="M12 18a8 8 0 0 1-8-8"/>
            <path d="M4 14a8 8 0 0 0 8-8"/>
            <circle cx="12" cy="12" r="3" fill="#6C5CE7"/>
        </svg>`;
    }

    return { icons, get, createElement, getLogoSVG };
})();

// ====== MODULE: notifications (src/ui/notifications.js) ======
/**
 * FluxFind Notifications Module
 * Toast notification system with lucide SVG icons, no emojis
 *
 * @module ui/notifications
 * @license GPL-2.0-only
 */

const FluxNotifications = (() => {
    'use strict';

    let container = null;
    let styleInjected = false;

    const ICON_MAP = {
        success: FluxIcons.get('checkCircle', { size: 18, color: '#4CAF50' }),
        error:   FluxIcons.get('xCircle', { size: 18, color: '#F44336' }),
        warning: FluxIcons.get('alertTriangle', { size: 18, color: '#FF9800' }),
        info:    FluxIcons.get('info', { size: 18, color: '#2196F3' })
    };

    const VALID_TYPES = ['success', 'error', 'warning', 'info'];

    function _injectStyles() {
        if (styleInjected) return;
        FluxDOM.injectStyleOnce('fluxfind-toast-styles', `
            @keyframes ff-slideIn  { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
            @keyframes ff-slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
            @keyframes ff-shrink  { from { width: 100%; } to { width: 0%; } }

            #fluxfind-toasts {
                position: fixed; top: 20px; right: 20px; z-index: 999999999999999;
                display: flex; flex-direction: column; gap: 8px; pointer-events: none;
            }
            .ff-toast {
                background: #2d2d2d; color: #e8e8e8; padding: 12px 16px; border-radius: 8px;
                font: 500 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                min-width: 280px; max-width: 420px; border: 1px solid rgba(255,255,255,0.15);
                box-shadow: 0 6px 20px rgba(0,0,0,0.35); animation: ff-slideIn 0.3s ease-out forwards;
                pointer-events: auto; position: relative; overflow: hidden;
                will-change: transform, opacity;
            }
            .ff-toast.removing { animation: ff-slideOut 0.3s ease-in forwards; }
            .ff-toast:hover { background: #373737; }
            .ff-toast-content { display: flex; align-items: center; gap: 10px; }
            .ff-toast-icon { flex-shrink: 0; width: 18px; height: 18px; display: flex; align-items: center; }
            .ff-toast-icon svg { display: block; }
            .ff-toast-message { flex: 1; line-height: 1.4; white-space: pre-wrap; }
            .ff-toast-close {
                position: absolute; top: 6px; right: 8px; width: 22px; height: 22px;
                cursor: pointer; opacity: 0.5; display: flex; align-items: center;
                justify-content: center; border-radius: 4px; transition: opacity 0.15s;
                background: none; border: none; padding: 0;
            }
            .ff-toast-close:hover { opacity: 1; background: rgba(255,255,255,0.1); }
            .ff-toast-close::before, .ff-toast-close::after {
                content: ''; position: absolute; width: 12px; height: 1.5px; background: #ccc;
                border-radius: 1px;
            }
            .ff-toast-close::before { transform: rotate(45deg); }
            .ff-toast-close::after  { transform: rotate(-45deg); }
            .ff-toast-progress {
                position: absolute; bottom: 0; left: 0; height: 2px;
                background: rgba(255,255,255,0.2); animation: ff-shrink linear forwards;
            }
            .ff-toast.success  { border-left: 3px solid #4CAF50; }
            .ff-toast.error    { border-left: 3px solid #F44336; }
            .ff-toast.warning  { border-left: 3px solid #FF9800; }
            .ff-toast.info     { border-left: 3px solid #2196F3; }
        `);
        styleInjected = true;
    }

    function _getContainer() {
        if (!container || !container.isConnected) {
            container = document.getElementById('fluxfind-toasts');
            if (!container) {
                container = FluxDOM.el('div', { id: 'fluxfind-toasts' });
                document.body.appendChild(container);
            }
        }
        return container;
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'info' | 'success' | 'warning' | 'error'
     * @param {number} duration - Duration in ms
     * @returns {Object} Controller with remove(), update(), setType(), setDuration()
     */
    function show(message, type = 'info', duration = 3000) {
        if (FluxStorage.getBool('enablenotifications', true) === false) return { remove: FluxUtils.noop };

        _injectStyles();
        const safeType = VALID_TYPES.includes(type) ? type : 'info';
        const safeMessage = FluxSanitizer.escapeHtml(message);

        const toast = FluxDOM.el('div', { className: `ff-toast ${safeType}` });
        const iconSvg = ICON_MAP[safeType] || ICON_MAP.info;

        toast.innerHTML = `
            <div class="ff-toast-content">
                <div class="ff-toast-icon">${iconSvg}</div>
                <span class="ff-toast-message">${safeMessage.replace(/\n/g, '<br>')}</span>
            </div>
            <button class="ff-toast-close" aria-label="Close notification"></button>
            <div class="ff-toast-progress" style="animation-duration: ${Math.max(0, parseInt(duration))}ms;"></div>
        `;

        _getContainer().appendChild(toast);

        let timeout = setTimeout(_remove, duration);

        function _remove() {
            clearTimeout(timeout);
            toast.classList.add('removing');
            setTimeout(() => { if (toast.isConnected) toast.remove(); }, 300);
        }

        const closeBtn = FluxUtils.qs('.ff-toast-close', toast);
        const progressBar = FluxUtils.qs('.ff-toast-progress', toast);

        if (closeBtn) {
            closeBtn.addEventListener('click', _remove);
        }

        toast.addEventListener('mouseenter', () => {
            if (progressBar) progressBar.style.animationPlayState = 'paused';
            clearTimeout(timeout);
        });

        toast.addEventListener('mouseleave', () => {
            if (progressBar) progressBar.style.animationPlayState = 'running';
            const remaining = (progressBar.offsetWidth / toast.offsetWidth) * duration;
            timeout = setTimeout(_remove, Math.max(0, remaining));
        });

        return {
            remove: _remove,
            update: (newMsg) => {
                const msgEl = FluxUtils.qs('.ff-toast-message', toast);
                if (msgEl) {
                    msgEl.innerHTML = FluxSanitizer.escapeHtml(newMsg).replace(/\n/g, '<br>');
                }
            },
            setType: (newType) => {
                const vt = VALID_TYPES.includes(newType) ? newType : 'info';
                toast.className = `ff-toast ${vt}`;
                const iconEl = FluxUtils.qs('.ff-toast-icon', toast);
                if (iconEl) iconEl.innerHTML = ICON_MAP[vt] || ICON_MAP.info;
            },
            setDuration: (newDur) => {
                clearTimeout(timeout);
                const sd = Math.max(0, parseInt(newDur));
                if (progressBar) {
                    progressBar.style.animation = `ff-shrink ${sd}ms linear forwards`;
                }
                timeout = setTimeout(_remove, sd);
            }
        };
    }

    return { show };
})();

// ====== MODULE: styles (src/ui/styles.js) ======
/**
 * FluxFind Core Styles Module
 * Injects pre-compiled CSS string into the document once on init
 * The CSS content is generated at build time from src/ui/css/*.css files
 *
 * @module ui/styles
 * @license GPL-2.0-only
 */

const FluxStyles = (() => {
    'use strict';

    /**
     * The compiled CSS string — replaced by build.js with actual CSS content.
     * Each line is a single-quoted string joined with newlines.
     */
    const CSS = ':root { --ff-bg-primary: #1f1f1f; --ff-bg-secondary: #252525; --ff-bg-tertiary: #2a2a2a; --ff-bg-hover: #333333; --ff-border: #404040; --ff-border-light: #505050; --ff-text-primary: #e8e8e8; --ff-text-secondary: #b0b0b0; --ff-text-muted: #888888; --ff-accent: #6C5CE7; --ff-accent-hover: #7C6CF7; --ff-success: #4CAF50; --ff-error: #F44336; --ff-warning: #FF9800; --ff-radius-sm: 6px; --ff-radius-md: 8px; --ff-radius-lg: 12px; --ff-radius-xl: 20px; --ff-shadow: 0 4px 16px rgba(0,0,0,0.3); --ff-shadow-lg: 0 8px 32px rgba(0,0,0,0.4); --ff-transition: 0.15s ease; --ff-transition-slow: 0.25s ease; } .ff-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--ff-radius-sm); font: 500 13px -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif; cursor: pointer; border: 1px solid var(--ff-border); background: var(--ff-bg-tertiary); color: var(--ff-text-primary); transition: background var(--ff-transition), border-color var(--ff-transition); outline: none; white-space: nowrap; line-height: 1.2; } .ff-btn:hover { background: var(--ff-bg-hover); border-color: var(--ff-border-light); } .ff-btn:active { transform: scale(0.97); } .ff-btn.ff-btn-primary { background: var(--ff-accent); border-color: var(--ff-accent); color: #fff; } .ff-btn.ff-btn-primary:hover { background: var(--ff-accent-hover); } .ff-btn.ff-btn-danger { border-color: var(--ff-error); color: var(--ff-error); } .ff-btn.ff-btn-danger:hover { background: rgba(244,67,54,0.1); } .ff-btn-sm { padding: 4px 10px; font-size: 12px; } .ff-btn-lg { padding: 10px 20px; font-size: 14px; } .ff-input, .ff-select { padding: 8px 12px; border-radius: var(--ff-radius-sm); border: 1px solid var(--ff-border); background: var(--ff-bg-primary); color: var(--ff-text-primary); font-size: 13px; transition: border-color var(--ff-transition); outline: none; } .ff-input:focus, .ff-select:focus { border-color: var(--ff-accent); } .ff-input { width: 100%; box-sizing: border-box; } .ff-input[type="number"] { -moz-appearance: textfield; } .ff-input[type="number"]::-webkit-inner-spin-button, .ff-input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } .ff-select { cursor: pointer; } .ff-checkbox-wrapper { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; } .ff-checkbox-wrapper input[type="checkbox"] { display: none; } .ff-checkbox-custom { width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--ff-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all var(--ff-transition); } .ff-checkbox-wrapper input:checked + .ff-checkbox-custom { background: var(--ff-accent); border-color: var(--ff-accent); } .ff-checkbox-wrapper input:checked + .ff-checkbox-custom::after { content: \'\'; width: 5px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); margin-top: -1px; } .ff-region-chip { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--ff-border); background: transparent; color: var(--ff-text-secondary); transition: all 0.15s ease; user-select: none; } .ff-region-chip:hover { border-color: var(--ff-accent); background: rgba(108,92,231,0.1); color: var(--ff-text-primary); } .ff-region-chip.ff-active { border-color: var(--ff-accent); background: var(--ff-accent); color: #fff; } .ff-tooltip { position: relative; } .ff-tooltip::after { content: attr(data-tooltip); position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #333; color: #e8e8e8; padding: 4px 10px; border-radius: 4px; font-size: 12px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 9999; } .ff-tooltip:hover::after { opacity: 1; } .ff-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: var(--ff-accent); color: #fff; line-height: 1.4; } .ff-divider { height: 1px; background: var(--ff-border); margin: 12px 0; border: none; } .ff-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid var(--ff-border); background: var(--ff-bg-secondary); color: var(--ff-text-secondary); margin-left: 8px; } .ff-tag.ff-tag-green { border-color: var(--ff-success); color: var(--ff-success); background: rgba(76,175,80,0.1); } .ff-tag.ff-tag-red { border-color: var(--ff-error); color: var(--ff-error); background: rgba(244,67,54,0.1); } .ff-tag.ff-tag-yellow { border-color: var(--ff-warning); color: var(--ff-warning); background: rgba(255,152,0,0.1); } .ff-tag.ff-tag-purple { border-color: var(--ff-accent); color: var(--ff-accent); background: rgba(108,92,231,0.1); } .ff-scrollbar::-webkit-scrollbar { width: 6px; } .ff-scrollbar::-webkit-scrollbar-track { background: transparent; } .ff-scrollbar::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; } .ff-scrollbar::-webkit-scrollbar-thumb:hover { background: #666; } .ff-overflow-badge { position: absolute; bottom: -4px; right: -4px; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 11px; background: var(--ff-accent); color: #fff; font-size: 11px; font-weight: 700; line-height: 22px; text-align: center; border: 2px solid var(--ff-bg-primary, #fff); z-index: 2; pointer-events: none; } .ff-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--ff-border); border-top-color: var(--ff-accent); border-radius: 50%; animation: ff-spin 0.6s linear infinite; } @keyframes ff-spin { to { transform: rotate(360deg); } } .ff-skeleton { background: linear-gradient(90deg, var(--ff-bg-tertiary) 25%, var(--ff-bg-hover) 50%, var(--ff-bg-tertiary) 75%); background-size: 200% 100%; animation: ff-shimmer 1.5s infinite; border-radius: 4px; } @keyframes ff-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } #ff-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 999999; display: none; flex-direction: column; justify-content: center; align-items: center; gap: 16px; } .ff-modal-overlay-active { display: flex !important; } .ff-modal { background: var(--ff-bg-tertiary); border-radius: var(--ff-radius-lg); box-shadow: 0 20px 50px rgba(0,0,0,0.5); border: 1px solid var(--ff-border); color: var(--ff-text-primary); z-index: 9999999; } .ff-modal.ff-modal-pop { animation: ff-popIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; } .ff-modal.ff-modal-closing { animation: ff-fadeIn 0.2s ease reverse forwards; } .ff-modal.ff-modal-confirm { padding: 32px; max-width: 440px; width: 90%; } .ff-modal.ff-modal-custom { max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; } .ff-modal-confirm-icon { text-align: center; margin-bottom: 16px; } .ff-modal-confirm-title { margin: 0 0 8px; font-size: 20px; font-weight: 600; text-align: center; } .ff-modal-confirm-msg { margin: 0 0 24px; font-size: 14px; color: var(--ff-text-secondary); text-align: center; line-height: 1.5; } .ff-modal-confirm-actions { display: flex; gap: 10px; justify-content: center; } @keyframes ff-fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes ff-popIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } } #fluxfind-settings-btn { position: fixed; bottom: 20px; right: 20px; z-index: 99999; border-radius: 50%; width: 44px; height: 44px; padding: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(108,92,231,0.4); background: var(--ff-accent); border: none; } .ff-toggle-wrapper { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; padding: 6px 0; } .ff-toggle-input { display: none; } .ff-toggle-track { position: relative; width: 44px; height: 24px; border-radius: 12px; background: #555; flex-shrink: 0; transition: background 0.25s ease; } .ff-toggle-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); } .ff-toggle-input:checked + .ff-toggle-track { background: var(--ff-accent); } .ff-toggle-input:checked + .ff-toggle-track .ff-toggle-knob { transform: translateX(20px); } .ff-toggle-label { font-size: 13px; font-weight: 500; color: var(--ff-text-primary); line-height: 1.3; } .ff-checkbox-wrapper { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; } .ff-checkbox-wrapper input[type="checkbox"] { display: none; } .ff-checkbox-custom { width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--ff-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all var(--ff-transition); } .ff-checkbox-wrapper input:checked + .ff-checkbox-custom { background: var(--ff-accent); border-color: var(--ff-accent); } .ff-checkbox-wrapper input:checked + .ff-checkbox-custom::after { content: \'\'; width: 5px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); margin-top: -1px; } .ff-settings-header { padding: 20px 28px; border-bottom: 1px solid var(--ff-border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; } .ff-settings-header-title { margin: 0; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; } .ff-settings-body { display: flex; flex: 1; overflow: hidden; min-height: 0; } .ff-settings-sidebar { width: 180px; padding: 16px 12px; border-right: 1px solid var(--ff-border); flex-shrink: 0; overflow-y: auto; } .ff-settings-sidebar-btn { width: 100%; justify-content: flex-start; margin-bottom: 4px; border: none; background: transparent; padding: 16px; } .ff-settings-sidebar-btn.ff-active { background: var(--ff-bg-hover); } .ff-settings-content { flex: 1; padding: 20px 28px; overflow-y: auto; } .ff-settings-home-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; } .ff-settings-home-title { margin: 0; font-size: 22px; font-weight: 700; } .ff-settings-home-version { margin: 4px 0 0; font-size: 13px; color: var(--ff-text-muted); } .ff-settings-home-actions { display: flex; gap: 10px; margin-bottom: 20px; } .ff-settings-preset-title { font-size: 14px; font-weight: 600; margin: 16px 0 10px; } .ff-settings-preset-list { display: flex; flex-wrap: wrap; gap: 8px; } .ff-settings-section-title { font-size: 15px; font-weight: 600; margin: 0 0 14px; } .ff-settings-select-wrap { margin-bottom: 12px; } .ff-settings-select-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--ff-text-secondary); } .ff-settings-about { text-align: center; padding: 20px 0; } .ff-settings-about-logo { margin-bottom: 16px; } .ff-settings-about-title { margin: 0 0 8px; font-size: 16px; font-weight: 700; } .ff-settings-about-desc { margin: 0 0 16px; font-size: 13px; color: var(--ff-text-muted); line-height: 1.5; } .ff-settings-about-toggles { display: flex; gap: 16px; justify-content: center; } .ff-settings-about-footer { margin: 20px 0 0; font-size: 11px; color: var(--ff-text-muted); } .ff-server-controls { display: flex; gap: 8px; margin-bottom: 12px; padding: 0 4px; flex-wrap: wrap; } .player-thumbnails-container .player-avatar { position: relative; }';

    function injectAll() {
        if (CSS && CSS.length > 0 && CSS !== '/* CSS is embedded at build time from src/ui/css/*.css files */') {
            FluxDOM.injectStyleOnce('fluxfind-core-styles', CSS);
        }
    }

    return { injectAll };
})();

// ====== MODULE: modals (src/ui/modals.js) ======
/**
 * FluxFind Modals Module
 * Reusable modal/popup system with overlay, animations, and focus trapping
 *
 * @module ui/modals
 * @license GPL-2.0-only
 */

const FluxModals = (() => {
    'use strict';

    let activeModalCount = 0;
    let overlayEl = null;

    function _getOverlay() {
        if (!overlayEl || !overlayEl.isConnected) {
            overlayEl = FluxDOM.el('div', { id: 'ff-modal-overlay' });
            document.body.appendChild(overlayEl);
        }
        return overlayEl;
    }

    function _showOverlay() {
        const overlay = _getOverlay();
        if (!overlay.classList.contains('ff-modal-overlay-active')) {
            overlay.classList.add('ff-modal-overlay-active');
        }
    }

    function _hideOverlay() {
        if (activeModalCount <= 0) {
            const overlay = _getOverlay();
            overlay.classList.remove('ff-modal-overlay-active');
        }
    }

    /**
     * Show a confirmation dialog
     */
    function confirm(title, message, options = {}) {
        const {
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'warning',
            onConfirm = FluxUtils.noop,
            onCancel = FluxUtils.noop
        } = options;

        const safeTitle = FluxSanitizer.escapeHtml(title);
        const safeMsg = FluxSanitizer.escapeHtml(message);

        const typeIcons = {
            warning: FluxIcons.get('alertTriangle', { size: 32, color: '#FF9800' }),
            danger:  FluxIcons.get('alertCircle', { size: 32, color: '#F44336' }),
            info:    FluxIcons.get('info', { size: 32, color: '#2196F3' }),
            success: FluxIcons.get('checkCircle', { size: 32, color: '#4CAF50' })
        };

        const modal = FluxDOM.el('div', {
            className: 'ff-modal ff-modal-confirm ff-modal-pop',
            style: { zIndex: '9999999' }
        });
        modal.style.setProperty('--ff-modal-z', '9999999');

        modal.innerHTML = `
            <div class="ff-modal-confirm-icon">${typeIcons[type] || typeIcons.info}</div>
            <h2 class="ff-modal-confirm-title">${safeTitle}</h2>
            <p class="ff-modal-confirm-msg">${safeMsg}</p>
            <div class="ff-modal-confirm-actions">
                <button class="ff-btn" id="ff-modal-cancel">${FluxSanitizer.escapeHtml(cancelText)}</button>
                <button class="ff-btn ff-btn-primary" id="ff-modal-confirm">${FluxSanitizer.escapeHtml(confirmText)}</button>
            </div>
        `;

        _showOverlay();
        const overlay = _getOverlay();
        overlay.appendChild(modal);
        activeModalCount++;

        function close() {
            modal.classList.remove('ff-modal-pop');
            modal.classList.add('ff-modal-closing');
            setTimeout(() => {
                if (modal.isConnected) {
                    modal.remove();
                    activeModalCount--;
                    _hideOverlay();
                }
            }, 200);
        }

        modal.querySelector('#ff-modal-confirm').addEventListener('click', () => {
            close();
            onConfirm();
        });
        modal.querySelector('#ff-modal-cancel').addEventListener('click', () => {
            close();
            onCancel();
        });

        // Only close on overlay click if this is the only modal
        overlay.addEventListener('click', function overlayHandler(e) {
            if (e.target === overlay && activeModalCount <= 1) {
                close();
                onCancel();
            }
        }, { once: false });

        return { close };
    }

    /**
     * Show a custom modal with full content control
     */
    function custom(contentRenderer, options = {}) {
        const { closable = true, onClose = FluxUtils.noop, width = '600px' } = options;

        const modal = FluxDOM.el('div', {
            className: 'ff-modal ff-modal-custom ff-modal-pop',
            style: { maxWidth: width, width: '95%' }
        });

        function close() {
            modal.classList.remove('ff-modal-pop');
            modal.classList.add('ff-modal-closing');
            setTimeout(() => {
                if (modal.isConnected) {
                    modal.remove();
                    activeModalCount--;
                    _hideOverlay();
                }
                onClose();
            }, 200);
        }

        contentRenderer(modal, close);

        _showOverlay();
        const overlay = _getOverlay();
        overlay.appendChild(modal);
        activeModalCount++;

        if (closable) {
            overlay.addEventListener('click', function overlayHandler(e) {
                if (e.target === overlay) close();
            });
        }

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
        }, { once: true });

        return { close, modal };
    }

    return { confirm, custom };
})();

// ====== MODULE: settings-panel (src/ui/settings-panel.js) ======
/**
 * FluxFind Settings Panel Module
 * Full settings UI with sections, presets, import/export, and live preview.
 * All event handling uses addEventListener — no inline onclick/onchange attributes.
 *
 * @module ui/settings-panel
 * @license GPL-2.0-only
 */

const FluxSettingsPanel = (() => {
    'use strict';

    let isOpen = false;

    const SECTIONS = ['home', 'appearance', 'servers', 'filters', 'privacy', 'about'];

    /* ============ Toggle Switch Generator (Apple‑style) ============ */

    function _createToggle(label, storageKey, defaultValue = false) {
        const currentValue = FluxStorage.getBool(storageKey, defaultValue);
        const wrapper = FluxDOM.el('label', { className: 'ff-toggle-wrapper' });

        const input = FluxDOM.el('input', {
            type: 'checkbox',
            className: 'ff-toggle-input'
        });
        if (currentValue) input.checked = true;

        input.addEventListener('change', function () {
            FluxStorage.setBool(storageKey, this.checked);
            FluxSettingsPanel._onSettingChange(storageKey, this.checked);
        });

        const track = FluxDOM.el('span', { className: 'ff-toggle-track' });
        const knob = FluxDOM.el('span', { className: 'ff-toggle-knob' });
        track.appendChild(knob);

        const labelSpan = FluxDOM.el('span', { className: 'ff-toggle-label' });
        labelSpan.textContent = label;

        wrapper.appendChild(input);
        wrapper.appendChild(track);
        wrapper.appendChild(labelSpan);

        return wrapper;
    }

    /* ============ Select Generator ============ */

    function _createSelect(label, storageKey, options, defaultValue) {
        const currentValue = FluxStorage.get(storageKey, defaultValue);
        const container = FluxDOM.el('div', { className: 'ff-settings-select-wrap' });

        const lbl = FluxDOM.el('label', { className: 'ff-settings-select-label' });
        lbl.textContent = label;

        const select = FluxDOM.el('select', {
            className: 'ff-select',
            style: { width: '100%' }
        });

        options.forEach(o => {
            const opt = FluxDOM.el('option', { value: o.value });
            opt.textContent = o.label;
            if (o.value === currentValue) opt.selected = true;
            select.appendChild(opt);
        });

        select.addEventListener('change', function () {
            FluxStorage.set(storageKey, this.value);
            FluxSettingsPanel._onSettingChange(storageKey, this.value);
        });

        container.appendChild(lbl);
        container.appendChild(select);
        return container;
    }

    /* ============ Button Generator ============ */

    function _createButton(html, className, onClick) {
        const btn = FluxDOM.el('button', { className: `ff-btn ${className}` });
        btn.innerHTML = html;
        btn.addEventListener('click', onClick);
        return btn;
    }

    /* ============ Section Content Renderers ============ */

    function _sectionHome() {
        const frag = document.createDocumentFragment();

        const header = FluxDOM.el('div', { className: 'ff-settings-home-header' });
        const logoDiv = FluxDOM.el('div');
        logoDiv.innerHTML = FluxIcons.getLogoSVG(56);
        const infoDiv = FluxDOM.el('div');
        const title = FluxDOM.el('h2', { className: 'ff-settings-home-title' });
        title.textContent = 'FluxFind';
        const ver = FluxDOM.el('p', { className: 'ff-settings-home-version' });
        ver.textContent = `Version ${FluxConstants.VERSION}`;
        infoDiv.appendChild(title);
        infoDiv.appendChild(ver);
        header.appendChild(logoDiv);
        header.appendChild(infoDiv);
        frag.appendChild(header);
        frag.appendChild(FluxDOM.el('div', { className: 'ff-divider' }));

        const actions = FluxDOM.el('div', { className: 'ff-settings-home-actions' });
        actions.appendChild(_createButton(
            `${FluxIcons.get('download', { size: 16 })} Export`, '',
            () => FluxSettingsPanel.exportSettings()
        ));
        actions.appendChild(_createButton(
            `${FluxIcons.get('upload', { size: 16 })} Import`, '',
            () => FluxSettingsPanel.importSettings()
        ));
        actions.appendChild(_createButton(
            `${FluxIcons.get('trash', { size: 16 })} Reset`, 'ff-btn-danger',
            () => FluxSettingsPanel.resetSettings()
        ));
        frag.appendChild(actions);

        const presetTitle = FluxDOM.el('h3', { className: 'ff-settings-preset-title' });
        presetTitle.textContent = 'Quick Presets';
        frag.appendChild(presetTitle);

        const presetList = FluxDOM.el('div', { className: 'ff-settings-preset-list' });
        Object.entries(FluxConstants.PRESET_CONFIGURATIONS).forEach(([key, preset]) => {
            presetList.appendChild(_createButton(
                FluxSanitizer.escapeHtml(preset.name), 'ff-btn-sm',
                () => FluxSettingsPanel.applyPreset(key)
            ));
        });
        frag.appendChild(presetList);

        return frag;
    }

    function _sectionAppearance() {
        const frag = document.createDocumentFragment();
        const title = FluxDOM.el('h3', { className: 'ff-settings-section-title' });
        title.textContent = 'Appearance';
        frag.appendChild(title);
        frag.appendChild(_createToggle('Force Dark Mode', 'forcedarkmode'));
        frag.appendChild(_createToggle('Responsive Game Cards', 'responsivegamecards', true));
        frag.appendChild(_createToggle('Smaller Roblox Sidebar', 'smallerrobloxsidebar'));
        frag.appendChild(_createToggle('Restore Classic Terms', 'restoreclassicterms'));
        frag.appendChild(_createToggle('Custom Backgrounds (Experimental)', 'custombackgrounds'));
        return frag;
    }

    function _sectionServers() {
        const frag = document.createDocumentFragment();
        const title = FluxDOM.el('h3', { className: 'ff-settings-section-title' });
        title.textContent = 'Server Options';
        frag.appendChild(title);
        frag.appendChild(_createToggle('Enable Server Filters Button', 'togglefilterserversbutton', true));
        frag.appendChild(_createToggle('Auto Server Regions', 'autoserverregions', true));
        frag.appendChild(_createToggle('Better Private Servers', 'betterprivateservers', true));
        frag.appendChild(_createSelect('Server Region Count', 'autoserverregionnumber', [
            { value: '8', label: '8 Regions' },
            { value: '16', label: '16 Regions (Default)' },
            { value: '24', label: '24 Regions' },
            { value: '32', label: '32 Regions' },
            { value: '48', label: '48 Regions' }
        ], '16'));
        frag.appendChild(_createToggle('Show Server Join Time', 'showserverjointime'));
        frag.appendChild(_createToggle('Track Recent Servers', 'trackrecentservers', true));
        return frag;
    }

    function _sectionFilters() {
        const frag = document.createDocumentFragment();
        const title = FluxDOM.el('h3', { className: 'ff-settings-section-title' });
        title.textContent = 'Filter Options';
        frag.appendChild(title);
        frag.appendChild(_createToggle('Remove Ads', 'removeads', true));
        frag.appendChild(_createToggle('Smart Search', 'smartsearch', true));
        frag.appendChild(_createToggle('Better Game Stats', 'bettergamestats', true));
        frag.appendChild(_createToggle('Quality Filter Games', 'qualityfiltergames'));
        frag.appendChild(_createToggle('Quick Launch Games', 'quicklaunchgames', true));
        return frag;
    }

    function _sectionPrivacy() {
        const frag = document.createDocumentFragment();
        const title = FluxDOM.el('h3', { className: 'ff-settings-section-title' });
        title.textContent = 'Privacy & Safety';
        frag.appendChild(title);
        frag.appendChild(_createToggle('Disable Chat Bar', 'disablechat'));
        frag.appendChild(_createToggle('Better Friends Page', 'betterfriends'));
        frag.appendChild(_createToggle('Show Better Profile Info', 'betterprofileinfo'));
        frag.appendChild(_createToggle('Mute Toxic Players (Experimental)', 'mutetoxicplayers'));
        return frag;
    }

    function _sectionAbout() {
        const frag = document.createDocumentFragment();
        const wrap = FluxDOM.el('div', { className: 'ff-settings-about' });

        const logoDiv = FluxDOM.el('div', { className: 'ff-settings-about-logo' });
        logoDiv.innerHTML = FluxIcons.getLogoSVG(64);
        wrap.appendChild(logoDiv);

        const h3 = FluxDOM.el('h3', { className: 'ff-settings-about-title' });
        h3.textContent = `FluxFind v${FluxConstants.VERSION}`;
        wrap.appendChild(h3);

        const desc = FluxDOM.el('p', { className: 'ff-settings-about-desc' });
        desc.innerHTML = 'Enhanced Roblox server browser with filtering, region detection,<br>smart search, and quality-of-life improvements.';
        wrap.appendChild(desc);

        const toggles = FluxDOM.el('div', { className: 'ff-settings-about-toggles' });
        toggles.appendChild(_createToggle('Enable Logs', 'enableLogs'));
        toggles.appendChild(_createToggle('Show Notifications', 'enablenotifications', true));
        wrap.appendChild(toggles);

        const footer = FluxDOM.el('p', { className: 'ff-settings-about-footer' });
        footer.textContent = 'Licensed under GPL-2.0-only. Free and open source software.';
        wrap.appendChild(footer);

        frag.appendChild(wrap);
        return frag;
    }

    function _getSectionContent(section) {
        const map = {
            home: _sectionHome,
            appearance: _sectionAppearance,
            servers: _sectionServers,
            filters: _sectionFilters,
            privacy: _sectionPrivacy,
            about: _sectionAbout
        };
        return (map[section] || _sectionHome)();
    }

    /* ============ Open Settings Panel ============ */

    function open() {
        if (isOpen) return;
        isOpen = true;

        let activeSection = 'home';

        const iconMap = {
            home: 'monitor', appearance: 'pallete', servers: 'server',
            filters: 'filter', privacy: 'shield', about: 'info'
        };

        FluxModals.custom((modal, closeModal) => {
            const header = FluxDOM.el('div', { className: 'ff-settings-header' });
            const headerTitle = FluxDOM.el('h2', { className: 'ff-settings-header-title' });
            headerTitle.innerHTML = `${FluxIcons.get('settings', { size: 18 })} Settings`;
            const closeBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm' });
            closeBtn.innerHTML = FluxIcons.get('close', { size: 16 });
            closeBtn.addEventListener('click', closeModal);
            header.appendChild(headerTitle);
            header.appendChild(closeBtn);

            const body = FluxDOM.el('div', { className: 'ff-settings-body' });
            const sidebar = FluxDOM.el('div', { className: 'ff-settings-sidebar' });
            const content = FluxDOM.el('div', {
                id: 'ff-settings-content',
                className: 'ff-settings-content ff-scrollbar'
            });

            const sidebarBtns = [];
            SECTIONS.forEach((section, index) => {
                const btn = FluxDOM.el('button', {
                    className: 'ff-btn ff-btn-sm ff-settings-sidebar-btn' + (index === 0 ? ' ff-active' : '')
                });
                btn.innerHTML = `${FluxIcons.get(iconMap[section] || 'chevronRight', { size: 14 })}
                    ${section.charAt(0).toUpperCase() + section.slice(1)}`;
                btn.addEventListener('click', () => {
                    activeSection = section;
                    content.innerHTML = '';
                    content.appendChild(_getSectionContent(section));
                    sidebarBtns.forEach((b, i) => {
                        b.classList.toggle('ff-active', i === SECTIONS.indexOf(section));
                    });
                });
                sidebar.appendChild(btn);
                sidebarBtns.push(btn);
            });

            content.appendChild(_getSectionContent('home'));
            body.appendChild(sidebar);
            body.appendChild(content);
            modal.appendChild(header);
            modal.appendChild(body);
        }, { width: '700px', onClose: () => { isOpen = false; } });
    }

    /* ============ Setting Change Callback ============ */

    function _onSettingChange(key, value) {
        FluxLogger.debug(`Setting changed: ${key} = ${value}`);
        FluxNotifications.show('Setting updated', 'success', 1500);
        if (typeof FluxApp !== 'undefined' && FluxApp.applySettings) {
            FluxApp.applySettings(key, value);
        }
    }

    /* ============ Export / Import / Reset ============ */

    function exportSettings() {
        const keys = FluxStorage.listKeys();
        const settings = {};
        keys.forEach(k => {
            if (!k.startsWith('_')) {
                const val = FluxStorage.get(k);
                if (val !== null) settings[k] = val;
            }
        });
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `fluxfind-settings-${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
        FluxNotifications.show('Settings exported successfully', 'success');
    }

    function importSettings() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const settings = JSON.parse(ev.target.result);
                    let count = 0;
                    for (const [k, v] of Object.entries(settings)) {
                        if (k.startsWith('_')) continue;
                        if (typeof v === 'boolean') FluxStorage.setBool(k, v);
                        else FluxStorage.set(k, String(v));
                        count++;
                    }
                    FluxNotifications.show(`Imported ${count} settings. Refresh to apply all.`, 'success', 4000);
                } catch { FluxNotifications.show('Invalid settings file', 'error'); }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function resetSettings() {
        FluxModals.confirm('Reset All Settings?',
            'This will restore all FluxFind settings to their defaults. This cannot be undone.',
            {
                type: 'danger', confirmText: 'Reset All', cancelText: 'Cancel',
                onConfirm: () => {
                    const keys = FluxStorage.listKeys();
                    keys.forEach(k => { if (!k.startsWith('_')) FluxStorage.remove(k); });
                    FluxStorage.initDefaults(FluxConstants.DEFAULT_SETTINGS);
                    FluxNotifications.show('Settings reset to defaults. Refresh to apply.', 'success', 4000);
                }
            }
        );
    }

    function applyPreset(key) {
        const preset = FluxConstants.PRESET_CONFIGURATIONS[key];
        if (!preset) return;
        FluxModals.confirm(`Apply "${preset.name}" Preset?`,
            'This will update your settings to the preset values.',
            {
                type: 'info', confirmText: 'Apply',
                onConfirm: () => {
                    for (const [k, v] of Object.entries(preset.settings)) {
                        if (typeof v === 'boolean') FluxStorage.setBool(k, v);
                        else FluxStorage.set(k, String(v));
                    }
                    FluxNotifications.show(`"${preset.name}" preset applied!`, 'success');
                }
            }
        );
    }

    return { open, exportSettings, importSettings, resetSettings, applyPreset, _onSettingChange };
})();

// ====== MODULE: ad-remover (src/features/ad-remover.js) ======
/**
 * FluxFind Ad Remover Feature
 * Removes Roblox ads from the page using efficient DOM observation
 *
 * @module features/ad-remover
 * @license GPL-2.0-only
 */

const FluxFeatureAdRemover = (() => {
    'use strict';

    let observer = null;
    let enabled = false;

    const AD_SELECTORS = [
        '[data-testid="home-page-game-grid"] > div:last-child',
        '.game-promotion-section',
        '.ad-container',
        '[class*="ad-"]',
        '[class*="promotion"]',
        '.home-page-ad',
        '[data-promotion-type]',
        '#game-grid-sponsored'
    ];

    const selector = AD_SELECTORS.join(',');

    function removeAds() {
        if (!enabled) return;
        const ads = document.querySelectorAll(selector);
        let removed = 0;
        for (const ad of ads) {
            ad.remove();
            removed++;
        }
        if (removed > 0) {
            FluxLogger.debug(`Removed ${removed} ad elements`);
        }
    }

    const debouncedRemove = FluxUtils.debounce(removeAds, 300, true);

    function start() {
        if (enabled) return;
        FluxLogger.info('Ad remover started');
        enabled = true;
        removeAds();

        observer = new MutationObserver(() => {
            debouncedRemove();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function stop() {
        if (!enabled) return;
        FluxLogger.info('Ad remover stopped');
        enabled = false;
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function toggle() {
        const isEnabled = FluxStorage.getBool('removeads', true);
        if (isEnabled) start();
        else stop();
    }

    return { start, stop, toggle, removeAds };
})();

// ====== MODULE: url-router (src/features/url-router.js) ======
/**
 * FluxFind URL Router Module
 * Detects URL changes and activates the correct features per page
 *
 * @module features/url-router
 * @license GPL-2.0-only
 */

const FluxRouter = (() => {
    'use strict';

    let lastPath = '';
    let intervalId = null;

    const PAGE_HANDLERS = {
        SERVERS: 'servers',
        GAME_PAGE: 'game',
        HOME: 'home',
        PROFILE: 'profile',
        SEARCH: 'search',
        UNKNOWN: 'unknown'
    };

    function detectPage() {
        const path = window.location.pathname;
        const url = window.location.href;

        if (FluxConstants.URL_PATTERNS.SERVERS_PAGE.test(url)) return PAGE_HANDLERS.SERVERS;
        if (FluxConstants.URL_PATTERNS.GAME_PAGE.test(path)) return PAGE_HANDLERS.GAME_PAGE;
        if (FluxConstants.URL_PATTERNS.HOME_PAGE.test(path) || path === '/home') return PAGE_HANDLERS.HOME;
        if (FluxConstants.URL_PATTERNS.PROFILE_PAGE.test(path)) return PAGE_HANDLERS.PROFILE;
        if (FluxConstants.URL_PATTERNS.SEARCH_PAGE.test(path)) return PAGE_HANDLERS.SEARCH;

        return PAGE_HANDLERS.UNKNOWN;
    }

    function start(callback) {
        if (intervalId) return;
        lastPath = window.location.pathname + window.location.search + window.location.hash;

        intervalId = setInterval(() => {
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            if (currentPath !== lastPath) {
                lastPath = currentPath;
                const newPage = detectPage();
                FluxLogger.info(`Route changed: -> ${newPage} (${currentPath})`);
                callback(newPage, null);
            }
        }, FluxConstants.TIMING.URL_CHECK_INTERVAL);
    }

    function detectPageBasedOnPath(path) {
        const url = window.location.origin + path;
        if (FluxConstants.URL_PATTERNS.SERVERS_PAGE.test(url)) return PAGE_HANDLERS.SERVERS;
        if (FluxConstants.URL_PATTERNS.GAME_PAGE.test(path)) return PAGE_HANDLERS.GAME_PAGE;
        if (FluxConstants.URL_PATTERNS.HOME_PAGE.test(path)) return PAGE_HANDLERS.HOME;
        if (FluxConstants.URL_PATTERNS.PROFILE_PAGE.test(path)) return PAGE_HANDLERS.PROFILE;
        if (FluxConstants.URL_PATTERNS.SEARCH_PAGE.test(path)) return PAGE_HANDLERS.SEARCH;
        return PAGE_HANDLERS.UNKNOWN;
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    return { start, stop, detectPage, PAGE_HANDLERS };
})();

// ====== MODULE: server-browser (src/features/server-browser.js) ======
/**
 * FluxFind Server Browser Feature
 * Fetches public servers from Roblox API, gets region data, fetches avatars,
 * and replaces native server cards with enhanced ones.
 *
 * @module features/server-browser
 * @license GPL-2.0-only
 */
const FluxFeatureServerBrowser = (() => {
    'use strict';

    let loaded = false, serverObserver = null, _rendering = false;
    let allServers = [];
    let regionScanDone = false;
    let currentGameId = 0;

    /* ====== Core: Fetch servers + regions + thumbnails ====== */
    async function scanAndCacheRegions(force = false) {
        if (!force && regionScanDone) {
            FluxLogger.info('Region scan: already done, skipping');
            return;
        }
        regionScanDone = false;
        allServers = [];

        // Disconnect observer while we replace DOM
        if (serverObserver) { serverObserver.disconnect();
            serverObserver = null; }

        // Step 1: Fetch all public servers (multi-page)
        FluxLogger.info('Region scan: fetching server list...');
        FluxNotifications.show('Fetching servers from Roblox API...', 'info', 4000);

        let servers;
        try {
            servers = await FluxGamesAPI.fetchAllPublicServers(currentGameId, 'Asc', 300);
        } catch (e) {
            FluxLogger.info('Region scan: fetch failed: ' + e.message);
            FluxNotifications.show('Failed to fetch server list', 'error', 3000);
            observeServerList(); // reconnect observer
            return;
        }

        if (!servers.length) {
            FluxLogger.info('Region scan: 0 servers returned from API');
            FluxNotifications.show('No public servers found', 'warning', 3000);
            observeServerList();
            return;
        }

        FluxLogger.info('Region scan: got ' + servers.length + ' servers total');
        FluxNotifications.show('Scanning regions for ' + servers.length + ' servers...', 'info', 5000);

        // Step 2: Fetch DataCenterId for first 30 servers (rate-limited sequential)
        const ids = servers.map(s => s.id).slice(0, 30);
        const regionMap = await FluxGamesAPI.fetchServerRegions(currentGameId, ids);

        // Step 3: Collect all player tokens and batch-fetch thumbnails (first 100 tokens)
        const allTokens = [];
        const tokenSet = new Set();
        servers.forEach(s => {
            (s.playerTokens || []).forEach(t => { if (!tokenSet.has(t)) { tokenSet.add(t);
                    allTokens.push(t); } });
        });

        const thumbnailMap = new Map();
        const tokenSlice = allTokens.slice(0, 100);
        if (tokenSlice.length > 0) {
            FluxLogger.info('Fetching thumbnails for ' + tokenSlice.length + ' unique players...');
            try {
                const thumbs = await FluxThumbnailsAPI.fetchPlayerThumbnailsByTokens(tokenSlice, false);
                thumbs.forEach(t => {
                    if (t.imageUrl && t.requestId) {
                        // requestId format: "index:token:AvatarHeadshot:150x150:webp:regular::"
                        const parts = t.requestId.split(':');
                        if (parts.length >= 2) {
                            thumbnailMap.set(parts[1], t.imageUrl);
                        }
                    }
                });
                FluxLogger.info('Got ' + thumbnailMap.size + ' thumbnails');
            } catch (e) {
                FluxLogger.info('Thumbnail fetch failed: ' + e.message);
            }
        }

        // Step 4: Build server list
        allServers = servers.slice(0, 30).map(s => ({
            id: s.id,
            playing: s.playing,
            maxPlayers: s.maxPlayers,
            playerTokens: s.playerTokens || [],
            thumbnails: (s.playerTokens || []).slice(0, 5).map(t => thumbnailMap.get(t) || null).filter(Boolean),
            region: regionMap.get(s.id) || null
        }));

        regionScanDone = true;
        FluxLogger.info('Region scan: ' + allServers.length + ' servers ready (' + regionMap.size + ' with regions)');

        // Apply saved region filter if any
        const savedRegion = FluxStorage.get('serverregionfilter');
        if (savedRegion) {
            applyRegionFilter(savedRegion);
        } else {
            renderServerCards(allServers);
        }

        // Reconnect observer AFTER render completes
        observeServerList();
    }

    /* ====== Card Rendering ====== */
    function renderServerCards(servers) {
        const container = document.querySelector('#rbx-public-game-server-item-container');
        if (!container) return;

        container.innerHTML = '';

        if (!servers.length) {
            container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--ff-text-muted)">No servers match this filter</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        servers.forEach(server => {
            fragment.appendChild(createServerCard(server));
        });
        container.appendChild(fragment);

        FluxLogger.info('Rendered ' + servers.length + ' server cards');
    }

    function createServerCard(server) {
        const li = FluxDOM.el('li', {
            className: 'rbx-public-game-server-item col-md-3 col-sm-4 col-xs-6'
        });

        const cardItem = FluxDOM.el('div', { className: 'card-item card-item-public-server' });

        // Player thumbnails
        const thumbsContainer = FluxDOM.el('div', { className: 'player-thumbnails-container' });

        if (server.thumbnails.length > 0) {
            const maxShow = Math.min(server.thumbnails.length, 5);
            for (let i = 0; i < maxShow; i++) {
                const avatar = FluxDOM.el('span', { className: 'avatar avatar-headshot-md player-avatar' });
                const imgContainer = FluxDOM.el('span', { className: 'thumbnail-2d-container avatar-card-image' });
                const img = FluxDOM.el('img', { src: server.thumbnails[i], alt: '', title: '' });
                imgContainer.appendChild(img);
                avatar.appendChild(imgContainer);
                thumbsContainer.appendChild(avatar);
            }
        } else {
            // No thumbnails -- show player count
            const countDiv = FluxDOM.el('div', {
                style: 'display:flex;align-items:center;justify-content:center;min-height:48px;padding:8px'
            });
            const badge = FluxDOM.el('span', { className: 'ff-badge', style: 'font-size:13px;padding:6px 14px' });
            badge.innerHTML = FluxIcons.get('users', { size: 14, color: '#fff' }) + ' ' + server.playing + ' / ' + server.maxPlayers;
            countDiv.appendChild(badge);
            thumbsContainer.appendChild(countDiv);
        }

        // "+N" overlay badge on the last avatar when there are more than 5 players
        const totalTokens = server.playerTokens.length;
        if (totalTokens > 5) {
            const children = thumbsContainer.children;
            if (children.length > 0) {
                const lastAvatar = children[Math.min(children.length - 1, 4)];
                // Ensure position:relative for absolute badge anchoring
                lastAvatar.style.position = 'relative';
                const badge = FluxDOM.el('span', { className: 'ff-overflow-badge' });
                badge.textContent = '+' + (totalTokens - 5);
                lastAvatar.appendChild(badge);
            }
        }

        // Details
        const details = FluxDOM.el('div', { className: 'rbx-public-game-server-details game-server-details' });

        // Gauge bar
        const gaugeContainer = FluxDOM.el('div', { className: 'server-player-count-gauge border' });
        const gauge = FluxDOM.el('div', {
            className: 'gauge-inner-bar border',
            style: 'width:' + Math.min(100, (server.playing / server.maxPlayers) * 100) + '%'
        });
        gaugeContainer.appendChild(gauge);

        // Join button
        const joinSpan = FluxDOM.el('span');
        joinSpan.setAttribute('data-placeid', String(currentGameId));
        const joinBtn = FluxDOM.el('button', {
            className: 'btn-full-width btn-control-xs rbx-public-game-server-join game-server-join-btn btn-primary-md btn-min-width ff-btn ff-btn-sm ff-btn-primary'
        });
        joinBtn.addEventListener('click', () => {
            FluxNotifications.show('Joining server...', 'info', 2000);
            FluxGamesAPI.joinServer(currentGameId, server.id).catch(() => {});
        });
        joinBtn.textContent = 'Join';
        joinSpan.appendChild(joinBtn);

        // Server ID + Region badge
        const footer = FluxDOM.el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-top:6px' });
        const sid = FluxDOM.el('div', { className: 'server-id-text text-info xsmall' });
        const sp = server.id.split('-');
        sid.textContent = 'ID: ' + (sp[1] || '') + '-' + (sp[2] || '');
        footer.appendChild(sid);

        if (server.region) {
            const label = server.region.city || server.region.country || 'Unknown';
            const rb = FluxDOM.el('span', { className: 'ff-tag ff-tag-purple', style: 'margin-left:4px' });
            rb.textContent = label;
            rb.title = (server.region.city ? server.region.city + ', ' : '') + server.region.country;
            footer.appendChild(rb);
        }

        details.appendChild(gaugeContainer);
        details.appendChild(joinSpan);
        details.appendChild(footer);

        cardItem.appendChild(thumbsContainer);
        cardItem.appendChild(details);
        li.appendChild(cardItem);

        return li;
    }

    /* ====== Region Filter ====== */
    function applyRegionFilter(countryCode) {
        FluxStorage.set('serverregionfilter', countryCode);
        if (!countryCode) {
            renderServerCards(allServers);
            FluxNotifications.show('All regions: ' + allServers.length + ' servers', 'info', 2000);
            return;
        }

        const filtered = allServers.filter(s => {
            if (!s.region) return false;
            return s.region.countryCode === countryCode;
        });
        const label = allServers.find(s => s.region && s.region.countryCode === countryCode)?.region?.country || countryCode;
        renderServerCards(filtered);
        FluxNotifications.show(label + ': ' + filtered.length + ' servers', 'info', 3000);
    }

    /* ====== Controls ====== */
    function injectFilterButtons() {
        const container = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
        if (!container) return;
        const old = document.querySelector('.ff-server-controls');
        if (old) old.remove();

        const bar = FluxDOM.el('div', { className: 'ff-server-controls' });
        const rBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm', onclick: () => refreshServers() });
        rBtn.innerHTML = FluxIcons.get('refresh', { size: 14 }) + ' Refresh';
        const fBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm', onclick: () => openFilterPanel() });
        fBtn.innerHTML = FluxIcons.get('filter', { size: 14 }) + ' Filters';
        const qBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm ff-btn-primary', onclick: () => quickJoinRandom() });
        qBtn.innerHTML = FluxIcons.get('zap', { size: 14 }) + ' Quick Join';
        FluxUtils.batchAppend(bar, [rBtn, fBtn, qBtn]);
        container.parentNode.insertBefore(bar, container);
    }

    function refreshServers() {
        FluxNotifications.show('Refreshing...', 'info', 2000);
        allServers = [];
        regionScanDone = false;
        scanAndCacheRegions();
    }

    function openFilterPanel() {
        const { REGION_CHIPS } = FluxConstants;

        FluxModals.custom((modal, close) => {
            // Build region chip HTML grouped by continent
            let chipsHTML = '<div class="ff-region-chip ff-active" data-cc="">All Regions</div>';
            REGION_CHIPS.forEach(group => {
                group.chips.forEach(chip => {
                    chipsHTML += '<div class="ff-region-chip" data-cc="' + chip.cc + '">' + chip.label + '</div>';
                });
            });

            // Build grouped sections
            let groupsHTML = '';
            REGION_CHIPS.forEach(group => {
                let groupChips = '';
                group.chips.forEach(chip => {
                    groupChips += '<div class="ff-region-chip" data-cc="' + chip.cc + '">' + chip.label + '</div>';
                });
                groupsHTML += '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;color:var(--ff-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">' + group.group + '</div><div style="display:flex;flex-wrap:wrap;gap:4px">' + groupChips + '</div></div>';
            });

            modal.innerHTML =
                '<div style="padding:24px"><h3 style="margin:0 0 12px;font-size:16px">' + FluxIcons.get('filter', { size: 16 }) + ' Filters</h3>' +
                '<div style="display:flex;flex-direction:column;gap:12px">' +
                '<label class="ff-checkbox-wrapper"><input type="checkbox" checked id="ff-f-full"><span class="ff-checkbox-custom"></span><span>Hide Full Servers</span></label>' +
                '<label class="ff-checkbox-wrapper"><input type="checkbox" id="ff-f-empty"><span class="ff-checkbox-custom"></span><span>Hide Empty Servers</span></label>' +
                '<div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Min Players</label>' +
                '<input type="number" class="ff-input" id="ff-f-min" min="1" max="100" value="1" style="width:80px"></div>' +
                '<div><div style="display:flex;align-items:center;gap:8px"><label style="font-size:13px;font-weight:600">Server Region</label>' +
                '<button class="ff-btn ff-btn-sm" id="ff-nearest-btn" style="margin-left:auto">' + FluxIcons.get('map-pin', { size: 14 }) + ' Auto-detect</button></div>' +
                '<div style="max-height:240px;overflow-y:auto;margin-top:8px">' +
                '<div style="margin-bottom:10px"><div style="display:flex;flex-wrap:wrap;gap:4px"><div class="ff-region-chip ff-active" data-cc="">All Regions</div></div></div>' +
                groupsHTML + '</div></div>' +
                '<button class="ff-btn ff-btn-primary" id="ff-apply">Apply</button></div></div>';

            const regionList = modal.querySelector('#ff-region-list') || modal;

            // Chip click handler - select only one
            modal.querySelectorAll('.ff-region-chip').forEach(chip => {
                chip.addEventListener('click', function () {
                    modal.querySelectorAll('.ff-region-chip').forEach(c => c.classList.remove('ff-active'));
                    this.classList.add('ff-active');
                });
            });

            // Restore saved filter
            const savedCC = FluxStorage.get('serverregionfilter');
            if (savedCC) {
                const match = modal.querySelector('.ff-region-chip[data-cc="' + savedCC + '"]');
                if (match) {
                    modal.querySelectorAll('.ff-region-chip').forEach(c => c.classList.remove('ff-active'));
                    match.classList.add('ff-active');
                }
            }

            // Auto-detect: find the chip matching the user's country
            const nearestBtn = modal.querySelector('#ff-nearest-btn');
            nearestBtn.addEventListener('click', async () => {
                nearestBtn.disabled = true;
                nearestBtn.textContent = 'Detecting...';
                try {
                    const selfData = await FluxHttpClient.get('https://ip-api.com/json', { fields: 'countryCode' }, { cache: false });
                    if (selfData && selfData.countryCode) {
                        const cc = selfData.countryCode;
                        const match = modal.querySelector('.ff-region-chip[data-cc="' + cc + '"]');
                        if (match) {
                            modal.querySelectorAll('.ff-region-chip').forEach(c => c.classList.remove('ff-active'));
                            match.classList.add('ff-active');
                            FluxNotifications.show('Detected: ' + match.textContent, 'info', 3000);
                        } else {
                            FluxNotifications.show('No servers in your region yet', 'info', 3000);
                        }
                    } else {
                        FluxNotifications.show('Could not detect location', 'warning', 3000);
                    }
                } catch (e) {
                    FluxNotifications.show('Detection failed', 'warning', 3000);
                }
                nearestBtn.disabled = false;
                nearestBtn.innerHTML = FluxIcons.get('map-pin', { size: 14 }) + ' Auto-detect';
            });

            modal.querySelector('#ff-apply').addEventListener('click', async () => {
                const cc = modal.querySelector('.ff-region-chip.ff-active')?.dataset?.cc || '';
                applyRegionFilter(cc);
                close();
            });
        }, { width: '520px' });
    }

    function quickJoinRandom() {
        if (!allServers.length) {
            FluxNotifications.show('No servers loaded', 'warning');
            return;
        }
        const visible = allServers.filter(s => s.playing < s.maxPlayers);
        if (!visible.length) { FluxNotifications.show('No available servers', 'warning'); return; }
        const pick = visible[Math.floor(Math.random() * visible.length)];
        FluxNotifications.show('Joining random server...', 'info', 2000);
        FluxGamesAPI.joinServer(currentGameId, pick.id).catch(() => {});
    }

    function observeServerList() {
        const c = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
        if (!c || serverObserver) return;
        serverObserver = new MutationObserver(FluxUtils.debounce(() => {
            // Only fire after scan is fully done
            if (!regionScanDone) return;
            serverObserver.disconnect();
            serverObserver = null;
            renderServerCards(allServers);
            observeServerList();
        }, 400));
        serverObserver.observe(c, { childList: true, subtree: false });
    }

    async function init() {
        if (loaded) return;
        if (!FluxStorage.getBool('togglefilterserversbutton', true)) return;
        currentGameId = FluxGamesAPI.getCurrentGameId();
        if (!currentGameId) return;

        const container = await FluxUtils.watchForChild(
            '#game-instances, .tab-content, [class*="game-instances"]',
            '#rbx-public-game-server-item-container', 30000
        ).catch(() => null);
        if (!container) return;

        loaded = true;
        injectFilterButtons();
        observeServerList();

        if (FluxStorage.getBool('autoserverregions', true)) {
            scanAndCacheRegions();
        }
    }

    function destroy() {
        loaded = false;
        regionScanDone = false;
        allServers = [];
        if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }
        const ctrl = document.querySelector('.ff-server-controls');
        if (ctrl) ctrl.remove();
    }

    return { init, destroy };
})();

// ====== MODULE: enhancements (src/features/enhancements.js) ======
/**
 * FluxFind Enhancements Module
 * Implements all settings toggles: chat, friends, profile, search, sidebar, cards, terms, stats
 * Each feature has start/stop for live toggle without page reload.
 * Exported as 'init' so FluxApp.activateFeature() can call it.
 *
 * @module features/enhancements
 * @license GPL-2.0-only
 */

const FluxFeatureEnhancements = (() => {
    'use strict';

    const activeFeatures = new Set();

    /* ========== 1. Disable Chat Bar (observer-based removal, like original) ========== */
    let chatObserver = null, chatTimeout = null;

    function enableDisableChat() {
        if (!FluxStorage.getBool('disablechat')) { stopChat(); return; }
        if (activeFeatures.has('chat')) return;

        activeFeatures.add('chat');

        function removeChat() {
            const chat = document.getElementById('chat-container');
            if (chat) {
                chat.remove();
                FluxLogger.info('Chat bar removed');
                stopChatObserver();
                return true;
            }
            return false;
        }

        if (removeChat()) return;

        chatObserver = new MutationObserver(() => {
            const chat = document.getElementById('chat-container');
            if (chat) {
                chat.remove();
                FluxLogger.info('Chat bar removed (observer)');
                stopChatObserver();
            }
        });

        chatObserver.observe(document.body, { childList: true, subtree: true });

        // Safety timeout — stop watching after 15s
        chatTimeout = setTimeout(() => {
            stopChatObserver();
            FluxLogger.info('Chat removal observer timeout');
        }, 15000);
    }

    function stopChatObserver() {
        if (chatObserver) { chatObserver.disconnect(); chatObserver = null; }
        if (chatTimeout) { clearTimeout(chatTimeout);
            chatTimeout = null; }
    }

    function stopChat() {
        activeFeatures.delete('chat');
        stopChatObserver();
    }

    /* ========== 2. Smaller Roblox Sidebar ========== */
    let sidebarStyleEl = null;
    const SIDEBAR_CSS = `
        .rbx-left-col, .left-col, [class*="left-col"], .nav-column, #navigation, nav[class*="nav"] {
            width: 180px !important; min-width: 180px !important; flex: 0 0 180px !important;
        }
        .rbx-content, .content, [class*="content-col"], main[class*="content"] {
            margin-left: 180px !important;
        }
    `;

    function enableSmallerSidebar() {
        if (!FluxStorage.getBool('smallerrobloxsidebar')) { stopSidebar(); return; }
        if (activeFeatures.has('sidebar')) return;
        sidebarStyleEl = FluxDOM.injectStyleOnce('ff-smaller-sidebar', SIDEBAR_CSS);
        activeFeatures.add('sidebar');
        FluxLogger.info('Smaller sidebar applied');
    }
    function stopSidebar() {
        if (sidebarStyleEl) { sidebarStyleEl.remove();
            sidebarStyleEl = null; }
        activeFeatures.delete('sidebar');
    }

    /* ========== 3. Responsive Game Cards ========== */
    let cardsStyleEl = null;
    const CARDS_CSS = `
        .game-grid, [data-testid="game-grid"], .games-list, .game-cards-grid,
        .home-page-game-grid, [class*="game-grid"], [class*="games-container"] {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
            gap: 12px !important;
        }
    `;

    function enableResponsiveCards() {
        if (FluxStorage.getBool('responsivegamecards', true) === false) { stopCards(); return; }
        if (activeFeatures.has('cards')) return;
        cardsStyleEl = FluxDOM.injectStyleOnce('ff-responsive-cards', CARDS_CSS);
        activeFeatures.add('cards');
        FluxLogger.info('Responsive game cards applied');
    }
    function stopCards() {
        if (cardsStyleEl) { cardsStyleEl.remove();
            cardsStyleEl = null; }
        activeFeatures.delete('cards');
    }

    /* ========== 4. Restore Classic Terms ========== */
    const REPLACEMENTS = [
        ['Experience', 'Game'],
        ['Experiences', 'Games'],
        ['Avatar Shop', 'Catalog'],
        ['Marketplace', 'Catalog'],
        ['Creator Marketplace', 'Creator Catalog'],
    ];

    function enableClassicTerms() {
        if (!FluxStorage.getBool('restoreclassicterms')) { stopTerms(); return; }
        if (activeFeatures.has('terms')) return;
        activeFeatures.add('terms');
        walkAndReplace(document.body);
        _termsObserver = new MutationObserver(muts => {
            muts.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) walkAndReplace(node);
                });
            });
        });
        _termsObserver.observe(document.body, { childList: true, subtree: true });
        FluxLogger.info('Classic terms restoration active');
    }

    let _termsObserver = null;
    function stopTerms() {
        activeFeatures.delete('terms');
        if (_termsObserver) { _termsObserver.disconnect();
            _termsObserver = null; }
    }

    function walkAndReplace(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let node, count = 0;
        while ((node = walker.nextNode())) {
            let changed = false;
            let text = node.textContent;
            for (const [from, to] of REPLACEMENTS) {
                if (text.includes(from)) {
                    text = text.replace(new RegExp(from, 'g'), to);
                    changed = true;
                }
            }
            if (changed) { node.textContent = text; count++; }
        }
        if (count > 0) FluxLogger.info(`Classic terms: replaced ${count} text nodes`);
    }

    /* ========== 5. Better Friends Page ========== */
    let friendsObserver = null;
    function enableBetterFriends() {
        if (!FluxStorage.getBool('betterfriends')) { stopFriends(); return; }
        if (activeFeatures.has('friends')) return;
        activeFeatures.add('friends');
        enhanceFriendCards();
        friendsObserver = new MutationObserver(FluxUtils.debounce(enhanceFriendCards, 500));
        friendsObserver.observe(document.body, { childList: true, subtree: true });
        FluxLogger.info('Better friends: observing for friend tiles');
    }
    function stopFriends() {
        activeFeatures.delete('friends');
        if (friendsObserver) { friendsObserver.disconnect();
            friendsObserver = null; }
    }
    function enhanceFriendCards() {
        const tiles = document.querySelectorAll('.friends-carousel-tile');
        let enhanced = 0;
        tiles.forEach(tile => {
            if (tile.dataset.ffFriends) return;
            tile.dataset.ffFriends = '1';
            const hasGame = tile.querySelector('.icon-game') ||
                            tile.querySelector('[data-testid="presence-icon"].game');
            if (hasGame) {
                tile.style.boxShadow = '0 0 12px rgba(108,92,231,0.3)';
                tile.style.borderRadius = '8px';
                tile.style.transition = 'box-shadow 0.3s ease';
                enhanced++;
            }
        });
        if (enhanced > 0) FluxLogger.info(`Better friends: ${enhanced} online friends highlighted`);
    }

    /* ========== 6. Better Profile Info ========== */
    let profileObserver = null;
    async function enableBetterProfile() {
        if (!FluxStorage.getBool('betterprofileinfo')) { stopProfile(); return; }
        if (activeFeatures.has('profile')) return;
        activeFeatures.add('profile');
        await replaceProfileStats();
        profileObserver = new MutationObserver(FluxUtils.debounce(() => replaceProfileStats(), 800));
        profileObserver.observe(document.body, { childList: true, subtree: true });
    }
    function stopProfile() {
        activeFeatures.delete('profile');
        if (profileObserver) { profileObserver.disconnect();
            profileObserver = null; }
    }
    async function replaceProfileStats() {
        const profileMatch = window.location.pathname.match(/\/users\/(\d+)/);
        const targetId = profileMatch ? parseInt(profileMatch[1]) : null;
        if (!targetId) return;

        try {
            const stats = await FluxUsersAPI.getUserStats(targetId, 'smartsearch');
            if (!stats) return;

            const friendLinks = document.querySelectorAll('.flex-nowrap.gap-small a[href*="/friends"]');
            if (friendLinks.length >= 2) {
                const friendSpan = friendLinks[0].querySelector('span');
                if (friendSpan && !friendSpan.dataset.ffProfileReplaced) {
                    friendSpan.dataset.ffProfileReplaced = '1';
                    friendSpan.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px">${FluxIcons.get('users', { size: 14 })} ${(stats.friendCount || 0).toLocaleString()} Friends</span>`;
                }
                if (friendLinks[1]) {
                    const followerSpan = friendLinks[1].querySelector('span');
                    if (followerSpan && !followerSpan.dataset.ffProfileReplaced) {
                        followerSpan.dataset.ffProfileReplaced = '1';
                        followerSpan.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px">${FluxIcons.get('heart', { size: 14 })} ${(stats.followerCount || 0).toLocaleString()} Followers</span>`;
                    }
                }
                FluxLogger.info(`Better profile: stats replaced for user ${targetId}`);
            }
        } catch (e) { FluxLogger.info('Better profile: API failed', e); }
    }

    /* ========== 7. Smart Search ========== */
    let searchObserver = null;
    function enableSmartSearch() {
        if (!FluxStorage.getBool('smartsearch', true)) { stopSearch(); return; }
        if (activeFeatures.has('search')) return;
        activeFeatures.add('search');
        enhanceSearchDropdown();
        const searchContainer = document.querySelector('#navbar-search, .navbar-search, .searchbar, #global-header-search');
        if (searchContainer) {
            searchObserver = new MutationObserver(FluxUtils.debounce(enhanceSearchDropdown, 300));
            searchObserver.observe(searchContainer, { childList: true, subtree: true });
            FluxLogger.info('Smart search: observing search dropdown');
        } else {
            FluxLogger.info('Smart search: search container not found on this page');
        }
    }
    function stopSearch() {
        activeFeatures.delete('search');
        if (searchObserver) { searchObserver.disconnect();
            searchObserver = null; }
    }
    function enhanceSearchDropdown() {
        const options = document.querySelectorAll('.navbar-search-option, .new-navbar-search-anchor');
        const iconMap = {
            'Games': 'gamepad', 'in Games': 'gamepad',
            'People': 'user', 'in People': 'user',
            'Marketplace': 'copy', 'in Marketplace': 'copy',
            'Catalog': 'copy', 'in Catalog': 'copy',
            'Communities': 'users', 'in Communities': 'users',
            'Creator Store': 'download', 'in Creator Store': 'download'
        };

        let replaced = 0;
        options.forEach(link => {
            if (link.dataset.ffSearchEnhanced) return;
            link.dataset.ffSearchEnhanced = '1';
            const text = link.textContent.trim();
            const existingIcon = link.querySelector('.icon-menu-');
            if (existingIcon && existingIcon.parentNode) {
                const iconSpan = existingIcon.parentNode;
                if (!iconSpan.dataset.ffReplaced) {
                    iconSpan.dataset.ffReplaced = '1';
                    for (const [keyword, icon] of Object.entries(iconMap)) {
                        if (text.includes(keyword)) {
                            iconSpan.innerHTML = `<span style="display:inline-flex;vertical-align:middle;margin-right:4px">${FluxIcons.get(icon, { size: 14, color: 'var(--ff-text-muted)' })}</span>`;
                            replaced++;
                            break;
                        }
                    }
                }
            }
        });
        if (replaced > 0) FluxLogger.info(`Smart search: ${replaced} icons replaced`);
    }

    /* ========== 8. Quick Launch Games ========== */
    function enableQuickLaunch() {
        if (!FluxStorage.getBool('quicklaunchgames', true)) { stopQuickLaunch(); return; }
        if (activeFeatures.has('quicklaunch')) return;
        activeFeatures.add('quicklaunch');
        injectQuickLaunch();
    }
    function stopQuickLaunch() {
        activeFeatures.delete('quicklaunch');
        const panel = document.getElementById('ff-quick-launch');
        if (panel) panel.remove();
    }
    async function injectQuickLaunch() {
        if (document.getElementById('ff-quick-launch')) return;
        const homeGrid = document.querySelector('.home-page-game-grid, [data-testid="home-page-game-grid"]');
        if (!homeGrid) { FluxLogger.info('Quick launch: home grid not found'); return; }

        const userId = FluxUsersAPI.getCurrentUserId();
        if (!userId) { FluxLogger.info('Quick launch: no user ID'); return; }

        try {
            const favGames = await FluxGamesAPI.getFavoriteGames(userId);
            if (!favGames || favGames.length < 3) { FluxLogger.info('Quick launch: not enough favorite games'); return; }

            const panel = FluxDOM.el('div', { id: 'ff-quick-launch' });
            panel.innerHTML = `<h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:var(--ff-text-primary)">${FluxIcons.get('zap', { size: 14 })} Quick Launch</h3>`;
            const btnContainer = FluxDOM.el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });

            favGames.slice(0, 6).forEach(game => {
                const btn = FluxDOM.el('button', {
                    className: 'ff-btn ff-btn-sm',
                    onclick: () => { window.location.href = `${FluxConstants.API.ROBLOX_BASE}/games/${game.placeId || game.rootPlaceId}`; }
                });
                btn.textContent = FluxSanitizer.truncate(game.name || 'Game', 24);
                btnContainer.appendChild(btn);
            });

            panel.appendChild(btnContainer);
            homeGrid.parentNode.insertBefore(panel, homeGrid);
            FluxLogger.info(`Quick launch: ${favGames.slice(0, 6).length} games added`);
        } catch (e) { FluxLogger.info('Quick launch: failed', e); }
    }

    /* ========== 9. Better Game Stats ========== */
    function enableBetterGameStats() {
        if (!FluxStorage.getBool('bettergamestats', true)) { stopGameStats(); return; }
        if (activeFeatures.has('gamestats')) return;
        activeFeatures.add('gamestats');
        injectGameVotes();
    }
    function stopGameStats() {
        activeFeatures.delete('gamestats');
        const badge = document.getElementById('ff-vote-badge');
        if (badge) badge.remove();
    }
    async function injectGameVotes() {
        if (document.getElementById('ff-vote-badge')) return;
        const gameMatch = window.location.pathname.match(/\/games\/(\d+)/);
        if (!gameMatch) { FluxLogger.info('Game stats: not on a game page'); return; }
        const gameId = parseInt(gameMatch[1]);
        if (!gameId) return;

        try {
            const universeId = await FluxGamesAPI.getUniverseId(gameId);
            const votes = await FluxGamesAPI.getGameVotes(universeId);
            if (!votes) return;

            const statContainer = document.querySelector('.game-stat, .game-stats-container, [class*="game-stats"], .game-details-info');
            if (!statContainer) return;

            const badge = FluxDOM.el('div', {
                id: 'ff-vote-badge', className: 'ff-badge',
                style: 'margin-left:8px;display:inline-flex'
            });
            const ratio = votes.downVotes > 0 ? (votes.upVotes / (votes.upVotes + votes.downVotes) * 100).toFixed(0) : 100;
            badge.innerHTML = `${FluxIcons.get('star', { size: 12 })} ${ratio}% (${(votes.upVotes || 0).toLocaleString()} likes)`;
            statContainer.appendChild(badge);
            FluxLogger.info(`Game stats: ${ratio}% ratio badge added`);
        } catch (e) { FluxLogger.info('Game stats: failed', e); }
    }

    /* ========== Init ========== */

    function init() {
        FluxLogger.info('Enhancements module: applying all settings');

        enableDisableChat();
        enableSmallerSidebar();
        enableResponsiveCards();
        enableClassicTerms();
        enableBetterFriends();
        enableSmartSearch();

        setTimeout(() => {
            enableBetterProfile();
            enableQuickLaunch();
            enableBetterGameStats();
        }, 1000);
    }

    function applySingleSetting(key, value) {
        FluxLogger.info(`Enhancements: ${key}=${value}`);
        const handlers = {
            disablechat: enableDisableChat,
            smallerrobloxsidebar: enableSmallerSidebar,
            responsivegamecards: enableResponsiveCards,
            restoreclassicterms: enableClassicTerms,
            betterfriends: enableBetterFriends,
            betterprofileinfo: enableBetterProfile,
            smartsearch: enableSmartSearch,
            quicklaunchgames: enableQuickLaunch,
            bettergamestats: enableBetterGameStats,
        };
        if (handlers[key]) handlers[key]();
    }

    return {
        init, applySingleSetting,
        enableDisableChat, stopChat,
        enableSmallerSidebar, stopSidebar,
        enableResponsiveCards, stopCards,
        enableClassicTerms, stopTerms,
        enableBetterFriends, stopFriends,
        enableBetterProfile, stopProfile,
        enableSmartSearch, stopSearch,
        enableQuickLaunch, stopQuickLaunch,
        enableBetterGameStats, stopGameStats
    };
})();

// ====== MODULE: app (src/app.js) ======
/**
 * FluxFind Application Core
 * Simple init sequence: run features once, then retry server-browser until DOM exists
 *
 * @module app
 * @license GPL-2.0-only
 */
const FluxApp = (() => {
    'use strict';
    let initialized = false;

    function init() {
        if (initialized) return;
        initialized = true;

        FluxLogger.init();
        FluxLogger.info(`FluxFind v${FluxConstants.VERSION} initializing...`);

        FluxStorage.migrateLegacy();
        FluxStorage.initDefaults(FluxConstants.DEFAULT_SETTINGS);
        FluxStyles.injectAll();

        injectSettingsButton();
        FluxRouter.start(handleRouteChange);

        // Always-on features: run once
        if (FluxStorage.getBool('removeads', true)) {
            FluxFeatureAdRemover.start();
        }
        FluxFeatureEnhancements.init();

        // Server browser: needs server list DOM which renders async
        scheduleServerBrowser();

        FluxLogger.info('FluxFind initialized');
    }

    /** Retry server browser until its container appears (up to 30s) */
    function scheduleServerBrowser() {
        let attempts = 0;
        const maxAttempts = 30;
        const retry = () => {
            attempts++;
            if (!FluxStorage.getBool('togglefilterserversbutton', true)) return;
            // Re-call init each time (it resets internal flags and waits for DOM)
            FluxFeatureServerBrowser.init().catch(() => {});
            if (attempts < maxAttempts) {
                setTimeout(retry, 1000);
            } else {
                FluxLogger.info('Server browser: max retries reached');
            }
        };
        retry();
    }

    function handleRouteChange(newPage, oldPage) {
        if (newPage === oldPage) return;
        FluxLogger.info(`Route: ${oldPage || 'init'} -> ${newPage}`);

        // On game/servers page, re-trigger server browser
        if (newPage === 'servers' || newPage === 'game') {
            if (FluxStorage.getBool('togglefilterserversbutton', true)) {
                FluxFeatureServerBrowser.init().catch(() => {});
            }
        }
    }

    function injectSettingsButton() {
        const addButton = FluxUtils.once(() => {
            const btn = FluxDOM.el('button', {
                id: 'fluxfind-settings-btn',
                onclick: () => FluxSettingsPanel.open(),
                title: 'FluxFind Settings'
            });
            btn.innerHTML = FluxIcons.get('settings', { size: 20, color: '#fff' });
            document.body.appendChild(btn);
        });
        addButton();
    }

    function applySettings(key) {
        // Re-run server browser on toggle
        if (key === 'togglefilterserversbutton') {
            scheduleServerBrowser();
        }
    }

    return { init, applySettings };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', FluxApp.init);
} else {
    FluxApp.init();
}

// ====== FLUXFIND INITIALIZATION COMPLETE ======
// Auto-initialization is handled by FluxApp module
// Total modules: 22, JS lines: 3762
