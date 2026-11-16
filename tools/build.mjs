// Builds the add-on into dist/addon (load it with about:debugging or web-ext).
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist/addon');
fs.mkdirSync(out, {recursive: true});

// Build flags of the engine: every other browser target is off.
const define = Object.fromEntries([
    '__DEBUG__', '__CHROMIUM_MV2__', '__CHROMIUM_MV3__', '__FIREFOX_MV2__', '__THUNDERBIRD__', '__TEST__', '__PLUS__',
].map((flag) => [flag, 'false']));
define.__VALKYRJA_ADDON__ = 'true';

await build({
    entryPoints: {
        content: path.join(root, 'src/content.ts'),
        background: path.join(root, 'src/background.ts'),
        popup: path.join(root, 'src/popup.ts'),
        proxy: path.join(root, 'engine/inject/dynamic-theme/mv3-proxy.ts'),
    },
    outdir: out,
    bundle: true,
    format: 'iife',
    target: 'firefox142',
    define,
    alias: {'@plus': path.join(root, 'engine/stubs'), 'background': path.join(root, 'engine/background')},
    loader: {'.css': 'text'},
    legalComments: 'none',
    logLevel: 'info',
});

for (const file of ['manifest.json', 'popup.html']) {
    fs.copyFileSync(path.join(root, 'src', file), path.join(out, file));
}
fs.copyFileSync(path.join(root, 'engine/LICENSE'), path.join(out, 'ENGINE-LICENSE.txt'));
fs.copyFileSync(path.join(root, 'engine/config/dynamic-theme-fixes.config'), path.join(out, 'dynamic-theme-fixes.config'));
fs.cpSync(path.join(root, 'assets/fonts'), path.join(out, 'fonts'), {recursive: true});
