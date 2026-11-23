/* ==========================================================================
   Mr. Sniff's — Our Story interactions
   1. Why we started: pinned quote lights up word by word while photos drift
      past at different speeds and loop (reference: caspia.framer.media)
   2. Point of view: scroll steps through three tabs; tabs are also clickable
   ========================================================================== */
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // 0 when the section's top hits the viewport top, 1 when its bottom hits the viewport bottom
  const progressOf = (el) => {
    const r = el.getBoundingClientRect();
    const run = r.height - innerHeight;
    return run > 0 ? clamp(-r.top / run) : (r.top < 0 ? 1 : 0);
  };

  /* ---- 1. Why we started -------------------------------------------------- */
  const why = $('[data-why]');
  const words = why ? $$('.why__word', why) : [];
  const cards = why ? $$('[data-why-card]', why).map((el) => ({
    el,
    y: parseFloat(el.style.getPropertyValue('--y')) || 0,
    speed: parseFloat(el.style.getPropertyValue('--speed')) || 1,
  })) : [];

  const drawWhy = () => {
    const p = progressOf(why);
    // words light up between 8% and 72% of the pinned scroll
    const lit = Math.round(clamp((p - 0.08) / 0.64) * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
    if (reduce) return;
    // each card rises at its own speed and wraps around the stage (endless drift)
    const H = innerHeight;
    const travel = H * 2.2;
    cards.forEach((c) => {
      const h = c.el.offsetHeight;
      const span = H + h * 2;
      const start = (c.y / 778) * H;                   // Figma y on a 778px-tall stage
      let y = (start - p * travel * c.speed) % span;
      if (y < -h) y += span;
      c.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    });
  };

  /* ---- 2. Point of view ---------------------------------------------------- */
  const pov = $('[data-pov]');
  const tabs = pov ? $$('[data-pov-tab]', pov) : [];
  const panels = pov ? $$('[data-pov-panel]', pov) : [];
  const imgs = pov ? $$('[data-pov-img]', pov) : [];
  const dot = pov ? $('[data-pov-dot]', pov) : null;
  let povIndex = 0;
  const setPov = (i) => {
    if (i === povIndex && tabs[i]?.classList.contains('is-active')) return;
    povIndex = i;
    tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', String(k === i)); });
    panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
    imgs.forEach((im, k) => im.classList.toggle('is-active', k === i));
    if (dot) dot.style.top = `calc(${(i / Math.max(1, tabs.length - 1)) * 100}% - ${i === tabs.length - 1 ? 8 : 0}px)`;
  };
  const drawPov = () => {
    if (window.matchMedia('(max-width: 900px)').matches) return;
    const p = progressOf(pov);
    setPov(Math.min(tabs.length - 1, Math.floor(p * tabs.length * 0.999)));
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => {
    setPov(i);
    // on desktop, scroll so the scroll position matches the chosen tab
    if (!window.matchMedia('(max-width: 900px)').matches && !reduce) {
      const r = pov.getBoundingClientRect();
      const run = r.height - innerHeight;
      const target = scrollY + r.top + run * ((i + 0.5) / tabs.length);
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
  }));
  tabs.forEach((t, i) => t.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[n].focus();
    tabs[n].click();
  }));

  /* ---- Frame loop: only while a scroll section is on screen -------------- */
  let ticking = false;
  const frame = () => {
    ticking = false;
    if (why) drawWhy();
    if (pov) drawPov();
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();
})();
