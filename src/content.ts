/*
 * Content script: runs the colour engine on every page with the Valkyrja theme.
 */
import {DEFAULT_THEME} from '../engine/defaults';
import type {Theme} from '../engine/definitions';
import {createOrUpdateDynamicThemeInternal, removeDynamicTheme} from '../engine/inject/dynamic-theme';

import {PALETTE} from './palette';
import {isOnFor, loadSettings, onSettingsChanged} from './settings';

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
        createOrUpdateDynamicThemeInternal(theme, null, isIFrame);
    } else {
        removeDynamicTheme();
    }
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
