// ==UserScript==
// @name         FluxFind
// @namespace    https://github.com/YuiElina/fluxfind/
// @version      0.1.0-alpha
// @description  Enhanced Roblox server browser with filtering, region detection, smart search, and quality-of-life improvements. Free and open source alternative to paid extensions.
// @author       YuiElina
// @match        https://www.roblox.com/*
// @license      AOL-1.0
// @icon         https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/search.svg
// @supportURL   https://github.com/YuiElina/fluxfind
// @downloadURL  https://raw.githubusercontent.com/YuiElina/fluxfind/main/fluxfind.user.js
// @updateURL    https://raw.githubusercontent.com/YuiElina/fluxfind/main/fluxfind.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @connect      thumbnails.roblox.com
// @connect      games.roblox.com
// @connect      gamejoin.roblox.com
// @connect      presence.roblox.com
// @connect      www.roblox.com
// @connect      friends.roblox.com
// @connect      apis.roblox.com
// @connect      groups.roblox.com
// @connect      users.roblox.com
// @connect      catalog.roblox.com
// @connect      ip-api.com
// @connect      freeipapi.com
// ==/UserScript==

/**
 * FluxFind - Enhanced Roblox Server Browser & Utility Suite
 * Copyright (c) 2026 FluxFind Contributors
 *
 * Licensed under the Authentic Open License, Version 1.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://github.com/YuiElina/AOL-LICENSE/blob/master/LICENSE
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @license AOL-1.0
 * @see https://github.com/YuiElina/AOL-LICENSE
 */

"use strict";
GM_addStyle(`/* === CSS Custom Properties === */
:root {
    --ff-bg-primary: #1f1f1f;
    --ff-bg-secondary: #252525;
    --ff-bg-tertiary: #2a2a2a;
    --ff-bg-hover: #333333;
    --ff-border: #404040;
    --ff-border-light: #505050;
    --ff-text-primary: #e8e8e8;
    --ff-text-secondary: #b0b0b0;
    --ff-text-muted: #888888;
    --ff-accent: #6C5CE7;
    --ff-accent-hover: #7C6CF7;
    --ff-success: #4CAF50;
    --ff-error: #F44336;
    --ff-warning: #FF9800;
    --ff-radius-sm: 6px;
    --ff-radius-md: 8px;
    --ff-radius-lg: 12px;
    --ff-radius-xl: 20px;
    --ff-shadow: 0 4px 16px rgba(0,0,0,0.3);
    --ff-shadow-lg: 0 8px 32px rgba(0,0,0,0.4);
    --ff-transition: 0.15s ease;
    --ff-transition-slow: 0.25s ease;
}
/* === Buttons === */
.ff-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: var(--ff-radius-sm);
    font: 500 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    cursor: pointer; border: 1px solid var(--ff-border);
    background: var(--ff-bg-tertiary); color: var(--ff-text-primary);
    transition: background var(--ff-transition), border-color var(--ff-transition);
    outline: none; white-space: nowrap; line-height: 1.2;
}
.ff-btn:hover { background: var(--ff-bg-hover); border-color: var(--ff-border-light); }
.ff-btn:active { transform: scale(0.97); }
.ff-btn.ff-btn-primary { background: var(--ff-accent); border-color: var(--ff-accent); color: #fff; }
.ff-btn.ff-btn-primary:hover { background: var(--ff-accent-hover); }
.ff-btn.ff-btn-danger { border-color: var(--ff-error); color: var(--ff-error); }
.ff-btn.ff-btn-danger:hover { background: rgba(244,67,54,0.1); }
.ff-btn-sm { padding: 4px 10px; font-size: 12px; }
.ff-btn-lg { padding: 10px 20px; font-size: 14px; }

/* === Form Elements === */
.ff-input, .ff-select {
    padding: 8px 12px; border-radius: var(--ff-radius-sm);
    border: 1px solid var(--ff-border); background: var(--ff-bg-primary);
    color: var(--ff-text-primary); font-size: 13px;
    transition: border-color var(--ff-transition); outline: none;
}
.ff-input:focus, .ff-select:focus { border-color: var(--ff-accent); }
.ff-input { width: 100%; box-sizing: border-box; }
.ff-input[type="number"] { -moz-appearance: textfield; }
.ff-input[type="number"]::-webkit-inner-spin-button,
.ff-input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.ff-select { cursor: pointer; }

.ff-checkbox-wrapper {
    display: flex; align-items: center; gap: 8px;
    cursor: pointer; user-select: none;
}
.ff-checkbox-wrapper input[type="checkbox"] { display: none; }
.ff-checkbox-custom {
    width: 18px; height: 18px; border-radius: 4px;
    border: 2px solid var(--ff-border);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all var(--ff-transition);
}
.ff-checkbox-wrapper input:checked + .ff-checkbox-custom {
    background: var(--ff-accent); border-color: var(--ff-accent);
}
.ff-checkbox-wrapper input:checked + .ff-checkbox-custom::after {
    content: ''; width: 5px; height: 9px;
    border: solid #fff; border-width: 0 2px 2px 0;
    transform: rotate(45deg); margin-top: -1px;
}

/* === Region Filter Chips === */
.ff-region-chip {
    display: inline-flex; align-items: center;
    padding: 4px 12px; border-radius: 16px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    border: 1px solid var(--ff-border);
    background: transparent; color: var(--ff-text-secondary);
    transition: all 0.15s ease; user-select: none;
}
.ff-region-chip:hover {
    border-color: var(--ff-accent);
    background: rgba(108,92,231,0.1);
    color: var(--ff-text-primary);
}
.ff-region-chip.ff-active {
    border-color: var(--ff-accent);
    background: var(--ff-accent);
    color: #fff;
}

/* === Misc UI === */
.ff-tooltip { position: relative; }
.ff-tooltip::after {
    content: attr(data-tooltip); position: absolute;
    bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
    background: #333; color: #e8e8e8; padding: 4px 10px;
    border-radius: 4px; font-size: 12px; white-space: nowrap;
    opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 9999;
}
.ff-tooltip:hover::after { opacity: 1; }

.ff-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 12px;
    font-size: 11px; font-weight: 600; background: var(--ff-accent);
    color: #fff; line-height: 1.4;
}

.ff-divider { height: 1px; background: var(--ff-border); margin: 12px 0; border: none; }

.ff-tag {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 4px;
    font-size: 11px; font-weight: 600; border: 1px solid var(--ff-border);
    background: var(--ff-bg-secondary); color: var(--ff-text-secondary);
    margin-left: 8px;
}
.ff-tag.ff-tag-green  { border-color: var(--ff-success); color: var(--ff-success); background: rgba(76,175,80,0.1); }
.ff-tag.ff-tag-red    { border-color: var(--ff-error); color: var(--ff-error); background: rgba(244,67,54,0.1); }
.ff-tag.ff-tag-yellow { border-color: var(--ff-warning); color: var(--ff-warning); background: rgba(255,152,0,0.1); }
.ff-tag.ff-tag-purple { border-color: var(--ff-accent); color: var(--ff-accent); background: rgba(108,92,231,0.1); }

/* === Scrollbar === */
.ff-scrollbar::-webkit-scrollbar { width: 6px; }
.ff-scrollbar::-webkit-scrollbar-track { background: transparent; }
.ff-scrollbar::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
.ff-scrollbar::-webkit-scrollbar-thumb:hover { background: #666; }

/* === Overflow badge (+N) overlayed on last avatar === */
.ff-overflow-badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    min-width: 22px;
    height: 22px;
    padding: 0 5px;
    border-radius: 11px;
    background: var(--ff-accent);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 22px;
    text-align: center;
    border: 2px solid var(--ff-bg-primary, #fff);
    z-index: 2;
    pointer-events: none;
}

/* === Toast Notifications === */
@keyframes ff-slideIn  { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
@keyframes ff-slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }

#fluxfind-toasts {
    position: fixed; top: 20px; right: 20px; z-index: 999999999999;
    display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}

.ff-toast {
    background: var(--ff-bg-secondary);
    color: var(--ff-text-primary);
    padding: 12px 16px;
    border-radius: var(--ff-radius-md);
    font: 500 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-width: 280px; max-width: 420px;
    border: 1px solid var(--ff-border-light);
    box-shadow: var(--ff-shadow);
    animation: ff-slideIn 0.3s ease-out forwards;
    pointer-events: auto; position: relative; overflow: hidden;
}

.ff-toast.removing { animation: ff-slideOut 0.3s ease-in forwards; }

.ff-toast-content { display: flex; align-items: center; gap: 10px; }

.ff-toast-icon { flex-shrink: 0; width: 18px; height: 18px; display: flex; align-items: center; }

.ff-toast-message { flex: 1; line-height: 1.4; }

.ff-toast-close {
    position: absolute; top: 6px; right: 8px; width: 22px; height: 22px;
    background: none; border: none; color: var(--ff-text-muted); cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center; border-radius: var(--ff-radius-sm);
    transition: background var(--ff-transition), color var(--ff-transition);
}

.ff-toast-close:hover { color: var(--ff-text-primary); background: var(--ff-bg-hover); }

/* === Smart Search Dropdown === */
.ff-search-overlay {
    position: fixed; inset: 0; z-index: 10000;
    display: none; align-items: flex-start; justify-content: center;
    padding-top: 120px;
}

.ff-search-dropdown {
    background: var(--ff-bg-tertiary);
    border: 1px solid var(--ff-border);
    border-radius: var(--ff-radius-lg);
    box-shadow: var(--ff-shadow-lg);
    width: 460px; max-height: 420px;
    display: flex; flex-direction: column;
    overflow: hidden;
}

.ff-search-tabs {
    display: flex; gap: 0; border-bottom: 1px solid var(--ff-border);
    flex-shrink: 0;
}

.ff-search-tab {
    flex: 1; padding: 10px 16px; font-size: 13px; font-weight: 500;
    color: var(--ff-text-muted); text-align: center; cursor: pointer;
    border-bottom: 2px solid transparent; transition: all 0.15s ease;
    user-select: none; display: flex; align-items: center; justify-content: center; gap: 6px;
}

.ff-search-tab:hover { color: var(--ff-text-primary); }

.ff-search-tab.ff-active {
    color: var(--ff-accent); border-bottom-color: var(--ff-accent);
    font-weight: 600;
}

.ff-search-items {
    flex: 1; overflow-y: auto; padding: 4px 0;
}

.ff-search-header {
    padding: 12px 16px; font-size: 13px; color: var(--ff-text-muted);
    border-bottom: 1px solid var(--ff-border);
}

.ff-search-loading {
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
}

.ff-search-result {
    display: flex; align-items: center; gap: 12px; padding: 10px 16px;
    text-decoration: none; color: var(--ff-text-primary);
    transition: background 0.12s ease; cursor: pointer;
    border-left: 3px solid transparent;
}

.ff-search-result:hover {
    background: var(--ff-bg-hover);
    border-left-color: var(--ff-accent);
}

.ff-search-thumb {
    width: 44px; height: 44px; border-radius: var(--ff-radius-sm);
    object-fit: cover; flex-shrink: 0; background: var(--ff-bg-secondary);
}

.ff-search-avatar { border-radius: 50%; }

.ff-search-info {
    flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
}

.ff-search-name {
    font-size: 14px; font-weight: 500; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
}

.ff-search-meta {
    font-size: 12px; color: var(--ff-text-muted);
    display: flex; align-items: center; gap: 6px;
}

.ff-player-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 10px; font-size: 11px;
    font-weight: 600; background: rgba(108,92,231,0.15);
    color: var(--ff-accent);
}

/* === Spinner & Skeleton === */
.ff-spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid var(--ff-border); border-top-color: var(--ff-accent);
    border-radius: 50%; animation: ff-spin 0.6s linear infinite;
}
@keyframes ff-spin { to { transform: rotate(360deg); } }

.ff-skeleton {
    background: linear-gradient(90deg, var(--ff-bg-tertiary) 25%, var(--ff-bg-hover) 50%, var(--ff-bg-tertiary) 75%);
    background-size: 200% 100%; animation: ff-shimmer 1.5s infinite;
    border-radius: 4px;
}
@keyframes ff-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
/* === Modal Overlay === */
#ff-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    z-index: 999999; display: none;
    flex-direction: column; justify-content: center; align-items: center;
    gap: 16px;
}
.ff-modal-overlay-active {
    display: flex !important;
}

/* === Modal === */
.ff-modal {
    background: var(--ff-bg-tertiary); border-radius: var(--ff-radius-lg);
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    border: 1px solid var(--ff-border); color: var(--ff-text-primary);
    z-index: 9999999;
}
.ff-modal.ff-modal-pop { animation: ff-popIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
.ff-modal.ff-modal-closing { animation: ff-fadeIn 0.2s ease reverse forwards; }

.ff-modal.ff-modal-confirm { padding: 32px; max-width: 440px; width: 90%; }
.ff-modal.ff-modal-custom  {
    max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
}

.ff-modal-confirm-icon { text-align: center; margin-bottom: 16px; }
.ff-modal-confirm-title { margin: 0 0 8px; font-size: 20px; font-weight: 600; text-align: center; }
.ff-modal-confirm-msg { margin: 0 0 24px; font-size: 14px; color: var(--ff-text-secondary); text-align: center; line-height: 1.5; }
.ff-modal-confirm-actions { display: flex; gap: 10px; justify-content: center; }

@keyframes ff-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes ff-popIn  { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
/* === Server Browser Controls === */
.ff-server-controls {
    display: flex; gap: 8px; margin-bottom: 12px;
    padding: 0 4px; flex-wrap: wrap;
}

/* Ensure avatar can contain absolutely-positioned overflow badge */
.player-thumbnails-container .player-avatar {
    position: relative;
}

/* Modern card styling */
.card-item-public-server {
    border-radius: 12px !important;
    overflow: hidden;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    display: flex;
    flex-direction: column;
    min-height: 200px;
}
.card-item-public-server:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.25);
}
.rbx-public-game-server-details {
    padding: 4px 10px 10px 10px;
    flex: 1;
}

/* Flexbox layout with centered wrapping for consistent thumbnail rows */
.player-thumbnails-container {
    display: flex !important;
    flex-wrap: wrap;
    justify-content: center !important;
    align-items: center;
    gap: 4px;
    width: 100%;
    max-width: 100%;
    align-self: center;
    min-height: 60px;
    padding: 8px 4px 4px 4px;
}

/* Ghost avatar slot (placeholder for unfilled server) */
.player-thumbnails-container .avatar-ghost {
    opacity: 0.35;
}

/* Center SVG icons inside ghost avatar slots */
.avatar-ghost .thumbnail-2d-container {
    display: flex;
    align-items: center;
    justify-content: center;
}


.card-item.card-item-friends-server {
    border-radius: 12px;
    height: 100%;
}

#rbx-friends-game-server-item-container {
    display: flex;
    flex-wrap: wrap;
}

.rbx-public-game-server-item-container {
    display: flex;
    flex-wrap: wrap;
}

/* === Segmented Pill Navigation === */
.ff-segmented-nav {
    display: flex;
    position: relative;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 100px;
    padding: 4px;
    gap: 2px;
    margin-bottom: 20px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04);
    overflow: hidden;
    z-index: 1;
}

.ff-segmented-nav::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 100px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
    pointer-events: none;
    z-index: 0;
}

.ff-segmented-item {
    position: relative;
    flex: 1;
    padding: 10px 16px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.55);
    text-align: center;
    cursor: pointer;
    user-select: none;
    transition: color 0.25s ease;
    z-index: 2;
    white-space: nowrap;
    letter-spacing: 0.01em;
}

.ff-segmented-item:hover {
    color: rgba(255, 255, 255, 0.75);
}

.ff-segmented-item.ff-active {
    color: #fff;
    font-weight: 600;
    text-shadow: 0 0 12px rgba(108, 92, 231, 0.3);
}

/* Animated pill indicator */
.ff-segmented-indicator {
    position: absolute;
    top: 4px;
    height: calc(100% - 8px);
    border-radius: 100px;
    background: var(--ff-accent);
    z-index: 1;
    transition: left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 2px 12px rgba(108, 92, 231, 0.4), 0 0 20px rgba(108, 92, 231, 0.2);
    pointer-events: none;
    overflow: hidden;
}

/* Glossy shine sweep on the active pill */
.ff-segmented-indicator::after {
    content: '';
    position: absolute;
    top: 0;
    left: -75%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%);
    border-radius: 100px;
    animation: ff-shine-sweep 1.8s ease-in-out infinite;
}

@keyframes ff-shine-sweep {
    0% { left: -75%; opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { left: 125%; opacity: 0; }
}

/* Tab content fade + slide transition */
.ff-settings-tab-content {
    animation: ff-tab-fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes ff-tab-fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
        filter: blur(2px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
    }
}

/* === Floating Settings Button === */
#fluxfind-settings-btn {
    position: fixed; bottom: 20px; right: 20px; z-index: 99999;
    border-radius: 50%; width: 44px; height: 44px; padding: 0;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(108,92,231,0.4);
    background: var(--ff-accent); border: none;
}

/* === Apple-style Toggle Switch === */
.ff-toggle-wrapper {
    display: flex; align-items: center; gap: 10px;
    cursor: pointer; user-select: none; padding: 6px 0;
}
.ff-toggle-input { display: none; }
.ff-toggle-track {
    position: relative; width: 44px; height: 24px;
    border-radius: 12px; background: #555;
    flex-shrink: 0; transition: background 0.25s ease;
}
.ff-toggle-knob {
    position: absolute; top: 2px; left: 2px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ff-toggle-input:checked + .ff-toggle-track { background: var(--ff-accent); }
.ff-toggle-input:checked + .ff-toggle-track .ff-toggle-knob {
    transform: translateX(20px);
}
.ff-toggle-label {
    font-size: 13px; font-weight: 500;
    color: var(--ff-text-primary); line-height: 1.3;
}

/* === Legacy checkbox (kept for filter panel) === */
.ff-checkbox-wrapper {
    display: flex; align-items: center; gap: 8px;
    cursor: pointer; user-select: none;
}
.ff-checkbox-wrapper input[type="checkbox"] { display: none; }
.ff-checkbox-custom {
    width: 18px; height: 18px; border-radius: 4px;
    border: 2px solid var(--ff-border);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all var(--ff-transition);
}
.ff-checkbox-wrapper input:checked + .ff-checkbox-custom {
    background: var(--ff-accent); border-color: var(--ff-accent);
}
.ff-checkbox-wrapper input:checked + .ff-checkbox-custom::after {
    content: ''; width: 5px; height: 9px;
    border: solid #fff; border-width: 0 2px 2px 0;
    transform: rotate(45deg); margin-top: -1px;
}

/* === Settings Panel Layout === */
.ff-settings-header {
    padding: 20px 28px; border-bottom: 1px solid var(--ff-border);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
}
.ff-settings-header-title { margin: 0; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; }

.ff-settings-body { display: flex; flex: 1; overflow: hidden; min-height: 0; }

.ff-settings-sidebar {
    width: 180px; padding: 16px 12px; border-right: 1px solid var(--ff-border);
    flex-shrink: 0; overflow-y: auto;
}

.ff-settings-sidebar-btn {
    width: 100%; justify-content: flex-start; margin-bottom: 4px;
    border: none; background: transparent;
    padding: 16px;
}
.ff-settings-sidebar-btn.ff-active { background: var(--ff-bg-hover); }

.ff-settings-content { flex: 1; padding: 20px 28px; overflow-y: auto; }

/* === Settings: Home Section === */
.ff-settings-home-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.ff-settings-home-title { margin: 0; font-size: 22px; font-weight: 700; }
.ff-settings-home-version { margin: 4px 0 0; font-size: 13px; color: var(--ff-text-muted); }
.ff-settings-home-actions { display: flex; gap: 10px; margin-bottom: 20px; }
.ff-settings-preset-title { font-size: 14px; font-weight: 600; margin: 16px 0 10px; }
.ff-settings-preset-list { display: flex; flex-wrap: wrap; gap: 8px; }

/* === Settings: Generic Sections === */
.ff-settings-section-title { font-size: 15px; font-weight: 600; margin: 0 0 14px; }
.ff-settings-select-wrap { margin-bottom: 12px; }
.ff-settings-select-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--ff-text-secondary); }

/* === Settings: About Section === */
.ff-settings-about { text-align: center; padding: 20px 0; }
.ff-settings-about-logo { margin-bottom: 16px; }
.ff-settings-about-title { margin: 0 0 8px; font-size: 16px; font-weight: 700; }
.ff-settings-about-desc { margin: 0 0 16px; font-size: 13px; color: var(--ff-text-muted); line-height: 1.5; }
.ff-settings-about-toggles { display: flex; gap: 16px; justify-content: center; }
.ff-settings-about-footer { margin: 20px 0 0; font-size: 11px; color: var(--ff-text-muted); }
`);

