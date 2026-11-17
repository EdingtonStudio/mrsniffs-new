# Mr. Sniff's — remaining build list (desktop first)

Target launch: **December 15, 2026**. Mobile and responsive work starts after desktop is signed off.
Style source: Figma file "Mr. Sniff's Style Guide + Emails" (tokens, type styles, Button, Pill, Photo, Logo, Mascot and Icon components).

## Already built

| Page | File | Notes |
|---|---|---|
| Homepage | `index.html` | Add the differentiation block (see P2-1) |
| Shop / Collection | `shop.html` | |
| Bonfire PDP | `bonfire.html` | Template for every other PDP |
| How to Use Incense | `how-to.html` | Logo renders small in Chrome |
| Smell Test intro | `smell-test.html` | Intro only. Questions and results not built |

## P1 — Launch blockers

| # | Page or component | Build from | Notes |
|---|---|---|---|
| 1 | **Yoga Studio PDP** | `bonfire.html` | Mint accent, Palo Santo notes, Yoga Studio photos. Links currently go to `shop.html#yoga-studio` |
| 2 | **The Duo PDP** ($42) | `bonfire.html` | Both boxes, ember-to-mint gleam, savings line. Links currently go to `shop.html#duo` |
| 3 | **Cart drawer** | New | Every page has a dead `#cart`. Line items, quantity, subtotal, Duo upsell, checkout button, empty state |
| 4 | **Smell Test: 4 questions + results** | `smell-test.html` | One question per screen with progress. Three results: Bonfire, Yoga Studio, The Duo. No email gate |
| 5 | **Our Story** | Vijay's design (in progress) | Every "Our story" link points to `index.html#story` |
| 6 | **FAQ page** | Homepage accordion | Full answers. Homepage answers 2–4 are still placeholders |
| 7 | **Contact** | New, simple | Email, form, response time |
| 8 | **Policy pages ×4** | One text template | Shipping, Refunds, Privacy, Terms. Footer links are dead anchors today |
| 9 | **404** | New | Mascot, short line, Shop and Smell Test buttons |
| 10 | **Password / coming-soon page** | New | Shopify password page with email capture, for teasing before Dec 15 |

## P2 — States and conversion

| # | Item | Notes |
|---|---|---|
| 1 | Homepage differentiation block after the hero | Nontoxic, all-wood, transparent supply chain (Jacob, Nov 17) |
| 2 | PDP reviews block | Klaviyo reviews widget; plan is 15–20 reviews live on day one |
| 3 | Add-to-cart confirmation | Toast or drawer open, used on every Add button |
| 4 | Empty and sold-out states | Figma "REQUIRED STATES" frame (1:783) |
| 5 | Exit-intent pop-up | Email capture, "try before you buy" sample marked coming soon |
| 6 | Newsletter success and error states | Footer form is a stub today |

## Cut or defer (recommendation)

- **Search**: two products don't need it. Remove the nav icon instead of building an overlay.
- **Holder PDPs**: holders aren't in the launch lineup. Keep the Notify me cards and build PDPs when they ship.
- **Account pages**: use Shopify's default customer accounts and style them after launch.

## Known fixes

- Logo renders small on How to Use in Chrome.
- Upside-down product photo on the PDP gallery.
- Mono45 Headline license files still missing (DM Mono stands in).
