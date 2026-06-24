(function() {
  'use strict';

  /* ── Scroll-reveal animations ────────────────────────────── */
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  function initAnimations() {
    document.querySelectorAll('.animate-on-scroll').forEach(function(el) {
      observer.observe(el);
    });
  }

  /* ── FAQ accordion ───────────────────────────────────────── */
  document.querySelectorAll('.pp-faq-q').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var item = btn.closest('.pp-faq-item');
      var wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.pp-faq-item.open').forEach(function(openItem) {
        openItem.classList.remove('open');
      });
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ── Trim desktop nav to the canonical 5 top-level items ─── */
  try {
    var navLinks = document.querySelector('.pp-nav-links');
    if (navLinks) {
      navLinks.innerHTML =
        '<a href="/">Home</a>' +
        '<a href="/store/">Shop</a>' +
        '<a href="/melbourne-pool-services">Services</a>' +
        '<a href="/pool-volume-calculator/">Calculator</a>' +
        '<a class="pp-nav-cta" href="/contact-palatial-pool-services">Contact</a>';
    }
  } catch (e) { /* fail silent */ }

  /* ── Mobile navigation: full-screen overlay menu ─────────── */
  var toggle = document.querySelector('.pp-nav-toggle');
  var links = document.querySelector('.pp-nav-links');
  if (toggle && links) {
    toggle.setAttribute('aria-controls', 'pp-nav-links');
    toggle.setAttribute('aria-expanded', 'false');
    if (!links.id) links.id = 'pp-nav-links';

    var setOpen = function(open) {
      links.classList.toggle('open', open);
      document.body.classList.toggle('pp-nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = open ? '&times;' : '&#9776;';
    };

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      setOpen(!links.classList.contains('open'));
    });

    /* Close overlay when any nav link is tapped */
    links.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() { setOpen(false); });
    });

    /* ESC closes overlay */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && links.classList.contains('open')) setOpen(false);
    });

    /* Reset overlay state if viewport grows back to desktop */
    var mq = window.matchMedia('(min-width: 961px)');
    var onChange = function(ev) { if (ev.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
  } else {
    initAnimations();
  }
})();
