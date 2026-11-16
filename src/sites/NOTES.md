# Per-site shape and type notes

Line numbers refer to the original hand-written site stylesheets.

## claude.css (claude.ai)
- Kept: font-family tokens (src l.141-144), heading font + letter-spacing (l.152), code-card chamfer (clip-path, `--vk-cut`, 1px ring via `::after`, l.181-198), dialog/menu chamfer with border-width and corner gradients (l.202-211), 2px button/banner radius (l.214-215), square composer (l.218-220), flat inline code (l.221), italic hljs comments (l.222).
- Dropped: all design-token colour ramps (l.20-146 except fonts), header gradient and hairline (l.155-167), links, selection, caret, pre background, hljs colours.
- Fragile: `:has(> pre code):not(...)` chains and the composer `:has(> * > [contenteditable])` chain (l.218, depth unconfirmed); `[class*="bg-danger"]` (l.215); `.code-block__code`.
- Unsure: the edge colour of the dialog/menu is now var(--vk-line) via border-color (source used a literal indigo); the final background layer used a site token, now var(--vk-surface).

## github.css (github.com)
- Kept: only the four `--fontStack-*` font tokens (l.163-166).
- Dropped: every colour token (l.19-160), header hairline gradient (l.176-179), repo label colour formula (l.183-189), selection, page background.
- Fragile: none kept. Dropped label rule used `[class*="Token-IssueLabel"]` (l.183).
- Unsure: header hairline (l.176) is a 1px line made with a gradient border-image; dropped as colour, may want a shape-only equivalent (border-bottom var(--vk-line)).
- The second source file (dark-base.css) holds only colour tokens; nothing kept from it.

## google.css (google search)
- Kept: three 1px inset ring/edge box-shadows (l.122, 128, 130), now using var(--vk-line).
- Dropped: Google's colour custom-property map (l.44-110), all background rules (l.116-132), fades and gradients (l.118, 124), selection. There are no font rules in the source, only @font-face (now in fonts.css).
- Fragile: all three selectors are generated or churn-prone: `[jsname="NlVIob"]`, `.A918Hf::after`, `.pla-unit[style*="background"]`; all scoped by `body[data-dt="1"]`.
- Unsure: the box-shadow rules were paired with a background fill in the source (l.122, 128, 130); only the ring is kept.
