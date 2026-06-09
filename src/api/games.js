/**
 * FluxFind Games API Module
 * Game/Universe data fetching with batch support, caching, and vote aggregation
 *
 * @module api/games
 * @license GPL-2.0-only
 */

const FluxGamesAPI = (() => {
    'use strict';

    const { GAMES_API, THUMBNAILS_API } = FluxConstants.API;
    const { GAME_ICONS, GAME_VOTES } = FluxConstants.CHUNK_SIZES;

    /**
     * Get current game ID from URL
     */
    function getCurrentGameId() {
        const match = window.location.href.match(/\/games\/(\d+)/);
        return match ? FluxSanitizer.sanitizeUserId(match[1]) : 0;
    }

    /**
     * Get universe ID from place ID
     */
    async function getUniverseId(placeId) {
        const safeId = FluxSanitizer.sanitizeUserId(placeId);
        if (!safeId) throw new Error('Invalid place ID');

        const data = await FluxHttpClient.get(
            `${GAMES_API}/games/multiget-place-details`,
            { placeIds: safeId },
            { cache: true }
        );

        if (Array.isArray(data) && data.length > 0 && data[0].universeId) {
            FluxLogger.debug(`Universe ID for place ${safeId}: ${data[0].universeId}`);
            return data[0].universeId;
        }
        throw new Error('Universe ID not found');
    }

    /**
     * Get game icons (thumbnails) for universe IDs
     * Supports both single ID and array of IDs
     */
    function getGameIcons(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const chunks = FluxUtils.chunk(ids, GAME_ICONS);

        const chunkPromises = chunks.map(chunk => {
            const url = `${THUMBNAILS_API}/games/icons`;
            return FluxHttpClient.get(url, {
                universeIds: chunk.join(','),
                size: '512x512',
                format: 'Png',
                isCircular: 'false',
                returnPolicy: 'PlaceHolder'
            }, { cache: true }).then(r => r.data || []);
        });

        return Promise.all(chunkPromises).then(results => {
            const combined = results.flat();
            if (combined.length === 0) throw new Error('No icon data returned');

            if (single) {
                const item = combined.find(d => String(d.targetId) === String(universeIds));
                return item ? item.imageUrl : null;
            }

            const map = {};
            combined.forEach(item => {
                if (item.imageUrl) map[item.targetId] = item.imageUrl;
            });
            return map;
        });
    }

    /**
     * Get game details (name, description, playing, visits, etc.)
     * Accepts single ID or array
     */
    async function getGameDetails(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;

        const data = await FluxHttpClient.get(
            `${GAMES_API}/games`,
            { universeIds: ids.join(',') },
            { cache: true }
        );

        if (single) {
            return (data.data && data.data.length > 0) ? data.data[0] : null;
        }

        const map = {};
        if (data.data) {
            data.data.forEach(game => { map[game.id] = game; });
        }
        return map;
    }

    /**
     * Get up/down votes for universe IDs
     */
    function getGameVotes(universeIds) {
        const single = !Array.isArray(universeIds);
        const ids = single ? [universeIds] : universeIds;
        const chunks = FluxUtils.chunk(ids, GAME_VOTES);

        const chunkPromises = chunks.map(chunk => {
            return FluxHttpClient.get(
                `${GAMES_API}/games/votes`,
                { universeIds: chunk.join(',') },
                { cache: true }
            ).then(r => r.data || []);
        });

        return Promise.all(chunkPromises).then(results => {
            const combined = results.flat();
            if (combined.length === 0) throw new Error('No vote data');

            if (single) {
                const item = combined.find(d => String(d.id) === String(universeIds));
                return item ? { upVotes: item.upVotes, downVotes: item.downVotes } : null;
            }

            const map = {};
            combined.forEach(item => {
                map[item.id] = { upVotes: item.upVotes, downVotes: item.downVotes };
            });
            return map;
        });
    }

    /**
     * Get favorite games for a user
     */
    async function getFavoriteGames(userId) {
        const safeId = FluxSanitizer.sanitizeUserId(userId);
        if (!safeId) return [];

        const data = await FluxHttpClient.get(
            `${GAMES_API}/users/${safeId}/favorite/games`,
            {},
            { cache: true }
        );
        return data.data || [];
    }

    /**
     * Join a game server
     */
    async function joinServer(placeId, serverId) {
        const csrfToken = FluxDOM.getCsrfToken();
        if (!csrfToken) throw new Error('No CSRF token available');

        return FluxHttpClient.post(
            `${FluxConstants.API.JOIN_API}/join`,
            {
                placeId: FluxSanitizer.sanitizeUserId(placeId),
                gameId: serverId
            },
            {
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    /**
     * Get server details for a game
     */
    async function getServerDetails(gameId, jobId) {
        const url = `${FluxConstants.API.ROBLOX_BASE}/games/${gameId}/servers/0?gameId=${gameId}&excludeFullGames=false&jobId=${jobId}`;
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    /**
     * Get a user's presence (online status, last location)
     */
    async function getUserPresence(userId) {
        const safeId = FluxSanitizer.sanitizeUserId(userId);
        if (!safeId) return null;

        const data = await FluxHttpClient.post(
            `${FluxConstants.API.PRESENCE_API}/presence/users`,
            { userIds: [safeId] },
            { cache: false }
        );
        return data.userPresences?.[0] || null;
    }

    return {
        getCurrentGameId,
        getUniverseId,
        getGameIcons,
        getGameDetails,
        getGameVotes,
        getFavoriteGames,
        joinServer,
        getServerDetails,
        getUserPresence
    };
})();