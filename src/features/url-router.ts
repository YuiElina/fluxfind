import { FluxConstants } from '../config/constants';
import { FluxLogger } from '../core/logger';

type PageHandler = 'servers' | 'game' | 'home' | 'profile' | 'search' | 'unknown';

export const FluxRouter = ((): {
  start: (callback: (newPage: PageHandler, oldPage: PageHandler | null) => void) => void;
  stop: () => void;
  detectPage: () => PageHandler;
} => {
  let lastPath = '';
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function detectPage(): PageHandler {
    const path = window.location.pathname;
    const url = window.location.href;

    if (FluxConstants.URL_PATTERNS.SERVERS_PAGE.test(url)) return 'servers';
    if (FluxConstants.URL_PATTERNS.GAME_PAGE.test(path)) return 'game';
    if (FluxConstants.URL_PATTERNS.HOME_PAGE.test(path) || path === '/home') return 'home';
    if (FluxConstants.URL_PATTERNS.PROFILE_PAGE.test(path)) return 'profile';
    if (FluxConstants.URL_PATTERNS.SEARCH_PAGE.test(path)) return 'search';
    return 'unknown';
  }

  function start(callback: (newPage: PageHandler, oldPage: PageHandler | null) => void): void {
    if (intervalId !== null) return;
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

  function stop(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { start, stop, detectPage };
})();