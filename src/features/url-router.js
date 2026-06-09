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
        lastPath = window.location.pathname + window.location.search;

        intervalId = setInterval(() => {
            const currentPath = window.location.pathname + window.location.search;
            if (currentPath !== lastPath) {
                const oldPage = detectPageBasedOnPath(lastPath);
                lastPath = currentPath;
                const newPage = detectPage();
                FluxLogger.debug(`Route changed: ${oldPage} -> ${newPage}`);
                callback(newPage, oldPage);
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