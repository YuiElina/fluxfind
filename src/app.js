/**
 * FluxFind Application Core
 * Main entry point - initializes all modules, manages feature lifecycle, handles URL routing
 *
 * @module app
 * @license GPL-2.0-only
 */

const FluxApp = (() => {
    'use strict';

    let initialized = false;
    let currentPage = null;

    // Feature registry with lazy activation
    const FEATURES = {
        adRemover: {
            module: FluxFeatureAdRemover,
            initKey: 'removeads',
            initDefault: true
        },
        serverBrowser: {
            module: FluxFeatureServerBrowser,
            initKey: 'togglefilterserversbutton',
            initDefault: true,
            pages: ['servers', 'game']
        }
    };

    const activeFeatures = new Set();

    function init() {
        if (initialized) return;
        initialized = true;

        FluxLogger.init();
        FluxLogger.info(`FluxFind v${FluxConstants.VERSION} initializing...`);

        // Migrate legacy settings first
        FluxStorage.migrateLegacy();

        // Initialize default settings if missing
        FluxStorage.initDefaults(FluxConstants.DEFAULT_SETTINGS);

        // Inject core styles
        FluxStyles.injectAll();

        // Add settings button to the page
        injectSettingsButton();

        // Start watching URL changes
        FluxRouter.start(handleRouteChange);

        // Activate initial features based on current page
        const page = FluxRouter.detectPage();
        handleRouteChange(page, null);

        // Apply global features
        activateGlobalFeatures();

        FluxLogger.info('FluxFind initialized successfully');
        FluxNotifications.show('FluxFind ready', 'success', 2000);
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

    function handleRouteChange(newPage, oldPage) {
        if (newPage === oldPage) return;
        FluxLogger.debug(`Page changed: ${oldPage} -> ${newPage}`);
        currentPage = newPage;

        // Deactivate page-specific features from old page
        if (oldPage) deactivatePageFeatures(oldPage);

        // Activate features for new page
        activatePageFeatures(newPage);
    }

    function activatePageFeatures(page) {
        for (const [name, config] of Object.entries(FEATURES)) {
            if (config.pages && config.pages.includes(page)) {
                if (FluxStorage.getBool(config.initKey, config.initDefault)) {
                    activateFeature(name, config);
                }
            }
        }

        // Page-specific initialization
        switch (page) {
            case 'servers':
            case 'game':
                if (FluxStorage.getBool('togglefilterserversbutton', true)) {
                    FluxFeatureServerBrowser.init();
                }
                break;
            case 'home':
                FluxLogger.debug('Home page detected');
                break;
        }
    }

    function deactivatePageFeatures(page) {
        activeFeatures.forEach(name => {
            const config = FEATURES[name];
            if (config && config.pages && !config.pages.includes(currentPage)) {
                deactivateFeature(name, config);
            }
        });
    }

    function activateGlobalFeatures() {
        // Ad remover runs on all pages
        if (FluxStorage.getBool('removeads', true)) {
            activateFeature('adRemover', FEATURES.adRemover);
        }
    }

    function activateFeature(name, config) {
        if (activeFeatures.has(name)) return;
        FluxLogger.debug(`Activating feature: ${name}`);
        if (config.module && typeof config.module.init === 'function') {
            config.module.init();
        } else if (config.module && typeof config.module.start === 'function') {
            config.module.start();
        }
        activeFeatures.add(name);
    }

    function deactivateFeature(name, config) {
        if (!activeFeatures.has(name)) return;
        FluxLogger.debug(`Deactivating feature: ${name}`);
        if (config.module && typeof config.module.destroy === 'function') {
            config.module.destroy();
        } else if (config.module && typeof config.module.stop === 'function') {
            config.module.stop();
        }
        activeFeatures.delete(name);
    }

    function applySettings(key, value) {
        FluxLogger.debug(`Settings changed: ${key} -> ${value}`);

        const settingsToFeatures = {
            removeads: 'adRemover',
            togglefilterserversbutton: 'serverBrowser'
        };

        const featureName = settingsToFeatures[key];
        if (featureName && FEATURES[featureName]) {
            if (value) {
                activateFeature(featureName, FEATURES[featureName]);
            } else {
                deactivateFeature(featureName, FEATURES[featureName]);
            }
        }

        // Handle UI settings immediately
        if (key === 'forcedarkmode' || key === 'smallerrobloxsidebar') {
            FluxNotifications.show('Setting applied. Refresh for full effect.', 'info', 3000);
        }
    }

    function getCurrentPage() {
        return currentPage;
    }

    return {
        init,
        applySettings,
        getCurrentPage,
        handleRouteChange
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', FluxApp.init);
} else {
    FluxApp.init();
}