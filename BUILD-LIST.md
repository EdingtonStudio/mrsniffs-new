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
| Smell Test intro | `smell-test.html` | Intro only. Questions and results not built |

## P1 — Launch blockers

| # | Page or component | Build from | Notes |
|---|---|---|---|
| 1 | **Cart drawer** | New | Every page has a dead `#cart`. Line items, quantity, subtotal, Duo upsell, checkout button, empty state |
| 2 | **Smell Test: 4 questions + results** | `smell-test.html` | One question per screen with progress. Three results: Bonfire, Yoga Studio, The Duo. No email gate |
| 3 | **Our Story** | Vijay's design (in progress) | Every "Our story" link points to `index.html#story` |
| 4 | **FAQ page** | Homepage accordion | Full answers. Homepage answers 2–4 are still placeholders |
| 5 | **Contact** | New, simple | Email, form, response time |
| 6 | **Policy pages ×4** | One text template | Shipping, Refunds, Privacy, Terms. Footer links are dead anchors today |
| 7 | **404** | New | Mascot, short line, Shop and Smell Test buttons |
| 8 | **Password / coming-soon page** | New | Shopify password page with email capture, for teasing before Dec 15 |
| 9 | **Search overlay** | New | Keep search (Chris, Nov 17). Opens from the nav icon: input, live results for products and pages, empty state |

## P2 — States and conversion

| # | Item | Notes |
|---|---|---|
| 1 | PDP reviews block | Klaviyo reviews widget; plan is 15–20 reviews live on day one |
| 2 | Add-to-cart confirmation | Toast or drawer open, used on every Add button |
| 3 | Empty and sold-out states | Figma "REQUIRED STATES" frame (1:783) |
| 4 | Exit-intent pop-up | Email capture, "try before you buy" sample marked coming soon |
| 5 | Newsletter success and error states | Footer form is a stub today |

## Decided (Nov 17)

- **Search**: keep it. Built as a custom overlay (P1-9).
- **Holders**: keep them, with their own product pages (built Nov 17).
- **Account pages**: Shopify's default customer accounts for now; style after launch.

## Known fixes

- Logo renders small on How to Use in Chrome.
- Upside-down product photo on the PDP gallery.
- Holder stock: homepage/Figma shows Ash Catchum and Brass Monkey sold out, Stachin' Ash in stock. All product pages now follow that; the homepage footnote still says all three are sold out.
- Mono45 Headline license files still missing (DM Mono stands in).
- Copy conflict: the homepage and How to Use story blocks say "hand-rolled sticks" and "bold fragrance loads", but the PDP and emails say extruded, sun-dried, no added fragrance. Pick one.
