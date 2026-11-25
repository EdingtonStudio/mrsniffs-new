/* ==========================================================================
   Mr. Sniff's — interaction layer
   Vanilla, no deps. Each module is self-contained and no-ops if its markup
   isn't on the page, so they port cleanly into Shopify section JS later.
   ========================================================================== */
(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---- Buttons: build the interactive-hover markup from the text ------- */
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

  const buildBtn = (btn) => {
    if (btn.querySelector('.btn__label')) return;
    const text = btn.textContent.trim();
    btn.textContent = '';
    const label = document.createElement('span');
    label.className = 'btn__label';
    label.textContent = text;
    const hover = document.createElement('span');
    hover.className = 'btn__hover';
    hover.setAttribute('aria-hidden', 'true');
    hover.innerHTML = `<span></span>${ARROW}`;
    hover.firstElementChild.textContent = text;
    const dot = document.createElement('span');
    dot.className = 'btn__dot';
    dot.setAttribute('aria-hidden', 'true');
    btn.append(label, hover, dot);
  };
  $$('.btn').forEach(buildBtn);

  // Centre the dot in the label's reserved left slot (the original's 20%
  // lands on the text on wide buttons). Re-measure when a button resizes.
  const placeDot = (btn) => {
    const label = btn.querySelector('.btn__label');
    if (!label) return;
    const slot = parseFloat(getComputedStyle(label).paddingLeft) || 0;
    btn.style.setProperty('--dot-x', `${label.offsetLeft + (slot - 8) / 2 - 2}px`);
  };
  const dotRO = 'ResizeObserver' in window ? new ResizeObserver((es) => es.forEach((e) => placeDot(e.target))) : null;
  $$('.btn').forEach((btn) => { placeDot(btn); dotRO?.observe(btn); });
  document.fonts?.ready.then(() => $$('.btn').forEach(placeDot));
  // late-rendered buttons (cart drawer, smell test) ask for the same treatment
  document.addEventListener('mrsniffs:buttons', (e) => {
    $$('.btn', e.detail?.root || document).forEach((btn) => { buildBtn(btn); placeDot(btn); dotRO?.observe(btn); });
  });

  const setBtnLabel = (btn, text) => {
    const label = btn.querySelector('.btn__label');
    if (!label) { btn.textContent = text; return; }
    label.textContent = text;
    btn.querySelector('.btn__hover > span').textContent = text;
  };

  /* ---- Split headlines into masked words -------------------------------- */
  $$('[data-split]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words
      .map((w, i) => `<span class="split-word" aria-hidden="true" style="--w:${i}"><span>${w}</span></span>`)
      .join(' ');
  });

  /* ---- Reveal on scroll -------------------------------------------------- */
  const revealTargets = $$('[data-reveal], [data-split]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ---- Header: condense after the banner, hide on scroll down ----------- */
  const header = $('[data-header]');
  const menu = $('[data-menu]');
  const burger = $('[data-burger]');
  let lastY = window.scrollY;

  const onHeaderScroll = () => {
    if (!header) return;
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 28);
    const goingDown = y > lastY && y > 400;
    const menuOpen = menu && menu.classList.contains('is-open');
    header.classList.toggle('is-hidden', goingDown && !menuOpen);
    lastY = y;
  };

  /* ---- Mobile menu ------------------------------------------------------- */
  const setMenu = (open) => {
    if (!menu || !burger) return;
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger?.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---- Parallax (uses the `translate` property so it composes with
         transform-based hover states and keyframes) ----------------------- */
  const parallaxEls = reduceMotion ? [] : $$('[data-parallax]');
  const applyParallax = () => {
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const speed = parseFloat(el.dataset.parallax) || 0;
      const offset = (r.top + r.height / 2 - vh / 2) * speed;
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onHeaderScroll();
      applyParallax();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---- Gallery: fan-in entrance + pointer depth ------------------------- */
  const gallery = $('[data-gallery]');
  if (gallery && !reduceMotion) {
    const items = $$('.gallery__item', gallery);
    gallery.dataset.state = 'pre';
    const gio = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      gio.disconnect();
      requestAnimationFrame(() => {
        gallery.dataset.state = 'in';
        setTimeout(() => (gallery.dataset.state = 'done'), 1500);
      });
    }, { threshold: 0.2 });
    gio.observe(gallery);

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (finePointer) {
      gallery.addEventListener('pointermove', (e) => {
        const r = gallery.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        items.forEach((item) => {
          const d = parseFloat(item.dataset.depth) || 0.5;
          item.style.setProperty('--px', (-nx * 18 * d).toFixed(2));
          item.style.setProperty('--py', (-ny * 12 * d).toFixed(2));
        });
      });
      gallery.addEventListener('pointerleave', () => {
        items.forEach((item) => {
          item.style.setProperty('--px', 0);
          item.style.setProperty('--py', 0);
        });
      });
    }
  }

  /* ---- Add-to-cart button feedback (the cart itself lives in cart.js) -- */
  $$('[data-add-to-cart]').forEach((btn) => {
    if (btn.hasAttribute('data-cart-proxy')) return;
    btn.addEventListener('click', () => {
      if (btn.classList.contains('icon-btn')) {
        btn.classList.remove('is-added');
        void btn.offsetWidth;
        btn.classList.add('is-added');
        setTimeout(() => btn.classList.remove('is-added'), 1400);
      } else {
        const was = btn.querySelector('.btn__label')?.textContent || btn.textContent;
        btn.classList.add('is-done');
        setBtnLabel(btn, 'Added ✓');
        setTimeout(() => {
          btn.classList.remove('is-done');
          setBtnLabel(btn, was);
        }, 1600);
      }
    });
  });

  /* ---- Notify me (inline restock capture) ------------------------------- */
  $$('[data-notify]').forEach((wrap) => {
    const open = $('[data-notify-open]', wrap);
    const form = $('[data-notify-form]', wrap);
    const msg = $('[data-notify-msg]', wrap);
    const input = $('input', form);

    open.addEventListener('click', () => {
      open.hidden = true;
      form.hidden = false;
      input.focus();
    });

    form.addEventListener('submit', (e) => {
      form.classList.remove('is-error');
      if (!EMAIL_RE.test(input.value.trim())) {
        e.preventDefault();
        void form.offsetWidth;
        form.classList.add('is-error');
        msg.className = 'form-msg is-error';
        msg.textContent = 'Enter a valid email address.';
        return;
      }
      // valid: let it post to Shopify (/contact); success shows after the redirect
    });
    // back from Shopify's contact post: show success on the card that was submitted
    if (/[?&]contact_posted=true/.test(location.search) && form.id && location.hash === `#${form.id}`) {
      open.hidden = true;
      form.hidden = true;
      msg.className = 'form-msg is-success';
      msg.textContent = "You're on the list for this one.";
    }
  });

  /* ---- How-to stepper: auto-advance while visible, pause on hover ------- */
  const steps = $('[data-steps]');
  if (steps) {
    const items = $$('.step', steps);
    const STEP_MS = 4000;
    steps.style.setProperty('--step-dur', `${STEP_MS}ms`);
    let active = 0;
    let timer = null;
    let visible = false;
    let paused = false;

    const activate = (i) => {
      active = (i + items.length) % items.length;
      items.forEach((li, idx) => {
        const on = idx === active;
        li.classList.toggle('is-active', on);
        $('.step__trigger', li).setAttribute('aria-pressed', String(on));
        // restart progress bar
        const bar = $('.step__progress', li);
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animation = '';
      });
    };

    const schedule = () => {
      clearTimeout(timer);
      if (reduceMotion || !visible || paused) return;
      timer = setTimeout(() => { activate(active + 1); schedule(); }, STEP_MS);
    };

    items.forEach((li, idx) => {
      $('.step__trigger', li).addEventListener('click', () => { activate(idx); schedule(); });
    });
    steps.addEventListener('pointerenter', () => { paused = true; steps.classList.add('is-paused'); clearTimeout(timer); });
    steps.addEventListener('pointerleave', () => { paused = false; steps.classList.remove('is-paused'); activate(active); schedule(); });
    steps.addEventListener('focusin', () => { paused = true; steps.classList.add('is-paused'); clearTimeout(timer); });
    steps.addEventListener('focusout', () => { paused = false; steps.classList.remove('is-paused'); schedule(); });

    if (reduceMotion) steps.classList.add('is-paused');
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) { activate(active); schedule(); } else clearTimeout(timer);
    }, { threshold: 0.4 }).observe(steps);
  }

  /* ---- FAQ accordion: animate <details> open/close ---------------------- */
  $$('[data-accordion]').forEach((details) => {
    const summary = $('summary', details);
    const panel = $('.accordion__panel', details);
    let anim = null;

    summary.addEventListener('click', (e) => {
      if (reduceMotion || !panel.animate) return;
      e.preventDefault();
      anim?.cancel();
      if (details.open) {
        details.classList.add('is-closing');
        const h = panel.offsetHeight;
        anim = panel.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(0.65,0,0.35,1)' });
        anim.onfinish = () => { details.open = false; details.classList.remove('is-closing'); };
      } else {
        // close siblings for a tidy single-open accordion
        $$('[data-accordion][open]').forEach((d) => { if (d !== details) d.open = false; });
        details.open = true;
        const h = panel.offsetHeight;
        anim = panel.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 420, easing: 'cubic-bezier(0.22,1,0.36,1)' });
      }
    });
  });

  /* ---- Newsletter: validation + consent, then Klaviyo or Shopify --------
     If Klaviyo keys are set in theme settings, subscribe through Klaviyo's
     client API (no page reload). Otherwise submit the Shopify customer form,
     which adds an email-subscribed customer that Klaviyo syncs from Shopify. */
  const KL = (window.MrSniffs && window.MrSniffs.klaviyo) || {};
  const klaviyoSubscribe = (address, listId) => fetch(`https://a.klaviyo.com/client/subscriptions/?company_id=${encodeURIComponent(KL.companyId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', revision: '2024-10-15' },
    body: JSON.stringify({ data: { type: 'subscription', attributes: { profile: { data: { type: 'profile', attributes: { email: address } } } }, relationships: { list: { data: { type: 'list', id: listId } } } } }),
  }).then((r) => { if (!r.ok) throw new Error(String(r.status)); });

  document.querySelectorAll('[data-signup]').forEach((signup) => {
    const email = signup.querySelector('input[type="email"]');
    const consent = signup.querySelector('input[type="checkbox"]');
    const msg = $('[data-signup-msg]', signup);
    const submit = $('button[type="submit"]', signup);
    if (!email || !msg || !submit) return;
    const success = () => {
      msg.className = 'form-msg is-success';
      msg.textContent = signup.dataset.success || "You're in. First whiff is yours.";
      setBtnLabel(submit, 'Done ✓');
      submit.disabled = true;
      email.disabled = true;
    };
    if (signup.querySelector('[data-posted]')) success();

    signup.addEventListener('submit', (e) => {
      signup.classList.remove('is-error', 'is-consent-error');
      void signup.offsetWidth;

      if (!EMAIL_RE.test(email.value.trim())) {
        e.preventDefault();
        signup.classList.add('is-error');
        msg.className = 'form-msg is-error';
        msg.textContent = 'Enter a valid email address.';
        email.focus();
        return;
      }
      if (consent && !consent.checked) {
        e.preventDefault();
        signup.classList.add('is-consent-error');
        msg.className = 'form-msg is-error';
        msg.textContent = 'Tick the box so we can email you.';
        return;
      }
      const listId = signup.dataset.klaviyoList || KL.listId;
      if (KL.companyId && listId) {
        e.preventDefault();
        submit.disabled = true;
        klaviyoSubscribe(email.value.trim(), listId).then(success).catch(() => {
          submit.disabled = false;
          msg.className = 'form-msg is-error';
          msg.textContent = 'Something went wrong. Try again in a moment.';
        });
      }
      // no Klaviyo keys: let the Shopify customer form submit normally
    });
  });

  /* ---- Theme editor: re-run button + reveal setup on re-rendered sections */
  if (window.Shopify && window.Shopify.designMode) {
    const wake = (root) => {
      document.dispatchEvent(new CustomEvent('mrsniffs:buttons', { detail: { root } }));
      root.querySelectorAll('[data-reveal], [data-split]').forEach((n) => n.classList.add('is-in', 'is-visible'));
    };
    document.addEventListener('shopify:section:load', (e) => wake(e.target));
  }
})();
