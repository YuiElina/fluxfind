/**
 * FluxFind Settings Panel Module
 * Full settings UI with sections, presets, import/export, and live preview.
 * All event handling uses addEventListener — no inline onclick/onchange attributes.
 *
 * @module ui/settings-panel
 * @license GPL-2.0-only
 */

const FluxSettingsPanel = (() => {
    'use strict';

    let isOpen = false;

    /* ============ Toggle Switch Generator (Apple‑style) ============ */

    function _createToggle(label, storageKey, defaultValue = false) {
        const currentValue = FluxStorage.getBool(storageKey, defaultValue);
        const wrapper = FluxDOM.el('label', { className: 'ff-toggle-wrapper' });

        const input = FluxDOM.el('input', {
            type: 'checkbox',
            className: 'ff-toggle-input'
        });
        if (currentValue) input.checked = true;

        input.addEventListener('change', function () {
            FluxStorage.setBool(storageKey, this.checked);
            FluxSettingsPanel._onSettingChange(storageKey, this.checked);
        });

        const track = FluxDOM.el('span', { className: 'ff-toggle-track' });
        const knob = FluxDOM.el('span', { className: 'ff-toggle-knob' });
        track.appendChild(knob);

        const labelSpan = FluxDOM.el('span', { className: 'ff-toggle-label' });
        labelSpan.textContent = label;

        wrapper.appendChild(input);
        wrapper.appendChild(track);
        wrapper.appendChild(labelSpan);

        return wrapper;
    }

    /* ============ Select Generator ============ */

    function _createSelect(label, storageKey, options, defaultValue) {
        const currentValue = FluxStorage.get(storageKey, defaultValue);
        const container = FluxDOM.el('div', { className: 'ff-settings-select-wrap' });

        const lbl = FluxDOM.el('label', { className: 'ff-settings-select-label' });
        lbl.textContent = label;

        const select = FluxDOM.el('select', {
            className: 'ff-select',
            style: { width: '100%' }
        });

        options.forEach(o => {
            const opt = FluxDOM.el('option', { value: o.value });
            opt.textContent = o.label;
            if (o.value === currentValue) opt.selected = true;
            select.appendChild(opt);
        });

        select.addEventListener('change', function () {
            FluxStorage.set(storageKey, this.value);
            FluxSettingsPanel._onSettingChange(storageKey, this.value);
        });

        container.appendChild(lbl);
        container.appendChild(select);
        return container;
    }

    /* ============ Button Generator ============ */

    function _createButton(html, className, onClick) {
        const btn = FluxDOM.el('button', { className: `ff-btn ${className}` });
        btn.innerHTML = html;
        btn.addEventListener('click', onClick);
        return btn;
    }

    /* ============ Section Content Renderers ============ */

    function _sectionHome() {
        const frag = document.createDocumentFragment();

        const header = FluxDOM.el('div', { className: 'ff-settings-home-header' });
        const logoDiv = FluxDOM.el('div');
        logoDiv.innerHTML = FluxIcons.getLogoSVG(56);
        const infoDiv = FluxDOM.el('div');
        const title = FluxDOM.el('h2', { className: 'ff-settings-home-title' });
        title.textContent = 'FluxFind';
        const ver = FluxDOM.el('p', { className: 'ff-settings-home-version' });
        ver.textContent = `Version ${FluxConstants.VERSION}`;
        infoDiv.appendChild(title);
        infoDiv.appendChild(ver);
        header.appendChild(logoDiv);
        header.appendChild(infoDiv);
        frag.appendChild(header);
        frag.appendChild(FluxDOM.el('div', { className: 'ff-divider' }));

        const actions = FluxDOM.el('div', { className: 'ff-settings-home-actions' });
        actions.appendChild(_createButton(
            `${FluxIcons.get('download', { size: 16 })} Export`, '',
            () => FluxSettingsPanel.exportSettings()
        ));
        actions.appendChild(_createButton(
            `${FluxIcons.get('upload', { size: 16 })} Import`, '',
            () => FluxSettingsPanel.importSettings()
        ));
        actions.appendChild(_createButton(
            `${FluxIcons.get('trash', { size: 16 })} Reset`, 'ff-btn-danger',
            () => FluxSettingsPanel.resetSettings()
        ));
        frag.appendChild(actions);

        const presetTitle = FluxDOM.el('h3', { className: 'ff-settings-preset-title' });
        presetTitle.textContent = 'Quick Presets';
        frag.appendChild(presetTitle);

        const presetList = FluxDOM.el('div', { className: 'ff-settings-preset-list' });
        Object.entries(FluxConstants.PRESET_CONFIGURATIONS).forEach(([key, preset]) => {
            presetList.appendChild(_createButton(
                FluxSanitizer.escapeHtml(preset.name), 'ff-btn-sm',
                () => FluxSettingsPanel.applyPreset(key)
            ));
        });
        frag.appendChild(presetList);

        return frag;
    }

    function _sectionAppearance() {
        const frag = document.createDocumentFragment();
        const title = FluxDOM.el('h3', { className: 'ff-settings-section-title' });
        title.textContent = 'Appearance';
        frag.appendChild(title);
        frag.appendChild(_createToggle('Force Dark Mode', 'forcedarkmode'));
        frag.appendChild(_createToggle('Responsive Game Cards', 'responsivegamecards', true));
        frag.appendChild(_createToggle('Smaller Roblox Sidebar', 'smallerrobloxsidebar'));
        frag.appendChild(_createToggle('Restore Classic Terms', 'restoreclassicterms'));
        frag.appendChild(_createToggle('Custom Backgrounds (Experimental)', 'custombackgrounds'));
        return frag;
    }

    function _sectionServers() {
        const frag = document.createDocumentFragment();
        const title = FluxDOM.el('h3', { className: 'ff-settings-section-title' });
        title.textContent = 'Server Options';
        frag.appendChild(title);
        frag.appendChild(_createToggle('Enable Server Filters Button', 'togglefilterserversbutton', true));
        frag.appendChild(_createToggle('Auto Server Regions', 'autoserverregions', true));
        frag.appendChild(_createToggle('Better Private Servers', 'betterprivateservers', true));
        frag.appendChild(_createSelect('Server Region Count', 'autoserverregionnumber', [
            { value: '8', label: '8 Regions' },
            { value: '16', label: '16 Regions (Default)' },
            { value: '24', label: '24 Regions' },
            { value: '32', label: '32 Regions' },
            { value: '48', label: '48 Regions' }
        ], '16'));
        frag.appendChild(_createToggle('Show Server Join Time', 'showserverjointime'));
        frag.appendChild(_createToggle('Track Recent Servers', 'trackrecentservers', true));
        return frag;
    }

    function _sectionFilters() {
        const frag = document.createDocumentFragment();
        const title = FluxDOM.el('h3', { className: 'ff-settings-section-title' });
        title.textContent = 'Filter Options';
        frag.appendChild(title);
        frag.appendChild(_createToggle('Remove Ads', 'removeads', true));
        frag.appendChild(_createToggle('Smart Search', 'smartsearch', true));
        frag.appendChild(_createToggle('Better Game Stats', 'bettergamestats', true));
        frag.appendChild(_createToggle('Quality Filter Games', 'qualityfiltergames'));
        frag.appendChild(_createToggle('Quick Launch Games', 'quicklaunchgames', true));
        return frag;
    }

    function _sectionPrivacy() {
        const frag = document.createDocumentFragment();
        const title = FluxDOM.el('h3', { className: 'ff-settings-section-title' });
        title.textContent = 'Privacy & Safety';
        frag.appendChild(title);
        frag.appendChild(_createToggle('Disable Chat Bar', 'disablechat'));
        frag.appendChild(_createToggle('Better Friends Page', 'betterfriends'));
        frag.appendChild(_createToggle('Show Better Profile Info', 'betterprofileinfo'));
        frag.appendChild(_createToggle('Mute Toxic Players (Experimental)', 'mutetoxicplayers'));
        return frag;
    }

    function _sectionAbout() {
        const frag = document.createDocumentFragment();
        const wrap = FluxDOM.el('div', { className: 'ff-settings-about' });

        const logoDiv = FluxDOM.el('div', { className: 'ff-settings-about-logo' });
        logoDiv.innerHTML = FluxIcons.getLogoSVG(64);
        wrap.appendChild(logoDiv);

        const h3 = FluxDOM.el('h3', { className: 'ff-settings-about-title' });
        h3.textContent = `FluxFind v${FluxConstants.VERSION}`;
        wrap.appendChild(h3);

        const desc = FluxDOM.el('p', { className: 'ff-settings-about-desc' });
        desc.innerHTML = 'Enhanced Roblox server browser with filtering, region detection,<br>smart search, and quality-of-life improvements.';
        wrap.appendChild(desc);

        const toggles = FluxDOM.el('div', { className: 'ff-settings-about-toggles' });
        toggles.appendChild(_createToggle('Enable Logs', 'enableLogs'));
        toggles.appendChild(_createToggle('Show Notifications', 'enablenotifications', true));
        wrap.appendChild(toggles);

        const footer = FluxDOM.el('p', { className: 'ff-settings-about-footer' });
        footer.textContent = 'Licensed under GPL-2.0-only. Free and open source software.';
        wrap.appendChild(footer);

        frag.appendChild(wrap);
        return frag;
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

    /* ============ Open Settings Panel ============ */

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
            const headerTitle = FluxDOM.el('h2', { className: 'ff-settings-header-title' });
            headerTitle.innerHTML = `${FluxIcons.get('settings', { size: 18 })} Settings`;
            const closeBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm' });
            closeBtn.innerHTML = FluxIcons.get('close', { size: 16 });
            closeBtn.addEventListener('click', closeModal);
            header.appendChild(headerTitle);
            header.appendChild(closeBtn);

            const body = FluxDOM.el('div', { className: 'ff-settings-body' });
            const sidebar = FluxDOM.el('div', { className: 'ff-settings-sidebar' });
            const content = FluxDOM.el('div', {
                id: 'ff-settings-content',
                className: 'ff-settings-content ff-scrollbar'
            });

            const sidebarBtns = [];
            SECTIONS.forEach((section, index) => {
                const btn = FluxDOM.el('button', {
                    className: 'ff-btn ff-btn-sm ff-settings-sidebar-btn' + (index === 0 ? ' ff-active' : '')
                });
                btn.innerHTML = `${FluxIcons.get(iconMap[section] || 'chevronRight', { size: 14 })}
                    ${section.charAt(0).toUpperCase() + section.slice(1)}`;
                btn.addEventListener('click', () => {
                    activeSection = section;
                    content.innerHTML = '';
                    content.appendChild(_getSectionContent(section));
                    sidebarBtns.forEach((b, i) => {
                        b.classList.toggle('ff-active', i === SECTIONS.indexOf(section));
                    });
                });
                sidebar.appendChild(btn);
                sidebarBtns.push(btn);
            });

            content.appendChild(_getSectionContent('home'));
            body.appendChild(sidebar);
            body.appendChild(content);
            modal.appendChild(header);
            modal.appendChild(body);
        }, { width: '700px', onClose: () => { isOpen = false; } });
    }

    /* ============ Setting Change Callback ============ */

    function _onSettingChange(key, value) {
        FluxLogger.debug(`Setting changed: ${key} = ${value}`);
        FluxNotifications.show('Setting updated', 'success', 1500);
        if (typeof FluxApp !== 'undefined' && FluxApp.applySettings) {
            FluxApp.applySettings(key, value);
        }
    }

    /* ============ Export / Import / Reset ============ */

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