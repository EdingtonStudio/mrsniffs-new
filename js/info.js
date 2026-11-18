/* ==========================================================================
   Mr. Sniff's — inner page behaviour: contact form + checkout preview
   SHOPIFY PORT: the contact form becomes {% form 'contact' %}; the checkout
   preview page is deleted (the cart's Checkout button goes to /checkout).
   ========================================================================== */
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---- Contact form: validate, then show the success state --------------- */
  const form = $('[data-contact]');
  if (form) {
    const msg = $('[data-contact-msg]', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const checks = [
        [form.name, form.name.value.trim().length > 0],
        [form.email, EMAIL_RE.test(form.email.value.trim())],
        [form.message, form.message.value.trim().length > 0],
      ];
      let first = null;
      checks.forEach(([el, ok]) => {
        el.closest('.field').classList.toggle('is-invalid', !ok);
        if (!ok && !first) first = el;
      });
      if (first) {
        msg.textContent = 'Add your name, a valid email and a message, then send again.';
        msg.classList.add('is-error');
        first.focus();
        return;
      }
      msg.classList.remove('is-error');
      msg.textContent = 'Message sent. We’ll get back to you within 1–2 business days.';
      form.reset();
    });
  }

  /* ---- Checkout preview: show what the cart would hand to Shopify -------- */
  const summary = $('[data-co-summary]');
  if (summary) {
    const draw = () => {
      const cart = window.MrSniffsCart;
      if (!cart) return;
      const items = cart.getCart();
      if (!items.length) {
        summary.innerHTML = '<p class="co__empty">Your test cart is empty. Add something from the shop to see it here.</p>';
        return;
      }
      const total = items.reduce((s, l) => s + cart.PRODUCTS[l.id].price * l.qty, 0);
      summary.innerHTML = items.map((l) => {
        const p = cart.PRODUCTS[l.id];
        return `<div class="co-line"><span>${p.name} × ${l.qty}</span><span>${cart.money(p.price * l.qty)}</span></div>`;
      }).join('') + `<div class="co-line co-line--total"><span>Subtotal</span><span>${cart.money(total)}</span></div>`;
    };
    // cart.js loads first (both deferred, in order)
    draw();
    $('[data-co-clear]')?.addEventListener('click', () => { window.MrSniffsCart?.clear(); draw(); });
  }
})();
