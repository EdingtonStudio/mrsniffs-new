# Mr. Sniff's — remaining build list (desktop first)

Target launch: **December 15, 2026**. Mobile and responsive work starts after desktop is signed off.
Style source: Figma file "Mr. Sniff's Style Guide + Emails" (tokens, type styles, Button, Pill, Photo, Logo, Mascot and Icon components).

## Already built

| Page | File | Notes |
|---|---|---|
| Homepage | `index.html` | "Why Mr. Sniff's" block added after the intro (Nov 17) |
| Shop / Collection | `shop.html` | |
| Bonfire PDP | `bonfire.html` | Template for every other PDP |
| Yoga Studio PDP | `yoga-studio.html` | Specs match Bonfire. Palo santo + citrus note photos and an open-box shot still needed |
| The Duo PDP | `duo.html` | $42, one pack of each. Final contents still pending |
| Holder PDPs | `ash-catchum.html`, `stachin-ash.html`, `brass-monkey.html` | Notify me on sold-out holders. Lifestyle/detail photos, dimensions and care copy pending |
| How to Use Incense | `how-to.html` | Logo renders small in Chrome |
| Smell Test | `smell-test.html` | Intro + 4 questions + 3 results (Bonfire, Yoga Studio, Duo on a tie). Add to cart from the result |
| Cart drawer | `js/cart.js` | Every page. Quantity, remove, Duo swap, empty state, persists between pages |
| Search | `js/search.js` | Nav magnifier or "/" key. Products, pages, help topics |
| FAQ | `faq.html` | Four topic groups. Storage answer still pending |
| Contact | `contact.html` | Validated form (front-end only). Email address to confirm |
| Policies | `shipping-policy.html`, `refund-policy.html`, `privacy-policy.html`, `terms.html` | **Drafts.** Bracketed details needed, then counsel review |
| 404 | `404.html` | |
| Coming soon | `password.html` | For Shopify's password page before Dec 15 |
| Checkout preview | `checkout.html` | Stand-in only. Deleted at Shopify port; Checkout goes to Shopify's /checkout |

## P1 — Left before launch

| # | Item | Owner / notes |
|---|---|---|
| 1 | **Our Story** | Built (`story.html`). Team row replaced with the origin story (Nov 23); team returns after the January headshot shoot in Greenville. Origin copy and the reworked pull quote need Don and Kyle's sign-off. POV panels 2–3 copy still open |
| 2 | **Shopify port** | Convert pages to theme sections/templates; swap the Cart API block in `js/cart.js` and `search()` in `js/search.js` for Shopify's AJAX endpoints; contact form → `{% form 'contact' %}`. Target: done by Dec 8 to leave a week for QA |
| 3 | **Checkout styling** | Shopify admin → Checkout: logo, Ink/White/Ember colors, Big Shoulders + Inter, square buttons. About an hour |
| 4 | **Policy details + review** | Fill bracketed items (company name, address, shipping rates, return window), then counsel review |
| 5 | **Mobile pass** | After desktop sign-off |

## P2 — States and conversion

| # | Item | Notes |
|---|---|---|
| 1 | PDP reviews block | Klaviyo reviews widget; plan is 15–20 reviews live on day one |
| 2 | Empty and sold-out states | Figma "REQUIRED STATES" frame (1:783) |
| 3 | Exit-intent pop-up | Email capture, "try before you buy" sample marked coming soon |
| 4 | Newsletter success and error states | Footer form is a stub today |

## Decided (Nov 17)

- **Search**: keep it. Built as a custom overlay.
- **Holders**: keep them, with their own product pages (built Nov 17).
- **Account pages**: Shopify's default customer accounts for now; style after launch.

## Known fixes

- Logo renders small on How to Use in Chrome.
- Upside-down product photo on the PDP gallery.
- Product photography: the real box prints the wordmark and the label in opposite reading directions, so a horizontal shot can show one upright, never both. Retouched shots favour the wordmark (`pdp-smell-bg`); `howto-care` is back to the original. Reshoot or packaging fix if that matters.
- AI type artifacts cleaned (Nov 23): scent labels on every product and scene shot, the side line ("INCENSE MADE FOR PEOPLE WHO HAVE A NOSE · MRSNIFFS.CO") on `story/why-2` and `howto`, and the base copy on `hero`. Reverted to originals at Chris's call (Nov 24): `howto-care`, `smell-hero`, `shop-duo`, `duo-branch`, `pdp-lineup-duo`. Base copy on the other shots is too small to read and left as is.
- Holder stock: homepage/Figma shows Ash Catchum and Brass Monkey sold out, Stachin' Ash in stock. All product pages now follow that; the homepage footnote still says all three are sold out.
- Mono45 Headline license files still missing (DM Mono stands in).
- ~~Copy conflict~~ Resolved Nov 24: homepage and How to Use now match the PDPs (real wood, sun-dried, nothing poured on top). Check the emails say the same.
