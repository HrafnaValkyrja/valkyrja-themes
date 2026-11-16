/*
 * Content script: runs the colour engine on every page with the Valkyrja theme.
 */
import {DEFAULT_THEME} from '../engine/defaults';
import type {DynamicThemeFix, Theme} from '../engine/definitions';
import {createOrUpdateDynamicTheme, createOrUpdateDynamicThemeInternal, removeDynamicTheme} from '../engine/inject/dynamic-theme';

import {PALETTE} from './palette';
import {isOnFor, loadSettings, onSettingsChanged} from './settings';
import {siteCSS} from './sites';

declare const browser: any;

const theme: Theme = {
    ...DEFAULT_THEME,
    mode: 1,
    darkSchemeBackgroundColor: PALETTE.black,
    darkSchemeTextColor: PALETTE.text,
    selectionColor: PALETTE.indigo,
    scrollbarColor: PALETTE.indigo,
};

const isIFrame = (() => {
    try {
        return window.self !== window.top;
    } catch {
        return true;
    }
})();

// Remembers per tab that this site is switched off, so a reload does not flash the theme before settings load.
const OFF_KEY = '__valkyrja__off';

function wasOff(): boolean {
    try {
        return sessionStorage.getItem(OFF_KEY) === '1';
    } catch {
        return false;
    }
}

function rememberOff(off: boolean): void {
    try {
        if (off) {
            sessionStorage.setItem(OFF_KEY, '1');
        } else {
            sessionStorage.removeItem(OFF_KEY);
        }
    } catch {
        // Storage can be blocked; the only cost is a short flash on reload.
    }
}

let running = false;

function setRunning(on: boolean): void {
    if (on === running) {
        return;
    }
    running = on;
    if (on) {
        start();
    } else {
        removeDynamicTheme();
    }
}

// How long the first colouring waits for the per-site fixes before it goes ahead without them.
const FIXES_WAIT_MS = 120;
let fixes: Promise<DynamicThemeFix[] | null> | null = null;

function loadFixes(): Promise<DynamicThemeFix[] | null> {
    fixes ??= browser.runtime.sendMessage({type: 'get-fixes', url: location.href}).catch(() => null);
    return fixes!;
}

const EMPTY_FIX: DynamicThemeFix = {url: ['*'], invert: [], css: '', ignoreInlineStyle: [], ignoreImageAnalysis: [], ignoreCSSUrl: []} as DynamicThemeFix;

// Adds this site's shapes and fonts (if it has a module) to the style sheet the engine injects last.
function withSiteModule(list: DynamicThemeFix[] | null): DynamicThemeFix[] | null {
    const css = siteCSS(location.hostname, browser.runtime.getURL('fonts'));
    if (!css) {
        return list;
    }
    const [common, ...rest] = list ?? [EMPTY_FIX];
    return [{...common, css: `${common.css ?? ''}\n${css}`}, ...rest];
}

function apply(fixesList: DynamicThemeFix[] | null): void {
    if (!running) {
        return;
    }
    const list = withSiteModule(fixesList);
    if (list) {
        createOrUpdateDynamicTheme(theme, list, isIFrame);
    } else {
        createOrUpdateDynamicThemeInternal(theme, null, isIFrame);
    }
}

function start(): void {
    let started = false;
    const timer = setTimeout(() => {
        started = true;
        apply(null);
    }, FIXES_WAIT_MS);
    loadFixes().then((list) => {
        clearTimeout(timer);
        if (!started || list) {
            apply(list);
        }
    });
}

async function sync(): Promise<void> {
    const on = isOnFor(await loadSettings(), location.hostname);
    rememberOff(!on);
    setRunning(on);
}

// Start at once (before the first paint) unless this tab already knows the site is off; settings then confirm.
setRunning(!wasOff());
sync();
onSettingsChanged(sync);
