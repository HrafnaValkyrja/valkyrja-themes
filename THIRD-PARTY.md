# Third-party code

## Dark Reader (colour engine)

The `engine/` directory is a modified copy of part of the Dark Reader source
(https://github.com/darkreader/darkreader, version 4.9.135), used under the MIT licence.
The full licence text is in `engine/LICENSE` and ships inside the add-on as `ENGINE-LICENSE.txt`.

Changes made to the copied files are marked in the source with a `Valkyrja change:` comment:

- `engine/inject/dynamic-theme/modify-colors.ts`: dark-scheme colours go through the Valkyrja palette mapping in `src/palette.ts` instead of Dark Reader's own lightness-only mapping.
- `engine/inject/dynamic-theme/index.ts`: the page-world stylesheet proxy is always started through a dedicated content script instead of an inline script.
- `engine/inject/dynamic-theme/adopted-style-manger.ts`: the page's adopted style sheet list is copied by index before filtering, so sheets a page component adds later are re-coloured in Firefox.

`engine/config/dynamic-theme-fixes.config` is Dark Reader's per-site fixes list, unchanged.

Everything outside `engine/` is original to this project and licensed under MPL-2.0.
