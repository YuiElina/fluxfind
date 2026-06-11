/**
 * FluxFind Icons Module
 * Lucide-style SVG icons - no emojis, pure SVG inline
 * Each icon returns an SVG string for direct DOM injection
 *
 * @module ui/icons
 * @license GPL-2.0-only
 */

const FluxIcons = (() => {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';

    /**
     * Build SVG element from attributes and inner path data
     */
    function _svg(attrs, ...paths) {
        const size = attrs.width || 24;
        return `<svg xmlns="${NS}" width="${size}" height="${attrs.height || size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${attrs.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round" class="${attrs.className || ''}" style="${attrs.style || ''}">${paths.join('')}</svg>`;
    }

    const icons = {
        // Navigation & core
        settings:   _svg({}, '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
        search:     _svg({}, '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
        filter:     _svg({}, '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'),
        refresh:    _svg({}, '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15.36 6.36L3 16"/>'),
        close:      _svg({}, '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
        check:      _svg({}, '<path d="M20 6 9 17l-5-5"/>'),
        chevronDown:_svg({}, '<path d="m6 9 6 6 6-6"/>'),
        chevronUp:  _svg({}, '<path d="m18 15-6-6-6 6"/>'),
        chevronLeft:_svg({}, '<path d="m15 18-6-6 6-6"/>'),
        chevronRight:_svg({},'<path d="m9 18 6-6-6-6"/>'),

        // Status & feedback
        info:       _svg({}, '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
        alertTriangle: _svg({}, '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
        alertCircle:_svg({}, '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'),
        checkCircle:_svg({},'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
        xCircle:    _svg({}, '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'),
        loader:     _svg({}, '<path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>'),

        // User & social
        user:       _svg({}, '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
        users:      _svg({}, '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
        userPlus:   _svg({}, '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>'),
        userX:      _svg({}, '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>'),
        userRoundPlus: _svg({}, '<path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="M19 16v6"/><path d="M22 19h-6"/>'),

        // Game & play
        play:       _svg({}, '<polygon points="5 3 19 12 5 21 5 3"/>'),
        gamepad:    _svg({}, '<line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/>'),
        server:     _svg({}, '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>'),
        zap:        _svg({}, '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
        globe:      _svg({}, '<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/><path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10"/>'),
        mapPin:     _svg({}, '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),

        // Actions
        plus:       _svg({}, '<path d="M5 12h14"/><path d="M12 5v14"/>'),
        minus:      _svg({}, '<path d="M5 12h14"/>'),
        trash:       _svg({}, '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'),
        copy:       _svg({}, '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
        download:   _svg({}, '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
        upload:     _svg({}, '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>'),
        externalLink:_svg({},'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>'),

        //Toggle & UI
        eye:        _svg({}, '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
        eyeOff:     _svg({}, '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>'),
        moon:       _svg({}, '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
        sun:        _svg({}, '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
        layout:     _svg({}, '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="3" y2="21"/>'),
        pallete:    _svg({}, '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="9.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>'),
        monitor:    _svg({}, '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'),

        // Misc
        heart:      _svg({}, '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
        star:       _svg({}, '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
        clock:      _svg({}, '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
        shield:     _svg({}, '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
        flag:       _svg({}, '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>'),
    };

    /**
     * Get icon SVG string by name
     */
    function get(name, opts = {}) {
        const { size = 18, className = '', color = '' } = opts;
        let svg = icons[name];
        if (!svg) return icons.info;

        // Apply size
        svg = svg.replace(/width="(\d+)"/, `width="${size}"`);
        svg = svg.replace(/height="(\d+)"/, `height="${size}"`);

        if (className) {
            svg = svg.replace(/class=""/, `class="${className}"`);
            if (!svg.includes('class=')) {
                svg = svg.replace('<svg', `<svg class="${className}"`);
            }
        }

        if (color) {
            svg = svg.replace('stroke="currentColor"', `stroke="${FluxSanitizer.sanitizeColor(color)}"`);
        }

        return svg;
    }

    /**
     * Create an SVG DOM element from icon name
     */
    function createElement(name, opts = {}) {
        const svgString = get(name, opts);
        const temp = document.createElement('div');
        temp.innerHTML = svgString;
        return temp.firstElementChild;
    }

    /**
     * Get base64 data URI for logo icon
     */
    function getLogoSVG(size = 56) {
        return `<svg xmlns="${NS}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" fill="#6C5CE7" fill-opacity="0.15"/>
            <path d="M12 2a8 8 0 0 1 8 8"/>
            <path d="M20 10a8 8 0 0 1-8 8"/>
            <path d="M12 18a8 8 0 0 1-8-8"/>
            <path d="M4 14a8 8 0 0 0 8-8"/>
            <circle cx="12" cy="12" r="3" fill="#6C5CE7"/>
        </svg>`;
    }

    return { icons, get, createElement, getLogoSVG };
})();