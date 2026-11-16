/*
 * Theme mapping: turns any page colour into a colour of the active theme.
 * Pure functions on HSL values; the engine calls them once per distinct colour and caches the result.
 *
 * A theme is a set of named tokens (src/themes.json), the single source of truth for every colour the add-on produces:
 *   base             the page
 *   s1, s2, s3       raised surfaces, one step each
 *   line, lineHi     quiet and strong structure lines
 *   text, text2, text3   body text, dim text, dimmer text
 *   accent           links and primary actions (blue inputs)
 *   accent2          teal and cyan inputs
 *   accent3          violet and magenta inputs
 *   good, warn, bad  green, orange/yellow and red inputs
 *   sel              selected-text highlight
 */
import themesJson from './themes.json';

export interface HSLA {
    h: number;
    s: number;
    l: number;
    a?: number;
}

export type TokenName =
    'base' | 's1' | 's2' | 's3' | 'line' | 'lineHi' | 'text' | 'text2' | 'text3' |
    'accent' | 'accent2' | 'accent3' | 'good' | 'warn' | 'bad' | 'sel';

export type ThemeTokens = Record<TokenName, string> & {label: string};

export const THEMES = themesJson as Record<string, ThemeTokens>;
export const DEFAULT_THEME_ID = 'nott';

const MIN_ACCENT_BG_LIGHTNESS = 0.12;

type RGB = [number, number, number];
type Stop = [number, RGB];

function rgbOf(hex: string): RGB {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as RGB;
}

function hslOf([r, g, b]: RGB): HSLA {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const c = max - min;
    if (c === 0) {
        return {h: 0, s: 0, l};
    }
    const s = c / (1 - Math.abs(2 * l - 1));
    const h = max === r ? ((g - b) / c + 6) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
    return {h: h * 60, s, l};
}

function clamp(x: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, x));
}

/** The colour at position x on a ramp of stops, mixed in RGB between the two nearest stops. */
function ramp(x: number, stops: Stop[]): HSLA {
    if (x <= stops[0][0]) {
        return hslOf(stops[0][1]);
    }
    for (let i = 1; i < stops.length; i++) {
        const [x1, c1] = stops[i];
        if (x <= x1) {
            const [x0, c0] = stops[i - 1];
            const t = (x - x0) / (x1 - x0);
            return hslOf(c0.map((v, k) => v + (c1[k] - v) * t) as RGB);
        }
    }
    return hslOf(stops[stops.length - 1][1]);
}

interface Compiled {
    id: string;
    tokens: ThemeTokens;
    hsl: Record<TokenName, HSLA>;
    lightBg: Stop[];
    darkBg: Stop[];
    textDim: Stop[];
    border: Stop[];
    fillMax: Record<TokenName, number>;
}

function rgbOfHsl({h, s, l}: HSLA): RGB {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [r + m, g + m, b + m];
}

