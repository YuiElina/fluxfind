/**
 * FluxFind Users API Module
 * User data, stats, friend counts, followers, thumbnails
 *
 * @module api/users
 * @license GPL-2.0-only
 */

const FluxUsersAPI = (() => {
    'use strict';

    const { USERS_API, FRIENDS_API, THUMBNAILS_API } = FluxConstants.API;

    /**
     * Get the current user's ID from Roblox page data
     */
    function getCurrentUserId() {
        // Primary: Roblox JS object
        try {
            const id = Roblox?.CurrentUser?.userId;
            const safeId = FluxSanitizer.sanitizeUserId(id);
            if (safeId && safeId !== 0) return safeId;
        } catch { /* fall through */ }

        // Secondary: DOM meta tag
        const meta = document.querySelector(FluxConstants.SELECTORS.USER_DATA_META);
        if (meta) {
            const fallbackId = parseInt(meta.getAttribute('data-userid'), 10);
            if (fallbackId > 0) return FluxSanitizer.sanitizeUserId(fallbackId);
        }

        return 0;
    }

    /**
     * Get user info by ID
     */
    async function getUserInfo(userId) {
        const safeId = FluxSanitizer.sanitizeUserId(userId);
        if (!safeId) return null;
        return FluxHttpClient.get(
            `${USERS_API}/users/${safeId}`,
            {},
            { cache: true }
        );
    }

    /**
     * Get user stats batch (friends, followers, following counts + info)
     */
    async function getUserStats(userId, mode = 'full') {
        const safeId = FluxSanitizer.sanitizeUserId(userId);
        if (!safeId) return null;

        if (mode === 'smartsearch') {
            const [friendCount, followerCount] = await Promise.all([
                FluxHttpClient.get(`${FRIENDS_API}/users/${safeId}/friends/count`, {}, { cache: true }),
                FluxHttpClient.get(`${FRIENDS_API}/users/${safeId}/followers/count`, {}, { cache: true })
            ]);
            return { friendCount: friendCount?.count ?? 0, followerCount: followerCount?.count ?? 0 };
        }

        const [userInfo, friendCount, followerCount, followingCount] = await Promise.all([
            getUserInfo(safeId),
            FluxHttpClient.get(`${FRIENDS_API}/users/${safeId}/friends/count`, {}, { cache: true }),
            FluxHttpClient.get(`${FRIENDS_API}/users/${safeId}/followers/count`, {}, { cache: true }),
            FluxHttpClient.get(`${FRIENDS_API}/users/${safeId}/followings/count`, {}, { cache: true })
        ]);

        return {
            userInfo,
            friendCount: friendCount?.count ?? 0,
            followerCount: followerCount?.count ?? 0,
            followingCount: followingCount?.count ?? 0
        };
    }

    /**
     * Check if a user is banned (deleted/suspended)
     */
    async function checkBannedUser(userId) {
        const info = await getUserInfo(userId);
        if (!info) return false;
        return info.isBanned === true;
    }

    /**
     * Fetch CSRF token from Roblox
     */
    async function getCsrfToken() {
        // First check DOM
        const domToken = FluxDOM.getCsrfToken();
        if (domToken) return domToken;

        // Fetch from Roblox endpoint
        try {
            const response = await fetch(`${FluxConstants.API.ROBLOX_BASE}/home`, {
                credentials: 'include'
            });
            const text = await response.text();
            const match = text.match(/data-token="([^"]+)"/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }

    return {
        getCurrentUserId,
        getUserInfo,
        getUserStats,
        checkBannedUser,
        getCsrfToken
    };
})();