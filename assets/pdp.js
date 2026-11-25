/* ==========================================================================
   Mr. Sniff's — PDP interactions (product templates)
   Runs after main.js (both deferred), so button labels are already wrapped
   and the shared cart badge listener is live.
   ========================================================================== */
(() => {
  if (window.MrSniffsPdp) return;          // sections may each include this script
  window.MrSniffsPdp = true;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 900px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---- Quantity stepper (mirrors into the form's quantity field) ------- */
  const qtyWrap = $('[data-qty]');
  let qty = 1;
  if (qtyWrap) {
    const out = $('[data-qty-value]', qtyWrap);
    const dec = $('[data-qty-dec]', qtyWrap);
    const input = $('[data-qty-input]', qtyWrap);
    const set = (n) => {
      qty = Math.max(1, Math.min(99, n));
      out.textContent = String(qty);
      if (input) input.value = String(qty);
      dec.disabled = qty === 1;
      out.classList.remove('is-tick'); void out.offsetWidth; out.classList.add('is-tick');
    };
    dec.addEventListener('click', () => set(qty - 1));
    $('[data-qty-inc]', qtyWrap).addEventListener('click', () => set(qty + 1));
    dec.disabled = true;
  }

  /* ---- Add to cart: the product form goes through the shared cart -------
     Without JS (or without cart.js) the form posts to /cart/add as usual. */
  const form = $('form[data-product-form]');
  const addBtn = form && $('[data-pdp-add]', form);
  const label = (btn, text) => {
    const l = $('.btn__label', btn); const h = $('.btn__hover > span', btn);
    if (l) l.textContent = text; else btn.textContent = text;
    if (h) h.textContent = text;
  };
  const addText = () => (addBtn && addBtn.dataset.label) || 'Add to cart';
  const soldText = () => (addBtn && addBtn.dataset.soldOut) || 'Sold out';
  if (form && addBtn) {
    let t;
    form.addEventListener('submit', (e) => {
      const cart = window.MrSniffsCart;
      if (!cart || typeof cart.add !== 'function') return;   // native POST fallback
      e.preventDefault();
      e.stopPropagation();                                     // cart.js would add it again
      if (addBtn.disabled) return;
      const fd = new FormData(form);
      const n = Number(fd.get('quantity')) || qty;
      addBtn.setAttribute('aria-busy', 'true');
      cart.add(fd.get('id'), n).then(() => {
        addBtn.classList.add('is-done');
        label(addBtn, n > 1 ? `Added ${n} ✓` : 'Added ✓');
      }).catch(() => {
        label(addBtn, soldText());
      }).finally(() => {
        addBtn.removeAttribute('aria-busy');
        clearTimeout(t);
        t = setTimeout(() => { addBtn.classList.remove('is-done'); label(addBtn, addBtn.disabled ? soldText() : addText()); }, 1600);
      });
    });
  }

  /* ---- Variant picker (only rendered for multi-variant products) -------- */
  const variantSelect = form && $('select[data-pdp-variant]', form);
  const variantsEl = $('[data-pdp-variants]');
  if (variantSelect && variantsEl) {
    let variants = [];
    try { variants = JSON.parse(variantsEl.textContent); } catch (err) { variants = []; }
    const money = (c) => (window.MrSniffsCart && window.MrSniffsCart.formatMoney ? window.MrSniffsCart.formatMoney(c) : `$${(c / 100).toFixed(2).replace(/\.00$/, '')}`);
    variantSelect.addEventListener('change', () => {
      const v = variants.find((x) => String(x.id) === variantSelect.value);
      if (!v) return;
      const priceEl = $('[data-pdp-price-value]');
      if (priceEl) priceEl.textContent = money(v.price);
      let cmp = $('[data-pdp-compare]');
      if (v.compare_at_price > v.price) {
        if (!cmp && priceEl) {
          cmp = document.createElement('s');
          cmp.className = 'pdp-price__compare';
          cmp.setAttribute('data-pdp-compare', '');
          priceEl.before(cmp);
        }
        if (cmp) cmp.textContent = money(v.compare_at_price);
      } else if (cmp) cmp.hidden = true;
      if (cmp && v.compare_at_price > v.price) cmp.hidden = false;
      if (addBtn) {
        addBtn.disabled = !v.available;
        label(addBtn, v.available ? addText() : soldText());
      }
      const url = new URL(window.location.href);
      url.searchParams.set('variant', v.id);
      window.history.replaceState({}, '', url.toString());
    });
  }

  /* ---- Notify me (Shopify contact form tagged notify-me) ----------------
     Shopify's {% form %} puts hidden inputs first, so main.js's
     `$('input', form)` would validate form_type instead of the email.
     Handle the submit here in the capture phase (before main.js), same
     validation + messages, and post the form in the background. */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  document.addEventListener('submit', (e) => {
    const f = e.target.closest && e.target.closest('form[data-notify-form]');
    if (!f) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const wrap = f.closest('[data-notify]');
    const msg = wrap && $('[data-notify-msg]', wrap);
    const input = $('input[type="email"]', f);
    f.classList.remove('is-error');
    if (!input || !EMAIL_RE.test(input.value.trim())) {
      void f.offsetWidth;
      f.classList.add('is-error');
      if (msg) { msg.className = 'form-msg is-error'; msg.textContent = 'Enter a valid email address.'; }
      return;
    }
    if (f.getAttribute('action')) {
      fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'text/html' } }).catch(() => {});
    }
    f.hidden = true;
    if (msg) { msg.className = 'form-msg is-success'; msg.textContent = "You're on the list for this one."; }
  }, true);
  // main.js focuses the form's first input (a hidden one); move focus to the email field
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-notify-open]');
    const wrap = btn && btn.closest('[data-notify]');
    const input = wrap && $('form[data-notify-form] input[type="email"]', wrap);
    if (input) setTimeout(() => input.focus(), 0);
  });

  /* ---- Info + policy accordions (independent of the FAQ's single-open) --- */
  $$('[data-pdp-acc]').forEach((item) => {
    const head = $(':scope > button', item);
    const panel = $('.pdp-acc__panel', item);
    let anim = null;
    head.addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      anim?.cancel();
      head.setAttribute('aria-expanded', String(!open));
      if (open) {
        item.classList.remove('is-open');
        if (reduce.matches) { panel.hidden = true; return; }
        const h = panel.offsetHeight;
        anim = panel.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(0.65,0,0.35,1)' });
        anim.onfinish = () => { panel.hidden = true; };
      } else {
        item.classList.add('is-open');
        panel.hidden = false;
        if (reduce.matches) return;
        const h = panel.offsetHeight;
        anim = panel.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 420, easing: 'cubic-bezier(0.22,1,0.36,1)' });
      }
    });
  });

  /* ---- Gallery: measurement line draws when the stick tile shows -------- */
  const stickTile = $('.pdp-tile--stick');
  if (stickTile && 'IntersectionObserver' in window) {
    new IntersectionObserver((es, io) => es.forEach((e) => {
      if (e.isIntersecting) { stickTile.classList.add('is-in'); io.disconnect(); }
    }), { threshold: 0.5 }).observe(stickTile);
  } else stickTile?.classList.add('is-in');

  /* ---- What's in the box: red line draws with scroll -------------------
     Progress runs from the stage top at 80% of the viewport to ~75% of the
     stage scrolled. Each callout appears once the line reaches its dot.  */
  const inbox = $('[data-inbox]');
  const stage = inbox && $('.inbox__stage', inbox);
  const paths = inbox ? $$('[data-inbox-path]', inbox) : [];
  const callouts = inbox ? $$('[data-callout]', inbox) : [];
  let pathLen = 0;
  let calloutAt = [];

  const measureInbox = () => {
    if (!paths.length) return;
    const p = paths[0];
    pathLen = p.getTotalLength();
    paths.forEach((el) => { el.style.strokeDasharray = `${pathLen} ${pathLen}`; });
    // svg sits at 424.35, 323.2 on the 1440 stage; dots are 8×8
    const samples = [];
    const N = 600;
    for (let i = 0; i <= N; i++) { const pt = p.getPointAtLength((pathLen * i) / N); samples.push([pt.x, pt.y, i / N]); }
    calloutAt = callouts.map((c) => {
      const x = parseFloat(c.dataset.dotX) + 4 - 424.35;
      const y = parseFloat(c.dataset.dotY) + 4 - 323.2;
      let best = 0, d = Infinity;
      for (const [sx, sy, f] of samples) { const dd = (sx - x) ** 2 + (sy - y) ** 2; if (dd < d) { d = dd; best = f; } }
      return best;
    });
  };

  const drawInbox = () => {
    if (!stage || !pathLen) return;
    const vh = window.innerHeight;
    const r = stage.getBoundingClientRect();
    const prog = clamp((vh * 0.8 - r.top) / (r.height * 0.75));
    const off = pathLen * (1 - prog);
    paths.forEach((el) => { el.style.strokeDashoffset = off.toFixed(1); });
    callouts.forEach((c, i) => c.classList.toggle('is-on', prog > 0.01 && prog >= calloutAt[i] - 0.004));
    inbox.dataset.progress = prog.toFixed(3);
  };

  const armInbox = () => {
    if (!inbox) return;
    const active = !reduce.matches && !mobile.matches;
    inbox.classList.toggle('is-armed', active);
    if (active) { measureInbox(); drawInbox(); }
    else {
      paths.forEach((el) => { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; });
      callouts.forEach((c) => c.classList.add('is-on'));
    }
  };

  /* ---- Steps: staggered → aligned as the section scrolls in ------------- */
  const steps = $('[data-steps-align]');
  const alignSteps = () => {
    if (!steps) return;
    if (reduce.matches || mobile.matches) { steps.style.setProperty('--p', '1'); return; }
    const vh = window.innerHeight;
    const r = steps.getBoundingClientRect();
    const prog = clamp((vh - r.top) / (vh * 0.75));
    steps.style.setProperty('--p', prog.toFixed(3));
  };

  /* ---- Scroll loop ------------------------------------------------------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (inbox?.classList.contains('is-armed')) drawInbox();
      alignSteps();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { armInbox(); onScroll(); }, { passive: true });
  reduce.addEventListener?.('change', () => { armInbox(); onScroll(); });
  mobile.addEventListener?.('change', () => { armInbox(); onScroll(); });

  armInbox();
  alignSteps();
})();
