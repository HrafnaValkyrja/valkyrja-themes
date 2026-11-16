/*
 * Site modules: shapes and fonts for a few sites, layered on top of the colour engine.
 * A module never sets a literal colour; it uses the --vk-* properties defined here from the palette.
 */
import {PALETTE} from '../palette';

import claude from './claude.css';
import fonts from './fonts.css';
import github from './github.css';
import google from './google.css';

const SITES: Array<{host: RegExp; css: string}> = [
    {host: /^claude\.ai$/, css: claude},
    {host: /(^|\.)github\.com$/, css: github},
    {host: /^www\.google\.[a-z.]+$/, css: google},
];

const TOKENS = `:root {
  --vk-page: ${PALETTE.black};
  --vk-surface: ${PALETTE.surface};
  --vk-line: ${PALETTE.indigo};
  --vk-accent: ${PALETTE.cyan};
  --vk-text: ${PALETTE.text};
}`;

/** The extra style sheet for a host, or null when the host has no module. */
export function siteCSS(hostname: string, fontsURL: string): string | null {
    const site = SITES.find(({host}) => host.test(hostname));
    if (!site) {
        return null;
    }
    return [fonts.replaceAll('__VK_FONTS__', fontsURL.replace(/\/$/, '')), TOKENS, site.css].join('\n');
}
