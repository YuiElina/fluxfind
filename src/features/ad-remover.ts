import { FluxUtils } from '../core/utils';
import { FluxLogger } from '../core/logger';

export const FluxFeatureAdRemover = ((): {
  start: () => void;
  stop: () => void;
  removeAds: () => void;
} => {
  let observer: MutationObserver | null = null;
  let enabled = false;

  const AD_SELECTORS = [
    '[data-testid="home-page-game-grid"] > div:last-child',
    '.game-promotion-section', '.ad-container', '[class*="ad-"]',
    '[class*="promotion"]', '.home-page-ad', '[data-promotion-type]',
    '#game-grid-sponsored',
  ];

  const selector = AD_SELECTORS.join(',');

  function removeAds(): void {
    if (!enabled) return;
    const ads = document.querySelectorAll(selector);
    let removed = 0;
    for (const ad of ads) { ad.remove(); removed++; }
    if (removed > 0) FluxLogger.debug(`Removed ${String(removed)} ad elements`);
  }

  const debouncedRemove = FluxUtils.debounce(removeAds, 300, true);

  function start(): void {
    if (enabled) return;
    FluxLogger.info('Ad remover started');
    enabled = true;
    removeAds();
    observer = new MutationObserver(() => { debouncedRemove(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stop(): void {
    if (!enabled) return;
    enabled = false;
    if (observer !== null) { observer.disconnect(); observer = null; }
  }

  return { start, stop, removeAds };
})();