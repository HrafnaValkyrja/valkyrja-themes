# Valkyrja Themes

One Firefox add-on that turns every website into a dark theme you choose in its popup: Nott (true black, the default), Valkyrja Night and nine more. The browser window takes the same colours. It also colours the browser window itself.

It replaces the earlier per-site add-ons (Valkyrja Night for Claude, for GitHub) with a single engine, so a site changing its markup no longer breaks the theme.

## How it works

- `engine/` is a copy of the dynamic-theme engine from [Dark Reader](https://github.com/darkreader/darkreader) (MIT). It reads a page's style sheets and rewrites every colour.
- `src/themes.json` holds the themes: each is a set of named colour tokens, the only place a colour is chosen.
- `src/palette.ts` decides which token each page colour becomes.
- `src/sites/` adds fonts and angular shapes on a few sites (claude.ai, GitHub, Google search). These modules never set a colour of their own.
- The toolbar button opens a switch: on or off everywhere, and on or off for the current site.

## Build and check

Needs Node 22 or newer.

```
npm ci
npm run build     # writes dist/addon
npm test          # palette tests
```

Load `dist/addon` through `about:debugging` > This Firefox > Load Temporary Add-on.

The scripts in `tools/` drive a headless Firefox with a throwaway profile (they need Python, Selenium and geckodriver):

- `tools/shoot.py <out-dir> <url>...` saves screenshots of real pages.
- `tools/switch_check.py` checks the on/off switch.
- `tools/font_check.py <url>...` reports the loaded fonts and saves a screenshot.
- `tools/window_shot.py <out.png>` saves a picture of the browser window itself (tabs, toolbar).
- `tools/fixture_shot.py <dir> <host> <out.png>` renders a saved page under the host name it came from.

## Status

Version 0.1.0, not yet on addons.mozilla.org.

## Licence

MPL-2.0 for this project's own code (`LICENSE`). The engine and its site fixes list are MIT, the bundled fonts are OFL 1.1; see `THIRD-PARTY.md`.

## Updates

The installed add-on updates itself: Firefox reads `updates.json` on the main branch, which names the newest signed file (a release asset on this repo).
