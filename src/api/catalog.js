/**
 * FluxFind Catalog API Module
 * Catalog item details and metadata fetching
 *
 * @module api/catalog
 * @license GPL-2.0-only
 */

const FluxCatalogAPI = (() => {
    'use strict';

    const { CATALOG_API } = FluxConstants.API;

    /**
     * Get catalog item details by asset ID
     */
    async function getItemDetails(assetId) {
        const safeId = FluxSanitizer.sanitizeUserId(assetId);
        if (!safeId) return null;

        return FluxHttpClient.get(
            `${CATALOG_API}/catalog/items/${safeId}/details`,
            { itemType: 'Asset' },
            { cache: true }
        ).catch(() => null);
    }

    /**
     * Search catalog items
     */
    async function searchItems(query, limit = 30) {
        const safeQuery = FluxSanitizer.escapeHtml(query);
        return FluxHttpClient.get(
            `${CATALOG_API}/search/items`,
            {
                keyword: safeQuery,
                limit,
                category: 'All'
            },
            { cache: true }
        ).then(r => r.data || []).catch(() => []);
    }

    /**
     * Get items in a bundle
     */
    async function getBundleDetails(bundleId) {
        const safeId = FluxSanitizer.sanitizeUserId(bundleId);
        if (!safeId) return null;

        return FluxHttpClient.get(
            `${CATALOG_API}/bundles/${safeId}/details`,
            {},
            { cache: true }
        ).catch(() => null);
    }

    return {
        getItemDetails,
        searchItems,
        getBundleDetails
    };
})();