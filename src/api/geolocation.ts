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
      FluxLogger.debug('Geolocation', `Cache hit for ${ip}: ${cached.data.city ?? cached.data.country}`);
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
        FluxLogger.debug('Geolocation', `Resolved ${ip} → ${result.city ?? result.country} (${result.countryCode})`);
        return result;
      }
      FluxLogger.warn('Geolocation', `No countryCode in response for ${ip}`);
    } catch (e) {
      FluxLogger.warn('Geolocation', `Lookup failed for ${ip}: ${String(e)}`);
    }
    return null;
  }

  async function getRegionFromIP(ip: string): Promise<{ region: GeoData | null; details?: GeoData | null }> {
    const geo = await lookupIP(ip);
    if (geo !== null) {
      return { region: geo };
    }
    return { region: null, details: geo };
  }

  function clearCache(): void {
    const size = CACHE.size;
    CACHE.clear();
    FluxLogger.debug('Geolocation', `Cache cleared (${String(size)} entries)`);
  }

  return { lookupIP, getRegionFromIP, clearCache };
})();