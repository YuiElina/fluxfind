/**
 * FluxFind Server Browser Feature
 * Single-fire initialization: once server DOM is detected, inject controls.
 * Region scanning is lazy — only triggered by Apply button or autoserverregions setting.
 *
 * @module features/server-browser
 * @license GPL-2.0-only
 */
const FluxFeatureServerBrowser = (() => {
    'use strict';

    let loaded = false, serverObserver = null;
    let regionCache = new Map();
    let currentGameId = 0;
    let regionScanDone = false;

    function getJobId(item) {
        const sid = item.querySelector('.server-id-text, [class*="server-id"]');
        if (sid) { const m = sid.textContent.match(/ID:\s*(\S+)/); if (m) return m[1]; }
        const m2 = item.textContent.match(/ID:\s*([a-f0-9]{4}-[a-f0-9]{4})/i);
        return m2 ? m2[1] : null;
    }

    /* ====== Region Scanning ====== */
    async function scanAndCacheRegions(force = false) {
        if (!force && regionScanDone) {
            FluxLogger.info('Region scan: already done, skipping');
            return;
        }
        // Reset — will set to true only if data found
        regionScanDone = false;

        const items = document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM);
        const jobIds = [];
        items.forEach(item => {
            const jid = getJobId(item);
            if (jid && !regionCache.has(jid)) jobIds.push(jid);
        });

        if (!jobIds.length) {
            FluxLogger.info('Region scan: no job IDs found');
            return;
        }

        FluxLogger.info('Region scan: ' + jobIds.length + ' servers to check');
        FluxNotifications.show('Scanning ' + jobIds.length + ' servers for regions...', 'info', 3000);

        try {
            const newRegions = await FluxGamesAPI.fetchServerRegions(currentGameId, jobIds);
            newRegions.forEach((region, jobId) => regionCache.set(jobId, region));

            if (regionCache.size > 0) {
                regionScanDone = true;
                updateRegionBadges();
                FluxLogger.info('Region scan: ' + regionCache.size + ' regions found');

                const savedRegion = FluxStorage.get('serverregionfilter');
                if (savedRegion) applyRegionFilter(savedRegion);
            } else {
                FluxLogger.info('Region scan: 0 regions found (all servers full/private)');
                FluxNotifications.show('All servers appear full — region filtering unavailable', 'warning', 3000);
            }
        } catch (e) {
            FluxLogger.info('Region scan error: ' + e.message);
            FluxNotifications.show('Region scan failed — try again', 'error', 3000);
        }
    }

    function updateRegionBadges() {
        document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM).forEach(item => {
            const existing = item.querySelector('.ff-region-badge');
            if (existing) existing.remove();
            const jid = getJobId(item);
            if (jid && regionCache.has(jid)) {
                const rk = regionCache.get(jid);
                const rn = FluxConstants.SERVER_REGIONS[rk]?.name || rk;
                const rb = FluxDOM.el('span', { className: 'ff-tag ff-tag-purple ff-region-badge', style: 'margin-left:4px' });
                rb.textContent = rn;
                const dd = item.querySelector('.game-server-details, [class*="server-details"]');
                if (dd) dd.appendChild(rb);
            }
        });
    }

    function applyRegionFilter(regionCode) {
        FluxStorage.set('serverregionfilter', regionCode);
        if (!regionCode || regionCache.size === 0) {
            document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM).forEach(i => { i.style.display = ''; });
            return;
        }
        let visible = 0, hidden = 0;
        document.querySelectorAll(FluxConstants.SELECTORS.SERVER_ITEM).forEach(item => {
            const jid = getJobId(item);
            const region = jid ? regionCache.get(jid) : null;
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

    /* ====== Card Enhancement ====== */
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
                    const oldBadge = item.querySelector('.ff-player-badge');
                    if (oldBadge) oldBadge.remove();
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
                    FluxNotifications.show('Scanning server regions...', 'info', 3000);
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
            scanAndCacheRegions();
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
        if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }
        const ctrl = document.querySelector('.ff-server-controls');
        if (ctrl) ctrl.remove();
    }

    return { init, destroy };
})();