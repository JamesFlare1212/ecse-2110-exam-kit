# Flux design system

Flux / 电能系统习题室 is an engineering reading and study workspace, evolved from
Fieldnotes (the existing design-system directory name is retained). Its
visual direction is content-first and academic: clear hierarchy, a warm paper
surface, restrained color and reproducible scientific illustrations. It is not a
portfolio, marketing landing page or publication gallery.

## Rule ownership and precedence

- Start with this file, then read `design-system/fieldnotes/pages/[page-name].md`
  (relative to the repository root). Page-specific rules override these general
  rules; the current workspace uses [pages/study.md](pages/study.md).
- Repository instructions in [AGENTS.md](../../AGENTS.md) and the authored-content
  contract in [content/README.md](../../content/README.md) remain applicable.
- [src/styles/layout.css](../../src/styles/layout.css) owns the implemented light
  and dark theme values, typography and layout. Update that source when changing
  tokens; do not introduce a second palette or copy generated template CSS.
- [components.json](../../components.json) owns component aliases, the native
  shadcn-svelte style and the icon library. Use the installed Svelte components,
  not React examples or parallel handcrafted control styles.

## Color and typography

Use semantic tokens rather than per-component literal colors:

| Purpose | Tokens |
|---------|--------|
| Reading surface and text | `--background`, `--foreground` |
| Cards and overlays | `--card`, `--card-foreground`, `--popover`, `--popover-foreground` |
| Primary action | `--primary`, `--primary-foreground` |
| Supporting states | `--secondary`, `--secondary-foreground`, `--accent`, `--accent-foreground` |
| Muted content | `--muted`, `--muted-foreground` |
| Boundaries and focus | `--border`, `--input`, `--ring` |
| Formula references | `--formula` |
| Navigation, reference rail and diagrams | `--sidebar`, `--rail`, `--diagram` |
| Destructive actions | `--destructive` |

The light theme uses warm off-white surfaces, dark ink, burnt-orange primary
actions and teal formula links. The dark theme has its own semantic values in
`layout.css`; do not add manual per-component dark palettes.

- Latin headings and the wordmark use Georgia or an available system serif.
- Interface and Latin body text use self-hosted Inter. Chinese body and heading
  text use system Chinese sans-serif fallbacks, not a downloaded CJK webfont.
- KaTeX controls mathematical typography and uses locally supplied fonts.
- Chinese SVG labels embed offline subsets of the local Noto Sans SC package.
  These embedded diagram fonts are separate from the document's body fonts.
- Do not add Google Fonts imports or other runtime external font requests.

## Components and layout

- Compose native shadcn-svelte / Bits UI primitives using the `#lib` aliases and
  built-in variants. Preserve keyboard behavior, accessible names and state.
- Reuse the existing global CSS and component spacing, radii and shadow rules.
  This document does not define additional `--space-*` or shadow token families.
- Keep long-form reading central. Study-specific column widths, breakpoints,
  collapsible sidebars, figure dimensions and PDF controls are specified in
  [pages/study.md](pages/study.md).
- Use borders and restrained emphasis rather than floating portfolio cards,
  decorative hero sections or hover movement on ordinary reading surfaces.
- Keep diagrams static SVGs and preserve source-image and PDF navigation.
  Formula overflow scrolls inside the formula; never shrink the whole page or
  introduce page-wide horizontal scrolling to fit a derivation.

## Interaction and accessibility

- Use the configured Lucide SVG icons consistently, with accessible labels for
  icon-only controls and hidden decorative icons beside readable labels.
- Keep focus visible, outside collapsed inert panels and clear of sticky bars.
- Check text and meaningful control contrast in both themes; do not communicate
  completion, selection or errors by color alone.
- Use subtle, non-layout-shifting transitions where useful. Immediate feedback is
  valid; respect `prefers-reduced-motion` rather than requiring every state change
  to animate.
- Respect native disabled states and provide clear loading and failure feedback.
- Keep static question text readable before hydration and without JavaScript.

## Verification

For UI changes, follow [AGENTS.md](../../AGENTS.md): run `bun run check`, `bun test`
and `bun run build`, then exercise affected interactions at desktop and phone
widths. Check keyboard focus, both themes and reduced motion. After scientific
figure changes, run `python3 scripts/check_figures.py`; its layout checks precede
Chinese SVG label replacement, so also inspect the final localized diagrams.
