import { FluxIcons } from './icons';
import type { ToastType } from '../types/ui';

export const FluxNotifications = ((): { show: (message: string, type?: ToastType, duration?: number) => void } => {
  let container: HTMLElement | null = null;
  let styleInjected = false;

  function ensureContainer(): HTMLElement {
    if (!container?.isConnected) {
      container = document.getElementById('fluxfind-toasts');
      if (container === null) {
        container = document.createElement('div');
        container.id = 'fluxfind-toasts';
        document.body.appendChild(container);
      }
    }
    return container;
  }

  function injectStyles(): void {
    if (styleInjected) return;
    GM_addStyle(`
      @keyframes ff-slideIn  { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
      @keyframes ff-slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
      #fluxfind-toasts {
        position: fixed; top: 20px; right: 20px; z-index: 999999999999;
        display: flex; flex-direction: column; gap: 8px; pointer-events: none;
      }
      .ff-toast {
        background: #2d2d2d; color: #e8e8e8; padding: 12px 16px; border-radius: 8px;
        font: 500 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        min-width: 280px; max-width: 420px; border: 1px solid rgba(255,255,255,0.15);
        box-shadow: 0 6px 20px rgba(0,0,0,0.35); animation: ff-slideIn 0.3s ease-out forwards;
        pointer-events: auto; position: relative; overflow: hidden;
      }
      .ff-toast.removing { animation: ff-slideOut 0.3s ease-in forwards; }
      .ff-toast-content { display: flex; align-items: center; gap: 10px; }
      .ff-toast-icon { flex-shrink: 0; width: 18px; height: 18px; display: flex; align-items: center; }
      .ff-toast-message { flex: 1; line-height: 1.4; }
      .ff-toast-close {
        position: absolute; top: 6px; right: 8px; width: 22px; height: 22px;
        background: none; border: none; color: #888; cursor: pointer; font-size: 16px;
        display: flex; align-items: center; justify-content: center; border-radius: 4px;
      }
      .ff-toast-close:hover { color: #fff; background: rgba(255,255,255,0.1); }
    `);
    styleInjected = true;
  }

  function show(message: string, type: ToastType = 'info', duration = 3000): void {
    injectStyles();
    const c = ensureContainer();

    const iconColors: Record<ToastType, string> = {
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3',
    };

    const iconNames: Record<ToastType, string> = {
      success: 'checkCircle',
      error: 'xCircle',
      warning: 'alertTriangle',
      info: 'info',
    };

    const toast = document.createElement('div');
    toast.className = 'ff-toast';
    toast.innerHTML =
      '<div class="ff-toast-content">' +
      '<span class="ff-toast-icon">' + FluxIcons.get(iconNames[type], { size: 18, color: iconColors[type] }) + '</span>' +
      '<span class="ff-toast-message">' + message + '</span>' +
      '</div>' +
      '<button class="ff-toast-close">×</button>';

    const closeBtn = toast.querySelector('.ff-toast-close');
    if (closeBtn !== null) {
      closeBtn.addEventListener('click', () => { removeToast(toast); });
    }

    c.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => { removeToast(toast); }, duration);
    }
  }

  function removeToast(toast: HTMLElement): void {
    if (!toast.isConnected) return;
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, 300);
  }

  return { show };
})();