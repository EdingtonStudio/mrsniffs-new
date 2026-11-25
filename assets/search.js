/* ==========================================================================
   Mr. Sniff's — search overlay (Shopify predictive search)
   Opens from the nav magnifier or the "/" key. Results come from
   /search/suggest.json (products, pages, articles). Enter goes to /search.
   ========================================================================== */
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const CFG = window.MrSniffs || {};
  const R = CFG.routes || {};
  const trigger = $('[data-search-open]');
  if (!trigger) return;

  const SUGGEST = (CFG.searchSuggestions || []).map((s) => s.trim()).filter(Boolean);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => (window.MrSniffsCart ? window.MrSniffsCart.formatMoney(Math.round(parseFloat(v) * 100)) : `$${v}`);

  const el = document.createElement('div');
  el.className = 'search';
  el.hidden = true;
  el.innerHTML = `
    <div class="search__scrim" data-search-close></div>
    <div class="search__panel" role="dialog" aria-modal="true" aria-label="Search">
      <form class="search__bar" role="search" action="${esc(R.search || '/search')}" method="get" data-search-form>
        <img src="${esc((CFG.assets && CFG.assets.searchInk) || '')}" width="22" height="22" alt="" />
        <label class="sr-only" for="site-search">Search</label>
        <input id="site-search" class="search__input" name="q" type="search" placeholder="Search scents, holders, help" autocomplete="off" />
        <input type="hidden" name="options[prefix]" value="last" />
        <button class="search__close" type="button" aria-label="Close search" data-search-close><span></span><span></span></button>
      </form>
      <div class="search__results" data-search-results aria-live="polite"></div>
    </div>`;
  document.body.appendChild(el);
  const input = $('.search__input', el);
  const out = $('[data-search-results]', el);

  let ctrl = null;
  let timer = null;
  const render = () => {
    const q = input.value.trim();
    if (!q) {
      out.innerHTML = SUGGEST.length ? `<p class="search__label">Popular</p><div class="search__chips">${SUGGEST.map((s) => `<button type="button" class="search__chip" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '';
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (ctrl) ctrl.abort();
      ctrl = new AbortController();
      const url = `${R.predictiveSearch || '/search/suggest'}.json?q=${encodeURIComponent(q)}&resources[type]=product,page,article&resources[limit]=6&resources[options][unavailable_products]=last`;
      fetch(url, { signal: ctrl.signal }).then((r) => r.json()).then((data) => {
        const res = (data.resources && data.resources.results) || {};
        const products = res.products || [];
        const pages = [...(res.pages || []), ...(res.articles || [])];
        if (!products.length && !pages.length) {
          out.innerHTML = `<p class="search__none">Nothing matches “${esc(q)}”. Try a scent name, “holder” or “shipping”.</p>`;
          return;
        }
        out.innerHTML =
          (products.length ? `<p class="search__label">Products</p><ul class="search__products">${products.map((p) => `
            <li><a class="search-hit" href="${esc(p.url)}">
              <span class="search-hit__img">${p.image ? `<img src="${esc(p.image)}${p.image.includes('?') ? '&' : '?'}width=160" alt="" />` : ''}</span>
              <span class="search-hit__text"><span class="search-hit__title">${esc(p.title)}</span><span class="search-hit__note">${esc(p.available ? (p.type || '') : 'Sold out')}</span></span>
              <span class="search-hit__price">${money(p.price)}</span>
            </a></li>`).join('')}</ul>` : '') +
          (pages.length ? `<p class="search__label">Pages</p><ul class="search__pages">${pages.map((p) => `
            <li><a class="search-page" href="${esc(p.url)}"><span>${esc(p.title)}</span></a></li>`).join('')}</ul>` : '') +
          `<p class="search__label"><a class="text-link" href="${esc(R.search || '/search')}?q=${encodeURIComponent(q)}"><span>See all results</span></a></p>`;
      }).catch(() => {});
    }, 160);
  };

  let last = null;
  const open = () => {
    last = document.activeElement;
    el.hidden = false;
    document.documentElement.classList.add('search-open');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-open')));
    render();
    setTimeout(() => input.focus(), 50);
  };
  const close = () => {
    el.classList.remove('is-open');
    document.documentElement.classList.remove('search-open');
    setTimeout(() => { el.hidden = true; }, 350);
    if (last && last.focus) last.focus({ preventScroll: true });
  };

  trigger.addEventListener('click', open);
  input.addEventListener('input', render);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-search-close]')) return close();
    const chip = e.target.closest('[data-q]');
    if (chip) { input.value = chip.dataset.q; render(); input.focus(); }
  });
  document.addEventListener('keydown', (e) => {
    if (!el.hidden && e.key === 'Escape') close();
    if (el.hidden && e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
  });
})();
