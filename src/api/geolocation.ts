import { FluxHttpClient } from './http-client';
import { FluxLogger } from '../core/logger';

interface GeoData { countryCode: string; country: string; city: string | null; regionName: string | null }

export const FluxGeolocationAPI = ((): {
  lookupIP: (ip: string) => Promise<GeoData | null>;
  getRegionFromIP: (ip: string) => Promise<{ region: GeoData | null; details?: GeoData | null }>;
  clearCache: () => void;
} => {
  'use strict';

  const GEO_API = 'http://ip-api.com/json';
  const CACHE = new Map<string, { data: GeoData; t: number }>();
  const CACHE_TTL = 300000;

  async function lookupIP(ip: string): Promise<GeoData | null> {
    if (ip === '' || ip === '0.0.0.0') return null;

    const cached = CACHE.get(ip);
    if (cached !== undefined && (Date.now() - cached.t) < CACHE_TTL) {
      return cached.data;
    }

    try {
      const data = await FluxHttpClient.get(`${GEO_API}/${ip}`, { fields: 'countryCode,country,city,regionName' }, { cache: false, retries: 1 }) as Record<string, unknown> | null;
      if (data !== null && typeof data === 'object' && typeof data.countryCode === 'string') {
        const result: GeoData = {
          countryCode: data.countryCode,
          country: typeof data.country === 'string' ? data.country : data.countryCode,
          city: typeof data.city === 'string' ? data.city : null,
          regionName: typeof data.regionName === 'string' ? data.regionName : null,
        };
        CACHE.set(ip, { data: result, t: Date.now() });
        return result;
      }
    } catch (e) {
      FluxLogger.info('IP geolocation failed for ' + ip + ': ' + String(e));
    }
    return null;
  }

  async function getRegionFromIP(ip: string): Promise<{ region: GeoData | null; details?: GeoData | null }> {
    const geo = await lookupIP(ip);
    if (geo !== null) {
      FluxLogger.info(`IP ${ip} → ${geo.city ?? geo.country} (${geo.countryCode})`);
      return { region: geo };
    }
    return { region: null, details: geo };
  }

  function clearCache(): void {
    CACHE.clear();
  }

  return { lookupIP, getRegionFromIP, clearCache };
})();