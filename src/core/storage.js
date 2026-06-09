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