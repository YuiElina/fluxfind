import { FluxIcons } from '../ui/icons';
import { FluxLogger } from '../core/logger';
import { FluxSanitizer } from '../core/sanitizer';
import { smartSearchAtom } from '../state/atoms';

interface GameResult {
  universeId: number;
  name: string;
  playerCount: number;
  rootPlaceId: number;
  imageUrl?: string;
}

interface UserResult {
  userId: number;
  username: string;
  displayName: string;
  imageUrl?: string;
}

type SearchTab = 'games' | 'people';

export const FluxFeatureSmartSearch = ((): { start: () => void; stop: () => void } => {
  let overlay: HTMLElement | null = null;
  let dropdown: HTMLElement | null = null;
  let active = false;
  let activeTab: SearchTab = 'games';
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;

  function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getSearchInput(): HTMLInputElement | null {
    return document.querySelector('#navbar-search-input, .navbar-search-input, input[placeholder*="Search"]');
  }

  function hideRobloxDropdown(): void {
    const robloxDropdown = document.querySelector('.dropdown-menu.new-dropdown-menu');
    if (robloxDropdown instanceof HTMLElement) {
      robloxDropdown.style.display = 'none';
    }
  }

  async function fetchGames(query: string): Promise<GameResult[]> {
    const sessionId = uuid();
    try {
      const resp = await fetch(`https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(query)}&pageToken=&sessionId=${sessionId}&pageType=all`, {
        credentials: 'include',
      });
      if (!resp.ok) return [];
      const data = await resp.json() as { searchResults?: { contentGroupType?: string; contents?: { universeId: number; name: string; playerCount: number; rootPlaceId: number }[] }[] };
      const gameGroup = (data.searchResults ?? []).find(g => g.contentGroupType === 'Game');
      if (!gameGroup?.contents) return [];
      const games = gameGroup.contents.slice(0, 8);

      // Fetch game icons in batch
      const iconBody = games.map(g => ({
        requestId: `${String(g.universeId)}::GameIcon:256x256:webp:regular:::false`,
        type: 'GameIcon',
        targetId: g.universeId,
        token: '',
        format: 'webp',
        size: '256x256',
        version: '',
      }));

      const iconResp = await fetch('https://thumbnails.roblox.com/v1/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(iconBody),
      });

      const iconData = await iconResp.json() as { data?: { targetId: number; imageUrl: string }[] };
      const iconMap = new Map<number, string>();
      (iconData.data ?? []).forEach(r => { iconMap.set(r.targetId, r.imageUrl); });

      return games.map(g => ({ ...g, imageUrl: iconMap.get(g.universeId) }));
    } catch {
      return [];
    }
  }

  async function fetchUsers(query: string): Promise<UserResult[]> {
    const sessionId = uuid();
    try {
      const resp = await fetch(`https://apis.roblox.com/search-api/omni-search?verticalType=user&searchQuery=${encodeURIComponent(query)}&pageToken=&globalSessionId=${sessionId}&sessionId=${sessionId}`, {
        credentials: 'include',
      });
      if (!resp.ok) return [];
      const data = await resp.json() as { searchResults?: { contentGroupType?: string; contents?: { contentId: number; username: string; displayName: string }[] }[] };
      const userGroup = (data.searchResults ?? []).find(g => g.contentGroupType === 'User');
      if (!userGroup?.contents) return [];
      const users = userGroup.contents.slice(0, 8);

      // Fetch avatar headshots in batch
      const avatarBody = users.map(u => ({
        requestId: `${String(u.contentId)}:undefined:AvatarHeadshot:150x150:webp:regular:0::false`,
        type: 'AvatarHeadShot',
        targetId: u.contentId,
        format: 'webp',
        size: '150x150',
      }));

      const avatarResp = await fetch('https://thumbnails.roblox.com/v1/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(avatarBody),
      });

      const avatarData = await avatarResp.json() as { data?: { targetId: number; imageUrl: string }[] };
      const avatarMap = new Map<number, string>();
      (avatarData.data ?? []).forEach(r => { avatarMap.set(r.targetId, r.imageUrl); });

      return users.map(u => ({ userId: u.contentId, username: u.username, displayName: u.displayName, imageUrl: avatarMap.get(u.contentId) }));
    } catch {
      return [];
    }
  }

  function formatCount(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  async function showResults(query: string, tab: SearchTab): Promise<void> {
    if (!overlay || !dropdown) return;

    if (tab === 'games') {
      FluxSanitizer.safeInnerHTML(dropdown, `<div class="ff-search-dropdown"><div class="ff-search-header">Searching games for "<strong>${FluxSanitizer.escapeHtml(query)}</strong>"...</div><div class="ff-search-loading"><div class="ff-spinner"></div></div></div>`);
      overlay.style.display = 'flex';

      const games = await fetchGames(query);

      if (games.length === 0) {
        FluxSanitizer.safeInnerHTML(dropdown, `<div class="ff-search-dropdown"><div class="ff-search-header">No games found for "<strong>${FluxSanitizer.escapeHtml(query)}</strong>"</div></div>`);
        return;
      }

      const rows = games.map(g => `<a href="/games/${String(g.rootPlaceId)}/" class="ff-search-result">
        <img class="ff-search-thumb" src="${FluxSanitizer.sanitizeUrl(g.imageUrl ?? '')}" alt="" loading="lazy" onerror="this.style.display='none'" />
        <div class="ff-search-info">
          <span class="ff-search-name">${FluxSanitizer.escapeHtml(g.name)}</span>
          <span class="ff-search-meta"><span class="ff-player-badge">${FluxIcons.get('user', { size: 12 })} ${formatCount(g.playerCount)}</span></span>
        </div>
      </a>`).join('');

      dropdown.innerHTML = `<div class="ff-search-dropdown">
        <div class="ff-search-tabs">
          <span class="ff-search-tab ff-active" data-tab="games">${FluxIcons.get('gamepad', { size: 14 })} Games</span>
          <span class="ff-search-tab" data-tab="people">${FluxIcons.get('user', { size: 14 })} People</span>
        </div>
        <div class="ff-search-items">${rows}</div>
      </div>`;
    } else {
      FluxSanitizer.safeInnerHTML(dropdown, `<div class="ff-search-dropdown"><div class="ff-search-header">Searching people for "<strong>${FluxSanitizer.escapeHtml(query)}</strong>"...</div><div class="ff-search-loading"><div class="ff-spinner"></div></div></div>`);

      const users = await fetchUsers(query);

      if (users.length === 0) {
        FluxSanitizer.safeInnerHTML(dropdown, `<div class="ff-search-dropdown"><div class="ff-search-header">No people found for "<strong>${FluxSanitizer.escapeHtml(query)}</strong>"</div></div>`);
        return;
      }

      const rows = users.map(u => `<a href="/users/${String(u.userId)}/profile" class="ff-search-result">
        <img class="ff-search-thumb ff-search-avatar" src="${FluxSanitizer.sanitizeUrl(u.imageUrl ?? '')}" alt="" loading="lazy" onerror="this.style.display='none'" />
        <div class="ff-search-info">
          <span class="ff-search-name">${FluxSanitizer.escapeHtml(u.displayName)}</span>
          <span class="ff-search-meta">@${FluxSanitizer.escapeHtml(u.username)}</span>
        </div>
      </a>`).join('');

      dropdown.innerHTML = `<div class="ff-search-dropdown">
        <div class="ff-search-tabs">
          <span class="ff-search-tab" data-tab="games">${FluxIcons.get('gamepad', { size: 14 })} Games</span>
          <span class="ff-search-tab ff-active" data-tab="people">${FluxIcons.get('user', { size: 14 })} People</span>
        </div>
        <div class="ff-search-items">${rows}</div>
      </div>`;
    }

    // Wire tab clicks
    dropdown.querySelectorAll('.ff-search-tab').forEach(tabEl => {
      tabEl.addEventListener('click', function (this: HTMLElement) {
        const newTab = this.dataset.tab as SearchTab | undefined;
        if (!newTab) return;
        activeTab = newTab;
        const input = getSearchInput();
        if (input) void showResults(input.value.trim(), activeTab);
      });
    });

    overlay.style.display = 'flex';
  }

  function hideOverlay(): void {
    if (abortController) { abortController.abort(); abortController = null; }
    if (overlay) overlay.style.display = 'none';
  }

  function createUI(): void {
    overlay = document.createElement('div');
    overlay.id = 'ff-search-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:none;flex-direction:column;align-items:center;padding-top:80px;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hideOverlay(); });

    dropdown = document.createElement('div');
    dropdown.className = 'ff-search-container';
    overlay.appendChild(dropdown);
    document.body.appendChild(overlay);
  }

  function start(): void {
    if (active) return;
    if (!smartSearchAtom.get()) {
      FluxLogger.info('SmartSearch', 'Disabled in settings, skipping');
      return;
    }

    FluxLogger.info('SmartSearch', 'Starting smart search');
    createUI();
    active = true;

    const input = getSearchInput();
    if (!input) {
      FluxLogger.warn('SmartSearch', 'Search input not found');
      return;
    }

    input.addEventListener('input', () => {
      hideRobloxDropdown();
      const query = input.value.trim();
      if (searchTimer) clearTimeout(searchTimer);

      if (query.length === 0) {
        hideOverlay();
        return;
      }

      searchTimer = setTimeout(() => void showResults(query, activeTab), 300);
    });

    input.addEventListener('focus', () => {
      hideRobloxDropdown();
      const query = input.value.trim();
      if (query.length > 0) void showResults(query, activeTab);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideOverlay();
    });

    setInterval(hideRobloxDropdown, 200);
  }

  function stop(): void {
    if (!active) return;
    active = false;
    if (overlay) { overlay.remove(); overlay = null; dropdown = null; }
  }

  return { start, stop };
})();