import { FluxLogger } from './core/logger';
import { FluxStorage } from './core/storage';
import { FluxConstants } from './config/constants';
import { FluxDOM } from './core/dom';
import { FluxIcons } from './ui/icons';
import { FluxRouter } from './features/url-router';
import { FluxSettingsPanel } from './ui/settings-panel';
import { FluxFeatureAdRemover } from './features/ad-remover';
import { FluxFeatureServerBrowser } from './features/server-browser';
import { FluxFeatureSmartSearch } from './features/smart-search';

type PageHandler = 'servers' | 'game' | 'home' | 'profile' | 'search' | 'unknown';

export const FluxApp = ((): { init: () => void } => {
  let initialized = false;

  function init(): void {
    if (initialized) return;
    initialized = true;

    FluxLogger.init();
    FluxLogger.info('App', 'FluxFind v' + FluxConstants.VERSION + ' initializing...');

    FluxStorage.migrateLegacy();
    FluxStorage.initDefaults(FluxConstants.DEFAULT_SETTINGS);

    // Inject core CSS via GM_addStyle
    injectCoreStyles();

    injectSettingsButton();

    FluxRouter.start((newPage: PageHandler) => {
      FluxLogger.info('App', `Page navigation: ${newPage}`);
      if (newPage === 'servers' || newPage === 'game') {
        FluxFeatureServerBrowser.init().catch((e: unknown) => {
          FluxLogger.warn('App', `ServerBrowser init failed: ${String(e)}`);
        });
      }
    });

    FluxFeatureAdRemover.start();
    FluxFeatureSmartSearch.start();
    applyStoredSettings();
    scheduleServerBrowser();

    FluxLogger.info('App', 'FluxFind initialized successfully');
  }

  function applyStoredSettings(): void {
    // Re-apply settings that require DOM changes on page load
    if (FluxStorage.getBool('forcedarkmode', false)) {
      document.documentElement.classList.add('ff-dark-mode');
      document.body.style.setProperty('background-color', 'var(--ff-bg-primary)', 'important');
    }
    if (FluxStorage.getBool('disablechat', false)) {
      GM_addStyle('#chat-container, .chat-main, [class*="chat-container"], [data-testid*="chat"] { display: none !important; }');
      FluxLogger.debug('App', 'Chat hidden via CSS injection');
    }
    if (FluxStorage.getBool('removeads', true)) {
      FluxFeatureAdRemover.start();
    }
  }

  function injectCoreStyles(): void {
    // CSS is injected at build time by build.ts from src/ui/css/*.css files
    // The placeholder below is replaced with actual CSS content during bundling
    const css = `/* FLUXFIND_CSS_PLACEHOLDER */`;
    GM_addStyle(css);
  }

  function injectSettingsButton(): void {
    if (document.getElementById('fluxfind-settings-btn') !== null) return;
    const btn = FluxDOM.el('button', {
      id: 'fluxfind-settings-btn',
      onclick: () => { FluxSettingsPanel.open(); },
      title: 'FluxFind Settings',
    });
    btn.innerHTML = FluxIcons.get('settings', { size: 20, color: '#fff' });
    document.body.appendChild(btn);
  }

  function scheduleServerBrowser(): void {
    let attempts = 0;
    const maxAttempts = 30;
    const retry = (): void => {
      attempts++;
      if (!FluxStorage.getBool('togglefilterserversbutton', true)) return;
      FluxFeatureServerBrowser.init().catch(() => { /* ignore */ });
      if (attempts < maxAttempts) setTimeout(retry, 1000);
    };
    retry();
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FluxApp.init);
} else {
  FluxApp.init();
}