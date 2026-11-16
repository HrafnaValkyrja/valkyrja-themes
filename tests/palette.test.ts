import assert from 'node:assert/strict';
import {test} from 'node:test';

import {familyOf, mapBackground, mapBorder, mapForeground, mapShadow} from '../src/palette';

test('white page becomes true black', () => {
    assert.equal(mapBackground({h: 0, s: 0, l: 1, a: 1}).l, 0);
});

test('no neutral surface is lighter than night sky, light or dark', () => {
    for (let l = 0; l <= 1; l += 0.05) {
        assert.ok(mapBackground({h: 0, s: 0, l, a: 1}).l <= 0.1 + 1e-9, `grey ${l}`);
    }
});

test('light greys stay apart as raised tiers', () => {
    const page = mapBackground({h: 0, s: 0, l: 1, a: 1}).l;
    const card = mapBackground({h: 0, s: 0, l: 0.96, a: 1}).l;
    assert.ok(card - page > 0.02);
});

test('a dark blue-grey from a site dark theme is a neutral indigo surface', () => {
    // GitHub dark canvas #0d1117
    const out = mapBackground({h: 216, s: 0.28, l: 0.07, a: 1});
    assert.equal(out.h, 247);
    assert.ok(out.l < 0.05);
});

test('hue families: red is pink, green and blue are cyan, violet is indigo, yellow is ice', () => {
    assert.equal(familyOf(0), 'pink');
    assert.equal(familyOf(350), 'pink');
    assert.equal(familyOf(15), 'ice');
    assert.equal(familyOf(45), 'ice');
    assert.equal(familyOf(130), 'cyan');
    assert.equal(familyOf(210), 'cyan');
    assert.equal(familyOf(270), 'indigo');
});

test('black and near-white text become readable body text', () => {
    for (const input of [{h: 0, s: 0, l: 0}, {h: 210, s: 0.67, l: 0.96}]) {
        const out = mapForeground({...input, a: 1});
        assert.equal(out.h, 211);
        assert.ok(out.l > 0.85);
    }
});

test('saturated text is never darker than readable on black', () => {
    for (let h = 0; h < 360; h += 15) {
        for (const l of [0.1, 0.3, 0.5, 0.7]) {
            assert.ok(mapForeground({h, s: 0.9, l, a: 1}).l >= 0.6, `h${h} l${l}`);
        }
    }
});

test('a faint translucent hairline gets more opacity', () => {
    const out = mapBorder({h: 0, s: 0, l: 0, a: 0.1});
    assert.ok(out.a! > 0.25 && out.a! < 1);
    assert.equal(mapBorder({h: 0, s: 0, l: 0, a: 1}).a, 1);
});

test('a warm bar becomes an indigo bar, a red one stays pink', () => {
    // Hacker News header #ff6600
    assert.equal(mapBackground({h: 24, s: 1, l: 0.5, a: 1}).h, 247);
    assert.equal(mapBackground({h: 0, s: 1, l: 0.5, a: 1}).h, 331);
});

test('a faint black drop shadow becomes a visible indigo glow', () => {
    const glow = mapShadow({h: 0, s: 0, l: 0, a: 0.12});
    assert.equal(glow.h, 247);
    assert.ok(glow.l >= 0.4);
    assert.ok(glow.a! > 0.3);
});
