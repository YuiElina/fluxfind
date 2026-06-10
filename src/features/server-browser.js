/**
 * FluxFind Server Browser Feature
 * Region scanning: fetches 100 public servers via public API, matches short jobId hashes
 * to full UUIDs, then POSTs to gamejoin.roblox.com/v1/join-game for DataCenterId.
 *
 * @module features/server-browser
 * @license GPL-2.0-only
 */
const FluxFeatureServerBrowser = (() => {
    'use strict';

    let loaded = false, serverObserver = null;
    let regionCache = new Map();        // fullJobId -> regionKey
    let shortToFullMap = new Map();     // shortHash -> fullUUID
    let currentGameId = 0;
    let regionScanDone = false;

    /** Extract short jobId from server card (e.g. "ID: 21e2-4fea") */
    function getJobId(item) {
        const sid = item.querySelector('.server-id-text, [class*="server-id"]');
        if (sid) { const m = sid.textContent.match(/ID:\s*(\S+)/); if (m) return m[1]; }
        const m2 = item.textContent.match(/ID:\s*([a-f0-9]{4}-[a-f0-9]{4})/i);
        return m2 ? m2[1] : null;
    }

    /** Public API returns UUIDs like "4ce4f96e-21e2-4fea-8c59-34e1944248d8".
     *  The short hash displayed on the page is the 3rd+4th segment: "21e2-4fea". */
    function shortHashFromUUID(uuid) {
        const parts = uuid.split('-');
        if (parts.length >= 4) return parts[2] + '-' + parts[3];
        return uuid;
    }

    /* ====== Region Scanning ====== */
    async function scanAndCacheRegions(force = false) {
        if (!force && regionScanDone) {
            FluxLogger.info('Region scan: already done, skipping');
            return;
        }
        regionScanDone = false;

        // Step 1: Fetch the full public server list (up to 100 servers)
        FluxLogger.info('Region scan: fetching public server list...');
        FluxNotifications.show('Fetching 100 servers from Roblox API...', 'info', 4000);

        let publicServers;
        try {
            const data = await FluxGamesAPI.fetchPublicServers(currentGameId, 'Asc', null, 100);
            publicServers = data.data || [];
            FluxLogger.info('Region scan: got ' + publicServers.length + ' servers from API');
        } catch (e) {
            FluxLogger.info('Region scan: public servers fetch failed: ' + e.message);
            FluxNotifications.show('Failed to fetch server list', 'error', 3000);
            return;
        }

        if (!publicServers.length) {
            FluxLogger.info('Region scan: 0 servers returned from API');
            FluxNotifications.show('No public servers found', 'warning', 3000);
            return;
        }

        // Step 2: Build shortHash -> fullUUID map
        shortToFullMap.clear();
        publicServers.forEach(s => {
            const short = shortHashFromUUID(s.id);
            shortToFullMap.set(short, s.id);
        });
        FluxLogger.info('Region scan: mapped ' + shortToFullMap.size + ' short hashes to UUIDs');

        // Step 3: Match visible server cards to full UUIDs
        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        const fullJobIds = [];
        const shortToItemMap = new Map();

        items.forEach(item => {
            const short = getJobId(item);
            if (short && shortToFullMap.has(short)) {
                const full = shortToFullMap.get(short);
                if (!regionCache.has(full)) {
                    fullJobIds.push(full);
                    shortToItemMap.set(full, item);
                }
            }
        });

        if (!fullJobIds.length) {
            FluxLogger.info('Region scan: could not match any visible servers to API list');
            FluxNotifications.show('Could not match servers — try refreshing', 'warning', 3000);
            return;
        }

        FluxLogger.info('Region scan: checking ' + fullJobIds.length + ' visible servers');
        FluxNotifications.show('Scanning ' + fullJobIds.length + ' servers for regions...', 'info', 4000);

        // Step 4: Fetch DataCenterId for each matched server
        try {
            const newRegions = await FluxGamesAPI.fetchServerRegions(currentGameId, fullJobIds);
            newRegions.forEach((region, fullId) => regionCache.set(fullId, region));

            if (regionCache.size > 0) {
                regionScanDone = true;
                updateRegionBadges(shortToItemMap);
                FluxLogger.info('Region scan: ' + regionCache.size + ' regions found');

                const savedRegion = FluxStorage.get('serverregionfilter');
                if (savedRegion) applyRegionFilter(savedRegion, shortToItemMap);
            } else {
                FluxLogger.info('Region scan: 0 regions found (all full/private)');
                FluxNotifications.show('All servers appear full — region filtering unavailable', 'warning', 4000);
            }
        } catch (e) {
            FluxLogger.info('Region scan error: ' + e.message);
            FluxNotifications.show('Region scan failed — try again', 'error', 3000);
        }
    }

    function updateRegionBadges(shortToItemMap) {
        shortToItemMap.forEach((item, fullId) => {
            const existing = item.querySelector('.ff-region-badge');
            if (existing) existing.remove();
            if (regionCache.has(fullId)) {
                const rk = regionCache.get(fullId);
                const rn = FluxConstants.SERVER_REGIONS[rk]?.name || rk;
                const rb = FluxDOM.el('span', { className: 'ff-tag ff-tag-purple ff-region-badge', style: 'margin-left:4px' });
                rb.textContent = rn;
                const dd = item.querySelector('.game-server-details, [class*="server-details"]');
                if (dd) dd.appendChild(rb);
            }
        });
    }

    function applyRegionFilter(regionCode, shortToItemMapOverride = null) {
        FluxStorage.set('serverregionfilter', regionCode);
        if (!regionCode || regionCache.size === 0) {
            document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM).forEach(i => { i.style.display = ''; });
            return;
        }

        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        let visible = 0, hidden = 0;
        items.forEach(item => {
            const short = getJobId(item);
            const fullId = short ? shortToFullMap.get(short) : null;
            const region = fullId ? regionCache.get(fullId) : null;
            if (region === regionCode) { item.style.display = ''; visible++; }
            else { item.style.display = 'none'; hidden++; }
        });
        const name = FluxConstants.SERVER_REGIONS[regionCode]?.name || regionCode;
        FluxNotifications.show(name + ': ' + visible + ' servers', 'info', 3000);
    }

    /* ====== Controls ====== */
    function injectFilterButtons() {
        const container = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
        if (!container) return;
        const old = document.querySelector('.ff-server-controls');
        if (old) old.remove();
        const bar = FluxDOM.el('div', { className: 'ff-server-controls' });
        const rBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm', onclick: () => refreshServers() });
        rBtn.innerHTML = FluxIcons.get('refresh', { size: 14 }) + ' Refresh';
        const fBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm', onclick: () => openFilterPanel() });
        fBtn.innerHTML = FluxIcons.get('filter', { size: 14 }) + ' Filters';
        const qBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm ff-btn-primary', onclick: () => quickJoinRandom() });
        qBtn.innerHTML = FluxIcons.get('zap', { size: 14 }) + ' Quick Join';
        FluxUtils.batchAppend(bar, [rBtn, fBtn, qBtn]);
        container.parentNode.insertBefore(bar, container);
        FluxLogger.info('Controls injected');
    }

    function enhanceServerCards() {
        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        items.forEach(item => {
            if (item.dataset.ffEnhanced) return;
            item.dataset.ffEnhanced = '1';
            const jb = item.querySelector(FluxConstants.SELECTORS.SERVER_JOIN_BTN);
            if (jb) jb.classList.add('ff-btn', 'ff-btn-sm', 'ff-btn-primary');
            const se = item.querySelector(FluxConstants.SELECTORS.SERVER_STATUS);
            if (se) {
                const m = se.textContent.match(/(\d+)\s*(?:of|\/)\s*(\d+)/);
                if (m) {
                    const ob = item.querySelector('.ff-player-badge');
                    if (ob) ob.remove();
                    const b = FluxDOM.el('span', { className: 'ff-tag ff-player-badge ' + (+m[1] >= +m[2] ? 'ff-tag-red' : 'ff-tag-green') });
                    b.textContent = m[1] + '/' + m[2];
                    se.parentNode.insertBefore(b, se.nextSibling);
                }
            }
        });
    }

    function refreshServers() {
        FluxNotifications.show('Refreshing...', 'info', 2000);
        const nb = document.querySelector('[data-testid="game-servers-refresh-button"], .rbx-refresh');
        if (nb) nb.click();
        regionCache.clear();
        shortToFullMap.clear();
        regionScanDone = false;
        setTimeout(() => { enhanceServerCards(); scanAndCacheRegions(); }, 1500);
    }

    function openFilterPanel() {
        FluxModals.custom((modal, close) => {
            const regionBtns = '<button class="ff-btn ff-btn-sm ff-region-btn ff-active" data-region="">All Regions</button>' +
                Object.entries(FluxConstants.SERVER_REGIONS).map(([k, r]) =>
                    '<button class="ff-btn ff-btn-sm ff-region-btn" data-region="' + k + '">' + r.name + '</button>').join('');

            modal.innerHTML =
                '<div style="padding:24px"><h3 style="margin:0 0 12px;font-size:16px">' + FluxIcons.get('filter', { size: 16 }) + ' Filters</h3>' +
                '<div style="display:flex;flex-direction:column;gap:12px">' +
                '<label class="ff-checkbox-wrapper"><input type="checkbox" checked id="ff-f-full"><span class="ff-checkbox-custom"></span><span>Hide Full Servers</span></label>' +
                '<label class="ff-checkbox-wrapper"><input type="checkbox" id="ff-f-empty"><span class="ff-checkbox-custom"></span><span>Hide Empty Servers</span></label>' +
                '<div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Min Players</label>' +
                '<input type="number" class="ff-input" id="ff-f-min" min="1" max="100" value="1" style="width:80px"></div>' +
                '<div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Region</label>' +
                '<div style="display:flex;flex-wrap:wrap;gap:4px" id="ff-region-list">' + regionBtns + '</div></div>' +
                '<button class="ff-btn ff-btn-primary" id="ff-apply">Apply</button></div></div>';

            modal.querySelectorAll('.ff-region-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    modal.querySelectorAll('.ff-region-btn').forEach(b => b.classList.remove('ff-active'));
                    this.classList.add('ff-active');
                });
            });
            const savedRegion = FluxStorage.get('serverregionfilter');
            if (savedRegion) {
                const ab = modal.querySelector('.ff-region-btn[data-region="' + savedRegion + '"]');
                if (ab) { modal.querySelectorAll('.ff-region-btn').forEach(b => b.classList.remove('ff-active')); ab.classList.add('ff-active'); }
            }

            modal.querySelector('#ff-apply').addEventListener('click', async () => {
                const hideFull = modal.querySelector('#ff-f-full').checked;
                const hideEmpty = modal.querySelector('#ff-f-empty').checked;
                const min = parseInt(modal.querySelector('#ff-f-min').value) || 1;
                const regionCode = modal.querySelector('.ff-region-btn.ff-active')?.dataset?.region || '';

                if (regionCode && regionCache.size === 0) {
                    FluxNotifications.show('Scanning servers (this may take a moment)...', 'info', 5000);
                    await scanAndCacheRegions();
                }

                applyFilters({ hideFull, hideEmpty, minPlayers: min });
                if (regionCode) applyRegionFilter(regionCode);
                else {
                    FluxStorage.set('serverregionfilter', '');
                    document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM).forEach(i => { i.style.display = ''; });
                }
                close();
            });
        }, { width: '460px' });
    }

    function applyFilters({ hideFull, hideEmpty, minPlayers }) {
        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        let hidden = 0;
        items.forEach(item => {
            const se = item.querySelector(FluxConstants.SELECTORS.SERVER_STATUS);
            if (!se) return;
            const m = se.textContent.match(/(\d+)\s*(?:of|\/)\s*(\d+)/);
            if (!m) return;
            const cur = +m[1], max = +m[2];
            let hide = (hideFull && cur >= max) || (hideEmpty && cur === 0) || (cur < minPlayers);
            item.style.display = hide ? 'none' : '';
            if (hide) hidden++;
        });
        FluxNotifications.show(hidden + ' servers hidden', 'info');
    }

    function quickJoinRandom() {
        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        const vis = Array.from(items).filter(i => i.style.display !== 'none');
        if (!vis.length) { FluxNotifications.show('No servers available', 'warning'); return; }
        const p = vis[Math.floor(Math.random() * vis.length)];
        const b = p.querySelector(FluxConstants.SELECTORS.SERVER_JOIN_BTN);
        if (b) { FluxNotifications.show('Joining...', 'info', 2000); b.click(); }
    }

    function observeServerList() {
        const c = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
        if (!c || serverObserver) return;
        serverObserver = new MutationObserver(FluxUtils.debounce(() => {
            enhanceServerCards();
        }, 400));
        serverObserver.observe(c, { childList: true, subtree: false });
    }

    async function init() {
        if (loaded) return;
        if (!FluxStorage.getBool('togglefilterserversbutton', true)) return;
        currentGameId = FluxGamesAPI.getCurrentGameId();
        if (!currentGameId) return;

        const container = await FluxUtils.watchForChild(
            '#game-instances, .tab-content, [class*="game-instances"]',
            '#rbx-public-game-server-item-container', 30000
        ).catch(() => null);
        if (!container) return;

        loaded = true;
        injectFilterButtons();
        enhanceServerCards();
        observeServerList();

        if (FluxStorage.getBool('autoserverregions', true)) {
            scanAndCacheRegions();
        }
    }

    function destroy() {
        loaded = false;
        regionScanDone = false;
        regionCache.clear();
        shortToFullMap.clear();
        if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }
        const ctrl = document.querySelector('.ff-server-controls');
        if (ctrl) ctrl.remove();
    }

    return { init, destroy };
})();