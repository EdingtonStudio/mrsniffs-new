# Mr. Sniff's — website

Homepage build from Figma `Mr. Sniff's website - Nov 12` → frame **Homepage** (`1:8`).
Static HTML/CSS/JS, no build step. Each section maps 1:1 to a future Shopify section.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Structure

```
index.html          sections in page order (Figma node ids noted in DESIGN map below)
css/tokens.css      color, type, space, motion, @font-face — single source of truth
css/main.css        primitives (btn, link, chip) → sections → reveal → responsive → reduced-motion
js/main.js          interaction modules (self-contained, no deps)
assets/img|icons|fonts
```

## Section map

| Section | Figma node | Interactions |
|---|---|---|
| Announcement + nav | `1:250` | Header condenses + blurs after banner, hides on scroll-down, link underline sweep, logo wiggle, cart badge bump, mobile drawer |
| Hero | `1:253` | Load settle (bg) + rise (product), layered parallax |
| Come get a whiff | `54:38` | Word-by-word headline, eyebrow rule draw, gallery fan-in from centre, pointer depth parallax, focus-dim siblings |
| Two scents | `1:46` | Scent-tinted stage, box lift + shadow shrink, cart tile hop, arrow-link sweep |
| The duo | `1:9` | Sticky copy with `difference` blend over hanging boxes, branch sway |
| Holders | `1:96` | Image push-in, chip lift, inline Notify-me with validation, Add-to-cart confirm |
| How to use | `1:153` | Auto-advancing stepper with progress hairline (pauses on hover/focus) |
| Story | `1:194` | Smoke drift, image parallax |
| FAQ | `1:272` + `1:300` | Animated single-open accordion, mascot idle |
| Footer | `1:200` | Email + consent validation, success/error states, link nudge, wordmark parallax |

All buttons share one component, using the 21st.dev *Interactive Hover Button* effect ported to plain CSS/JS: a dot beside the label blooms to fill the button, the label slides out and a copy + arrow slides in. Squash on press. Colors are per-skin variables in `css/main.css`.
`prefers-reduced-motion` keeps state changes and drops movement.

## Open items

- **Mono45 Headline** is licensed — DM Mono stands in. Add the woff2 files and an `@font-face` named `Mono45 Headline`; the stack in `tokens.css` already prefers it.
- **Placeholder copy** kept verbatim from Figma (announcement, `$42` note, sold-out footnote). FAQ answers 2–4 are bracketed placeholders pending approved copy.
- **Cart / Notify / Newsletter** are front-end stubs — wire to Shopify `/cart/add.js`, back-in-stock app, and Klaviyo/customer form.
- "Meet" buttons normalised to 195px (Figma had 195 / 243).
