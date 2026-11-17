/* ==========================================================================
   Mr. Sniff's — How to Use Incense
   1. Burn sequence: pinned stage, scroll progress → active step
   2. Guide tabs: in-page anchors, active state follows scroll,
      floating copy rides the bottom of the viewport between hero and CTA
   ========================================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 901px)');

  /* ---- 1. Burn sequence -------------------------------------------------- */
  const burn = $('[data-burn]');
  const frames = burn ? $$('.burn__frame', burn) : [];
  const steps = burn ? $$('.burn__step', burn) : [];
  const descs = burn ? $$('.burn__desc', burn) : [];
  const N = frames.length;
  let active = -1;
  let pinned = false;

  const POS = { '-2': 'prev2', '-1': 'prev', '0': 'active', '1': 'next', '2': 'next2' };

  const setActive = (i) => {
    if (i === active) return;
    active = i;
    frames.forEach((f, idx) => {
      const d = idx - i;
      f.dataset.pos = POS[d] || (d < 0 ? 'prev2' : 'next2');
      f.setAttribute('aria-hidden', String(d !== 0));
    });
    steps.forEach((s, idx) => {
      s.classList.toggle('is-active', idx === i);
      s.classList.toggle('is-near', Math.abs(idx - i) === 1);
      s.setAttribute('aria-current', idx === i ? 'step' : 'false');
    });
    descs.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
    syncTabs();
  };

  const track = burn ? $('.burn__track', burn) : null;
  const trackRange = () => {
    const top = track.getBoundingClientRect().top + window.scrollY;
    const span = track.offsetHeight - window.innerHeight;
    return { top, span: Math.max(span, 1) };
  };

  const updateBurn = () => {
    if (!pinned) return;
    const { top, span } = trackRange();
    const p = Math.min(Math.max((window.scrollY - top) / span, 0), 0.9999);
    setActive(Math.floor(p * N));
  };

  const scrollToStep = (i) => {
    if (!pinned) { burn.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' }); return; }
    const { top, span } = trackRange();
    window.scrollTo({ top: top + ((i + 0.5) / N) * span, behavior: reduce.matches ? 'auto' : 'smooth' });
  };

  const setMode = () => {
    if (!burn) return;
    pinned = desktop.matches && !reduce.matches;
    burn.classList.toggle('burn--static', !pinned);
    if (pinned) { active = -1; updateBurn(); if (active < 0) setActive(0); }
    else frames.forEach((f) => { delete f.dataset.pos; f.removeAttribute('aria-hidden'); });
  };

  steps.forEach((s) => s.addEventListener('click', () => scrollToStep(+s.dataset.i)));

  /* ---- 2. Guide tabs ----------------------------------------------------- */
  const heroTabs = $('[data-ht-tabs]');
  const hero = $('[data-ht-hero]');
  const cta = $('[data-ht-cta]');
  let floatTabs = null;

  if (heroTabs) {
    floatTabs = heroTabs.cloneNode(true);
    floatTabs.classList.add('ht-tabs--float');
    floatTabs.removeAttribute('data-ht-tabs');
    floatTabs.setAttribute('aria-label', 'Guide sections (floating)');
    $$('a', floatTabs).forEach((a) => a.setAttribute('tabindex', '-1'));
    document.body.append(floatTabs);
  }
  const allTabs = () => [...(heroTabs ? $$('.ht-tab', heroTabs) : []), ...(floatTabs ? $$('.ht-tab', floatTabs) : [])];

  const sections = [
    ['setup', '#setup'],
    ['use', '#use'],
    ['safety', '#safety'],
    ['clean-up', '#clean-up'],
  ].map(([key, sel]) => [key, $(sel)]).filter(([, el]) => el);

  let current = 'setup';
  function syncTabs() {
    const line = window.innerHeight * 0.4;
    let key = 'setup';
    sections.forEach(([k, el]) => { if (el.getBoundingClientRect().top <= line) key = k; });
    if (key === 'use' && active === N - 1 && pinned) key = 'put-it-out';
    if (key === current && allTabs().some((t) => t.classList.contains('is-active'))) return;
    current = key;
    allTabs().forEach((t) => {
      const on = t.dataset.tab === key;
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    });
    // keep the active chip visible when the bar scrolls horizontally (mobile)
    if (floatTabs) {
      const chip = $(`.ht-tab[data-tab="${key}"]`, floatTabs);
      if (chip && floatTabs.scrollWidth > floatTabs.clientWidth) floatTabs.scrollLeft = chip.offsetLeft - 40;
    }
  }

  const syncFloat = () => {
    if (!floatTabs || !hero) return;
    const heroGone = hero.getBoundingClientRect().bottom < 0;
    const ctaIn = cta ? cta.getBoundingClientRect().top < window.innerHeight * 0.85 : false;
    floatTabs.classList.toggle('is-shown', heroGone && !ctaIn);
    $$('a', floatTabs).forEach((a) => a.setAttribute('tabindex', heroGone && !ctaIn ? '0' : '-1'));
  };

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.ht-tab');
    if (!tab) return;
    if (tab.dataset.burnStep !== undefined) {
      e.preventDefault();
      scrollToStep(+tab.dataset.burnStep);
    }
  });

  /* ---- When the smoke clears: scroll-scrubbed assembly -------------------
     Section progress drives the holder; each column gets its own --cp,
     staggered so 01 → 02 → 03 arrive in sequence (desktop) or as each
     stacked column reaches the viewport (mobile). */
  const clears = document.querySelector('.ht-clears');
  const clearCols = clears ? [...clears.querySelectorAll('.ht-clear')] : [];
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const updateClears = () => {
    if (!clears || reduce.matches) return;
    const vh = window.innerHeight;
    const r = clears.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) return;
    // 0 when the section top hits the bottom of the viewport, 1 when it's ~35% up
    const sp = clamp01((vh - r.top) / (vh * 0.65));
    clears.style.setProperty('--sp', sp.toFixed(3));
    const stacked = window.innerWidth <= 900;
    clearCols.forEach((col, i) => {
      let cp;
      if (stacked) {
        const cr = col.getBoundingClientRect();
        cp = clamp01((vh * 0.92 - cr.top) / (vh * 0.35));
      } else {
        cp = clamp01((sp - 0.18 - i * 0.2) / 0.42);
      }
      col.style.setProperty('--cp', cp.toFixed(3));
    });
  };
  if (reduce.matches) clearCols.forEach((c) => c.style.removeProperty('--cp'));

  /* ---- Loop -------------------------------------------------------------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateBurn();
      updateClears();
      syncTabs();
      syncFloat();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  desktop.addEventListener?.('change', () => { setMode(); onScroll(); });
  reduce.addEventListener?.('change', () => { setMode(); onScroll(); });

  setMode();
  onScroll();
})();
