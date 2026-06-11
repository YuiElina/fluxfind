type Attrs = Record<string, unknown>;

export const FluxDOM = ((): {
  el: (tag: string, attrs?: Attrs, ...children: (Node | string | null)[]) => HTMLElement;
  injectStyle: (id: string, css: string) => HTMLStyleElement;
  injectStyleOnce: (id: string, css: string) => HTMLStyleElement | null;
  removeStyle: (id: string) => void;
  toggleClass: (element: HTMLElement, className: string, condition?: boolean) => void;
  isInViewport: (el: HTMLElement, margin?: number) => boolean;
  getBackgroundBrightness: (el?: HTMLElement) => number;
  isDarkMode: () => boolean;
  getCsrfToken: () => string | null;
} => {
  'use strict';

  function el(tag: string, attrs: Attrs = {}, ...children: (Node | string | null)[]): HTMLElement {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className' && typeof value === 'string') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object' && value !== null) {
        Object.assign(element.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (key === 'html') {
        element.innerHTML = typeof value === 'string' ? value : '';
      } else if (key === 'text') {
        element.textContent = typeof value === 'string' ? value : '';
      } else if (key === 'disabled' || key === 'checked' || key === 'selected') {
        if (value) element.setAttribute(key, '');
        else element.removeAttribute(key);
      } else {
        element.setAttribute(key, typeof value === 'string' ? value : '');
      }
    }
    for (const child of children) {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    }
    return element;
  }

  function injectStyle(id: string, css: string): HTMLStyleElement {
    let styleEl = document.getElementById(id) as HTMLStyleElement | null;
    if (styleEl === null) {
      styleEl = document.createElement('style');
      styleEl.id = id;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
    return styleEl;
  }

  function injectStyleOnce(id: string, css: string): HTMLStyleElement | null {
    if (document.getElementById(id) !== null) return null;
    const styleEl = document.createElement('style');
    styleEl.id = id;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    return styleEl;
  }

  function removeStyle(id: string): void {
    document.getElementById(id)?.remove();
  }

  function toggleClass(element: HTMLElement, className: string, condition?: boolean): void {
    if (condition === undefined) {
      element.classList.toggle(className);
    } else if (condition) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }

  function isInViewport(el: HTMLElement, margin = 0): boolean {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    return (
      rect.top < vh + margin &&
      rect.bottom > -margin &&
      rect.left < vw + margin &&
      rect.right > -margin
    );
  }

  function getBackgroundBrightness(el: HTMLElement = document.body): number {
    const bg = getComputedStyle(el).backgroundColor;
    const rgb = bg.match(/\d+/g);
    if (rgb === null || rgb.length < 3) return 255;
    return (Number(rgb[0]) * 299 + Number(rgb[1]) * 587 + Number(rgb[2]) * 114) / 1000;
  }

  function isDarkMode(): boolean {
    const bg = getComputedStyle(document.body).backgroundColor;
    const rgb = bg.match(/\d+/g);
    if (rgb === null || rgb.length < 3) return false;
    const brightness = (Number(rgb[0]) * 299 + Number(rgb[1]) * 587 + Number(rgb[2]) * 114) / 1000;
    return brightness < 128;
  }

  function getCsrfToken(): string | null {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('data-token') ?? null;
  }

  return {
    el, injectStyle, injectStyleOnce, removeStyle,
    toggleClass, isInViewport,
    getBackgroundBrightness, isDarkMode, getCsrfToken,
  };
})();