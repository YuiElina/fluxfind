import { FluxIcons } from '../ui/icons';
import { FluxLogger } from '../core/logger';
import { FluxStorage } from '../core/storage';

interface SearchCategory {
  key: string;
  label: string;
  icon: string;
  href: (query: string) => string;
}

const CATEGORIES: SearchCategory[] = [
  { key: 'games', label: 'Games', icon: 'gamepad', href: (q) => `/discover/?Keyword=${encodeURIComponent(q)}` },
  { key: 'people', label: 'People', icon: 'user', href: (q) => `/search/users?keyword=${encodeURIComponent(q)}` },
  { key: 'marketplace', label: 'Marketplace', icon: 'shopping-bag', href: (q) => `/catalog?CatalogContext=1&Keyword=${encodeURIComponent(q)}` },
  { key: 'communities', label: 'Groups', icon: 'users', href: (q) => `/search/communities?keyword=${encodeURIComponent(q)}` },
  { key: 'creator-store', label: 'Creator Store', icon: 'package', href: (q) => `https://create.roblox.com/store/models?keyword=${encodeURIComponent(q)}` },
];

function createShoppingBag(): string {
  return FluxIcons.get('shopping-bag', { size: 14 }) || `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`;
}

export const FluxFeatureSmartSearch = ((): { start: () => void; stop: () => void } => {
  let overlay: HTMLElement | null = null;
  let dropdown: HTMLElement | null = null;
  let inputObserver: MutationObserver | null = null;
  let active = false;

  function getSearchInput(): HTMLInputElement | null {
    return document.querySelector('#navbar-search-input, .navbar-search-input, input[placeholder*="Search"]');
  }

  function hideRobloxDropdown(): void {
    const robloxDropdown = document.querySelector('.dropdown-menu.new-dropdown-menu');
    if (robloxDropdown instanceof HTMLElement) {
      robloxDropdown.style.display = 'none';
    }
  }

  function showOverlay(query: string): void {
    if (!overlay || !dropdown) return;

    const rows = CATEGORIES.map(cat => {
      const icon = cat.key === 'marketplace' ? createShoppingBag() : FluxIcons.get(cat.icon, { size: 14 });
      return `<a href="${cat.href(query)}" class="ff-search-item" data-cat="${cat.key}">
        <span class="ff-search-item-icon">${icon}</span>
        <span class="ff-search-item-text">${query}</span>
        <span class="ff-search-item-suffix">in ${cat.label}</span>
      </a>`;
    }).join('');

    dropdown.innerHTML = `
      <div class="ff-search-dropdown">
        <div class="ff-search-header">Search results for "<strong>${query}</strong>"</div>
        <div class="ff-search-items">${rows}</div>
      </div>`;

    overlay.style.display = 'flex';
  }

  function hideOverlay(): void {
    if (overlay) overlay.style.display = 'none';
  }

  function createUI(): void {
    // Overlay backdrop
    overlay = document.createElement('div');
    overlay.id = 'ff-search-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:none;flex-direction:column;align-items:center;padding-top:80px;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hideOverlay();
    });

    // Dropdown container
    dropdown = document.createElement('div');
    dropdown.className = 'ff-search-container';
    overlay.appendChild(dropdown);
    document.body.appendChild(overlay);
  }

  function start(): void {
    if (active) return;
    if (!FluxStorage.getBool('smartsearch', true)) {
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

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    input.addEventListener('input', () => {
      // Hide Roblox's default dropdown
      hideRobloxDropdown();

      const query = input.value.trim();
      if (debounceTimer) clearTimeout(debounceTimer);

      if (query.length === 0) {
        hideOverlay();
        return;
      }

      debounceTimer = setTimeout(() => {
        showOverlay(query);
      }, 200);
    });

    input.addEventListener('focus', () => {
      hideRobloxDropdown();
      const query = input.value.trim();
      if (query.length > 0) showOverlay(query);
    });

    // Watch for Roblox's dropdown appearing and hide it
    inputObserver = new MutationObserver(() => {
      hideRobloxDropdown();
    });

    const robloxDropdown = document.querySelector('.dropdown-menu.new-dropdown-menu');
    if (robloxDropdown) {
      inputObserver.observe(robloxDropdown, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    // Periodically check for the dropdown
    setInterval(hideRobloxDropdown, 200);
  }

  function stop(): void {
    if (!active) return;
    FluxLogger.info('SmartSearch', 'Stopping smart search');
    active = false;

    if (overlay) { overlay.remove(); overlay = null; dropdown = null; }
    if (inputObserver) { inputObserver.disconnect(); inputObserver = null; }
  }

  return { start, stop };
})();