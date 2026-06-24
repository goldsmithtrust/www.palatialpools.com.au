(function() {
  'use strict';

  /* All gold replaced with aqua/teal #00C4CC */
  var TEAL = '#00C4CC';
  var TEAL_DARK = '#007A80';
  var TEAL_LIGHT = '#33D0D4';
  var DARK_BG = '#1a0533';

  function applyBrandFixes() {
    /* === FIX 1: Logo P circle - aqua/teal gradient === */
    document.querySelectorAll('a[href="/"]').forEach(function(link) {
      var pCircle = link.querySelector('[class*="bg-gradient"][class*="from-palatial-vivid"]');
      if (pCircle) {
        pCircle.style.setProperty('background', 'linear-gradient(135deg, ' + TEAL + ', ' + TEAL_DARK + ')', 'important');
        pCircle.style.setProperty('color', DARK_BG, 'important');
        pCircle.style.setProperty('--tw-shadow-color', 'rgba(0,196,204,0.3)', 'important');
      }

      /* Hide "Palatial" text and "Swimming Pools" text */
      link.querySelectorAll('span').forEach(function(span) {
        var text = span.textContent.trim();
        if (text === 'Palatial' || text === 'Swimming Pools') {
          span.style.display = 'none';
        }
      });
    });

    /* === FIX 2: All gradient buttons (Call Now, Get a Free Quote, Book a Service) === */
    document.querySelectorAll('[class*="bg-gradient"][class*="from-palatial-vivid"]').forEach(function(el) {
      if (el.closest('a[href="/"]') && el.tagName !== 'A') return;
      el.style.setProperty('background', 'linear-gradient(135deg, ' + TEAL + ', ' + TEAL_DARK + ')', 'important');
      el.style.setProperty('color', DARK_BG, 'important');
      el.style.setProperty('--tw-shadow-color', 'rgba(0,196,204,0.25)', 'important');
    });

    /* === FIX 3: Text color overrides === */
    document.querySelectorAll('.text-palatial-vivid').forEach(function(el) {
      el.style.setProperty('color', TEAL, 'important');
    });

    document.querySelectorAll('.text-palatial-soft').forEach(function(el) {
      el.style.setProperty('color', TEAL_LIGHT, 'important');
    });

    /* === FIX 4: Border overrides === */
    document.querySelectorAll('[class*="border-palatial-vivid"]').forEach(function(el) {
      el.style.setProperty('border-color', 'rgba(0,196,204,0.3)', 'important');
    });

    /* === FIX 5: Shadow overrides === */
    document.querySelectorAll('[class*="shadow-palatial-vivid"]').forEach(function(el) {
      el.style.setProperty('--tw-shadow-color', 'rgba(0,196,204,0.25)', 'important');
    });

    /* === FIX 6: Background opacity variants === */
    document.querySelectorAll('[class*="bg-palatial-vivid"]').forEach(function(el) {
      var cls = el.className || '';
      if (cls.indexOf('bg-gradient') !== -1) return;
      if (cls.indexOf('/') !== -1 || cls.indexOf('\\') !== -1) {
        var match = cls.match(/bg-palatial-vivid[/\\](\d+)/);
        if (match) {
          var opacity = parseInt(match[1]) / 100;
          el.style.setProperty('background-color', 'rgba(0,196,204,' + opacity + ')', 'important');
        }
      } else {
        el.style.setProperty('background-color', TEAL, 'important');
      }
    });

    /* === FIX 7: Green checkmarks → teal === */
    document.querySelectorAll('[class*="text-emerald"], [class*="text-green"]').forEach(function(el) {
      el.style.setProperty('color', TEAL, 'important');
    });

    /* === FIX 8: SVG fills === */
    document.querySelectorAll('svg').forEach(function(svg) {
      svg.querySelectorAll('[fill]').forEach(function(el) {
        var fill = el.getAttribute('fill');
        if (fill && (fill.indexOf('6e40ff') !== -1 || fill.indexOf('6e3fff') !== -1)) {
          el.setAttribute('fill', TEAL);
        }
      });
      svg.querySelectorAll('[stroke]').forEach(function(el) {
        var stroke = el.getAttribute('stroke');
        if (stroke && (stroke.indexOf('6e40ff') !== -1 || stroke.indexOf('6e3fff') !== -1)) {
          el.setAttribute('stroke', TEAL);
        }
      });
    });

    /* === FIX 9: Fill classes === */
    document.querySelectorAll('[class*="fill-palatial-vivid"], [class*="fill-yellow"]').forEach(function(el) {
      el.style.setProperty('fill', TEAL, 'important');
    });

    /* === FIX 10: Inline style gold overrides === */
    document.querySelectorAll('[style]').forEach(function(el) {
      var style = el.getAttribute('style');
      if (style && (style.indexOf('C5A55A') !== -1 || style.indexOf('C4A84D') !== -1 || style.indexOf('8B7635') !== -1)) {
        style = style.replace(/#C5A55A/gi, TEAL).replace(/#C4A84D/gi, TEAL).replace(/#8B7635/gi, TEAL_DARK);
        el.setAttribute('style', style);
      }
      if (style && (style.indexOf('6e40ff') !== -1 || style.indexOf('6e3fff') !== -1)) {
        el.setAttribute('style', style.replace(/#6e40ff/gi, TEAL).replace(/#6e3fff/gi, TEAL));
      }
    });

    /* === FIX 11: Hero glow orbs - add teal tint === */
    document.querySelectorAll('section [class*="absolute"][class*="rounded-full"][class*="bg-palatial"]').forEach(function(el) {
      var cls = el.className || '';
      if (cls.indexOf('bg-palatial-vivid') !== -1) {
        el.style.setProperty('background', 'radial-gradient(circle, rgba(0,196,204,0.3) 0%, transparent 70%)', 'important');
      }
    });
  }

  /* Initial run and delayed runs for React hydration */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      applyBrandFixes();
      setTimeout(applyBrandFixes, 100);
      setTimeout(applyBrandFixes, 300);
      setTimeout(applyBrandFixes, 800);
      setTimeout(applyBrandFixes, 2000);
    });
  } else {
    applyBrandFixes();
    setTimeout(applyBrandFixes, 100);
    setTimeout(applyBrandFixes, 300);
    setTimeout(applyBrandFixes, 800);
    setTimeout(applyBrandFixes, 2000);
  }

  /* MutationObserver for dynamic content */
  var debounceTimer;
  var observer = new MutationObserver(function(mutations) {
    var needsUpdate = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length > 0) {
        needsUpdate = true;
        break;
      }
    }
    if (needsUpdate) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyBrandFixes, 50);
    }
  });

  function startObserver() {
    var rootEl = document.getElementById('root');
    if (rootEl) {
      observer.observe(rootEl, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  /* SPA navigation support */
  var _pushState = history.pushState;
  history.pushState = function() {
    _pushState.apply(this, arguments);
    setTimeout(applyBrandFixes, 100);
    setTimeout(applyBrandFixes, 500);
  };
  window.addEventListener('popstate', function() {
    setTimeout(applyBrandFixes, 100);
    setTimeout(applyBrandFixes, 500);
  });
})();
