/**
 * FluxFind Thumbnails API Module
 * Player, group, catalog, and bundle thumbnail fetching via GM_xmlhttpRequest (CORS-safe).
 *
 * @module api/thumbnails
 * @license GPL-2.0-only
 */

const FluxThumbnailsAPI = (() => {
    'use strict';

    const { THUMBNAILS_API } = FluxConstants.API;

    /**
     * Fetch player avatar headshots by user IDs
     */
    async function fetchPlayerThumbnailsBatch(userIds) {
        if (!userIds || !userIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/users/avatar-headshot`,
            {
                userIds: userIds.join(','),
                size: '150x150',
                format: 'Png',
                isCircular: 'false'
            },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    /**
     * Fetch player thumbnails via batch POST using player tokens from server API.
     * Uses FluxHttpClient.post() (GM_xmlhttpRequest) to avoid CORS issues.
     * Format matches Roblox's thumbnail batch API:
     *   { requestId, type: "AvatarHeadShot", targetId, token, format: "webp", size: "150x150" }
     */
    async function fetchPlayerThumbnailsByTokens(playerTokens, quick = false) {
        if (!playerTokens || !playerTokens.length) return [];

        const tokens = quick ? playerTokens.slice(0, 5) : playerTokens.slice(0, 250);

        const body = tokens.map(token => ({
            requestId: `0:${token}:AvatarHeadshot:150x150:webp:regular`,
            type: 'AvatarHeadShot',
            targetId: 0,
            token,
            format: 'webp',
            size: '150x150'
        }));

        return FluxHttpClient.post(
            `${THUMBNAILS_API}/batch`,
            body,
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    /**
     * Fetch group icons by group IDs
     */
    async function fetchGroupIconsBatch(groupIds) {
        if (!groupIds || !groupIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/groups/icons`,
            {
                groupIds: groupIds.join(','),
                size: '150x150',
                format: 'Png',
                isCircular: 'false'
            },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    /**
     * Fetch catalog item thumbnails by asset IDs
     */
    async function fetchCatalogThumbnailsBatch(assetIds) {
        if (!assetIds || !assetIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/assets`,
            {
                assetIds: assetIds.join(','),
                size: '150x150',
                format: 'png',
                isCircular: 'false'
            },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    /**
     * Fetch bundle thumbnails
     */
    async function fetchBundleThumbnailsBatch(bundleIds) {
        if (!bundleIds || !bundleIds.length) return [];
        return FluxHttpClient.get(
            `${THUMBNAILS_API}/bundles/thumbnails`,
            {
                bundleIds: bundleIds.join(','),
                size: '150x150',
                format: 'png',
                isCircular: 'false'
            },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    return {
        fetchPlayerThumbnailsBatch,
        fetchPlayerThumbnailsByTokens,
        fetchGroupIconsBatch,
        fetchCatalogThumbnailsBatch,
        fetchBundleThumbnailsBatch
    };
})();