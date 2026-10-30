// Plain links deliberately cross the independently deployed Next.js zones.
(function () {
  'use strict';
  function rewrite(anchor) {
    var url;
    try { url = new URL(anchor.getAttribute('href'), window.location.href); } catch (_) { return; }
    var store = /^(www\.)?palatial\.(store|shop)$/.test(url.hostname);
    var local = url.origin === window.location.origin;
    if (!store && !local) return;
    var path = url.pathname.replace(/\/$/, '') || '/';
    if (store && path === '/') path = '/shop';
    else if (path === '/store' || path.indexOf('/store/') === 0) path = '/shop' + path.slice(6);
    if (path !== '/shop' && path.indexOf('/shop/') !== 0) return;
    anchor.setAttribute('href', path + url.search + url.hash);
    anchor.removeAttribute('target');
  }
  function refresh() { document.querySelectorAll('a[href]').forEach(rewrite); }
  var pending = false;
  var observer = new MutationObserver(function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; observer.disconnect(); refresh(); observe(); });
  });
  function observe() { observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'target'] }); }
  refresh(); observe();
  // Capture SPA handlers so crossing zones is always a real document navigation.
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest && event.target.closest('a[href]');
    if (!anchor || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var url = new URL(anchor.href, window.location.href);
    if (url.origin === location.origin && (url.pathname === '/shop' || url.pathname.indexOf('/shop/') === 0)) {
      event.preventDefault(); event.stopImmediatePropagation(); location.assign(url.href);
    }
  }, true);
}());
