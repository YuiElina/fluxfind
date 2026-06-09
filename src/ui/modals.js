/**
 * FluxFind Modals Module
 * Reusable modal/popup system with overlay, animations, and focus trapping
 *
 * @module ui/modals
 * @license GPL-2.0-only
 */

const FluxModals = (() => {
    'use strict';

    let activeModals = 0;
    let overlayEl = null;

    function _getOverlay() {
        if (!overlayEl || !overlayEl.isConnected) {
            overlayEl = FluxDOM.el('div', { id: 'ff-modal-overlay' });
            document.body.appendChild(overlayEl);
        }
        return overlayEl;
    }

    /**
     * Show a confirmation dialog
     * @param {string} title
     * @param {string} message
     * @param {Object} options - { confirmText, cancelText, type, onConfirm, onCancel }
     * @returns {Object} { close }
     */
    function confirm(title, message, options = {}) {
        const {
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'warning',
            onConfirm = FluxUtils.noop,
            onCancel = FluxUtils.noop
        } = options;

        const safeTitle = FluxSanitizer.escapeHtml(title);
        const safeMsg = FluxSanitizer.escapeHtml(message);

        const typeIcons = {
            warning: FluxIcons.get('alertTriangle', { size: 32, color: '#FF9800' }),
            danger:  FluxIcons.get('alertCircle', { size: 32, color: '#F44336' }),
            info:    FluxIcons.get('info', { size: 32, color: '#2196F3' }),
            success: FluxIcons.get('checkCircle', { size: 32, color: '#4CAF50' })
        };

        const modal = FluxDOM.el('div', { className: 'ff-modal ff-modal-confirm ff-modal-pop' });
        modal.innerHTML = `
            <div class="ff-modal-confirm-icon">${typeIcons[type] || typeIcons.info}</div>
            <h2 class="ff-modal-confirm-title">${safeTitle}</h2>
            <p class="ff-modal-confirm-msg">${safeMsg}</p>
            <div class="ff-modal-confirm-actions">
                <button class="ff-btn" id="ff-modal-cancel">${FluxSanitizer.escapeHtml(cancelText)}</button>
                <button class="ff-btn ff-btn-primary" id="ff-modal-confirm">${FluxSanitizer.escapeHtml(confirmText)}</button>
            </div>
        `;

        _openOverlay();
        const overlay = _getOverlay();
        overlay.appendChild(modal);
        overlay.style.display = 'flex';

        function close() {
            modal.classList.remove('ff-modal-pop');
            modal.classList.add('ff-modal-closing');
            setTimeout(() => {
                if (modal.isConnected) modal.remove();
                activeModals--;
                if (activeModals <= 0) {
                    overlay.style.display = 'none';
                    activeModals = 0;
                }
            }, 200);
        }

        modal.querySelector('#ff-modal-confirm').addEventListener('click', () => {
            close();
            onConfirm();
        });
        modal.querySelector('#ff-modal-cancel').addEventListener('click', () => {
            close();
            onCancel();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) { close(); onCancel(); }
        });

        activeModals++;

        return { close };
    }

    function _openOverlay() {
        const overlay = _getOverlay();
        if (overlay.style.display === 'flex') overlay.style.display = 'none';
        void overlay.offsetWidth;
    }

    /**
     * Show a custom modal with full content control
     */
    function custom(contentRenderer, options = {}) {
        const { closable = true, onClose = FluxUtils.noop, width = '600px' } = options;

        const modal = FluxDOM.el('div', {
            className: 'ff-modal ff-modal-custom ff-modal-pop'
        });
        modal.style.maxWidth = width;
        modal.style.width = '95%';

        function close() {
            modal.classList.remove('ff-modal-pop');
            modal.classList.add('ff-modal-closing');
            setTimeout(() => {
                if (modal.isConnected) modal.remove();
                activeModals--;
                if (activeModals <= 0) {
                    _getOverlay().style.display = 'none';
                    activeModals = 0;
                }
                onClose();
            }, 200);
        }

        contentRenderer(modal, close);

        _openOverlay();
        const overlay = _getOverlay();
        overlay.appendChild(modal);
        overlay.style.display = 'flex';
        activeModals++;

        if (closable) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });
        }

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
        }, { once: true });

        return { close, modal };
    }

    return { confirm, custom };
})();