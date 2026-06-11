export const FluxModals = ((): { custom: (builder: (modal: HTMLElement, close: () => void) => void, _options?: { width?: string }) => void } => {
  let activeModalCount = 0;
  let overlayEl: HTMLElement | null = null;

  function getOverlay(): HTMLElement {
    if (!overlayEl?.isConnected) {
      overlayEl = document.getElementById('ff-modal-overlay');
      if (overlayEl === null) {
        overlayEl = document.createElement('div');
        overlayEl.id = 'ff-modal-overlay';
        document.body.appendChild(overlayEl);
      }
    }
    return overlayEl;
  }

  function showOverlay(): void {
    const overlay = getOverlay();
    overlay.classList.add('ff-modal-overlay-active');
  }

  function hideOverlay(): void {
    if (activeModalCount <= 0) {
      const overlay = getOverlay();
      overlay.classList.remove('ff-modal-overlay-active');
    }
  }

  type CustomModalCallback = (modal: HTMLElement, close: () => void) => void;

  function custom(builder: CustomModalCallback, _options?: { width?: string }): void {
    showOverlay();
    activeModalCount++;

    const overlay = getOverlay();
    const modal = document.createElement('div');
    modal.className = 'ff-modal ff-modal-custom ff-modal-pop';
    modal.style.maxWidth = '520px';
    modal.style.width = '90%';
    modal.style.background = '#2a2a2a';
    modal.style.borderRadius = '12px';
    modal.style.border = '1px solid #404040';
    modal.style.overflowY = 'auto';
    modal.style.maxHeight = '85vh';
    modal.style.color = '#e8e8e8';

    function close(): void {
      modal.classList.add('ff-modal-closing');
      setTimeout(() => {
        if (modal.isConnected) modal.remove();
        activeModalCount--;
        hideOverlay();
      }, 200);
    }

    overlay.addEventListener('click', function handler(e: Event): void {
      if (e.target === overlay) {
        close();
        overlay.removeEventListener('click', handler);
      }
    });

    builder(modal, close);
    overlay.appendChild(modal);
  }

  return { custom };
})();