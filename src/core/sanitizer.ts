const HTML_ENTITIES: Record<string, string> = {
  '&': '&',
  '<': '<',
  '>': '>',
  '"': '"',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

export const FluxSanitizer = ((): {
  escapeHtml: (text: string | null | undefined) => string;
  sanitizeUserId: (id: string | number | null | undefined) => number;
  sanitizeAttribute: (str: string | null | undefined) => string;
  sanitizeColor: (color: string | null | undefined) => string;
  sanitizeCssColor: (value: string | null | undefined) => string;
  escapeCssString: (str: string | null | undefined) => string;
  safeInnerHTML: (element: HTMLElement, html: string | null | undefined) => void;
  sanitizeUrl: (url: string | null | undefined) => string;
  truncate: (text: string | null | undefined, maxLen?: number) => string;
  isPlainObject: (value: unknown) => value is Record<string, unknown>;
} => {
  'use strict';

  function escapeHtml(text: string | null | undefined): string {
    if (typeof text !== 'string') return '';
    return text.replace(/[&<>"'`=]/g, char => HTML_ENTITIES[char] ?? char);
  }

  function sanitizeUserId(id: string | number | null | undefined): number {
    const num = typeof id === 'number' ? id : parseInt(id ?? '', 10);
    return (!isNaN(num) && num > 0 && num < Number.MAX_SAFE_INTEGER) ? num : 0;
  }

  function sanitizeAttribute(str: string | null | undefined): string {
    return (str ?? '').replace(/[&<>"'`]/g, char => HTML_ENTITIES[char] ?? char);
  }

  function sanitizeColor(color: string | null | undefined): string {
    const safe = color ?? '';
    return /^#[0-9A-Fa-f]{3,8}$/.test(safe) ? safe : '#ffffff';
  }

  function sanitizeCssColor(value: string | null | undefined): string {
    const safe = value ?? '';
    const cssColorPattern = /^(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)$/;
    return cssColorPattern.test(safe) ? safe : 'rgba(40,40,40,0.85)';
  }

  function escapeCssString(str: string | null | undefined): string {
    return (str ?? '').replace(/[\\"';&!]/g, '\\$&');
  }

  function safeInnerHTML(element: HTMLElement, html: string | null | undefined): void {
    element.innerHTML = '';
    if (typeof html !== 'string') return;
    const sanitized = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<(\w+)\s+on\w+\s*=\s*["'][^"']*["']/gi, '<$1');
    element.innerHTML = sanitized;
  }

  function sanitizeUrl(url: string | null | undefined): string {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (/^(https?:|data:image\/)/i.test(trimmed)) {
      return trimmed;
    }
    return '';
  }

  function truncate(text: string | null | undefined, maxLen = 200): string {
    const str = text ?? '';
    return str.length > maxLen ? str.slice(0, maxLen) + '\u2026' : str;
  }

  function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  return {
    escapeHtml, sanitizeUserId, sanitizeAttribute,
    sanitizeColor, sanitizeCssColor, escapeCssString,
    safeInnerHTML, sanitizeUrl, truncate, isPlainObject,
  };
})();