/** WCAG relative luminance. */
export function luminance(color: HSLA): number {
    const [r, g, b] = rgbOfHsl(color).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A fill carries the page's own light text, so it may be as bright as still leaves that text readable (about 5:1). */
export const MAX_FILL_LUMINANCE = 0.16;

/** The highest lightness at which a token's hue, at full token saturation, stays under the fill luminance limit. */
function fillLightness(token: HSLA): number {
    let low = MIN_ACCENT_BG_LIGHTNESS;
    let high = token.l;
    if (luminance(token) <= MAX_FILL_LUMINANCE) {
        return high;
    }
    for (let i = 0; i < 20; i++) {
        const mid = (low + high) / 2;
        if (luminance({h: token.h, s: token.s, l: mid}) <= MAX_FILL_LUMINANCE) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return low;
}

function compile(id: string): Compiled {
    const tokens = THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
    const rgb = (name: TokenName) => rgbOf(tokens[name]);
    const hsl = {} as Record<TokenName, HSLA>;
    for (const [name, value] of Object.entries(tokens)) {
        if (name !== 'label') {
            hsl[name as TokenName] = hslOf(rgbOf(value));
        }
    }
    const fillMax = {} as Record<TokenName, number>;
    for (const name of Object.keys(hsl) as TokenName[]) {
        fillMax[name] = fillLightness(hsl[name]);
    }
    return {
        id: THEMES[id] ? id : DEFAULT_THEME_ID,
        tokens,
        hsl,
        fillMax,
        // Light pages, by distance from white: white is the page, each grey step a raised surface.
        lightBg: [[0, rgb('base')], [0.03, rgb('s1')], [0.08, rgb('s2')], [0.18, rgb('s3')], [0.5, rgb('s3')]],
        // Dark pages, by lightness: the site's own page is the base and its own steps stay as steps.
        darkBg: [[0.08, rgb('base')], [0.12, rgb('s1')], [0.16, rgb('s2')], [0.22, rgb('s3')], [0.5, rgb('line')]],
        // Neutral text, by how far it is from full strength (0 = black on white or white on black).
        textDim: [[0.4, rgb('text')], [0.8, rgb('text2')], [1, rgb('text3')]],
        // Neutral borders, by distance from mid grey: faint hairlines are quiet, mid greys are strong.
        border: [[0.1, rgb('lineHi')], [0.35, rgb('line')]],
    };
}

let active = compile(DEFAULT_THEME_ID);

/** Chooses the theme every mapping below uses. An unknown id falls back to the default. */
export function setActiveTheme(id: string): void {
    if (id !== active.id) {
        active = compile(id);
    }
}

export function activeThemeId(): string {
    return active.id;
}

export function activeTokens(): ThemeTokens {
    return active.tokens;
}

/** Which token a saturated hue lands on. Each hue range keeps its own colour, so colour differences stay visible. */
export function familyOf(h: number): TokenName {
    const hue = ((h % 360) + 360) % 360;
    if (hue >= 345 || hue < 15) {
        return 'bad';
    }
    if (hue < 70) {
        return 'warn';
    }
    if (hue < 165) {
        return 'good';
    }
    if (hue < 200) {
        return 'accent2';
    }
    if (hue < 255) {
        return 'accent';
    }
    return 'accent3';
}

function scale(x: number, inLow: number, inHigh: number, outLow: number, outHigh: number): number {
    return ((x - inLow) * (outHigh - outLow)) / (inHigh - inLow) + outLow;
}

/** Backgrounds: neutrals land on base and the surface steps; saturated fills become deep, fully coloured fills of their token. */
export function mapBackground({h, s, l, a}: HSLA): HSLA {
    const isDark = l < 0.5;
    const isPaleBlue = l > 0.8 && h > 200 && h < 280;
    // Dark blue-greys (the surfaces of sites that ship their own dark theme) and faint tints count as neutral.
    const isDarkTint = l < 0.25 && s < 0.5;
    const isFaintTint = l > 0.85 && s < 0.25;
    if (s < 0.12 || isPaleBlue || isDarkTint || isFaintTint) {
        return {...(isDark ? ramp(l, active.darkBg) : ramp(1 - l, active.lightBg)), a};
    }
    const family = familyOf(h);
    const token = active.hsl[family];
    // The fill carries the page's own (light) text: a strong fill is the token's colour at the brightest
    // lightness that keeps that text readable; pale tints and very dark fills step down from there.
    const max = active.fillMax[family];
    const lx = isDark ?
        scale(l, 0, 0.5, 0.06, max) :
        scale(l, 0.5, 1, max, MIN_ACCENT_BG_LIGHTNESS);
    return {h: token.h, s: s >= 0.5 ? token.s : Math.min(s + 0.2, token.s), l: lx, a};
}

/** Text: neutrals become text, text2 or text3 by their strength; saturated text becomes its token. */
export function mapForeground({h, s, l, a}: HSLA): HSLA {
    // Near-black and near-white text is body text whatever its tint.
    if (l < 0.2 || l > 0.88 || s < 0.24) {
        return {...ramp(1 - Math.abs(l - 0.5) * 2, active.textDim), a};
    }
    return {...active.hsl[familyOf(h)], a};
}

/** A faint hairline that reads on white disappears on a dark page, so translucent lines get more opacity. */
function liftAlpha(a: number | undefined): number | undefined {
    return a == null || a >= 1 ? a : 1 - (1 - a) ** 3;
}

/** Borders: neutrals become line (or lineHi for mid greys); saturated borders keep their token, a little dimmer. */
export function mapBorder({h, s, l, a}: HSLA): HSLA {
    if (l < 0.2 || s < 0.24) {
        // Black borders are the hairlines of light sites; they are quiet lines too.
        const strength = l < 0.2 ? 0.5 : Math.abs(l - 0.5);
        return {...ramp(strength, active.border), a: liftAlpha(a)};
    }
    const token = active.hsl[familyOf(h)];
    return {h: token.h, s: token.s, l: token.l * 0.85, a};
}

/**
 * Shadows: a dark drop shadow is invisible on a dark page, so a neutral shadow becomes a quiet line-coloured edge.
 * That keeps shadow-only cards and buttons apart from the page. Coloured shadows (focus rings) keep their token.
 */
export function mapShadow({h, s, l, a}: HSLA): HSLA {
    if (l < 0.2 || s < 0.24) {
        return {...active.hsl.line, a: liftAlpha(a)};
    }
    return {...active.hsl[familyOf(h)], a};
}
