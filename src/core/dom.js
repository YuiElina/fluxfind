/**
 * FluxFind DOM Module
 * Fast DOM creation, manipulation, and style injection utilities
 *
 * @module core/dom
 * @license GPL-2.0-only
 */

const FluxDOM = (() => {
    'use strict';

    /**
     * Create an element with attributes and children in one call
     * @param {string} tag - HTML tag name
     * @param {Object} [attrs] - Attributes and properties
     * @param {...(Node|string)} children - Child nodes or text
     */
    function el(tag, attrs = {}, ...children) {
        const element = document.createElement(tag);
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'dataset' && typeof value === 'object') {
                Object.assign(element.dataset, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key === 'html') {
                element.innerHTML = value;
            } else if (key === 'text') {
                element.textContent = value;
            } else if (key === 'disabled' || key === 'checked' || key === 'selected') {
                if (value) element.setAttribute(key, '');
                else element.removeAttribute(key);
            } else {
                element.setAttribute(key, value);
            }
        }
        for (const child of children) {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            } else if (child != null) {
                element.appendChild(document.createTextNode(String(child)));
            }
        }
        return element;
    }

    /**
     * Create a DocumentFragment from an array of elements
     */
    function fragment(elements) {
        const frag = document.createDocumentFragment();
        for (const elem of elements) {
            if (elem instanceof Node) frag.appendChild(elem);
        }
        return frag;
    }

    /**
     * Inject CSS styles into the document head.
     * Returns the style element for later removal.
     */
    function injectStyle(id, css) {
        let styleEl = document.getElementById(id);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = id;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = css;
        return styleEl;
    }

    /**
     * Inject CSS once (no-op if ID already exists)
     */
    function injectStyleOnce(id, css) {
        if (document.getElementById(id)) return null;
        const styleEl = document.createElement('style');
        styleEl.id = id;
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
        return styleEl;
    }

    /**
     * Remove a previously injected style element by ID
     */
    function removeStyle(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    /**
     * Toggle a class on an element
     */
    function toggleClass(element, className, condition) {
        if (condition === undefined) {
            element.classList.toggle(className);
        } else if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }

    /**
     * Check if an element is visible in the viewport (lazy loading helper)
     */
    function isInViewport(el, margin = 0) {
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

    /**
     * Create an IntersectionObserver that calls callback once per element
     * Useful for lazy-loading images or deferred rendering
     */
    function createLazyObserver(callback, options = {}) {
        const seen = new WeakSet();
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && !seen.has(entry.target)) {
                    seen.add(entry.target);
                    callback(entry.target);
                }
            }
        }, { rootMargin: '200px', ...options });
        return observer;
    }

    /**
     * Get computed brightness of element's background (for dark mode detection)
     */
    function getBackgroundBrightness(el = document.body) {
        const bg = getComputedStyle(el).backgroundColor;
        const rgb = bg.match(/\d+/g);
        if (!rgb || rgb.length < 3) return 255; // default light
        return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    }

    /**
     * Check if page is in dark mode
     */
    function isDarkMode() {
        const bg = getComputedStyle(document.body).backgroundColor;
        const rgb = bg.match(/\d+/g);
        if (!rgb || rgb.length < 3) return false;
        const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
        return brightness < 128;
    }

    /**
     * Set CSS custom properties on an element
     */
    function setCSSVars(element, vars) {
        for (const [prop, val] of Object.entries(vars)) {
            element.style.setProperty(`--ff-${prop}`, val);
        }
    }

    /**
     * Get the current Roblox CSRF token from the page
     */
    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('data-token') : null;
    }

    return {
        el, fragment, injectStyle, injectStyleOnce, removeStyle,
        toggleClass, isInViewport, createLazyObserver,
        getBackgroundBrightness, isDarkMode, setCSSVars,
        getCsrfToken
    };
})();