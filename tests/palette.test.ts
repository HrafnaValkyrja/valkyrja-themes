import assert from 'node:assert/strict';
import {test} from 'node:test';

import {DEFAULT_THEME_ID, THEMES, activeTokens, familyOf, mapBackground, mapBorder, mapForeground, mapShadow, setActiveTheme} from '../src/palette';
import type {HSLA} from '../src/palette';

function hex({h, s, l}: HSLA): string {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

const grey = (l: number): HSLA => ({h: 0, s: 0, l, a: 1});

test('every theme has every token as a six-digit hex colour', () => {
    const names = Object.keys(THEMES[DEFAULT_THEME_ID]).sort();
    for (const [id, theme] of Object.entries(THEMES)) {
        assert.deepEqual(Object.keys(theme).sort(), names, id);
        for (const [name, value] of Object.entries(theme)) {
            if (name !== 'label') {
                assert.match(value, /^#[0-9a-f]{6}$/, `${id}.${name}`);
            }
        }
    }
});

for (const id of Object.keys(THEMES)) {
    test(`${id}: a white page is base, body text is text, a blue link is accent`, () => {
        setActiveTheme(id);
        const t = activeTokens();
        assert.equal(hex(mapBackground(grey(1))), t.base);
        assert.equal(hex(mapForeground(grey(0))), t.text);
        assert.equal(hex(mapForeground(grey(1))), t.text);
        assert.equal(hex(mapForeground({h: 215, s: 0.9, l: 0.45, a: 1})), t.accent);
        assert.equal(hex(mapShadow({h: 0, s: 0, l: 0, a: 1})), t.line);
    });
}

test('surfaces: light greys and dark-site steps land on the surface tokens', () => {
    setActiveTheme('nott');
    const t = activeTokens();
    assert.equal(hex(mapBackground(grey(0.97))), t.s1);
    assert.equal(hex(mapBackground(grey(0.92))), t.s2);
    assert.equal(hex(mapBackground(grey(0.7))), t.s3);
    // GitHub dark canvas #0d1117 is that site's page.
    assert.equal(hex(mapBackground({h: 216, s: 0.28, l: 0.07, a: 1})), t.base);
    assert.equal(hex(mapBackground(grey(0.12))), t.s1);
    assert.equal(hex(mapBackground(grey(0.22))), t.s3);
});

test('dim text steps down to text2 and text3', () => {
    setActiveTheme('nott');
    const t = activeTokens();
    assert.equal(hex(mapForeground(grey(0.2))), t.text);
    assert.equal(hex(mapForeground(grey(0.4))), t.text2);
    assert.equal(hex(mapForeground(grey(0.6))), t.text2);
    assert.equal(hex(mapForeground(grey(0.5))), t.text3);
});

test('hue families keep colours apart', () => {
    assert.equal(familyOf(0), 'bad');
    assert.equal(familyOf(350), 'bad');
    assert.equal(familyOf(30), 'warn');
    assert.equal(familyOf(130), 'good');
    assert.equal(familyOf(180), 'accent2');
    assert.equal(familyOf(215), 'accent');
    assert.equal(familyOf(280), 'accent3');
});

test('a saturated fill is a dim fill of its token hue', () => {
    setActiveTheme('nott');
    const out = mapBackground({h: 215, s: 0.9, l: 0.5, a: 1});
    assert.ok(Math.abs(out.h - 218) < 3);
    assert.ok(out.l <= 0.3);
});

test('borders: a faint light-site hairline is line, a mid grey is lineHi, a translucent one gets more opacity', () => {
    setActiveTheme('nott');
    const t = activeTokens();
    assert.equal(hex(mapBorder(grey(1))), t.line);
    assert.equal(hex(mapBorder(grey(0))), t.line);
    assert.equal(hex(mapBorder(grey(0.5))), t.lineHi);
    const faint = mapBorder({h: 0, s: 0, l: 0, a: 0.1});
    assert.ok(faint.a! > 0.25 && faint.a! < 1);
});

test('an unknown theme id falls back to the default', () => {
    setActiveTheme('no-such-theme');
    assert.equal(activeTokens(), THEMES[DEFAULT_THEME_ID]);
});
