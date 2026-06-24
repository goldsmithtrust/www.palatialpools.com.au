/*
 * Palatial Pools — Online Store app shell
 *
 * Every page under /store/ is a complete, indexable HTML document. This
 * script progressively upgrades navigation so that clicking inside the
 * store feels like a single-window application: the persistent header,
 * search and cart pill stay put while only the main content region is
 * swapped in via fetch + DOM patching.
 *
 * It also owns the localStorage shopping cart, the toast notifier, the
 * header search box, and the on-page renderers used by the cart and
 * checkout pages.
 *
 * Crucially, if JavaScript is disabled or fails to load, every link is
 * still a regular anchor pointing to a real URL, so search engines and
 * non-JS clients see exactly the same content.
 */
(function () {
  'use strict';

  const STORE = (window.PalatialStore = window.PalatialStore || {});
  const CART_KEY = 'palatial_store_cart_v1';
  const STORE_ROOT = '/store/';
  // Tracks the path of the content currently mounted in <main>. We can't
  // rely on window.location for this because popstate fires after the
  // browser has already updated the address bar — the guard against
  // re-rendering the same URL must use what's actually in the DOM.
  let renderedPath = window.location.pathname + window.location.search;

  // ─────────────────── Cart state (localStorage) ───────────────────

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return { items: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
      return parsed;
    } catch (e) {
      return { items: [] };
    }
  }
  function writeCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* quota etc. */ }
    refreshCartBadge();
    renderCartDrawer();
    window.dispatchEvent(new CustomEvent('palatial-cart-change'));
  }
  function cartCount(cart) {
    cart = cart || readCart();
    return cart.items.reduce((n, i) => n + (i.qty || 0), 0);
  }
  function addToCart(slug, qty, opts) {
    qty = Math.max(1, parseInt(qty || 1, 10));
    opts = opts || {};
    const cart = readCart();
    const existing = cart.items.find(i => i.slug === slug);
    if (existing) {
      existing.qty += qty;
      if (opts.subscribe) existing.subscribe = true;
    } else {
      const entry = { slug: slug, qty: qty };
      if (opts.subscribe) entry.subscribe = true;
      if (opts.install) {
        entry.install = true;
        entry.parentSlug = opts.parentSlug || null;
        entry.installPrice = opts.installPrice || 0;
      }
      cart.items.push(entry);
    }
    writeCart(cart);
  }
  function updateQty(slug, qty) {
    qty = parseInt(qty, 10);
    const cart = readCart();
    const idx = cart.items.findIndex(i => i.slug === slug);
    if (idx === -1) return;
    if (!qty || qty <= 0) cart.items.splice(idx, 1);
    else cart.items[idx].qty = qty;
    writeCart(cart);
  }
  function removeFromCart(slug) { updateQty(slug, 0); }
  function clearCart() { writeCart({ items: [] }); }

  STORE.cart = {
    read: readCart, add: addToCart, update: updateQty,
    remove: removeFromCart, clear: clearCart, count: cartCount,
  };
  STORE.addToCart = addToCart;
  STORE.removeFromCart = removeFromCart;
  STORE.updateQuantity = updateQty;
  STORE.getCartItems = function () { return readCart().items; };
  STORE.clearCart = clearCart;

  // ─────────────────── Toast ───────────────────

  let toastTimer = null;
  function toast(message) {
    let el = document.querySelector('.store-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'store-toast';
      el.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><span></span>';
      document.body.appendChild(el);
    }
    el.querySelector('span').textContent = message;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 1800);
  }
  STORE.toast = toast;

  // ─────────────────── Header / cart badge ───────────────────

  function refreshCartBadge() {
    const badge = document.querySelector('[data-cart-badge]');
    if (!badge) return;
    const n = cartCount();
    if (n > 0) { badge.textContent = String(n); badge.hidden = false; }
    else { badge.hidden = true; }
  }

  // ─────────────────── Search box ───────────────────

  function setupSearch() {
    const form = document.querySelector('[data-store-search]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const q = (form.querySelector('input').value || '').trim();
      const target = STORE_ROOT + 'search/' + (q ? '?q=' + encodeURIComponent(q) : '');
      navigate(target);
    });
  }

  // ─────────────────── SPA navigation ───────────────────

  const main = () => document.querySelector('[data-store-content]');
  const pageCache = new Map();

  function isInternal(href) {
    if (!href) return false;
    if (href.startsWith('#')) return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    try {
      const url = new URL(href, document.baseURI);
      if (url.origin !== window.location.origin) return false;
      return url.pathname.startsWith(STORE_ROOT);
    } catch (e) {
      return false;
    }
  }

  function setLoading(loading) {
    const root = document.querySelector('.store-main');
    if (!root) return;
    root.classList.toggle('is-loading', !!loading);
  }

  function applySubnavActive(pathname) {
    document.querySelectorAll('.store-subnav a').forEach(a => {
      const target = a.getAttribute('href');
      if (!target) return;
      const isHome = target === STORE_ROOT && pathname === STORE_ROOT;
      const isMatch = target !== STORE_ROOT && pathname.startsWith(target);
      a.classList.toggle('is-active', isHome || isMatch);
    });
  }

  async function fetchPage(url) {
    if (pageCache.has(url)) return pageCache.get(url);
    const res = await fetch(url, { headers: { 'Accept': 'text/html' } });
    if (!res.ok) throw new Error('Failed to fetch ' + url);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    pageCache.set(url, doc);
    return doc;
  }

  function swapHead(newDoc) {
    if (newDoc.title) document.title = newDoc.title;
    const descNew = newDoc.querySelector('meta[name="description"]');
    if (descNew) {
      let descCur = document.head.querySelector('meta[name="description"]');
      if (!descCur) {
        descCur = document.createElement('meta');
        descCur.setAttribute('name', 'description');
        document.head.appendChild(descCur);
      }
      descCur.setAttribute('content', descNew.getAttribute('content') || '');
    }
    const canonicalNew = newDoc.querySelector('link[rel="canonical"]');
    if (canonicalNew) {
      let canonicalCur = document.head.querySelector('link[rel="canonical"]');
      if (!canonicalCur) {
        canonicalCur = document.createElement('link');
        canonicalCur.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalCur);
      }
      canonicalCur.setAttribute('href', canonicalNew.getAttribute('href') || '');
    }
  }

  async function navigate(url, opts) {
    opts = opts || {};
    const target = new URL(url, document.baseURI);
    const targetPath = target.pathname + target.search;
    // Skip only when the DOM already shows this URL — never compare to
    // window.location, because popstate has already updated it.
    if (targetPath === renderedPath && !opts.force) return;
    const m = main();
    if (!m) { window.location.href = url; return; }
    setLoading(true);
    try {
      const doc = await fetchPage(targetPath);
      const newMain = doc.querySelector('[data-store-content]');
      if (!newMain) { window.location.href = url; return; }
      swapHead(doc);
      m.replaceWith(newMain);
      if (!opts.replace) history.pushState({ store: true }, '', targetPath + target.hash);
      renderedPath = targetPath;
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
      applySubnavActive(target.pathname);
      attachPageScripts();
      window.dispatchEvent(new CustomEvent('palatial-store-navigated', { detail: { pathname: target.pathname } }));
    } catch (err) {
      window.location.href = url;
    } finally {
      setLoading(false);
    }
  }
  STORE.navigate = navigate;

  function interceptClicks() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = e.target.closest('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '' && anchor.target !== '_self') return;
      const href = anchor.getAttribute('href');
      if (!href || !isInternal(href)) return;
      e.preventDefault();
      navigate(href);
    });

    window.addEventListener('popstate', function () {
      navigate(window.location.pathname + window.location.search, { replace: true });
    });
  }

  // ─────────────────── Page-scoped behaviour ───────────────────
  // Re-bind dynamic UI on each navigation.

  function attachPageScripts() {
    refreshCartBadge();
    applySubnavActive(window.location.pathname);

    // Add-to-cart buttons
    document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        const slug = btn.getAttribute('data-add-to-cart');
        const productScope = btn.closest('[data-product]');
        const qtyEl = productScope?.querySelector('[data-qty-value]');
        const qty = qtyEl ? parseInt(qtyEl.textContent, 10) || 1 : 1;
        const subscribed = productScope?.querySelector(`[data-subscribe="${slug}"]`)?.checked || false;
        addToCart(slug, qty, { subscribe: subscribed });
        btn.classList.add('is-added');
        setTimeout(() => btn.classList.remove('is-added'), 450);
        toast(subscribed ? 'Added — auto-replenish on' : 'Added to cart');
        openCartDrawer();
      });
    });

    // Service + Supply bundle buttons
    document.querySelectorAll('[data-add-bundle]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        const slug = btn.getAttribute('data-add-bundle');
        const productScope = btn.closest('[data-product]');
        const qtyEl = productScope?.querySelector('[data-qty-value]');
        const qty = qtyEl ? parseInt(qtyEl.textContent, 10) || 1 : 1;
        addToCart(slug, qty);
        const product = window.PalatialStore.getProduct(slug);
        const installPrice = product?.install?.price || 0;
        if (installPrice > 0) {
          addToCart('__install__:' + slug, 1, { install: true, parentSlug: slug, installPrice });
          toast('Bundle added — install scheduled');
        } else {
          toast('Added to cart');
        }
        openCartDrawer();
      });
    });

    // Advisor / Fitment / Trade form mounts
    const advisorHost = document.querySelector('[data-advisor-root]');
    if (advisorHost) bindAdvisor(advisorHost);
    const fitmentHost = document.querySelector('[data-fitment-root]');
    if (fitmentHost) bindFitment(fitmentHost);
    const tradeHost = document.querySelector('[data-trade-form]');
    if (tradeHost) bindTradeForm(tradeHost);

    // Qty steppers
    document.querySelectorAll('[data-qty-stepper]').forEach(stepper => {
      if (stepper.dataset.bound) return;
      stepper.dataset.bound = '1';
      const value = stepper.querySelector('[data-qty-value]');
      stepper.querySelector('[data-qty-dec]')?.addEventListener('click', () => {
        value.textContent = Math.max(1, (parseInt(value.textContent, 10) || 1) - 1);
      });
      stepper.querySelector('[data-qty-inc]')?.addEventListener('click', () => {
        value.textContent = Math.min(99, (parseInt(value.textContent, 10) || 1) + 1);
      });
    });

    // Cart page renderer
    const cartHost = document.querySelector('[data-cart-root]');
    if (cartHost) renderCart(cartHost);

    // Checkout page renderer + submit
    const checkoutHost = document.querySelector('[data-checkout-root]');
    if (checkoutHost) renderCheckout(checkoutHost);

    // Search results page renderer
    const searchHost = document.querySelector('[data-search-root]');
    if (searchHost) renderSearch(searchHost);

    bindStoreLanding();
    bindCartDrawer();
    bindMobileMenu();
  }

  // ─────────────────── Cart page ───────────────────

  function renderCart(host) {
    const cart = readCart();
    const products = (window.PalatialStore.products || []);
    // Resolve real products plus virtual install line items.
    const items = cart.items.map(i => {
      if (i.install) {
        const parent = products.find(p => p.slug === i.parentSlug);
        return {
          slug: i.slug,
          name: 'Installation — ' + (parent ? parent.name : 'service visit'),
          unit: 'Licensed pool technician',
          price: i.installPrice || 0,
          qty: i.qty,
          emoji: '🛠️',
          virtual: 'install',
        };
      }
      const p = products.find(x => x.slug === i.slug);
      if (!p) return null;
      return Object.assign({}, p, { qty: i.qty, subscribed: !!i.subscribe });
    }).filter(Boolean);
    const subtotal = items.reduce((n, p) => n + p.price * p.qty, 0);
    const gst = subtotal - (subtotal / 1.10);
    const total = subtotal;

    if (items.length === 0) {
      host.innerHTML = `
        <div class="cart-empty">
          <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6"/></svg>
          <h3 style="color:var(--navy);font-size:1.1rem;margin-bottom:.4rem">Your cart is empty</h3>
          <p>Browse the categories to add pool chemicals, equipment or parts.</p>
          <div style="margin-top:1.25rem"><a href="/store/" class="btn btn-primary">Shop the catalogue</a></div>
        </div>`;
      return;
    }

    host.innerHTML = `
      <div class="cart-layout">
        <div class="cart-items">
          <h3 style="font-size:1rem;font-weight:700;color:var(--navy);margin-bottom:.6rem">Your cart (${items.length})</h3>
          ${items.map(p => `
            <div class="cart-item" data-cart-slug="${escapeHtml(p.slug)}">
              <div class="cart-item-thumb">${p.image ? `<img src="${escapeHtml(p.image)}" alt="">` : (p.emoji || '📦')}</div>
              <div class="cart-item-meta">
                ${p.virtual === 'install'
                  ? `<span class="cart-item-name">${escapeHtml(p.name)}</span>`
                  : `<a href="/store/product/${escapeHtml(p.slug)}/" class="cart-item-name">${escapeHtml(p.name)}</a>`}
                <span class="cart-item-cat">${escapeHtml(p.unit || '')}${p.subscribed ? ' · Pool Pantry auto-replenish' : ''}${p.virtual === 'install' ? ' · scheduled by our office' : ''}</span>
                <div class="cart-item-actions">
                  <div class="qty-stepper" data-qty-stepper>
                    <button type="button" data-cart-dec aria-label="Decrease">−</button>
                    <span class="qty-value" data-qty-value>${p.qty}</span>
                    <button type="button" data-cart-inc aria-label="Increase">+</button>
                  </div>
                  <button class="cart-item-remove" data-cart-remove type="button">Remove</button>
                </div>
              </div>
              <div class="cart-item-price">${window.PalatialStore.formatPrice(p.price * p.qty)}</div>
            </div>`).join('')}
        </div>
        <aside class="cart-summary">
          <h3>Order summary</h3>
          <div class="cart-row"><span>Subtotal (incl. GST)</span><span>${window.PalatialStore.formatPrice(subtotal)}</span></div>
          <div class="cart-row"><span>GST (10%, included)</span><span>${window.PalatialStore.formatPrice(gst)}</span></div>
          <div class="cart-row"><span>Delivery</span><span>Calculated at request</span></div>
          <div class="cart-row total"><span>Total (AUD)</span><span>${window.PalatialStore.formatPrice(total)}</span></div>
          <div style="margin-top:1.1rem;display:flex;flex-direction:column;gap:.55rem">
            <a href="/store/checkout/" class="btn btn-primary btn-block">Continue to checkout</a>
            <a href="/store/" class="btn btn-ghost btn-block">Keep shopping</a>
          </div>
          <p style="font-size:.74rem;color:var(--text-muted);margin-top:.9rem;line-height:1.55">Checkout submits a request to our Abbotsford shop. We confirm price, stock and delivery before any payment is taken.</p>
        </aside>
      </div>`;

    host.querySelectorAll('[data-cart-slug]').forEach(row => {
      const slug = row.getAttribute('data-cart-slug');
      row.querySelector('[data-cart-dec]')?.addEventListener('click', () => {
        const cur = parseInt(row.querySelector('[data-qty-value]').textContent, 10) || 1;
        updateQty(slug, cur - 1);
        renderCart(host);
      });
      row.querySelector('[data-cart-inc]')?.addEventListener('click', () => {
        const cur = parseInt(row.querySelector('[data-qty-value]').textContent, 10) || 1;
        updateQty(slug, cur + 1);
        renderCart(host);
      });
      row.querySelector('[data-cart-remove]')?.addEventListener('click', () => {
        removeFromCart(slug);
        toast('Removed from cart');
        renderCart(host);
      });
    });
  }

  // ─────────────────── Checkout page ───────────────────

  function renderCheckout(host) {
    const cart = readCart();
    const products = (window.PalatialStore.products || []);
    const items = cart.items
      .map(i => Object.assign({}, products.find(p => p.slug === i.slug), { qty: i.qty }))
      .filter(p => p.slug);
    const subtotal = items.reduce((n, p) => n + p.price * p.qty, 0);

    if (items.length === 0) {
      host.innerHTML = `
        <div class="empty">
          <h3>Nothing to check out yet</h3>
          <p>Add a few items to your cart, then come back here to send your order to our team.</p>
          <div style="margin-top:1.25rem"><a href="/store/" class="btn btn-primary">Browse the store</a></div>
        </div>`;
      return;
    }

    host.innerHTML = `
      <div class="cart-layout">
        <form class="cart-items" data-checkout-form novalidate>
          <h3 style="font-size:1rem;font-weight:700;color:var(--navy);margin-bottom:.8rem">Your details</h3>
          <div class="form-grid">
            <div class="field"><label for="co-first">First name</label><input id="co-first" name="first" required autocomplete="given-name"/></div>
            <div class="field"><label for="co-last">Last name</label><input id="co-last" name="last" required autocomplete="family-name"/></div>
            <div class="field"><label for="co-email">Email</label><input id="co-email" name="email" type="email" required autocomplete="email"/></div>
            <div class="field"><label for="co-phone">Phone</label><input id="co-phone" name="phone" type="tel" required autocomplete="tel"/></div>
            <div class="field full"><label for="co-suburb">Delivery suburb</label><input id="co-suburb" name="suburb" placeholder="e.g. Kew, VIC" required/></div>
            <div class="field full"><label for="co-notes">Notes (pool size, equipment make, install needs)</label><textarea id="co-notes" name="notes" rows="3"></textarea></div>
            <div class="field full">
              <label for="co-method">Fulfilment</label>
              <select id="co-method" name="method">
                <option value="delivery">Delivery (Melbourne metro)</option>
                <option value="pickup">Pickup — Abbotsford shop</option>
                <option value="install">Schedule on-site service / install</option>
              </select>
            </div>
          </div>
          <div style="margin-top:1.2rem;display:flex;gap:.6rem;flex-wrap:wrap">
            <button class="btn btn-primary" type="submit">Send my order</button>
            <a class="btn btn-ghost" href="/store/cart/">Back to cart</a>
          </div>
          <p style="font-size:.78rem;color:var(--text-muted);margin-top:.8rem;line-height:1.55">
            We confirm price, stock and delivery before any payment. You can also call our shop on <a href="tel:+61342317665">03 4231 POOL</a>.
          </p>
        </form>
        <aside class="cart-summary">
          <h3>Order summary</h3>
          ${items.map(p => `
            <div class="cart-row"><span>${escapeHtml(p.name)} × ${p.qty}</span><span>${window.PalatialStore.formatPrice(p.price * p.qty)}</span></div>
          `).join('')}
          <div class="cart-row total"><span>Total (AUD, incl. GST)</span><span>${window.PalatialStore.formatPrice(subtotal)}</span></div>
        </aside>
      </div>`;

    host.querySelector('[data-checkout-form]')?.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      const lines = items.map(p => `  • ${p.qty} × ${p.name} (${p.sku || p.slug}) — ${window.PalatialStore.formatPrice(p.price * p.qty)}`).join('\n');
      const body = [
        'New order request from the Palatial Pools online store.',
        '',
        `Name:    ${data.first || ''} ${data.last || ''}`,
        `Email:   ${data.email || ''}`,
        `Phone:   ${data.phone || ''}`,
        `Suburb:  ${data.suburb || ''}`,
        `Method:  ${data.method || ''}`,
        '',
        'Items:',
        lines,
        '',
        `Total: ${window.PalatialStore.formatPrice(subtotal)} (incl. GST)`,
        '',
        'Notes:',
        (data.notes || '(none)'),
      ].join('\n');
      const subject = `Online store order — ${data.first || ''} ${data.last || ''}`.trim();
      const mailto = 'mailto:[REDACTED]?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      try {
        sessionStorage.setItem('palatial_last_order', JSON.stringify({ items: items, total: subtotal, email: data.email, name: `${data.first || ''} ${data.last || ''}`.trim() }));
      } catch (e) {}
      window.location.href = mailto;
      setTimeout(() => {
        clearCart();
        navigate('/store/order-confirmation/');
      }, 400);
    });
  }

  // ─────────────────── Search page ───────────────────

  function renderSearch(host) {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('q') || '').trim();
    const input = document.querySelector('[data-store-search] input');
    if (input) input.value = q;
    const results = q ? (window.PalatialStore.search ? window.PalatialStore.search(q) : []) : [];
    if (!q) {
      host.innerHTML = `<div class="empty"><h3>Type to search the catalogue</h3><p>Try “chlorine”, “cartridge”, “pole” or “meter”.</p></div>`;
      return;
    }
    if (results.length === 0) {
      host.innerHTML = `
        <div class="empty">
          <h3>No matches for “${escapeHtml(q)}”</h3>
          <p>Call us on <a href="tel:+61342317665">03 4231 POOL</a> and we'll source it for you.</p>
          <div style="margin-top:1rem"><a href="/store/" class="btn btn-ghost">Back to catalogue</a></div>
        </div>`;
      return;
    }
    host.innerHTML = `
      <h2 class="section-title">Results for “${escapeHtml(q)}”<small>${results.length} product${results.length === 1 ? '' : 's'}</small></h2>
      <div class="product-grid">
        ${results.map(productCard).join('')}
      </div>`;
  }

  // ─────────────────── Util ───────────────────

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  STORE.escapeHtml = escapeHtml;

  function productCard(p) {
    return `
      <a class="product-card" href="/store/product/${p.slug}/">
        <div class="product-card-media">
          ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">` : `<span>${p.emoji || '📦'}</span>`}
          ${p.tag ? `<span class="tag">${escapeHtml(p.tag)}</span>` : ''}
        </div>
        <div class="product-card-body">
          <span class="product-card-cat">${escapeHtml(p.category.replace('-', ' '))}</span>
          <span class="product-card-name">${escapeHtml(p.name)}</span>
          <span class="product-card-meta">${escapeHtml(p.short)}</span>
          <div class="product-card-foot">
            <span class="product-card-price">${window.PalatialStore.formatPrice(p.price)} <small>${escapeHtml(p.unit || '')}</small></span>
            ${p.stock === 'in' ? '<span class="pill pill-stock">In stock</span>' : p.stock === 'low' ? '<span class="pill pill-low">Low stock</span>' : '<span class="pill pill-out">Out</span>'}
          </div>
        </div>
      </a>`;
  }
  STORE.productCard = productCard;

  // ─────────────────── Store landing page interactions ───────────────────

  function bindStoreLanding() {
    const grid = document.querySelector('[data-store-filter-grid]');
    if (!grid || grid.dataset.bound) return;
    grid.dataset.bound = '1';

    function applyFilter(category) {
      category = category || 'all';
      document.querySelectorAll('[data-store-filter]').forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('data-store-filter') === category);
      });
      grid.querySelectorAll('[data-category]').forEach(card => {
        const categories = (card.getAttribute('data-category') || '').split(/\s+/);
        const show = category === 'all' || categories.includes(category);
        card.classList.toggle('is-filtered-out', !show);
      });
    }

    document.querySelectorAll('[data-store-filter]').forEach(btn => {
      if (btn.dataset.filterBound) return;
      btn.dataset.filterBound = '1';
      btn.addEventListener('click', () => applyFilter(btn.getAttribute('data-store-filter')));
    });

    document.querySelectorAll('[data-store-filter-link]').forEach(link => {
      if (link.dataset.filterBound) return;
      link.dataset.filterBound = '1';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.getAttribute('data-store-filter-link');
        document.querySelector('#shop-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        applyFilter(category);
      });
    });
  }

  function bindMobileMenu() {
    const header = document.querySelector('.store-nav-luxe');
    const toggle = document.querySelector('[data-store-menu-toggle]');
    if (!header || !toggle || toggle.dataset.bound) return;
    toggle.dataset.bound = '1';
    toggle.addEventListener('click', () => {
      const isOpen = header.classList.toggle('is-menu-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // ─────────────────── Slide-out cart drawer ───────────────────

  function bindCartDrawer() {
    const drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer || drawer.dataset.bound) return;
    drawer.dataset.bound = '1';
    document.querySelectorAll('[data-open-cart]').forEach(btn => {
      btn.addEventListener('click', openCartDrawer);
    });
    drawer.querySelector('[data-close-cart]')?.addEventListener('click', closeCartDrawer);
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) closeCartDrawer();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCartDrawer();
    });
    renderCartDrawer();
  }

  function openCartDrawer() {
    const drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;
    renderCartDrawer();
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('store-cart-open');
  }

  function closeCartDrawer() {
    const drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('store-cart-open');
  }
  // Expose so the floating cart button in pp-nav.js can open the drawer
  // directly on /store/ pages without relying on click-event proxies.
  STORE.openCartDrawer = openCartDrawer;
  STORE.closeCartDrawer = closeCartDrawer;

  function renderCartDrawer() {
    const host = document.querySelector('[data-cart-drawer-body]');
    if (!host || !window.PalatialStore.products) return;
    const cart = readCart();
    const products = window.PalatialStore.products || [];
    const items = cart.items.map(i => {
      if (i.install) {
        const parent = products.find(p => p.slug === i.parentSlug);
        return {
          slug: i.slug,
          name: 'Installation — ' + (parent ? parent.name : 'service visit'),
          unit: 'Licensed pool technician',
          price: i.installPrice || 0,
          qty: i.qty,
          emoji: '🛠️',
        };
      }
      const product = products.find(p => p.slug === i.slug);
      return product ? Object.assign({}, product, { qty: i.qty }) : null;
    }).filter(Boolean);

    if (!items.length) {
      host.innerHTML = '<div class="drawer-cart-empty"><h3>Your cart is empty</h3><p>Add pool chemicals, equipment or accessories to begin.</p></div>';
      return;
    }

    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    host.innerHTML = `
      ${items.map(item => `
        <div class="drawer-cart-item" data-drawer-cart-slug="${escapeHtml(item.slug)}">
          <div class="drawer-cart-thumb">${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : (item.emoji || '📦')}</div>
          <div>
            <div class="drawer-cart-name">${escapeHtml(item.name)}</div>
            <span class="drawer-cart-meta">Qty ${item.qty} · ${escapeHtml(item.unit || 'each')}</span>
            <button class="cart-item-remove" type="button" data-drawer-remove>Remove</button>
          </div>
          <div class="drawer-cart-price">${window.PalatialStore.formatPrice(item.price * item.qty)}</div>
        </div>
      `).join('')}
      <div class="drawer-cart-total"><span>Total</span><span>${window.PalatialStore.formatPrice(total)}</span></div>`;

    host.querySelectorAll('[data-drawer-cart-slug]').forEach(row => {
      const slug = row.getAttribute('data-drawer-cart-slug');
      row.querySelector('[data-drawer-remove]')?.addEventListener('click', () => {
        removeFromCart(slug);
        toast('Removed from cart');
      });
    });
  }

  // ─────────────────── Chemistry Advisor ───────────────────
  //
  // Pool-industry standard dosing formulae. These are intentionally
  // conservative — the Advisor always recommends LESS than the
  // theoretical maximum so that a customer never over-doses on our
  // recommendation. The Abbotsford team's free water-test is the
  // authoritative source for high-risk pools.

  function bindAdvisor(host) {
    if (host.dataset.bound) return;
    host.dataset.bound = '1';
    host.querySelector('[data-advisor-run]')?.addEventListener('click', () => runAdvisor(host));
    host.querySelector('[data-advisor-reset]')?.addEventListener('click', () => {
      host.querySelectorAll('input').forEach(i => { i.value = ''; });
      host.querySelector('[data-advisor-result]').hidden = true;
    });
  }

  function adviseDoses(input) {
    const vol = Math.max(0, parseFloat(input.vol) || 0);
    if (vol <= 0) return { error: 'Enter a pool volume to start.' };
    const fc = parseFloat(input.fc);
    const ph = parseFloat(input.ph);
    const ta = parseFloat(input.ta);
    const salt = parseFloat(input.salt);
    const recs = [];
    const factor = vol / 10000; // dose-rates are per 10,000L

    // Free chlorine — target 2.5 ppm (residential), shock to 5.0 ppm.
    const fcTarget = input.goal === 'shock' ? 5.0 : (input.goal === 'open' ? 3.5 : 2.5);
    if (!isFinite(fc) || fc < fcTarget) {
      // Calcium hypochlorite 70% → ~14g per 10,000L raises FC by 1 ppm.
      const delta = Math.max(0.5, fcTarget - (isFinite(fc) ? fc : 0));
      const grams = Math.round(delta * 14 * factor);
      recs.push({
        slug: 'pool-pro-chlorine-granular-10kg',
        why: `Raise free chlorine to ${fcTarget.toFixed(1)} ppm (~${grams} g)`,
        qty: 1,
      });
    }

    // pH down — only if measured pH > 7.6.
    if (isFinite(ph) && ph > 7.6) {
      const dropTo = 7.4;
      const steps = Math.ceil((ph - dropTo) / 0.1);
      const grams = Math.round(steps * 100 * factor);
      recs.push({ slug: 'ph-down-5kg', qty: 1, why: `Drop pH from ${ph} to ${dropTo} (~${grams} g)` });
    }

    // Algaecide — always on shock / open, otherwise routine maintenance.
    if (input.goal === 'shock' || input.goal === 'open' || input.goal === 'balance') {
      recs.push({
        slug: 'algaecide-concentrate-5l',
        qty: 1,
        why: `Fortnightly algae prevention (60ml per 10,000L)`,
      });
    }

    // Salt top-up — only for salt-chlorinated pools with low salt.
    if (input.system === 'salt' && (!isFinite(salt) || salt < 4000)) {
      const need = Math.max(0, 4500 - (isFinite(salt) ? salt : 3500));
      const kg = Math.ceil(need * vol / 1000 / 1000); // need ppm × kL ÷ 1000 = kg
      const bags = Math.max(1, Math.ceil(kg / 10));
      recs.push({
        slug: 'pool-pro-mineral-salts-10kg',
        qty: bags,
        why: `Top up salt to ~4,500 ppm (${kg} kg, ${bags} × 10kg)`,
      });
    }

    // Total alkalinity guard — flag, don't auto-purchase.
    let warning = '';
    if (isFinite(ta) && (ta < 80 || ta > 140)) {
      warning = `Your total alkalinity (${ta} ppm) is outside the 80–140 ppm range. We recommend booking a free water test before dosing.`;
    }

    return { recs, warning };
  }

  function runAdvisor(host) {
    const f = (sel) => host.querySelector(sel)?.value || '';
    const input = {
      vol: f('#adv-vol'), surface: f('#adv-surface'), system: f('#adv-system'),
      goal: f('#adv-goal'), fc: f('#adv-fc'), ph: f('#adv-ph'),
      ta: f('#adv-ta'), salt: f('#adv-salt'),
    };
    const out = host.querySelector('[data-advisor-result]');
    out.hidden = false;
    const result = adviseDoses(input);
    if (result.error) {
      out.innerHTML = `<div class="empty"><h3>${escapeHtml(result.error)}</h3></div>`;
      return;
    }
    const fmt = window.PalatialStore.formatPrice;
    const get = window.PalatialStore.getProduct;
    const rows = result.recs.map(r => {
      const p = get(r.slug);
      if (!p) return '';
      return `<div class="dose-row">
        <div class="product">${escapeHtml(p.name)}<small>${escapeHtml(r.why)}</small></div>
        <div class="qty">× ${r.qty}</div>
        <div class="price">${fmt(p.price * r.qty)}</div>
      </div>`;
    }).join('');
    const total = result.recs.reduce((n, r) => n + (get(r.slug)?.price || 0) * r.qty, 0);
    out.innerHTML = `
      <div class="advisor-result">
        <h3>Recommended for your pool</h3>
        <ul class="dose-list">${rows || '<li>No dosing required — your readings look balanced.</li>'}</ul>
        ${result.warning ? `<p style="color:var(--warn);font-size:.85rem">${escapeHtml(result.warning)}</p>` : ''}
        <div class="cart-row total"><span>Suggested total</span><span>${fmt(total)}</span></div>
        ${result.recs.length ? '<div style="margin-top:.8rem;display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn btn-primary" data-advisor-add type="button">Add all to cart</button><a class="btn btn-ghost" href="/store/cart/">View cart</a></div>' : ''}
      </div>`;
    out.querySelector('[data-advisor-add]')?.addEventListener('click', () => {
      result.recs.forEach(r => addToCart(r.slug, r.qty));
      toast(`Added ${result.recs.length} product${result.recs.length === 1 ? '' : 's'} to your cart`);
    });
  }

  // ─────────────────── Fitment Checker ───────────────────

  function bindFitment(host) {
    if (host.dataset.bound) return;
    host.dataset.bound = '1';
    host.querySelector('[data-fitment-run]')?.addEventListener('click', () => runFitment(host));
    host.querySelector('[data-fitment-reset]')?.addEventListener('click', () => {
      host.querySelector('#fit-brand').value = '';
      host.querySelector('#fit-model').value = '';
      host.querySelector('[data-fitment-result]').hidden = true;
    });
    // Pre-populate from ?part=<slug> when arriving from a PDP.
    const params = new URLSearchParams(window.location.search);
    if (params.get('part')) {
      const part = window.PalatialStore.getProduct(params.get('part'));
      if (part && part.fits && part.fits[0]) {
        host.querySelector('#fit-model').value = part.fits[0];
        runFitment(host);
      }
    }
  }

  function runFitment(host) {
    const brand = (host.querySelector('#fit-brand').value || '').toLowerCase().trim();
    const model = (host.querySelector('#fit-model').value || '').toLowerCase().trim();
    const out = host.querySelector('[data-fitment-result]');
    out.hidden = false;
    const products = (window.PalatialStore.products || []).filter(p => Array.isArray(p.fits));
    const matches = products.filter(p => p.fits.some(m => {
      const lower = m.toLowerCase();
      const brandOk = !brand || lower.includes(brand);
      const modelOk = !model || lower.includes(model);
      return brandOk && modelOk;
    }));
    if (!matches.length) {
      out.innerHTML = `<div class="empty"><h3>No confirmed fitment in our database for that model.</h3>
        <p>Send a photo of your equipment plate to <a href="mailto:[REDACTED]">[REDACTED]</a> and we'll identify it within a business hour.</p></div>`;
      return;
    }
    out.innerHTML = `
      <h3 class="section-title" style="font-size:1rem">Compatible parts <small>${matches.length} match${matches.length === 1 ? '' : 'es'}</small></h3>
      <div class="product-grid">${matches.map(STORE.productCard).join('')}</div>`;
  }

  // ─────────────────── Trade application form ───────────────────

  function bindTradeForm(host) {
    if (host.dataset.bound) return;
    host.dataset.bound = '1';
    host.querySelector('[data-trade-submit]')?.addEventListener('click', () => {
      const get = (id) => host.querySelector('#' + id)?.value || '';
      const data = {
        biz: get('t-biz'), abn: get('t-abn'), name: get('t-name'),
        email: get('t-email'), phone: get('t-phone'), tier: get('t-tier'),
        notes: get('t-notes'),
      };
      if (!data.biz || !data.email || !data.name) {
        toast('Business name, contact name and email are required');
        return;
      }
      const body = [
        'New Palatial Pools trade-account application.',
        '',
        `Business:   ${data.biz}`,
        `ABN:        ${data.abn}`,
        `Contact:    ${data.name}`,
        `Email:      ${data.email}`,
        `Phone:      ${data.phone}`,
        `Tier:       ${data.tier}`,
        '',
        'Notes:',
        (data.notes || '(none)'),
      ].join('\n');
      window.location.href = 'mailto:[REDACTED]?subject=' +
        encodeURIComponent(`Trade account application — ${data.biz}`) +
        '&body=' + encodeURIComponent(body);
    });
  }

  // ─────────────────── Boot ───────────────────

  function boot() {
    interceptClicks();
    setupSearch();
    attachPageScripts();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
