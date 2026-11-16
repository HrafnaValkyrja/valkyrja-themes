/*
 * Valkyrja palette mapping: turns any page colour into the Valkyrja Night palette.
 * Pure functions on HSL values; the engine calls them once per distinct colour and caches the result.
 *
 * Palette (the single source of truth for every colour the add-on produces):
 *   black      #000000  page body
 *   night sky  #131029  raised surfaces (hue 247)
 *   indigo     #5b4bd6  structure: borders, secondary fills
 *   cyan       #4fe0ff  main accent: links, primary actions
 *   ice        #8fd3ff  quiet accent
 *   text       #dce8f5  body text
 *   pink       #ff3d9a  meaning only: errors, destructive actions, alerts
 */

export interface HSLA {
    h: number;
    s: number;
    l: number;
    a?: number;
}

export const PALETTE = {
    black: '#000000',
    nightSky: '#131029',
    surface: '#0a0818',
    indigo: '#5b4bd6',
    cyan: '#4fe0ff',
    ice: '#8fd3ff',
    text: '#dce8f5',
    pink: '#ff3d9a',
} as const;

const HUE = {indigo: 247, cyan: 191, ice: 204, text: 211, pink: 331};

/** A palette family for a saturated input colour. */
export type Family = 'pink' | 'ice' | 'cyan' | 'indigo';

/**
 * Which palette family a saturated hue lands in.
 * Reds keep their meaning (pink). Warm yellows have no palette member and become quiet ice.
 * Greens and blues become cyan; violets and magentas become indigo.
 */
export function familyOf(h: number): Family {
    const hue = ((h % 360) + 360) % 360;
    // Red stops at 12: brand oranges and clay tones (hue 13 to 25) are accents, not errors.
    if (hue >= 335 || hue < 12) {
        return 'pink';
    }
    if (hue < 70) {
        return 'ice';
    }
    if (hue < 225) {
        return 'cyan';
    }
    return 'indigo';
}

function scale(x: number, inLow: number, inHigh: number, outLow: number, outHigh: number): number {
    return ((x - inLow) * (outHigh - outLow)) / (inHigh - inLow) + outLow;
}

function clamp(x: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, x));
}

const SURFACE_SATURATION = 0.45;
// Surface steps follow her Firefox theme (#0a0818 fields, #131029 frame) and the Argus themes (surfaces up to about 0.2).
const PAGE_BG_LIGHTNESS = 0.065;
const DARK_FLOOR_LIGHTNESS = 0.05;
const MAX_NEUTRAL_BG_LIGHTNESS = 0.25;
const MAX_ACCENT_BG_LIGHTNESS = 0.32;
const MIN_ACCENT_BG_LIGHTNESS = 0.12;

/** Backgrounds: neutrals fall to black with a night-sky tint; saturated fills become dim palette fills. */
export function mapBackground({h, s, l, a}: HSLA): HSLA {
    const isDark = l < 0.5;
    const isPaleBlue = l > 0.8 && h > 200 && h < 280;
    // Dark blue-greys (the surfaces of sites that ship their own dark theme) and faint tints count as neutral.
    const isDarkTint = l < 0.25 && s < 0.5;
    const isFaintTint = l > 0.85 && s < 0.25;
    const isNeutral = s < 0.12 || isPaleBlue || isDarkTint || isFaintTint;
    if (isNeutral) {
        // Light pages: white is the page (near black); each step of grey is a clearly raised tier.
        // The square root keeps near-white greys apart, which a straight line would crush together.
        // Nothing is true black: the darkest ground is the night sky of her browser theme (#0a0818).
        // Dark pages keep most of their own lightness, so the site's own surface steps stay visible.
        const lx = isDark ?
            (l < 0.25 ? DARK_FLOOR_LIGHTNESS + l * 0.75 : scale(l, 0.25, 0.5, 0.2375, MAX_NEUTRAL_BG_LIGHTNESS)) :
            PAGE_BG_LIGHTNESS + (MAX_NEUTRAL_BG_LIGHTNESS - PAGE_BG_LIGHTNESS) * Math.sqrt(clamp((1 - l) / 0.5, 0, 1));
        return {h: HUE.indigo, s: SURFACE_SATURATION, l: lx, a};
    }
    // Warm fills (orange and yellow bars, banners) become indigo: ice is a text colour, and as a fill it reads as dull slate.
    const family = familyOf(h) === 'ice' ? 'indigo' : familyOf(h);
    const lx = isDark ?
        scale(l, 0, 0.5, 0, MAX_ACCENT_BG_LIGHTNESS) :
        scale(l, 0.5, 1, MAX_ACCENT_BG_LIGHTNESS, MIN_ACCENT_BG_LIGHTNESS);
    const sx = family === 'indigo' ? Math.min(s, 0.63) : family === 'ice' ? Math.min(s, 0.5) : s;
    return {h: HUE[family], s: sx, l: lx, a};
}

