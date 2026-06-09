/**
 * FluxFind Core Styles Module
 * Injects pre-compiled CSS string into the document once on init
 * The CSS content is generated at build time from src/ui/css/*.css files
 *
 * @module ui/styles
 * @license GPL-2.0-only
 */

const FluxStyles = (() => {
    'use strict';

    /**
     * The compiled CSS string — replaced by build.js with actual CSS content.
     * Each line is a single-quoted string joined with newlines.
     */
    const CSS = '/* CSS is embedded at build time from src/ui/css/*.css files */';

    function injectAll() {
        if (CSS && CSS.length > 0 && CSS !== '/* CSS is embedded at build time from src/ui/css/*.css files */') {
            FluxDOM.injectStyleOnce('fluxfind-core-styles', CSS);
        }
    }

    return { injectAll };
})();