import { FluxHttpClient } from './http-client';
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

    try {
      const data = await FluxHttpClient.post(`${THUMBNAILS_API}/batch`, body, { cache: false, retries: 2 }) as { data?: unknown } | null;
      const rawData = data?.data ?? [];
      const results = Array.isArray(rawData) ? rawData : Object.values(rawData as Record<string, unknown>);
      const typed = results as ThumbResult[];

      const successCount = typed.filter(r => r.imageUrl != null).length;
      const failCount = typed.length - successCount;

      FluxLogger.info('Thumbnails', `Batch result: ${String(successCount)} thumbnails resolved, ${String(failCount)} failed (${String(typed.length)} total)`);

      if (failCount > 0) {
        FluxLogger.warn('Thumbnails', `${String(failCount)} thumbnails returned no imageUrl — API may have rejected some tokens`);
      }

      return typed;
    } catch (e) {
      FluxLogger.error('Thumbnails', `Batch request failed: ${String(e)}`);
      return [];
    }
  }

  async function fetchGroupIconsBatch(groupIds: number[]): Promise<{ targetId: number; imageUrl: string | null }[]> {
    if (groupIds.length === 0) return [];
    FluxLogger.debug('Thumbnails', `Fetching icons for ${String(groupIds.length)} groups`);
    return FluxHttpClient.get(
      `${THUMBNAILS_API}/groups/icons`,
      { groupIds: groupIds.join(','), size: '150x150', format: 'Png', isCircular: 'false' },
      { cache: true }
    ).then(r => {
      const result = ((r as { data?: unknown } | null)?.data ?? []) as { targetId: number; imageUrl: string | null }[];
      FluxLogger.debug('Thumbnails', `Group icons resolved: ${String(result.length)}`);
      return result;
    }).catch((e: unknown) => {
      FluxLogger.warn('Thumbnails', `Group icon fetch failed: ${String(e)}`);
      return [];
    });
  }

  async function fetchCatalogThumbnailsBatch(assetIds: number[]): Promise<{ targetId: number; imageUrl: string | null }[]> {
    if (assetIds.length === 0) return [];
    FluxLogger.debug('Thumbnails', `Fetching catalog thumbnails for ${String(assetIds.length)} assets`);
    return FluxHttpClient.get(
      `${THUMBNAILS_API}/assets`,
      { assetIds: assetIds.join(','), size: '150x150', format: 'png', isCircular: 'false' },
      { cache: true }
    ).then(r => {
      const result = ((r as { data?: unknown } | null)?.data ?? []) as { targetId: number; imageUrl: string | null }[];
      FluxLogger.debug('Thumbnails', `Catalog thumbnails resolved: ${String(result.length)}`);
      return result;
    }).catch((e: unknown) => {
      FluxLogger.warn('Thumbnails', `Catalog thumbnail fetch failed: ${String(e)}`);
      return [];
    });
  }

  return { fetchPlayerThumbnailsByTokens, fetchGroupIconsBatch, fetchCatalogThumbnailsBatch };
})();