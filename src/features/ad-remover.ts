import { FluxUtils } from '../core/utils';
import { FluxLogger } from '../core/logger';
import { FluxStorage } from '../core/storage';

export interface AdRemoverStats {
  blockedSession: number;
  blockedTotal: number;
}

export const FluxFeatureAdRemover = ((): {
  start: () => void;
  stop: () => void;
  removeAds: () => void;
  getStats: () => AdRemoverStats;
  resetStats: () => void;
} => {
  let observer: MutationObserver | null = null;
  let enabled = false;
  let blockedSession = 0;

  const AD_SELECTORS = [
    '[data-testid="home-page-game-grid"] > div:last-child',
    '.game-promotion-section', '.ad-container', '[class*="ad-"]',
    '[class*="promotion"]', '.home-page-ad', '[data-promotion-type]',
    '#game-grid-sponsored',
  ];

  const selector = AD_SELECTORS.join(',');

  function getTotalBlocked(): number {
    return FluxStorage.getNumber('adBlockedTotal', 0);
  }

  function incrementTotal(count: number): void {
    const current = getTotalBlocked();
    FluxStorage.set('adBlockedTotal', current + count);
  }

  function removeAds(): void {
    if (!enabled) return;
    const ads = document.querySelectorAll(selector);
    let removed = 0;
    for (const ad of ads) {
      const el = ad as HTMLElement;
      const prevDisplay = el.style.display;
      el.remove();
      removed++;
      FluxLogger.debug('AdRemover', `Removed ad element: ${el.tagName}.${el.className.split(' ')[0] ?? '?'} (was ${prevDisplay || 'visible'})`);
    }

    if (removed > 0) {
      blockedSession += removed;
      incrementTotal(removed);
      FluxLogger.info('AdRemover', `Blocked ${String(removed)} ads (session: ${String(blockedSession)}, total: ${String(getTotalBlocked())})`);
    }
  }

  const debouncedRemove = FluxUtils.debounce(removeAds, 300, true);

  function start(): void {
    if (enabled) return;
    FluxLogger.info('AdRemover', 'Starting ad blocker...');
    enabled = true;
    blockedSession = 0;

    // Load persisted total
    const total = getTotalBlocked();
    FluxLogger.info('AdRemover', `Loaded stats: ${String(total)} ads blocked total (lifetime)`);

    removeAds();
    observer = new MutationObserver(() => { debouncedRemove(); });
    observer.observe(document.body, { childList: true, subtree: true });
    FluxLogger.info('AdRemover', 'Ad blocker active — observing DOM mutations');
  }

  function stop(): void {
    if (!enabled) return;
    FluxLogger.info('AdRemover', `Stopping ad blocker (session blocked: ${String(blockedSession)})`);
    enabled = false;
    if (observer !== null) { observer.disconnect(); observer = null; }
  }

  function getStats(): AdRemoverStats {
    return {
      blockedSession,
      blockedTotal: getTotalBlocked(),
    };
  }

  function resetStats(): void {
    FluxLogger.info('AdRemover', 'Resetting ad block stats');
    blockedSession = 0;
    FluxStorage.set('adBlockedTotal', 0);
  }

  return { start, stop, removeAds, getStats, resetStats };
})();