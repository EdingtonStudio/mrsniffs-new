/* ==========================================================================
   Mr. Sniff's — cart drawer (Shopify AJAX cart)
   Reads and writes the real Shopify cart via /cart.js, /cart/add.js and
   /cart/change.js. Free-shipping threshold, Duo upsell and copy come from
   theme settings through window.MrSniffs (layout/theme.liquid).

   Add-to-cart anywhere: any element with data-add-to-cart="<variant id>"
   (optional data-qty). From other scripts: MrSniffsCart.add(variantId, qty).
   ========================================================================== */
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const CFG = window.MrSniffs || {};
  const R = CFG.routes || {};
  const S = CFG.strings || {};
  const root = (R.root || '/').replace(/\/?$/, '/');

  const formatMoney = (cents) => {
    const fmt = CFG.moneyFormat || '${{amount}}';
    const value = (cents / 100);
    const amount = value.toFixed(2);
    const noDec = Number.isInteger(value) ? String(value) : amount;
    return fmt
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, value.toFixed(0))
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amount.replace('.', ','))
      .replace(/\{\{\s*amount\s*\}\}/, noDec)
      .replace(/<[^>]*>/g, '');
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---- Cart API -------------------------------------------------------- */
  let cart = { items: [], item_count: 0, items_subtotal_price: 0 };
  const json = (res) => { if (!res.ok) return res.json().then((e) => Promise.reject(e)); return res.json(); };
  const fetchCart = () => fetch(`${R.cart || '/cart'}.js`, { headers: { Accept: 'application/json' } }).then(json).then((c) => (cart = c));
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }).then(json);
  const addItem = (id, quantity = 1) => post(`${R.cartAdd || '/cart/add'}.js`, { items: [{ id: Number(id), quantity }] }).then(fetchCart);
  const changeLine = (key, quantity) => post(`${R.cartChange || '/cart/change'}.js`, { id: key, quantity }).then((c) => (cart = c));

  /* ---- Drawer markup ---------------------------------------------------- */
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
        <div class="cart-ship" data-cart-ship>
          <p class="cart-ship__msg" data-cart-ship-msg></p>
          <div class="cart-ship__bar" aria-hidden="true"><span data-cart-ship-fill></span></div>
        </div>
        <div class="cart__row"><span>Subtotal</span><span class="cart__subtotal" data-cart-subtotal></span></div>
        <p class="cart__fine">Shipping and taxes calculated at checkout.</p>
        <a class="btn btn--solid btn--block cart__checkout" href="${root}checkout">Checkout</a>
        <button class="text-link cart__continue" type="button" data-cart-close><span>Keep shopping</span></button>
      </footer>
    </aside>`;
  document.body.appendChild(drawer);

  const panel = $('.cart__panel', drawer);
  const body = $('[data-cart-body]', drawer);
  const foot = $('[data-cart-foot]', drawer);
  const badges = () => $$('[data-cart-count]');
  const cartLinks = () => $$('[data-cart-link]');
  const ship = $('[data-cart-ship]', drawer);

  const lineHTML = (item) => {
    const img = item.image ? item.image.replace(/(\.[a-z]+)(\?|$)/i, '$1$2') : '';
    const note = item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : (item.product_type || '');
    return `
      <li class="cart-line" data-line="${esc(item.key)}" data-qty="${item.quantity}">
        <a class="cart-line__media" href="${esc(item.url)}" tabindex="-1" aria-hidden="true">${img ? `<img src="${esc(img)}${img.includes('?') ? '&' : '?'}width=240" alt="" />` : ''}</a>
        <div class="cart-line__info">
          <div class="cart-line__top">
            <a class="cart-line__name" href="${esc(item.url)}">${esc(item.product_title)}</a>
            <span class="cart-line__price">${formatMoney(item.final_line_price)}</span>
          </div>
          ${note ? `<p class="cart-line__note">${esc(note)}</p>` : ''}
          <div class="cart-line__actions">
            <div class="cart-qty" role="group" aria-label="Quantity for ${esc(item.product_title)}">
              <button type="button" aria-label="Decrease quantity" data-dec>−</button>
              <output aria-live="polite">${item.quantity}</output>
              <button type="button" aria-label="Increase quantity" data-inc>+</button>
            </div>
            <button class="cart-line__remove" type="button" data-remove>Remove</button>
          </div>
        </div>
      </li>`;
  };

  // Exactly one single scent in the cart and no Duo yet → offer the swap
  const upsellHTML = () => {
    const duo = CFG.duo;
    const scents = CFG.scentHandles || [];
    if (!duo || scents.length < 2) return '';
    if (cart.items.some((i) => String(i.variant_id) === String(duo.variantId))) return '';
    const solo = cart.items.filter((i) => scents.includes(i.handle));
    if (solo.length !== 1) return '';
    const line = solo[0];
    const extra = duo.price - line.final_price;
    return `
      <div class="cart-upsell">
        <img class="cart-upsell__img" src="${esc(duo.image)}" alt="" />
        <div class="cart-upsell__text">
          <p class="cart-upsell__title">Make it a ${esc(duo.title)}</p>
          <p class="cart-upsell__note">Get both scents for ${formatMoney(duo.price)}${extra > 0 ? `, ${formatMoney(extra)} more` : ''}.</p>
        </div>
        <button class="btn btn--outline btn--sm" type="button" data-swap="${esc(line.key)}" data-swap-qty="${line.quantity}">Swap</button>
      </div>`;
  };

  const render = () => {
    const n = cart.item_count || 0;
    const subtotal = cart.items_subtotal_price || 0;
    badges().forEach((b) => { b.hidden = n === 0; b.textContent = String(n); });
    cartLinks().forEach((a) => a.setAttribute('aria-label', `Cart, ${n} item${n === 1 ? '' : 's'}`));
    $('[data-cart-n]', drawer).textContent = n ? `(${n})` : '';
    $('[data-cart-subtotal]', drawer).textContent = formatMoney(subtotal);
    const threshold = CFG.freeShippingCents || 0;
    ship.hidden = !threshold;
    if (threshold) {
      const left = threshold - subtotal;
      $('[data-cart-ship-msg]', drawer).innerHTML = left > 0
        ? `You're <strong>${formatMoney(left)}</strong> away from free shipping.`
        : 'Free shipping unlocked.';
      $('[data-cart-ship-fill]', drawer).style.width = `${Math.min(100, (subtotal / threshold) * 100)}%`;
    }
    foot.hidden = n === 0;
    body.innerHTML = n
      ? `<ul class="cart__lines">${cart.items.map(lineHTML).join('')}</ul>${upsellHTML()}`
      : `<div class="cart-empty">
           <img class="cart-empty__icon" src="${esc(CFG.assets?.bagInk || '')}" width="40" height="40" alt="" />
           <p class="display-s">${esc(S.emptyTitle || 'Nothing to sniff here yet.')}</p>
           <p class="lede">${esc(S.emptyText || 'Your cart is empty.')}</p>
           <div class="cart-empty__actions">
             <a class="btn btn--solid" href="${esc(R.shop || root + 'collections/all')}">${esc(S.shopCta || 'Shop incense')}</a>
             ${R.quiz ? `<a class="btn btn--outline" href="${esc(R.quiz)}">${esc(S.quizCta || 'Find your scent')}</a>` : ''}
           </div>
         </div>`;
    drawer.classList.toggle('is-busy', false);
    document.dispatchEvent(new CustomEvent('mrsniffs:buttons', { detail: { root: drawer } }));
    document.dispatchEvent(new CustomEvent('mrsniffs:cart', { detail: { cart } }));
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
  const busy = (p) => { drawer.classList.add('is-busy'); return p.then(render).catch(() => fetchCart().then(render)); };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-cart-link], a[href="#cart"]');
    if (!link) return;
    e.preventDefault();
    fetchCart().then(render).finally(open);
  });

  drawer.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-cart-close]');
    if (!t) return;
    if (t.matches('[data-cart-close]')) return close();
    const line = t.closest('[data-line]');
    if (line) {
      const key = line.dataset.line;
      const q = Number(line.dataset.qty) || 0;
      if (t.matches('[data-inc]')) busy(changeLine(key, q + 1));
      if (t.matches('[data-dec]')) busy(changeLine(key, q - 1));
      if (t.matches('[data-remove]')) busy(changeLine(key, 0));
    }
    if (t.matches('[data-swap]') && CFG.duo) {        // turn one single scent into a Duo
      const key = t.dataset.swap;
      const q = Number(t.dataset.swapQty) || 1;
      busy(changeLine(key, q - 1).then(() => addItem(CFG.duo.variantId, 1)));
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

  /* ---- Add to cart -------------------------------------------------------- */
  const bump = () => badges().forEach((b) => { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); });
  let queue = Promise.resolve();
  let openTimer;
  const add = (variantId, qty = 1) => {
    if (!variantId) return Promise.resolve(cart);
    queue = queue.then(() => addItem(variantId, qty)).then(() => { render(); bump(); clearTimeout(openTimer); openTimer = setTimeout(open, 350); return cart; })
      .catch((err) => { console.warn('[cart]', err); return fetchCart().then(render).then(() => Promise.reject(err)); });
    return queue;
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    const id = btn.getAttribute('data-add-to-cart');
    if (!id || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
    e.preventDefault();
    add(id, Number(btn.getAttribute('data-qty')) || 1);
  });

  // Product forms (PDP): <form action="/cart/add" data-product-form>
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-product-form]');
    if (!form) return;
    e.preventDefault();
    const fd = new FormData(form);
    add(fd.get('id'), Number(fd.get('quantity')) || 1);
  });

  fetchCart().then(render).catch(() => {});
  window.MrSniffsCart = { add, open, close, refresh: () => fetchCart().then(render), formatMoney, get cart() { return cart; } };
})();
