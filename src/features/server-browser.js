/**
 * FluxFind Server Browser Feature
 * Enhanced server list with filtering, region detection, quick-join, and vote display
 * Matches Roblox's current DOM: #rbx-public-game-server-item-container, .rbx-public-game-server-item
 *
 * @module features/server-browser
 * @license GPL-2.0-only
 */
const FluxFeatureServerBrowser = (() => {
    'use strict';

    let enabled = false, filterButtonAdded = false, serverCardsEnhanced = false, serverObserver = null;
    let _regionSelect = null; // persisted reference for re-injection

    function _getServerContainer() {
        return FluxUtils.qs(FluxConstants.SELECTORS.SERVER_LIST);
    }

    function _getServerItems() {
        return FluxUtils.qsa(FluxConstants.SELECTORS.SERVER_ITEM);
    }

    /* ====== Inject Controls ====== */
    function injectFilterButtons() {
        if (filterButtonAdded) return;
        const list = _getServerContainer();
        if (!list) return;

        // Remove old controls if SPA re-render left them
        const old = document.querySelector('.ff-server-controls');
        if (old) old.remove();

        const btnContainer = FluxDOM.el('div', { className: 'ff-server-controls' });

        const refreshBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm',
            onclick: () => refreshServers() });
        refreshBtn.innerHTML = FluxIcons.get('refresh', { size: 14 }) + ' Refresh';

        const filterBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm',
            onclick: () => openFilterPanel() });
        filterBtn.innerHTML = FluxIcons.get('filter', { size: 14 }) + ' Filters';

        const regionSelect = FluxDOM.el('select', {
            className: 'ff-select',
            style: { padding: '0 8px', height: '28px', fontSize: '12px' },
            onchange: (e) => handleRegionFilter(e.target.value)
        });
        regionSelect.appendChild(FluxDOM.el('option', { value: '', text: 'All Regions' }));
        Object.entries(FluxConstants.SERVER_REGIONS).forEach(([key, r]) => {
            regionSelect.appendChild(FluxDOM.el('option', { value: key, text: r.name }));
        });
        _regionSelect = regionSelect;

        const quickJoinBtn = FluxDOM.el('button', {
            className: 'ff-btn ff-btn-sm ff-btn-primary',
            onclick: () => quickJoinRandom()
        });
        quickJoinBtn.innerHTML = FluxIcons.get('zap', { size: 14 }) + ' Quick Join';

        FluxUtils.batchAppend(btnContainer, [refreshBtn, filterBtn, regionSelect, quickJoinBtn]);
        // Insert before the server <ul> so controls sit between .server-list-options and the list
        list.parentNode.insertBefore(btnContainer, list);
        filterButtonAdded = true;

        const savedRegion = FluxStorage.get('serverregionfilter');
        if (savedRegion) {
            regionSelect.value = savedRegion;
            handleRegionFilter(savedRegion);
        }
    }

    function handleRegionFilter(code) {
        FluxStorage.set('serverregionfilter', code);
        const items = _getServerItems();
        if (!code) {
            items.forEach(i => { i.style.display = ''; });
            FluxNotifications.show('All regions', 'info', 1500);
            return;
        }
        const region = FluxConstants.SERVER_REGIONS[code];
        if (!region) return;
        let hidden = 0;
        const needle = region.name.toLowerCase();
        items.forEach(i => {
            if (i.textContent.toLowerCase().includes(needle)) {
                i.style.display = '';
            } else {
                i.style.display = 'none';
                hidden++;
            }
        });
        FluxNotifications.show(`${region.name}: ${items.length - hidden} servers`, 'info', 2000);
    }

    /* ====== Enhance Cards ====== */
    function enhanceServerCards() {
        if (serverCardsEnhanced) return;
        const items = _getServerItems();
        if (!items.length) return;

        items.forEach(item => {
            if (item.dataset.ffEnhanced) return;
            item.dataset.ffEnhanced = '1';

            // Style the join button
            const joinBtn = FluxUtils.qs(FluxConstants.SELECTORS.SERVER_JOIN_BTN, item);
            if (joinBtn) {
                joinBtn.classList.add('ff-btn', 'ff-btn-sm', 'ff-btn-primary');
            }

            // Add player-count badge from status text
            const statusEl = FluxUtils.qs(FluxConstants.SELECTORS.SERVER_STATUS, item);
            if (statusEl) {
                const match = statusEl.textContent.match(/(\d+)\s*(?:of|\/)\s*(\d+)/);
                if (match) {
                    const cur = parseInt(match[1]), max = parseInt(match[2]);
                    const badge = FluxDOM.el('span', {
                        className: `ff-tag ${cur >= max ? 'ff-tag-red' : 'ff-tag-green'}`
                    });
                    badge.textContent = `${cur}/${max}`;
                    statusEl.parentNode.insertBefore(badge, statusEl.nextSibling);
                }
            }
        });
        serverCardsEnhanced = true;
    }

    function refreshServers() {
        FluxNotifications.show('Refreshing servers...', 'info', 2000);
        // Try Roblox's native refresh button
        const native = document.querySelector('[data-testid="game-servers-refresh-button"], button:has(svg)');
        if (native) native.click();
        serverCardsEnhanced = false;
        setTimeout(() => enhanceServerCards(), 1500);
    }

    /* ====== Filter Panel ====== */
    function openFilterPanel() {
        FluxModals.custom((modal, close) => {
            modal.innerHTML = `
                <div style="padding:24px">
                    <h3 style="margin:0 0 16px;font-size:16px">${FluxIcons.get('filter', { size: 16 })} Server Filters</h3>
                    <div style="display:flex;flex-direction:column;gap:12px">
                        <label class="ff-checkbox-wrapper"><input type="checkbox" checked id="ff-filter-full"><span class="ff-checkbox-custom"></span><span>Hide Full Servers</span></label>
                        <label class="ff-checkbox-wrapper"><input type="checkbox" id="ff-filter-empty"><span class="ff-checkbox-custom"></span><span>Hide Empty Servers</span></label>
                        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">Min Players</label><input type="number" class="ff-input" id="ff-filter-min" min="1" max="100" value="1" style="width:80px"></div>
                        <button class="ff-btn ff-btn-primary" id="ff-apply">Apply Filters</button>
                    </div>
                </div>`;
            modal.querySelector('#ff-apply').addEventListener('click', () => {
                const hideFull = modal.querySelector('#ff-filter-full').checked;
                const hideEmpty = modal.querySelector('#ff-filter-empty').checked;
                const min = parseInt(modal.querySelector('#ff-filter-min').value) || 1;
                applyFilters({ hideFull, hideEmpty, minPlayers: min });
                close();
            });
        }, { width: '380px' });
    }

    function applyFilters({ hideFull, hideEmpty, minPlayers }) {
        const items = _getServerItems();
        let hidden = 0;
        items.forEach(item => {
            const statusEl = FluxUtils.qs(FluxConstants.SELECTORS.SERVER_STATUS, item);
            if (!statusEl) return;
            const match = statusEl.textContent.match(/(\d+)\s*(?:of|\/)\s*(\d+)/);
            if (!match) return;
            const cur = parseInt(match[1]), max = parseInt(match[2]);
            let hide = false;
            if (hideFull && cur >= max) hide = true;
            if (hideEmpty && cur === 0) hide = true;
            if (cur < minPlayers) hide = true;
            item.style.display = hide ? 'none' : '';
            if (hide) hidden++;
        });
        FluxNotifications.show(`${hidden} servers hidden`, 'info');
    }

    /* ====== Quick Join ====== */
    function quickJoinRandom() {
        const items = _getServerItems();
        const visible = items.filter(i => i.style.display !== 'none');
        if (!visible.length) {
            FluxNotifications.show('No servers available', 'warning');
            return;
        }
        const pick = visible[Math.floor(Math.random() * visible.length)];
        const btn = FluxUtils.qs(FluxConstants.SELECTORS.SERVER_JOIN_BTN, pick);
        if (btn) {
            FluxNotifications.show('Joining random server...', 'info', 2000);
            btn.click();
        }
    }

    /* ====== Observer ====== */
    function observeServerList() {
        const list = _getServerContainer();
        if (!list) return;
        if (serverObserver) serverObserver.disconnect();

        const reapply = FluxUtils.debounce(() => {
            injectFilterButtons();
            enhanceServerCards();
        }, 400);

        serverObserver = new MutationObserver(reapply);
        serverObserver.observe(list, { childList: true, subtree: true });
    }

    /* ====== Init / Destroy ====== */
    function init() {
        // SPA navigation: reset flags so elements re-inject
        if (enabled) {
            filterButtonAdded = false;
            serverCardsEnhanced = false;
        }
        if (!FluxStorage.getBool('togglefilterserversbutton', true)) return;
        enabled = true;

        FluxLogger.info('Server browser feature initialized');
        injectFilterButtons();
        enhanceServerCards();
        observeServerList();
    }

    function destroy() {
        enabled = false;
        filterButtonAdded = false;
        serverCardsEnhanced = false;
        if (serverObserver) { serverObserver.disconnect();
            serverObserver = null; }
        const ctrl = document.querySelector('.ff-server-controls');
        if (ctrl) ctrl.remove();
        _regionSelect = null;
    }

    return { init, destroy, injectFilterButtons, enhanceServerCards, refreshServers };
})();