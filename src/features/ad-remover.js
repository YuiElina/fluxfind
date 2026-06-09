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