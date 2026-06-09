/**
 * FluxFind Server Browser Feature
 * Enhanced server list with filtering, region detection, quick-join, and vote display
 *
 * @module features/server-browser
 * @license GPL-2.0-only
 */

const FluxFeatureServerBrowser = (() => {
    'use strict';

    let enabled = false;
    let filterButtonAdded = false;
    let serverCardsEnhanced = false;

    /**
     * Add filter/refresh buttons to the server page
     */
    function injectFilterButtons() {
        if (filterButtonAdded) return;
        const serverContainer = FluxUtils.qs(FluxConstants.SELECTORS.SERVER_LIST);
        if (!serverContainer) return;

        const btnContainer = FluxDOM.el('div', { className: 'ff-server-controls' });

        const refreshBtn = FluxDOM.el('button', {
            className: 'ff-btn ff-btn-sm',
            onclick: () => refreshServers()
        });
        refreshBtn.innerHTML = `${FluxIcons.get('refresh', { size: 14 })} Refresh`;

        const filterBtn = FluxDOM.el('button', {
            className: 'ff-btn ff-btn-sm',
            onclick: () => openFilterPanel()
        });
        filterBtn.innerHTML = `${FluxIcons.get('filter', { size: 14 })} Filters`;

        const quickJoinBtn = FluxDOM.el('button', {
            className: 'ff-btn ff-btn-sm ff-btn-primary',
            onclick: () => quickJoinRandom()
        });
        quickJoinBtn.innerHTML = `${FluxIcons.get('zap', { size: 14 })} Quick Join`;

        FluxUtils.batchAppend(btnContainer, [refreshBtn, filterBtn, quickJoinBtn]);
        serverContainer.parentNode.insertBefore(btnContainer, serverContainer);
        filterButtonAdded = true;
    }

    /**
     * Enhance server cards with additional info (votes, region, etc.)
     */
    function enhanceServerCards() {
        if (serverCardsEnhanced) return;
        const serverItems = FluxUtils.qsa(FluxConstants.SELECTORS.SERVER_ITEM);
        if (!serverItems.length) return;

        serverItems.forEach(item => {
            if (item.dataset.fluxEnhanced) return;
            item.dataset.fluxEnhanced = '1';

            const joinBtn = FluxUtils.qs('button, a', item);
            if (joinBtn) {
                joinBtn.classList.add('ff-btn', 'ff-btn-sm', 'ff-btn-primary');
            }

            const match = item.textContent.match(/(\d+)\s*(?:of|\\/)\s*(\d+)/);
            if (match) {
                const current = parseInt(match[1]);
                const max = parseInt(match[2]);
                const badge = FluxDOM.el('span', {
                    className: `ff-tag ${current >= max ? 'ff-tag-red' : 'ff-tag-green'}`
                });
                badge.textContent = `${match[1]}/${match[2]}`;
                const nameEl = FluxUtils.qs('span, div', item);
                if (nameEl && nameEl.parentNode) {
                    nameEl.parentNode.insertBefore(badge, nameEl.nextSibling);
                }
            }
        });
        serverCardsEnhanced = true;
    }

    /**
     * Refresh the server list by clicking Roblox's refresh
     */
    function refreshServers() {
        FluxNotifications.show('Refreshing server list...', 'info', 2000);
        const refreshBtn = document.querySelector('[data-testid="game-servers-refresh-button"], button:has(svg)');
        if (refreshBtn) refreshBtn.click();
        serverCardsEnhanced = false;
        setTimeout(() => enhanceServerCards(), 1500);
    }

    /**
     * Open filter panel for server filtering
     */
    function openFilterPanel() {
        FluxModals.custom((modal, close) => {
            modal.innerHTML = `
                <div style="padding:24px;">
                    <h3 style="margin:0 0 16px;font-size:16px;">${FluxIcons.get('filter', { size: 16 })} Server Filters</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;">
                        <label class="ff-checkbox-wrapper">
                            <input type="checkbox" checked id="ff-filter-full">
                            <span class="ff-checkbox-custom"></span>
                            <span>Hide Full Servers</span>
                        </label>
                        <label class="ff-checkbox-wrapper">
                            <input type="checkbox" id="ff-filter-empty">
                            <span class="ff-checkbox-custom"></span>
                            <span>Hide Empty Servers</span>
                        </label>
                        <div>
                            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Min Players</label>
                            <input type="number" class="ff-input" id="ff-filter-min-players" min="1" max="100" value="1" style="width:80px;">
                        </div>
                        <button class="ff-btn ff-btn-primary" id="ff-apply-filters">Apply Filters</button>
                    </div>
                </div>
            `;

            modal.querySelector('#ff-apply-filters').addEventListener('click', () => {
                const hideFull = modal.querySelector('#ff-filter-full').checked;
                const hideEmpty = modal.querySelector('#ff-filter-empty').checked;
                const minPlayers = parseInt(modal.querySelector('#ff-filter-min-players').value) || 1;
                applyFilters({ hideFull, hideEmpty, minPlayers });
                close();
            });
        }, { width: '380px' });
    }

    function applyFilters({ hideFull, hideEmpty, minPlayers }) {
        const items = FluxUtils.qsa(FluxConstants.SELECTORS.SERVER_ITEM);
        let hidden = 0;
        items.forEach(item => {
            const match = item.textContent.match(/(\d+)\s*(?:of|\\/)\s*(\d+)/);
            if (match) {
                const current = parseInt(match[1]);
                const max = parseInt(match[2]);
                let shouldHide = false;
                if (hideFull && current >= max) shouldHide = true;
                if (hideEmpty && current === 0) shouldHide = true;
                if (current < minPlayers) shouldHide = true;
                item.style.display = shouldHide ? 'none' : '';
                if (shouldHide) hidden++;
            }
        });
        FluxNotifications.show(`Filters applied: ${hidden} servers hidden`, 'info');
    }

    /**
     * Quick-join a random server from the list
     */
    function quickJoinRandom() {
        const items = FluxUtils.qsa(FluxConstants.SELECTORS.SERVER_ITEM);
        const visible = items.filter(item => item.style.display !== 'none');
        if (!visible.length) {
            FluxNotifications.show('No servers available to join', 'warning');
            return;
        }
        const randomItem = visible[Math.floor(Math.random() * visible.length)];
        const joinBtn = FluxUtils.qs('button, a', randomItem);
        if (joinBtn) {
            FluxNotifications.show('Joining random server...', 'info', 2000);
            joinBtn.click();
        }
    }

    /**
     * Observe server list DOM changes to re-enhance cards
     */
    let serverObserver = null;
    function observeServerList() {
        const container = FluxUtils.qs(FluxConstants.SELECTORS.SERVER_LIST);
        if (!container) return;
        if (serverObserver) serverObserver.disconnect();

        const debouncedEnhance = FluxUtils.debounce(() => {
            injectFilterButtons();
            enhanceServerCards();
        }, 400);

        serverObserver = new MutationObserver(debouncedEnhance);
        serverObserver.observe(container, { childList: true, subtree: true });
    }

    function init() {
        if (!FluxStorage.getBool('togglefilterserversbutton', true)) return;
        if (enabled) return;
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
        if (serverObserver) {
            serverObserver.disconnect();
            serverObserver = null;
        }
        const controls = FluxUtils.qs('.ff-server-controls');
        if (controls) controls.remove();
    }

    return { init, destroy, injectFilterButtons, enhanceServerCards, refreshServers };
})();