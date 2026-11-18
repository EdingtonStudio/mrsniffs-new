/* ==========================================================================
   Mr. Sniff's — cart drawer
   Front-end cart for the static build. State lives in localStorage so it
   survives page changes on the preview.

   SHOPIFY PORT: replace the four functions in the "Cart API" block with
   fetch calls to /cart.js, /cart/add.js, /cart/change.js (same shapes),
   point CHECKOUT_URL at /checkout, and render() keeps working unchanged.
   ========================================================================== */
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---- Catalog (Shopify: comes from the product/variant objects) ------- */
  const PRODUCTS = {
    'bonfire':      { name: 'Bonfire · Agarwood',     note: 'Incense · 50 sticks',            price: 24, img: 'assets/img/shop-bonfire.webp',       url: 'bonfire.html' },
    'yoga-studio':  { name: 'Yoga Studio · Palo Santo', note: 'Incense · 50 sticks',          price: 24, img: 'assets/img/shop-yoga.webp',          url: 'yoga-studio.html' },
    'duo':          { name: 'The Duo',                note: 'Bonfire + Yoga Studio',          price: 42, img: 'assets/img/shop-duo.webp',           url: 'duo.html' },
    'ash-catchum':  { name: 'Ash Catchum',            note: 'Stoneware ash catcher',          price: 22, img: 'assets/img/holder-ash-catchum.webp', url: 'ash-catchum.html' },
    'stachin-ash':  { name: 'Stachin’ Ash',           note: 'Moustache ash catcher',          price: 38, img: 'assets/img/holder-stachin-ash.webp', url: 'stachin-ash.html' },
    'brass-monkey': { name: 'Brass Monkey',           note: 'Blackened brass holder',         price: 85, img: 'assets/img/holder-brass-monkey.webp',url: 'brass-monkey.html' },
  };
  const CHECKOUT_URL = 'checkout.html';
  const KEY = 'mrsniffs-cart';
  const money = (n) => `$${n.toFixed(2).replace(/\.00$/, '')}`;

  /* ---- Cart API (swap these for Shopify AJAX cart calls) --------------- */
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  };
  const write = (items) => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode: cart lives for this page only */ }
    memory = items;
  };
  let memory = read();
  const getCart = () => memory;
  const addItem = (id, qty = 1) => {
    if (!PRODUCTS[id]) return;
    const items = getCart().map((l) => ({ ...l }));
    const line = items.find((l) => l.id === id);
    if (line) line.qty += qty; else items.push({ id, qty });
    write(items);
  };
  const setQty = (id, qty) => {
    write(getCart().map((l) => (l.id === id ? { ...l, qty } : l)).filter((l) => l.qty > 0));
  };

  /* ---- Drawer markup (Shopify: sections/cart-drawer.liquid) ------------ */
  const drawer = document.createElement('div');
  drawer.className = 'cart';
  drawer.hidden = true;
  drawer.innerHTML = `
    <div class="cart__scrim" data-cart-close></div>
    <aside class="cart__panel" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabindex="-1">
      <header class="cart__head">
        <h2 class="display-s" id="cart-title">Your cart <span class="cart__count" data-cart-n></span></h2>
        <button class="cart__close" type="button" aria-label="Close cart" data-cart-close><span></span><span></span></button>
      </header>
      <div class="cart__body" data-cart-body></div>
      <footer class="cart__foot" data-cart-foot>
        <div class="cart__row"><span>Subtotal</span><span class="cart__subtotal" data-cart-subtotal></span></div>
        <p class="cart__fine">Shipping and taxes calculated at checkout.</p>
        <a class="btn btn--solid btn--block cart__checkout" href="${CHECKOUT_URL}">Checkout</a>
        <button class="text-link cart__continue" type="button" data-cart-close><span>Keep shopping</span></button>
      </footer>
    </aside>`;
  document.body.appendChild(drawer);

  const panel = $('.cart__panel', drawer);
  const body = $('[data-cart-body]', drawer);
  const foot = $('[data-cart-foot]', drawer);
  const badge = $('[data-cart-count]');
  const cartLink = $('[data-cart-link]');

  const lineHTML = ({ id, qty }) => {
    const p = PRODUCTS[id];
    return `
      <li class="cart-line" data-line="${id}">
        <a class="cart-line__media${p.kind === 'box' ? ' cart-line__media--box' : ''}" href="${p.url}" tabindex="-1" aria-hidden="true"><img src="${p.img}" alt="" /></a>
        <div class="cart-line__info">
          <div class="cart-line__top">
            <a class="cart-line__name" href="${p.url}">${p.name}</a>
            <span class="cart-line__price">${money(p.price * qty)}</span>
          </div>
          <p class="cart-line__note">${p.note}</p>
          <div class="cart-line__actions">
            <div class="cart-qty" role="group" aria-label="Quantity for ${p.name}">
              <button type="button" aria-label="Decrease quantity" data-dec>−</button>
              <output aria-live="polite">${qty}</output>
              <button type="button" aria-label="Increase quantity" data-inc>+</button>
            </div>
            <button class="cart-line__remove" type="button" data-remove>Remove</button>
          </div>
        </div>
      </li>`;
  };

  // One scent and no Duo yet → offer the swap (save $6)
  const upsellHTML = (items) => {
    const ids = items.map((l) => l.id);
    if (ids.includes('duo')) return '';
    const solo = ['bonfire', 'yoga-studio'].filter((id) => ids.includes(id));
    if (solo.length !== 1) return '';
    const other = solo[0] === 'bonfire' ? 'Yoga Studio' : 'Bonfire';
    return `
      <div class="cart-upsell">
        <img class="cart-upsell__img" src="${PRODUCTS.duo.img}" alt="" />
        <div class="cart-upsell__text">
          <p class="cart-upsell__title">Make it a Duo</p>
          <p class="cart-upsell__note">Add ${other} for $18 more. Both scents, $42.</p>
        </div>
        <button class="btn btn--outline btn--sm" type="button" data-swap="${solo[0]}">Swap</button>
      </div>`;
  };

  const render = () => {
    const items = getCart();
    const n = items.reduce((s, l) => s + l.qty, 0);
    const subtotal = items.reduce((s, l) => s + PRODUCTS[l.id].price * l.qty, 0);
    if (badge) {
      badge.hidden = n === 0;
      badge.textContent = String(n);
    }
    cartLink?.setAttribute('aria-label', `Cart, ${n} item${n === 1 ? '' : 's'}`);
    $('[data-cart-n]', drawer).textContent = n ? `(${n})` : '';
    $('[data-cart-subtotal]', drawer).textContent = money(subtotal);
    foot.hidden = n === 0;
    body.innerHTML = n
      ? `<ul class="cart__lines">${items.map(lineHTML).join('')}</ul>${upsellHTML(items)}`
      : `<div class="cart-empty">
           <img class="cart-empty__icon" src="assets/icons/bag-ink.svg" width="40" height="40" alt="" />
           <p class="display-s">Nothing to sniff here yet.</p>
           <p class="lede">Your cart is empty. Start with a scent, or let the Smell Test pick one.</p>
           <div class="cart-empty__actions">
             <a class="btn btn--solid" href="shop.html">Shop incense</a>
             <a class="btn btn--outline" href="smell-test.html">Find your scent</a>
           </div>
         </div>`;
    // main.js builds the hover markup for buttons on load; new ones need it too
    document.dispatchEvent(new CustomEvent('mrsniffs:buttons', { detail: { root: drawer } }));
  };

  /* ---- Open / close ------------------------------------------------------ */
  let lastFocus = null;
  const open = () => {
    if (!drawer.hidden && drawer.classList.contains('is-open')) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.documentElement.classList.add('cart-open');
    requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open')));
    panel.focus({ preventScroll: true });
  };
  const close = () => {
    drawer.classList.remove('is-open');
    document.documentElement.classList.remove('cart-open');
    const done = () => { drawer.hidden = true; };
    panel.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 500);
    lastFocus?.focus?.({ preventScroll: true });
  };

  cartLink?.addEventListener('click', (e) => { e.preventDefault(); render(); open(); });
  $$('a[href="#cart"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); render(); open(); }));

  drawer.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-cart-close]');
    if (!t) return;
    if (t.matches('[data-cart-close]')) return close();
    const line = t.closest('[data-line]');
    if (line) {
      const id = line.dataset.line;
      const q = getCart().find((l) => l.id === id)?.qty || 0;
      if (t.matches('[data-inc]')) setQty(id, q + 1);
      if (t.matches('[data-dec]')) setQty(id, q - 1);
      if (t.matches('[data-remove]')) setQty(id, 0);
      render();
    }
    if (t.matches('[data-swap]')) {           // turn one single scent into a Duo
      const id = t.dataset.swap;
      setQty(id, (getCart().find((l) => l.id === id)?.qty || 1) - 1);
      addItem('duo', 1);
      render();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (drawer.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {                       // keep focus inside the panel
      const f = $$('a[href], button:not([disabled])', panel).filter((el) => el.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---- Add buttons anywhere on the page --------------------------------- */
  let openTimer;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    const id = btn.getAttribute('data-add-to-cart');
    if (!PRODUCTS[id]) return;
    addItem(id, 1);
    render();
    if (badge) { badge.classList.remove('is-bump'); void badge.offsetWidth; badge.classList.add('is-bump'); }
    clearTimeout(openTimer);                     // PDP adds several in a burst: open once
    openTimer = setTimeout(open, 450);
  });

  // other tabs / checkout page changed the cart
  window.addEventListener('storage', (e) => { if (e.key === KEY) { memory = read(); render(); } });

  render();
  window.MrSniffsCart = { PRODUCTS, getCart, money, clear: () => { write([]); render(); } };
})();
