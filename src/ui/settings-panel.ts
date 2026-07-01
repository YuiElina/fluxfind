import { FluxIcons } from './icons';
import { FluxStorage } from '../core/storage';
import { FluxModals } from './modals';
import { FluxLogger } from '../core/logger';
import { FluxFeatureAdRemover } from '../features/ad-remover';

export const FluxSettingsPanel = ((): { open: () => void } => {
  function open(): void {
    FluxLogger.info('Settings', 'Opening settings panel');

    const stats = FluxFeatureAdRemover.getStats();

    FluxModals.custom((modal, close) => {
      modal.innerHTML =
        '<div style="padding:24px">' +
        '<h3 style="margin:0 0 16px;font-size:18px;display:flex;align-items:center;gap:8px">' + FluxIcons.get('settings', { size: 20 }) + ' FluxFind Settings</h3>' +
        '<div style="display:flex;flex-direction:column;gap:12px">' +
        toggleRow('togglefilterserversbutton', 'Server Filters', 'Show filter controls on game server pages') +
        toggleRow('autoserverregions', 'Auto Region Scan', 'Automatically fetch server locations') +
        toggleRow('removeads', 'Remove Ads', 'Remove promotional content from pages') +
        toggleRow('responsivegamecards', 'Responsive Cards', 'Make game cards adapt to screen width') +
        toggleRow('forcedarkmode', 'Dark Mode', 'Override page theme to dark') +
        toggleRow('smartsearch', 'Smart Search', 'Enhanced search suggestions') +
        toggleRow('disablechat', 'Disable Chat', 'Remove the chat sidebar') +
        toggleRow('enableLogs', 'Debug Logs', 'Show FluxFind logs in console') +
        '</div>' +
        '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--ff-border)">' +
        '<h4 style="margin:0 0 10px;font-size:14px">' + FluxIcons.get('barChart', { size: 14 }) + ' Statistics</h4>' +
        '<div style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--ff-text-secondary)">' +
        '<div style="display:flex;justify-content:space-between"><span>Ads blocked this session:</span><strong>' + String(stats.blockedSession) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between"><span>Ads blocked (total):</span><strong>' + String(stats.blockedTotal) + '</strong></div>' +
        '</div>' +
        '<button id="ff-reset-stats" class="ff-btn ff-btn-sm ff-btn-danger" style="margin-top:8px;width:100%">' + FluxIcons.get('trash', { size: 14 }) + ' Reset Stats</button>' +
        '</div>' +
        '<div style="margin-top:16px;display:flex;justify-content:flex-end">' +
        '<button class="ff-btn ff-btn-primary" id="ff-close-settings">Close</button>' +
        '</div></div>';

      const closeBtn = modal.querySelector('#ff-close-settings');
      if (closeBtn) closeBtn.addEventListener('click', () => {
        FluxLogger.debug('Settings', 'Settings panel closed');
        close();
      });

      const resetBtn = modal.querySelector('#ff-reset-stats');
      if (resetBtn) resetBtn.addEventListener('click', () => {
        FluxFeatureAdRemover.resetStats();
        FluxLogger.info('Settings', 'Ad block stats reset');

        // Update displayed stats
        const updatedStats = FluxFeatureAdRemover.getStats();
        const sessionEl = modal.querySelector('.ff-stats-session');
        const totalEl = modal.querySelector('.ff-stats-total');
        if (sessionEl) sessionEl.textContent = String(updatedStats.blockedSession);
        if (totalEl) totalEl.textContent = String(updatedStats.blockedTotal);
      });

      // Wire real-time toggle listeners
      modal.querySelectorAll('.ff-toggle-input').forEach(input => {
        input.addEventListener('change', function (this: HTMLInputElement) {
          const key = this.dataset.key;
          if (!key) return;
          const checked = this.checked;
          FluxStorage.setBool(key, checked);
          FluxLogger.info('Settings', `Toggle changed: ${key} = ${String(checked)}`);

          // Apply changes in real-time without page refresh
          applySettingChange(key, checked);
        });
      });

      // Add stats span classes for live updates
      const statsRows = modal.querySelectorAll('.ff-stats-session, .ff-stats-total');
      if (statsRows.length === 0) {
        const strongEls = modal.querySelectorAll('[style*="justify-content:space-between"] strong');
        if (strongEls[0]) strongEls[0].classList.add('ff-stats-session');
        if (strongEls[1]) strongEls[1].classList.add('ff-stats-total');
      }
    });
  }

  function applySettingChange(key: string, value: boolean): void {
    switch (key) {
      case 'forcedarkmode': {
        if (value) {
          document.documentElement.classList.add('ff-dark-mode');
          document.body.style.setProperty('background-color', 'var(--ff-bg-primary)', 'important');
          FluxLogger.debug('Settings', 'Dark mode applied to body');
        } else {
          document.documentElement.classList.remove('ff-dark-mode');
          document.body.style.removeProperty('background-color');
          FluxLogger.debug('Settings', 'Dark mode removed from body');
        }
        break;
      }
      case 'disablechat': {
        const chatContainer = document.querySelector('#chat-container, .chat-main, [class*="chat"]');
        if (chatContainer instanceof HTMLElement) {
          chatContainer.style.display = value ? 'none' : '';
          FluxLogger.debug('Settings', `Chat sidebar: ${value ? 'hidden' : 'shown'}`);
        } else {
          FluxLogger.warn('Settings', 'Chat container not found — cannot toggle visibility in real-time');
        }
        break;
      }
      case 'removeads': {
        if (value) {
          FluxFeatureAdRemover.start();
        } else {
          FluxFeatureAdRemover.stop();
        }
        break;
      }
      case 'enableLogs': {
        // Re-init logger to pick up the new setting from storage
        FluxLogger.info('Settings', `Log setting changed to ${String(value)} — re-initializing logger`);
        FluxLogger.init();
        if (value) {
          FluxLogger.info('Settings', 'Debug logging is now enabled');
        }
        break;
      }
      default:
        FluxLogger.debug('Settings', `Setting "${key}" changed to ${String(value)} — no real-time handler needed`);
        break;
    }
  }

  function toggleRow(key: string, label: string, desc: string): string {
    const checked = FluxStorage.getBool(key, false);
    return '<label class="ff-toggle-wrapper">' +
      '<input type="checkbox" class="ff-toggle-input" data-key="' + key + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="ff-toggle-track"><span class="ff-toggle-knob"></span></span>' +
      '<span class="ff-toggle-label">' + label + '<br><small style="color:#888">' + desc + '</small></span>' +
      '</label>';
  }

  return { open };
})();