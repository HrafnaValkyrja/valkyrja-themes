/*
 * Site modules: shapes and fonts for a few sites, layered on top of the colour engine.
 * A module never sets a literal colour; it uses the --vk-* properties defined here from the active theme.
 */
import type {ThemeTokens} from '../palette';

import claude from './claude.css';
import fonts from './fonts.css';
import github from './github.css';
import google from './google.css';

const SITES: Array<{host: RegExp; css: string}> = [
    {host: /^claude\.ai$/, css: claude},
    {host: /(^|\.)github\.com$/, css: github},
    {host: /^www\.google\.[a-z.]+$/, css: google},
];

function tokensCSS(t: ThemeTokens): string {
    return `:root {
  --vk-page: ${t.base};
  --vk-surface: ${t.s1};
  --vk-line: ${t.lineHi};
  --vk-accent: ${t.accent};
  --vk-text: ${t.text};
}`;
}

/** The extra style sheet for a host, or null when the host has no module. */
export function siteCSS(hostname: string, fontsURL: string, tokens: ThemeTokens): string | null {
    const site = SITES.find(({host}) => host.test(hostname));
    if (!site) {
        return null;
    }
    return [fonts.replaceAll('__VK_FONTS__', fontsURL.replace(/\/$/, '')), tokensCSS(tokens), site.css].join('\n');
}