const TEXT_LIGHTNESS = 0.91;
const TEXT_SATURATION = 0.56;
const MIN_TEXT_LIGHTNESS = 0.68;

/** Text: neutrals become the body text colour (dimmer for greys); saturated text becomes a bright palette colour. */
export function mapForeground({h, s, l, a}: HSLA): HSLA {
    const isLight = l > 0.5;
    // Near-black and near-white text is body text whatever its tint.
    const isNeutral = l < 0.2 || l > 0.88 || s < 0.24;
    if (isNeutral) {
        const lx = isLight ?
            scale(l, 0.5, 1, MIN_TEXT_LIGHTNESS, TEXT_LIGHTNESS) :
            scale(l, 0, 0.5, TEXT_LIGHTNESS, MIN_TEXT_LIGHTNESS);
        const sx = scale(lx, MIN_TEXT_LIGHTNESS, TEXT_LIGHTNESS, 0.25, TEXT_SATURATION);
        return {h: HUE.text, s: sx, l: lx, a};
    }
    const family = familyOf(h);
    // Distance from mid lightness, 0 (mid) to 1 (very dark or very light): stronger inputs get lighter text.
    const d = clamp(Math.abs(l - 0.5) * 2, 0, 1);
    switch (family) {
        case 'pink':
            return {h: HUE.pink, s: 1, l: scale(d, 0, 1, 0.62, 0.74), a};
        case 'ice':
            return {h: HUE.ice, s: 0.7, l: scale(d, 0, 1, 0.74, 0.84), a};
        case 'cyan':
            return {h: HUE.cyan, s: 1, l: scale(d, 0, 1, 0.655, 0.78), a};
        default:
            return {h: HUE.indigo, s: 0.85, l: scale(d, 0, 1, 0.74, 0.84), a};
    }
}

/** A faint hairline that reads on white disappears on black, so translucent lines get more opacity. */
function liftAlpha(a: number | undefined): number | undefined {
    return a == null || a >= 1 ? a : 1 - (1 - a) ** 3;
}

/** Borders: neutrals become quiet indigo structure lines; saturated borders keep their palette family. */
export function mapBorder({h, s, l, a}: HSLA): HSLA {
    const isNeutral = l < 0.2 || s < 0.24;
    if (isNeutral) {
        return {h: HUE.indigo, s: 0.55, l: scale(l, 0, 1, 0.56, 0.36), a: liftAlpha(a)};
    }
    const family = familyOf(h);
    const sx = family === 'indigo' ? 0.63 : family === 'ice' ? 0.6 : 1;
    return {h: HUE[family], s: sx, l: scale(l, 0, 1, 0.66, 0.46), a};
}

/**
 * Shadows: a dark drop shadow is invisible on a black page, so a neutral shadow becomes a soft indigo glow.
 * That keeps shadow-only cards and buttons apart from the page. Coloured shadows (focus rings) keep their family.
 */
export function mapShadow({h, s, l, a}: HSLA): HSLA {
    const isNeutral = l < 0.2 || s < 0.24;
    if (isNeutral) {
        return {h: HUE.indigo, s: 0.63, l: 0.5, a: liftAlpha(a)};
    }
    const family = familyOf(h);
    return {h: HUE[family], s: family === 'indigo' ? 0.63 : s, l: 0.55, a};
}
