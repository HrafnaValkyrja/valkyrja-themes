/*
 * Toolbar popup: master switch, a switch for the current site, the theme picker (a grid of small previews),
 * and the all-sites permission button.
 */
import {THEMES, mapBackground, setActiveTheme} from './palette';
import {isOnFor, loadSettings, saveSettings} from './settings';

declare const browser: any;

const ALL_SITES = {origins: ['<all_urls>']};
const enabledBox = document.getElementById('enabled') as HTMLInputElement;
const siteRow = document.getElementById('site-row') as HTMLElement;
const siteName = document.getElementById('site-name') as HTMLElement;
const siteBox = document.getElementById('site') as HTMLInputElement;
const themeGrid = document.getElementById('themes') as HTMLElement;
const grantButton = document.getElementById('grant') as HTMLButtonElement;

// One card per theme: a small page drawn in that theme's own colours, so a theme is chosen by its look.
const DOTS = ['accent', 'accent2', 'accent3', 'good', 'warn', 'bad'] as const;
const cards = new Map<string, HTMLButtonElement>();
for (const [id, theme] of Object.entries(THEMES)) {
    const card = document.createElement('button');
    card.className = 'card';
    card.type = 'button';
    card.dataset.theme = id;
    card.setAttribute('role', 'radio');
    card.title = theme.label;
    for (const [name, value] of Object.entries(theme)) {
        if (name !== 'label') {
            card.style.setProperty(`--t-${name}`, value);
        }
    }
    setActiveTheme(id);
    const fill = mapBackground({h: 215, s: 0.9, l: 0.5, a: 1});
    card.style.setProperty('--t-fill', `hsl(${fill.h}, ${fill.s * 100}%, ${fill.l * 100}%)`);
    const mini = document.createElement('span');
    mini.className = 'mini';
    mini.innerHTML = '<span class="side"><i></i><b></b><b></b><b></b></span><span class="main"><u></u><u></u><s></s></span>';
    const dots = document.createElement('span');
    dots.className = 'dots';
    for (const token of DOTS) {
        const dot = document.createElement('span');
        dot.style.background = theme[token];
        dots.append(dot);
    }
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = theme.label;
    card.append(mini, dots, name);
    themeGrid.append(card);
    cards.set(id, card);
}

async function currentHost(): Promise<string> {
    const [tab] = await browser.tabs.query({active: true, currentWindow: true});
    try {
        const url = new URL(tab?.url ?? '');
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.hostname : '';
    } catch {
        return '';
    }
}

// The popup wears the chosen theme itself.
function paint(themeId: string): void {
    const tokens = THEMES[themeId] ?? THEMES[Object.keys(THEMES)[0]];
    for (const [name, value] of Object.entries(tokens)) {
        if (name !== 'label') {
            document.documentElement.style.setProperty(`--${name}`, value);
        }
    }
}

async function render(): Promise<void> {
    const [settings, host, granted] = await Promise.all([loadSettings(), currentHost(), browser.permissions.contains(ALL_SITES)]);
    enabledBox.checked = settings.enabled;
    siteRow.hidden = !host;
    siteName.textContent = `On for ${host}`;
    siteBox.checked = isOnFor(settings, host);
    siteBox.disabled = !settings.enabled;
    for (const [id, card] of cards) {
        card.setAttribute('aria-checked', String(id === settings.theme));
        card.onclick = async () => {
            await saveSettings({theme: id});
            render();
        };
    }
    paint(settings.theme);
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
