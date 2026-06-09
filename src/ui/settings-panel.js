/**
 * FluxFind Settings Panel Module
 * Full settings UI with sections, presets, import/export, and live preview
 *
 * @module ui/settings-panel
 * @license GPL-2.0-only
 */

const FluxSettingsPanel = (() => {
    'use strict';

    let isOpen = false;

    const SECTIONS = ['home', 'appearance', 'servers', 'filters', 'privacy', 'about'];

    function _createToggle(label, storageKey, defaultValue = false) {
        const currentValue = FluxStorage.getBool(storageKey, defaultValue);
        return `
            <label class="ff-checkbox-wrapper">
                <input type="checkbox" ${currentValue ? 'checked' : ''}
                    onchange="FluxStorage.setBool('${storageKey}', this.checked); FluxSettingsPanel._onSettingChange('${storageKey}', this.checked)">
                <span class="ff-checkbox-custom"></span>
                <span>${FluxSanitizer.escapeHtml(label)}</span>
            </label>
        `;
    }

    function _createSelect(label, storageKey, options, defaultValue) {
        const currentValue = FluxStorage.get(storageKey, defaultValue);
        const opts = options.map(o => {
            const selected = o.value === currentValue ? 'selected' : '';
            return `<option value="${o.value}" ${selected}>${FluxSanitizer.escapeHtml(o.label)}</option>`;
        }).join('');
        return `
            <div class="ff-settings-select-wrap">
                <label class="ff-settings-select-label">${FluxSanitizer.escapeHtml(label)}</label>
                <select class="ff-select" style="width:100%;"
                    onchange="FluxStorage.set('${storageKey}', this.value); FluxSettingsPanel._onSettingChange('${storageKey}', this.value)">
                    ${opts}
                </select>
            </div>
        `;
    }

    function _sectionHome() {
        return `
            <div class="ff-settings-home-header">
                <div>${FluxIcons.getLogoSVG(56)}</div>
                <div>
                    <h2 class="ff-settings-home-title">FluxFind</h2>
                    <p class="ff-settings-home-version">Version ${FluxConstants.VERSION}</p>
                </div>
            </div>
            <div class="ff-divider"></div>
            <div class="ff-settings-home-actions">
                <button class="ff-btn" onclick="FluxSettingsPanel.exportSettings()">
                    ${FluxIcons.get('download', { size: 16 })} Export
                </button>
                <button class="ff-btn" onclick="FluxSettingsPanel.importSettings()">
                    ${FluxIcons.get('upload', { size: 16 })} Import
                </button>
                <button class="ff-btn ff-btn-danger" onclick="FluxSettingsPanel.resetSettings()">
                    ${FluxIcons.get('trash', { size: 16 })} Reset
                </button>
            </div>
            <h3 class="ff-settings-preset-title">Quick Presets</h3>
            <div class="ff-settings-preset-list">
                ${Object.entries(FluxConstants.PRESET_CONFIGURATIONS).map(([key, preset]) => `
                    <button class="ff-btn ff-btn-sm" onclick="FluxSettingsPanel.applyPreset('${key}')">
                        ${FluxSanitizer.escapeHtml(preset.name)}
                    </button>
                `).join('')}
            </div>
        `;
    }

    function _sectionAppearance() {
        return `
            <h3 class="ff-settings-section-title">Appearance</h3>
            ${_createToggle('Force Dark Mode', 'forcedarkmode')}
            ${_createToggle('Responsive Game Cards', 'responsivegamecards', true)}
            ${_createToggle('Smaller Roblox Sidebar', 'smallerrobloxsidebar')}
            ${_createToggle('Restore Classic Terms', 'restoreclassicterms')}
            ${_createToggle('Custom Backgrounds (Experimental)', 'custombackgrounds')}
        `;
    }

    function _sectionServers() {
        return `
            <h3 class="ff-settings-section-title">Server Options</h3>
            ${_createToggle('Enable Server Filters Button', 'togglefilterserversbutton', true)}
            ${_createToggle('Auto Server Regions', 'autoserverregions', true)}
            ${_createToggle('Better Private Servers', 'betterprivateservers', true)}
            ${_createSelect('Server Region Count', 'autoserverregionnumber', [
                { value: '8', label: '8 Regions' },
                { value: '16', label: '16 Regions (Default)' },
                { value: '24', label: '24 Regions' },
                { value: '32', label: '32 Regions' },
                { value: '48', label: '48 Regions' }
            ], '16')}
            ${_createToggle('Show Server Join Time', 'showserverjointime')}
            ${_createToggle('Track Recent Servers', 'trackrecentservers', true)}
        `;
    }

    function _sectionFilters() {
        return `
            <h3 class="ff-settings-section-title">Filter Options</h3>
            ${_createToggle('Remove Ads', 'removeads', true)}
            ${_createToggle('Smart Search', 'smartsearch', true)}
            ${_createToggle('Better Game Stats', 'bettergamestats', true)}
            ${_createToggle('Quality Filter Games', 'qualityfiltergames')}
            ${_createToggle('Quick Launch Games', 'quicklaunchgames', true)}
        `;
    }

    function _sectionPrivacy() {
        return `
            <h3 class="ff-settings-section-title">Privacy & Safety</h3>
            ${_createToggle('Disable Chat Bar', 'disablechat')}
            ${_createToggle('Better Friends Page', 'betterfriends')}
            ${_createToggle('Show Better Profile Info', 'betterprofileinfo')}
            ${_createToggle('Mute Toxic Players (Experimental)', 'mutetoxicplayers')}
        `;
    }

    function _sectionAbout() {
        return `
            <div class="ff-settings-about">
                <div class="ff-settings-about-logo">${FluxIcons.getLogoSVG(64)}</div>
                <h3 class="ff-settings-about-title">FluxFind v${FluxConstants.VERSION}</h3>
                <p class="ff-settings-about-desc">
                    Enhanced Roblox server browser with filtering, region detection,<br>
                    smart search, and quality-of-life improvements.
                </p>
                <div class="ff-settings-about-toggles">
                    ${_createToggle('Enable Logs', 'enableLogs')}
                    ${_createToggle('Show Notifications', 'enablenotifications', true)}
                </div>
                <p class="ff-settings-about-footer">Licensed under GPL-2.0-only. Free and open source software.</p>
            </div>
        `;
    }

    function _getSectionContent(section) {
        const map = {
            home: _sectionHome,
            appearance: _sectionAppearance,
            servers: _sectionServers,
            filters: _sectionFilters,
            privacy: _sectionPrivacy,
            about: _sectionAbout
        };
        return (map[section] || _sectionHome)();
    }

    function open() {
        if (isOpen) return;
        isOpen = true;

        let activeSection = 'home';

        const iconMap = {
            home: 'monitor', appearance: 'pallete', servers: 'server',
            filters: 'filter', privacy: 'shield', about: 'info'
        };

        FluxModals.custom((modal, closeModal) => {
            const header = FluxDOM.el('div', { className: 'ff-settings-header' });
            header.innerHTML = `
                <h2 class="ff-settings-header-title">${FluxIcons.get('settings', { size: 18 })} Settings</h2>
                <button class="ff-btn ff-btn-sm" id="ff-settings-close">${FluxIcons.get('close', { size: 16 })}</button>
            `;

            const body = FluxDOM.el('div', { className: 'ff-settings-body' });

            const sidebar = FluxDOM.el('div', { className: 'ff-settings-sidebar' });
            const content = FluxDOM.el('div', {
                id: 'ff-settings-content',
                className: 'ff-settings-content ff-scrollbar'
            });

            SECTIONS.forEach((section, index) => {
                const btn = FluxDOM.el('button', {
                    className: 'ff-btn ff-btn-sm ff-settings-sidebar-btn' + (index === 0 ? ' ff-active' : '')
                });
                btn.innerHTML = `${FluxIcons.get(iconMap[section] || 'chevronRight', { size: 14 })}
                    ${section.charAt(0).toUpperCase() + section.slice(1)}`;
                btn.addEventListener('click', () => {
                    activeSection = section;
                    content.innerHTML = _getSectionContent(section);
                    sidebar.querySelectorAll('button').forEach((b, i) => {
                        b.classList.toggle('ff-active', i === index);
                    });
                });
                sidebar.appendChild(btn);
            });

            content.innerHTML = _getSectionContent('home');
            body.appendChild(sidebar);
            body.appendChild(content);
            modal.appendChild(header);
            modal.appendChild(body);

            header.querySelector('#ff-settings-close').addEventListener('click', closeModal);
        }, { width: '700px', onClose: () => { isOpen = false; } });
    }

    function _onSettingChange(key, value) {
        FluxLogger.debug(`Setting changed: ${key} = ${value}`);
        FluxNotifications.show(`Setting updated`, 'success', 1500);
        if (typeof FluxApp !== 'undefined' && FluxApp.applySettings) {
            FluxApp.applySettings(key, value);
        }
    }

    function exportSettings() {
        const keys = FluxStorage.listKeys();
        const settings = {};
        keys.forEach(k => {
            if (!k.startsWith('_')) {
                const val = FluxStorage.get(k);
                if (val !== null) settings[k] = val;
            }
        });
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `fluxfind-settings-${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
        FluxNotifications.show('Settings exported successfully', 'success');
    }

    function importSettings() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const settings = JSON.parse(ev.target.result);
                    let count = 0;
                    for (const [k, v] of Object.entries(settings)) {
                        if (k.startsWith('_')) continue;
                        if (typeof v === 'boolean') FluxStorage.setBool(k, v);
                        else FluxStorage.set(k, String(v));
                        count++;
                    }
                    FluxNotifications.show(`Imported ${count} settings. Refresh to apply all.`, 'success', 4000);
                } catch { FluxNotifications.show('Invalid settings file', 'error'); }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function resetSettings() {
        FluxModals.confirm('Reset All Settings?',
            'This will restore all FluxFind settings to their defaults. This cannot be undone.',
            {
                type: 'danger', confirmText: 'Reset All', cancelText: 'Cancel',
                onConfirm: () => {
                    const keys = FluxStorage.listKeys();
                    keys.forEach(k => { if (!k.startsWith('_')) FluxStorage.remove(k); });
                    FluxStorage.initDefaults(FluxConstants.DEFAULT_SETTINGS);
                    FluxNotifications.show('Settings reset to defaults. Refresh to apply.', 'success', 4000);
                }
            }
        );
    }

    function applyPreset(key) {
        const preset = FluxConstants.PRESET_CONFIGURATIONS[key];
        if (!preset) return;
        FluxModals.confirm(`Apply "${preset.name}" Preset?`,
            'This will update your settings to the preset values.',
            {
                type: 'info', confirmText: 'Apply',
                onConfirm: () => {
                    for (const [k, v] of Object.entries(preset.settings)) {
                        if (typeof v === 'boolean') FluxStorage.setBool(k, v);
                        else FluxStorage.set(k, String(v));
                    }
                    FluxNotifications.show(`"${preset.name}" preset applied!`, 'success');
                }
            }
        );
    }

    return { open, exportSettings, importSettings, resetSettings, applyPreset, _onSettingChange };
})();