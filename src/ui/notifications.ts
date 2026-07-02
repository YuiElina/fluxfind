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
    // Styles are now injected via app.ts from src/ui/css/components.css
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