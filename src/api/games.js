/**
 * FluxFind Games API
 * Game/universe data fetching with batch support, caching, vote aggregation, and DataCenterId lookup.
 *
 * @module api/games
 * @license GPL-2.0-only
 */
const FluxGamesAPI = (() => {
    'use strict';

    const { GAMES_API, THUMBNAILS_API, JOIN_API } = FluxConstants.API;
    const { GAME_ICONS, GAME_VOTES } = FluxConstants.CHUNK_SIZES;

    function getCurrentGameId() {
        const m = window.location.href.match(/\/games\/(\d+)/);
        return m ? FluxSanitizer.sanitizeUserId(m[1]) : 0;
    }

    async function getUniverseId(placeId) {
        const safe = FluxSanitizer.sanitizeUserId(placeId);
        if (!safe) throw new Error('Invalid place ID');
        const d = await FluxHttpClient.get(`${GAMES_API}/games/multiget-place-details`, { placeIds: safe }, { cache: true });
        if (Array.isArray(d) && d.length && d[0].universeId) return d[0].universeId;
        throw new Error('Universe ID not found');
    }

    function getGameIcons(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const chunks = FluxUtils.chunk(ids, GAME_ICONS);
        const proms = chunks.map(c => FluxHttpClient.get(`${THUMBNAILS_API}/games/icons`, {
            universeIds: c.join(','), size: '512x512', format: 'Png', isCircular: 'false', returnPolicy: 'PlaceHolder'
        }, { cache: true }).then(r => r.data || []));
        return Promise.all(proms).then(rr => {
            const all = rr.flat();
            if (!all.length) throw new Error('No icons');
            if (single) { const f = all.find(d => String(d.targetId) === String(universeIds)); return f ? f.imageUrl : null; }
            const m = {};
            all.forEach(d => { if (d.imageUrl) m[d.targetId] = d.imageUrl; });
            return m;
        });
    }

    async function getGameDetails(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const d = await FluxHttpClient.get(`${GAMES_API}/games`, { universeIds: ids.join(',') }, { cache: true });
        if (single) return (d.data && d.data.length) ? d.data[0] : null;
        const m = {};
        if (d.data) d.data.forEach(g => { m[g.id] = g; });
        return m;
    }

    function getGameVotes(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const chunks = FluxUtils.chunk(ids, GAME_VOTES);
        const proms = chunks.map(c => FluxHttpClient.get(`${GAMES_API}/games/votes`, { universeIds: c.join(',') }, { cache: true }).then(r => r.data || []));
        return Promise.all(proms).then(rr => {
            const all = rr.flat();
            if (!all.length) throw new Error('No votes');
            if (single) { const f = all.find(d => String(d.id) === String(universeIds)); return f ? { upVotes: f.upVotes, downVotes: f.downVotes } : null; }
            const m = {};
            all.forEach(d => { m[d.id] = { upVotes: d.upVotes, downVotes: d.downVotes }; });
            return m;
        });
    }

    async function getFavoriteGames(userId) {
        const safe = FluxSanitizer.sanitizeUserId(userId);
        if (!safe) return [];
        const d = await FluxHttpClient.get(`${GAMES_API}/users/${safe}/favorite/games`, {}, { cache: true });
        return d.data || [];
    }

    async function joinServer(placeId, serverId) {
        const t = FluxDOM.getCsrfToken();
        if (!t) throw new Error('No CSRF token');
        return FluxHttpClient.post(`${JOIN_API}/join`, {
            placeId: FluxSanitizer.sanitizeUserId(placeId), gameId: serverId
        }, { headers: { 'X-CSRF-TOKEN': t, 'Content-Type': 'application/json' } });
    }

    /**
     * Fetch up to 100 public servers for a game.
     * Response: { nextPageCursor, previousPageCursor, data: [{id, maxPlayers, playing, fps, ping, playerTokens, ...}] }
     */
    async function fetchPublicServers(gameId, sortOrder = 'Asc', cursor = null, limit = 100) {
        const url = `${GAMES_API}/games/${gameId}/servers/Public?sortOrder=${sortOrder}&limit=${limit}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
        return FluxHttpClient.get(url, {}, { cache: false });
    }

    /**
     * Fetch all public servers across all pages, up to maxServers.
     */
    async function fetchAllPublicServers(gameId, sortOrder = 'Asc', maxServers = 300) {
        let allData = [];
        let cursor = null;
        let page = 0;

        do {
            const resp = await fetchPublicServers(gameId, sortOrder, cursor, 100);
            const servers = resp?.data || [];
            allData = allData.concat(servers);
            cursor = resp?.nextPageCursor || null;
            page++;
            FluxLogger.info(`Fetched page ${page}: ${servers.length} servers (total: ${allData.length})`);
        } while (cursor && allData.length < maxServers && page < 10);

        return allData;
    }

    /**
     * POST to gamejoin.roblox.com/v1/join-game to get the DataCenterId for a single server.
     * Returns region key from DATACENTER_REGION_MAP or null.
     */
    async function getServerRegion(gameId, serverId) {
        try {
            // Use the www.roblox.com GET endpoint to get joinScript with UdmuxEndpoints
            const url = `${ROBLOX_BASE}/games/${gameId}/servers/0?gameId=${gameId}&excludeFullGames=false&jobId=${serverId}`;
            const resp = await fetch(url, { credentials: 'include' });
            if (!resp.ok) {
                FluxLogger.info('Region lookup HTTP ' + resp.status + ' for ' + serverId);
                return null;
            }
            const data = await resp.json();
            const joinScript = data?.joinScript;

            // Primary: geolocate via server IP from UdmuxEndpoints
            const ip = joinScript?.UdmuxEndpoints?.[0]?.Address;
            if (ip) {
                const geo = await FluxGeolocationAPI.getRegionFromIP(ip);
                if (geo.region) return geo.region;
            }

            // Fallback: use DataCenterId mapping
            const dcId = String(joinScript?.DataCenterId || '');
            if (dcId && FluxConstants.DATACENTER_REGION_MAP[dcId]) {
                return FluxConstants.DATACENTER_REGION_MAP[dcId];
            }
        } catch (e) {
            FluxLogger.info('Region lookup error for ' + serverId + ': ' + e.message);
        }
        return null;
    }

    /**
     * Fetch regions for multiple server IDs using a rate-limited sequential dispatcher.
     * 250ms delay between requests to avoid 429 errors.
     * Returns Map<serverId, regionKey>.
     */
    async function fetchServerRegions(gameId, serverIds) {
        if (!serverIds || !serverIds.length) return new Map();
        const results = new Map();
        let success = 0, failed = 0;

        for (let i = 0; i < serverIds.length; i++) {
            if (i > 0) {
                // Rate-limit delay: 250ms between requests
                await new Promise(r => setTimeout(r, 250));
            }
            const sid = serverIds[i];
            const region = await getServerRegion(gameId, sid);
            if (region) { results.set(sid, region); success++; }
            else failed++;
        }

        FluxLogger.info(`Regions: ${success} found, ${failed} failed (${serverIds.length} total)`);
        return results;
    }

    async function getUserPresence(userId) {
        const safe = FluxSanitizer.sanitizeUserId(userId);
        if (!safe) return null;
        const d = await FluxHttpClient.post(
            `${FluxConstants.API.PRESENCE_API}/presence/users`,
            { userIds: [safe] },
            { cache: false }
        );
        return d.userPresences?.[0] || null;
    }

    return {
        getCurrentGameId, getUniverseId, getGameIcons, getGameDetails, getGameVotes,
        getFavoriteGames, joinServer, getServerRegion, fetchServerRegions, fetchPublicServers, fetchAllPublicServers, getUserPresence
    };
})();