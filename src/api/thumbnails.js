/**
 * FluxFind Thumbnails API Module
 * Player, group, catalog, and bundle thumbnail fetching with queuing and batching
 *
 * @module api/thumbnails
 * @license GPL-2.0-only
 */

const FluxThumbnailsAPI = (() => {
    'use strict';

    const { THUMBNAILS_API } = FluxConstants.API;
    const { PLAYER_THUMBS, GROUP_ICONS, CATALOG_ITEMS } = FluxConstants.CHUNK_SIZES;

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
     * Fetch player thumbnails via batch POST (for player tokens from server API)
     * Uses internal queue to handle rate limits
     */
    const fetchPlayerThumbnailsByTokens = (() => {
        const queue = [];
        let processing = false;
        const RATE_LIMIT_DELAY = 250;

        async function processQueue() {
            if (processing) return;
            processing = true;

            while (queue.length > 0) {
                const { playerTokens, resolve } = queue.shift();
                let success = false;
                let data = [];

                while (!success) {
                    try {
                        const response = await fetch(`${THUMBNAILS_API}/batch`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(playerTokens.map(token => ({
                                requestId: `0:${token}:AvatarHeadshot:150x150:png:regular`,
                                type: 'AvatarHeadShot',
                                targetId: 0,
                                token,
                                format: 'png',
                                size: '150x150'
                            })))
                        });

                        if (response.status === 429) {
                            await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
                        } else {
                            const json = await response.json();
                            data = json.data || [];
                            success = true;
                        }
                    } catch {
                        data = [];
                        success = true;
                    }
                }
                resolve(data);
            }
            processing = false;
        }

        return function(playerTokens, quick = false) {
            if (quick) {
                const body = playerTokens.slice(0, 5).map(token => ({
                    requestId: `0:${token}:AvatarHeadshot:150x150:png:regular`,
                    type: 'AvatarHeadShot',
                    targetId: 0,
                    token,
                    format: 'png',
                    size: '150x150'
                }));

                return FluxHttpClient.post(
                    `${THUMBNAILS_API}/batch`,
                    body,
                    { cache: false }
                ).then(r => r.data || []).catch(() => []);
            }

            return new Promise(resolve => {
                queue.push({ playerTokens, resolve });
                processQueue();
            });
        };
    })();

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