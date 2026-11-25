/* ==========================================================================
   Mr. Sniff's — the Smell Test
   One question per screen. Everything is read from the markup that
   sections/smell-quiz.liquid renders, so questions and answers are editable:
     .st-q                 a question (any number)
     .st-opt[data-lean]    an answer; data-lean = the result key it scores
                           ("bonfire", "yoga") or "both" (scores every result)
     [data-result]         a result panel, keyed by the same names
     [data-tie]            on the root: the result shown on a tie (the Duo)
     [data-count-text]     on the root: "Question [n] of [total]"
   Highest score wins; a tie recommends the tie result. No email gate.
   Add to cart on a result is a [data-add-to-cart] button, handled by
   cart.js (window.MrSniffsCart.add).
   ========================================================================== */
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const init = (root) => {
    if (!root || root.dataset.stReady) return;
    root.dataset.stReady = '1';

    const steps = $$('.st-q', root);
    const results = $$('[data-result]', root);
    const bar = $('[data-st-bar]', root);
    const count = $('[data-st-count]', root);
    const fill = $('[data-st-fill]', root);
    const back = $('[data-st-back]', root);
    const tieKey = root.dataset.tie || 'duo';
    const countText = root.dataset.countText || 'Question [n] of [total]';
    // every result except the tie result gets a score
    const scoreKeys = results.map((r) => r.dataset.result).filter((k) => k && k !== tieKey);
    let answers = [];
    let step = 0;

    const show = (el) => {
      if (!el) return;
      el.hidden = false;
      if (reduce) return;
      el.classList.remove('is-in');
      void el.offsetWidth;
      el.classList.add('is-in');
    };

    const goTo = (i) => {
      if (!steps.length) return;
      step = i;
      steps.forEach((s, k) => { s.hidden = k !== i; });
      results.forEach((r) => { r.hidden = true; });
      if (bar) bar.hidden = false;
      if (count) count.textContent = countText.replace('[n]', i + 1).replace('[total]', steps.length);
      if (fill) fill.style.transform = `scaleX(${i / steps.length})`;
      if (back) back.hidden = i === 0;
      // restore a previous pick when coming back
      $$('.st-opt', steps[i]).forEach((o, k) => o.classList.toggle('is-picked', answers[i] === k));
      show(steps[i]);
    };

    const pickResult = () => {
      const score = Object.fromEntries(scoreKeys.map((k) => [k, 0]));
      answers.forEach((k, i) => {
        if (k === undefined) return;
        const lean = $$('.st-opt', steps[i])[k]?.dataset.lean;
        if (lean === 'both') scoreKeys.forEach((key) => { score[key]++; });
        else if (lean in score) score[lean]++;
      });
      const top = Math.max(0, ...Object.values(score));
      const winners = scoreKeys.filter((k) => score[k] === top);
      return winners.length === 1 ? winners[0] : tieKey;
    };

    const showResult = (key) => {
      steps.forEach((s) => { s.hidden = true; });
      results.forEach((r) => { r.hidden = true; });
      if (bar) bar.hidden = true;
      const r = results.find((el) => el.dataset.result === key) || results.find((el) => el.dataset.result === tieKey);
      show(r);
      return r;
    };

    const finish = () => {
      const r = showResult(pickResult());
      root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      const h = r && $('h2', r);
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    };

    steps.forEach((s, i) => {
      $$('.st-opt', s).forEach((opt, k) => {
        opt.addEventListener('click', () => {
          answers[i] = k;
          $$('.st-opt', s).forEach((o) => o.classList.toggle('is-picked', o === opt));
          if (fill) fill.style.transform = `scaleX(${(i + 1) / steps.length})`;
          setTimeout(() => (i + 1 < steps.length ? goTo(i + 1) : finish()), reduce ? 0 : 320);
        });
      });
    });

    back?.addEventListener('click', () => { if (step > 0) goTo(step - 1); });
    $$('[data-retake]', root).forEach((b) => b.addEventListener('click', () => {
      answers = [];
      goTo(0);
      root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }));

    // theme editor: jump to the question being edited
    root.stShowStep = (el) => { const i = steps.indexOf(el); if (i > -1) goTo(i); };
    root.stFocus = () => setTimeout(() => $('.st-opt', steps[step])?.focus({ preventScroll: true }), reduce ? 0 : 500);

    goTo(0);
  };

  const quiz = () => $('[data-smell-test]');

  // hero CTA (any section on the page): smooth-scroll down and focus the first answer
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#smell-test"]');
    const root = quiz();
    if (!a || !root) return;
    e.preventDefault();
    root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    root.stFocus?.();
  });

  init(quiz());

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', (e) => init($('[data-smell-test]', e.target)));
    document.addEventListener('shopify:block:select', (e) => {
      const root = e.target.closest('[data-smell-test]');
      if (root && root.stShowStep) root.stShowStep(e.target);
    });
  }
})();
