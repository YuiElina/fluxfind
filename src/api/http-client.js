/**
 * FluxFind HTTP Client Module
 * High-performance request layer with caching, retry, rate-limit handling, and batch support
 *
 * @module api/http-client
 * @license GPL-2.0-only
 */

const FluxHttpClient = (() => {
    'use strict';

    const CACHE = new Map();
    const CACHE_TTL = 30000; // 30s default
    const MAX_CACHE_ENTRIES = 200;

    function _cacheKey(url) {
        return FluxUtils.fastHash(url);
    }

    function _cacheGet(url) {
        const hash = _cacheKey(url);
        const entry = CACHE.get(hash);
        if (entry && (Date.now() - entry.t) < CACHE_TTL) {
            return entry.data;
        }
        if (entry) CACHE.delete(hash);
        return null;
    }

    function _cacheSet(url, data) {
        const hash = _cacheKey(url);
        CACHE.set(hash, { data, t: Date.now() });
        if (CACHE.size > MAX_CACHE_ENTRIES) {
            const first = CACHE.keys().next().value;
            CACHE.delete(first);
        }
    }

    function _buildUrl(base, params = {}) {
        const url = new URL(base);
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null) url.searchParams.set(k, v);
        }
        return url.toString();
    }

    /**
     * Perform a GET request with GM_xmlhttpRequest, caching and retry support
     */
    function get(url, params = {}, options = {}) {
        const {
            cache = false,
            retries = FluxConstants.RETRY.MAX_RETRIES,
            headers = {}
        } = options;

        const fullUrl = _buildUrl(url, params);

        if (cache) {
            const cached = _cacheGet(fullUrl);
            if (cached) {
                FluxLogger.debug('Cache hit:', fullUrl);
                return Promise.resolve(cached);
            }
        }

        return _requestWithRetry('GET', fullUrl, null, {
            ...headers,
            'Accept': 'application/json'
        }, retries).then(data => {
            if (cache) _cacheSet(fullUrl, data);
            return data;
        });
    }

    /**
     * Perform a POST request
     */
    function post(url, body, options = {}) {
        const {
            retries = FluxConstants.RETRY.MAX_RETRIES,
            headers = {}
        } = options;

        return _requestWithRetry('POST', url, body, {
            ...headers,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }, retries);
    }

    function _requestWithRetry(method, url, body, headers, maxRetries) {
        return FluxUtils.retry(() => _doRequest(method, url, body, headers), maxRetries, FluxConstants.RETRY.BASE_DELAY);
    }

    function _doRequest(method, url, body, headers) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                // Fallback to fetch API
                const fetchOptions = {
                    method,
                    headers,
                    credentials: 'include'
                };
                if (body) fetchOptions.body = JSON.stringify(body);

                fetch(url, fetchOptions)
                    .then(response => {
                        if (response.status === 429) {
                            reject(new Error('RATE_LIMITED'));
                            return;
                        }
                        if (!response.ok) reject(new Error(`HTTP ${response.status}`));
                        return response.json();
                    })
                    .then(data => resolve(data))
                    .catch(err => {
                        if (err.message === 'RATE_LIMITED') reject(err);
                        else reject(new Error('Network error'));
                    });
                return;
            }

            const requestConfig = {
                method,
                url,
                headers,
                onload: function(response) {
                    if (response.status === 429) {
                        reject(new Error('RATE_LIMITED'));
                        return;
                    }
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch (e) {
                            resolve(response.responseText);
                        }
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: function() {
                    reject(new Error('Network error'));
                },
                ontimeout: function() {
                    reject(new Error('Timeout'));
                },
                timeout: 15000
            };

            if (body) {
                requestConfig.data = JSON.stringify(body);
            }

            GM_xmlhttpRequest(requestConfig);
        });
    }

    /**
     * Batch GET requests using Promise.all with concurrency limit
     */
    async function batchGet(urls, options = {}) {
        const {
            cache = false,
            concurrency = 6
        } = options;

        const tasks = urls.map(({ url, params }) => () => get(url, params, { cache }));
        return FluxUtils.parallelLimit(tasks, concurrency);
    }

    /**
     * Clear the response cache
     */
    function clearCache() {
        CACHE.clear();
        FluxLogger.debug('HTTP cache cleared');
    }

    /**
     * Set cache TTL in milliseconds
     */
    function setCacheTTL(ttl) {
        // CACHE_TTL is const at module level; for extensibility,
        // we clear the cache to force fresh data
        clearCache();
    }

    return {
        get, post, batchGet, clearCache, setCacheTTL
    };
})();