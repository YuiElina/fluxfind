/**
 * FluxFind Games API
 * Game/universe data fetching with batch support, caching, vote aggregation, and DataCenterId lookup.
 *
 * @module api/games
 * @license GPL-2.0-only
 */

const FluxGamesAPI = (() => {
    'use strict';

    const { GAMES_API, THUMBNAILS_API, ROBLOX_BASE } = FluxConstants.API;
    const { GAME_ICONS, GAME_VOTES } = FluxConstants.CHUNK_SIZES;

    function getCurrentGameId() {
        const match = window.location.href.match(/\/games\/(\d+)/);
        return match ? FluxSanitizer.sanitizeUserId(match[1]) : 0;
    }

    async function getUniverseId(placeId) {
        const safeId = FluxSanitizer.sanitizeUserId(placeId);
        if (!safeId) throw new Error('Invalid place ID');
        const data = await FluxHttpClient.get(
            `${GAMES_API}/games/multiget-place-details`,
            { placeIds: safeId },
            { cache: true }
        );
        if (Array.isArray(data) && data.length > 0 && data[0].universeId) {
            FluxLogger.debug('Universe ID for place ' + safeId + ': ' + data[0].universeId);
            return data[0].universeId;
        }
        throw new Error('Universe ID not found');
    }

    function getGameIcons(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const chunks = FluxUtils.chunk(ids, GAME_ICONS);

        const chunkPromises = chunks.map(chunk =>
            FluxHttpClient.get(`${THUMBNAILS_API}/games/icons`, {
                universeIds: chunk.join(','),
                size: '512x512', format: 'Png', isCircular: 'false', returnPolicy: 'PlaceHolder'
            }, { cache: true }).then(r => r.data || [])
        );

        return Promise.all(chunkPromises).then(results => {
            const combined = results.flat();
            if (combined.length === 0) throw new Error('No icon data returned');
            if (single) {
                const item = combined.find(d => String(d.targetId) === String(universeIds));
                return item ? item.imageUrl : null;
            }
            const map = {};
            combined.forEach(item => { if (item.imageUrl) map[item.targetId] = item.imageUrl; });
            return map;
        });
    }

    async function getGameDetails(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const data = await FluxHttpClient.get(
            `${GAMES_API}/games`,
            { universeIds: ids.join(',') },
            { cache: true }
        );
        if (single) return (data.data && data.data.length > 0) ? data.data[0] : null;
        const map = {};
        if (data.data) data.data.forEach(game => { map[game.id] = game; });
        return map;
    }

    function getGameVotes(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const chunks = FluxUtils.chunk(ids, GAME_VOTES);
        const chunkPromises = chunks.map(chunk =>
            FluxHttpClient.get(`${GAMES_API}/games/votes`,
                { universeIds: chunk.join(',') },
                { cache: true }
            ).then(r => r.data || [])
        );
        return Promise.all(chunkPromises).then(results => {
            const combined = results.flat();
            if (combined.length === 0) throw new Error('No vote data');
            if (single) {
                const item = combined.find(d => String(d.id) === String(universeIds));
                return item ? { upVotes: item.upVotes, downVotes: item.downVotes } : null;
            }
            const map = {};
            combined.forEach(item => { map[item.id] = { upVotes: item.upVotes, downVotes: item.downVotes }; });
            return map;
        });
    }

    async function getFavoriteGames(userId) {
        const safeId = FluxSanitizer.sanitizeUserId(userId);
        if (!safeId) return [];
        const data = await FluxHttpClient.get(
            `${GAMES_API}/users/${safeId}/favorite/games`, {}, { cache: true }
        );
        return data.data || [];
    }

    async function joinServer(placeId, serverId) {
        const csrfToken = FluxDOM.getCsrfToken();
        if (!csrfToken) throw new Error('No CSRF token available');
        return FluxHttpClient.post(
            `${FluxConstants.API.JOIN_API}/join`,
            { placeId: FluxSanitizer.sanitizeUserId(placeId), gameId: serverId },
            { headers: { 'X-CSRF-TOKEN': csrfToken, 'Content-Type': 'application/json' } }
        );
    }

    /**
     * Get server details including DataCenterId.
     * Returns null for full/private servers (HTTP 404 — no join script available).
     */
    async function getServerDetails(gameId, jobId) {
        const url = `${ROBLOX_BASE}/games/${gameId}/servers/0?gameId=${gameId}&excludeFullGames=false&jobId=${jobId}`;
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) return null; // 404 = full server, 403 = private — both expected
        const data = await response.json();
        return data;
    }

    /**
     * Batch-fetch DataCenterIds. Skips full servers silently (they return 404).
     * Returns Map<jobId, regionKey>.
     */
    async function fetchServerRegions(gameId, jobIds) {
        if (!jobIds || !jobIds.length) return new Map();
        const results = new Map();
        let attempted = 0, succeeded = 0, full = 0;

        const tasks = jobIds.map(jobId => async () => {
            attempted++;
            try {
                const data = await getServerDetails(gameId, jobId);
                if (!data) { full++; return; }
                const dcId = String(data?.joinScript?.DataCenterId || '');
                if (dcId && FluxConstants.DATACENTER_REGION_MAP[dcId]) {
                    results.set(jobId, FluxConstants.DATACENTER_REGION_MAP[dcId]);
                    succeeded++;
                }
            } catch { full++; }
        });

        await FluxUtils.parallelLimit(tasks, 4);
        FluxLogger.info(`Regions: ${succeeded} found, ${full} full/private, ${attempted} total`);
        return results;
    }

    async function getUserPresence(userId) {
        const safeId = FluxSanitizer.sanitizeUserId(userId);
        if (!safeId) return null;
        const data = await FluxHttpClient.post(
            `${FluxConstants.API.PRESENCE_API}/presence/users`,
            { userIds: [safeId] }, { cache: false }
        );
        return data.userPresences?.[0] || null;
    }

    return {
        getCurrentGameId, getUniverseId, getGameIcons, getGameDetails, getGameVotes,
        getFavoriteGames, joinServer, getServerDetails, fetchServerRegions, getUserPresence
    };
})();