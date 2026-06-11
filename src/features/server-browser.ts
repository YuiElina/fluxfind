import { FluxDOM } from '../core/dom';
import { FluxIcons } from '../ui/icons';
import { FluxUtils } from '../core/utils';
import { FluxLogger } from '../core/logger';
import { FluxStorage } from '../core/storage';
import { FluxConstants } from '../config/constants';
import { FluxGamesAPI } from '../api/games';
import { FluxNotifications } from '../ui/notifications';
import { FluxModals } from '../ui/modals';
import { FluxThumbnailsAPI } from '../api/thumbnails';

interface ServerCard {
  id: string;
  playing: number;
  maxPlayers: number;
  playerTokens: string[];
  thumbnails: string[];
  region: { city: string | null; country: string; countryCode: string } | null;
}

export const FluxFeatureServerBrowser = ((): { init: () => Promise<void>; destroy: () => void } => {
  let loaded = false;
  let serverObserver: MutationObserver | null = null;
  let _rendering = false;
  let allServers: ServerCard[] = [];
  let displayedServers: ServerCard[] = [];
  let regionScanDone = false;
  let currentGameId = 0;

  async function scanAndCacheRegions(force = false): Promise<void> {
    if (!force && regionScanDone) { FluxLogger.info('Region scan: already done'); return; }
    regionScanDone = false;
    allServers = [];

    if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }

    FluxLogger.info('Region scan: fetching server list...');
    FluxNotifications.show('Fetching servers from Roblox API...', 'info', 4000);

    let servers: { id: string; maxPlayers: number; playing: number; playerTokens: string[] }[];
    try { servers = await FluxGamesAPI.fetchAllPublicServers(currentGameId, 'Asc', 300); }
    catch (e) { FluxLogger.info(`Fetch failed: ${String(e)}`); FluxNotifications.show('Failed to fetch servers', 'error', 3000); observeServerList(); return; }

    if (servers.length === 0) { FluxLogger.info('0 servers returned'); FluxNotifications.show('No public servers found', 'warning', 3000); observeServerList(); return; }

    FluxLogger.info(`Region scan: got ${String(servers.length)} servers`);
    FluxNotifications.show(`Scanning regions for ${String(servers.length)} servers...`, 'info', 5000);

    const ids = servers.map(s => s.id).slice(0, 30);
    const regionMap = await FluxGamesAPI.fetchServerRegions(currentGameId, ids);

    const allTokens: string[] = [];
    const tokenSet = new Set<string>();
    servers.forEach(s => { s.playerTokens.forEach(t => { if (!tokenSet.has(t)) { tokenSet.add(t); allTokens.push(t); } }); });

    const thumbnailMap = new Map<string, string>();
    if (allTokens.length > 0) {
      const chunks = FluxUtils.chunk(allTokens, 100);
      FluxLogger.info(`Fetching thumbnails for ${String(allTokens.length)} players in ${String(chunks.length)} batch(es)`);
      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunk = chunks[i];
          if (chunk === undefined) continue;
          const thumbs = await FluxThumbnailsAPI.fetchPlayerThumbnailsByTokens(chunk, false);
          thumbs.forEach(t => { if (t.imageUrl && t.requestId) { const parts = t.requestId.split(':'); if (parts.length >= 2 && parts[1] !== undefined) thumbnailMap.set(parts[1], t.imageUrl); } });
        } catch (e) { FluxLogger.info(`Thumbnail batch ${String(i + 1)} failed: ${String(e)}`); }
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 300));
      }
      FluxLogger.info(`Got ${String(thumbnailMap.size)} thumbnails`);
    }

    allServers = servers.slice(0, 30).map(s => ({
      id: s.id,
      playing: s.playing,
      maxPlayers: s.maxPlayers,
      playerTokens: s.playerTokens,
      thumbnails: s.playerTokens.slice(0, 5).map(t => thumbnailMap.get(t) ?? null).filter((x): x is string => x !== null),
      region: regionMap.get(s.id) ?? null,
    }));

    regionScanDone = true;
    FluxLogger.info(`Region scan: ${String(allServers.length)} servers ready`);

    const savedRegion = FluxStorage.get('serverregionfilter');
    if (savedRegion) applyRegionFilter(savedRegion);
    else renderServerCards(allServers);
    observeServerList();
  }

  function renderServerCards(servers: ServerCard[]): void {
    displayedServers = servers;
    const container = document.querySelector('#rbx-public-game-server-item-container');
    if (!container) return;

    _rendering = true;
    container.innerHTML = '';

    if (servers.length === 0) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--ff-text-muted)">No servers match this filter</div>';
      _rendering = false;
      return;
    }

    const fragment = document.createDocumentFragment();
    servers.forEach(s => fragment.appendChild(createServerCard(s)));
    container.appendChild(fragment);
    _rendering = false;
  }

  function createServerCard(server: ServerCard): HTMLElement {
    const li = FluxDOM.el('li', { className: 'rbx-public-game-server-item col-md-3 col-sm-4 col-xs-6' });
    const card = FluxDOM.el('div', { className: 'card-item card-item-public-server' });
    const thumbsContainer = FluxDOM.el('div', { className: 'player-thumbnails-container' });

    const maxSlots = 6;
    const isFull = server.playing >= server.maxPlayers;
    const totalTokens = server.playerTokens.length;

    if (server.thumbnails.length === 0) {
      const countDiv = FluxDOM.el('div', { style: 'display:flex;align-items:center;justify-content:center;min-height:56px;padding:8px;flex-basis:100%' });
      const badge = FluxDOM.el('span', { className: 'ff-badge', style: 'font-size:13px;padding:6px 14px' });
      badge.innerHTML = `${FluxIcons.get('users', { size: 14, color: '#fff' })} ${String(server.playing)} / ${String(server.maxPlayers)}`;
      countDiv.appendChild(badge);
      thumbsContainer.appendChild(countDiv);
    } else {
      const thumbsToShow = server.thumbnails.slice(0, maxSlots);
      for (let i = 0; i < maxSlots; i++) {
        const avatar = FluxDOM.el('span', { className: 'avatar avatar-headshot-md player-avatar' });
        const imgContainer = FluxDOM.el('span', { className: 'thumbnail-2d-container avatar-card-image' });

        if (i < thumbsToShow.length) {
          const thumb = thumbsToShow[i];
          if (thumb !== undefined) {
            const img = FluxDOM.el('img', { src: thumb, alt: '', title: '' });
            img.addEventListener('error', function () { ((this as HTMLImageElement).style.display) = 'none'; });
            imgContainer.appendChild(img);
          }
        } else if (!isFull && i < totalTokens) {
          avatar.classList.add('avatar-ghost');
          imgContainer.innerHTML = FluxIcons.get('user', { size: 24, color: 'currentColor' });
        } else if (!isFull) {
          avatar.classList.add('avatar-ghost');
          imgContainer.innerHTML = FluxIcons.get('userRoundPlus', { size: 24, color: 'currentColor' });
        }
        avatar.appendChild(imgContainer);
        thumbsContainer.appendChild(avatar);
      }
    }

    if (totalTokens > maxSlots) {
      const children = thumbsContainer.children;
      if (children.length >= maxSlots) {
        const lastAvatar = children[maxSlots - 1] as HTMLElement | undefined;
        if (lastAvatar) {
          lastAvatar.style.position = 'relative';
          const badge = FluxDOM.el('span', { className: 'ff-overflow-badge' });
          badge.textContent = `+${String(totalTokens - maxSlots)}`;
          lastAvatar.appendChild(badge);
        }
      }
    }

    const details = FluxDOM.el('div', { className: 'rbx-public-game-server-details game-server-details' });
    const gaugeContainer = FluxDOM.el('div', { className: 'server-player-count-gauge border' });
    const gauge = FluxDOM.el('div', { className: 'gauge-inner-bar border', style: `width:${String(Math.min(100, (server.playing / server.maxPlayers) * 100))}%` });
    gaugeContainer.appendChild(gauge);

    const joinSpan = FluxDOM.el('span');
    joinSpan.setAttribute('data-placeid', String(currentGameId));
    const joinBtn = FluxDOM.el('button', { className: 'btn-full-width btn-control-xs rbx-public-game-server-join game-server-join-btn btn-primary-md btn-min-width ff-btn ff-btn-sm ff-btn-primary' });
    joinBtn.addEventListener('click', () => {
      FluxNotifications.show('Joining server...', 'info', 2000);
      window.location.href = `roblox://placeId=${String(currentGameId)}&gameInstanceId=${server.id}`;
    });
    joinBtn.textContent = 'Join';
    joinSpan.appendChild(joinBtn);

    const footer = FluxDOM.el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-top:6px' });
    const sid = FluxDOM.el('div', { className: 'server-id-text text-info xsmall' });
    const sp = server.id.split('-');
    sid.textContent = `ID: ${sp[1] ?? ''}-${sp[2] ?? ''}`;
    footer.appendChild(sid);

    if (server.region) {
      const label: string = server.region.city ?? server.region.country;
      const rb = FluxDOM.el('span', { className: 'ff-tag ff-tag-purple', style: 'margin-left:4px' });
      rb.textContent = label;
      rb.title = (server.region.city ? `${server.region.city}, ` : '') + server.region.country;
      footer.appendChild(rb);
    }

    details.appendChild(gaugeContainer);
    details.appendChild(joinSpan);
    details.appendChild(footer);
    card.appendChild(thumbsContainer);
    card.appendChild(details);
    li.appendChild(card);
    return li;
  }

  function applyRegionFilter(countryCode: string): void {
    FluxStorage.set('serverregionfilter', countryCode);
    if (!countryCode) { renderServerCards(allServers); return; }

    const targetGroup = FluxConstants.getCountryGroup(countryCode);
    const sorted = [...allServers].sort((a, b) => {
      const aCC = a.region?.countryCode ?? null;
      const bCC = b.region?.countryCode ?? null;
      const aExact = aCC === countryCode ? 0 : 1;
      const bExact = bCC === countryCode ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      if (targetGroup && aCC && bCC) {
        const aSame = FluxConstants.getCountryGroup(aCC) === targetGroup ? 0 : 1;
        const bSame = FluxConstants.getCountryGroup(bCC) === targetGroup ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
      }
      return (aCC ? 0 : 1) - (bCC ? 0 : 1);
    });

    renderServerCards(sorted);
    FluxNotifications.show(`${countryCode}: ${String(sorted.length)} servers`, 'info', 2000);
  }

  function injectFilterButtons(): void {
    const container = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
    if (!container?.parentNode) return;
    const old = document.querySelector('.ff-server-controls');
    if (old) old.remove();

    const bar = FluxDOM.el('div', { className: 'ff-server-controls' });
    const rBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm', onclick: () => { refreshServers(); } });
    rBtn.innerHTML = `${FluxIcons.get('refresh', { size: 14 })} Refresh`;
    const fBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm', onclick: () => { openFilterPanel(); } });
    fBtn.innerHTML = `${FluxIcons.get('filter', { size: 14 })} Filters`;
    const qBtn = FluxDOM.el('button', { className: 'ff-btn ff-btn-sm ff-btn-primary', onclick: () => { quickJoinRandom(); } });
    qBtn.innerHTML = `${FluxIcons.get('zap', { size: 14 })} Quick Join`;
    FluxUtils.batchAppend(bar, [rBtn, fBtn, qBtn]);
    container.parentNode.insertBefore(bar, container);
  }

  function refreshServers(): void {
    allServers = [];
    regionScanDone = false;
    void scanAndCacheRegions();
  }

  function openFilterPanel(): void {
    FluxModals.custom((modal, close) => {
      let groupsHTML = '';
      FluxConstants.REGION_CHIPS.forEach(group => {
        let groupChips = '';
        group.chips.forEach(chip => { groupChips += `<div class="ff-region-chip" data-cc="${chip.cc}">${chip.label}</div>`; });
        groupsHTML += `<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;color:#888;margin-bottom:4px;text-transform:uppercase">${group.group}</div><div style="display:flex;flex-wrap:wrap;gap:4px">${groupChips}</div></div>`;
      });

      modal.innerHTML =
        `<div style="padding:24px"><h3 style="margin:0 0 12px;font-size:16px">${FluxIcons.get('filter', { size: 16 })} Filters</h3>` +
        '<div style="max-height:300px;overflow-y:auto;margin-top:8px">' +
        '<div style="margin-bottom:10px"><div style="display:flex;flex-wrap:wrap;gap:4px"><div class="ff-region-chip ff-active" data-cc="">All Regions</div></div></div>' +
        `${groupsHTML}</div>` +
        '<button class="ff-btn ff-btn-primary" id="ff-apply" style="margin-top:12px;width:100%">Apply</button></div>';

      modal.querySelectorAll('.ff-region-chip').forEach(chip => {
        chip.addEventListener('click', function (this: HTMLElement) {
          modal.querySelectorAll('.ff-region-chip').forEach(c => { c.classList.remove('ff-active'); });
          this.classList.add('ff-active');
        });
      });

      const applyBtn = modal.querySelector('#ff-apply');
      if (applyBtn) applyBtn.addEventListener('click', () => {
        const active = modal.querySelector('.ff-region-chip.ff-active');
        const cc = (active instanceof HTMLElement) ? (active.dataset.cc ?? '') : '';
        applyRegionFilter(cc);
        close();
      });
    });
  }

  function quickJoinRandom(): void {
    if (allServers.length === 0) { FluxNotifications.show('No servers loaded', 'warning'); return; }
    const visible = allServers.filter(s => s.playing < s.maxPlayers);
    if (visible.length === 0) { FluxNotifications.show('No available servers', 'warning'); return; }
    const pick = visible[Math.floor(Math.random() * visible.length)];
    if (!pick) return;
    FluxNotifications.show('Joining random server...', 'info', 2000);
    window.location.href = `roblox://placeId=${String(currentGameId)}&gameInstanceId=${pick.id}`;
  }

  function observeServerList(): void {
    const c = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
    if (!c || serverObserver) return;
    serverObserver = new MutationObserver(FluxUtils.debounce(() => {
      if (_rendering || !regionScanDone) return;
      if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }
      renderServerCards(displayedServers);
      observeServerList();
    }, 400));
    serverObserver.observe(c, { childList: true, subtree: false });
  }

  async function init(): Promise<void> {
    if (loaded) return;
    if (!FluxStorage.getBool('togglefilterserversbutton', true)) return;
    currentGameId = FluxGamesAPI.getCurrentGameId();
    if (!currentGameId) return;

    const container = await FluxUtils.watchForChild('#game-instances, .tab-content, [class*="game-instances"]', '#rbx-public-game-server-item-container', 30000).catch(() => null);
    if (!container) return;

    loaded = true;
    injectFilterButtons();
    observeServerList();
    if (FluxStorage.getBool('autoserverregions', true)) void scanAndCacheRegions();
  }

  function destroy(): void {
    loaded = false;
    regionScanDone = false;
    allServers = [];
    if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }
    const ctrl = document.querySelector('.ff-server-controls');
    if (ctrl) ctrl.remove();
  }

  return { init, destroy };
})();