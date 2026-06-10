/**
 * FluxFind Server Browser Feature
 * Fetches public servers from Roblox API, gets region data, fetches avatars,
 * and replaces native server cards with enhanced ones.
 *
 * @module features/server-browser
 * @license GPL-2.0-only
 */
const FluxFeatureServerBrowser = (() => {
    'use strict';

    let loaded = false, serverObserver = null, _rendering = false;
    let allServers = [];
    let regionScanDone = false;
    let currentGameId = 0;

    /* ====== Core: Fetch servers + regions + thumbnails ====== */
    async function scanAndCacheRegions(force = false) {
        if (!force && regionScanDone) {
            FluxLogger.info('Region scan: already done, skipping');
            return;
        }
        regionScanDone = false;
        allServers = [];

        // Disconnect observer while we replace DOM
        if (serverObserver) { serverObserver.disconnect();
            serverObserver = null; }

        // Step 1: Fetch all public servers (multi-page)
        FluxLogger.info('Region scan: fetching server list...');
        FluxNotifications.show('Fetching servers from Roblox API...', 'info', 4000);

        let servers;
        try {
            servers = await FluxGamesAPI.fetchAllPublicServers(currentGameId, 'Asc', 300);
        } catch (e) {
            FluxLogger.info('Region scan: fetch failed: ' + e.message);
            FluxNotifications.show('Failed to fetch server list', 'error', 3000);
            observeServerList(); // reconnect observer
            return;
        }

        if (!servers.length) {
            FluxLogger.info('Region scan: 0 servers returned from API');
            FluxNotifications.show('No public servers found', 'warning', 3000);
            observeServerList();
            return;
        }

        FluxLogger.info('Region scan: got ' + servers.length + ' servers total');
        FluxNotifications.show('Scanning regions for ' + servers.length + ' servers...', 'info', 5000);

        // Step 2: Fetch DataCenterId for first 30 servers (rate-limited sequential)
        const ids = servers.map(s => s.id).slice(0, 30);
        const regionMap = await FluxGamesAPI.fetchServerRegions(currentGameId, ids);

        // Step 3: Collect all player tokens and batch-fetch thumbnails (first 100 tokens)
        const allTokens = [];
        const tokenSet = new Set();
        servers.forEach(s => {
            (s.playerTokens || []).forEach(t => { if (!tokenSet.has(t)) { tokenSet.add(t);
                    allTokens.push(t); } });
        });

        const thumbnailMap = new Map();
        const tokenSlice = allTokens.slice(0, 100);
        if (tokenSlice.length > 0) {
            FluxLogger.info('Fetching thumbnails for ' + tokenSlice.length + ' unique players...');
            try {
                const thumbs = await FluxThumbnailsAPI.fetchPlayerThumbnailsByTokens(tokenSlice, false);
                thumbs.forEach(t => { if (t.imageUrl) thumbnailMap.set(t.token, t.imageUrl); });
                FluxLogger.info('Got ' + thumbnailMap.size + ' thumbnails');
            } catch (e) {
                FluxLogger.info('Thumbnail fetch failed: ' + e.message);
            }
        }

        // Step 4: Build server list
        allServers = servers.slice(0, 30).map(s => ({
            id: s.id,
            playing: s.playing,
            maxPlayers: s.maxPlayers,
            playerTokens: s.playerTokens || [],
            thumbnails: (s.playerTokens || []).slice(0, 5).map(t => thumbnailMap.get(t) || null).filter(Boolean),
            region: regionMap.get(s.id) || null
        }));

        regionScanDone = true;
        FluxLogger.info('Region scan: ' + allServers.length + ' servers ready (' + regionMap.size + ' with regions)');

        // Apply saved region filter if any
        const savedRegion = FluxStorage.get('serverregionfilter');
        if (savedRegion) {
            applyRegionFilter(savedRegion);
        } else {
            renderServerCards(allServers);
        }

        // Reconnect observer AFTER render completes
        observeServerList();
    }

    /* ====== Card Rendering ====== */
    function renderServerCards(servers) {
        const container = document.querySelector('#rbx-public-game-server-item-container');
        if (!container) return;

        container.innerHTML = '';

        if (!servers.length) {
            container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--ff-text-muted)">No servers match this filter</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        servers.forEach(server => {
            fragment.appendChild(createServerCard(server));
        });
        container.appendChild(fragment);

        FluxLogger.info('Rendered ' + servers.length + ' server cards');
    }

    function createServerCard(server) {
        const li = FluxDOM.el('li', {
            className: 'rbx-public-game-server-item col-md-3 col-sm-4 col-xs-6'
        });

        const cardItem = FluxDOM.el('div', { className: 'card-item card-item-public-server' });

        // Player thumbnails
        const thumbsContainer = FluxDOM.el('div', { className: 'player-thumbnails-container' });

        if (server.thumbnails.length > 0) {
            const maxShow = Math.min(server.thumbnails.length, 5);
            for (let i = 0; i < maxShow; i++) {
                const avatar = FluxDOM.el('span', { className: 'avatar avatar-headshot-md player-avatar' });
                const imgContainer = FluxDOM.el('span', { className: 'thumbnail-2d-container avatar-card-image' });
                const img = FluxDOM.el('img', { src: server.thumbnails[i], alt: '', title: '' });
                imgContainer.appendChild(img);
                avatar.appendChild(imgContainer);
                thumbsContainer.appendChild(avatar);
            }
        } else {
            // No thumbnails -- show player count
            const countDiv = FluxDOM.el('div', {
                style: 'display:flex;align-items:center;justify-content:center;min-height:48px;padding:8px'
            });
            const badge = FluxDOM.el('span', { className: 'ff-badge', style: 'font-size:13px;padding:6px 14px' });
            badge.innerHTML = FluxIcons.get('users', { size: 14, color: '#fff' }) + ' ' + server.playing + ' / ' + server.maxPlayers;
            countDiv.appendChild(badge);
            thumbsContainer.appendChild(countDiv);
        }

        if (server.playerTokens.length > 5) {
            const placeholder = FluxDOM.el('span', {
                className: 'avatar avatar-headshot-md player-avatar hidden-players-placeholder'
            });
            placeholder.textContent = '+' + (server.playerTokens.length - 5);
            thumbsContainer.appendChild(placeholder);
        }

        // Details
        const details = FluxDOM.el('div', { className: 'rbx-public-game-server-details game-server-details' });

        // Gauge bar
        const gaugeContainer = FluxDOM.el('div', { className: 'server-player-count-gauge border' });
        const gauge = FluxDOM.el('div', {
            className: 'gauge-inner-bar border',
            style: 'width:' + Math.min(100, (server.playing / server.maxPlayers) * 100) + '%'
        });
        gaugeContainer.appendChild(gauge);

        // Join button
        const joinSpan = FluxDOM.el('span');
        joinSpan.setAttribute('data-placeid', String(currentGameId));
        const joinBtn = FluxDOM.el('button', {
            className: 'btn-full-width btn-control-xs rbx-public-game-server-join game-server-join-btn btn-primary-md btn-min-width ff-btn ff-btn-sm ff-btn-primary'
        });
        joinBtn.addEventListener('click', () => {
            FluxNotifications.show('Joining server...', 'info', 2000);
            FluxGamesAPI.joinServer(currentGameId, server.id).catch(() => {});
        });
        joinBtn.textContent = 'Join';
        joinSpan.appendChild(joinBtn);

        // Server ID + Region badge
        const footer = FluxDOM.el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-top:6px' });
        const sid = FluxDOM.el('div', { className: 'server-id-text text-info xsmall' });
        const sp = server.id.split('-');
        sid.textContent = 'ID: ' + (sp[1] || '') + '-' + (sp[2] || '');
        footer.appendChild(sid);

        if (server.region) {
            const rn = FluxConstants.SERVER_REGIONS[server.region]?.name || server.region;
            const rb = FluxDOM.el('span', { className: 'ff-tag ff-tag-purple', style: 'margin-left:4px' });
            rb.textContent = rn;
            footer.appendChild(rb);
        }

        details.appendChild(gaugeContainer);
        details.appendChild(joinSpan);
        details.appendChild(footer);

        cardItem.appendChild(thumbsContainer);
        cardItem.appendChild(details);
        li.appendChild(cardItem);

        return li;
    }

    /* ====== Region Filter ====== */
    function applyRegionFilter(regionCode) {
        FluxStorage.set('serverregionfilter', regionCode);
        if (!regionCode) {
            renderServerCards(allServers);
            FluxNotifications.show('All regions: ' + allServers.length + ' servers', 'info', 2000);
            return;
        }

        const filtered = allServers.filter(s => s.region === regionCode);
        renderServerCards(filtered);
        const name = FluxConstants.SERVER_REGIONS[regionCode]?.name || regionCode;
        FluxNotifications.show(name + ': ' + filtered.length + ' servers', 'info', 3000);
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
    }

    function refreshServers() {
        FluxNotifications.show('Refreshing...', 'info', 2000);
        allServers = [];
        regionScanDone = false;
        scanAndCacheRegions();
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
                const regionCode = modal.querySelector('.ff-region-btn.ff-active')?.dataset?.region || '';

                if (regionCode && !regionScanDone) {
                    FluxNotifications.show('Scanning servers (this may take a moment)...', 'info', 5000);
                    await scanAndCacheRegions();
                }

                applyRegionFilter(regionCode);
                close();
            });
        }, { width: '460px' });
    }

    function quickJoinRandom() {
        if (!allServers.length) {
            FluxNotifications.show('No servers loaded', 'warning');
            return;
        }
        const visible = allServers.filter(s => s.playing < s.maxPlayers);
        if (!visible.length) { FluxNotifications.show('No available servers', 'warning'); return; }
        const pick = visible[Math.floor(Math.random() * visible.length)];
        FluxNotifications.show('Joining random server...', 'info', 2000);
        FluxGamesAPI.joinServer(currentGameId, pick.id).catch(() => {});
    }

    function observeServerList() {
        const c = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
        if (!c || serverObserver) return;
        serverObserver = new MutationObserver(FluxUtils.debounce(() => {
            // Only fire after scan is fully done
            if (!regionScanDone) return;
            serverObserver.disconnect();
            serverObserver = null;
            renderServerCards(allServers);
            observeServerList();
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
        observeServerList();

        if (FluxStorage.getBool('autoserverregions', true)) {
            scanAndCacheRegions();
        }
    }

    function destroy() {
        loaded = false;
        regionScanDone = false;
        allServers = [];
        if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }
        const ctrl = document.querySelector('.ff-server-controls');
        if (ctrl) ctrl.remove();
    }

    return { init, destroy };
})();