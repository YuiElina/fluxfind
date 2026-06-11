import { FluxHttpClient } from './http-client';
import { FluxLogger } from '../core/logger';
import { FluxSanitizer } from '../core/sanitizer';
import { FluxConstants } from '../config/constants';

interface ServerEntry { id: string; maxPlayers: number; playing: number; playerTokens: string[] }
interface RegionResult { city: string | null; country: string; countryCode: string }

export const FluxGamesAPI = ((): {
  getCurrentGameId: () => number;
  fetchAllPublicServers: (gameId: number, sortOrder?: string, maxServers?: number) => Promise<ServerEntry[]>;
  fetchServerRegions: (gameId: number, serverIds: string[]) => Promise<Map<string, RegionResult>>;
} => {
  'use strict';

  function getCurrentGameId(): number {
    const m = /\/games\/(\d+)/.exec(window.location.href);
    return m?.[1] !== undefined ? FluxSanitizer.sanitizeUserId(m[1]) : 0;
  }

  async function fetchAllPublicServers(gameId: number, sortOrder = 'Asc', maxServers = 300): Promise<ServerEntry[]> {
    let allData: ServerEntry[] = [];
    let cursor: string | null = null;
    let page = 0;

    do {
      const url = `${FluxConstants.API.GAMES_API}/games/${String(gameId)}/servers/Public?sortOrder=${sortOrder}&limit=100${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
      const resp = await FluxHttpClient.get(url, {}, { cache: false }) as { data?: unknown; nextPageCursor?: string };
      const servers = (resp.data ?? []) as ServerEntry[];
      allData = allData.concat(servers);
      cursor = resp.nextPageCursor ?? null;
      page++;
      FluxLogger.info(`Fetched page ${String(page)}: ${String(servers.length)} servers (total: ${String(allData.length)})`);
    } while (cursor !== null && allData.length < maxServers && page < 10);

    return allData;
  }

  async function fetchServerRegions(gameId: number, serverIds: string[]): Promise<Map<string, RegionResult>> {
    if (serverIds.length === 0) return new Map();
    const results = new Map<string, RegionResult>();
    let success = 0, failed = 0;

    for (let i = 0; i < serverIds.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 250));
      const sid = serverIds[i];
      if (sid === undefined) continue;
      try {
        const data = await FluxHttpClient.post(
          `${FluxConstants.API.JOIN_API}/join-game-instance`,
          { placeId: FluxSanitizer.sanitizeUserId(gameId), gameId: sid },
          { headers: { 'User-Agent': 'Roblox/WinInet' }, retries: 0 }
        ) as Record<string, unknown>;

        // The POST response is always an object when successful — guards handle unexpected cases
        const js: Record<string, unknown> = (data.joinScript && typeof data.joinScript === 'object') ? data.joinScript as Record<string, unknown> : data;
        if (Object.keys(js).length === 0) { failed++; continue; }
        const endpoints = (js.UdmuxEndpoints ?? js.udmuxEndpoints) as { Address?: string }[] | undefined;

        if (endpoints !== undefined && endpoints.length > 0) {
          for (const ep of endpoints) {
            const epIp = ep.Address ?? null;
            if (epIp !== null && epIp !== '0.0.0.0' && !epIp.startsWith('10.') && !epIp.startsWith('127.') && !epIp.startsWith('192.168.')) {
              const geo = await import('./geolocation').then(m => m.FluxGeolocationAPI.getRegionFromIP(epIp));
              if (geo.region !== null && typeof geo.region === 'object') {
                const r = geo.region as RegionResult;
                results.set(sid, { city: r.city, country: r.country, countryCode: r.countryCode });
                success++;
                break;
              }
            }
          }
        }
        if (!results.has(sid)) failed++;
      } catch (e) {
        FluxLogger.info('Region lookup error: ' + String(e));
        failed++;
      }
    }

    FluxLogger.info(`Regions: ${String(success)} found, ${String(failed)} failed (${String(serverIds.length)} total)`);
    return results;
  }

  return { getCurrentGameId, fetchAllPublicServers, fetchServerRegions };
})();