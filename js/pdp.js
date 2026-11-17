/* ==========================================================================
   Mr. Sniff's — PDP interactions (bonfire.html)
   Runs after main.js (both deferred), so button labels are already wrapped
   and the shared cart badge listener is live.
   ========================================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 900px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---- Quantity stepper -------------------------------------------------- */
  const qtyWrap = $('[data-qty]');
  let qty = 1;
  if (qtyWrap) {
    const out = $('[data-qty-value]', qtyWrap);
    const dec = $('[data-qty-dec]', qtyWrap);
    const set = (n) => {
      qty = Math.max(1, Math.min(99, n));
      out.textContent = String(qty);
      dec.disabled = qty === 1;
      out.classList.remove('is-tick'); void out.offsetWidth; out.classList.add('is-tick');
    };
    dec.addEventListener('click', () => set(qty - 1));
    $('[data-qty-inc]', qtyWrap).addEventListener('click', () => set(qty + 1));
    dec.disabled = true;
  }

  /* ---- Add to cart: adds the chosen quantity via the shared cart badge ---- */
  const addBtn = $('[data-pdp-add]');
  const proxy = $('[data-cart-proxy]');
  const label = (btn, text) => {
    const l = $('.btn__label', btn); const h = $('.btn__hover > span', btn);
    if (l) l.textContent = text; else btn.textContent = text;
    if (h) h.textContent = text;
  };
  if (addBtn && proxy) {
    let t;
    addBtn.addEventListener('click', () => {
      for (let i = 0; i < qty; i++) proxy.click();          // main.js bumps the badge once per click
      addBtn.classList.add('is-done');
      label(addBtn, qty > 1 ? `Added ${qty} ✓` : 'Added ✓');
      clearTimeout(t);
      t = setTimeout(() => { addBtn.classList.remove('is-done'); label(addBtn, 'Add to cart'); }, 1600);
    });
  }

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
