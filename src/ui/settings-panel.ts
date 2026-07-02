import { FluxIcons } from './icons';
import { FluxStorage } from '../core/storage';
import { FluxModals } from './modals';
import { FluxLogger } from '../core/logger';
import { FluxFeatureAdRemover } from '../features/ad-remover';
import { darkModeAtom, chatDisabledAtom, removeAdsAtom, debugLogsAtom, smartSearchAtom } from '../state/atoms';

type SettingsTab = 'filters' | 'appearance' | 'privacy' | 'ads';

interface TabConfig {
  key: SettingsTab;
  label: string;
}

const TABS: TabConfig[] = [
  { key: 'filters', label: 'Filters' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'ads', label: 'Ads & Stats' },
];

export const FluxSettingsPanel = ((): { open: () => void } => {
  function open(): void {
    FluxLogger.info('Settings', 'Opening settings panel');

    FluxModals.custom((modal, _close) => {
      let activeTab: SettingsTab = 'filters';

      function renderNav(container: HTMLElement): void {
        container.innerHTML = `
          <div class="ff-segmented-nav" id="ff-segmented-nav">
            <div class="ff-segmented-indicator" id="ff-segmented-indicator"></div>
            ${TABS.map(t => `<div class="ff-segmented-item ${t.key === activeTab ? 'ff-active' : ''}" data-tab="${t.key}">${t.label}</div>`).join('')}
          </div>`;
      }

      function renderContent(container: HTMLElement): void {
        container.innerHTML = '<div class="ff-settings-tab-content" id="ff-settings-tab-content"></div>';
        const tabContent = container.querySelector('#ff-settings-tab-content');
        if (tabContent) tabContent.innerHTML = getTabHTML(activeTab);
      }

      function updateIndicator(): void {
        const nav = document.querySelector('#ff-segmented-nav');
        const indicator = document.querySelector('#ff-segmented-indicator');
        const activeItem = nav?.querySelector('.ff-segmented-item.ff-active');

        if (!indicator || !activeItem || !nav) return;

        const navRect = nav.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const indicatorEl = indicator as HTMLElement;

        indicatorEl.style.left = `${String(itemRect.left - navRect.left)}px`;
        indicatorEl.style.width = `${String(itemRect.width)}px`;
      }

      function switchTab(key: SettingsTab): void {
        if (activeTab === key) return;
        activeTab = key;

        const navContainer = modal.querySelector('#ff-segmented-nav')?.parentElement;
        if (navContainer) renderNav(navContainer);

        const contentContainer = modal.querySelector('#ff-settings-tab-content')?.parentElement;
        if (contentContainer) renderContent(contentContainer);

        wireNavHandlers();
        requestAnimationFrame(() => { updateIndicator(); });
        wireToggleHandlers(modal);
      }

      function wireNavHandlers(): void {
        modal.querySelectorAll('.ff-segmented-item').forEach(item => {
          (item as HTMLElement).addEventListener('click', function (this: HTMLElement) {
            const tab = this.dataset.tab as SettingsTab | undefined;
            if (tab) switchTab(tab);
          });
        });
      }

      function wireToggleHandlers(parentEl: HTMLElement): void {
        parentEl.querySelectorAll('.ff-toggle-input').forEach(input => {
          input.addEventListener('change', function (this: HTMLInputElement) {
            const key = this.dataset.key;
            if (!key) return;
            const checked = this.checked;
            FluxStorage.setBool(key, checked);
            FluxLogger.info('Settings', `Toggle changed: ${key} = ${String(checked)}`);
            applySettingChange(key, checked);
          });
        });
      }

      function wireResetStats(parentEl: HTMLElement): void {
        const resetBtn = parentEl.querySelector('#ff-reset-stats');
        if (resetBtn) resetBtn.addEventListener('click', () => {
          FluxFeatureAdRemover.resetStats();
          FluxLogger.info('Settings', 'Ad block stats reset');
          const updatedStats = FluxFeatureAdRemover.getStats();
          const sessionEl = parentEl.querySelector('.ff-stats-session');
          const totalEl = parentEl.querySelector('.ff-stats-total');
          if (sessionEl) sessionEl.textContent = String(updatedStats.blockedSession);
          if (totalEl) totalEl.textContent = String(updatedStats.blockedTotal);
        });
      }

      // Build modal HTML
      modal.innerHTML = `
        <div style="padding:24px;display:flex;flex-direction:column;max-height:500px">
          <h3 style="margin:0 0 16px;font-size:18px;display:flex;align-items:center;gap:8px">
            ${FluxIcons.get('settings', { size: 20 })} FluxFind Settings
          </h3>
          <div id="ff-nav-container"></div>
          <div id="ff-content-container" style="flex:1;overflow-y:auto"></div>
        </div>`;
      const navContainer = modal.querySelector('#ff-nav-container');
      const contentContainer = modal.querySelector('#ff-content-container');

      if (navContainer) renderNav(navContainer as HTMLElement);
      if (contentContainer) renderContent(contentContainer as HTMLElement);

      wireNavHandlers();
      wireToggleHandlers(modal);
      wireResetStats(modal);
      requestAnimationFrame(() => { updateIndicator(); });
    });
  }

  function getTabHTML(tab: SettingsTab): string {
    switch (tab) {
      case 'filters':
        return `<div style="display:flex;flex-direction:column;gap:8px">${toggleRow('togglefilterserversbutton', 'Server Filters', 'Show filter controls on game server pages')}${toggleRow('autoserverregions', 'Auto Region Scan', 'Automatically fetch server locations')}</div>`;

      case 'appearance':
        return `<div style="display:flex;flex-direction:column;gap:8px">${toggleRow('forcedarkmode', 'Dark Mode', 'Override page theme to dark')}${toggleRow('responsivegamecards', 'Responsive Cards', 'Make game cards adapt to screen width')}${toggleRow('smartsearch', 'Smart Search', 'Enhanced search suggestions')}</div>`;

      case 'privacy':
        return `<div style="display:flex;flex-direction:column;gap:8px">${toggleRow('disablechat', 'Disable Chat', 'Remove the chat sidebar')}${toggleRow('enableLogs', 'Debug Logs', 'Show FluxFind logs in console')}</div>`;

      case 'ads': {
        const stats = FluxFeatureAdRemover.getStats();
        return `<div style="display:flex;flex-direction:column;gap:8px">${toggleRow('removeads', 'Remove Ads', 'Remove promotional content from pages')}<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--ff-border)"><h4 style="margin:0 0 10px;font-size:14px">${FluxIcons.get('barChart', { size: 14 })} Statistics</h4><div style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--ff-text-secondary)"><div style="display:flex;justify-content:space-between"><span>Ads blocked this session:</span><strong class="ff-stats-session">${String(stats.blockedSession)}</strong></div><div style="display:flex;justify-content:space-between"><span>Ads blocked (total):</span><strong class="ff-stats-total">${String(stats.blockedTotal)}</strong></div></div><button id="ff-reset-stats" class="ff-btn ff-btn-sm ff-btn-danger" style="margin-top:8px;width:100%">${FluxIcons.get('trash', { size: 14 })} Reset Stats</button></div></div>`;
      }
    }
  }

  function applySettingChange(key: string, value: boolean): void {
    FluxLogger.info('Settings', `Toggle changed: ${key} = ${String(value)}`);
    switch (key) {
      case 'forcedarkmode':
        darkModeAtom.set(value);
        break;
      case 'disablechat':
        chatDisabledAtom.set(value);
        break;
      case 'removeads':
        removeAdsAtom.set(value);
        break;
      case 'enableLogs':
        debugLogsAtom.set(value);
        break;
      case 'smartsearch':
        smartSearchAtom.set(value);
        break;
      default:
        break;
    }
  }

  function toggleRow(key: string, label: string, desc: string): string {
    const checked = FluxStorage.getBool(key, false);
    return `<label class="ff-toggle-wrapper"><input type="checkbox" class="ff-toggle-input" data-key="${key}"${checked ? ' checked' : ''}><span class="ff-toggle-track"><span class="ff-toggle-knob"></span></span><span class="ff-toggle-label">${label}<br><small style="color:#888">${desc}</small></span></label>`;
  }

  return { open };
})();