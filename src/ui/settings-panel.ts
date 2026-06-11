import { FluxIcons } from './icons';
import { FluxStorage } from '../core/storage';
import { FluxModals } from './modals';

export const FluxSettingsPanel = ((): { open: () => void } => {
  function open(): void {
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
        '<div style="margin-top:16px;display:flex;justify-content:flex-end">' +
        '<button class="ff-btn ff-btn-primary" id="ff-close-settings">Close</button>' +
        '</div></div>';

      const closeBtn = modal.querySelector('#ff-close-settings');
      if (closeBtn) closeBtn.addEventListener('click', () => { close(); });
    });
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