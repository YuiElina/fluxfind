/**
 * FluxFind Server Browser Feature
 * Fetches 100 public servers from Roblox API, gets region data, and replaces
 * the native server cards with enhanced ones including region badges.
 *
 * @module features/server-browser
 * @license GPL-2.0-only
 */
const FluxFeatureServerBrowser = (() => {
    'use strict';

    let loaded = false, serverObserver = null;
    let allServers = [];          // [{id, playing, maxPlayers, fps, ping, region, playerTokens}]
    let regionScanDone = false;
    let currentGameId = 0;

    /* ====== Core: Fetch servers + regions ====== */
    async function scanAndCacheRegions(force = false) {
        if (!force && regionScanDone) {
            FluxLogger.info('Region scan: already done, skipping');
            return;
        }
        regionScanDone = false;
        allServers = [];

        // Step 1: Fetch 100 public servers
        FluxLogger.info('Region scan: fetching public server list...');
        FluxNotifications.show('Fetching 100 servers from Roblox API...', 'info', 4000);

        let data;
        try {
            data = await FluxGamesAPI.fetchPublicServers(currentGameId, 'Asc', null, 100);
        } catch (e) {
            FluxLogger.info('Region scan: public servers fetch failed: ' + e.message);
            FluxNotifications.show('Failed to fetch server list', 'error', 3000);
            return;
        }

        const servers = data?.data || [];
        if (!servers.length) {
            FluxLogger.info('Region scan: 0 servers returned from API');
            FluxNotifications.show('No public servers found', 'warning', 3000);
            return;
        }

        FluxLogger.info('Region scan: got ' + servers.length + ' servers, fetching regions...');
        FluxNotifications.show('Scanning regions for ' + servers.length + ' servers...', 'info', 5000);

        // Step 2: Fetch DataCenterId for each server
        const ids = servers.map(s => s.id);
        const regionMap = await FluxGamesAPI.fetchServerRegions(currentGameId, ids);

        // Step 3: Build server list with region data
        allServers = servers.map(s => ({
            id: s.id,
            playing: s.playing,
            maxPlayers: s.maxPlayers,
            fps: s.fps,
            ping: s.ping,
            playerTokens: s.playerTokens || [],
            region: regionMap.get(s.id) || null
        }));

        regionScanDone = true;
        FluxLogger.info('Region scan: ' + allServers.length + ' servers, ' + regionMap.size + ' with regions');

        // Apply saved region filter if any
        const savedRegion = FluxStorage.get('serverregionfilter');
        if (savedRegion) {
            applyRegionFilter(savedRegion);
        } else {
            // Show all with badges
            renderServerCards(allServers);
        }
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

        servers.forEach(server => {
            const li = createServerCard(server);
            container.appendChild(li);
        });

        FluxLogger.info('Rendered ' + servers.length + ' server cards');
    }

    function createServerCard(server) {
        const li = FluxDOM.el('li', {
            className: 'rbx-public-game-server-item col-md-3 col-sm-4 col-xs-6 ff-server-card'
        });

        // Player thumbnails
        const thumbsContainer = FluxDOM.el('div', { className: 'player-thumbnails-container' });
        const maxThumbs = Math.min(server.playerTokens.length, 5);
        for (let i = 0; i < maxThumbs; i++) {
            const token = server.playerTokens[i];
            const avatar = FluxDOM.el('span', { className: 'avatar avatar-headshot-md player-avatar' });
            const imgContainer = FluxDOM.el('span', { className: 'thumbnail-2d-container avatar-card-image' });
            const img = FluxDOM.el('img', {
                src: `https://tr.rbxcdn.com/30DAY-AvatarHeadshot-${token}-Png/150/150/AvatarHeadshot/Webp/noFilter`,
                alt: '', title: ''
            });
            imgContainer.appendChild(img);
            avatar.appendChild(imgContainer);
            thumbsContainer.appendChild(avatar);
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

        const status = FluxDOM.el('div', {
            className: 'text-info rbx-game-status rbx-public-game-server-status text-overflow'
        });
        status.textContent = server.playing + ' of ' + server.maxPlayers + ' people max';

        // Player count badge
        const badge = FluxDOM.el('span', {
            className: 'ff-tag ff-player-badge ' + (server.playing >= server.maxPlayers ? 'ff-tag-red' : 'ff-tag-green')
        });
        badge.textContent = server.playing + '/' + server.maxPlayers;

        // Gauge
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
            className: 'btn-full-width btn-control-xs rbx-public-game-server-join game-server-join-btn btn-primary-md btn-min-width ff-btn ff-btn-sm ff-btn-primary',
            onclick: () => joinServer(server)
        });
        joinBtn.textContent = 'Join';
        joinSpan.appendChild(joinBtn);

        // Server ID
        const serverIdEl = FluxDOM.el('div', { className: 'server-id-text text-info xsmall' });
        const shortParts = server.id.split('-');
        serverIdEl.textContent = 'ID: ' + (shortParts[1] || '') + '-' + (shortParts[2] || '');

        details.appendChild(status);
        details.appendChild(badge);
        details.appendChild(gaugeContainer);
        details.appendChild(joinSpan);
        details.appendChild(serverIdEl);

        // Region badge
        if (server.region) {
            const rn = FluxConstants.SERVER_REGIONS[server.region]?.name || server.region;
            const rb = FluxDOM.el('span', { className: 'ff-tag ff-tag-purple ff-region-badge', style: 'margin-left:4px' });
            rb.textContent = rn;
            details.appendChild(rb);
        }

        const cardItem = FluxDOM.el('div', { className: 'card-item card-item-public-server' });
        cardItem.appendChild(thumbsContainer);
        cardItem.appendChild(details);
        li.appendChild(cardItem);

        return li;
    }

    function joinServer(server) {
        FluxNotifications.show('Joining server...', 'info', 2000);
        FluxGamesAPI.joinServer(currentGameId, server.id).catch(() => {
            FluxNotifications.show('Failed to join server', 'error', 3000);
        });
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
            FluxNotifications.show('No servers loaded — click Refresh or Filters first', 'warning');
            return;
        }
        const visible = allServers.filter(s => {
            // Only join non-full servers
            return s.playing < s.maxPlayers;
        });
        if (!visible.length) { FluxNotifications.show('No available servers', 'warning'); return; }
        const pick = visible[Math.floor(Math.random() * visible.length)];
        FluxNotifications.show('Joining random server...', 'info', 2000);
        joinServer(pick);
    }

    function observeServerList() {
        const c = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
        if (!c || serverObserver) return;
        serverObserver = new MutationObserver(FluxUtils.debounce(() => {
            if (regionScanDone && allServers.length > 0) {
                renderServerCards(allServers);
            }
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