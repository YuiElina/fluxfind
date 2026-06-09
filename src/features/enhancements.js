/**
 * FluxFind Enhancements Module
 * Implements all settings toggles: chat, friends, profile, search, sidebar, cards, terms, stats
 * Each feature has start/stop for live toggle without page reload.
 * Exported as 'init' so FluxApp.activateFeature() can call it.
 *
 * @module features/enhancements
 * @license GPL-2.0-only
 */

const FluxFeatureEnhancements = (() => {
    'use strict';

    const activeFeatures = new Set();

    /* ========== 1. Disable Chat Bar (observer-based removal, like original) ========== */
    let chatObserver = null, chatTimeout = null;

    function enableDisableChat() {
        if (!FluxStorage.getBool('disablechat')) { stopChat(); return; }
        if (activeFeatures.has('chat')) return;

        activeFeatures.add('chat');

        function removeChat() {
            const chat = document.getElementById('chat-container');
            if (chat) {
                chat.remove();
                FluxLogger.info('Chat bar removed');
                stopChatObserver();
                return true;
            }
            return false;
        }

        if (removeChat()) return;

        chatObserver = new MutationObserver(() => {
            const chat = document.getElementById('chat-container');
            if (chat) {
                chat.remove();
                FluxLogger.info('Chat bar removed (observer)');
                stopChatObserver();
            }
        });

        chatObserver.observe(document.body, { childList: true, subtree: true });

        // Safety timeout — stop watching after 15s
        chatTimeout = setTimeout(() => {
            stopChatObserver();
            FluxLogger.info('Chat removal observer timeout');
        }, 15000);
    }

    function stopChatObserver() {
        if (chatObserver) { chatObserver.disconnect(); chatObserver = null; }
        if (chatTimeout) { clearTimeout(chatTimeout);
            chatTimeout = null; }
    }

    function stopChat() {
        activeFeatures.delete('chat');
        stopChatObserver();
    }

    /* ========== 2. Smaller Roblox Sidebar ========== */
    let sidebarStyleEl = null;
    const SIDEBAR_CSS = `
        .rbx-left-col, .left-col, [class*="left-col"], .nav-column, #navigation, nav[class*="nav"] {
            width: 180px !important; min-width: 180px !important; flex: 0 0 180px !important;
        }
        .rbx-content, .content, [class*="content-col"], main[class*="content"] {
            margin-left: 180px !important;
        }
    `;

    function enableSmallerSidebar() {
        if (!FluxStorage.getBool('smallerrobloxsidebar')) { stopSidebar(); return; }
        if (activeFeatures.has('sidebar')) return;
        sidebarStyleEl = FluxDOM.injectStyleOnce('ff-smaller-sidebar', SIDEBAR_CSS);
        activeFeatures.add('sidebar');
        FluxLogger.info('Smaller sidebar applied');
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
        if (FluxStorage.getBool('responsivegamecards', true) === false) { stopCards(); return; }
        if (activeFeatures.has('cards')) return;
        cardsStyleEl = FluxDOM.injectStyleOnce('ff-responsive-cards', CARDS_CSS);
        activeFeatures.add('cards');
        FluxLogger.info('Responsive game cards applied');
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
        if (!FluxStorage.getBool('restoreclassicterms')) { stopTerms(); return; }
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
        FluxLogger.info('Classic terms restoration active');
    }

    let _termsObserver = null;
    function stopTerms() {
        activeFeatures.delete('terms');
        if (_termsObserver) { _termsObserver.disconnect();
            _termsObserver = null; }
    }

    function walkAndReplace(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let node, count = 0;
        while ((node = walker.nextNode())) {
            let changed = false;
            let text = node.textContent;
            for (const [from, to] of REPLACEMENTS) {
                if (text.includes(from)) {
                    text = text.replace(new RegExp(from, 'g'), to);
                    changed = true;
                }
            }
            if (changed) { node.textContent = text; count++; }
        }
        if (count > 0) FluxLogger.info(`Classic terms: replaced ${count} text nodes`);
    }

    /* ========== 5. Better Friends Page ========== */
    let friendsObserver = null;
    function enableBetterFriends() {
        if (!FluxStorage.getBool('betterfriends')) { stopFriends(); return; }
        if (activeFeatures.has('friends')) return;
        activeFeatures.add('friends');
        enhanceFriendCards();
        friendsObserver = new MutationObserver(FluxUtils.debounce(enhanceFriendCards, 500));
        friendsObserver.observe(document.body, { childList: true, subtree: true });
        FluxLogger.info('Better friends: observing for friend tiles');
    }
    function stopFriends() {
        activeFeatures.delete('friends');
        if (friendsObserver) { friendsObserver.disconnect();
            friendsObserver = null; }
    }
    function enhanceFriendCards() {
        const tiles = document.querySelectorAll('.friends-carousel-tile');
        let enhanced = 0;
        tiles.forEach(tile => {
            if (tile.dataset.ffFriends) return;
            tile.dataset.ffFriends = '1';
            const hasGame = tile.querySelector('.icon-game') ||
                            tile.querySelector('[data-testid="presence-icon"].game');
            if (hasGame) {
                tile.style.boxShadow = '0 0 12px rgba(108,92,231,0.3)';
                tile.style.borderRadius = '8px';
                tile.style.transition = 'box-shadow 0.3s ease';
                enhanced++;
            }
        });
        if (enhanced > 0) FluxLogger.info(`Better friends: ${enhanced} online friends highlighted`);
    }

    /* ========== 6. Better Profile Info ========== */
    let profileObserver = null;
    async function enableBetterProfile() {
        if (!FluxStorage.getBool('betterprofileinfo')) { stopProfile(); return; }
        if (activeFeatures.has('profile')) return;
        activeFeatures.add('profile');
        await replaceProfileStats();
        profileObserver = new MutationObserver(FluxUtils.debounce(() => replaceProfileStats(), 800));
        profileObserver.observe(document.body, { childList: true, subtree: true });
    }
    function stopProfile() {
        activeFeatures.delete('profile');
        if (profileObserver) { profileObserver.disconnect();
            profileObserver = null; }
    }
    async function replaceProfileStats() {
        const profileMatch = window.location.pathname.match(/\/users\/(\d+)/);
        const targetId = profileMatch ? parseInt(profileMatch[1]) : null;
        if (!targetId) return;

        try {
            const stats = await FluxUsersAPI.getUserStats(targetId, 'smartsearch');
            if (!stats) return;

            const friendLinks = document.querySelectorAll('.flex-nowrap.gap-small a[href*="/friends"]');
            if (friendLinks.length >= 2) {
                const friendSpan = friendLinks[0].querySelector('span');
                if (friendSpan && !friendSpan.dataset.ffProfileReplaced) {
                    friendSpan.dataset.ffProfileReplaced = '1';
                    friendSpan.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px">${FluxIcons.get('users', { size: 14 })} ${(stats.friendCount || 0).toLocaleString()} Friends</span>`;
                }
                if (friendLinks[1]) {
                    const followerSpan = friendLinks[1].querySelector('span');
                    if (followerSpan && !followerSpan.dataset.ffProfileReplaced) {
                        followerSpan.dataset.ffProfileReplaced = '1';
                        followerSpan.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px">${FluxIcons.get('heart', { size: 14 })} ${(stats.followerCount || 0).toLocaleString()} Followers</span>`;
                    }
                }
                FluxLogger.info(`Better profile: stats replaced for user ${targetId}`);
            }
        } catch (e) { FluxLogger.info('Better profile: API failed', e); }
    }

    /* ========== 7. Smart Search ========== */
    let searchObserver = null;
    function enableSmartSearch() {
        if (!FluxStorage.getBool('smartsearch', true)) { stopSearch(); return; }
        if (activeFeatures.has('search')) return;
        activeFeatures.add('search');
        enhanceSearchDropdown();
        const searchContainer = document.querySelector('#navbar-search, .navbar-search, .searchbar, #global-header-search');
        if (searchContainer) {
            searchObserver = new MutationObserver(FluxUtils.debounce(enhanceSearchDropdown, 300));
            searchObserver.observe(searchContainer, { childList: true, subtree: true });
            FluxLogger.info('Smart search: observing search dropdown');
        } else {
            FluxLogger.info('Smart search: search container not found on this page');
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
            'Games': 'gamepad', 'in Games': 'gamepad',
            'People': 'user', 'in People': 'user',
            'Marketplace': 'copy', 'in Marketplace': 'copy',
            'Catalog': 'copy', 'in Catalog': 'copy',
            'Communities': 'users', 'in Communities': 'users',
            'Creator Store': 'download', 'in Creator Store': 'download'
        };

        let replaced = 0;
        options.forEach(link => {
            if (link.dataset.ffSearchEnhanced) return;
            link.dataset.ffSearchEnhanced = '1';
            const text = link.textContent.trim();
            const existingIcon = link.querySelector('.icon-menu-');
            if (existingIcon && existingIcon.parentNode) {
                const iconSpan = existingIcon.parentNode;
                if (!iconSpan.dataset.ffReplaced) {
                    iconSpan.dataset.ffReplaced = '1';
                    for (const [keyword, icon] of Object.entries(iconMap)) {
                        if (text.includes(keyword)) {
                            iconSpan.innerHTML = `<span style="display:inline-flex;vertical-align:middle;margin-right:4px">${FluxIcons.get(icon, { size: 14, color: 'var(--ff-text-muted)' })}</span>`;
                            replaced++;
                            break;
                        }
                    }
                }
            }
        });
        if (replaced > 0) FluxLogger.info(`Smart search: ${replaced} icons replaced`);
    }

    /* ========== 8. Quick Launch Games ========== */
    function enableQuickLaunch() {
        if (!FluxStorage.getBool('quicklaunchgames', true)) { stopQuickLaunch(); return; }
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
        if (!homeGrid) { FluxLogger.info('Quick launch: home grid not found'); return; }

        const userId = FluxUsersAPI.getCurrentUserId();
        if (!userId) { FluxLogger.info('Quick launch: no user ID'); return; }

        try {
            const favGames = await FluxGamesAPI.getFavoriteGames(userId);
            if (!favGames || favGames.length < 3) { FluxLogger.info('Quick launch: not enough favorite games'); return; }

            const panel = FluxDOM.el('div', { id: 'ff-quick-launch' });
            panel.innerHTML = `<h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:var(--ff-text-primary)">${FluxIcons.get('zap', { size: 14 })} Quick Launch</h3>`;
            const btnContainer = FluxDOM.el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });

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
            FluxLogger.info(`Quick launch: ${favGames.slice(0, 6).length} games added`);
        } catch (e) { FluxLogger.info('Quick launch: failed', e); }
    }

    /* ========== 9. Better Game Stats ========== */
    function enableBetterGameStats() {
        if (!FluxStorage.getBool('bettergamestats', true)) { stopGameStats(); return; }
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
        const gameMatch = window.location.pathname.match(/\/games\/(\d+)/);
        if (!gameMatch) { FluxLogger.info('Game stats: not on a game page'); return; }
        const gameId = parseInt(gameMatch[1]);
        if (!gameId) return;

        try {
            const universeId = await FluxGamesAPI.getUniverseId(gameId);
            const votes = await FluxGamesAPI.getGameVotes(universeId);
            if (!votes) return;

            const statContainer = document.querySelector('.game-stat, .game-stats-container, [class*="game-stats"], .game-details-info');
            if (!statContainer) return;

            const badge = FluxDOM.el('div', {
                id: 'ff-vote-badge', className: 'ff-badge',
                style: 'margin-left:8px;display:inline-flex'
            });
            const ratio = votes.downVotes > 0 ? (votes.upVotes / (votes.upVotes + votes.downVotes) * 100).toFixed(0) : 100;
            badge.innerHTML = `${FluxIcons.get('star', { size: 12 })} ${ratio}% (${(votes.upVotes || 0).toLocaleString()} likes)`;
            statContainer.appendChild(badge);
            FluxLogger.info(`Game stats: ${ratio}% ratio badge added`);
        } catch (e) { FluxLogger.info('Game stats: failed', e); }
    }

    /* ========== Init ========== */

    function init() {
        FluxLogger.info('Enhancements module: applying all settings');

        enableDisableChat();
        enableSmallerSidebar();
        enableResponsiveCards();
        enableClassicTerms();
        enableBetterFriends();
        enableSmartSearch();

        setTimeout(() => {
            enableBetterProfile();
            enableQuickLaunch();
            enableBetterGameStats();
        }, 1000);
    }

    function applySingleSetting(key, value) {
        FluxLogger.info(`Enhancements: ${key}=${value}`);
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
        if (handlers[key]) handlers[key]();
    }

    return {
        init, applySingleSetting,
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