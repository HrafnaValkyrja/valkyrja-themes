/*
 * Background event page.
 * 1. Fetches cross-origin stylesheets and images for the engine (a page cannot read them itself).
 * 2. Colours the browser window (tabs, toolbar, sidebar) with the Valkyrja palette.
 * 3. Looks up the per-site fixes (Dark Reader's list) for a page that asks.
 */
import {getDynamicThemeFixesFor} from '../engine/generators/dynamic-theme';
import {indexSitesFixesConfig} from '../engine/generators/utils/parse';
import type {SiteFixesIndex} from '../engine/generators/utils/parse';

import chromeTheme from './chrome-theme.json';

declare const browser: any;

interface FetchMessage {
    type: string;
    id: string;
    data: {url: string; responseType: 'data-url' | 'text'; mimeType?: string; origin: string};
}

const FETCH = 'cs-bg-fetch';
const FETCH_RESPONSE = 'bg-cs-fetch-response';

function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

async function load({url, responseType, mimeType}: FetchMessage['data']): Promise<string> {
    const response = await fetch(url, {cache: 'force-cache', credentials: 'omit'});
    if (!response.ok) {
        throw new Error(`Unable to load ${url} ${response.status}`);
    }
    const contentType = response.headers.get('Content-Type');
    if (mimeType && !(contentType === mimeType || contentType?.startsWith(`${mimeType};`))) {
        throw new Error(`Mime type mismatch when loading ${url}`);
    }
    return responseType === 'data-url' ? blobToDataURL(await response.blob()) : response.text();
}

browser.runtime.onMessage.addListener((message: FetchMessage, sender: any) => {
    if (message?.type !== FETCH || sender.tab?.id == null) {
        return;
    }
    const reply = (data: string | null, error: string | null) => browser.tabs
        .sendMessage(sender.tab.id, {type: FETCH_RESPONSE, data, error, id: message.id}, {frameId: sender.frameId})
        .catch(() => undefined);
    load(message.data).then((data) => reply(data, null), (err) => reply(null, String(err?.message ?? err)));
});

const GET_FIXES = 'get-fixes';
let fixesList: Promise<{text: string; index: SiteFixesIndex}> | null = null;

// The list is large, so it is read and indexed once per wake of this page, on first use.
function loadFixesList(): Promise<{text: string; index: SiteFixesIndex}> {
    fixesList ??= fetch(browser.runtime.getURL('dynamic-theme-fixes.config'))
        .then((response) => response.text())
        .then((raw) => {
            const text = raw.replace(/\r\n/g, '\n');
            return {text, index: indexSitesFixesConfig(text)};
        });
    return fixesList;
}

browser.runtime.onMessage.addListener((message: {type: string; url: string}) => {
    if (message?.type !== GET_FIXES) {
        return;
    }
    return loadFixesList()
        .then(({text, index}) => getDynamicThemeFixesFor(message.url, text, index, false))
        .catch(() => null);
});

function applyChromeTheme(): void {
    browser.theme.update(chromeTheme);
}

browser.runtime.onInstalled.addListener(applyChromeTheme);
browser.runtime.onStartup.addListener(applyChromeTheme);
