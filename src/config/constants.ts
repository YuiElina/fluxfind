interface RegionChip { label: string; cc: string }
interface RegionChipGroup { group: string; chips: RegionChip[] }

export const FluxConstants = ((): {
  VERSION: string;
  API: { ROBLOX_BASE: string; GAMES_API: string; THUMBNAILS_API: string; FRIENDS_API: string; USERS_API: string; CATALOG_API: string; GROUPS_API: string; JOIN_API: string; PRESENCE_API: string };
  CHUNK_SIZES: { THUMBNAILS: number; GAME_ICONS: number; GAME_VOTES: number; USER_STATS: number; PLAYER_THUMBS: number; GROUP_ICONS: number; CATALOG_ITEMS: number };
  RETRY: { MAX_RETRIES: number; BASE_DELAY: number; RATE_LIMIT_DELAY: number; MAX_DELAY: number };
  TIMING: { OBSERVER_DEBOUNCE: number; URL_CHECK_INTERVAL: number; SERVER_REFRESH_COOLDOWN: number; POPUP_DURATION: number; ANIMATION_DURATION: number; LAZY_LOAD_MARGIN: number };
  SELECTORS: { SERVER_LIST: string; SERVER_ITEM: string; SERVER_JOIN_BTN: string; GAME_PAGE: string; CSRF_META: string };
  DEFAULT_SETTINGS: Record<string, unknown>;
  URL_PATTERNS: { GAME_PAGE: RegExp; HOME_PAGE: RegExp; PROFILE_PAGE: RegExp; GROUP_PAGE: RegExp; CATALOG_PAGE: RegExp; SEARCH_PAGE: RegExp; SERVERS_PAGE: RegExp };
  REGION_CHIPS: RegionChipGroup[];
  COUNTRY_GROUPS: Record<string, string[]>;
  getCountryGroup: (cc: string) => string | null;
} => {
  'use strict';

  const VERSION = '0.1.0-alpha' as const;

  const API = {
    ROBLOX_BASE: 'https://www.roblox.com',
    GAMES_API: 'https://games.roblox.com/v1',
    THUMBNAILS_API: 'https://thumbnails.roblox.com/v1',
    FRIENDS_API: 'https://friends.roblox.com/v1',
    USERS_API: 'https://users.roblox.com/v1',
    CATALOG_API: 'https://catalog.roblox.com/v1',
    GROUPS_API: 'https://groups.roblox.com/v1',
    JOIN_API: 'https://gamejoin.roblox.com/v1',
    PRESENCE_API: 'https://presence.roblox.com/v1',
  } as const;

  const CHUNK_SIZES = {
    THUMBNAILS: 10, GAME_ICONS: 10, GAME_VOTES: 10,
    USER_STATS: 50, PLAYER_THUMBS: 50, GROUP_ICONS: 25, CATALOG_ITEMS: 25,
  } as const;

  const RETRY = { MAX_RETRIES: 3, BASE_DELAY: 500, RATE_LIMIT_DELAY: 250, MAX_DELAY: 8000 } as const;
  const TIMING = { OBSERVER_DEBOUNCE: 200, URL_CHECK_INTERVAL: 1500, SERVER_REFRESH_COOLDOWN: 2000, POPUP_DURATION: 3000, ANIMATION_DURATION: 300, LAZY_LOAD_MARGIN: 200 } as const;

  const SELECTORS = {
    SERVER_LIST: '#rbx-public-game-server-item-container, .card-list',
    SERVER_ITEM: '.rbx-public-game-server-item, .game-server-item, [role="listitem"]',
    SERVER_JOIN_BTN: '.rbx-public-game-server-join, .game-server-join-btn',
    GAME_PAGE: 'div[data-testid="game-detail-page"]',
    CSRF_META: 'meta[name="csrf-token"]',
  } as const;

  const DEFAULT_SETTINGS: Record<string, unknown> = {
    enableLogs: false, logLevel: 'INFO', enablenotifications: true, removeads: true,
    togglefilterserversbutton: true, responsivegamecards: true, forcedarkmode: false,
    betterprivateservers: true, smartsearch: true, disablechat: false,
    smallerrobloxsidebar: false, autoserverregions: true, autoserverregionnumber: 16,
    serverfetchcount: 150, serverregionfilter: '',
  };

  const URL_PATTERNS = {
    GAME_PAGE: /^\/games\/(\d+)/, HOME_PAGE: /^(\/[a-z]{2})?\/home\/?$/i,
    PROFILE_PAGE: /^\/users\/(\d+)/, GROUP_PAGE: /^\/groups\/(\d+)/,
    CATALOG_PAGE: /^\/catalog\/(\d+)/, SEARCH_PAGE: /^\/discover/,
    SERVERS_PAGE: /games\/\d+\/.+\/servers/,
  };

  const COUNTRY_GROUPS: Record<string, string[]> = {
    NA: ['US', 'CA', 'MX'],
    EU: ['GB', 'DE', 'FR', 'NL', 'IE', 'BE', 'LU', 'CH', 'AT', 'DK', 'NO', 'SE', 'FI', 'ES', 'PT', 'IT', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'RS', 'UA', 'LT', 'LV', 'EE', 'GR', 'TR'],
    AS: ['JP', 'KR', 'TW', 'CN', 'SG', 'HK', 'TH', 'VN', 'MY', 'PH', 'ID', 'IN', 'BD', 'LK', 'PK'],
    OC: ['AU', 'NZ', 'FJ'], SA: ['BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'UY', 'PY', 'BO', 'EC'],
    ME: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IL', 'JO', 'LB', 'EG', 'IQ', 'IR', 'SY', 'YE'],
  };

  function getCountryGroup(cc: string): string | null {
    for (const [group, countries] of Object.entries(COUNTRY_GROUPS)) {
      if (countries.includes(cc)) return group;
    }
    return null;
  }

  const REGION_CHIPS: RegionChipGroup[] = [
    { group: 'North America', chips: [
      { label: 'Ashburn, VA', cc: 'US' }, { label: 'Dallas, TX', cc: 'US' },
      { label: 'Los Angeles, CA', cc: 'US' }, { label: 'Miami, FL', cc: 'US' },
      { label: 'Portland, OR', cc: 'US' },
    ]},
    { group: 'Europe', chips: [
      { label: 'Amsterdam', cc: 'NL' }, { label: 'Frankfurt', cc: 'DE' },
      { label: 'London', cc: 'GB' }, { label: 'Paris', cc: 'FR' }, { label: 'Warsaw', cc: 'PL' },
    ]},
    { group: 'Asia', chips: [
      { label: 'Hong Kong', cc: 'HK' }, { label: 'Mumbai', cc: 'IN' },
      { label: 'Singapore', cc: 'SG' }, { label: 'Tokyo', cc: 'JP' },
    ]},
    { group: 'Oceania', chips: [{ label: 'Sydney', cc: 'AU' }] },
    { group: 'South America', chips: [{ label: 'São Paulo', cc: 'BR' }] },
  ];

  return {
    VERSION, API, CHUNK_SIZES, RETRY, TIMING,
    SELECTORS, DEFAULT_SETTINGS, URL_PATTERNS,
    REGION_CHIPS, COUNTRY_GROUPS, getCountryGroup,
  };
})();