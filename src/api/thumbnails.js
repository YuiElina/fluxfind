/**
 * FluxFind Thumbnails API Module
 * Fetches player avatar thumbnails via Roblox batch API using player tokens.
 *
 * @module api/thumbnails
 * @license GPL-2.0-only
 */
const FluxThumbnailsAPI = (() => {
    'use strict';

    const { THUMBNAILS_API } = FluxConstants.API;

    async function fetchPlayerThumbnailsBatch(userIds) {
        if (!userIds || !userIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/users/avatar-headshot`,
            { userIds: userIds.join(','), size: '150x150', format: 'Png', isCircular: 'false' },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    /**
     * Batch-fetch player thumbnails by player tokens using the POST batch endpoint.
     * Tokens come from the servers/Public API response.
     * Returns array of { requestId, token, imageUrl, targetId, state }.
     */
    async function fetchPlayerThumbnailsByTokens(playerTokens, quick = false) {
        if (!playerTokens || !playerTokens.length) return [];

        const tokens = quick ? playerTokens.slice(0, 5) : playerTokens.slice(0, 250);
        const body = tokens.map((token, idx) => ({
            requestId: `${idx}:${token}:AvatarHeadshot:150x150:webp:regular::`,
            type: 'AvatarHeadShot',
            targetId: 0,
            token: String(token),
            format: 'webp',
            size: '150x150'
        }));

        try {
            const data = await FluxHttpClient.post(
                `${THUMBNAILS_API}/batch`,
                body,
                { cache: false, retries: 2 }
            );
            const rawData = data?.data || [];
            // Roblox sometimes returns data as an object keyed by index instead of an array
            const results = Array.isArray(rawData) ? rawData : Object.values(rawData);
            FluxLogger.info('Thumbnails batch: ' + results.length + ' results parsed');
            return results;
        } catch (e) {
            FluxLogger.info('Thumbnails batch failed: ' + e.message);
            return [];
        }
    }

    async function fetchGroupIconsBatch(groupIds) {
        if (!groupIds || !groupIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/groups/icons`,
            { groupIds: groupIds.join(','), size: '150x150', format: 'Png', isCircular: 'false' },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    async function fetchCatalogThumbnailsBatch(assetIds) {
        if (!assetIds || !assetIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/assets`,
            { assetIds: assetIds.join(','), size: '150x150', format: 'png', isCircular: 'false' },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    async function fetchBundleThumbnailsBatch(bundleIds) {
        if (!bundleIds || !bundleIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/bundles/thumbnails`,
            { bundleIds: bundleIds.join(','), size: '150x150', format: 'png', isCircular: 'false' },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    return {
        fetchPlayerThumbnailsBatch, fetchPlayerThumbnailsByTokens,
        fetchGroupIconsBatch, fetchCatalogThumbnailsBatch, fetchBundleThumbnailsBatch
    };
})();