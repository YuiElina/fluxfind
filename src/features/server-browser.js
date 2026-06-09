/**
 * FluxFind Server Browser Feature
 * Uses FluxUtils.watchForChild to wait for server list to appear inside the game-instances tab.
 * Observes parent only (childList:true, subtree:false) for maximum performance.
 *
 * @module features/server-browser
 * @license GPL-2.0-only
 */
const FluxFeatureServerBrowser = (() => {
    'use strict';

    let enabled = false, filterButtonAdded = false, serverCardsEnhanced = false, serverObserver = null;

    async function _waitForContainer() {
        try {
            // Watch the game-instances tab pane for the server container to appear
            const el = await FluxUtils.watchForChild(
                '#game-instances, .tab-content, [class*="game-instances"]',
                '#rbx-public-game-server-item-container, .card-list',
                30000
            );
            FluxLogger.info('Server container found via watchForChild: ' + (el.id || el.className));
            return el;
        } catch (e) {
            FluxLogger.info('Server container not found: ' + e.message);
            return null;
        }
    }

    /* ====== Inject Controls ====== */
    async function injectFilterButtons() {
        if (filterButtonAdded) return;
        const container = await _waitForContainer();
        if (!container) return;

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
            style: 'padding:0 8px;height:28px;font-size:12px',
            onchange: (e) => handleRegionFilter(e.target.value)
        });
        regionSelect.appendChild(FluxDOM.el('option', { value: '', text: 'All Regions' }));
        Object.entries(FluxConstants.SERVER_REGIONS).forEach(([key, r]) => {
            regionSelect.appendChild(FluxDOM.el('option', { value: key, text: r.name }));
        });

        const quickJoinBtn = FluxDOM.el('button', {
            className: 'ff-btn ff-btn-sm ff-btn-primary',
            onclick: () => quickJoinRandom()
        });
        quickJoinBtn.innerHTML = FluxIcons.get('zap', { size: 14 }) + ' Quick Join';

        FluxUtils.batchAppend(btnContainer, [refreshBtn, filterBtn, regionSelect, quickJoinBtn]);
        container.parentNode.insertBefore(btnContainer, container);
        filterButtonAdded = true;
        FluxLogger.info('Server controls injected');

        const savedRegion = FluxStorage.get('serverregionfilter');
        if (savedRegion) {
            regionSelect.value = savedRegion;
            handleRegionFilter(savedRegion);
        }
    }

    function handleRegionFilter(code) {
        FluxStorage.set('serverregionfilter', code);
        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        if (!code) {
            items.forEach(i => { i.style.display = ''; });
            FluxNotifications.show('All regions', 'info', 1500);
            return;
        }
        const region = FluxConstants.SERVER_REGIONS[code];
        if (!region) return;
        const needle = region.name.toLowerCase();
        let hidden = 0;
        items.forEach(i => {
            if (i.textContent.toLowerCase().includes(needle)) { i.style.display = ''; }
            else { i.style.display = 'none'; hidden++; }
        });
        FluxNotifications.show(`${region.name}: ${items.length - hidden} servers`, 'info', 2000);
    }

    /* ====== Enhance Cards ====== */
    async function enhanceServerCards() {
        if (serverCardsEnhanced) return;

        // Watch for server items to appear inside the container
        try {
            await FluxUtils.watchForChild(
                '#rbx-public-game-server-item-container',
                '.rbx-public-game-server-item',
                15000
            );
        } catch (e) {
            FluxLogger.info('Server items watch timeout');
            return;
        }

        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        if (!items.length) return;

        items.forEach(item => {
            if (item.dataset.ffEnhanced) return;
            item.dataset.ffEnhanced = '1';

            const joinBtn = item.querySelector(FluxConstants.SELECTORS.SERVER_JOIN_BTN);
            if (joinBtn) {
                joinBtn.classList.add('ff-btn', 'ff-btn-sm', 'ff-btn-primary');
            }

            const statusEl = item.querySelector(FluxConstants.SELECTORS.SERVER_STATUS);
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
        FluxLogger.info(`Enhanced ${items.length} server cards`);
    }

    function refreshServers() {
        FluxNotifications.show('Refreshing servers...', 'info', 2000);
        const native = document.querySelector('[data-testid="game-servers-refresh-button"], .rbx-refresh');
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
        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        let hidden = 0;
        items.forEach(item => {
            const statusEl = item.querySelector(FluxConstants.SELECTORS.SERVER_STATUS);
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

    function quickJoinRandom() {
        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        const visible = Array.from(items).filter(i => i.style.display !== 'none');
        if (!visible.length) { FluxNotifications.show('No servers available', 'warning'); return; }
        const pick = visible[Math.floor(Math.random() * visible.length)];
        const btn = pick.querySelector(FluxConstants.SELECTORS.SERVER_JOIN_BTN);
        if (btn) { FluxNotifications.show('Joining random server...', 'info', 2000); btn.click(); }
    }

    function observeServerList() {
        const container = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
        if (!container) return;
        if (serverObserver) serverObserver.disconnect();

        serverObserver = new MutationObserver(FluxUtils.debounce(() => {
            serverCardsEnhanced = false;
            enhanceServerCards();
        }, 400));

        serverObserver.observe(container, { childList: true, subtree: false });
    }

    async function init() {
        if (enabled) {
            filterButtonAdded = false;
            serverCardsEnhanced = false;
            if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }
        }
        if (!FluxStorage.getBool('togglefilterserversbutton', true)) return;
        enabled = true;

        FluxLogger.info('Server browser: waiting via watchForChild...');
        await injectFilterButtons();
        await enhanceServerCards();
        observeServerList();
        FluxLogger.info('Server browser: fully loaded');
    }

    function destroy() {
        enabled = false;
        filterButtonAdded = false;
        serverCardsEnhanced = false;
        if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }
        const ctrl = document.querySelector('.ff-server-controls');
        if (ctrl) ctrl.remove();
    }

    return { init, destroy, injectFilterButtons, enhanceServerCards, refreshServers };
})();