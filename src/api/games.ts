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

    FluxLogger.info('GamesAPI', `Fetching servers for game ${String(gameId)} (max: ${String(maxServers)})`);

    do {
      const url = `${FluxConstants.API.GAMES_API}/games/${String(gameId)}/servers/Public?sortOrder=${sortOrder}&limit=100${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
      const resp = await FluxHttpClient.get(url, {}, { cache: false }) as { data?: unknown; nextPageCursor?: string };
      const servers = (resp.data ?? []) as ServerEntry[];
      allData = allData.concat(servers);
      cursor = resp.nextPageCursor ?? null;
      page++;
      FluxLogger.debug('GamesAPI', `Page ${String(page)}: ${String(servers.length)} servers (total: ${String(allData.length)}, cursor: ${cursor ? 'yes' : 'none'})`);
    } while (cursor !== null && allData.length < maxServers && page < 10);

    FluxLogger.info('GamesAPI', `Server fetch complete: ${String(allData.length)} servers across ${String(page)} page(s)`);
    return allData;
  }

  async function fetchSingleRegion(gameId: number, sid: string): Promise<{ sid: string; result: RegionResult | null }> {
    try {
      const data = await FluxHttpClient.post(
        `${FluxConstants.API.JOIN_API}/join-game-instance`,
        { placeId: FluxSanitizer.sanitizeUserId(gameId), gameId: sid },
        { headers: { 'User-Agent': 'Roblox/WinInet' }, retries: 0 }
      ) as Record<string, unknown>;

      const js: Record<string, unknown> = (data.joinScript && typeof data.joinScript === 'object') ? data.joinScript as Record<string, unknown> : data;
      if (Object.keys(js).length === 0) {
        FluxLogger.warn('GamesAPI', `Region [${sid}]: empty joinScript response`);
        return { sid, result: null };
      }

      const endpoints = (js.UdmuxEndpoints ?? js.udmuxEndpoints) as { Address?: string }[] | undefined;
      if (endpoints === undefined || endpoints.length === 0) {
        FluxLogger.warn('GamesAPI', `Region [${sid}]: no UdmuxEndpoints in response`);
        return { sid, result: null };
      }

      for (const ep of endpoints) {
        const epIp = ep.Address ?? null;
        if (epIp !== null && epIp !== '0.0.0.0' && !epIp.startsWith('10.') && !epIp.startsWith('127.') && !epIp.startsWith('192.168.')) {
          const geo = await import('./geolocation').then(m => m.FluxGeolocationAPI.getRegionFromIP(epIp));
          if (geo.region !== null && typeof geo.region === 'object') {
            const r = geo.region as RegionResult;
            FluxLogger.info('GamesAPI', `Region [${sid}]: ${r.city ?? r.country} (${r.countryCode}) via ${epIp}`);
            return { sid, result: r };
          }
        }
      }

      FluxLogger.warn('GamesAPI', `Region [${sid}]: no valid public IP found in endpoints`);
      return { sid, result: null };
    } catch (e) {
      FluxLogger.warn('GamesAPI', `Region [${sid}]: lookup exception — ${String(e)}`);
      return { sid, result: null };
    }
  }

  async function fetchServerRegions(gameId: number, serverIds: string[]): Promise<Map<string, RegionResult>> {
    if (serverIds.length === 0) return new Map();

    const results = new Map<string, RegionResult>();
    let success = 0;
    let failed = 0;
    const CHUNK_SIZE = 5;

    FluxLogger.info('GamesAPI', `Region scan: ${String(serverIds.length)} servers in chunks of ${String(CHUNK_SIZE)}`);
    FluxLogger.timeStart('region-scan');

    const chunks: string[][] = [];
    for (let i = 0; i < serverIds.length; i += CHUNK_SIZE) {
      chunks.push(serverIds.slice(i, i + CHUNK_SIZE));
    }

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      if (chunk === undefined) continue;

      if (ci > 0) await new Promise(r => setTimeout(r, 250));

      const settled = await Promise.allSettled(chunk.map(sid => fetchSingleRegion(gameId, sid)));

      const retryIds: string[] = [];
      for (const s of settled) {
        if (s.status === 'fulfilled') {
          const val = s.value;
          if (val.result !== null) {
            results.set(val.sid, val.result);
            success++;
          } else {
            retryIds.push(val.sid);
          }
        } else {
          failed++;
        }
      }

      // Single retry for failed lookups
      if (retryIds.length > 0) {
        FluxLogger.debug('GamesAPI', `Retrying ${String(retryIds.length)} failed region lookups`);
        await new Promise(r => setTimeout(r, 500));
        const retrySettled = await Promise.allSettled(retryIds.map(sid => fetchSingleRegion(gameId, sid)));
        for (const s of retrySettled) {
          if (s.status === 'fulfilled') {
            const val = s.value;
            if (val.result !== null) {
              results.set(val.sid, val.result);
              success++;
            } else {
              failed++;
            }
          } else {
            failed++;
          }
        }
      }

      FluxLogger.debug('GamesAPI', `Chunk ${String(ci + 1)}/${String(chunks.length)}: ${String(success)} found, ${String(failed)} failed so far`);
    }

    const elapsed = FluxLogger.timeEnd('region-scan', 'GamesAPI');
    FluxLogger.info('GamesAPI', `Region scan complete: ${String(success)}/${String(serverIds.length)} resolved, ${String(failed)} failed (${String(elapsed)}ms)`);

    return results;
  }

  return { getCurrentGameId, fetchAllPublicServers, fetchServerRegions };
})();