import { FluxHttpClient } from './http-client';
import { FluxLogger } from '../core/logger';

interface GeoData { countryCode: string; country: string; city: string | null; regionName: string | null }

export const FluxGeolocationAPI = ((): {
  lookupIP: (ip: string) => Promise<GeoData | null>;
  getRegionFromIP: (ip: string) => Promise<{ region: GeoData | null; details?: GeoData | null }>;
  clearCache: () => void;
} => {
  'use strict';

  const PROVIDERS = [
    { name: 'freeipapi', base: 'https://freeipapi.com/api/json' },
    { name: 'ip-api', base: 'http://ip-api.com/json' },
  ];

  const CACHE = new Map<string, { data: GeoData; t: number }>();
  const CACHE_TTL = 1800000; // 30 minutes

  async function lookupIP(ip: string): Promise<GeoData | null> {
    if (ip === '' || ip === '0.0.0.0') return null;

    const cached = CACHE.get(ip);
    if (cached !== undefined && (Date.now() - cached.t) < CACHE_TTL) {
      FluxLogger.debug('Geolocation', `Cache hit for ${ip}: ${cached.data.city ?? cached.data.country}`);
      return cached.data;
    }

    // Try ip-api.com first (more accurate for Roblox datacenter IPs)
    let result = await tryIpApi(ip);
    if (result !== null) {
      CACHE.set(ip, { data: result, t: Date.now() });
      return result;
    }

    // Fall back to freeipapi.com
    result = await tryFreeipapi(ip);
    if (result !== null) {
      CACHE.set(ip, { data: result, t: Date.now() });
      return result;
    }

    return null;
  }

  async function tryFreeipapi(ip: string): Promise<GeoData | null> {
    try {
      const freeipapiUrl = PROVIDERS[0]?.base ?? 'https://freeipapi.com/api/json';
      const data = await FluxHttpClient.get(`${freeipapiUrl}/${ip}`, {}, { cache: false, retries: 1 }) as Record<string, unknown> | null;
      if (data !== null && typeof data === 'object' && typeof data.countryCode === 'string') {
        const result: GeoData = {
          countryCode: data.countryCode,
          country: typeof data.countryName === 'string' ? data.countryName : data.countryCode,
          city: typeof data.cityName === 'string' ? data.cityName : null,
          regionName: typeof data.regionName === 'string' ? data.regionName : null,
        };
        FluxLogger.debug('Geolocation', `freeipapi: ${ip} → ${result.city ?? result.country} (${result.countryCode})`);
        return result;
      }
    } catch (e) {
      FluxLogger.debug('Geolocation', `freeipapi failed for ${ip}: ${String(e)}`);
    }
    return null;
  }

  async function tryIpApi(ip: string): Promise<GeoData | null> {
    try {
      const ipApiUrl = PROVIDERS[1]?.base ?? 'http://ip-api.com/json';
      const data = await FluxHttpClient.get(`${ipApiUrl}/${ip}`, { fields: 'countryCode,country,city,regionName' }, { cache: false, retries: 1 }) as Record<string, unknown> | null;
      if (data !== null && typeof data === 'object' && typeof data.countryCode === 'string') {
        const result: GeoData = {
          countryCode: data.countryCode,
          country: typeof data.country === 'string' ? data.country : data.countryCode,
          city: typeof data.city === 'string' ? data.city : null,
          regionName: typeof data.regionName === 'string' ? data.regionName : null,
        };
        FluxLogger.debug('Geolocation', `ip-api: ${ip} → ${result.city ?? result.country} (${result.countryCode})`);
        return result;
      }
    } catch (e) {
      FluxLogger.debug('Geolocation', `ip-api failed for ${ip}: ${String(e)}`);
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