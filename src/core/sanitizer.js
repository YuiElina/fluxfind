/**
 * FluxFind Sanitizer Module
 * XSS protection, input validation, and safe DOM injection
 *
 * @module core/sanitizer
 * @license GPL-2.0-only
 */

const FluxSanitizer = (() => {
    'use strict';

    const HTML_ENTITIES = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    /**
     * Escape HTML to prevent XSS injection
     */
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[&<>"'`=\/]/g, char => HTML_ENTITIES[char] || char);
    }

    /**
     * Sanitize user ID (positive integer only)
     */
    function sanitizeUserId(id) {
        const num = parseInt(id, 10);
        return (!isNaN(num) && num > 0 && num < Number.MAX_SAFE_INTEGER) ? num : 0;
    }

    /**
     * Sanitize a generic attribute value
     */
    function sanitizeAttribute(str) {
        return String(str).replace(/[&<>"'`]/g, char => HTML_ENTITIES[char] || char);
    }

    /**
     * Validate hex color string (#RGB or #RRGGBB)
     */
    function sanitizeColor(color) {
        return /^#[0-9A-Fa-f]{3,8}$/.test(color) ? color : '#ffffff';
    }

    /**
     * Validate CSS color value (hex, rgb, rgba, named colors)
     */
    function sanitizeCssColor(value) {
        const cssColorPattern = /^(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)$/;
        return cssColorPattern.test(value) ? value : 'rgba(40,40,40,0.85)';
    }

    /**
     * Escape CSS string for use in style attributes
     */
    function escapeCssString(str) {
        return String(str).replace(/[\\"';&!]/g, '\\$&');
    }

    /**
     * Safe innerHTML setter - sanitizes first
     */
    function safeInnerHTML(element, html) {
        element.innerHTML = '';
        if (typeof html !== 'string') return;
        const sanitized = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<(\w+)\s+on\w+\s*=\s*["'][^"']*["']/gi, '<$1');
        element.innerHTML = sanitized;
    }

    /**
     * Validate URL - only allow http/https/data protocols
     */
    function sanitizeUrl(url) {
        if (typeof url !== 'string') return '';
        const trimmed = url.trim();
        if (/^(https?:|data:image\/)/i.test(trimmed)) {
            return trimmed;
        }
        return '';
    }

    /**
     * Truncate text safely to max length
     */
    function truncate(text, maxLen = 200) {
        const str = String(text);
        return str.length > maxLen ? str.slice(0, maxLen) + '\u2026' : str;
    }

    /**
     * Validate that value is a plain object (not array, not null)
     */
    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

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