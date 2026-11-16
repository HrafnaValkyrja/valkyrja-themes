/*
 * Settings: persistent state in browser.storage.local, the one source of truth for on/off and the chosen theme.
 */
import {DEFAULT_THEME_ID} from './palette';

declare const browser: any;

export interface Settings {
    /** Master switch: false turns the add-on off on every site. */
    enabled: boolean;
    /** Host names where the add-on is off while the master switch is on. */
    disabledHosts: string[];
    /** Id of the chosen theme (a key of src/themes.json). */
    theme: string;
}

export const DEFAULT_SETTINGS: Settings = {enabled: true, disabledHosts: [], theme: DEFAULT_THEME_ID};

export async function loadSettings(): Promise<Settings> {
    return {...DEFAULT_SETTINGS, ...(await browser.storage.local.get(DEFAULT_SETTINGS))};
}

export function saveSettings(settings: Partial<Settings>): Promise<void> {
    return browser.storage.local.set(settings);
}

export function isOnFor(settings: Settings, host: string): boolean {
    return settings.enabled && !settings.disabledHosts.includes(host);
}

export function onSettingsChanged(callback: () => void): void {
    browser.storage.onChanged.addListener((_changes: unknown, area: string) => {
        if (area === 'local') {
            callback();
        }
    });
}
