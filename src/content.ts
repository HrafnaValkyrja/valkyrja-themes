/*
 * Content script: runs the colour engine on every page with the Valkyrja theme.
 */
import {DEFAULT_THEME} from '../engine/defaults';
import type {DynamicThemeFix, Theme} from '../engine/definitions';
import {createOrUpdateDynamicTheme, createOrUpdateDynamicThemeInternal, removeDynamicTheme} from '../engine/inject/dynamic-theme';
import {clearColorModificationCache} from '../engine/inject/dynamic-theme/modify-colors';

import {DEFAULT_THEME_ID, activeThemeId, activeTokens, setActiveTheme} from './palette';
import {isOnFor, loadSettings, onSettingsChanged} from './settings';
import {siteCSS} from './sites';

declare const browser: any;

// The engine's theme object, built from the active theme's tokens.
function engineTheme(): Theme {
    const tokens = activeTokens();
    return {
        ...DEFAULT_THEME,
        mode: 1,
        darkSchemeBackgroundColor: tokens.base,
        darkSchemeTextColor: tokens.text,
        selectionColor: tokens.sel,
        scrollbarColor: tokens.lineHi,
    };
}

const isIFrame = (() => {
    try {
        return window.self !== window.top;
    } catch {
        return true;
    }
})();

// Remembers per tab that this site is switched off, so a reload does not flash the theme before settings load.
const OFF_KEY = '__valkyrja__off';
// Remembers per tab the chosen theme, so a reload starts in it instead of flashing the default one.
const THEME_KEY = '__valkyrja__theme';

function rememberedTheme(): string {
    try {
        return sessionStorage.getItem(THEME_KEY) ?? DEFAULT_THEME_ID;
    } catch {
        return DEFAULT_THEME_ID;
    }
}

function rememberTheme(id: string): void {
    try {
        sessionStorage.setItem(THEME_KEY, id);
    } catch {
        // Storage can be blocked; the only cost is a short flash on reload.
    }
}

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
    const css = siteCSS(location.hostname, browser.runtime.getURL('fonts'), activeTokens());
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
        createOrUpdateDynamicTheme(engineTheme(), list, isIFrame);
    } else {
        createOrUpdateDynamicThemeInternal(engineTheme(), null, isIFrame);
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
    const settings = await loadSettings();
    const on = isOnFor(settings, location.hostname);
    rememberOff(!on);
    if (settings.theme !== activeThemeId()) {
        // A new theme: drop everything coloured with the old one, then colour again.
        setRunning(false);
        setActiveTheme(settings.theme);
        clearColorModificationCache();
    }
    rememberTheme(activeThemeId());
    setRunning(on);
}

// Start at once (before the first paint) unless this tab already knows the site is off; settings then confirm.
setActiveTheme(rememberedTheme());
setRunning(!wasOff());
sync();
onSettingsChanged(sync);
