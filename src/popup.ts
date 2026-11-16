/*
 * Toolbar popup: master switch, a switch for the current site, and the all-sites permission button.
 */
import {isOnFor, loadSettings, saveSettings} from './settings';

declare const browser: any;

const ALL_SITES = {origins: ['<all_urls>']};
const enabledBox = document.getElementById('enabled') as HTMLInputElement;
const siteRow = document.getElementById('site-row') as HTMLElement;
const siteName = document.getElementById('site-name') as HTMLElement;
const siteBox = document.getElementById('site') as HTMLInputElement;
const grantButton = document.getElementById('grant') as HTMLButtonElement;

async function currentHost(): Promise<string> {
    const [tab] = await browser.tabs.query({active: true, currentWindow: true});
    try {
        const url = new URL(tab?.url ?? '');
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.hostname : '';
    } catch {
        return '';
    }
}

async function render(): Promise<void> {
    const [settings, host, granted] = await Promise.all([loadSettings(), currentHost(), browser.permissions.contains(ALL_SITES)]);
    enabledBox.checked = settings.enabled;
    siteRow.hidden = !host;
    siteName.textContent = `On for ${host}`;
    siteBox.checked = isOnFor(settings, host);
    siteBox.disabled = !settings.enabled;
    grantButton.hidden = granted;

    enabledBox.onchange = async () => {
        await saveSettings({enabled: enabledBox.checked});
        render();
    };
    siteBox.onchange = async () => {
        const others = settings.disabledHosts.filter((h) => h !== host);
        await saveSettings({disabledHosts: siteBox.checked ? others : [...others, host]});
        render();
    };
}

// permissions.request must be called straight from the click.
grantButton.onclick = () => browser.permissions.request(ALL_SITES).then(render);

render();
