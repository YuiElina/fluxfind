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
import { darkModeAtom, chatDisabledAtom, removeAdsAtom, smartSearchAtom, debugLogsAtom } from './state/atoms';

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

    // Reactive state subscriptions
    darkModeAtom.subscribe((v) => {
      if (v) {
        document.documentElement.classList.add('ff-dark-mode');
        document.body.style.setProperty('background-color', 'var(--ff-bg-primary)', 'important');
      } else {
        document.documentElement.classList.remove('ff-dark-mode');
        document.body.style.removeProperty('background-color');
      }
    });

    chatDisabledAtom.subscribe((v) => {
      if (v) {
        if (!document.getElementById('ff-disable-chat')) {
          const style = document.createElement('style');
          style.id = 'ff-disable-chat';
          style.textContent = '#chat-container, .chat-main, [class*="chat-container"], [data-testid*="chat"] { display: none !important; }';
          document.head.appendChild(style);
        }
      } else {
        document.getElementById('ff-disable-chat')?.remove();
      }
    });

    removeAdsAtom.subscribe((v) => {
      if (v) FluxFeatureAdRemover.start();
      else FluxFeatureAdRemover.stop();
    });

    smartSearchAtom.subscribe((v) => {
      if (v) FluxFeatureSmartSearch.start();
      else FluxFeatureSmartSearch.stop();
    });

    debugLogsAtom.subscribe((_v) => {
      FluxLogger.init(); // re-init logger with updated settings
    });

    // Apply initial state
    applyInitialSettings();
    scheduleServerBrowser();

    FluxLogger.info('App', 'FluxFind initialized successfully');
  }

  function applyInitialSettings(): void {
    if (darkModeAtom.get()) {
      document.documentElement.classList.add('ff-dark-mode');
      document.body.style.setProperty('background-color', 'var(--ff-bg-primary)', 'important');
    }
    if (chatDisabledAtom.get()) {
      const style = document.createElement('style');
      style.id = 'ff-disable-chat';
      style.textContent = '#chat-container, .chat-main, [class*="chat-container"], [data-testid*="chat"] { display: none !important; }';
      document.head.appendChild(style);
    }
    if (removeAdsAtom.get()) FluxFeatureAdRemover.start();
    if (smartSearchAtom.get()) FluxFeatureSmartSearch.start();
  }

  function injectCoreStyles(): void {
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