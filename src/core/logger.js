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