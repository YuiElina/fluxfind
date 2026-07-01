import { FluxLogger } from './core/logger';
import { FluxStorage } from './core/storage';
import { FluxConstants } from './config/constants';
import { FluxDOM } from './core/dom';
import { FluxIcons } from './ui/icons';
import { FluxRouter } from './features/url-router';
import { FluxSettingsPanel } from './ui/settings-panel';
import { FluxFeatureAdRemover } from './features/ad-remover';
import { FluxFeatureServerBrowser } from './features/server-browser';

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
    scheduleServerBrowser();

    FluxLogger.info('App', 'FluxFind initialized successfully');
  }

  function injectCoreStyles(): void {
    const css = `
      :root {
        --ff-bg-primary: #1f1f1f; --ff-bg-secondary: #252525; --ff-bg-tertiary: #2a2a2a;
        --ff-bg-hover: #333333; --ff-border: #404040; --ff-border-light: #505050;
        --ff-text-primary: #e8e8e8; --ff-text-secondary: #b0b0b0; --ff-text-muted: #888888;
        --ff-accent: #6C5CE7; --ff-accent-hover: #7C6CF7;
        --ff-success: #4CAF50; --ff-error: #F44336; --ff-warning: #FF9800;
        --ff-radius-sm: 6px; --ff-radius-md: 8px; --ff-radius-lg: 12px; --ff-radius-xl: 20px;
        --ff-shadow: 0 4px 16px rgba(0,0,0,0.3); --ff-shadow-lg: 0 8px 32px rgba(0,0,0,0.4);
        --ff-transition: 0.15s ease; --ff-transition-slow: 0.25s ease;
      }
      .ff-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--ff-radius-sm); font: 500 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; cursor: pointer; border: 1px solid var(--ff-border); background: var(--ff-bg-tertiary); color: var(--ff-text-primary); transition: background var(--ff-transition), border-color var(--ff-transition); outline: none; white-space: nowrap; line-height: 1.2; }
      .ff-btn:hover { background: var(--ff-bg-hover); border-color: var(--ff-border-light); }
      .ff-btn:active { transform: scale(0.97); }
      .ff-btn.ff-btn-primary { background: var(--ff-accent); border-color: var(--ff-accent); color: #fff; }
      .ff-btn.ff-btn-primary:hover { background: var(--ff-accent-hover); }
      .ff-btn.ff-btn-danger { border-color: var(--ff-error); color: var(--ff-error); }
      .ff-btn-sm { padding: 4px 10px; font-size: 12px; }
      .ff-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: var(--ff-accent); color: #fff; line-height: 1.4; }
      .ff-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid var(--ff-border); background: var(--ff-bg-secondary); color: var(--ff-text-secondary); margin-left: 8px; }
      .ff-tag.ff-tag-purple { border-color: var(--ff-accent); color: var(--ff-accent); background: rgba(108,92,231,0.1); }
      .ff-region-chip { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--ff-border); background: transparent; color: var(--ff-text-secondary); transition: all 0.15s ease; user-select: none; }
      .ff-region-chip:hover { border-color: var(--ff-accent); background: rgba(108,92,231,0.1); color: var(--ff-text-primary); }
      .ff-region-chip.ff-active { border-color: var(--ff-accent); background: var(--ff-accent); color: #fff; }
      .ff-overflow-badge { position: absolute; bottom: -4px; right: -4px; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 11px; background: var(--ff-accent); color: #fff; font-size: 11px; font-weight: 700; line-height: 22px; text-align: center; border: 2px solid var(--ff-bg-primary, #fff); z-index: 2; pointer-events: none; }
      .ff-toggle-wrapper { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; padding: 6px 0; }
      .ff-toggle-input { display: none; }
      .ff-toggle-track { position: relative; width: 44px; height: 24px; border-radius: 12px; background: #555; flex-shrink: 0; transition: background 0.25s ease; }
      .ff-toggle-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
      .ff-toggle-input:checked + .ff-toggle-track { background: var(--ff-accent); }
      .ff-toggle-input:checked + .ff-toggle-track .ff-toggle-knob { transform: translateX(20px); }
      .ff-toggle-label { font-size: 13px; font-weight: 500; color: var(--ff-text-primary); line-height: 1.3; }
      .ff-server-controls { display: flex; gap: 8px; margin-bottom: 12px; padding: 0 4px; flex-wrap: wrap; }
      .player-thumbnails-container .player-avatar { position: relative; }
      .card-item-public-server { border-radius: 12px !important; overflow: hidden; transition: transform 0.15s ease, box-shadow 0.15s ease; display: flex; flex-direction: column; min-height: 200px; }
      .card-item-public-server:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
      .rbx-public-game-server-details { padding: 4px 10px 10px 10px; flex: 1; }
      .player-thumbnails-container { padding: 8px 4px 4px 4px; display: flex !important; flex-wrap: wrap; justify-content: center !important; align-items: center; gap: 4px; width: 100%; max-width: 100%; align-self: center; min-height: 60px; }
      .player-thumbnails-container .avatar-ghost { opacity: 0.35; }
      .avatar-ghost .thumbnail-2d-container { display: flex; align-items: center; justify-content: center; }
      #rbx-public-game-server-item-container { display: flex; flex-wrap: wrap; }
      .stack .card-list .card-item .player-thumbnails-container { -ms-flex-wrap: wrap; flex-wrap: wrap; -ms-flex-pack: start; justify-content: center !important; -ms-flex-item-align: center; align-self: center; gap: 6px; max-width: 192px; display: -ms-flexbox; display: flex; }
      .card-item.card-item-friends-server { border-radius: 12px; }
      #ff-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 999999; display: none; flex-direction: column; justify-content: center; align-items: center; gap: 16px; }
      .ff-modal-overlay-active { display: flex !important; }
      @keyframes ff-popIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      @keyframes ff-fadeIn { from { opacity: 0; } to { opacity: 1; } }
      #fluxfind-settings-btn { position: fixed; bottom: 20px; right: 20px; z-index: 99999; border-radius: 50%; width: 44px; height: 44px; padding: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(108,92,231,0.4); background: var(--ff-accent); border: none; cursor: pointer; }
    `;
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