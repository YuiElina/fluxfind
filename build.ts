#!/usr/bin/env node
/**
 * FluxFind Build System (TypeScript)
 * Uses esbuild to bundle src/app.ts into a single userscript output.
 *
 * Usage: npx tsx build.ts
 * Output: fluxfind.user.js
 *
 * @license AOL-1.0
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION = '0.1.0-alpha';

const HEADER = `// ==UserScript==
// @name         FluxFind
// @namespace    https://github.com/YuiElina/fluxfind/
// @version      ${VERSION}
// @description  Enhanced Roblox server browser with filtering, region detection, smart search, and quality-of-life improvements. Free and open source alternative to paid extensions.
// @author       YuiElina
// @match        https://www.roblox.com/*
// @license      AOL-1.0
// @icon         https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/search.svg
// @supportURL   https://github.com/YuiElina/fluxfind
// @downloadURL  https://raw.githubusercontent.com/YuiElina/fluxfind/main/fluxfind.user.js
// @updateURL    https://raw.githubusercontent.com/YuiElina/fluxfind/main/fluxfind.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
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
// @connect      ip-api.com
// ==/UserScript==

`;

const LICENSE = `/**
 * FluxFind - Enhanced Roblox Server Browser & Utility Suite
 * Copyright (c) 2026 FluxFind Contributors
 *
 * Licensed under the Authentic Open License, Version 1.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://github.com/YuiElina/AOL-LICENSE/blob/master/LICENSE
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @license AOL-1.0
 * @see https://github.com/YuiElina/AOL-LICENSE
 */

`;

async function build(): Promise<void> {
  console.log(`\n  FluxFind Build System v${VERSION} (TypeScript + esbuild)`);
  console.log('  ' + '='.repeat(50));

  const srcEntry = path.resolve(__dirname, 'src', 'app.ts');
  const outPath = path.resolve(__dirname, 'dist', 'fluxfind.user.js');

  // Step 1: Bundle with esbuild
  console.log('  [1/2] Bundling TypeScript...');
  const result = await esbuild.build({
    entryPoints: [srcEntry],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    platform: 'browser',
    outfile: 'dist/temp-bundle.js',
    write: true,
    treeShaking: true,
    minify: false,
    keepNames: true,
    banner: {
      js: '(function() {\n"use strict";\n',
    },
    footer: {
      js: '\n})();',
    },
    define: {
      'import.meta.url': 'undefined',
    },
    plugins: [
      {
        name: 'strip-use-strict',
        setup(build1) {
          build1.onLoad({ filter: /\.ts$/ }, async (args) => {
            let contents = fs.readFileSync(args.path, 'utf-8');
            // Remove module-level 'use strict' since IIFE handles it
            contents = contents.replace(/^["']use strict["'];\s*/gm, '');
            return { contents, loader: 'ts' };
          });
        },
      },
    ],
  });

  if (result.errors.length > 0) {
    console.error('  BUILD FAILED:');
    for (const err of result.errors) console.error('    ' + err.text);
    process.exit(1);
  }

  // Step 2: Prepend userscript header + license
  console.log('  [2/2] Assembling userscript output...');

  const bundlePath = path.resolve(__dirname, 'dist', 'temp-bundle.js');
  let bundleContent = fs.readFileSync(bundlePath, 'utf-8');

  // Wrap the global IIFE from esbuild inside our own
  bundleContent = bundleContent.trim();
  if (bundleContent.startsWith('(function()')) {
    bundleContent = bundleContent.slice(12); // remove esbuild's "(function() {"
  }
  if (bundleContent.endsWith('})();')) {
    bundleContent = bundleContent.slice(0, -5); // remove "})();"
  }

  const output = HEADER + LICENSE + '(function() {\n"use strict";\n' + bundleContent.trim() + '\n})();\n';

  fs.writeFileSync(outPath, output, 'utf-8');

  // Clean up temp bundle
  try { fs.unlinkSync(bundlePath); } catch { /* ok */ }

  const outSize = Buffer.byteLength(output, 'utf-8');
  const sizeKB = (outSize / 1024).toFixed(1);

  console.log('  ' + '='.repeat(50));
  console.log('  Build complete!');
  console.log('  Output:  fluxfind.user.js');
  console.log('  Size:    ' + sizeKB + ' KB');
  console.log('  License: AOL-1.0\n');
}

build().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});