/* ==========================================================================
   Mr. Sniff's — inner page behaviour: contact form, FAQ topic list, page TOC
   The contact form is Shopify's contact form: we validate on the client and,
   when everything is filled in, let it submit natively. Shopify reloads the
   page with form.posted_successfully? / form.errors rendered by Liquid.
   ========================================================================== */
(() => {
  if (window.__msInfo) return;
  window.__msInfo = true;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---- Contact form: validate, then submit to Shopify -------------------- */
  const initContact = (form) => {
    if (form.dataset.msBound) return;
    form.dataset.msBound = '1';
    const msg = $('[data-contact-msg]', form);
    const field = (name) => $(`[data-field="${name}"]`, form);
    form.addEventListener('submit', (e) => {
      const name = field('name');
      const email = field('email');
      const message = field('message');
      const checks = [
        [name, !!name && name.value.trim().length > 0],
        [email, !!email && EMAIL_RE.test(email.value.trim())],
        [message, !!message && message.value.trim().length > 0],
      ];
      let first = null;
      checks.forEach(([el, ok]) => {
        if (!el) return;
        el.closest('.field').classList.toggle('is-invalid', !ok);
        if (!ok && !first) first = el;
      });
      if (first) {
        e.preventDefault();
        if (msg) {
          msg.textContent = form.dataset.error || 'Add your name, a valid email and a message, then send again.';
          msg.classList.remove('is-success');
          msg.classList.add('is-error');
        }
        first.focus();
        return;
      }
      if (msg) { msg.classList.remove('is-error'); msg.textContent = ''; }
      const btn = $('button[type="submit"]', form);
      if (btn) btn.setAttribute('aria-busy', 'true');
      // valid: no preventDefault, the browser posts the form to Shopify
    });
  };

  /* ---- Build an anchor list from headings on the page -------------------- */
  const slug = (text) => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const fillList = (nav, items) => {
    const ul = $('ul', nav);
    if (!ul) return;
    if (!items.length) { nav.hidden = true; return; }
    ul.textContent = '';
    items.forEach(({ id, label }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${id}`;
      a.textContent = label;
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.hidden = false;
  };

  // FAQ: a topic list with no links of its own lists every FAQ topic section
  const initFaqToc = () => {
    $$('[data-faq-toc]').forEach((nav) => {
      const items = $$('[data-faq-group]')
        .map((g) => ({ id: g.id, label: ($('h2', g) || g).textContent.trim() }))
        .filter((x) => x.id && x.label);
      fillList(nav, items);
    });
  };

  // Generic page: "On this page" from the h2s in page.content
  const initPageToc = () => {
    $$('[data-page-toc]').forEach((nav) => {
      const content = $('[data-page-content]');
      if (!content) return;
      const items = $$('h2', content).map((h) => {
        if (!h.id) {
          const base = slug(h.textContent) || 'section';
          let id = base;
          let n = 2;
          while (document.getElementById(id)) id = `${base}-${n++}`;
          h.id = id;
        }
        return { id: h.id, label: h.textContent.trim() };
      });
      fillList(nav, items);
    });
  };

  const init = () => {
    $$('[data-contact]').forEach(initContact);
    initFaqToc();
    initPageToc();
  };
  init();

  // Theme editor: rebuild after sections are added, removed or re-rendered
  if (window.Shopify && window.Shopify.designMode) {
    ['shopify:section:load', 'shopify:section:unload', 'shopify:section:reorder'].forEach((ev) => {
      document.addEventListener(ev, () => setTimeout(init, 0));
    });
  }
})();
