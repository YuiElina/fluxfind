/**
 * FluxFind Configuration Constants
 * All static configuration and constants in one place
 *
 * @module config/constants
 * @license GPL-2.0-only
 */

const FluxConstants = (() => {
    'use strict';

    const VERSION = '1.0.0';

    const API = {
        ROBLOX_BASE: 'https://www.roblox.com',
        GAMES_API: 'https://games.roblox.com/v1',
        THUMBNAILS_API: 'https://thumbnails.roblox.com/v1',
        FRIENDS_API: 'https://friends.roblox.com/v1',
        USERS_API: 'https://users.roblox.com/v1',
        CATALOG_API: 'https://catalog.roblox.com/v1',
        GROUPS_API: 'https://groups.roblox.com/v1',
        JOIN_API: 'https://gamejoin.roblox.com/v1',
        PRESENCE_API: 'https://presence.roblox.com/v1'
    };

    const CHUNK_SIZES = {
        THUMBNAILS: 10,
        GAME_ICONS: 10,
        GAME_VOTES: 10,
        USER_STATS: 50,
        PLAYER_THUMBS: 50,
        GROUP_ICONS: 25,
        CATALOG_ITEMS: 25
    };

    const RETRY = {
        MAX_RETRIES: 3,
        BASE_DELAY: 500,
        RATE_LIMIT_DELAY: 250,
        MAX_DELAY: 8000
    };

    const TIMING = {
        OBSERVER_DEBOUNCE: 200,
        URL_CHECK_INTERVAL: 1500,
        SERVER_REFRESH_COOLDOWN: 2000,
        POPUP_DURATION: 3000,
        ANIMATION_DURATION: 300,
        LAZY_LOAD_MARGIN: 200
    };

    const SELECTORS = {
        SERVER_LIST: '#rbx-public-game-server-item-container, .card-list',
        SERVER_ITEM: '.rbx-public-game-server-item, .game-server-item, [role="listitem"]',
        SERVER_OPTIONS: '.server-list-options',
        SERVER_JOIN_BTN: '.rbx-public-game-server-join, .game-server-join-btn',
        SERVER_STATUS: '.rbx-game-status, .rbx-public-game-server-status, .text-overflow',
        GAME_PAGE: 'div[data-testid="game-detail-page"]',
        USER_DATA_META: 'meta[name="user-data"]',
        CSRF_META: 'meta[name="csrf-token"]',
        SEARCH_BAR: '#global-header-search'
    };

    const STORAGE_KEYS = {
        SETTINGS_PREFIX: 'FLUXFIND_',
        ENABLE_LOGS: 'enableLogs',
        LOG_LEVEL: 'logLevel',
        NOTIFICATIONS: 'enablenotifications',
        REMOVE_ADS: 'removeads',
        FILTER_SERVERS: 'togglefilterserversbutton',
        RESPONSIVE_CARDS: 'responsivegamecards',
        CUSTOM_BACKGROUNDS: 'CUSTOMBACKGROUND_settings',
        VERSION: 'version',
        DARK_MODE: 'forcedarkmode',
        LEGACY_MIGRATED: '_legacy_migrated'
    };

    const DEFAULT_SETTINGS = {
        enableLogs: false,
        logLevel: 'INFO',
        enablenotifications: true,
        removeads: true,
        togglefilterserversbutton: true,
        responsivegamecards: true,
        forcedarkmode: false,
        betterprivateservers: true,
        smartsearch: true,
        disablechat: false,
        smallerrobloxsidebar: false,
        autoserverregions: true,
        autoserverregionnumber: 16
    };

    const PRESET_CONFIGURATIONS = {
        default: { name: 'Default', settings: {} },
        minimalist: {
            name: 'Minimalist',
            settings: {
                removeads: true,
                togglefilterserversbutton: false,
                responsivegamecards: false,
                smartsearch: false
            }
        },
        powerUser: {
            name: 'Power User',
            settings: {
                enableLogs: true,
                logLevel: 'DEBUG',
                enablenotifications: true,
                removeads: true,
                smartsearch: true,
                autoserverregions: true,
                autoserverregionnumber: 32
            }
        }
    };

    const SERVER_REGIONS = {
        'us-east-1': { name: 'US East', coords: [38.9072, -77.0369] },
        'us-west-1': { name: 'US West', coords: [37.7749, -122.4194] },
        'eu-west-1': { name: 'Europe West', coords: [51.5074, -0.1278] },
        'eu-east-1': { name: 'Europe East', coords: [52.2297, 21.0122] },
        'ap-southeast-1': { name: 'Southeast Asia', coords: [1.3521, 103.8198] },
        'ap-northeast-1': { name: 'East Asia', coords: [35.6762, 139.6503] },
        'sa-east-1': { name: 'South America', coords: [-23.5505, -46.6333] },
        'au-east-1': { name: 'Australia', coords: [-33.8688, 151.2093] },
        'in-west-1': { name: 'India', coords: [19.0760, 72.8777] },
        'me-west-1': { name: 'Middle East', coords: [25.2048, 55.2708] }
    };

    /** Predefined region filter chips grouped by continent */
    const REGION_CHIPS = [
        { group: 'North America', chips: [
            { label: 'Ashburn, VA', cc: 'US' },
            { label: 'Atlanta, GA', cc: 'US' },
            { label: 'Chicago, IL', cc: 'US' },
            { label: 'Dallas, TX', cc: 'US' },
            { label: 'Los Angeles, CA', cc: 'US' },
            { label: 'Miami, FL', cc: 'US' },
            { label: 'New York / New Jersey', cc: 'US' },
            { label: 'Portland, OR', cc: 'US' },
            { label: 'San Jose / Palo Alto', cc: 'US' },
            { label: 'Washington D.C.', cc: 'US' }
        ]},
        { group: 'Europe', chips: [
            { label: 'Amsterdam', cc: 'NL' },
            { label: 'Frankfurt', cc: 'DE' },
            { label: 'London', cc: 'GB' },
            { label: 'Paris', cc: 'FR' },
            { label: 'Warsaw', cc: 'PL' }
        ]},
        { group: 'Asia', chips: [
            { label: 'Hong Kong', cc: 'HK' },
            { label: 'Mumbai', cc: 'IN' },
            { label: 'Singapore', cc: 'SG' },
            { label: 'Tokyo', cc: 'JP' }
        ]},
        { group: 'Oceania', chips: [
            { label: 'Sydney', cc: 'AU' }
        ]},
        { group: 'South America', chips: [
            { label: 'São Paulo', cc: 'BR' }
        ]}
    ];

    /**
     * Maps Roblox DataCenterId (numeric string) to our region key.
     * Based on known Roblox datacenter IDs.
     */
    const DATACENTER_REGION_MAP = {
        // US East / Ashburn
        '1': 'us-east-1', '2': 'us-east-1', '3': 'us-east-1',
        // US West
        '4': 'us-west-1', '5': 'us-west-1',
        // Europe West / London/Amsterdam
        '6': 'eu-west-1', '7': 'eu-west-1', '8': 'eu-west-1',
        // Europe East / Warsaw
        '9': 'eu-east-1',
        // Southeast Asia / Singapore
        '10': 'ap-southeast-1', '11': 'ap-southeast-1',
        // East Asia / Tokyo
        '12': 'ap-northeast-1', '13': 'ap-northeast-1',
        // South America / Sao Paulo
        '14': 'sa-east-1',
        // Australia / Sydney
        '15': 'au-east-1', '16': 'au-east-1',
        // India / Mumbai
        '17': 'in-west-1', '18': 'in-west-1',
        // Middle East / Dubai
        '19': 'me-west-1', '20': 'me-west-1'
    };

    const URL_PATTERNS = {
        GAME_PAGE: /^\/games\/(\d+)/,
        HOME_PAGE: /^(\/[a-z]{2})?\/home\/?$/i,
        PROFILE_PAGE: /^\/users\/(\d+)/,
        GROUP_PAGE: /^\/groups\/(\d+)/,
        CATALOG_PAGE: /^\/catalog\/(\d+)/,
        SEARCH_PAGE: /^\/discover/,
        SERVERS_PAGE: /games\/\d+\/.+\/servers/
    };

    return {
        VERSION,
        API, CHUNK_SIZES, RETRY, TIMING,
        SELECTORS, STORAGE_KEYS, DEFAULT_SETTINGS,
        PRESET_CONFIGURATIONS, SERVER_REGIONS, REGION_CHIPS, DATACENTER_REGION_MAP, URL_PATTERNS
    };
})();