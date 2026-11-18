/* ==========================================================================
   Mr. Sniff's — search overlay
   Opens from the nav magnifier (or "/" key). Static index for the preview.
   SHOPIFY PORT: swap search() for a fetch to
   /search/suggest.json?q=…&resources[type]=product,page,article
   and keep render() as is.
   ========================================================================== */
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const trigger = $('.nav__actions .icon-btn[aria-label="Search"]');
  if (!trigger) return;

  const INDEX = [
    { type: 'product', title: 'Bonfire · Agarwood', note: 'Incense · dark resin and smoke', price: '$24', url: 'bonfire.html', img: 'assets/img/box-bonfire.webp', box: true, words: 'bonfire agarwood oud incense smoky dark resin night woody' },
    { type: 'product', title: 'Yoga Studio · Palo Santo', note: 'Incense · warm resin and citrus', price: '$24', url: 'yoga-studio.html', img: 'assets/img/box-yoga.webp', box: true, words: 'yoga studio palo santo incense citrus calm reset resin' },
    { type: 'product', title: 'The Duo', note: 'Bonfire + Yoga Studio', price: '$42', url: 'duo.html', img: 'assets/img/shop-duo.webp', words: 'duo bundle both two pack gift set' },
    { type: 'product', title: 'Ash Catchum', note: 'Stoneware ash catcher · sold out', price: '$22', url: 'ash-catchum.html', img: 'assets/img/holder-ash-catchum.webp', words: 'ash catchum holder holders stoneware round dish ash catcher' },
    { type: 'product', title: 'Stachin’ Ash', note: 'Moustache ash catcher', price: '$38', url: 'stachin-ash.html', img: 'assets/img/holder-stachin-ash.webp', words: 'stachin ash holder holders moustache mustache stoneware' },
    { type: 'product', title: 'Brass Monkey', note: 'Blackened brass holder · sold out', price: '$85', url: 'brass-monkey.html', img: 'assets/img/holder-brass-monkey.webp', words: 'brass monkey holder holders metal tray' },
    { type: 'page', title: 'Shop all', note: 'Incense and holders', url: 'shop.html', words: 'shop all products collection compare' },
    { type: 'page', title: 'Find your scent', note: 'The Smell Test · 4 questions', url: 'smell-test.html', words: 'smell test quiz find your scent whiff recommend which' },
    { type: 'page', title: 'How to use incense', note: 'Set up, light, put out, clean up', url: 'how-to.html', words: 'how to use light burn safety clean up guide' },
    { type: 'page', title: 'FAQ', note: 'Scents, burning, orders and returns', url: 'faq.html', words: 'faq questions help sticks burn time made of ingredients' },
    { type: 'page', title: 'Shipping', note: 'Where we ship and how long it takes', url: 'shipping-policy.html', words: 'shipping delivery tracking where ship time' },
    { type: 'page', title: 'Returns & refunds', note: 'How returns work', url: 'refund-policy.html', words: 'returns refund exchange damaged' },
    { type: 'page', title: 'Contact', note: 'hello@mrsniffs.com', url: 'contact.html', words: 'contact email help support wholesale collab' },
  ];
  const SUGGEST = ['Bonfire', 'Palo santo', 'Holders', 'Burn time', 'Shipping'];

  const search = (q) => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return INDEX
      .map((item) => {
        const hay = `${item.title} ${item.note} ${item.words}`.toLowerCase();
        const score = terms.reduce((s, t) => s + (hay.includes(t) ? (item.title.toLowerCase().includes(t) ? 3 : 1) : -99), 0);
        return { item, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  };

  const el = document.createElement('div');
  el.className = 'search';
  el.hidden = true;
  el.innerHTML = `
    <div class="search__scrim" data-search-close></div>
    <div class="search__panel" role="dialog" aria-modal="true" aria-label="Search">
      <form class="search__bar" role="search" data-search-form>
        <img src="assets/icons/search-ink.svg" width="22" height="22" alt="" />
        <label class="sr-only" for="site-search">Search Mr. Sniff's</label>
        <input id="site-search" class="search__input" type="search" placeholder="Search scents, holders, help" autocomplete="off" />
        <button class="search__close" type="button" aria-label="Close search" data-search-close><span></span><span></span></button>
      </form>
      <div class="search__results" data-search-results aria-live="polite"></div>
    </div>`;
  document.body.appendChild(el);
  const input = $('.search__input', el);
  const out = $('[data-search-results]', el);

  const render = () => {
    const q = input.value.trim();
    if (!q) {
      out.innerHTML = `<p class="search__label">Popular</p><div class="search__chips">${SUGGEST.map((s) => `<button type="button" class="search__chip" data-q="${s}">${s}</button>`).join('')}</div>`;
      return;
    }
    const hits = search(q);
    if (!hits.length) {
      out.innerHTML = `<p class="search__none">Nothing matches “${q.replace(/</g, '&lt;')}”. Try a scent name, “holder” or “shipping”.</p>`;
      return;
    }
    const products = hits.filter((h) => h.type === 'product');
    const pages = hits.filter((h) => h.type === 'page');
    out.innerHTML =
      (products.length ? `<p class="search__label">Products</p><ul class="search__products">${products.map((p) => `
        <li><a class="search-hit" href="${p.url}">
          <span class="search-hit__img${p.box ? ' search-hit__img--box' : ''}"><img src="${p.img}" alt="" /></span>
          <span class="search-hit__text"><span class="search-hit__title">${p.title}</span><span class="search-hit__note">${p.note}</span></span>
          <span class="search-hit__price">${p.price}</span>
        </a></li>`).join('')}</ul>` : '') +
      (pages.length ? `<p class="search__label">Pages</p><ul class="search__pages">${pages.map((p) => `
        <li><a class="search-page" href="${p.url}"><span>${p.title}</span><span class="search-hit__note">${p.note}</span></a></li>`).join('')}</ul>` : '');
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
    last?.focus?.({ preventScroll: true });
  };

  trigger.addEventListener('click', open);
  input.addEventListener('input', render);
  $('[data-search-form]', el).addEventListener('submit', (e) => {
    e.preventDefault();
    const first = $('a', out);
    if (first) location.href = first.getAttribute('href');
  });
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
