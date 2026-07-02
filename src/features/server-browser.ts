import { FluxDOM } from '../core/dom';
import { FluxIcons } from '../ui/icons';
import { FluxUtils } from '../core/utils';
import { FluxLogger } from '../core/logger';
import { serverFiltersAtom, autoRegionScanAtom, regionFilterAtom, serverFetchCountAtom } from '../state/atoms';
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

const MAX_SLOTS = 6;

export const FluxFeatureServerBrowser = ((): { init: () => Promise<void>; destroy: () => void } => {
  let loaded = false;
  let serverObserver: MutationObserver | null = null;
  let _rendering = false;
  let allServers: ServerCard[] = [];
  let displayedServers: ServerCard[] = [];
  let regionScanDone = false;
  let currentGameId = 0;

  function getMaxServerCount(): number {
    const fromAtom = serverFetchCountAtom.get();
    if (fromAtom > 0) return fromAtom;
    return 50;
  }

  async function scanAndCacheRegions(force = false): Promise<void> {
    if (!force && regionScanDone) {
      FluxLogger.info('ServerBrowser', 'Region scan: already completed, skipping');
      return;
    }
    regionScanDone = false;
    allServers = [];

    if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }

    const targetCountry = regionFilterAtom.get();
    const targetGroup = targetCountry ? FluxConstants.getCountryGroup(targetCountry) : null;
    const MIN_MATCHES = 10;
    const MAX_PAGES = 3;
    const PER_PAGE = 50; // servers to scan per page

    FluxLogger.info('ServerBrowser', `Region scan starting (target: ${targetCountry || 'none'}, min matches: ${String(MIN_MATCHES)}, max pages: ${String(MAX_PAGES)})`);
    FluxNotifications.show(`Scanning servers for ${targetCountry || 'all regions'}...`, 'info', 4000);

    let allFetchedServers: { id: string; maxPlayers: number; playing: number; playerTokens: string[] }[] = [];
    const regionMap = new Map<string, { city: string | null; country: string; countryCode: string }>();
    let matchedCount = 0;
    let cursor: string | null = null;
    let totalPages = 0;

    // Leaky bucket: paginate until we have enough matches or hit the cap
    try {
      FluxLogger.timeStart('server-fetch');
      for (let p = 0; p < MAX_PAGES; p++) {
        totalPages = p + 1;
        const page = await FluxGamesAPI.fetchPublicServersPage(currentGameId, 'Desc', PER_PAGE, cursor);
        if (page.servers.length === 0) break;

        allFetchedServers = allFetchedServers.concat(page.servers);
        cursor = page.nextCursor;
        FluxLogger.info('ServerBrowser', `Page ${String(totalPages)}: ${String(page.servers.length)} servers (total: ${String(allFetchedServers.length)})`);

        // Scan this page's regions
        const idsToScan = page.servers.map(s => s.id);
        const pageRegions = await FluxGamesAPI.fetchServerRegions(currentGameId, idsToScan);
        pageRegions.forEach((region, sid) => { regionMap.set(sid, region); });

        // Count matches
        if (targetCountry) {
          matchedCount = 0;
          allFetchedServers.forEach(s => {
            const r = regionMap.get(s.id);
            if (!r) return;
            if (r.countryCode === targetCountry) { matchedCount++; return; }
            if (targetGroup && FluxConstants.getCountryGroup(r.countryCode) === targetGroup) { matchedCount++; }
          });
          FluxLogger.info('ServerBrowser', `Match count: ${String(matchedCount)}/${String(allFetchedServers.length)} (need ${String(MIN_MATCHES)})`);

          if (matchedCount >= MIN_MATCHES) {
            FluxLogger.info('ServerBrowser', `Enough matches found (${String(matchedCount)}), stopping pagination`);
            break;
          }
        } else {
          // No filter — stop after first page
          break;
        }

        if (!cursor) break;
      }
      FluxLogger.timeEnd('server-fetch', 'ServerBrowser');
    } catch (e) {
      FluxLogger.error('ServerBrowser', `Server fetch failed: ${String(e)}`);
      FluxNotifications.show('Failed to fetch servers', 'error', 3000);
      observeServerList();
      return;
    }

    if (allFetchedServers.length === 0) {
      FluxLogger.warn('ServerBrowser', '0 servers returned from API');
      FluxNotifications.show('No public servers found', 'warning', 3000);
      observeServerList();
      return;
    }

      FluxLogger.info('ServerBrowser', `Scan complete: ${String(allFetchedServers.length)} servers across ${String(totalPages)} page(s), ${String(regionMap.size)} regions resolved`);

    const allTokens: string[] = [];
    const tokenSet = new Set<string>();
    allFetchedServers.forEach(s => {
      s.playerTokens.forEach(t => { if (!tokenSet.has(t)) { tokenSet.add(t); allTokens.push(t); } });
    });

    FluxLogger.info('ServerBrowser', `Unique player tokens to resolve: ${String(allTokens.length)}`);

    const thumbnailMap = new Map<string, string>();
    if (allTokens.length > 0) {
      const chunks = FluxUtils.chunk(allTokens, 100);
      FluxLogger.info('ServerBrowser', `Fetching thumbnails in ${String(chunks.length)} batch(es)`);
      FluxLogger.timeStart('thumbnail-fetch');
      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunk = chunks[i];
          if (chunk === undefined) continue;
          const thumbs = await FluxThumbnailsAPI.fetchPlayerThumbnailsByTokens(chunk, false);
          let resolvedInChunk = 0;

          if (i === 0 && thumbs.length > 0) {
            const first = thumbs[0];
            if (first !== undefined) {
              FluxLogger.info('ServerBrowser', `Raw API sample: requestId="${first.requestId}" token="${first.token}" imageUrl=${first.imageUrl ? 'yes' : 'none'}`);
            }
          }

          thumbs.forEach(t => {
            if (t.imageUrl && t.requestId) {
              const parts = t.requestId.split(':');
              if (parts.length >= 2 && parts[1] !== undefined) {
                thumbnailMap.set(parts[1], t.imageUrl);
                resolvedInChunk++;
              }
            }
          });
          FluxLogger.debug('ServerBrowser', `Thumbnail batch ${String(i + 1)}/${String(chunks.length)}: ${String(resolvedInChunk)} resolved out of ${String(chunk.length)} tokens`);
        } catch (e) {
          FluxLogger.warn('ServerBrowser', `Thumbnail batch ${String(i + 1)}/${String(chunks.length)} failed: ${String(e)}`);
        }
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 300));
      }
      FluxLogger.timeEnd('thumbnail-fetch', 'ServerBrowser');
      FluxLogger.info('ServerBrowser', `Thumbnail map built: ${String(thumbnailMap.size)}/${String(allTokens.length)} player tokens resolved`);

      if (allFetchedServers.length > 0) {
        const firstServer = allFetchedServers[0];
        if (firstServer !== undefined) {
          const rawTokens = firstServer.playerTokens.slice(0, 6);
          const tokenReport = rawTokens.map(t => `${t.slice(0, 12)}...→${thumbnailMap.has(t) ? '✓' : '✗'}`);
          FluxLogger.info('ServerBrowser', `Token lookup sample (first server): [${tokenReport.join(', ')}]`);
        }
      }

      const sampleServers = allFetchedServers.slice(0, 5);
      const sampleReport = sampleServers.map(s => {
        const total = s.playerTokens.length;
        const resolved = s.playerTokens.filter(t => thumbnailMap.has(t)).length;
        return `${String(total)} tokens → ${String(resolved)} thumbs`;
      });
      FluxLogger.info('ServerBrowser', `Token resolution sample: [${sampleReport.join('] [')}]`);
    }

    allServers = allFetchedServers.slice(0, 150).map(s => ({
      id: s.id,
      playing: s.playing,
      maxPlayers: s.maxPlayers,
      playerTokens: s.playerTokens,
      thumbnails: s.playerTokens.slice(0, MAX_SLOTS).map(t => thumbnailMap.get(t) ?? null).filter((x): x is string => x !== null),
      region: regionMap.get(s.id) ?? null,
    }));

    const withRegion = allServers.filter(s => s.region !== null).length;
    const withoutRegion = allServers.length - withRegion;
    FluxLogger.info('ServerBrowser', `Servers ready: ${String(allServers.length)} total (${String(withRegion)} with region, ${String(withoutRegion)} without)`);

    regionScanDone = true;

    const savedRegion = regionFilterAtom.get();
    if (savedRegion) {
      FluxLogger.info('ServerBrowser', `Applying saved region filter: "${savedRegion}"`);
      applyRegionFilter(savedRegion);
    } else {
      FluxLogger.info('ServerBrowser', 'No saved region filter, rendering all servers');
      renderServerCards(allServers);
    }
    observeServerList();
  }

  function renderServerCards(servers: ServerCard[]): void {
    displayedServers = servers;
    const container = document.querySelector('#rbx-public-game-server-item-container');
    if (!container) {
      FluxLogger.warn('ServerBrowser', 'Server container not found in DOM');
      return;
    }

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
    FluxLogger.debug('ServerBrowser', `Rendered ${String(servers.length)} server cards`);
  }

  function createServerCard(server: ServerCard): HTMLElement {
    const li = FluxDOM.el('li', { className: 'rbx-public-game-server-item col-md-3 col-sm-4 col-xs-6' });
    const card = FluxDOM.el('div', { className: 'card-item card-item-public-server' });
    const thumbsContainer = FluxDOM.el('div', { className: 'player-thumbnails-container' });

    const isFull = server.playing >= server.maxPlayers;
    const totalTokens = server.playerTokens.length;

    if (server.thumbnails.length === 0) {
      const countDiv = FluxDOM.el('div', { style: 'display:flex;align-items:center;justify-content:center;min-height:56px;padding:8px;flex-basis:100%' });
      const badge = FluxDOM.el('span', { className: 'ff-badge', style: 'font-size:13px;padding:6px 14px' });
      badge.innerHTML = `${FluxIcons.get('users', { size: 14, color: '#fff' })} ${String(server.playing)} / ${String(server.maxPlayers)}`;
      countDiv.appendChild(badge);
      thumbsContainer.appendChild(countDiv);
    } else {
      const thumbsToShow = server.thumbnails.slice(0, MAX_SLOTS);
      for (let i = 0; i < MAX_SLOTS; i++) {
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

    if (totalTokens > MAX_SLOTS) {
      const children = thumbsContainer.children;
      if (children.length >= MAX_SLOTS) {
        const lastAvatar = children[MAX_SLOTS - 1] as HTMLElement | undefined;
        if (lastAvatar) {
          lastAvatar.style.position = 'relative';
          const badge = FluxDOM.el('span', { className: 'ff-overflow-badge' });
          badge.textContent = `+${String(totalTokens - MAX_SLOTS)}`;
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
      FluxLogger.info('ServerBrowser', `Joining server ${server.id} via protocol handler`);
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
    regionFilterAtom.set(countryCode);

    if (!countryCode) {
      FluxLogger.info('ServerBrowser', 'Region filter cleared — showing all servers unsorted');
      renderServerCards(allServers);
      return;
    }

    const targetGroup = FluxConstants.getCountryGroup(countryCode);
    FluxLogger.info('ServerBrowser', `Sorting servers by region: target="${countryCode}"${targetGroup ? ` group="${targetGroup}"` : ''}`);

    const scored = allServers.map(s => {
      const aCC = s.region?.countryCode ?? null;

      let priority: number;
      if (aCC === countryCode) {
        // Exact match — highest priority
        priority = 0;
      } else if (targetGroup && aCC && FluxConstants.getCountryGroup(aCC) === targetGroup) {
        // Same regional group — second priority
        priority = 1;
      } else if (aCC) {
        // Known region but different group — third priority
        priority = 2;
      } else {
        // Unknown/null region — lowest priority
        priority = 3;
      }

      return { server: s, priority };
    });

    // Sort by priority, then by playing count descending as tiebreaker
    scored.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.server.playing - a.server.playing;
    });

    const sorted = scored.map(s => s.server);

    const exact = sorted.filter(s => s.region?.countryCode === countryCode).length;
    const sameGroup = targetGroup
      ? sorted.filter(s => s.region?.countryCode !== countryCode && s.region?.countryCode && FluxConstants.getCountryGroup(s.region.countryCode) === targetGroup).length
      : 0;
    const other = sorted.filter(s => {
      if (!s.region?.countryCode) return false;
      if (s.region.countryCode === countryCode) return false;
      if (targetGroup && FluxConstants.getCountryGroup(s.region.countryCode) === targetGroup) return false;
      return true;
    }).length;
    const unknown = sorted.filter(s => s.region === null).length;

    FluxLogger.info('ServerBrowser', `Region sort result — exact: ${String(exact)}, same-group: ${String(sameGroup)}, other: ${String(other)}, unknown: ${String(unknown)}`);

    if (exact > 0) {
      const first = sorted[0];
      const firstName = first?.region?.city ?? first?.region?.country ?? 'Unknown';
      FluxLogger.info('ServerBrowser', `First result: "${firstName}" (${first?.region?.countryCode ?? '?'}) — ${exact > 0 ? 'exact match present' : 'no exact match'}`);
    }

    renderServerCards(sorted);
    FluxNotifications.show(`${countryCode}: ${String(exact)} exact, ${String(sameGroup + other + unknown)} nearby`, 'info', 2500);
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
    FluxLogger.debug('ServerBrowser', 'Filter buttons injected');
  }

  function refreshServers(): void {
    FluxLogger.info('ServerBrowser', 'Manual refresh triggered');
    allServers = [];
    regionScanDone = false;
    void scanAndCacheRegions();
  }

  function openFilterPanel(): void {
    FluxModals.custom((modal, close) => {
      const currentCc = regionFilterAtom.get();
      const currentCount = getMaxServerCount();
      const countOptions = [30, 50, 100, 200, 300];

      let groupsHTML = '';
      FluxConstants.REGION_CHIPS.forEach(group => {
        let groupChips = '';
        group.chips.forEach(chip => {
          const active = chip.cc === currentCc ? ' ff-active' : '';
          groupChips += `<div class="ff-region-chip${active}" data-cc="${chip.cc}">${chip.label}</div>`;
        });
        groupsHTML += `<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;color:#888;margin-bottom:4px;text-transform:uppercase">${group.group}</div><div style="display:flex;flex-wrap:wrap;gap:4px">${groupChips}</div></div>`;
      });

      let countHTML = '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;color:#888;margin-bottom:4px;text-transform:uppercase">Max Servers</div><div style="display:flex;flex-wrap:wrap;gap:4px">';
      countOptions.forEach(n => {
        const active = n === currentCount ? ' ff-active' : '';
        countHTML += `<div class="ff-region-chip${active}" data-count="${String(n)}">${String(n)}</div>`;
      });
      countHTML += '</div></div>';

      modal.innerHTML =
        `<div style="padding:24px"><h3 style="margin:0 0 12px;font-size:16px">${FluxIcons.get('filter', { size: 16 })} Filters</h3>` +
        '<div style="max-height:400px;overflow-y:auto;margin-top:8px">' +
        '<div style="margin-bottom:10px"><div style="display:flex;flex-wrap:wrap;gap:4px"><div class="ff-region-chip' + (currentCc === '' ? ' ff-active' : '') + '" data-cc="">All Regions</div></div></div>' +
        countHTML +
        `${groupsHTML}</div>` +
        '<button class="ff-btn ff-btn-primary" id="ff-apply" style="margin-top:12px;width:100%">Apply</button></div>';

      let selectedCc = currentCc;
      let selectedCount = currentCount;

      modal.querySelectorAll('.ff-region-chip').forEach(chip => {
        chip.addEventListener('click', function (this: HTMLElement) {
          const cc = this.dataset.cc;
          const count = this.dataset.count;

          if (cc !== undefined) {
            // Deselect all, select this one
            modal.querySelectorAll('.ff-region-chip[data-cc]').forEach(c => { c.classList.remove('ff-active'); });
            this.classList.add('ff-active');
            selectedCc = cc;
          } else if (count !== undefined) {
            // Deselect all count chips, select this one
            modal.querySelectorAll('.ff-region-chip[data-count]').forEach(c => { c.classList.remove('ff-active'); });
            this.classList.add('ff-active');
            selectedCount = parseInt(count, 10);
          }
        });
      });

      const applyBtn = modal.querySelector('#ff-apply');
      if (applyBtn) applyBtn.addEventListener('click', () => {
        FluxLogger.info('ServerBrowser', `Filter applied: region="${selectedCc}", maxServers=${String(selectedCount)}`);

        const countChanged = selectedCount !== currentCount;
        if (countChanged) {
          serverFetchCountAtom.set(selectedCount);
        }

        // Always persist the region choice, then trigger a full refresh
        regionFilterAtom.set(selectedCc);
        close();
        refreshServers();
      });
    });
  }

  function quickJoinRandom(): void {
    if (allServers.length === 0) {
      FluxNotifications.show('No servers loaded', 'warning');
      FluxLogger.warn('ServerBrowser', 'Quick join failed: no servers loaded');
      return;
    }
    const visible = allServers.filter(s => s.playing < s.maxPlayers);
    if (visible.length === 0) {
      FluxNotifications.show('No available servers', 'warning');
      FluxLogger.warn('ServerBrowser', 'Quick join failed: all servers full');
      return;
    }
    const pick = visible[Math.floor(Math.random() * visible.length)];
    if (!pick) return;
    FluxLogger.info('ServerBrowser', `Quick join: server ${pick.id} (${String(pick.playing)}/${String(pick.maxPlayers)} players)`);
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
    FluxLogger.debug('ServerBrowser', 'MutationObserver attached to server list');
  }

  async function init(): Promise<void> {
    if (loaded) return;
    if (!serverFiltersAtom.get()) {
      FluxLogger.info('ServerBrowser', 'Init skipped: feature disabled in settings');
      return;
    }
    currentGameId = FluxGamesAPI.getCurrentGameId();
    if (!currentGameId) {
      FluxLogger.warn('ServerBrowser', 'Init skipped: no game ID detected in URL');
      return;
    }

    FluxLogger.info('ServerBrowser', `Initializing for game ${String(currentGameId)}`);

    const container = await FluxUtils.watchForChild('#game-instances, .tab-content, [class*="game-instances"]', '#rbx-public-game-server-item-container', 30000).catch(() => null);
    if (!container) {
      FluxLogger.warn('ServerBrowser', 'Init failed: server container not found after 30s');
      return;
    }

    loaded = true;
    FluxLogger.info('ServerBrowser', 'Server container found, injecting UI');
    injectFilterButtons();
    observeServerList();
    if (autoRegionScanAtom.get()) {
      FluxLogger.info('ServerBrowser', 'Auto region scan enabled, starting scan');
      void scanAndCacheRegions();
    } else {
      FluxLogger.info('ServerBrowser', 'Auto region scan disabled, waiting for manual refresh');
    }
  }

  function destroy(): void {
    FluxLogger.info('ServerBrowser', 'Destroying');
    loaded = false;
    regionScanDone = false;
    allServers = [];
    if (serverObserver) { serverObserver.disconnect(); serverObserver = null; }
    const ctrl = document.querySelector('.ff-server-controls');
    if (ctrl) ctrl.remove();
  }

  return { init, destroy };
})();