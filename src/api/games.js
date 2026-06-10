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
     * Response: { nextPageCursor, previousPageCursor, data: [{id, maxPlayers, playing, fps, ping, ...}] }
     */
    async function fetchPublicServers(gameId, sortOrder = 'Asc', cursor = null, limit = 100) {
        const url = `${GAMES_API}/games/${gameId}/servers/Public?sortOrder=${sortOrder}&limit=${limit}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
        return FluxHttpClient.get(url, {}, { cache: false });
    }

    /**
     * POST to gamejoin.roblox.com/v1/join-game to get the DataCenterId for a single server.
     * Uses GM_xmlhttpRequest (via FluxHttpClient) to bypass CORS.
     * Returns region key or null for full/private servers.
     */
    async function getServerRegion(gameId, jobId) {
        try {
            const data = await FluxHttpClient.post(
                `${JOIN_API}/join-game`,
                {
                    placeId: gameId,
                    isTeleport: false,
                    gameId: jobId,
                    gameJoinAttemptId: jobId
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Referer': `https://www.roblox.com/games/${gameId}/`,
                        'Origin': 'https://www.roblox.com'
                    },
                    retries: 1
                }
            );
            const dcId = String(data?.joinScript?.DataCenterId || '');
            if (dcId && FluxConstants.DATACENTER_REGION_MAP[dcId]) {
                return FluxConstants.DATACENTER_REGION_MAP[dcId];
            }
        } catch (e) {
            FluxLogger.info('Server region lookup failed for jobId ' + jobId + ': ' + e.message);
        }
        return null;
    }

    /**
     * Batch-fetch regions for multiple jobIds in parallel.
     * Returns Map<jobId, regionKey>.
     */
    async function fetchServerRegions(gameId, jobIds) {
        if (!jobIds || !jobIds.length) return new Map();
        const results = new Map();
        let success = 0, failed = 0;

        const tasks = jobIds.map(jid => async () => {
            const region = await getServerRegion(gameId, jid);
            if (region) { results.set(jid, region); success++; }
            else failed++;
        });

        await FluxUtils.parallelLimit(tasks, 4);
        FluxLogger.info(`Regions: ${success} found, ${failed} failed (${jobIds.length} total)`);
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
        getFavoriteGames, joinServer, getServerRegion, fetchServerRegions, fetchPublicServers, getUserPresence
    };
})();