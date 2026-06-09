/**
 * FluxFind Server Browser Feature
 * Uses FluxUtils.watchForChild to wait for server list, then fetches DataCenterIds
 * from Roblox API for accurate region detection (not text matching).
 *
 * @module features/server-browser
 * @license GPL-2.0-only
 */
const FluxFeatureServerBrowser = (() => {
    'use strict';

    let enabled = false, filterButtonAdded = false, serverCardsEnhanced = false, serverObserver = null;
    let regionCache = new Map(); // jobId -> regionKey cache
    let currentGameId = 0;

    /* ====== Extract jobId from server item ====== */
    function getJobId(item) {
        const serverIdEl = item.querySelector('.server-id-text, [class*="server-id"]');
        if (serverIdEl) {
            const match = serverIdEl.textContent.match(/ID:\s*(\S+)/);
            if (match) return match[1];
        }
        // Fallback: extract from any text containing a server ID pattern
        const text = item.textContent;
        const altMatch = text.match(/ID:\s*([a-f0-9]{4}-[a-f0-9]{4})/i);
        return altMatch ? altMatch[1] : null;
    }

    async function _waitForContainer() {
        try {
            const el = await FluxUtils.watchForChild(
                '#game-instances, .tab-content, [class*="game-instances"]',
                '#rbx-public-game-server-item-container, .card-list',
                30000
            );
            FluxLogger.info('Server container found via watchForChild');
            return el;
        } catch (e) {
            FluxLogger.info('Server container not found');
            return null;
        }
    }

    /* ====== Inject Controls ====== */
    async function injectFilterButtons() {
        if (filterButtonAdded) return;
        const container = await _waitForContainer();
        if (!container) return;

        currentGameId = FluxGamesAPI.getCurrentGameId();
        if (!currentGameId) {
            FluxLogger.info('Could not detect game ID for server region scanning');
            return;
        }

        const old = document.querySelector('.ff-server-controls');
        if (old) old.remove();

        const btnContainer = FluxDOM.el('div', { className: 'ff-server-controls' });

        const refreshBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm',
            onclick: () => refreshServers() });
        refreshBtn.innerHTML = FluxIcons.get('refresh', { size: 14 }) + ' Refresh';

        const filterBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm',
            onclick: () => openFilterPanel() });
        filterBtn.innerHTML = FluxIcons.get('filter', { size: 14 }) + ' Filters';

        const quickJoinBtn = FluxDOM.el('button', {
            className: 'ff-btn ff-btn-sm ff-btn-primary',
            onclick: () => quickJoinRandom()
        });
        quickJoinBtn.innerHTML = FluxIcons.get('zap', { size: 14 }) + ' Quick Join';

        FluxUtils.batchAppend(btnContainer, [refreshBtn, filterBtn, quickJoinBtn]);
        container.parentNode.insertBefore(btnContainer, container);
        filterButtonAdded = true;
        FluxLogger.info('Server controls injected (game ID: ' + currentGameId + ')');

        // Auto-scan regions
        scanAndCacheRegions();
    }

    /** Fetch all server DataCenterIds and cache them */
    async function scanAndCacheRegions() {
        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        const jobIds = [];
        items.forEach(item => {
            const jid = getJobId(item);
            if (jid && !regionCache.has(jid)) jobIds.push(jid);
        });

        if (!jobIds.length) {
            FluxLogger.info('No job IDs found to scan');
            return;
        }

        FluxLogger.info('Scanning ' + jobIds.length + ' servers for regions...');
        FluxNotifications.show('Scanning ' + jobIds.length + ' servers for regions...', 'info', 3000);

        try {
            const newRegions = await FluxGamesAPI.fetchServerRegions(currentGameId, jobIds);
            newRegions.forEach((region, jobId) => regionCache.set(jobId, region));
            FluxLogger.info('Region scan complete: ' + regionCache.size + ' cached');

            // Apply saved region filter if any
            const savedRegion = FluxStorage.get('serverregionfilter');
            if (savedRegion) {
                applyRegionFilter(savedRegion);
            }
        } catch (e) {
            FluxLogger.info('Region scan failed: ' + e.message);
        }
    }

    function applyRegionFilter(regionCode) {
        FluxStorage.set('serverregionfilter', regionCode);
        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        let hidden = 0;
        let visible = 0;

        items.forEach(item => {
            const jid = getJobId(item);
            const region = jid ? regionCache.get(jid) : null;
            if (!regionCode) {
                item.style.display = '';
                visible++;
            } else if (region === regionCode) {
                item.style.display = '';
                visible++;
            } else {
                item.style.display = 'none';
                hidden++;
            }
        });

        if (!regionCode) {
            FluxNotifications.show('All regions: ' + visible + ' servers', 'info', 2000);
        } else {
            const regionName = FluxConstants.SERVER_REGIONS[regionCode]?.name || regionCode;
            FluxNotifications.show(regionName + ': ' + visible + ' servers shown, ' + hidden + ' hidden', 'info', 3000);
        }
    }

    /* ====== Enhance Cards ====== */
    async function enhanceServerCards() {
        if (serverCardsEnhanced) return;

        try {
            await FluxUtils.watchForChild(
                '#rbx-public-game-server-item-container',
                '.rbx-public-game-server-item',
                15000
            );
        } catch (e) {
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
                        className: 'ff-tag ' + (cur >= max ? 'ff-tag-red' : 'ff-tag-green')
                    });
                    badge.textContent = cur + '/' + max;
                    statusEl.parentNode.insertBefore(badge, statusEl.nextSibling);
                }
            }

            // Show region badge if cached
            const jid = getJobId(item);
            if (jid && regionCache.has(jid)) {
                const rk = regionCache.get(jid);
                const rname = FluxConstants.SERVER_REGIONS[rk]?.name || rk;
                const regionBadge = FluxDOM.el('span', {
                    className: 'ff-tag ff-tag-purple',
                    style: 'margin-left:4px'
                });
                regionBadge.textContent = rname;
                const details = item.querySelector('.game-server-details, [class*="server-details"]');
                if (details) details.appendChild(regionBadge);
            }
        });
        serverCardsEnhanced = true;
        FluxLogger.info('Enhanced ' + items.length + ' server cards');
    }

    function refreshServers() {
        FluxNotifications.show('Refreshing servers...', 'info', 2000);
        const native = document.querySelector('[data-testid="game-servers-refresh-button"], .rbx-refresh');
        if (native) native.click();
        serverCardsEnhanced = false;
        regionCache.clear();
        setTimeout(async () => {
            await enhanceServerCards();
            await scanAndCacheRegions();
        }, 1500);
    }

    /* ====== Filter Panel ====== */
    function openFilterPanel() {
        FluxModals.custom((modal, close) => {
            const regionOpts = Object.entries(FluxConstants.SERVER_REGIONS)
                .map(([key, r]) => '<button class="ff-btn ff-btn-sm ff-region-filter-btn" data-region="' + key + '">' + r.name + '</button>')
                .join('');

            modal.innerHTML =
                '<div style="padding:24px">' +
                '<h3 style="margin:0 0 16px;font-size:16px">' + FluxIcons.get('filter', { size: 16 }) + ' Server Filters</h3>' +
                '<div style="display:flex;flex-direction:column;gap:12px">' +
                '<label class="ff-checkbox-wrapper"><input type="checkbox" checked id="ff-filter-full"><span class="ff-checkbox-custom"></span><span>Hide Full Servers</span></label>' +
                '<label class="ff-checkbox-wrapper"><input type="checkbox" id="ff-filter-empty"><span class="ff-checkbox-custom"></span><span>Hide Empty Servers</span></label>' +
                '<div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Region</label>' +
                '<div style="display:flex;flex-wrap:wrap;gap:4px" id="ff-region-list">' +
                '<button class="ff-btn ff-btn-sm ff-region-filter-btn ff-active" data-region="">All Regions</button>' +
                regionOpts +
                '</div></div>' +
                '<div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">Min Players</label>' +
                '<input type="number" class="ff-input" id="ff-filter-min" min="1" max="100" value="1" style="width:80px"></div>' +
                '<button class="ff-btn ff-btn-primary" id="ff-apply">Apply Filters</button>' +
                '</div></div>';

            // Region button styling
            modal.querySelectorAll('.ff-region-filter-btn').forEach(btn => {
                btn.style.background = 'transparent';
                btn.style.borderColor = 'var(--ff-border)';
                btn.addEventListener('click', function () {
                    modal.querySelectorAll('.ff-region-filter-btn').forEach(b => b.classList.remove('ff-active'));
                    this.classList.add('ff-active');
                });
            });

            modal.querySelector('#ff-apply').addEventListener('click', () => {
                const hideFull = modal.querySelector('#ff-filter-full').checked;
                const hideEmpty = modal.querySelector('#ff-filter-empty').checked;
                const min = parseInt(modal.querySelector('#ff-filter-min').value) || 1;
                const regionCode = modal.querySelector('.ff-region-filter-btn.ff-active')?.dataset?.region || '';
                applyFilters({ hideFull, hideEmpty, minPlayers: min });
                if (regionCode || FluxStorage.get('serverregionfilter')) {
                    applyRegionFilter(regionCode);
                }
                close();
            });
        }, { width: '460px' });
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
        FluxNotifications.show(hidden + ' servers hidden', 'info');
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

        serverObserver = new MutationObserver(FluxUtils.debounce(async () => {
            serverCardsEnhanced = false;
            await enhanceServerCards();
            await scanAndCacheRegions();
        }, 400));

        serverObserver.observe(container, { childList: true, subtree: false });
    }

    async function init() {
        if (enabled) {
            filterButtonAdded = false;
            serverCardsEnhanced = false;
            regionCache.clear();
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
        regionCache.clear();
        if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }
        const ctrl = document.querySelector('.ff-server-controls');
        if (ctrl) ctrl.remove();
    }

    return { init, destroy, injectFilterButtons, enhanceServerCards, refreshServers };
})();