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

    /**
     * Map ISO 3166-1 alpha-2 country codes to our region keys.
     */
    const COUNTRY_TO_REGION = {
        // North America
        US: 'us-east-1', CA: 'us-east-1', MX: 'us-east-1',
        // Western Europe
        GB: 'eu-west-1', DE: 'eu-west-1', FR: 'eu-west-1',
        NL: 'eu-west-1', IE: 'eu-west-1', BE: 'eu-west-1',
        LU: 'eu-west-1', CH: 'eu-west-1', AT: 'eu-west-1',
        DK: 'eu-west-1', NO: 'eu-west-1', SE: 'eu-west-1',
        FI: 'eu-west-1', ES: 'eu-west-1', PT: 'eu-west-1',
        IT: 'eu-west-1', LI: 'eu-west-1', MC: 'eu-west-1',
        // Eastern Europe
        PL: 'eu-east-1', CZ: 'eu-east-1', SK: 'eu-east-1',
        HU: 'eu-east-1', RO: 'eu-east-1', BG: 'eu-east-1',
        HR: 'eu-east-1', SI: 'eu-east-1', RS: 'eu-east-1',
        UA: 'eu-east-1', BY: 'eu-east-1', MD: 'eu-east-1',
        LT: 'eu-east-1', LV: 'eu-east-1', EE: 'eu-east-1',
        RU: 'eu-east-1', GR: 'eu-east-1', TR: 'eu-east-1',
        // East Asia
        JP: 'ap-northeast-1', KR: 'ap-northeast-1', TW: 'ap-northeast-1',
        CN: 'ap-northeast-1', MN: 'ap-northeast-1',
        // Southeast Asia
        SG: 'ap-southeast-1', HK: 'ap-southeast-1', TH: 'ap-southeast-1',
        VN: 'ap-southeast-1', MY: 'ap-southeast-1', PH: 'ap-southeast-1',
        ID: 'ap-southeast-1', KH: 'ap-southeast-1', LA: 'ap-southeast-1',
        MM: 'ap-southeast-1', BN: 'ap-southeast-1',
        // Oceania
        AU: 'au-east-1', NZ: 'au-east-1', FJ: 'au-east-1',
        // South America
        BR: 'sa-east-1', AR: 'sa-east-1', CL: 'sa-east-1',
        CO: 'sa-east-1', PE: 'sa-east-1', VE: 'sa-east-1',
        UY: 'sa-east-1', PY: 'sa-east-1', BO: 'sa-east-1',
        EC: 'sa-east-1', GY: 'sa-east-1', SR: 'sa-east-1',
        // India
        IN: 'in-west-1', BD: 'in-west-1', LK: 'in-west-1',
        NP: 'in-west-1', PK: 'in-west-1',
        // Middle East
        AE: 'me-west-1', SA: 'me-west-1', QA: 'me-west-1',
        KW: 'me-west-1', BH: 'me-west-1', OM: 'me-west-1',
        IL: 'me-west-1', JO: 'me-west-1', LB: 'me-west-1',
        EG: 'me-west-1', IQ: 'me-west-1', IR: 'me-west-1',
        SY: 'me-west-1', YE: 'me-west-1',
        // Africa (default to Europe West since Roblox mostly uses EU/ME DCs)
        ZA: 'eu-west-1', NG: 'eu-west-1', KE: 'eu-west-1',
        GH: 'eu-west-1', MA: 'eu-west-1', DZ: 'eu-west-1',
        TN: 'eu-west-1', ET: 'eu-west-1', TZ: 'eu-west-1',
    };

    /** Look up IP location with caching (uses GM_xmlhttpRequest to bypass CORS) */
    async function lookupIP(ip) {
        if (!ip || ip === '0.0.0.0') return null;

        // Check cache
        const cached = CACHE.get(ip);
        if (cached && (Date.now() - cached.t) < CACHE_TTL) {
            return cached.data;
        }

        try {
            // Use FluxHttpClient which uses GM_xmlhttpRequest (CORS-free)
            const data = await FluxHttpClient.get(
                `${GEO_API}/${ip}`,
                { fields: 'countryCode,country,city,regionName' },
                { cache: false, retries: 1 }
            );
            if (data && data.countryCode) {
                const region = COUNTRY_TO_REGION[data.countryCode] || null;
                const result = {
                    countryCode: data.countryCode,
                    country: data.country,
                    city: data.city,
                    regionName: data.regionName,
                    fluxRegion: region
                };
                CACHE.set(ip, { data: result, t: Date.now() });
                return result;
            }
        } catch (e) {
            FluxLogger.info('IP geolocation failed for ' + ip + ': ' + e.message);
        }
        return null;
    }

    /** Get region key from IP address (cached) */
    async function getRegionFromIP(ip) {
        const geo = await lookupIP(ip);
        if (geo && geo.fluxRegion) {
            FluxLogger.info(`IP ${ip} → ${geo.country} (${geo.fluxRegion})`);
            return { region: geo.fluxRegion, details: geo };
        }
        FluxLogger.info(`IP ${ip} → unknown region`);
        return { region: null, details: geo };
    }

    function clearCache() {
        CACHE.clear();
    }

    return { lookupIP, getRegionFromIP, clearCache, COUNTRY_TO_REGION };
})();