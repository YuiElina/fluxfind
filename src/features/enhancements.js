/**
 * FluxFind Enhancements Module
 * Implements all settings toggles: chat, friends, profile, search, sidebar, cards, terms, stats
 * Each feature has start/stop for live toggle without page reload
 *
 * @module features/enhancements
 * @license GPL-2.0-only
 */

const FluxFeatureEnhancements = (() => {
    'use strict';

    const activeFeatures = new Set();

    /* ========== 1. Disable Chat Bar ========== */
    let chatStyleEl = null;
    const CHAT_CSS = '#chat-header, #chat-container, .chat-windows-header, .chat-main-window, [class*="chat-window"] { display: none !important; }';

    function enableDisableChat() {
        if (!FluxStorage.getBool('disablechat')) { stopChat();
            return; }
        if (activeFeatures.has('chat')) return;
        chatStyleEl = FluxDOM.injectStyleOnce('ff-disable-chat', CHAT_CSS);
        activeFeatures.add('chat');
    }
    function stopChat() {
        if (chatStyleEl) { chatStyleEl.remove();
            chatStyleEl = null; }
        activeFeatures.delete('chat');
    }

    /* ========== 2. Smaller Roblox Sidebar ========== */
    let sidebarStyleEl = null;
    const SIDEBAR_CSS = `
        .rbx-left-col, .left-col, [class*="left-col"], .nav-column, #navigation {
            width: 180px !important; min-width: 180px !important; flex: 0 0 180px !important;
        }
        .rbx-content, .content, [class*="content-col"] {
            margin-left: 180px !important;
        }
    `;

    function enableSmallerSidebar() {
        if (!FluxStorage.getBool('smallerrobloxsidebar')) { stopSidebar();
            return; }
        if (activeFeatures.has('sidebar')) return;
        sidebarStyleEl = FluxDOM.injectStyleOnce('ff-smaller-sidebar', SIDEBAR_CSS);
        activeFeatures.add('sidebar');
    }
    function stopSidebar() {
        if (sidebarStyleEl) { sidebarStyleEl.remove();
            sidebarStyleEl = null; }
        activeFeatures.delete('sidebar');
    }

    /* ========== 3. Responsive Game Cards ========== */
    let cardsStyleEl = null;
    const CARDS_CSS = `
        .game-grid, [data-testid="game-grid"], .games-list, .game-cards-grid,
        .home-page-game-grid, [class*="game-grid"], [class*="games-container"] {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
            gap: 12px !important;
        }
    `;

    function enableResponsiveCards() {
        if (FluxStorage.getBool('responsivegamecards', true) === false) { stopCards();
            return; }
        if (activeFeatures.has('cards')) return;
        cardsStyleEl = FluxDOM.injectStyleOnce('ff-responsive-cards', CARDS_CSS);
        activeFeatures.add('cards');
    }
    function stopCards() {
        if (cardsStyleEl) { cardsStyleEl.remove();
            cardsStyleEl = null; }
        activeFeatures.delete('cards');
    }

    /* ========== 4. Restore Classic Terms ========== */
    const REPLACEMENTS = [
        ['Experience', 'Game'],
        ['Experiences', 'Games'],
        ['Avatar Shop', 'Catalog'],
        ['Marketplace', 'Catalog'],
        ['Creator Marketplace', 'Creator Catalog'],
    ];

    function enableClassicTerms() {
        if (!FluxStorage.getBool('restoreclassicterms')) { stopTerms();
            return; }
        if (activeFeatures.has('terms')) return;
        activeFeatures.add('terms');
        walkAndReplace(document.body);
        _termsObserver = new MutationObserver(muts => {
            muts.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) walkAndReplace(node);
                });
            });
        });
        _termsObserver.observe(document.body, { childList: true, subtree: true });
    }

    let _termsObserver = null;
    function stopTerms() {
        activeFeatures.delete('terms');
        if (_termsObserver) { _termsObserver.disconnect();
            _termsObserver = null; }
    }

    function walkAndReplace(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
            let changed = false;
            let text = node.textContent;
            for (const [from, to] of REPLACEMENTS) {
                if (text.includes(from)) {
                    text = text.replace(new RegExp(from, 'g'), to);
                    changed = true;
                }
            }
            if (changed) node.textContent = text;
        }
    }

    /* ========== 5. Better Friends Page ========== */
    let friendsObserver = null;
    function enableBetterFriends() {
        if (!FluxStorage.getBool('betterfriends')) { stopFriends();
            return; }
        if (activeFeatures.has('friends')) return;
        activeFeatures.add('friends');
        enhanceFriendCards();
        // Observe for carousel changes
        const carousel = document.querySelector('.friends-carousel-list-container, .friend-carousel-container');
        if (carousel) {
            friendsObserver = new MutationObserver(FluxUtils.debounce(enhanceFriendCards, 300));
            friendsObserver.observe(carousel, { childList: true, subtree: true });
        }
    }
    function stopFriends() {
        activeFeatures.delete('friends');
        if (friendsObserver) { friendsObserver.disconnect();
            friendsObserver = null; }
    }
    function enhanceFriendCards() {
        const tiles = document.querySelectorAll('.friends-carousel-tile, [data-testid="friend-tile"]');
        tiles.forEach(tile => {
            if (tile.dataset.ffFriends) return;
            tile.dataset.ffFriends = '1';
            // Highlight online friends with a subtle purple glow
            const statusEl = tile.querySelector('.avatar-status, [data-testid="presence-icon"]');
            const gameEl = tile.querySelector('.icon-game');
            if (gameEl || (statusEl && statusEl.classList.contains('game'))) {
                tile.style.boxShadow = '0 0 12px rgba(108,92,231,0.3)';
                tile.style.borderRadius = '8px';
                tile.style.transition = 'box-shadow 0.3s ease';
            }
        });
    }

    /* ========== 6. Better Profile Info ========== */
    let profileObserver = null;
    async function enableBetterProfile() {
        if (!FluxStorage.getBool('betterprofileinfo')) { stopProfile();
            return; }
        if (activeFeatures.has('profile')) return;
        activeFeatures.add('profile');
        await injectProfileStats();
        // Observe for profile page changes
        const profileContainer = document.querySelector('.profile-header, [data-testid="profile-header"]');
        if (profileContainer) {
            profileObserver = new MutationObserver(FluxUtils.debounce(() => injectProfileStats(), 500));
            profileObserver.observe(profileContainer, { childList: true, subtree: true });
        }
    }
    function stopProfile() {
        activeFeatures.delete('profile');
        if (profileObserver) { profileObserver.disconnect();
            profileObserver = null; }
        const panel = document.getElementById('ff-profile-stats');
        if (panel) panel.remove();
    }
    async function injectProfileStats() {
        if (document.getElementById('ff-profile-stats')) return;
        const userId = FluxUsersAPI.getCurrentUserId();
        const profileId = window.location.pathname.match(/\/users\/(\d+)/);
        const targetId = profileId ? parseInt(profileId[1]) : userId;
        if (!targetId) return;

        try {
            const stats = await FluxUsersAPI.getUserStats(targetId, 'smartsearch');
            if (!stats) return;

            const container = document.querySelector('.profile-header-top, .profile-header, .profile-about, [class*="profile-header"]');
            if (!container) return;

            const panel = FluxDOM.el('div', {
                id: 'ff-profile-stats',
                style: {
                    display: 'flex', gap: '16px', marginTop: '12px', padding: '12px 16px',
                    background: 'var(--ff-bg-secondary)', borderRadius: 'var(--ff-radius-md)',
                    border: '1px solid var(--ff-border)', fontSize: '13px',
                    color: 'var(--ff-text-secondary)'
                }
            });
            panel.innerHTML = `
                <span>${FluxIcons.get('users', { size: 14 })} ${(stats.friendCount || 0).toLocaleString()} Friends</span>
                <span>${FluxIcons.get('heart', { size: 14 })} ${(stats.followerCount || 0).toLocaleString()} Followers</span>
            `;
            container.appendChild(panel);
        } catch { /* profile page may not exist */ }
    }

    /* ========== 7. Smart Search ========== */
    let searchObserver = null;
    function enableSmartSearch() {
        if (!FluxStorage.getBool('smartsearch', true)) { stopSearch();
            return; }
        if (activeFeatures.has('search')) return;
        activeFeatures.add('search');
        enhanceSearchDropdown();
        const searchContainer = document.querySelector('#navbar-search, .navbar-search, .searchbar, #global-header-search');
        if (searchContainer) {
            searchObserver = new MutationObserver(FluxUtils.debounce(enhanceSearchDropdown, 300));
            searchObserver.observe(searchContainer, { childList: true, subtree: true });
        }
    }
    function stopSearch() {
        activeFeatures.delete('search');
        if (searchObserver) { searchObserver.disconnect();
            searchObserver = null; }
    }
    function enhanceSearchDropdown() {
        const options = document.querySelectorAll('.navbar-search-option, .new-navbar-search-anchor');
        const iconMap = {
            'Games': 'gamepad', 'People': 'users', 'Marketplace': 'shop', 'Catalog': 'shop',
            'Communities': 'users', 'Creator Store': 'pallete', 'in Games': 'gamepad',
            'in People': 'user', 'in Marketplace': 'copy', 'in Communities': 'users',
            'in Creator Store': 'download'
        };

        options.forEach(link => {
            if (link.dataset.ffSearchEnhanced) return;
            link.dataset.ffSearchEnhanced = '1';
            const text = link.textContent.trim();
            const existingIcon = link.querySelector('.icon-menu-');
            if (existingIcon && existingIcon.parentNode) {
                // Replace Roblox icon span with our SVG
                const iconSpan = existingIcon.parentNode;
                if (!iconSpan.dataset.ffReplaced) {
                    iconSpan.dataset.ffReplaced = '1';
                    for (const [keyword, icon] of Object.entries(iconMap)) {
                        if (text.includes(keyword)) {
                            iconSpan.innerHTML = `<span style="display:inline-flex;vertical-align:middle;margin-right:4px;">${FluxIcons.get(icon, { size: 14, color: 'var(--ff-text-muted)' })}</span>`;
                            break;
                        }
                    }
                }
            }
        });
    }

    /* ========== 8. Quick Launch Games ========== */
    function enableQuickLaunch() {
        if (!FluxStorage.getBool('quicklaunchgames', true)) { stopQuickLaunch();
            return; }
        if (activeFeatures.has('quicklaunch')) return;
        activeFeatures.add('quicklaunch');
        injectQuickLaunch();
    }
    function stopQuickLaunch() {
        activeFeatures.delete('quicklaunch');
        const panel = document.getElementById('ff-quick-launch');
        if (panel) panel.remove();
    }
    async function injectQuickLaunch() {
        if (document.getElementById('ff-quick-launch')) return;
        const homeGrid = document.querySelector('.home-page-game-grid, [data-testid="home-page-game-grid"]');
        if (!homeGrid) return;

        const userId = FluxUsersAPI.getCurrentUserId();
        if (!userId) return;

        try {
            const favGames = await FluxGamesAPI.getFavoriteGames(userId);
            if (!favGames || favGames.length < 3) return;

            const panel = FluxDOM.el('div', {
                id: 'ff-quick-launch',
                style: {
                    padding: '16px', marginBottom: '16px',
                    background: 'var(--ff-bg-secondary)', borderRadius: 'var(--ff-radius-md)',
                    border: '1px solid var(--ff-border)'
                }
            });
            panel.innerHTML = `<h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:var(--ff-text-primary);">${FluxIcons.get('zap', { size: 14 })} Quick Launch</h3>`;
            const btnContainer = FluxDOM.el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } });

            favGames.slice(0, 6).forEach(game => {
                const btn = FluxDOM.el('button', {
                    className: 'ff-btn ff-btn-sm',
                    onclick: () => { window.location.href = `${FluxConstants.API.ROBLOX_BASE}/games/${game.placeId || game.rootPlaceId}`; }
                });
                btn.textContent = FluxSanitizer.truncate(game.name || 'Game', 24);
                btnContainer.appendChild(btn);
            });

            panel.appendChild(btnContainer);
            homeGrid.parentNode.insertBefore(panel, homeGrid);
        } catch { /* ignore */ }
    }

    /* ========== 9. Better Game Stats ========== */
    function enableBetterGameStats() {
        if (!FluxStorage.getBool('bettergamestats', true)) { stopGameStats();
            return; }
        if (activeFeatures.has('gamestats')) return;
        activeFeatures.add('gamestats');
        injectGameVotes();
    }
    function stopGameStats() {
        activeFeatures.delete('gamestats');
        const badge = document.getElementById('ff-vote-badge');
        if (badge) badge.remove();
    }
    async function injectGameVotes() {
        if (document.getElementById('ff-vote-badge')) return;
        const gameId = FluxGamesAPI.getCurrentGameId();
        if (!gameId) return;

        try {
            const universeId = await FluxGamesAPI.getUniverseId(gameId);
            const votes = await FluxGamesAPI.getGameVotes(universeId);
            if (!votes) return;

            const statContainer = document.querySelector('.game-stat, .game-stats-container, [class*="game-stats"], .game-details-info');
            if (!statContainer) return;

            const badge = FluxDOM.el('div', {
                id: 'ff-vote-badge',
                className: 'ff-badge',
                style: { marginLeft: '8px', display: 'inline-flex' }
            });
            const ratio = votes.downVotes > 0 ? (votes.upVotes / (votes.upVotes + votes.downVotes) * 100).toFixed(0) : 100;
            badge.innerHTML = `${FluxIcons.get('star', { size: 12 })} ${ratio}% (${(votes.upVotes || 0).toLocaleString()} likes)`;
            statContainer.appendChild(badge);
        } catch { /* ignore */ }
    }

    /* ========== Init All ========== */
    function initAll() {
        FluxLogger.debug('Enhancements module: applying all settings');

        enableDisableChat();
        enableSmallerSidebar();
        enableResponsiveCards();
        enableClassicTerms();

        // Page-specific features (deferred until DOM ready for those pages)
        setTimeout(() => {
            enableBetterFriends();
            enableBetterProfile();
            enableSmartSearch();
            enableQuickLaunch();
            enableBetterGameStats();
        }, 1000);
    }

    function applySingleSetting(key, value) {
        const handlers = {
            disablechat: enableDisableChat,
            smallerrobloxsidebar: enableSmallerSidebar,
            responsivegamecards: enableResponsiveCards,
            restoreclassicterms: enableClassicTerms,
            betterfriends: enableBetterFriends,
            betterprofileinfo: enableBetterProfile,
            smartsearch: enableSmartSearch,
            quicklaunchgames: enableQuickLaunch,
            bettergamestats: enableBetterGameStats,
        };

        if (handlers[key]) {
            handlers[key]();
        }
    }

    return {
        initAll,
        applySingleSetting,
        // Individual controls for feature lifecycle
        enableDisableChat, stopChat,
        enableSmallerSidebar, stopSidebar,
        enableResponsiveCards, stopCards,
        enableClassicTerms, stopTerms,
        enableBetterFriends, stopFriends,
        enableBetterProfile, stopProfile,
        enableSmartSearch, stopSearch,
        enableQuickLaunch, stopQuickLaunch,
        enableBetterGameStats, stopGameStats
    };
})();