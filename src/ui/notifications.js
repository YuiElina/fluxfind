/**
 * FluxFind Notifications Module
 * Toast notification system with lucide SVG icons, no emojis
 *
 * @module ui/notifications
 * @license GPL-2.0-only
 */

const FluxNotifications = (() => {
    'use strict';

    let container = null;
    let styleInjected = false;

    const ICON_MAP = {
        success: FluxIcons.get('checkCircle', { size: 18, color: '#4CAF50' }),
        error:   FluxIcons.get('xCircle', { size: 18, color: '#F44336' }),
        warning: FluxIcons.get('alertTriangle', { size: 18, color: '#FF9800' }),
        info:    FluxIcons.get('info', { size: 18, color: '#2196F3' })
    };

    const VALID_TYPES = ['success', 'error', 'warning', 'info'];

    function _injectStyles() {
        if (styleInjected) return;
        FluxDOM.injectStyleOnce('fluxfind-toast-styles', `
            @keyframes ff-slideIn  { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
            @keyframes ff-slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
            @keyframes ff-shrink  { from { width: 100%; } to { width: 0%; } }

            #fluxfind-toasts {
                position: fixed; top: 20px; right: 20px; z-index: 999999999999999;
                display: flex; flex-direction: column; gap: 8px; pointer-events: none;
            }
            .ff-toast {
                background: #2d2d2d; color: #e8e8e8; padding: 12px 16px; border-radius: 8px;
                font: 500 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                min-width: 280px; max-width: 420px; border: 1px solid rgba(255,255,255,0.15);
                box-shadow: 0 6px 20px rgba(0,0,0,0.35); animation: ff-slideIn 0.3s ease-out forwards;
                pointer-events: auto; position: relative; overflow: hidden;
                will-change: transform, opacity;
            }
            .ff-toast.removing { animation: ff-slideOut 0.3s ease-in forwards; }
            .ff-toast:hover { background: #373737; }
            .ff-toast-content { display: flex; align-items: center; gap: 10px; }
            .ff-toast-icon { flex-shrink: 0; width: 18px; height: 18px; display: flex; align-items: center; }
            .ff-toast-icon svg { display: block; }
            .ff-toast-message { flex: 1; line-height: 1.4; white-space: pre-wrap; }
            .ff-toast-close {
                position: absolute; top: 6px; right: 8px; width: 22px; height: 22px;
                cursor: pointer; opacity: 0.5; display: flex; align-items: center;
                justify-content: center; border-radius: 4px; transition: opacity 0.15s;
                background: none; border: none; padding: 0;
            }
            .ff-toast-close:hover { opacity: 1; background: rgba(255,255,255,0.1); }
            .ff-toast-close::before, .ff-toast-close::after {
                content: ''; position: absolute; width: 12px; height: 1.5px; background: #ccc;
                border-radius: 1px;
            }
            .ff-toast-close::before { transform: rotate(45deg); }
            .ff-toast-close::after  { transform: rotate(-45deg); }
            .ff-toast-progress {
                position: absolute; bottom: 0; left: 0; height: 2px;
                background: rgba(255,255,255,0.2); animation: ff-shrink linear forwards;
            }
            .ff-toast.success  { border-left: 3px solid #4CAF50; }
            .ff-toast.error    { border-left: 3px solid #F44336; }
            .ff-toast.warning  { border-left: 3px solid #FF9800; }
            .ff-toast.info     { border-left: 3px solid #2196F3; }
        `);
        styleInjected = true;
    }

    function _getContainer() {
        if (!container || !container.isConnected) {
            container = document.getElementById('fluxfind-toasts');
            if (!container) {
                container = FluxDOM.el('div', { id: 'fluxfind-toasts' });
                document.body.appendChild(container);
            }
        }
        return container;
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'info' | 'success' | 'warning' | 'error'
     * @param {number} duration - Duration in ms
     * @returns {Object} Controller with remove(), update(), setType(), setDuration()
     */
    function show(message, type = 'info', duration = 3000) {
        if (FluxStorage.getBool('enablenotifications', true) === false) return { remove: FluxUtils.noop };

        _injectStyles();
        const safeType = VALID_TYPES.includes(type) ? type : 'info';
        const safeMessage = FluxSanitizer.escapeHtml(message);

        const toast = FluxDOM.el('div', { className: `ff-toast ${safeType}` });
        const iconSvg = ICON_MAP[safeType] || ICON_MAP.info;

        toast.innerHTML = `
            <div class="ff-toast-content">
                <div class="ff-toast-icon">${iconSvg}</div>
                <span class="ff-toast-message">${safeMessage.replace(/\n/g, '<br>')}</span>
            </div>
            <button class="ff-toast-close" aria-label="Close notification"></button>
            <div class="ff-toast-progress" style="animation-duration: ${Math.max(0, parseInt(duration))}ms;"></div>
        `;

        _getContainer().appendChild(toast);

        let timeout = setTimeout(_remove, duration);

        function _remove() {
            clearTimeout(timeout);
            toast.classList.add('removing');
            setTimeout(() => { if (toast.isConnected) toast.remove(); }, 300);
        }

        const closeBtn = FluxUtils.qs('.ff-toast-close', toast);
        const progressBar = FluxUtils.qs('.ff-toast-progress', toast);

        if (closeBtn) {
            closeBtn.addEventListener('click', _remove);
        }

        toast.addEventListener('mouseenter', () => {
            if (progressBar) progressBar.style.animationPlayState = 'paused';
            clearTimeout(timeout);
        });

        toast.addEventListener('mouseleave', () => {
            if (progressBar) progressBar.style.animationPlayState = 'running';
            const remaining = (progressBar.offsetWidth / toast.offsetWidth) * duration;
            timeout = setTimeout(_remove, Math.max(0, remaining));
        });

        return {
            remove: _remove,
            update: (newMsg) => {
                const msgEl = FluxUtils.qs('.ff-toast-message', toast);
                if (msgEl) {
                    msgEl.innerHTML = FluxSanitizer.escapeHtml(newMsg).replace(/\n/g, '<br>');
                }
            },
            setType: (newType) => {
                const vt = VALID_TYPES.includes(newType) ? newType : 'info';
                toast.className = `ff-toast ${vt}`;
                const iconEl = FluxUtils.qs('.ff-toast-icon', toast);
                if (iconEl) iconEl.innerHTML = ICON_MAP[vt] || ICON_MAP.info;
            },
            setDuration: (newDur) => {
                clearTimeout(timeout);
                const sd = Math.max(0, parseInt(newDur));
                if (progressBar) {
                    progressBar.style.animation = `ff-shrink ${sd}ms linear forwards`;
                }
                timeout = setTimeout(_remove, sd);
            }
        };
    }

    return { show };
})();