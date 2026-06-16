#!/usr/bin/env node
/**
 * FluxFind Build System (TypeScript)
 * Uses esbuild to bundle src/app.ts into a single userscript output.
 *
 * Usage: npx tsx build.ts
 * Output: fluxfind.user.js
 *
 * @license GPL-2.0-only
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FluxConstants } from './src/config/constants';
import {OnLoadArgs, OnLoadResult, PluginBuild} from "esbuild";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION = FluxConstants.VERSION;

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
 * Source: https://github.com/YuiElina/fluxfind
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
        setup: loadBuild
      },
    ],
  });

  function loadBuild(plugin: PluginBuild): void {
      plugin.onLoad({filter: /\.ts$/}, async (args: OnLoadArgs): Promise<OnLoadResult> => {
          let contents = fs.readFileSync(args.path, 'utf-8');
          contents = contents.replace(/^["']use["'];\s*/gm, '');
          return {contents, loader: "ts"};
      })
  }


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
  console.log('  License: GPL-2.0-only\n');
}

build().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});