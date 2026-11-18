/* ==========================================================================
   Mr. Sniff's — the Smell Test
   Four questions, one per screen. Each answer leans Bonfire (b), Yoga Studio
   (y) or both. Highest score wins; a tie recommends the Duo. No email gate.
   ========================================================================== */
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const root = $('[data-smell-test]');
  if (!root) return;

  const steps = $$('.st-q', root);
  const results = $$('[data-result]', root);
  const bar = $('[data-st-bar]', root);
  const count = $('[data-st-count]', root);
  const fill = $('[data-st-fill]', root);
  const back = $('[data-st-back]', root);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let answers = [];
  let step = 0;

  const show = (el) => {
    el.hidden = false;
    if (reduce) return;
    el.classList.remove('is-in');
    void el.offsetWidth;
    el.classList.add('is-in');
  };

  const goTo = (i) => {
    step = i;
    steps.forEach((s, k) => { s.hidden = k !== i; });
    results.forEach((r) => { r.hidden = true; });
    bar.hidden = false;
    count.textContent = `Question ${i + 1} of ${steps.length}`;
    fill.style.transform = `scaleX(${i / steps.length})`;
    back.hidden = i === 0;
    // restore a previous pick when coming back
    $$('.st-opt', steps[i]).forEach((o, k) => o.classList.toggle('is-picked', answers[i] === o.dataset.lean && answers[`${i}k`] === k));
    show(steps[i]);
  };

  const finish = () => {
    let b = 0, y = 0;
    for (let i = 0; i < steps.length; i++) {
      if (answers[i] === 'b' || answers[i] === 'both') b++;
      if (answers[i] === 'y' || answers[i] === 'both') y++;
    }
    const pick = b > y ? 'bonfire' : y > b ? 'yoga' : 'duo';
    steps.forEach((s) => { s.hidden = true; });
    bar.hidden = true;
    const r = results.find((el) => el.dataset.result === pick);
    show(r);
    root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    $('h2', r)?.setAttribute('tabindex', '-1');
    $('h2', r)?.focus({ preventScroll: true });
  };

  steps.forEach((s, i) => {
    $$('.st-opt', s).forEach((opt, k) => {
      opt.addEventListener('click', () => {
        answers[i] = opt.dataset.lean;
        answers[`${i}k`] = k;
        $$('.st-opt', s).forEach((o) => o.classList.toggle('is-picked', o === opt));
        fill.style.transform = `scaleX(${(i + 1) / steps.length})`;
        setTimeout(() => (i + 1 < steps.length ? goTo(i + 1) : finish()), reduce ? 0 : 320);
      });
    });
  });

  back.addEventListener('click', () => { if (step > 0) goTo(step - 1); });
  $$('[data-retake]', root).forEach((b) => b.addEventListener('click', () => {
    answers = [];
    goTo(0);
    root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));

  // hero CTA: smooth-scroll down and put focus on the first answer
  $$('a[href="#smell-test"]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => $('.st-opt', steps[step])?.focus({ preventScroll: true }), reduce ? 0 : 500);
  }));

  goTo(0);
})();
