#!/usr/bin/env node
/**
 * FluxFind Build System
 * Compiles CSS from src/ui/css/*.css, embeds into styles.js, then concatenates all JS modules
 *
 * Usage: node build.js
 * Output: fluxfind.user.js
 *
 * @license GPL-2.0-only
 */

'use strict';

const fs = require('fs');
const path = require('path');

const VERSION = '1.0.0';

// CSS files to compile (order matters — variables must come first)
const CSS_FILES = [
    'src/ui/css/variables.css',
    'src/ui/css/components.css',
    'src/ui/css/modals.css',
    'src/ui/css/settings.css',
    'src/ui/css/server-browser.css'
];

// Dependency-ordered source files (each must be loaded after its dependencies)
const SOURCES = [
    // Core utilities (no dependencies)
    'src/core/utils.js',
    'src/core/sanitizer.js',
    'src/core/logger.js',
    'src/core/storage.js',
    'src/core/dom.js',

    // Configuration
    'src/config/constants.js',

    // API layer
    'src/api/http-client.js',
    'src/api/games.js',
    'src/api/users.js',
    'src/api/thumbnails.js',
    'src/api/catalog.js',

    // UI layer
    'src/ui/icons.js',
    'src/ui/notifications.js',
    'src/ui/styles.js',
    'src/ui/modals.js',
    'src/ui/settings-panel.js',

    // Features
    'src/features/ad-remover.js',
    'src/features/url-router.js',
    'src/features/server-browser.js',

    // Main application (must be last — auto-initializes)
    'src/app.js'
];

// UserScript metadata header
const HEADER = `// ==UserScript==
// @name         FluxFind
// @namespace    https://github.com/YuiElina/fluxfind/
// @version      ${VERSION}
// @description  Enhanced Roblox server browser with filtering, region detection, smart search, and quality-of-life improvements. Free and open source alternative to paid extensions.
// @author       YuiElina
// @match        https://www.roblox.com/*
// @license      GPL-2.0-only
// @icon         https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/search.svg
// @supportURL   https://github.com/YuiElina/fluxfind
// @downloadURL  https://raw.githubusercontent.com/YuiElina/fluxfind/main/fluxfind.user.js
// @updateURL    https://raw.githubusercontent.com/YuiElina/fluxfind/main/fluxfind.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_deleteValue
// @connect      thumbnails.roblox.com
// @connect      games.roblox.com
// @connect      gamejoin.roblox.com
// @connect      presence.roblox.com
// @connect      www.roblox.com
// @connect      friends.roblox.com
// @connect      apis.roblox.com
// @connect      groups.roblox.com
// @connect      users.roblox.com
// @connect      catalog.roblox.com
// ==/UserScript==

`;

/**
 * Read and minify all CSS files into a single string
 */
function compileCSS() {
    let compiled = '';
    let totalCssLines = 0;

    for (const cssPath of CSS_FILES) {
        const fullPath = path.resolve(__dirname, cssPath);
        if (!fs.existsSync(fullPath)) {
            console.error(`  WARNING: Missing CSS file: ${cssPath}`);
            continue;
        }
        let css = fs.readFileSync(fullPath, 'utf-8');

        // Strip comments (/* ... */)
        css = css.replace(/\/\*[\s\S]*?\*\//g, '');
        // Collapse multiple whitespace/newlines into single space
        css = css.replace(/\s+/g, ' ').trim();

        if (css.length > 0) {
            compiled += css + ' ';
            const rawLines = css.split('\n').length;
            totalCssLines += rawLines;
        }
    }

    compiled = compiled.trim();
    const cssKB = (Buffer.byteLength(compiled, 'utf-8') / 1024).toFixed(1);
    console.log(`    [CSS] Compiled ${CSS_FILES.length} files -> ${cssKB} KB minified`);

    return compiled;
}

/**
 * Inject compiled CSS into the styles.js template
 */
function buildStylesModule(cssContent) {
    const stylesPath = path.resolve(__dirname, 'src/ui/styles.js');
    let source = fs.readFileSync(stylesPath, 'utf-8');

    // Escape CSS for safe embedding in a JS single-quoted string
    const escaped = cssContent
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n');

    // Replace the CSS placeholder with the actual compiled CSS
    source = source.replace(
        "const CSS = '/* CSS is embedded at build time from src/ui/css/*.css files */';",
        `const CSS = '${escaped}';`
    );

    return source;
}

function build() {
    console.log(`\n  FluxFind Build System v${VERSION}`);
    console.log('  ' + '='.repeat(40));

    // Step 1: Compile CSS
    const compiledCSS = compileCSS();

    // Step 1.5: Verify styles.js template exists
    const stylesTemplatePath = path.resolve(__dirname, 'src/ui/styles.js');
    if (!fs.existsSync(stylesTemplatePath)) {
        console.error('  ERROR: Missing styles.js template');
        process.exit(1);
    }

    // Step 2: Build the full output
    let output = HEADER;

    // Add the GPL v2 license header
    output += `/**
 * FluxFind - Enhanced Roblox Server Browser & Utility Suite
 * Copyright (C) 2026  FluxFind Contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Built from modular source. See build.js for module list.
 * CSS compiled from src/ui/css/*.css
 * Source: https://github.com/fluxfind/fluxfind
 */

`;

    let totalModules = 0;
    let totalLines = 0;
    let errors = 0;

    for (const sourcePath of SOURCES) {
        const fullPath = path.resolve(__dirname, sourcePath);
        if (!fs.existsSync(fullPath)) {
            console.error(`  ERROR: Missing source file: ${sourcePath}`);
            errors++;
            continue;
        }

        let content = fs.readFileSync(fullPath, 'utf-8');

        // Special handling: inject compiled CSS into styles.js at build time
        if (sourcePath === 'src/ui/styles.js') {
            content = buildStylesModule(compiledCSS);
        }

        const lines = content.split('\n').length;

        // Strip any 'use strict' since the userscript wrapper handles it
        const cleanContent = content.replace(/^'use strict';\s*/gm, '');

        // Add module separator
        const moduleName = path.basename(sourcePath, '.js');
        output += `\n// ====== MODULE: ${moduleName} (${sourcePath}) ======\n`;
        output += cleanContent.trim() + '\n';

        console.log(`    ${sourcePath.padEnd(40)} ${lines.toString().padStart(5)} lines`);
        totalModules++;
        totalLines += lines;
    }

    // Final safety wrapper
    output += `
// ====== FLUXFIND INITIALIZATION COMPLETE ======
// Auto-initialization is handled by FluxApp module
// Total modules: ${totalModules}, JS lines: ${totalLines}
`;

    if (errors > 0) {
        console.error(`\n  BUILD FAILED: ${errors} error(s)\n`);
        process.exit(1);
    }

    const outPath = path.resolve(__dirname, 'fluxfind.user.js');
    fs.writeFileSync(outPath, output, 'utf-8');

    const outSize = Buffer.byteLength(output, 'utf-8');
    const sizeKB = (outSize / 1024).toFixed(1);
    const sizeMB = (outSize / (1024 * 1024)).toFixed(2);

    console.log('  ' + '='.repeat(40));
    console.log(`  Build complete!`);
    console.log(`  Output:   fluxfind.user.js`);
    console.log(`  Modules:  ${totalModules} JS + ${CSS_FILES.length} CSS files`);
    console.log(`  JS Lines: ${totalLines.toLocaleString()}`);
    console.log(`  Size:     ${sizeKB} KB (${sizeMB} MB)`);
    console.log(`  License:  GPL-2.0-only\n`);
}

build();