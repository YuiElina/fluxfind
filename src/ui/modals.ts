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
    modal.style.borderRadius = '12px';
    modal.style.overflowY = 'auto';
    modal.style.maxHeight = '85vh';

    function backdropHandler(e: Event): void {
      if (e.target === overlay) {
        close();
      }
    }

    function close(): void {
      overlay.removeEventListener('click', backdropHandler);
      modal.classList.add('ff-modal-closing');
      setTimeout(() => {
        if (modal.isConnected) modal.remove();
        activeModalCount--;
        hideOverlay();
      }, 200);
    }

    overlay.addEventListener('click', backdropHandler);

    builder(modal, close);
    overlay.appendChild(modal);
  }

  return { custom };
})();