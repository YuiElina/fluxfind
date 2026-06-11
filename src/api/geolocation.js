/**
 * FluxFind Geolocation API
 * Maps server IP addresses to our region zones using ip-api.com (free, no API key).
 * Falls back to DataCenterId mapping if geolocation fails.
 *
 * @module api/geolocation
 * @license GPL-2.0-only
 */

const FluxGeolocationAPI = (() => {
    'use strict';

    const GEO_API = 'https://ip-api.com/json';
    const CACHE = new Map();
    const CACHE_TTL = 300000; // 5 minutes

    /** Look up IP location using ip-api.com (GM_xmlhttpRequest, CORS-free) */
    async function lookupIP(ip) {
        if (!ip || ip === '0.0.0.0') return null;

        const cached = CACHE.get(ip);
        if (cached && (Date.now() - cached.t) < CACHE_TTL) {
            return cached.data;
        }

        try {
            const data = await FluxHttpClient.get(
                `${GEO_API}/${ip}`,
                { fields: 'countryCode,country,city,regionName' },
                { cache: false, retries: 1 }
            );
            if (data && data.countryCode) {
                const result = {
                    countryCode: data.countryCode,
                    country: data.country || data.countryCode,
                    city: data.city || null,
                    regionName: data.regionName || null,
                };
                CACHE.set(ip, { data: result, t: Date.now() });
                return result;
            }
        } catch (e) {
            FluxLogger.info('IP geolocation failed for ' + ip + ': ' + e.message);
        }
        return null;
    }

    /** Get region info from IP address (cached) */
    async function getRegionFromIP(ip) {
        const geo = await lookupIP(ip);
        if (geo && geo.countryCode) {
            FluxLogger.info(`IP ${ip} → ${geo.city || geo.country} (${geo.countryCode})`);
            return { region: geo };
        }
        FluxLogger.info(`IP ${ip} → unknown region`);
        return { region: null, details: geo };
    }

    function clearCache() {
        CACHE.clear();
    }

    return { lookupIP, getRegionFromIP, clearCache };
})();