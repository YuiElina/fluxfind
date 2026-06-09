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