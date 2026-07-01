import { FluxLogger } from '../core/logger';

interface ThumbResult { requestId: string; token: string; imageUrl: string | null; targetId: number; state: string }

export const FluxThumbnailsAPI = ((): {
  fetchPlayerThumbnailsByTokens: (playerTokens: string[], quick?: boolean) => Promise<ThumbResult[]>;
  fetchGroupIconsBatch: (groupIds: number[]) => Promise<{ targetId: number; imageUrl: string | null }[]>;
  fetchCatalogThumbnailsBatch: (assetIds: number[]) => Promise<{ targetId: number; imageUrl: string | null }[]>;
} => {
  'use strict';

  const THUMBNAILS_API = 'https://thumbnails.roblox.com/v1';

  async function fetchPlayerThumbnailsByTokens(playerTokens: string[], _quick = false): Promise<ThumbResult[]> {
    if (playerTokens.length === 0) return [];

    const tokens = playerTokens.slice(0, 100);
    const body = tokens.map(token => ({
      requestId: `0:${token}:AvatarHeadshot:150x150:png:regular`,
      type: 'AvatarHeadShot' as const,
      targetId: 0,
      token,
      format: 'png',
      size: '150x150',
    }));

    FluxLogger.debug('Thumbnails', `Batch request: ${String(tokens.length)} tokens`);

    // Use GM_xmlhttpRequest directly to avoid CORS issues with fetch()
    const data = await gmPost(`${THUMBNAILS_API}/batch`, body);

    const rawData = data.data ?? [];
    const results = Array.isArray(rawData) ? rawData : Object.values(rawData as Record<string, unknown>);
    const typed = results as ThumbResult[];

    const successCount = typed.filter(r => r.imageUrl != null).length;
    const failCount = typed.length - successCount;

    FluxLogger.info('Thumbnails', `Batch result: ${String(successCount)} thumbnails resolved, ${String(failCount)} failed (${String(typed.length)} total)`);

    if (failCount > 0) {
      FluxLogger.warn('Thumbnails', `${String(failCount)} thumbnails returned no imageUrl`);
    }

    return typed;
  }

  function gmPost(url: string, body: unknown): Promise<{ data?: unknown }> {
    return new Promise((resolve) => {
      if (typeof GM_xmlhttpRequest === 'undefined') {
        FluxLogger.warn('Thumbnails', 'GM_xmlhttpRequest not available, falling back to fetch');
        void fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        }).then(r => r.json() as Promise<{ data?: unknown }>).then(resolve).catch(() => {
          FluxLogger.error('Thumbnails', 'Fetch fallback failed');
          resolve({});
        });
        return;
      }

      function attempt(): void {
        GM_xmlhttpRequest({
          method: 'POST',
          url,
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          data: JSON.stringify(body),
          anonymous: false,
          timeout: 15000,
          onload: function (response: GM_XHRResponse) {
            if (response.status === 429) {
              FluxLogger.debug('Thumbnails', 'Rate limited (429), retrying after 500ms...');
              setTimeout(attempt, 500);
              return;
            }
            if (response.status >= 200 && response.status < 300) {
              try {
                resolve(JSON.parse(response.responseText) as { data?: unknown });
              } catch {
                FluxLogger.warn('Thumbnails', 'Failed to parse batch response');
                resolve({});
              }
            } else {
              FluxLogger.warn('Thumbnails', `HTTP ${String(response.status)} from thumbnail API`);
              resolve({});
            }
          },
          onerror: function () {
            FluxLogger.warn('Thumbnails', 'Network error on thumbnail batch request');
            resolve({});
          },
          ontimeout: function () {
            FluxLogger.warn('Thumbnails', 'Timeout on thumbnail batch request');
            resolve({});
          },
        });
      }

      attempt();
    });
  }

  async function fetchGroupIconsBatch(groupIds: number[]): Promise<{ targetId: number; imageUrl: string | null }[]> {
    if (groupIds.length === 0) return [];
    FluxLogger.debug('Thumbnails', `Fetching icons for ${String(groupIds.length)} groups`);

    try {
      const data = await gmGet(`${THUMBNAILS_API}/groups/icons?groupIds=${groupIds.join(',')}&size=150x150&format=Png&isCircular=false`);
      const result = (data.data ?? []) as { targetId: number; imageUrl: string | null }[];
      FluxLogger.debug('Thumbnails', `Group icons resolved: ${String(result.length)}`);
      return result;
    } catch (e) {
      FluxLogger.warn('Thumbnails', `Group icon fetch failed: ${String(e)}`);
      return [];
    }
  }

  function gmGet(url: string): Promise<{ data?: unknown }> {
    return new Promise((resolve) => {
      if (typeof GM_xmlhttpRequest === 'undefined') {
        void fetch(url, { credentials: 'include' })
          .then(r => r.json() as Promise<{ data?: unknown }>)
          .then(resolve)
          .catch(() => { resolve({}); });
        return;
      }

      GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers: { 'Accept': 'application/json' },
        anonymous: false,
        timeout: 10000,
        onload: function (response: GM_XHRResponse) {
          if (response.status >= 200 && response.status < 300) {
            try {
              resolve(JSON.parse(response.responseText) as { data?: unknown });
            } catch {
              resolve({});
            }
          } else {
            resolve({});
          }
        },
        onerror: function () { resolve({}); },
        ontimeout: function () { resolve({}); },
      });
    });
  }

  async function fetchCatalogThumbnailsBatch(assetIds: number[]): Promise<{ targetId: number; imageUrl: string | null }[]> {
    if (assetIds.length === 0) return [];
    FluxLogger.debug('Thumbnails', `Fetching catalog thumbnails for ${String(assetIds.length)} assets`);

    try {
      const data = await gmGet(`${THUMBNAILS_API}/assets?assetIds=${assetIds.join(',')}&size=150x150&format=png&isCircular=false`);
      const result = (data.data ?? []) as { targetId: number; imageUrl: string | null }[];
      FluxLogger.debug('Thumbnails', `Catalog thumbnails resolved: ${String(result.length)}`);
      return result;
    } catch (e) {
      FluxLogger.warn('Thumbnails', `Catalog thumbnail fetch failed: ${String(e)}`);
      return [];
    }
  }

  return { fetchPlayerThumbnailsByTokens, fetchGroupIconsBatch, fetchCatalogThumbnailsBatch };
})();