(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/core/logger.ts
  var timers, FluxLogger;
  var init_logger = __esm({
    "src/core/logger.ts"() {
      "use strict";
      timers = /* @__PURE__ */ new Map();
      FluxLogger = (() => {
        "use strict";
        let enabled = false;
        let level = "INFO";
        const LEVEL_PRIORITY = {
          DEBUG: 0,
          INFO: 1,
          WARN: 2,
          ERROR: 3
        };
        const STYLES = {
          DEBUG: "color: #888",
          INFO: "color: #2196F3",
          WARN: "color: #FF9800; font-weight: bold",
          ERROR: "color: #F44336; font-weight: bold"
        };
        const CONSOLE_METHOD = {
          DEBUG: "debug",
          INFO: "info",
          WARN: "warn",
          ERROR: "error"
        };
        function prefix() {
          const now = /* @__PURE__ */ new Date();
          const hh = String(now.getHours()).padStart(2, "0");
          const mm = String(now.getMinutes()).padStart(2, "0");
          const ss = String(now.getSeconds()).padStart(2, "0");
          const ms = String(now.getMilliseconds()).padStart(3, "0");
          return `[FLUXFIND] [${hh}:${mm}:${ss}.${ms}]`;
        }
        __name(prefix, "prefix");
        function shouldLog(threshold) {
          return enabled && LEVEL_PRIORITY[threshold] >= LEVEL_PRIORITY[level];
        }
        __name(shouldLog, "shouldLog");
        function log(threshold, mod, msg, ...args) {
          if (!shouldLog(threshold)) return;
          const fullPrefix = `${prefix()} [${mod}]`;
          const method = CONSOLE_METHOD[threshold];
          const style = STYLES[threshold];
          if (args.length > 0) {
            console[method](`%c${fullPrefix} ${msg}`, style, ...args);
          } else {
            console[method](`%c${fullPrefix} ${msg}`, style);
          }
        }
        __name(log, "log");
        function debug(mod, msg, ...args) {
          log("DEBUG", mod, msg, ...args);
        }
        __name(debug, "debug");
        function info(mod, msg, ...args) {
          log("INFO", mod, msg, ...args);
        }
        __name(info, "info");
        function warn(mod, msg, ...args) {
          log("WARN", mod, msg, ...args);
        }
        __name(warn, "warn");
        function error(mod, msg, ...args) {
          log("ERROR", mod, msg, ...args);
        }
        __name(error, "error");
        function timeStart(label) {
          timers.set(label, performance.now());
        }
        __name(timeStart, "timeStart");
        function timeEnd(label, mod = "General") {
          const start = timers.get(label);
          timers.delete(label);
          if (start === void 0) return 0;
          const elapsed = Math.round((performance.now() - start) * 100) / 100;
          log("DEBUG", mod, `\u23F1 ${label}: ${String(elapsed)}ms`);
          return elapsed;
        }
        __name(timeEnd, "timeEnd");
        function group(mod, label) {
          if (!enabled) return;
          console.group(`%c${prefix()} [${mod}] ${label}`, "color: #9C27B0; font-weight: bold");
        }
        __name(group, "group");
        function groupEnd() {
          if (!enabled) return;
          console.groupEnd();
        }
        __name(groupEnd, "groupEnd");
        function init() {
          try {
            enabled = typeof GM_getValue !== "undefined" ? String(GM_getValue("FLUXFIND_enableLogs", "false")) === "true" : localStorage.getItem("FLUXFIND_enableLogs") === "true";
            const rawLevel = (typeof GM_getValue !== "undefined" ? GM_getValue("FLUXFIND_logLevel", "INFO") : localStorage.getItem("FLUXFIND_logLevel")) ?? "INFO";
            if (typeof rawLevel === "string" && rawLevel in LEVEL_PRIORITY) {
              level = rawLevel;
            }
          } catch {
          }
        }
        __name(init, "init");
        return { init, debug, info, warn, error, timeStart, timeEnd, group, groupEnd };
      })();
    }
  });

  // src/config/constants.ts
  var FluxConstants;
  var init_constants = __esm({
    "src/config/constants.ts"() {
      "use strict";
      FluxConstants = (() => {
        "use strict";
        const VERSION = "0.1.0-alpha";
        const API = {
          ROBLOX_BASE: "https://www.roblox.com",
          GAMES_API: "https://games.roblox.com/v1",
          THUMBNAILS_API: "https://thumbnails.roblox.com/v1",
          FRIENDS_API: "https://friends.roblox.com/v1",
          USERS_API: "https://users.roblox.com/v1",
          CATALOG_API: "https://catalog.roblox.com/v1",
          GROUPS_API: "https://groups.roblox.com/v1",
          JOIN_API: "https://gamejoin.roblox.com/v1",
          PRESENCE_API: "https://presence.roblox.com/v1"
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
        const RETRY = { MAX_RETRIES: 3, BASE_DELAY: 500, RATE_LIMIT_DELAY: 250, MAX_DELAY: 8e3 };
        const TIMING = { OBSERVER_DEBOUNCE: 200, URL_CHECK_INTERVAL: 1500, SERVER_REFRESH_COOLDOWN: 2e3, POPUP_DURATION: 3e3, ANIMATION_DURATION: 300, LAZY_LOAD_MARGIN: 200 };
        const SELECTORS = {
          SERVER_LIST: "#rbx-public-game-server-item-container, .card-list",
          SERVER_ITEM: '.rbx-public-game-server-item, .game-server-item, [role="listitem"]',
          SERVER_JOIN_BTN: ".rbx-public-game-server-join, .game-server-join-btn",
          GAME_PAGE: 'div[data-testid="game-detail-page"]',
          CSRF_META: 'meta[name="csrf-token"]'
        };
        const DEFAULT_SETTINGS = {
          enableLogs: false,
          logLevel: "INFO",
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
          autoserverregionnumber: 16,
          serverfetchcount: 150,
          serverregionfilter: ""
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
        const COUNTRY_GROUPS = {
          NA: ["US", "CA", "MX"],
          EU: ["GB", "DE", "FR", "NL", "IE", "BE", "LU", "CH", "AT", "DK", "NO", "SE", "FI", "ES", "PT", "IT", "PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI", "RS", "UA", "LT", "LV", "EE", "GR", "TR"],
          AS: ["JP", "KR", "TW", "CN", "SG", "HK", "TH", "VN", "MY", "PH", "ID", "IN", "BD", "LK", "PK"],
          OC: ["AU", "NZ", "FJ"],
          SA: ["BR", "AR", "CL", "CO", "PE", "VE", "UY", "PY", "BO", "EC"],
          ME: ["AE", "SA", "QA", "KW", "BH", "OM", "IL", "JO", "LB", "EG", "IQ", "IR", "SY", "YE"]
        };
        function getCountryGroup(cc) {
          for (const [group, countries] of Object.entries(COUNTRY_GROUPS)) {
            if (countries.includes(cc)) return group;
          }
          return null;
        }
        __name(getCountryGroup, "getCountryGroup");
        const REGION_CHIPS = [
          { group: "North America", chips: [
            { label: "Ashburn, VA", cc: "US" },
            { label: "Dallas, TX", cc: "US" },
            { label: "Los Angeles, CA", cc: "US" },
            { label: "Miami, FL", cc: "US" },
            { label: "Portland, OR", cc: "US" }
          ] },
          { group: "Europe", chips: [
            { label: "Amsterdam", cc: "NL" },
            { label: "Frankfurt", cc: "DE" },
            { label: "London", cc: "GB" },
            { label: "Paris", cc: "FR" },
            { label: "Warsaw", cc: "PL" }
          ] },
          { group: "Asia", chips: [
            { label: "Hong Kong", cc: "HK" },
            { label: "Mumbai", cc: "IN" },
            { label: "Singapore", cc: "SG" },
            { label: "Tokyo", cc: "JP" }
          ] },
          { group: "Oceania", chips: [{ label: "Sydney", cc: "AU" }] },
          { group: "South America", chips: [{ label: "S\xE3o Paulo", cc: "BR" }] }
        ];
        return {
          VERSION,
          API,
          CHUNK_SIZES,
          RETRY,
          TIMING,
          SELECTORS,
          DEFAULT_SETTINGS,
          URL_PATTERNS,
          REGION_CHIPS,
          COUNTRY_GROUPS,
          getCountryGroup
        };
      })();
    }
  });

  // src/core/utils.ts
  var FluxUtils;
  var init_utils = __esm({
    "src/core/utils.ts"() {
      "use strict";
      FluxUtils = (() => {
        "use strict";
        function debounce(fn, wait = 150, useRAF = false) {
          let timeout;
          let rafId;
          return (...args) => {
            const later = /* @__PURE__ */ __name(() => {
              timeout = void 0;
              if (useRAF) {
                if (rafId !== void 0) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                  fn(...args);
                });
              } else {
                fn(...args);
              }
            }, "later");
            if (timeout !== void 0) clearTimeout(timeout);
            timeout = setTimeout(later, wait);
          };
        }
        __name(debounce, "debounce");
        function throttle(fn, limit = 100) {
          let inThrottle = false;
          let lastArgs;
          return (...args) => {
            if (!inThrottle) {
              fn(...args);
              inThrottle = true;
              setTimeout(() => {
                inThrottle = false;
                if (lastArgs !== void 0) {
                  fn(...lastArgs);
                  lastArgs = void 0;
                }
              }, limit);
            } else {
              lastArgs = args;
            }
          };
        }
        __name(throttle, "throttle");
        function memoize(fn, maxSize = 100, ttl = 6e4) {
          const cache = /* @__PURE__ */ new Map();
          return (...args) => {
            const key = JSON.stringify(args);
            const entry = cache.get(key);
            const now = Date.now();
            if (entry !== void 0 && now - entry.time < ttl) {
              cache.delete(key);
              cache.set(key, entry);
              return entry.value;
            }
            const result = fn(...args);
            cache.set(key, { value: result, time: now });
            if (cache.size > maxSize) {
              const firstKey = cache.keys().next().value;
              if (firstKey !== void 0) cache.delete(firstKey);
            }
            return result;
          };
        }
        __name(memoize, "memoize");
        function batchAppend(parent, elements) {
          const fragment = document.createDocumentFragment();
          for (const el of elements) {
            fragment.appendChild(el);
          }
          parent.appendChild(fragment);
        }
        __name(batchAppend, "batchAppend");
        function qs(selector, root = document) {
          return root.querySelector(selector);
        }
        __name(qs, "qs");
        function qsa(selector, root = document) {
          return Array.from(root.querySelectorAll(selector));
        }
        __name(qsa, "qsa");
        function chunk(array, size) {
          const chunks = [];
          for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
          }
          return chunks;
        }
        __name(chunk, "chunk");
        async function retry(fn, maxRetries = 3, baseDelay = 500) {
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              return await fn();
            } catch (err) {
              if (attempt === maxRetries) throw err;
              await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)));
            }
          }
          throw new Error("unreachable");
        }
        __name(retry, "retry");
        async function parallelLimit(tasks, limit = 6) {
          const results = new Array(tasks.length);
          let index = 0;
          const worker = /* @__PURE__ */ __name(async () => {
            while (index < tasks.length) {
              const i = index++;
              const task = tasks[i];
              if (task !== void 0) {
                results[i] = await task();
              }
            }
          }, "worker");
          await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
          return results;
        }
        __name(parallelLimit, "parallelLimit");
        function fastHash(str) {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
          }
          return hash;
        }
        __name(fastHash, "fastHash");
        function watchForChild(parentSelector, childSelector, timeout = 3e4) {
          return new Promise((resolve, reject) => {
            const existing = document.querySelector(childSelector);
            if (existing !== null) {
              resolve(existing);
              return;
            }
            const parent = document.querySelector(parentSelector);
            if (parent === null) {
              reject(new Error("Parent not found: " + parentSelector));
              return;
            }
            const observer = new MutationObserver((mutations) => {
              for (const mutation of mutations) {
                if (mutation.type === "childList") {
                  for (const node of mutation.addedNodes) {
                    if (node instanceof Element) {
                      if (node.matches(childSelector)) {
                        observer.disconnect();
                        clearTimeout(timer);
                        resolve(node);
                        return;
                      }
                      const found = node.querySelector(childSelector);
                      if (found !== null) {
                        observer.disconnect();
                        clearTimeout(timer);
                        resolve(found);
                        return;
                      }
                    }
                  }
                }
              }
            });
            observer.observe(parent, { childList: true, subtree: false });
            const timer = setTimeout(() => {
              observer.disconnect();
              reject(new Error("Timeout waiting for child: " + childSelector));
            }, timeout);
          });
        }
        __name(watchForChild, "watchForChild");
        function noop() {
        }
        __name(noop, "noop");
        return {
          debounce,
          throttle,
          memoize,
          batchAppend,
          qs,
          qsa,
          chunk,
          retry,
          parallelLimit,
          fastHash,
          watchForChild,
          noop
        };
      })();
    }
  });

  // src/api/http-client.ts
  var FluxHttpClient;
  var init_http_client = __esm({
    "src/api/http-client.ts"() {
      "use strict";
      init_utils();
      init_constants();
      FluxHttpClient = (() => {
        "use strict";
        const CACHE = /* @__PURE__ */ new Map();
        const CACHE_TTL = 3e4;
        const MAX_CACHE_ENTRIES = 200;
        function cacheKey(url) {
          return FluxUtils.fastHash(url);
        }
        __name(cacheKey, "cacheKey");
        function cacheGet(url) {
          const hash = cacheKey(url);
          const entry = CACHE.get(hash);
          if (entry !== void 0 && Date.now() - entry.t < CACHE_TTL) {
            return entry.data;
          }
          if (entry !== void 0) CACHE.delete(hash);
          return void 0;
        }
        __name(cacheGet, "cacheGet");
        function cacheSet(url, data) {
          const hash = cacheKey(url);
          CACHE.set(hash, { data, t: Date.now() });
          if (CACHE.size > MAX_CACHE_ENTRIES) {
            const first = CACHE.keys().next().value;
            if (first !== void 0) CACHE.delete(first);
          }
        }
        __name(cacheSet, "cacheSet");
        function buildUrl(base, params = {}) {
          const url = new URL(base);
          for (const [k, v] of Object.entries(params)) {
            url.searchParams.set(k, v);
          }
          return url.toString();
        }
        __name(buildUrl, "buildUrl");
        async function get(url, params = {}, options = {}) {
          const { cache = false, retries = FluxConstants.RETRY.MAX_RETRIES, headers = {} } = options;
          const fullUrl = buildUrl(url, params);
          if (cache) {
            const cached = cacheGet(fullUrl);
            if (cached !== void 0) return cached;
          }
          const data = await _requestWithRetry("GET", fullUrl, null, {
            ...headers,
            "Accept": "application/json"
          }, retries);
          if (cache) cacheSet(fullUrl, data);
          return data;
        }
        __name(get, "get");
        async function post(url, body, options = {}) {
          const { retries = FluxConstants.RETRY.MAX_RETRIES, headers = {} } = options;
          return _requestWithRetry("POST", url, body, {
            ...headers,
            "Content-Type": "application/json",
            "Accept": "application/json"
          }, retries);
        }
        __name(post, "post");
        function _requestWithRetry(method, url, body, headers, maxRetries) {
          return FluxUtils.retry(() => _doRequest(method, url, body, headers), maxRetries, FluxConstants.RETRY.BASE_DELAY);
        }
        __name(_requestWithRetry, "_requestWithRetry");
        function _doRequest(method, url, body, headers) {
          return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === "undefined") {
              const fetchOptions = {
                method,
                headers,
                credentials: "include"
              };
              if (body !== null) fetchOptions.body = JSON.stringify(body);
              void fetch(url, fetchOptions).then((response) => {
                if (response.status === 429) {
                  reject(new Error("RATE_LIMITED"));
                } else if (!response.ok) {
                  reject(new Error(`HTTP ${String(response.status)}`));
                } else {
                  return response.json();
                }
                return void 0;
              }).then((data) => {
                if (data !== void 0) resolve(data);
              }).catch((err) => {
                if (err instanceof Error && err.message === "RATE_LIMITED") reject(err);
                else reject(new Error("Network error"));
              });
              return;
            }
            const requestConfig = {
              method,
              url,
              headers,
              anonymous: false,
              timeout: 15e3,
              onload: /* @__PURE__ */ __name(function(response) {
                if (response.status === 429) {
                  reject(new Error("RATE_LIMITED"));
                  return;
                }
                if (response.status >= 200 && response.status < 300) {
                  try {
                    resolve(JSON.parse(response.responseText));
                  } catch {
                    resolve(response.responseText);
                  }
                } else {
                  reject(new Error(`HTTP ${String(response.status)}`));
                }
              }, "onload"),
              onerror: /* @__PURE__ */ __name(function() {
                reject(new Error("Network error"));
              }, "onerror"),
              ontimeout: /* @__PURE__ */ __name(function() {
                reject(new Error("Timeout"));
              }, "ontimeout")
            };
            if (body !== null) {
              requestConfig.data = JSON.stringify(body);
            }
            GM_xmlhttpRequest(requestConfig);
          });
        }
        __name(_doRequest, "_doRequest");
        async function batchGet(requests, options = {}) {
          const { cache = false, concurrency = 6 } = options;
          const tasks = requests.map((r) => () => get(r.url, r.params, { cache }));
          return FluxUtils.parallelLimit(tasks, concurrency);
        }
        __name(batchGet, "batchGet");
        function clearCache() {
          CACHE.clear();
        }
        __name(clearCache, "clearCache");
        return { get, post, batchGet, clearCache };
      })();
    }
  });

  // src/api/geolocation.ts
  var geolocation_exports = {};
  __export(geolocation_exports, {
    FluxGeolocationAPI: () => FluxGeolocationAPI
  });
  var FluxGeolocationAPI;
  var init_geolocation = __esm({
    "src/api/geolocation.ts"() {
      "use strict";
      init_http_client();
      init_logger();
      FluxGeolocationAPI = (() => {
        "use strict";
        const PROVIDERS = [
          { name: "freeipapi", base: "https://freeipapi.com/api/json" },
          { name: "ip-api", base: "http://ip-api.com/json" }
        ];
        const CACHE = /* @__PURE__ */ new Map();
        const CACHE_TTL = 18e5;
        async function lookupIP(ip) {
          if (ip === "" || ip === "0.0.0.0") return null;
          const cached = CACHE.get(ip);
          if (cached !== void 0 && Date.now() - cached.t < CACHE_TTL) {
            FluxLogger.debug("Geolocation", `Cache hit for ${ip}: ${cached.data.city ?? cached.data.country}`);
            return cached.data;
          }
          let result = await tryFreeipapi(ip);
          if (result !== null) {
            CACHE.set(ip, { data: result, t: Date.now() });
            return result;
          }
          result = await tryIpApi(ip);
          if (result !== null) {
            CACHE.set(ip, { data: result, t: Date.now() });
            return result;
          }
          return null;
        }
        __name(lookupIP, "lookupIP");
        async function tryFreeipapi(ip) {
          try {
            const freeipapiUrl = PROVIDERS[0]?.base ?? "https://freeipapi.com/api/json";
            const data = await FluxHttpClient.get(`${freeipapiUrl}/${ip}`, {}, { cache: false, retries: 1 });
            if (data !== null && typeof data === "object" && typeof data.countryCode === "string") {
              const result = {
                countryCode: data.countryCode,
                country: typeof data.countryName === "string" ? data.countryName : data.countryCode,
                city: typeof data.cityName === "string" ? data.cityName : null,
                regionName: typeof data.regionName === "string" ? data.regionName : null
              };
              FluxLogger.debug("Geolocation", `freeipapi: ${ip} \u2192 ${result.city ?? result.country} (${result.countryCode})`);
              return result;
            }
          } catch (e) {
            FluxLogger.debug("Geolocation", `freeipapi failed for ${ip}: ${String(e)}`);
          }
          return null;
        }
        __name(tryFreeipapi, "tryFreeipapi");
        async function tryIpApi(ip) {
          try {
            const ipApiUrl = PROVIDERS[1]?.base ?? "http://ip-api.com/json";
            const data = await FluxHttpClient.get(`${ipApiUrl}/${ip}`, { fields: "countryCode,country,city,regionName" }, { cache: false, retries: 1 });
            if (data !== null && typeof data === "object" && typeof data.countryCode === "string") {
              const result = {
                countryCode: data.countryCode,
                country: typeof data.country === "string" ? data.country : data.countryCode,
                city: typeof data.city === "string" ? data.city : null,
                regionName: typeof data.regionName === "string" ? data.regionName : null
              };
              FluxLogger.debug("Geolocation", `ip-api: ${ip} \u2192 ${result.city ?? result.country} (${result.countryCode})`);
              return result;
            }
          } catch (e) {
            FluxLogger.debug("Geolocation", `ip-api failed for ${ip}: ${String(e)}`);
          }
          return null;
        }
        __name(tryIpApi, "tryIpApi");
        async function getRegionFromIP(ip) {
          const geo = await lookupIP(ip);
          if (geo !== null) {
            return { region: geo };
          }
          return { region: null, details: geo };
        }
        __name(getRegionFromIP, "getRegionFromIP");
        function clearCache() {
          const size = CACHE.size;
          CACHE.clear();
          FluxLogger.debug("Geolocation", `Cache cleared (${String(size)} entries)`);
        }
        __name(clearCache, "clearCache");
        return { lookupIP, getRegionFromIP, clearCache };
      })();
    }
  });

  // src/app.ts
  init_logger();

  // src/core/storage.ts
  var FluxStorage = (() => {
    "use strict";
    const PREFIX = "FLUXFIND_";
    function k(name) {
      return PREFIX + name;
    }
    __name(k, "k");
    function get(name) {
      const key = k(name);
      try {
        if (typeof GM_getValue !== "undefined") {
          const saved = GM_getValue(key);
          if (saved !== void 0 && saved !== null) return saved;
        }
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    __name(get, "get");
    function getJSON(name, defaultValue) {
      const raw = get(name);
      if (raw === null) return defaultValue;
      try {
        return JSON.parse(raw);
      } catch {
        return defaultValue;
      }
    }
    __name(getJSON, "getJSON");
    function getBool(name, defaultValue = false) {
      const raw = get(name);
      if (raw === null) return defaultValue;
      return raw === "true";
    }
    __name(getBool, "getBool");
    function getNumber(name, defaultValue = 0) {
      const raw = get(name);
      if (raw === null) return defaultValue;
      const num = Number(raw);
      return isNaN(num) ? defaultValue : num;
    }
    __name(getNumber, "getNumber");
    function set(name, value) {
      const key = k(name);
      const str = String(value);
      try {
        if (typeof GM_setValue !== "undefined") {
          GM_setValue(key, str);
        }
        localStorage.setItem(key, str);
        return true;
      } catch {
        return false;
      }
    }
    __name(set, "set");
    function setJSON(name, value) {
      return set(name, JSON.stringify(value));
    }
    __name(setJSON, "setJSON");
    function setBool(name, value) {
      return set(name, value ? "true" : "false");
    }
    __name(setBool, "setBool");
    function remove(name) {
      const key = k(name);
      try {
        if (typeof GM_deleteValue !== "undefined") {
          GM_deleteValue(key);
        }
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }
    __name(remove, "remove");
    function listKeys() {
      const keys = [];
      const prefixLen = PREFIX.length;
      try {
        if (typeof GM_listValues !== "undefined") {
          const all = GM_listValues();
          for (const key of all) {
            if (key.startsWith(PREFIX)) keys.push(key.slice(prefixLen));
          }
          return keys;
        }
      } catch {
      }
      for (let i = 0; i < localStorage.length; i++) {
        const keyName = localStorage.key(i);
        if (keyName?.startsWith(PREFIX) === true) {
          keys.push(keyName.slice(prefixLen));
        }
      }
      return keys;
    }
    __name(listKeys, "listKeys");
    function has(name) {
      const key = k(name);
      try {
        if (typeof GM_getValue !== "undefined") {
          return GM_getValue(key) !== void 0;
        }
      } catch {
      }
      return localStorage.getItem(key) !== null;
    }
    __name(has, "has");
    function initDefaults(defaults) {
      for (const [prop, value] of Object.entries(defaults)) {
        if (!has(prop)) {
          if (typeof value === "boolean") {
            setBool(prop, value);
          } else if (typeof value === "object" && value !== null) {
            setJSON(prop, value);
          } else {
            set(prop, value);
          }
        }
      }
    }
    __name(initDefaults, "initDefaults");
    function migrateLegacy() {
      const migrated = getBool("_legacy_migrated");
      if (migrated) return 0;
      let count = 0;
      const migrationMap = {};
      for (let i = 0; i < localStorage.length; i++) {
        const keyName = localStorage.key(i);
        if (keyName?.startsWith("ROLOCATE_") === true) {
          const newName = keyName.slice("ROLOCATE_".length).toLowerCase();
          migrationMap[keyName] = newName;
        }
      }
      for (const [oldKey, newName] of Object.entries(migrationMap)) {
        const value = localStorage.getItem(oldKey);
        set(newName, value ?? "");
        localStorage.removeItem(oldKey);
        count++;
      }
      setBool("_legacy_migrated", true);
      return count;
    }
    __name(migrateLegacy, "migrateLegacy");
    return {
      get,
      getJSON,
      getBool,
      getNumber,
      set,
      setJSON,
      setBool,
      remove,
      listKeys,
      has,
      initDefaults,
      migrateLegacy,
      key: k
    };
  })();

  // src/app.ts
  init_constants();

  // src/core/dom.ts
  var FluxDOM = (() => {
    "use strict";
    function el(tag, attrs = {}, ...children) {
      const element = document.createElement(tag);
      for (const [key, value] of Object.entries(attrs)) {
        if (key === "className" && typeof value === "string") {
          element.className = value;
        } else if (key === "style" && typeof value === "object" && value !== null) {
          Object.assign(element.style, value);
        } else if (key.startsWith("on") && typeof value === "function") {
          element.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === "html") {
          element.innerHTML = typeof value === "string" ? value : "";
        } else if (key === "text") {
          element.textContent = typeof value === "string" ? value : "";
        } else if (key === "disabled" || key === "checked" || key === "selected") {
          if (value) element.setAttribute(key, "");
          else element.removeAttribute(key);
        } else {
          element.setAttribute(key, typeof value === "string" ? value : "");
        }
      }
      for (const child of children) {
        if (typeof child === "string") {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
          element.appendChild(child);
        }
      }
      return element;
    }
    __name(el, "el");
    function injectStyle(id, css) {
      let styleEl = document.getElementById(id);
      if (styleEl === null) {
        styleEl = document.createElement("style");
        styleEl.id = id;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = css;
      return styleEl;
    }
    __name(injectStyle, "injectStyle");
    function injectStyleOnce(id, css) {
      if (document.getElementById(id) !== null) return null;
      const styleEl = document.createElement("style");
      styleEl.id = id;
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
      return styleEl;
    }
    __name(injectStyleOnce, "injectStyleOnce");
    function removeStyle(id) {
      document.getElementById(id)?.remove();
    }
    __name(removeStyle, "removeStyle");
    function toggleClass(element, className, condition) {
      if (condition === void 0) {
        element.classList.toggle(className);
      } else if (condition) {
        element.classList.add(className);
      } else {
        element.classList.remove(className);
      }
    }
    __name(toggleClass, "toggleClass");
    function isInViewport(el2, margin = 0) {
      const rect = el2.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      return rect.top < vh + margin && rect.bottom > -margin && rect.left < vw + margin && rect.right > -margin;
    }
    __name(isInViewport, "isInViewport");
    function getBackgroundBrightness(el2 = document.body) {
      const bg = getComputedStyle(el2).backgroundColor;
      const rgb = bg.match(/\d+/g);
      if (rgb === null || rgb.length < 3) return 255;
      return (Number(rgb[0]) * 299 + Number(rgb[1]) * 587 + Number(rgb[2]) * 114) / 1e3;
    }
    __name(getBackgroundBrightness, "getBackgroundBrightness");
    function isDarkMode() {
      const bg = getComputedStyle(document.body).backgroundColor;
      const rgb = bg.match(/\d+/g);
      if (rgb === null || rgb.length < 3) return false;
      const brightness = (Number(rgb[0]) * 299 + Number(rgb[1]) * 587 + Number(rgb[2]) * 114) / 1e3;
      return brightness < 128;
    }
    __name(isDarkMode, "isDarkMode");
    function getCsrfToken() {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta?.getAttribute("data-token") ?? null;
    }
    __name(getCsrfToken, "getCsrfToken");
    return {
      el,
      injectStyle,
      injectStyleOnce,
      removeStyle,
      toggleClass,
      isInViewport,
      getBackgroundBrightness,
      isDarkMode,
      getCsrfToken
    };
  })();

  // src/ui/icons.ts
  var FluxIcons = (() => {
    "use strict";
    const NS = "http://www.w3.org/2000/svg";
    function svg(attrs, ...paths) {
      const size = typeof attrs.width === "number" ? attrs.width : 24;
      const height = typeof attrs.height === "number" ? attrs.height : size;
      const strokeWidth = typeof attrs.strokeWidth === "number" ? attrs.strokeWidth : 2;
      const className = typeof attrs.className === "string" ? attrs.className : "";
      const style = typeof attrs.style === "string" ? attrs.style : "";
      return '<svg xmlns="' + NS + '" width="' + String(size) + '" height="' + String(height) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + String(strokeWidth) + '" stroke-linecap="round" stroke-linejoin="round" class="' + className + '" style="' + style + '">' + paths.join("") + "</svg>";
    }
    __name(svg, "svg");
    const icons = {
      settings: svg({}, '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
      search: svg({}, '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
      filter: svg({}, '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'),
      refresh: svg({}, '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15.36 6.36L3 16"/>'),
      close: svg({}, '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
      check: svg({}, '<path d="M20 6 9 17l-5-5"/>'),
      chevronDown: svg({}, '<path d="m6 9 6 6 6-6"/>'),
      chevronUp: svg({}, '<path d="m18 15-6-6-6 6"/>'),
      chevronLeft: svg({}, '<path d="m15 18-6-6 6-6"/>'),
      chevronRight: svg({}, '<path d="m9 18 6-6-6-6"/>'),
      info: svg({}, '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
      alertTriangle: svg({}, '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
      alertCircle: svg({}, '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'),
      checkCircle: svg({}, '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
      xCircle: svg({}, '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'),
      loader: svg({}, '<path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>'),
      user: svg({}, '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
      users: svg({}, '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
      userPlus: svg({}, '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>'),
      userX: svg({}, '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>'),
      userRoundPlus: svg({}, '<path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="M19 16v6"/><path d="M22 19h-6"/>'),
      play: svg({}, '<polygon points="5 3 19 12 5 21 5 3"/>'),
      gamepad: svg({}, '<line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/>'),
      server: svg({}, '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>'),
      zap: svg({}, '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
      globe: svg({}, '<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/><path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10"/>'),
      mapPin: svg({}, '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
      plus: svg({}, '<path d="M5 12h14"/><path d="M12 5v14"/>'),
      minus: svg({}, '<path d="M5 12h14"/>'),
      trash: svg({}, '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'),
      copy: svg({}, '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
      download: svg({}, '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
      upload: svg({}, '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>'),
      externalLink: svg({}, '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>'),
      eye: svg({}, '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
      eyeOff: svg({}, '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>'),
      moon: svg({}, '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
      sun: svg({}, '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
      layout: svg({}, '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="3" y2="21"/>'),
      palette: svg({}, '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="9.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>'),
      monitor: svg({}, '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'),
      heart: svg({}, '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
      star: svg({}, '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
      clock: svg({}, '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
      shield: svg({}, '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
      flag: svg({}, '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>'),
      barChart: svg({}, '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>')
    };
    function get(name, opts = {}) {
      const { size = 18, className = "", color = "" } = opts;
      let s = icons[name];
      if (!s) return icons.info;
      s = s.replace(/width="\d+"/, 'width="' + String(size) + '"');
      s = s.replace(/height="\d+"/, 'height="' + String(size) + '"');
      if (className) {
        s = s.replace('class=""', 'class="' + className + '"');
        if (!s.includes("class=")) {
          s = s.replace("<svg", '<svg class="' + className + '"');
        }
      }
      if (color) {
        s = s.replace('stroke="currentColor"', 'stroke="' + color + '"');
      }
      return s;
    }
    __name(get, "get");
    return { get };
  })();

  // src/features/url-router.ts
  init_constants();
  init_logger();
  var FluxRouter = /* @__PURE__ */ (() => {
    let lastPath = "";
    let intervalId = null;
    function detectPage() {
      const path = window.location.pathname;
      const url = window.location.href;
      if (FluxConstants.URL_PATTERNS.SERVERS_PAGE.test(url)) return "servers";
      if (FluxConstants.URL_PATTERNS.GAME_PAGE.test(path)) return "game";
      if (FluxConstants.URL_PATTERNS.HOME_PAGE.test(path) || path === "/home") return "home";
      if (FluxConstants.URL_PATTERNS.PROFILE_PAGE.test(path)) return "profile";
      if (FluxConstants.URL_PATTERNS.SEARCH_PAGE.test(path)) return "search";
      return "unknown";
    }
    __name(detectPage, "detectPage");
    function start(callback) {
      if (intervalId !== null) return;
      lastPath = window.location.pathname + window.location.search + window.location.hash;
      intervalId = setInterval(() => {
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (currentPath !== lastPath) {
          lastPath = currentPath;
          const newPage = detectPage();
          FluxLogger.info("Router", `Route changed: -> ${newPage} (${currentPath})`);
          callback(newPage, null);
        }
      }, FluxConstants.TIMING.URL_CHECK_INTERVAL);
    }
    __name(start, "start");
    function stop() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
    __name(stop, "stop");
    return { start, stop, detectPage };
  })();

  // src/ui/modals.ts
  var FluxModals = /* @__PURE__ */ (() => {
    let activeModalCount = 0;
    let overlayEl = null;
    function getOverlay() {
      if (!overlayEl?.isConnected) {
        overlayEl = document.getElementById("ff-modal-overlay");
        if (overlayEl === null) {
          overlayEl = document.createElement("div");
          overlayEl.id = "ff-modal-overlay";
          document.body.appendChild(overlayEl);
        }
      }
      return overlayEl;
    }
    __name(getOverlay, "getOverlay");
    function showOverlay() {
      const overlay = getOverlay();
      overlay.classList.add("ff-modal-overlay-active");
    }
    __name(showOverlay, "showOverlay");
    function hideOverlay() {
      if (activeModalCount <= 0) {
        const overlay = getOverlay();
        overlay.classList.remove("ff-modal-overlay-active");
      }
    }
    __name(hideOverlay, "hideOverlay");
    function custom(builder, _options) {
      showOverlay();
      activeModalCount++;
      const overlay = getOverlay();
      const modal = document.createElement("div");
      modal.className = "ff-modal ff-modal-custom ff-modal-pop";
      modal.style.maxWidth = "520px";
      modal.style.width = "90%";
      modal.style.borderRadius = "12px";
      modal.style.overflowY = "auto";
      modal.style.maxHeight = "85vh";
      function backdropHandler(e) {
        if (e.target === overlay) {
          close();
        }
      }
      __name(backdropHandler, "backdropHandler");
      function close() {
        overlay.removeEventListener("click", backdropHandler);
        modal.classList.add("ff-modal-closing");
        setTimeout(() => {
          if (modal.isConnected) modal.remove();
          activeModalCount--;
          hideOverlay();
        }, 200);
      }
      __name(close, "close");
      overlay.addEventListener("click", backdropHandler);
      builder(modal, close);
      overlay.appendChild(modal);
    }
    __name(custom, "custom");
    return { custom };
  })();

  // src/ui/settings-panel.ts
  init_logger();

  // src/features/ad-remover.ts
  init_utils();
  init_logger();
  var FluxFeatureAdRemover = (() => {
    let observer = null;
    let enabled = false;
    let blockedSession = 0;
    const AD_SELECTORS = [
      '[data-testid="home-page-game-grid"] > div:last-child',
      ".game-promotion-section",
      ".ad-container",
      '[class*="ad-"]',
      '[class*="promotion"]',
      ".home-page-ad",
      "[data-promotion-type]",
      "#game-grid-sponsored"
    ];
    const selector = AD_SELECTORS.join(",");
    function getTotalBlocked() {
      return FluxStorage.getNumber("adBlockedTotal", 0);
    }
    __name(getTotalBlocked, "getTotalBlocked");
    function incrementTotal(count) {
      const current = getTotalBlocked();
      FluxStorage.set("adBlockedTotal", current + count);
    }
    __name(incrementTotal, "incrementTotal");
    function removeAds() {
      if (!enabled) return;
      const ads = document.querySelectorAll(selector);
      let removed = 0;
      for (const ad of ads) {
        const el = ad;
        const prevDisplay = el.style.display;
        const textSnippet = el.textContent.trim().slice(0, 80) || "(no text)";
        const dataAttrs = Array.from(el.attributes).filter((a) => a.name.startsWith("data-")).map((a) => `${a.name}=${JSON.stringify(a.value)}`).join(" ");
        const extra = dataAttrs ? ` [${dataAttrs}]` : "";
        el.remove();
        removed++;
        FluxLogger.debug("AdRemover", `Removed ad element: ${el.tagName}.${el.className.split(" ")[0] ?? "?"} text="${textSnippet}"${extra} (was ${prevDisplay || "visible"})`);
      }
      if (removed > 0) {
        blockedSession += removed;
        incrementTotal(removed);
        FluxLogger.info("AdRemover", `Blocked ${String(removed)} ads (session: ${String(blockedSession)}, total: ${String(getTotalBlocked())})`);
      }
    }
    __name(removeAds, "removeAds");
    const debouncedRemove = FluxUtils.debounce(removeAds, 300, true);
    function start() {
      if (enabled) return;
      FluxLogger.info("AdRemover", "Starting ad blocker...");
      enabled = true;
      blockedSession = 0;
      const total = getTotalBlocked();
      FluxLogger.info("AdRemover", `Loaded stats: ${String(total)} ads blocked total (lifetime)`);
      removeAds();
      observer = new MutationObserver(() => {
        debouncedRemove();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      FluxLogger.info("AdRemover", "Ad blocker active \u2014 observing DOM mutations");
    }
    __name(start, "start");
    function stop() {
      if (!enabled) return;
      FluxLogger.info("AdRemover", `Stopping ad blocker (session blocked: ${String(blockedSession)})`);
      enabled = false;
      if (observer !== null) {
        observer.disconnect();
        observer = null;
      }
    }
    __name(stop, "stop");
    function getStats() {
      return {
        blockedSession,
        blockedTotal: getTotalBlocked()
      };
    }
    __name(getStats, "getStats");
    function resetStats() {
      FluxLogger.info("AdRemover", "Resetting ad block stats");
      blockedSession = 0;
      FluxStorage.set("adBlockedTotal", 0);
    }
    __name(resetStats, "resetStats");
    return { start, stop, removeAds, getStats, resetStats };
  })();

  // src/core/state.ts
  init_logger();
  function createAtom(key, defaultValue) {
    let value = defaultValue;
    const raw = FluxStorage.get(key);
    if (raw !== null) {
      try {
        value = JSON.parse(raw);
      } catch {
      }
    }
    const listeners = /* @__PURE__ */ new Set();
    const atom = {
      get() {
        return value;
      },
      set(next) {
        if (value === next) return;
        value = next;
        FluxStorage.setJSON(key, next);
        listeners.forEach((fn) => {
          try {
            fn(next);
          } catch (e) {
            FluxLogger.error("StateManager", `Subscriber error: ${String(e)}`);
          }
        });
      },
      subscribe(fn) {
        listeners.add(fn);
        return () => {
          listeners.delete(fn);
        };
      }
    };
    return atom;
  }
  __name(createAtom, "createAtom");

  // src/state/atoms.ts
  var darkModeAtom = createAtom("forcedarkmode", false);
  var chatDisabledAtom = createAtom("disablechat", false);
  var removeAdsAtom = createAtom("removeads", true);
  var serverFiltersAtom = createAtom("togglefilterserversbutton", true);
  var autoRegionScanAtom = createAtom("autoserverregions", true);
  var responsiveCardsAtom = createAtom("responsivegamecards", true);
  var smartSearchAtom = createAtom("smartsearch", true);
  var debugLogsAtom = createAtom("enableLogs", false);
  var regionFilterAtom = createAtom("serverregionfilter", "");
  var serverFetchCountAtom = createAtom("serverfetchcount", 150);

  // src/ui/settings-panel.ts
  var TABS = [
    { key: "filters", label: "Filters" },
    { key: "appearance", label: "Appearance" },
    { key: "privacy", label: "Privacy" },
    { key: "ads", label: "Ads & Stats" }
  ];
  var FluxSettingsPanel = /* @__PURE__ */ (() => {
    function open() {
      FluxLogger.info("Settings", "Opening settings panel");
      FluxModals.custom((modal, _close) => {
        let activeTab = "filters";
        function renderNav(container) {
          container.innerHTML = `
          <div class="ff-segmented-nav" id="ff-segmented-nav">
            <div class="ff-segmented-indicator" id="ff-segmented-indicator"></div>
            ${TABS.map((t) => `<div class="ff-segmented-item ${t.key === activeTab ? "ff-active" : ""}" data-tab="${t.key}">${t.label}</div>`).join("")}
          </div>`;
        }
        __name(renderNav, "renderNav");
        function renderContent(container) {
          container.innerHTML = '<div class="ff-settings-tab-content" id="ff-settings-tab-content"></div>';
          const tabContent = container.querySelector("#ff-settings-tab-content");
          if (tabContent) tabContent.innerHTML = getTabHTML(activeTab);
        }
        __name(renderContent, "renderContent");
        function updateIndicator() {
          const nav = document.querySelector("#ff-segmented-nav");
          const indicator = document.querySelector("#ff-segmented-indicator");
          const activeItem = nav?.querySelector(".ff-segmented-item.ff-active");
          if (!indicator || !activeItem || !nav) return;
          const navRect = nav.getBoundingClientRect();
          const itemRect = activeItem.getBoundingClientRect();
          const indicatorEl = indicator;
          indicatorEl.style.left = `${String(itemRect.left - navRect.left)}px`;
          indicatorEl.style.width = `${String(itemRect.width)}px`;
        }
        __name(updateIndicator, "updateIndicator");
        function switchTab(key) {
          if (activeTab === key) return;
          activeTab = key;
          const navContainer2 = modal.querySelector("#ff-segmented-nav")?.parentElement;
          if (navContainer2) renderNav(navContainer2);
          const contentContainer2 = modal.querySelector("#ff-settings-tab-content")?.parentElement;
          if (contentContainer2) renderContent(contentContainer2);
          wireNavHandlers();
          requestAnimationFrame(() => {
            updateIndicator();
          });
          wireToggleHandlers(modal);
        }
        __name(switchTab, "switchTab");
        function wireNavHandlers() {
          modal.querySelectorAll(".ff-segmented-item").forEach((item) => {
            item.addEventListener("click", function() {
              const tab = this.dataset.tab;
              if (tab) switchTab(tab);
            });
          });
        }
        __name(wireNavHandlers, "wireNavHandlers");
        function wireToggleHandlers(parentEl) {
          parentEl.querySelectorAll(".ff-toggle-input").forEach((input) => {
            input.addEventListener("change", function() {
              const key = this.dataset.key;
              if (!key) return;
              const checked = this.checked;
              FluxStorage.setBool(key, checked);
              FluxLogger.info("Settings", `Toggle changed: ${key} = ${String(checked)}`);
              applySettingChange(key, checked);
            });
          });
        }
        __name(wireToggleHandlers, "wireToggleHandlers");
        function wireResetStats(parentEl) {
          const resetBtn = parentEl.querySelector("#ff-reset-stats");
          if (resetBtn) resetBtn.addEventListener("click", () => {
            FluxFeatureAdRemover.resetStats();
            FluxLogger.info("Settings", "Ad block stats reset");
            const updatedStats = FluxFeatureAdRemover.getStats();
            const sessionEl = parentEl.querySelector(".ff-stats-session");
            const totalEl = parentEl.querySelector(".ff-stats-total");
            if (sessionEl) sessionEl.textContent = String(updatedStats.blockedSession);
            if (totalEl) totalEl.textContent = String(updatedStats.blockedTotal);
          });
        }
        __name(wireResetStats, "wireResetStats");
        modal.innerHTML = `
        <div style="padding:24px;display:flex;flex-direction:column;max-height:500px">
          <h3 style="margin:0 0 16px;font-size:18px;display:flex;align-items:center;gap:8px">
            ${FluxIcons.get("settings", { size: 20 })} FluxFind Settings
          </h3>
          <div id="ff-nav-container"></div>
          <div id="ff-content-container" style="flex:1;overflow-y:auto"></div>
        </div>`;
        const navContainer = modal.querySelector("#ff-nav-container");
        const contentContainer = modal.querySelector("#ff-content-container");
        if (navContainer) renderNav(navContainer);
        if (contentContainer) renderContent(contentContainer);
        wireNavHandlers();
        wireToggleHandlers(modal);
        wireResetStats(modal);
        requestAnimationFrame(() => {
          updateIndicator();
        });
      });
    }
    __name(open, "open");
    function getTabHTML(tab) {
      switch (tab) {
        case "filters":
          return `<div style="display:flex;flex-direction:column;gap:8px">${toggleRow("togglefilterserversbutton", "Server Filters", "Show filter controls on game server pages")}${toggleRow("autoserverregions", "Auto Region Scan", "Automatically fetch server locations")}</div>`;
        case "appearance":
          return `<div style="display:flex;flex-direction:column;gap:8px">${toggleRow("forcedarkmode", "Dark Mode", "Override page theme to dark")}${toggleRow("responsivegamecards", "Responsive Cards", "Make game cards adapt to screen width")}${toggleRow("smartsearch", "Smart Search", "Enhanced search suggestions")}</div>`;
        case "privacy":
          return `<div style="display:flex;flex-direction:column;gap:8px">${toggleRow("disablechat", "Disable Chat", "Remove the chat sidebar")}${toggleRow("enableLogs", "Debug Logs", "Show FluxFind logs in console")}</div>`;
        case "ads": {
          const stats = FluxFeatureAdRemover.getStats();
          return `<div style="display:flex;flex-direction:column;gap:8px">${toggleRow("removeads", "Remove Ads", "Remove promotional content from pages")}<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--ff-border)"><h4 style="margin:0 0 10px;font-size:14px">${FluxIcons.get("barChart", { size: 14 })} Statistics</h4><div style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--ff-text-secondary)"><div style="display:flex;justify-content:space-between"><span>Ads blocked this session:</span><strong class="ff-stats-session">${String(stats.blockedSession)}</strong></div><div style="display:flex;justify-content:space-between"><span>Ads blocked (total):</span><strong class="ff-stats-total">${String(stats.blockedTotal)}</strong></div></div><button id="ff-reset-stats" class="ff-btn ff-btn-sm ff-btn-danger" style="margin-top:8px;width:100%">${FluxIcons.get("trash", { size: 14 })} Reset Stats</button></div></div>`;
        }
      }
    }
    __name(getTabHTML, "getTabHTML");
    function applySettingChange(key, value) {
      FluxLogger.info("Settings", `Toggle changed: ${key} = ${String(value)}`);
      switch (key) {
        case "forcedarkmode":
          darkModeAtom.set(value);
          break;
        case "disablechat":
          chatDisabledAtom.set(value);
          break;
        case "removeads":
          removeAdsAtom.set(value);
          break;
        case "enableLogs":
          debugLogsAtom.set(value);
          break;
        case "smartsearch":
          smartSearchAtom.set(value);
          break;
        default:
          break;
      }
    }
    __name(applySettingChange, "applySettingChange");
    function toggleRow(key, label, desc) {
      const checked = FluxStorage.getBool(key, false);
      return `<label class="ff-toggle-wrapper"><input type="checkbox" class="ff-toggle-input" data-key="${key}"${checked ? " checked" : ""}><span class="ff-toggle-track"><span class="ff-toggle-knob"></span></span><span class="ff-toggle-label">${label}<br><small style="color:#888">${desc}</small></span></label>`;
    }
    __name(toggleRow, "toggleRow");
    return { open };
  })();

  // src/features/server-browser.ts
  init_utils();
  init_logger();
  init_constants();

  // src/api/games.ts
  init_http_client();
  init_logger();

  // src/core/sanitizer.ts
  var HTML_ENTITIES = {
    "&": "&",
    "<": "<",
    ">": ">",
    '"': '"',
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;"
  };
  var FluxSanitizer = (() => {
    "use strict";
    function escapeHtml(text) {
      if (typeof text !== "string") return "";
      return text.replace(/[&<>"'`=]/g, (char) => HTML_ENTITIES[char] ?? char);
    }
    __name(escapeHtml, "escapeHtml");
    function sanitizeUserId(id) {
      const num = typeof id === "number" ? id : parseInt(id ?? "", 10);
      return !isNaN(num) && num > 0 && num < Number.MAX_SAFE_INTEGER ? num : 0;
    }
    __name(sanitizeUserId, "sanitizeUserId");
    function sanitizeAttribute(str) {
      return (str ?? "").replace(/[&<>"'`]/g, (char) => HTML_ENTITIES[char] ?? char);
    }
    __name(sanitizeAttribute, "sanitizeAttribute");
    function sanitizeColor(color) {
      const safe = color ?? "";
      return /^#[0-9A-Fa-f]{3,8}$/.test(safe) ? safe : "#ffffff";
    }
    __name(sanitizeColor, "sanitizeColor");
    function sanitizeCssColor(value) {
      const safe = value ?? "";
      const cssColorPattern = /^(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)$/;
      return cssColorPattern.test(safe) ? safe : "rgba(40,40,40,0.85)";
    }
    __name(sanitizeCssColor, "sanitizeCssColor");
    function escapeCssString(str) {
      return (str ?? "").replace(/[\\"';&!]/g, "\\$&");
    }
    __name(escapeCssString, "escapeCssString");
    function safeInnerHTML(element, html) {
      element.innerHTML = "";
      if (typeof html !== "string") return;
      const sanitized = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<(\w+)\s+on\w+\s*=\s*["'][^"']*["']/gi, "<$1");
      element.innerHTML = sanitized;
    }
    __name(safeInnerHTML, "safeInnerHTML");
    function sanitizeUrl(url) {
      if (typeof url !== "string") return "";
      const trimmed = url.trim();
      if (/^(https?:|data:image\/)/i.test(trimmed)) {
        return trimmed;
      }
      return "";
    }
    __name(sanitizeUrl, "sanitizeUrl");
    function truncate(text, maxLen = 200) {
      const str = text ?? "";
      return str.length > maxLen ? str.slice(0, maxLen) + "\u2026" : str;
    }
    __name(truncate, "truncate");
    function isPlainObject(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }
    __name(isPlainObject, "isPlainObject");
    return {
      escapeHtml,
      sanitizeUserId,
      sanitizeAttribute,
      sanitizeColor,
      sanitizeCssColor,
      escapeCssString,
      safeInnerHTML,
      sanitizeUrl,
      truncate,
      isPlainObject
    };
  })();

  // src/api/games.ts
  init_constants();
  var FluxGamesAPI = (() => {
    "use strict";
    function getCurrentGameId() {
      const m = /\/games\/(\d+)/.exec(window.location.href);
      return m?.[1] !== void 0 ? FluxSanitizer.sanitizeUserId(m[1]) : 0;
    }
    __name(getCurrentGameId, "getCurrentGameId");
    async function fetchAllPublicServers(gameId, sortOrder = "Desc", maxServers = 300) {
      let allData = [];
      let cursor = null;
      let page = 0;
      FluxLogger.info("GamesAPI", `Fetching servers for game ${String(gameId)} (max: ${String(maxServers)}, sort: ${sortOrder})`);
      do {
        const url = `${FluxConstants.API.GAMES_API}/games/${String(gameId)}/servers/Public?sortOrder=${sortOrder}&limit=100&excludeFullGames=true${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`;
        const resp = await FluxHttpClient.get(url, {}, { cache: false });
        const servers = resp.data ?? [];
        allData = allData.concat(servers);
        cursor = resp.nextPageCursor ?? null;
        page++;
        FluxLogger.debug("GamesAPI", `Page ${String(page)}: ${String(servers.length)} servers (total: ${String(allData.length)}, cursor: ${cursor ? "yes" : "none"})`);
      } while (cursor !== null && allData.length < maxServers && page < 10);
      FluxLogger.info("GamesAPI", `Server fetch complete: ${String(allData.length)} servers across ${String(page)} page(s)`);
      return allData;
    }
    __name(fetchAllPublicServers, "fetchAllPublicServers");
    async function fetchPublicServersPage(gameId, sortOrder, limit, cursor = null) {
      const url = `${FluxConstants.API.GAMES_API}/games/${String(gameId)}/servers/Public?sortOrder=${sortOrder}&limit=${String(limit)}&excludeFullGames=true${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`;
      const resp = await FluxHttpClient.get(url, {}, { cache: false });
      return {
        servers: resp.data ?? [],
        nextCursor: resp.nextPageCursor ?? null
      };
    }
    __name(fetchPublicServersPage, "fetchPublicServersPage");
    async function fetchSingleRegion(gameId, sid) {
      try {
        const data = await FluxHttpClient.post(
          `${FluxConstants.API.JOIN_API}/join-game-instance`,
          { placeId: FluxSanitizer.sanitizeUserId(gameId), gameId: sid },
          { headers: { "User-Agent": "Roblox/WinInet" }, retries: 2 }
        );
        if (data.joinScript === null || data.joinScript === void 0) {
          return { sid, result: null };
        }
        const js = data.joinScript;
        if (Object.keys(js).length === 0) {
          return { sid, result: null };
        }
        const endpoints = js.UdmuxEndpoints ?? js.udmuxEndpoints ?? js.udmuxendpoints ?? js.ServerConnections;
        if (endpoints === void 0 || endpoints.length === 0) {
          FluxLogger.warn("GamesAPI", `Region [${sid}]: no UdmuxEndpoints in response`);
          return { sid, result: null };
        }
        for (const ep of endpoints) {
          const epIp = ep.Address ?? null;
          if (epIp !== null && epIp !== "0.0.0.0" && !epIp.startsWith("10.") && !epIp.startsWith("127.") && !epIp.startsWith("192.168.")) {
            const geo = await Promise.resolve().then(() => (init_geolocation(), geolocation_exports)).then((m) => m.FluxGeolocationAPI.getRegionFromIP(epIp));
            if (geo.region !== null && typeof geo.region === "object") {
              const r = geo.region;
              FluxLogger.info("GamesAPI", `Region [${sid}]: ${r.city ?? r.country} (${r.countryCode}) via ${epIp}`);
              return { sid, result: r };
            }
          }
        }
        FluxLogger.warn("GamesAPI", `Region [${sid}]: no valid public IP found in endpoints`);
        return { sid, result: null };
      } catch (e) {
        FluxLogger.warn("GamesAPI", `Region [${sid}]: lookup exception \u2014 ${String(e)}`);
        return { sid, result: null };
      }
    }
    __name(fetchSingleRegion, "fetchSingleRegion");
    async function fetchServerRegions(gameId, serverIds) {
      if (serverIds.length === 0) return /* @__PURE__ */ new Map();
      const results = /* @__PURE__ */ new Map();
      let success = 0;
      let failed = 0;
      const CHUNK_SIZE = 10;
      FluxLogger.info("GamesAPI", `Region scan: ${String(serverIds.length)} servers in chunks of ${String(CHUNK_SIZE)}`);
      FluxLogger.timeStart("region-scan");
      const chunks = [];
      for (let i = 0; i < serverIds.length; i += CHUNK_SIZE) {
        chunks.push(serverIds.slice(i, i + CHUNK_SIZE));
      }
      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        if (chunk === void 0) continue;
        if (ci > 0) await new Promise((r) => setTimeout(r, 100));
        const settled = await Promise.allSettled(chunk.map((sid) => fetchSingleRegion(gameId, sid)));
        const retryIds = [];
        for (const s of settled) {
          if (s.status === "fulfilled") {
            const val = s.value;
            if (val.result !== null) {
              results.set(val.sid, val.result);
              success++;
            } else {
              retryIds.push(val.sid);
            }
          } else {
            failed++;
          }
        }
        if (retryIds.length > 0) {
          FluxLogger.debug("GamesAPI", `Retrying ${String(retryIds.length)} failed region lookups`);
          await new Promise((r) => setTimeout(r, 500));
          const retrySettled = await Promise.allSettled(retryIds.map((sid) => fetchSingleRegion(gameId, sid)));
          for (const s of retrySettled) {
            if (s.status === "fulfilled") {
              const val = s.value;
              if (val.result !== null) {
                results.set(val.sid, val.result);
                success++;
              } else {
                failed++;
              }
            } else {
              failed++;
            }
          }
        }
        FluxLogger.debug("GamesAPI", `Chunk ${String(ci + 1)}/${String(chunks.length)}: ${String(success)} found, ${String(failed)} failed so far`);
      }
      const elapsed = FluxLogger.timeEnd("region-scan", "GamesAPI");
      FluxLogger.info("GamesAPI", `Region scan complete: ${String(success)}/${String(serverIds.length)} resolved, ${String(failed)} failed (${String(elapsed)}ms)`);
      return results;
    }
    __name(fetchServerRegions, "fetchServerRegions");
    return { getCurrentGameId, fetchAllPublicServers, fetchPublicServersPage, fetchServerRegions };
  })();

  // src/ui/notifications.ts
  var FluxNotifications = /* @__PURE__ */ (() => {
    let container = null;
    let styleInjected = false;
    function ensureContainer() {
      if (!container?.isConnected) {
        container = document.getElementById("fluxfind-toasts");
        if (container === null) {
          container = document.createElement("div");
          container.id = "fluxfind-toasts";
          document.body.appendChild(container);
        }
      }
      return container;
    }
    __name(ensureContainer, "ensureContainer");
    function injectStyles() {
      if (styleInjected) return;
      styleInjected = true;
    }
    __name(injectStyles, "injectStyles");
    function show(message, type = "info", duration = 3e3) {
      injectStyles();
      const c = ensureContainer();
      const iconColors = {
        success: "#4CAF50",
        error: "#F44336",
        warning: "#FF9800",
        info: "#2196F3"
      };
      const iconNames = {
        success: "checkCircle",
        error: "xCircle",
        warning: "alertTriangle",
        info: "info"
      };
      const toast = document.createElement("div");
      toast.className = "ff-toast";
      toast.innerHTML = '<div class="ff-toast-content"><span class="ff-toast-icon">' + FluxIcons.get(iconNames[type], { size: 18, color: iconColors[type] }) + '</span><span class="ff-toast-message">' + message + '</span></div><button class="ff-toast-close">\xD7</button>';
      const closeBtn = toast.querySelector(".ff-toast-close");
      if (closeBtn !== null) {
        closeBtn.addEventListener("click", () => {
          removeToast(toast);
        });
      }
      c.appendChild(toast);
      if (duration > 0) {
        setTimeout(() => {
          removeToast(toast);
        }, duration);
      }
    }
    __name(show, "show");
    function removeToast(toast) {
      if (!toast.isConnected) return;
      toast.classList.add("removing");
      setTimeout(() => {
        if (toast.isConnected) toast.remove();
      }, 300);
    }
    __name(removeToast, "removeToast");
    return { show };
  })();

  // src/api/thumbnails.ts
  init_logger();
  init_utils();
  var FluxThumbnailsAPI = (() => {
    "use strict";
    const THUMBNAILS_API = "https://thumbnails.roblox.com/v1";
    async function fetchPlayerThumbnailsByTokens(playerTokens, _quick = false) {
      if (playerTokens.length === 0) return [];
      const tokens = playerTokens.slice(0, 100);
      const body = tokens.map((token) => ({
        requestId: `0:${token}:AvatarHeadshot:150x150:png:regular`,
        type: "AvatarHeadShot",
        targetId: 0,
        token,
        format: "png",
        size: "150x150"
      }));
      FluxLogger.debug("Thumbnails", `Batch request: ${String(tokens.length)} tokens`);
      const data = await gmPost(`${THUMBNAILS_API}/batch`, body);
      const rawData = data.data ?? [];
      const results = Array.isArray(rawData) ? rawData : Object.values(rawData);
      const typed = results;
      const successCount = typed.filter((r) => r.imageUrl != null).length;
      const failCount = typed.length - successCount;
      FluxLogger.info("Thumbnails", `Batch result: ${String(successCount)} thumbnails resolved, ${String(failCount)} failed (${String(typed.length)} total)`);
      if (failCount > 0) {
        FluxLogger.warn("Thumbnails", `${String(failCount)} thumbnails returned no imageUrl`);
      }
      return typed;
    }
    __name(fetchPlayerThumbnailsByTokens, "fetchPlayerThumbnailsByTokens");
    function gmPost(url, body) {
      return new Promise((resolve) => {
        if (typeof GM_xmlhttpRequest === "undefined") {
          FluxLogger.warn("Thumbnails", "GM_xmlhttpRequest not available, falling back to fetch");
          void fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            credentials: "include",
            body: JSON.stringify(body)
          }).then((r) => r.json()).then(resolve).catch(() => {
            FluxLogger.error("Thumbnails", "Fetch fallback failed");
            resolve({});
          });
          return;
        }
        function doRequest() {
          return new Promise((reqResolve, reqReject) => {
            GM_xmlhttpRequest({
              method: "POST",
              url,
              headers: { "Content-Type": "application/json", "Accept": "application/json" },
              data: JSON.stringify(body),
              anonymous: false,
              timeout: 15e3,
              onload: /* @__PURE__ */ __name(function(response) {
                if (response.status === 429) {
                  FluxLogger.debug("Thumbnails", "Rate limited (429), will retry with backoff...");
                  reqReject(new Error("RATE_LIMITED"));
                  return;
                }
                if (response.status >= 200 && response.status < 300) {
                  try {
                    reqResolve(JSON.parse(response.responseText));
                  } catch {
                    FluxLogger.warn("Thumbnails", "Failed to parse batch response");
                    reqResolve({});
                  }
                } else {
                  FluxLogger.warn("Thumbnails", `HTTP ${String(response.status)} from thumbnail API`);
                  reqResolve({});
                }
              }, "onload"),
              onerror: /* @__PURE__ */ __name(function() {
                FluxLogger.warn("Thumbnails", "Network error on thumbnail batch request");
                reqResolve({});
              }, "onerror"),
              ontimeout: /* @__PURE__ */ __name(function() {
                FluxLogger.warn("Thumbnails", "Timeout on thumbnail batch request");
                reqResolve({});
              }, "ontimeout")
            });
          });
        }
        __name(doRequest, "doRequest");
        FluxUtils.retry(doRequest, 3, 500).then(resolve).catch(() => {
          resolve({});
        });
      });
    }
    __name(gmPost, "gmPost");
    async function fetchGroupIconsBatch(groupIds) {
      if (groupIds.length === 0) return [];
      FluxLogger.debug("Thumbnails", `Fetching icons for ${String(groupIds.length)} groups`);
      try {
        const data = await gmGet(`${THUMBNAILS_API}/groups/icons?groupIds=${groupIds.join(",")}&size=150x150&format=Png&isCircular=false`);
        const result = data.data ?? [];
        FluxLogger.debug("Thumbnails", `Group icons resolved: ${String(result.length)}`);
        return result;
      } catch (e) {
        FluxLogger.warn("Thumbnails", `Group icon fetch failed: ${String(e)}`);
        return [];
      }
    }
    __name(fetchGroupIconsBatch, "fetchGroupIconsBatch");
    function gmGet(url) {
      return new Promise((resolve) => {
        if (typeof GM_xmlhttpRequest === "undefined") {
          void fetch(url, { credentials: "include" }).then((r) => r.json()).then(resolve).catch(() => {
            resolve({});
          });
          return;
        }
        GM_xmlhttpRequest({
          method: "GET",
          url,
          headers: { "Accept": "application/json" },
          anonymous: false,
          timeout: 1e4,
          onload: /* @__PURE__ */ __name(function(response) {
            if (response.status >= 200 && response.status < 300) {
              try {
                resolve(JSON.parse(response.responseText));
              } catch {
                resolve({});
              }
            } else {
              resolve({});
            }
          }, "onload"),
          onerror: /* @__PURE__ */ __name(function() {
            resolve({});
          }, "onerror"),
          ontimeout: /* @__PURE__ */ __name(function() {
            resolve({});
          }, "ontimeout")
        });
      });
    }
    __name(gmGet, "gmGet");
    async function fetchCatalogThumbnailsBatch(assetIds) {
      if (assetIds.length === 0) return [];
      FluxLogger.debug("Thumbnails", `Fetching catalog thumbnails for ${String(assetIds.length)} assets`);
      try {
        const data = await gmGet(`${THUMBNAILS_API}/assets?assetIds=${assetIds.join(",")}&size=150x150&format=png&isCircular=false`);
        const result = data.data ?? [];
        FluxLogger.debug("Thumbnails", `Catalog thumbnails resolved: ${String(result.length)}`);
        return result;
      } catch (e) {
        FluxLogger.warn("Thumbnails", `Catalog thumbnail fetch failed: ${String(e)}`);
        return [];
      }
    }
    __name(fetchCatalogThumbnailsBatch, "fetchCatalogThumbnailsBatch");
    return { fetchPlayerThumbnailsByTokens, fetchGroupIconsBatch, fetchCatalogThumbnailsBatch };
  })();

  // src/features/server-browser.ts
  var MAX_SLOTS = 6;
  var FluxFeatureServerBrowser = /* @__PURE__ */ (() => {
    let loaded = false;
    let serverObserver = null;
    let _rendering = false;
    let allServers = [];
    let displayedServers = [];
    let regionScanDone = false;
    let currentGameId = 0;
    let scanning = false;
    function getMaxServerCount() {
      return serverFetchCountAtom.get();
    }
    __name(getMaxServerCount, "getMaxServerCount");
    async function scanAndCacheRegions(force = false) {
      if (scanning) {
        FluxLogger.info("ServerBrowser", "Scan already in progress, skipping");
        return;
      }
      if (!force && regionScanDone) {
        FluxLogger.info("ServerBrowser", "Region scan: already completed, skipping");
        return;
      }
      scanning = true;
      regionScanDone = false;
      allServers = [];
      if (serverObserver) {
        serverObserver.disconnect();
        serverObserver = null;
      }
      const selectedCount = getMaxServerCount();
      const targetCountry = regionFilterAtom.get();
      const targetGroup = targetCountry ? FluxConstants.getCountryGroup(targetCountry) : null;
      const MIN_MATCHES = 10;
      const PER_PAGE = 100;
      const MAX_PAGES = Math.ceil(selectedCount / PER_PAGE);
      FluxLogger.info("ServerBrowser", `Region scan starting (target: ${targetCountry || "none"}, min matches: ${String(MIN_MATCHES)}, max pages: ${String(MAX_PAGES)}, max servers: ${String(selectedCount)})`);
      FluxNotifications.show(`Scanning servers for ${targetCountry || "all regions"}...`, "info", 4e3);
      let allFetchedServers = [];
      const regionMap = /* @__PURE__ */ new Map();
      let cursor = null;
      let totalPages = 0;
      try {
        try {
          FluxLogger.timeStart("server-fetch");
          for (let p = 0; p < MAX_PAGES; p++) {
            totalPages = p + 1;
            const page = await FluxGamesAPI.fetchPublicServersPage(currentGameId, "Desc", PER_PAGE, cursor);
            if (page.servers.length === 0) break;
            allFetchedServers = allFetchedServers.concat(page.servers);
            cursor = page.nextCursor;
            FluxLogger.info("ServerBrowser", `Page ${String(totalPages)}: ${String(page.servers.length)} servers (total: ${String(allFetchedServers.length)})`);
            const idsToScan = page.servers.map((s) => s.id);
            const pageRegions = await FluxGamesAPI.fetchServerRegions(currentGameId, idsToScan);
            pageRegions.forEach((region, sid) => {
              regionMap.set(sid, region);
            });
            if (targetCountry) {
              let exactMatches = 0;
              let groupMatches = 0;
              allFetchedServers.forEach((s) => {
                const r = regionMap.get(s.id);
                if (!r) return;
                if (r.countryCode === targetCountry) {
                  exactMatches++;
                  return;
                }
                if (targetGroup && FluxConstants.getCountryGroup(r.countryCode) === targetGroup) {
                  groupMatches++;
                }
              });
              FluxLogger.info("ServerBrowser", `Match count: ${String(exactMatches)} exact + ${String(groupMatches)} same-group / ${String(allFetchedServers.length)} total (need ${String(MIN_MATCHES)} exact)`);
              if (exactMatches >= MIN_MATCHES) {
                FluxLogger.info("ServerBrowser", `Enough exact matches found (${String(exactMatches)}), stopping pagination`);
                break;
              }
            } else {
              break;
            }
            if (!cursor) break;
          }
          FluxLogger.timeEnd("server-fetch", "ServerBrowser");
        } catch (e) {
          FluxLogger.error("ServerBrowser", `Server fetch failed: ${String(e)}`);
          FluxNotifications.show("Failed to fetch servers", "error", 3e3);
          observeServerList();
          return;
        }
        if (allFetchedServers.length === 0) {
          FluxLogger.warn("ServerBrowser", "0 servers returned from API");
          FluxNotifications.show("No public servers found", "warning", 3e3);
          observeServerList();
          return;
        }
        FluxLogger.info("ServerBrowser", `Scan complete: ${String(allFetchedServers.length)} servers across ${String(totalPages)} page(s), ${String(regionMap.size)} regions resolved`);
        const allTokens = [];
        const tokenSet = /* @__PURE__ */ new Set();
        allFetchedServers.forEach((s) => {
          s.playerTokens.forEach((t) => {
            if (!tokenSet.has(t)) {
              tokenSet.add(t);
              allTokens.push(t);
            }
          });
        });
        FluxLogger.info("ServerBrowser", `Unique player tokens to resolve: ${String(allTokens.length)}`);
        const thumbnailMap = /* @__PURE__ */ new Map();
        if (allTokens.length > 0) {
          const chunks = FluxUtils.chunk(allTokens, 100);
          FluxLogger.info("ServerBrowser", `Fetching thumbnails in ${String(chunks.length)} batch(es)`);
          FluxLogger.timeStart("thumbnail-fetch");
          for (let i = 0; i < chunks.length; i++) {
            try {
              const chunk = chunks[i];
              if (chunk === void 0) continue;
              const thumbs = await FluxThumbnailsAPI.fetchPlayerThumbnailsByTokens(chunk, false);
              let resolvedInChunk = 0;
              if (i === 0 && thumbs.length > 0) {
                const first = thumbs[0];
                if (first !== void 0) {
                  FluxLogger.info("ServerBrowser", `Raw API sample: requestId="${first.requestId}" token="${first.token}" imageUrl=${first.imageUrl ? "yes" : "none"}`);
                }
              }
              thumbs.forEach((t) => {
                if (t.imageUrl && t.requestId) {
                  const parts = t.requestId.split(":");
                  if (parts.length >= 2 && parts[1] !== void 0) {
                    thumbnailMap.set(parts[1], t.imageUrl);
                    resolvedInChunk++;
                  }
                }
              });
              FluxLogger.debug("ServerBrowser", `Thumbnail batch ${String(i + 1)}/${String(chunks.length)}: ${String(resolvedInChunk)} resolved out of ${String(chunk.length)} tokens`);
            } catch (e) {
              FluxLogger.warn("ServerBrowser", `Thumbnail batch ${String(i + 1)}/${String(chunks.length)} failed: ${String(e)}`);
            }
            if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 300));
          }
          FluxLogger.timeEnd("thumbnail-fetch", "ServerBrowser");
          FluxLogger.info("ServerBrowser", `Thumbnail map built: ${String(thumbnailMap.size)}/${String(allTokens.length)} player tokens resolved`);
          if (allFetchedServers.length > 0) {
            const firstServer = allFetchedServers[0];
            if (firstServer !== void 0) {
              const rawTokens = firstServer.playerTokens.slice(0, 6);
              const tokenReport = rawTokens.map((t) => `${t.slice(0, 12)}...\u2192${thumbnailMap.has(t) ? "\u2713" : "\u2717"}`);
              FluxLogger.info("ServerBrowser", `Token lookup sample (first server): [${tokenReport.join(", ")}]`);
            }
          }
          const sampleServers = allFetchedServers.slice(0, 5);
          const sampleReport = sampleServers.map((s) => {
            const total = s.playerTokens.length;
            const resolved = s.playerTokens.filter((t) => thumbnailMap.has(t)).length;
            return `${String(total)} tokens \u2192 ${String(resolved)} thumbs`;
          });
          FluxLogger.info("ServerBrowser", `Token resolution sample: [${sampleReport.join("] [")}]`);
        }
        allServers = allFetchedServers.slice(0, selectedCount).map((s) => ({
          id: s.id,
          playing: s.playing,
          maxPlayers: s.maxPlayers,
          playerTokens: s.playerTokens,
          thumbnails: s.playerTokens.slice(0, MAX_SLOTS).map((t) => thumbnailMap.get(t) ?? null).filter((x) => x !== null),
          region: regionMap.get(s.id) ?? null
        }));
        const withRegion = allServers.filter((s) => s.region !== null).length;
        const withoutRegion = allServers.length - withRegion;
        FluxLogger.info("ServerBrowser", `Servers ready: ${String(allServers.length)} total (${String(withRegion)} with region, ${String(withoutRegion)} without)`);
        regionScanDone = true;
        const savedRegion = regionFilterAtom.get();
        if (savedRegion) {
          FluxLogger.info("ServerBrowser", `Applying saved region filter: "${savedRegion}"`);
          applyRegionFilter(savedRegion);
        } else {
          FluxLogger.info("ServerBrowser", "No saved region filter, rendering all servers");
          renderServerCards(allServers);
        }
        observeServerList();
      } finally {
        scanning = false;
      }
    }
    __name(scanAndCacheRegions, "scanAndCacheRegions");
    function renderServerCards(servers) {
      displayedServers = servers;
      const container = document.querySelector("#rbx-public-game-server-item-container");
      if (!container) {
        FluxLogger.warn("ServerBrowser", "Server container not found in DOM");
        return;
      }
      _rendering = true;
      container.innerHTML = "";
      if (servers.length === 0) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--ff-text-muted)">No servers match this filter</div>';
        _rendering = false;
        return;
      }
      const fragment = document.createDocumentFragment();
      servers.forEach((s) => fragment.appendChild(createServerCard(s)));
      container.appendChild(fragment);
      _rendering = false;
      FluxLogger.debug("ServerBrowser", `Rendered ${String(servers.length)} server cards`);
    }
    __name(renderServerCards, "renderServerCards");
    function createServerCard(server) {
      const li = FluxDOM.el("li", { className: "rbx-public-game-server-item col-md-3 col-sm-4 col-xs-6" });
      const card = FluxDOM.el("div", { className: "card-item card-item-public-server" });
      const thumbsContainer = FluxDOM.el("div", { className: "player-thumbnails-container" });
      const isFull = server.playing >= server.maxPlayers;
      const totalTokens = server.playerTokens.length;
      if (server.thumbnails.length === 0) {
        const countDiv = FluxDOM.el("div", { style: "display:flex;align-items:center;justify-content:center;min-height:56px;padding:8px;flex-basis:100%" });
        const badge = FluxDOM.el("span", { className: "ff-badge", style: "font-size:13px;padding:6px 14px" });
        badge.innerHTML = `${FluxIcons.get("users", { size: 14, color: "#fff" })} ${String(server.playing)} / ${String(server.maxPlayers)}`;
        countDiv.appendChild(badge);
        thumbsContainer.appendChild(countDiv);
      } else {
        const thumbsToShow = server.thumbnails.slice(0, MAX_SLOTS);
        for (let i = 0; i < MAX_SLOTS; i++) {
          const avatar = FluxDOM.el("span", { className: "avatar avatar-headshot-md player-avatar" });
          const imgContainer = FluxDOM.el("span", { className: "thumbnail-2d-container avatar-card-image" });
          if (i < thumbsToShow.length) {
            const thumb = thumbsToShow[i];
            if (thumb !== void 0) {
              const img = FluxDOM.el("img", { src: thumb, alt: "", title: "" });
              img.addEventListener("error", function() {
                this.style.display = "none";
              });
              imgContainer.appendChild(img);
            }
          } else if (!isFull && i < totalTokens) {
            avatar.classList.add("avatar-ghost");
            imgContainer.innerHTML = FluxIcons.get("user", { size: 24, color: "currentColor" });
          } else if (!isFull) {
            avatar.classList.add("avatar-ghost");
            imgContainer.innerHTML = FluxIcons.get("userRoundPlus", { size: 24, color: "currentColor" });
          }
          avatar.appendChild(imgContainer);
          thumbsContainer.appendChild(avatar);
        }
      }
      if (totalTokens > MAX_SLOTS) {
        const children = thumbsContainer.children;
        if (children.length >= MAX_SLOTS) {
          const lastAvatar = children[MAX_SLOTS - 1];
          if (lastAvatar) {
            lastAvatar.style.position = "relative";
            const badge = FluxDOM.el("span", { className: "ff-overflow-badge" });
            badge.textContent = `+${String(totalTokens - MAX_SLOTS)}`;
            lastAvatar.appendChild(badge);
          }
        }
      }
      const details = FluxDOM.el("div", { className: "rbx-public-game-server-details game-server-details" });
      const gaugeContainer = FluxDOM.el("div", { className: "server-player-count-gauge border" });
      const gauge = FluxDOM.el("div", { className: "gauge-inner-bar border", style: `width:${String(Math.min(100, server.playing / server.maxPlayers * 100))}%` });
      gaugeContainer.appendChild(gauge);
      const joinSpan = FluxDOM.el("span");
      joinSpan.setAttribute("data-placeid", String(currentGameId));
      const joinBtn = FluxDOM.el("button", { className: "btn-full-width btn-control-xs rbx-public-game-server-join game-server-join-btn btn-primary-md btn-min-width ff-btn ff-btn-sm ff-btn-primary" });
      joinBtn.addEventListener("click", () => {
        FluxLogger.info("ServerBrowser", `Joining server ${server.id} via protocol handler`);
        FluxNotifications.show("Joining server...", "info", 2e3);
        window.location.href = `roblox://placeId=${String(currentGameId)}&gameInstanceId=${server.id}`;
      });
      joinBtn.textContent = "Join";
      joinSpan.appendChild(joinBtn);
      const footer = FluxDOM.el("div", { style: "display:flex;align-items:center;justify-content:space-between;margin-top:6px" });
      const sid = FluxDOM.el("div", { className: "server-id-text text-info xsmall" });
      const sp = server.id.split("-");
      sid.textContent = `ID: ${sp[1] ?? ""}-${sp[2] ?? ""}`;
      footer.appendChild(sid);
      if (server.region) {
        const label = server.region.city ?? server.region.country;
        const rb = FluxDOM.el("span", { className: "ff-tag ff-tag-purple", style: "margin-left:4px" });
        rb.textContent = label;
        rb.title = (server.region.city ? `${server.region.city}, ` : "") + server.region.country;
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
    __name(createServerCard, "createServerCard");
    function applyRegionFilter(countryCode) {
      regionFilterAtom.set(countryCode);
      if (!countryCode) {
        FluxLogger.info("ServerBrowser", "Region filter cleared \u2014 showing all servers unsorted");
        renderServerCards(allServers);
        return;
      }
      const targetGroup = FluxConstants.getCountryGroup(countryCode);
      FluxLogger.info("ServerBrowser", `Sorting servers by region: target="${countryCode}"${targetGroup ? ` group="${targetGroup}"` : ""}`);
      const scored = allServers.map((s) => {
        const aCC = s.region?.countryCode ?? null;
        let priority;
        if (aCC === countryCode) {
          priority = 0;
        } else if (targetGroup && aCC && FluxConstants.getCountryGroup(aCC) === targetGroup) {
          priority = 1;
        } else if (aCC) {
          priority = 2;
        } else {
          priority = 3;
        }
        return { server: s, priority };
      });
      scored.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const aCC = a.server.region?.countryCode ?? "\uFFFF";
        const bCC = b.server.region?.countryCode ?? "\uFFFF";
        if (aCC !== bCC) return aCC.localeCompare(bCC);
        return b.server.playing - a.server.playing;
      });
      const sorted = scored.map((s) => s.server);
      const exact = sorted.filter((s) => s.region?.countryCode === countryCode).length;
      const sameGroup = targetGroup ? sorted.filter((s) => s.region?.countryCode !== countryCode && s.region?.countryCode && FluxConstants.getCountryGroup(s.region.countryCode) === targetGroup).length : 0;
      const other = sorted.filter((s) => {
        if (!s.region?.countryCode) return false;
        if (s.region.countryCode === countryCode) return false;
        if (targetGroup && FluxConstants.getCountryGroup(s.region.countryCode) === targetGroup) return false;
        return true;
      }).length;
      const unknown = sorted.filter((s) => s.region === null).length;
      FluxLogger.info("ServerBrowser", `Region sort result \u2014 exact: ${String(exact)}, same-group: ${String(sameGroup)}, other: ${String(other)}, unknown: ${String(unknown)}`);
      if (exact > 0) {
        const first = sorted[0];
        const firstName = first?.region?.city ?? first?.region?.country ?? "Unknown";
        FluxLogger.info("ServerBrowser", `First result: "${firstName}" (${first?.region?.countryCode ?? "?"}) \u2014 ${exact > 0 ? "exact match present" : "no exact match"}`);
      }
      renderServerCards(sorted);
      FluxNotifications.show(`${countryCode}: ${String(exact)} exact, ${String(sameGroup + other + unknown)} nearby`, "info", 2500);
    }
    __name(applyRegionFilter, "applyRegionFilter");
    function injectFilterButtons() {
      const container = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
      if (!container?.parentNode) return;
      const old = document.querySelector(".ff-server-controls");
      if (old) old.remove();
      const bar = FluxDOM.el("div", { className: "ff-server-controls" });
      const rBtn = FluxDOM.el("button", { className: "ff-btn ff-btn-sm", onclick: /* @__PURE__ */ __name(() => {
        refreshServers();
      }, "onclick") });
      rBtn.innerHTML = `${FluxIcons.get("refresh", { size: 14 })} Refresh`;
      const fBtn = FluxDOM.el("button", { className: "ff-btn ff-btn-sm", onclick: /* @__PURE__ */ __name(() => {
        openFilterPanel();
      }, "onclick") });
      fBtn.innerHTML = `${FluxIcons.get("filter", { size: 14 })} Filters`;
      const qBtn = FluxDOM.el("button", { className: "ff-btn ff-btn-sm ff-btn-primary", onclick: /* @__PURE__ */ __name(() => {
        quickJoinRandom();
      }, "onclick") });
      qBtn.innerHTML = `${FluxIcons.get("zap", { size: 14 })} Quick Join`;
      FluxUtils.batchAppend(bar, [rBtn, fBtn, qBtn]);
      container.parentNode.insertBefore(bar, container);
      FluxLogger.debug("ServerBrowser", "Filter buttons injected");
    }
    __name(injectFilterButtons, "injectFilterButtons");
    function refreshServers() {
      FluxLogger.info("ServerBrowser", "Manual refresh triggered");
      allServers = [];
      regionScanDone = false;
      void scanAndCacheRegions(true);
    }
    __name(refreshServers, "refreshServers");
    function openFilterPanel() {
      FluxModals.custom((modal, close) => {
        const currentCc = regionFilterAtom.get();
        const currentCount = getMaxServerCount();
        const countOptions = [30, 50, 100, 200, 300, 500, 1e3];
        let groupsHTML = "";
        FluxConstants.REGION_CHIPS.forEach((group) => {
          let groupChips = "";
          group.chips.forEach((chip) => {
            const active = chip.cc === currentCc ? " ff-active" : "";
            groupChips += `<div class="ff-region-chip${active}" data-cc="${chip.cc}">${chip.label}</div>`;
          });
          groupsHTML += `<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;color:#888;margin-bottom:4px;text-transform:uppercase">${group.group}</div><div style="display:flex;flex-wrap:wrap;gap:4px">${groupChips}</div></div>`;
        });
        let countHTML = '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;color:#888;margin-bottom:4px;text-transform:uppercase">Max Servers</div><div style="display:flex;flex-wrap:wrap;gap:4px">';
        countOptions.forEach((n) => {
          const active = n === currentCount ? " ff-active" : "";
          countHTML += `<div class="ff-region-chip${active}" data-count="${String(n)}">${String(n)}</div>`;
        });
        countHTML += "</div></div>";
        modal.innerHTML = `<div style="padding:24px"><h3 style="margin:0 0 12px;font-size:16px">${FluxIcons.get("filter", { size: 16 })} Filters</h3><div style="max-height:400px;overflow-y:auto;margin-top:8px"><div style="margin-bottom:10px"><div style="display:flex;flex-wrap:wrap;gap:4px"><div class="ff-region-chip` + (currentCc === "" ? " ff-active" : "") + '" data-cc="">All Regions</div></div></div>' + countHTML + `${groupsHTML}</div><button class="ff-btn ff-btn-primary" id="ff-apply" style="margin-top:12px;width:100%">Apply</button></div>`;
        let selectedCc = currentCc;
        let selectedCount = currentCount;
        modal.querySelectorAll(".ff-region-chip").forEach((chip) => {
          chip.addEventListener("click", function() {
            const cc = this.dataset.cc;
            const count = this.dataset.count;
            if (cc !== void 0) {
              modal.querySelectorAll(".ff-region-chip[data-cc]").forEach((c) => {
                c.classList.remove("ff-active");
              });
              this.classList.add("ff-active");
              selectedCc = cc;
            } else if (count !== void 0) {
              modal.querySelectorAll(".ff-region-chip[data-count]").forEach((c) => {
                c.classList.remove("ff-active");
              });
              this.classList.add("ff-active");
              selectedCount = parseInt(count, 10);
            }
          });
        });
        const applyBtn = modal.querySelector("#ff-apply");
        if (applyBtn) applyBtn.addEventListener("click", () => {
          FluxLogger.info("ServerBrowser", `Filter applied: region="${selectedCc}", maxServers=${String(selectedCount)}`);
          const countChanged = selectedCount !== currentCount;
          if (countChanged) {
            serverFetchCountAtom.set(selectedCount);
          }
          regionFilterAtom.set(selectedCc);
          close();
          refreshServers();
        });
      });
    }
    __name(openFilterPanel, "openFilterPanel");
    function quickJoinRandom() {
      if (allServers.length === 0) {
        FluxNotifications.show("No servers loaded", "warning");
        FluxLogger.warn("ServerBrowser", "Quick join failed: no servers loaded");
        return;
      }
      const visible = allServers.filter((s) => s.playing < s.maxPlayers);
      if (visible.length === 0) {
        FluxNotifications.show("No available servers", "warning");
        FluxLogger.warn("ServerBrowser", "Quick join failed: all servers full");
        return;
      }
      const pick = visible[Math.floor(Math.random() * visible.length)];
      if (!pick) return;
      FluxLogger.info("ServerBrowser", `Quick join: server ${pick.id} (${String(pick.playing)}/${String(pick.maxPlayers)} players)`);
      FluxNotifications.show("Joining random server...", "info", 2e3);
      window.location.href = `roblox://placeId=${String(currentGameId)}&gameInstanceId=${pick.id}`;
    }
    __name(quickJoinRandom, "quickJoinRandom");
    function observeServerList() {
      const c = document.querySelector(FluxConstants.SELECTORS.SERVER_LIST);
      if (!c || serverObserver) return;
      serverObserver = new MutationObserver(FluxUtils.debounce(() => {
        if (_rendering || !regionScanDone) return;
        if (serverObserver) {
          serverObserver.disconnect();
          serverObserver = null;
        }
        renderServerCards(displayedServers);
        observeServerList();
      }, 400));
      serverObserver.observe(c, { childList: true, subtree: false });
      FluxLogger.debug("ServerBrowser", "MutationObserver attached to server list");
    }
    __name(observeServerList, "observeServerList");
    async function init() {
      if (loaded) return;
      if (!serverFiltersAtom.get()) {
        FluxLogger.info("ServerBrowser", "Init skipped: feature disabled in settings");
        return;
      }
      currentGameId = FluxGamesAPI.getCurrentGameId();
      if (!currentGameId) {
        FluxLogger.warn("ServerBrowser", "Init skipped: no game ID detected in URL");
        return;
      }
      FluxLogger.info("ServerBrowser", `Initializing for game ${String(currentGameId)}`);
      const container = await FluxUtils.watchForChild('#game-instances, .tab-content, [class*="game-instances"]', "#rbx-public-game-server-item-container", 3e4).catch(() => null);
      if (!container) {
        FluxLogger.warn("ServerBrowser", "Init failed: server container not found after 30s");
        return;
      }
      loaded = true;
      FluxLogger.info("ServerBrowser", "Server container found, injecting UI");
      injectFilterButtons();
      observeServerList();
      if (autoRegionScanAtom.get()) {
        FluxLogger.info("ServerBrowser", "Auto region scan enabled, starting scan");
        void scanAndCacheRegions();
      } else {
        FluxLogger.info("ServerBrowser", "Auto region scan disabled, waiting for manual refresh");
      }
    }
    __name(init, "init");
    function destroy() {
      FluxLogger.info("ServerBrowser", "Destroying");
      loaded = false;
      regionScanDone = false;
      allServers = [];
      if (serverObserver) {
        serverObserver.disconnect();
        serverObserver = null;
      }
      const ctrl = document.querySelector(".ff-server-controls");
      if (ctrl) ctrl.remove();
    }
    __name(destroy, "destroy");
    return { init, destroy };
  })();

  // src/features/smart-search.ts
  init_logger();
  var FluxFeatureSmartSearch = /* @__PURE__ */ (() => {
    let overlay = null;
    let dropdown = null;
    let active = false;
    let activeTab = "games";
    let searchTimer = null;
    let hideDropdownInterval = null;
    let abortController = null;
    function uuid() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    }
    __name(uuid, "uuid");
    function getSearchInput() {
      return document.querySelector('#navbar-search-input, .navbar-search-input, input[placeholder*="Search"]');
    }
    __name(getSearchInput, "getSearchInput");
    function hideRobloxDropdown() {
      const robloxDropdown = document.querySelector(".dropdown-menu.new-dropdown-menu");
      if (robloxDropdown instanceof HTMLElement) {
        robloxDropdown.style.display = "none";
      }
    }
    __name(hideRobloxDropdown, "hideRobloxDropdown");
    async function fetchGames(query) {
      const sessionId = uuid();
      try {
        const resp = await fetch(`https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(query)}&pageToken=&sessionId=${sessionId}&pageType=all`, {
          credentials: "include"
        });
        if (!resp.ok) return [];
        const data = await resp.json();
        const gameGroup = (data.searchResults ?? []).find((g) => g.contentGroupType === "Game");
        if (!gameGroup?.contents) return [];
        const games = gameGroup.contents.slice(0, 10);
        FluxLogger.debug("SmartSearch", `Fetched ${String(games.length)} games for "${query}"`);
        const iconBody = games.map((g) => ({
          requestId: `${String(g.universeId)}::GameIcon:256x256:webp:regular:::false`,
          type: "GameIcon",
          targetId: g.universeId,
          token: "",
          format: "webp",
          size: "256x256",
          version: ""
        }));
        const iconResp = await fetch("https://thumbnails.roblox.com/v1/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          credentials: "include",
          body: JSON.stringify(iconBody)
        });
        const iconData = await iconResp.json();
        const iconMap = /* @__PURE__ */ new Map();
        (iconData.data ?? []).forEach((r) => {
          iconMap.set(r.targetId, r.imageUrl);
        });
        return games.map((g) => ({ ...g, imageUrl: iconMap.get(g.universeId) }));
      } catch {
        return [];
      }
    }
    __name(fetchGames, "fetchGames");
    async function fetchUsers(query) {
      const sessionId = uuid();
      try {
        const resp = await fetch(`https://apis.roblox.com/search-api/omni-search?verticalType=user&searchQuery=${encodeURIComponent(query)}&pageToken=&globalSessionId=${sessionId}&sessionId=${sessionId}`, {
          credentials: "include"
        });
        if (!resp.ok) return [];
        const data = await resp.json();
        const userGroup = (data.searchResults ?? []).find((g) => g.contentGroupType === "User");
        if (!userGroup?.contents) return [];
        const users = userGroup.contents.slice(0, 10);
        FluxLogger.debug("SmartSearch", `Fetched ${String(users.length)} users for "${query}"`);
        const avatarBody = users.map((u) => ({
          requestId: `${String(u.contentId)}:undefined:AvatarHeadshot:150x150:webp:regular:0::false`,
          type: "AvatarHeadShot",
          targetId: u.contentId,
          format: "webp",
          size: "150x150"
        }));
        const avatarResp = await fetch("https://thumbnails.roblox.com/v1/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          credentials: "include",
          body: JSON.stringify(avatarBody)
        });
        const avatarData = await avatarResp.json();
        const avatarMap = /* @__PURE__ */ new Map();
        (avatarData.data ?? []).forEach((r) => {
          avatarMap.set(r.targetId, r.imageUrl);
        });
        return users.map((u) => ({ userId: u.contentId, username: u.username, displayName: u.displayName, imageUrl: avatarMap.get(u.contentId) }));
      } catch {
        return [];
      }
    }
    __name(fetchUsers, "fetchUsers");
    function formatCount(n) {
      if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
      if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
      return String(n);
    }
    __name(formatCount, "formatCount");
    function renderTabsHTML() {
      return `<div class="ff-search-tabs">
      <span class="ff-search-tab ${activeTab === "games" ? "ff-active" : ""}" data-tab="games">${FluxIcons.get("gamepad", { size: 14 })} Games</span>
      <span class="ff-search-tab ${activeTab === "games" ? "" : "ff-active"}" data-tab="people">${FluxIcons.get("user", { size: 14 })} People</span>
    </div>`;
    }
    __name(renderTabsHTML, "renderTabsHTML");
    function renderGameRows(games) {
      return games.map((g) => `<a href="/games/${String(g.rootPlaceId)}/" class="ff-search-result">
      <img class="ff-search-thumb" src="${FluxSanitizer.sanitizeUrl(g.imageUrl ?? "")}" alt="" loading="lazy" onerror="this.style.display='none'" />
      <div class="ff-search-info">
        <span class="ff-search-name">${FluxSanitizer.escapeHtml(g.name)}</span>
        <span class="ff-search-meta">
          <span class="ff-player-badge">${FluxIcons.get("user", { size: 12 })} ${formatCount(g.playerCount)} playing</span>
        </span>
      </div>
    </a>`).join("");
    }
    __name(renderGameRows, "renderGameRows");
    function renderUserRows(users) {
      return users.map((u) => `<a href="/users/${String(u.userId)}/profile" class="ff-search-result">
      <img class="ff-search-thumb ff-search-avatar" src="${FluxSanitizer.sanitizeUrl(u.imageUrl ?? "")}" alt="" loading="lazy" onerror="this.style.display='none'" />
      <div class="ff-search-info">
        <span class="ff-search-name">${FluxSanitizer.escapeHtml(u.displayName)}</span>
        <span class="ff-search-meta">@${FluxSanitizer.escapeHtml(u.username)}</span>
      </div>
    </a>`).join("");
    }
    __name(renderUserRows, "renderUserRows");
    function wireTabClicks() {
      if (!dropdown) return;
      dropdown.querySelectorAll(".ff-search-tab").forEach((tabEl) => {
        tabEl.addEventListener("click", function() {
          const newTab = this.dataset.tab;
          if (!newTab || newTab === activeTab) return;
          activeTab = newTab;
          const input = getSearchInput();
          if (input) void showResults(input.value.trim(), activeTab);
        });
      });
    }
    __name(wireTabClicks, "wireTabClicks");
    async function showResults(query, tab) {
      if (!overlay || !dropdown) return;
      if (tab === "games") {
        FluxSanitizer.safeInnerHTML(dropdown, `${renderTabsHTML()}<div class="ff-search-loading"><div class="ff-spinner"></div></div>`);
        overlay.style.display = "flex";
        const games = await fetchGames(query);
        if (games.length === 0) {
          FluxSanitizer.safeInnerHTML(dropdown, `${renderTabsHTML()}<div class="ff-search-header">No games found for "<strong>${FluxSanitizer.escapeHtml(query)}</strong>"</div>`);
          wireTabClicks();
          return;
        }
        FluxSanitizer.safeInnerHTML(dropdown, `${renderTabsHTML()}<div class="ff-search-header">${String(games.length)} games found</div><div class="ff-search-items">${renderGameRows(games)}</div>`);
        wireTabClicks();
      } else {
        FluxSanitizer.safeInnerHTML(dropdown, `${renderTabsHTML()}<div class="ff-search-loading"><div class="ff-spinner"></div></div>`);
        overlay.style.display = "flex";
        const users = await fetchUsers(query);
        if (users.length === 0) {
          FluxSanitizer.safeInnerHTML(dropdown, `${renderTabsHTML()}<div class="ff-search-header">No people found for "<strong>${FluxSanitizer.escapeHtml(query)}</strong>"</div>`);
          wireTabClicks();
          return;
        }
        FluxSanitizer.safeInnerHTML(dropdown, `${renderTabsHTML()}<div class="ff-search-header">${String(users.length)} people found</div><div class="ff-search-items">${renderUserRows(users)}</div>`);
        wireTabClicks();
      }
    }
    __name(showResults, "showResults");
    function hideOverlay() {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      if (overlay) overlay.style.display = "none";
    }
    __name(hideOverlay, "hideOverlay");
    function createUI() {
      overlay = document.createElement("div");
      overlay.className = "ff-search-overlay";
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) hideOverlay();
      });
      dropdown = document.createElement("div");
      dropdown.className = "ff-search-dropdown";
      overlay.appendChild(dropdown);
      document.body.appendChild(overlay);
    }
    __name(createUI, "createUI");
    function start() {
      if (active) return;
      if (!smartSearchAtom.get()) {
        FluxLogger.info("SmartSearch", "Disabled in settings, skipping");
        return;
      }
      FluxLogger.info("SmartSearch", "Starting smart search");
      createUI();
      active = true;
      const input = getSearchInput();
      if (!input) {
        FluxLogger.warn("SmartSearch", "Search input not found");
        return;
      }
      input.addEventListener("input", () => {
        hideRobloxDropdown();
        const query = input.value.trim();
        if (searchTimer) clearTimeout(searchTimer);
        if (query.length === 0) {
          hideOverlay();
          return;
        }
        searchTimer = setTimeout(() => void showResults(query, activeTab), 300);
      });
      input.addEventListener("focus", () => {
        hideRobloxDropdown();
        const query = input.value.trim();
        if (query.length > 0) void showResults(query, activeTab);
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hideOverlay();
      });
      hideDropdownInterval = setInterval(hideRobloxDropdown, 200);
    }
    __name(start, "start");
    function stop() {
      if (!active) return;
      active = false;
      if (hideDropdownInterval !== null) {
        clearInterval(hideDropdownInterval);
        hideDropdownInterval = null;
      }
      if (overlay) {
        overlay.remove();
        overlay = null;
        dropdown = null;
      }
    }
    __name(stop, "stop");
    return { start, stop };
  })();

  // src/app.ts
  var FluxApp = /* @__PURE__ */ (() => {
    let initialized = false;
    function init() {
      if (initialized) return;
      initialized = true;
      FluxLogger.init();
      FluxLogger.info("App", "FluxFind v" + FluxConstants.VERSION + " initializing...");
      FluxStorage.migrateLegacy();
      FluxStorage.initDefaults(FluxConstants.DEFAULT_SETTINGS);
      injectCoreStyles();
      injectSettingsButton();
      FluxRouter.start((newPage) => {
        FluxLogger.info("App", `Page navigation: ${newPage}`);
        if (newPage === "servers" || newPage === "game") {
          FluxFeatureServerBrowser.init().catch((e) => {
            FluxLogger.warn("App", `ServerBrowser init failed: ${String(e)}`);
          });
        }
      });
      darkModeAtom.subscribe((v) => {
        if (v) {
          document.documentElement.classList.add("ff-dark-mode");
          document.body.style.setProperty("background-color", "var(--ff-bg-primary)", "important");
        } else {
          document.documentElement.classList.remove("ff-dark-mode");
          document.body.style.removeProperty("background-color");
        }
      });
      chatDisabledAtom.subscribe((v) => {
        if (v) {
          if (!document.getElementById("ff-disable-chat")) {
            const style = document.createElement("style");
            style.id = "ff-disable-chat";
            style.textContent = '#chat-container, .chat-main, [class*="chat-container"], [data-testid*="chat"] { display: none !important; }';
            document.head.appendChild(style);
          }
        } else {
          document.getElementById("ff-disable-chat")?.remove();
        }
      });
      removeAdsAtom.subscribe((v) => {
        if (v) FluxFeatureAdRemover.start();
        else FluxFeatureAdRemover.stop();
      });
      smartSearchAtom.subscribe((v) => {
        if (v) FluxFeatureSmartSearch.start();
        else FluxFeatureSmartSearch.stop();
      });
      debugLogsAtom.subscribe((_v) => {
        FluxLogger.init();
      });
      applyInitialSettings();
      scheduleServerBrowser();
      FluxLogger.info("App", "FluxFind initialized successfully");
    }
    __name(init, "init");
    function applyInitialSettings() {
      if (darkModeAtom.get()) {
        document.documentElement.classList.add("ff-dark-mode");
        document.body.style.setProperty("background-color", "var(--ff-bg-primary)", "important");
      }
      if (chatDisabledAtom.get()) {
        const style = document.createElement("style");
        style.id = "ff-disable-chat";
        style.textContent = '#chat-container, .chat-main, [class*="chat-container"], [data-testid*="chat"] { display: none !important; }';
        document.head.appendChild(style);
      }
      if (removeAdsAtom.get()) FluxFeatureAdRemover.start();
      if (smartSearchAtom.get()) FluxFeatureSmartSearch.start();
    }
    __name(applyInitialSettings, "applyInitialSettings");
    function injectCoreStyles() {
      const css = `/* FLUXFIND_CSS_PLACEHOLDER */`;
      GM_addStyle(css);
    }
    __name(injectCoreStyles, "injectCoreStyles");
    function injectSettingsButton() {
      if (document.getElementById("fluxfind-settings-btn") !== null) return;
      const btn = FluxDOM.el("button", {
        id: "fluxfind-settings-btn",
        onclick: /* @__PURE__ */ __name(() => {
          FluxSettingsPanel.open();
        }, "onclick"),
        title: "FluxFind Settings"
      });
      btn.innerHTML = FluxIcons.get("settings", { size: 20, color: "#fff" });
      document.body.appendChild(btn);
    }
    __name(injectSettingsButton, "injectSettingsButton");
    function scheduleServerBrowser() {
      let attempts = 0;
      const maxAttempts = 30;
      const retry = /* @__PURE__ */ __name(() => {
        attempts++;
        if (!FluxStorage.getBool("togglefilterserversbutton", true)) return;
        FluxFeatureServerBrowser.init().catch(() => {
        });
        if (attempts < maxAttempts) setTimeout(retry, 1e3);
      }, "retry");
      retry();
    }
    __name(scheduleServerBrowser, "scheduleServerBrowser");
    return { init };
  })();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", FluxApp.init);
  } else {
    FluxApp.init();
  }
})();
