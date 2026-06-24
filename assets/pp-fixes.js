(function() {
  /* ============================================================
     PALATIAL POOLS — PP-FIXES v14
     Comprehensive client-side patches for Beta Site
     Includes: image swaps, service tile text, heating fix,
     chemical prices, homepage cleanup, logo, video, shop nav,
     Palatial Link branding, analytics tracker,
     Free Pool Tools section (diagnostics + volume calculator)
     ============================================================ */

  var BASE_IMG = '/images';
  var CF_BASE = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663523962332/Ma4K2W7p5xJxqHf9oPebZh';

  /* ── IMAGE SWAP MAP ──────────────────────────────────────────
     Maps CloudFront image filenames → local /images/ paths
     Used for homepage service cards and heating page
  ─────────────────────────────────────────────────────────────*/
  var IMAGE_SWAPS = {
    /* Plumbing service card */
    'plumbing_real_702b31e1.jpg': '/images/plumbing.jpg',
    /* Leak Detection / Pool Servicing / Diagnostics */
    'leak_detection_real_7c455c5f.jpg': '/images/thermal-imaging.jpg',
    /* Electrical / Clamp Meter */
    'electrical_real_93339736.jpg': '/images/clamp-meter.jpg',
    /* Gas Heaters hero (reuse aerial green pool for pool servicing) */
    'hero_e92f_d817e3e0.jpeg': '/images/gas-heater-real.jpg',
    /* Heating page - Heat Pumps card (broken logo placeholder) */
    '730a89_5db82394eb974d1392f3558801218046~mv2_99946edf.png': '/images/heat-pump-setup.jpg',
    /* Pipe Inspection - endoscope */
    '730a89_3641a2d0e9d149eabd94cad82f8cfcd4~mv2_2a793979.jpg': '/images/endoscope.jpg',
    /* Pool equipment installation gallery */
    '730a89_1711e322ec3c48dd92edcdaa6b3065a0~mv2_023f59a2.jpg': '/images/heat-pump-setup.jpg',
  };

  /* ── CHEMICAL PRICE OVERRIDES ────────────────────────────────
     Pool Pro retail prices sourced from Brookies Rural Traders
     (authorised Pool Pro retailer), April 2025
  ─────────────────────────────────────────────────────────────*/
  var CHEMICAL_PRICE_OVERRIDES = {
    /* Chlorine */
    'Liquid Chlorine': {
      '5L': '$14.99', '10L': '$26.99', '15L': '$36.99', '20L': '$44.99'
    },
    'Granular Chlorine': {
      '1kg': '$19.99', '2kg': '$32.99', '4kg': '$59.99', '10kg': '$79.99'
    },
    'Stabilised Chlorine Granules': {
      '1kg': '$24.99', '2kg': '$39.99', '4kg': '$59.99'
    },
    'Stabilised Chlorine Tablets': {
      '1kg': '$24.99', '2kg': '$44.99', '4kg': '$74.99'
    },
    'Chlorine Tablets': {
      '1kg': '$24.99', '2kg': '$44.99', '4kg': '$74.99'
    },
    'Pool Shock': {
      '1kg': '$19.99', '2kg': '$34.99'
    },
    /* pH */
    'pH Increaser': {
      '1kg': '$12.99', '2kg': '$21.99', '4kg': '$36.99'
    },
    'pH Reducer': {
      '1kg': '$9.99', '2kg': '$16.99', '4kg': '$28.99'
    },
    'pH Down': {
      '1kg': '$9.99', '2kg': '$16.99', '4kg': '$28.99'
    },
    'pH Up': {
      '1kg': '$12.99', '2kg': '$21.99', '4kg': '$36.99'
    },
    /* Alkalinity */
    'Alkalinity Increaser': {
      '1kg': '$9.99', '2kg': '$16.99', '4kg': '$28.99'
    },
    'Buffer': {
      '1kg': '$9.99', '2kg': '$16.99', '4kg': '$28.99'
    },
    'pH Buffer': {
      '1kg': '$9.99', '2kg': '$16.99', '4kg': '$28.99'
    },
    /* Acid */
    'Hydrochloric Acid': {
      '1L': '$7.99', '5L': '$17.99', '15L': '$44.99'
    },
    'Muriatic Acid': {
      '1L': '$7.99', '5L': '$17.99', '15L': '$44.99'
    },
    /* Stabiliser */
    'Cyanuric Acid': {
      '1kg': '$24.99', '2kg': '$32.99', '5kg': '$69.99'
    },
    'Pool Stabiliser': {
      '1kg': '$24.99', '2kg': '$32.99', '5kg': '$69.99'
    },
    /* Salt */
    'Pool Salt': {
      '10kg': '$12.99', '20kg': '$21.99', '25kg': '$24.99', '40kg': '$36.99'
    },
    'Pool Salt (Fine Grade)': {
      '10kg': '$12.99', '20kg': '$21.99', '40kg': '$36.99'
    },
    /* Calcium */
    'Calcium Hardness Increaser': {
      '1kg': '$14.99', '2kg': '$24.99', '4kg': '$42.99'
    },
    'Calcium Up': {
      '1kg': '$14.99', '2kg': '$24.99', '4kg': '$42.99'
    },
    /* Algaecide */
    'Algaecide': {
      '1L': '$19.99', '2.5L': '$39.99', '5L': '$69.99'
    },
    'Algaecide (Copper-Free)': {
      '1L': '$22.99', '2.5L': '$44.99'
    },
    'Black Spot Algaecide': {
      '1L': '$24.99', '2.5L': '$49.99'
    },
    /* Clarifiers */
    'Pool Clarifier': {
      '1L': '$17.99', '2.5L': '$34.99'
    },
    'Flocculant': {
      '1L': '$14.99', '2.5L': '$27.99'
    },
    /* Specialty */
    'Metal Remover': {
      '1L': '$22.99', '2.5L': '$44.99'
    },
    'Stain Remover (Ascorbic Acid)': {
      '500g': '$26.99', '1kg': '$44.99'
    },
    'Filter Cleaner': {
      '1L': '$22.99', '2.5L': '$42.99'
    },
    'Tile & Surface Cleaner': {
      '1L': '$19.99', '2.5L': '$34.99'
    },
    /* Spa */
    'Spa Sanitiser (Bromine Tablets)': {
      '1kg': '$49.99', '2kg': '$84.99'
    },
    'Spa Shock (Non-Chlorine)': {
      '500g': '$22.99', '1kg': '$36.99'
    },
    'Spa Defoamer': {
      '500ml': '$17.99', '1L': '$26.99'
    },
    'Spa Pipe Cleaner': {
      '500ml': '$26.99', '1L': '$42.99'
    }
  };

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: injectGlobalCSS
     Injects all CSS patches needed for the site
  ─────────────────────────────────────────────────────────────*/
  function injectGlobalCSS(){
    if (document.getElementById('pp-v14-css')) return;
    var style = document.createElement('style');
    style.id = 'pp-v14-css';
    style.textContent = [
      /* ── Shop Banner ── */
      '.shop-banner { background: linear-gradient(135deg, #1a0533 0%, #2d1a4a 100%); border: 1px solid rgba(0,196,204,0.3); border-radius: 16px; overflow: hidden; margin-bottom: 2rem; position: relative; }',
      '.shop-banner-grid { display: grid; grid-template-columns: 1fr; align-items: stretch; }',
      '@media (min-width: 768px) { .shop-banner-grid { grid-template-columns: 1fr 1fr; } }',
      '.shop-content { padding: 1.5rem; display: flex; flex-direction: column; justify-content: center; }',
      '.shop-video-panel { position: relative; overflow: hidden; border-left: 1px solid rgba(0,196,204,0.15); min-height: 78px; background: #0a0a14; }',
      '.shop-video-panel video { width: 100%; height: 100%; object-fit: cover; display: block; }',
      '@media (min-width: 768px) { .shop-video-panel { min-height: 103px; } }',
      '.shop-video-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(26,5,51,0.35) 0%, transparent 60%); pointer-events: none; }',
      '.shop-video-badge { position: absolute; bottom: 1rem; right: 1rem; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); color: #00C4CC; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.3rem 0.7rem; border-radius: 100px; border: 1px solid rgba(0,196,204,0.3); }',
      '@media (max-width: 767px) { .shop-video-panel { border-left: none; border-top: 1px solid rgba(0,196,204,0.15); } }',
      '.shop-badge { background: rgba(0,196,204,0.15); color: #00C4CC; padding: 0.4rem 1rem; border-radius: 100px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; display: inline-block; margin-bottom: 1.5rem; border: 1px solid rgba(0,196,204,0.3); }',
      '.shop-address { color: #fff; font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; font-family: Outfit, sans-serif; }',
      '.shop-desc { color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 2rem; }',
      /* ── Password Request Box ── */
      '.pw-request-box { background: rgba(0,196,204,0.1); border: 1px solid rgba(0,196,204,0.2); border-radius: 12px; padding: 1rem; margin-bottom: 2rem; text-align: center; color: #fff; font-size: 0.9rem; }',
      '.pw-request-box a { color: #00C4CC; font-weight: 600; text-decoration: underline; }',
      /* ── Award Badge Fix ── */
      '.pp-award-badge-fixed { position: static !important; display: inline-flex !important; align-items: center; gap: 0.5rem; background: rgba(0,196,204,0.1); border: 1px solid rgba(0,196,204,0.3); border-radius: 100px; padding: 0.4rem 1rem; font-size: 0.78rem; font-weight: 700; color: #00C4CC; letter-spacing: 0.05em; margin: 1rem auto; }',
      /* ── Hide Items ── */
      '[data-pp-hide="true"] { display: none !important; }',
      /* ── Service Tile Active/Selected State - WHITE TEXT ── */
      'button[class*="border-cyan"]:not([disabled]), button[class*="ring-cyan"]:not([disabled]), button[class*="bg-cyan"]:not([disabled]) { color: #ffffff !important; }',
      'button[class*="border-cyan"] *, button[class*="ring-cyan"] *, button[class*="bg-cyan"] * { color: #ffffff !important; }',
      'button.border-cyan-400, button.border-cyan-500, button.ring-2, button[data-active="true"], button[aria-selected="true"] { color: #ffffff !important; }',
      'button.border-cyan-400 *, button.border-cyan-500 *, button.ring-2 *, button[data-active="true"] *, button[aria-selected="true"] * { color: #ffffff !important; }',
      /* Broader coverage for service option tiles */
      'button:focus { color: #ffffff !important; }',
      'button:focus * { color: #ffffff !important; }',
      /* ── Nav Logo ── */
      '.pp-nav-logo-img { height: 52px !important; width: auto !important; object-fit: contain !important; }',
      'nav { overflow-x: hidden !important; max-width: 100vw !important; } nav > div { overflow: hidden; }',

      /* ── Nav Dropdown Menus ── */
      '.pp-nav-dropdown { display: none; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); min-width: 220px; background: #1a0533; border: 1px solid rgba(0,196,204,0.2); border-radius: 8px; padding: 0.5rem 0; z-index: 9999; box-shadow: 0 12px 32px rgba(0,0,0,0.5); }',
      '.pp-nav-has-dropdown { position: relative !important; }',
      '.pp-nav-has-dropdown:hover .pp-nav-dropdown { display: block !important; }',
      '.pp-nav-dropdown a { display: block; padding: 0.55rem 1.2rem; color: rgba(255,255,255,0.75); font-size: 0.78rem; font-family: Outfit, sans-serif; font-weight: 500; text-decoration: none; white-space: nowrap; transition: all 0.15s; letter-spacing: 0.03em; }',
      '.pp-nav-dropdown a:hover { background: rgba(0,196,204,0.1); color: #00C4CC; }',
      '.pp-nav-dropdown::before { content: ""; position: absolute; top: -8px; left: 0; right: 0; height: 8px; }',
      '.pp-mobile-phones { display: flex; align-items: center; gap: 0.5rem; padding: 0 0.75rem; }',
      '.pp-mobile-phones a { color: #C4A84D; font-size: 0.75rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem; }',
      /* ── Shop Nav Link ── */
      '#pp-shop-nav-link a { color: inherit; font-weight: inherit; font-size: inherit; text-transform: inherit; letter-spacing: inherit; text-decoration: none; }',
      /* ── Hide standalone phone icon in nav (far right, Layout.tsx:154) ── */
      'a[data-loc="client/src/components/Layout.tsx:154"] { display: none !important; }',
      /* ── Uniform section spacing (tightened) ── */
      'section { margin-bottom: 2rem !important; padding-top: 1rem !important; padding-bottom: 1rem !important; }',
      'section + section { margin-top: 1rem !important; }',
      '@media (min-width: 768px) { section { margin-bottom: 2.5rem !important; padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; } section + section { margin-top: 1.5rem !important; } }',
      /* ── Hero section needs no extra spacing ── */
      'section:first-of-type { margin-top: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; margin-bottom: 0 !important; }',
      '',
      '.min-h-screen > div:first-child { border-top: none !important; }',
      /* ── Hero heading: fit on one line, reduce size ── */
      'section:nth-of-type(2) h1, .min-h-screen section:first-of-type h1 { font-size: clamp(1.6rem, 3.2vw, 2.6rem) !important; white-space: nowrap !important; line-height: 1.2 !important; }',
      '@media (max-width: 768px) { section:nth-of-type(2) h1, .min-h-screen section:first-of-type h1 { font-size: clamp(1.1rem, 5vw, 1.6rem) !important; white-space: normal !important; } }',
      /* ── Service card images: zoom out on mobile ── */
      '@media (max-width: 768px) { section img[src*="static.wixstatic"], section img[src*="/images/"] { object-fit: contain !important; object-position: center !important; background: #1a0533; } }',
      /* ── Free Pool Tools Section ── */
      '#pp-free-tools { background: linear-gradient(180deg, #0d0118 0%, #1a0533 100%); padding: 3rem 1.5rem; }',
      '#pp-free-tools .pp-tools-inner { max-width: 1200px; margin: 0 auto; }',
      '#pp-free-tools .pp-tools-header { text-align: center; margin-bottom: 2.5rem; }',
      '#pp-free-tools .pp-tools-badge { display: inline-block; background: rgba(0,196,204,0.12); border: 1px solid rgba(0,196,204,0.3); color: #00C4CC; padding: 0.35rem 1rem; border-radius: 100px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 1rem; font-family: Outfit, sans-serif; }',
      '#pp-free-tools .pp-tools-title { font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 700; color: #f1f5f9; margin-bottom: 0.6rem; line-height: 1.2; }',
      '#pp-free-tools .pp-tools-subtitle { font-family: Outfit, sans-serif; color: rgba(241,245,249,0.6); font-size: 1rem; max-width: 520px; margin: 0 auto; line-height: 1.6; }',
      '#pp-free-tools .pp-tools-grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }',
      '@media (min-width: 640px) { #pp-free-tools .pp-tools-grid { grid-template-columns: 1fr 1fr; } }',
      '#pp-free-tools .pp-tool-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(0,196,204,0.15); border-radius: 16px; padding: 1.75rem; display: flex; flex-direction: column; transition: border-color 0.25s, transform 0.2s, background 0.25s; }',
      '#pp-free-tools .pp-tool-card:hover { border-color: rgba(0,196,204,0.4); background: rgba(0,196,204,0.06); transform: translateY(-3px); }',
      '#pp-free-tools .pp-tool-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.1rem; flex-shrink: 0; }',
      '#pp-free-tools .pp-tool-icon svg { width: 24px; height: 24px; stroke-width: 1.75; fill: none; }',
      '#pp-free-tools .pp-tool-icon-camera { background: rgba(0,196,204,0.12); }',
      '#pp-free-tools .pp-tool-icon-camera svg { stroke: #00C4CC; }',
      '#pp-free-tools .pp-tool-icon-satellite { background: rgba(99,102,241,0.12); }',
      '#pp-free-tools .pp-tool-icon-satellite svg { stroke: #818cf8; }',
      '#pp-free-tools .pp-tool-card h3 { font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.3rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.5rem; line-height: 1.2; }',
      '#pp-free-tools .pp-tool-card p { font-family: Outfit, sans-serif; color: rgba(241,245,249,0.65); font-size: 0.88rem; line-height: 1.65; margin-bottom: 1.25rem; flex: 1; }',
      '#pp-free-tools .pp-tool-disclaimer { font-family: Outfit, sans-serif; font-size: 0.72rem; color: rgba(241,245,249,0.35); line-height: 1.5; margin-bottom: 1rem; font-style: italic; }',
      '#pp-free-tools .pp-tool-btn { display: inline-flex; align-items: center; gap: 0.45rem; background: linear-gradient(135deg, #00C4CC, #00A8AA); color: #1a0533; border-radius: 100px; padding: 0.6rem 1.4rem; font-size: 0.82rem; font-weight: 700; text-decoration: none; font-family: Outfit, sans-serif; letter-spacing: 0.03em; transition: box-shadow 0.2s, transform 0.15s; align-self: flex-start; }',
      '#pp-free-tools .pp-tool-btn:hover { box-shadow: 0 4px 20px rgba(0,196,204,0.4); transform: translateY(-1px); text-decoration: none; }',
      '#pp-free-tools .pp-tool-btn svg { width: 14px; height: 14px; stroke-width: 2.5; fill: none; stroke: #1a0533; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: swapImages
     Replaces CloudFront stock images with real business photos
  ─────────────────────────────────────────────────────────────*/
  function swapImages(){
    document.querySelectorAll('img[src]').forEach(function(img) {
      var src = img.getAttribute('src') || '';
      // Check each swap
      for (var cfName in IMAGE_SWAPS) {
        if (src.indexOf(cfName) !== -1) {
          var newSrc = IMAGE_SWAPS[cfName];
          if (img.getAttribute('data-pp-swapped') !== newSrc) {
            img.setAttribute('src', newSrc);
            img.setAttribute('data-pp-swapped', newSrc);
            img.removeAttribute('srcset');
            // Ensure good display
            img.style.objectFit = 'cover';
            img.style.objectPosition = 'center';
          }
          break;
        }
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: updateChemicalPrices
     Patches chemical price display to retail pricing
  ─────────────────────────────────────────────────────────────*/
  function updateChemicalPrices(){
    if (location.pathname.indexOf('/chemical') === -1) return;
    
    // Find price spans/elements and update them
    // The React app renders price as text like "$18.00" inside size badges
    // We target the product card structure: name → sizes → price
    var cards = document.querySelectorAll('[class*="card"], [class*="product"], [class*="chemical"]');
    
    // More targeted: find all text nodes that contain prices
    // and update based on product name context
    document.querySelectorAll('h3, h4').forEach(function(heading) {
      var productName = (heading.textContent || '').trim();
      if (!CHEMICAL_PRICE_OVERRIDES[productName]) return;
      
      var overrides = CHEMICAL_PRICE_OVERRIDES[productName];
      
      // Find the parent card and look for size/price pairs
      var card = heading.closest('[class*="rounded"], [class*="card"], [class*="border"]');
      if (!card) return;
      
      // Find size labels and their associated prices
      card.querySelectorAll('span, div, p').forEach(function(el) {
        var text = (el.textContent || '').trim();
        // Match size patterns like "1kg", "2.5L", "500ml"
        for (var size in overrides) {
          if (text === size) {
            // Find the next sibling or nearby element with a price
            var next = el.nextElementSibling;
            if (next && /^\$/.test(next.textContent.trim())) {
              if (next.getAttribute('data-pp-price-updated') !== '1') {
                next.textContent = overrides[size];
                next.setAttribute('data-pp-price-updated', '1');
              }
            }
          }
        }
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: cleanNavigation
     Fixes Palatial Link branding,
     
     fixes award badge positioning, adds Shop nav link
  ─────────────────────────────────────────────────────────────*/
  function cleanNavigation() {

    // Hide the standalone phone icon (far right in nav, next to hamburger)
    // It's a tel link with only an SVG child (no text) inside the nav flex container
    document.querySelectorAll('a[href="tel:+61452157694"]').forEach(function(el) {
      if (!isInNavbar(el)) return;
      // Check if this is the icon-only phone link (no visible text, just SVG)
      var textContent = (el.textContent || '').trim();
      if (textContent === '' || textContent.length < 3) {
        // This is the standalone icon - hide it
        el.style.display = 'none';
      }
    });

    // Fix award badge positioning
    document.querySelectorAll('[class*="award"], [class*="badge"], [class*="rated"]').forEach(function(el) {
      var text = (el.textContent || '').toLowerCase();
      if (text.indexOf('rated') !== -1 && text.indexOf('yarra') !== -1) {
        el.style.position = 'static';
        el.style.display = 'inline-flex';
        el.style.alignItems = 'center';
        el.style.margin = '0.75rem auto';
      }
    });


    // Restructure top utility bar: landline LEFT, mobile RIGHT
    var topBarPhones = document.querySelectorAll('a[href="tel:+61452157694"]');
    topBarPhones.forEach(function(el) {
      if (el.getAttribute('data-pp-nav-phone')) return;
      if (!isInNavbar(el)) return;
      el.setAttribute('data-pp-nav-phone', '1');
      var parent = el.parentNode;
      if (!parent) return;
      if (parent.querySelector('a[href="tel:+61452157694"]')) return;
      // Make the parent a flex container with space-between so landline goes left, mobile goes right
      parent.style.cssText = (parent.style.cssText || '') + ';display:flex;align-items:center;justify-content:space-between;width:100%;';
      // Ensure landline stays on the left
      el.style.cssText = (el.style.cssText || '') + ';order:-1;';
      // Create mobile number on the right
      var mob = document.createElement('a');
      mob.href = 'tel:+61452157694';
      mob.className = el.className;
      mob.style.cssText = (el.style.cssText || '') + ';order:1;margin-left:auto;';
      var landlineHTML = el.innerHTML;
      mob.innerHTML = landlineHTML.replace('0452 157 694', '0452 157 694');
      var mobSvgs = mob.querySelectorAll('svg');
      mobSvgs.forEach(function(svg) {
        svg.setAttribute('width', '12');
        svg.setAttribute('height', '12');
        svg.style.width = '0.75rem';
        svg.style.height = '0.75rem';
        svg.style.flexShrink = '0';
      });
      parent.appendChild(mob);
    });

    // Add phone numbers to mobile nav bar
    document.querySelectorAll('a[href="tel:+61452157694"]').forEach(function(el) {
      if (el.getAttribute('data-pp-mobile-nav-phone')) return;
      // Check if this is in the mobile nav (has hamburger button nearby)
      var parent = el.parentNode;
      if (!parent) return;
      var hasBurger = parent.querySelector('button[aria-label="Toggle menu"]');
      if (!hasBurger) return;
      el.setAttribute('data-pp-mobile-nav-phone', '1');
      // Replace the icon-only link with visible landline number
      el.style.cssText = 'display:flex;align-items:center;gap:0.3rem;color:#C4A84D;font-size:0.7rem;font-weight:600;text-decoration:none;white-space:nowrap;';
      el.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> 0452 157 694';
      // Add mobile number after
      var mobLink = document.createElement('a');
      mobLink.href = 'tel:+61452157694';
      mobLink.style.cssText = 'display:flex;align-items:center;gap:0.3rem;color:#C4A84D;font-size:0.7rem;font-weight:600;text-decoration:none;white-space:nowrap;margin-left:0.4rem;';
      mobLink.innerHTML = '| 0452 157 694';
      el.insertAdjacentElement('afterend', mobLink);
    });
    // Add "Our Shop" nav link
    addShopNavLink();
    
    // Replace nav logo with Palatial logo
    replaceNavLogo();
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: addShopNavLink
     Adds "Our Shop" link to the navigation
  ─────────────────────────────────────────────────────────────*/
  function addShopNavLink() {
    if (document.getElementById('pp-shop-nav-link')) return;
    // Check if already there
    var existing = document.querySelector('a[href="/shop"]');
    if (existing) return;
    
    var navLinks = document.querySelectorAll('nav a, header a');
    if (navLinks.length === 0) return;
    
    // Find a suitable insertion point - after "Services" or before the CTA
    var insertAfter = null;
    navLinks.forEach(function(a) {
      var text = (a.textContent || '').trim().toLowerCase();
      if (text === 'services' || text === 'service') insertAfter = a;
    });
    
    if (!insertAfter) insertAfter = navLinks[navLinks.length - 2] || navLinks[0];
    
    var container = insertAfter.closest('li') || insertAfter.parentNode;
    var newItem = document.createElement(container.tagName === 'LI' ? 'li' : 'div');
    newItem.id = 'pp-shop-nav-link';
    var link = document.createElement('a');
    link.href = '/shop';
    link.textContent = 'Our Shop';
    link.style.cssText = 'color:inherit;font-weight:inherit;font-size:inherit;text-transform:inherit;letter-spacing:inherit;text-decoration:none;';
    // Highlight if we're on the shop page
    if (location.pathname.indexOf('/shop') === 0) {
      link.style.color = '#00C4CC';
    }
    newItem.appendChild(link);
    container.parentNode.insertBefore(newItem, container.nextSibling);
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: replaceNavLogo
     Replaces the wave/squiggle logo with the Palatial logo
  ─────────────────────────────────────────────────────────────*/
  function replaceNavLogo() {
    if (document.getElementById('pp-nav-logo-replaced')) return;
    
    // Find nav logo images (SVG or img in nav/header)
    var navImgs = document.querySelectorAll('nav img, header img');
    navImgs.forEach(function(img) {
      var src = img.getAttribute('src') || '';
      // Replace wave/squiggle logos (not the Palatial logo itself)
      if (src.indexOf('palatial-logo') === -1 && src.indexOf('palatial-logo-full') === -1) {
        img.setAttribute('src', '/images/palatial-logo.png');
        img.setAttribute('alt', 'Palatial Pools');
        img.className = img.className + ' pp-nav-logo-img';
        img.style.height = '36px';
        img.style.width = 'auto';
        img.style.objectFit = 'contain';
        document.body.setAttribute('id', 'pp-nav-logo-replaced');
      }
    });
    
    // Also handle SVG logos in nav
    var navSvgs = document.querySelectorAll('nav svg, header svg');
    navSvgs.forEach(function(svg) {
      // Check if this is a logo SVG (not an icon)
      if (svg.getAttribute('width') && parseInt(svg.getAttribute('width')) > 50) {
        var img = document.createElement('img');
        img.src = '/images/palatial-logo.png';
        img.alt = 'Palatial Pools';
        img.style.height = '36px';
        img.style.width = 'auto';
        img.style.objectFit = 'contain';
        svg.parentNode.replaceChild(img, svg);
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: transformPortalPage
     Updates Palatial Link / Portal page copy and branding
  ─────────────────────────────────────────────────────────────*/
  function transformPortalPage() {
    if (location.pathname.indexOf('/platform') === -1 && location.pathname.indexOf('/portal') === -1 && location.pathname.indexOf('/palatial-link') === -1) return;

    document.querySelectorAll('h1, h2, h3, p').forEach(function(el) {
      var t = el.textContent || '';
      if (t.indexOf('Service Dashboard Features') !== -1) el.textContent = 'Your Pool Care, All in One Place';
      if (t.indexOf('What It Helps Us Manage') !== -1) el.textContent = 'How We Help You';
      if (t.indexOf('palatial-link') !== -1 || t.indexOf('Palatial Link') !== -1) {
        el.textContent = el.textContent.replace(/palatial-link/gi, 'Palatial Link').replace(/Palatial Link/gi, 'Palatial Link');
      }
    });

    // Fix Login Form
    var loginForm = document.querySelector('form');
    if (loginForm && !loginForm.dataset.ppWired) {
      loginForm.dataset.ppWired = 'true';
      if (!document.querySelector('.pw-request-box')) {
        var msg = document.createElement('div');
        msg.className = 'pw-request-box';
        msg.innerHTML = 'Existing clients automatically have a new account. <a href="mailto:service@palatialpools.com.au?subject=Temporary Password Request">Click here to request your temporary password</a>';
        loginForm.parentNode.insertBefore(msg, loginForm);
      }
      loginForm.querySelectorAll('label').forEach(function(lbl) {
        if (lbl.textContent.trim() === 'Username') lbl.textContent = 'Email Address';
      });
      loginForm.onsubmit = function(e) {
        e.preventDefault();
        /* [Palatial Pools fix] admin redirect disabled for public site */
      };
    }
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: injectShopBanner
     Injects the shop video banner on the homepage
  ─────────────────────────────────────────────────────────────*/
  function injectShopBanner() {
    if (document.getElementById('pp-shop-banner')) return;
    // Only inject on the actual homepage - check for "About Palatial Pools" section
    var aboutSection = null;
    var root = document.getElementById('root');
    if (!root) return;
    var allSections = root.querySelectorAll('section');
    for (var i = 0; i < allSections.length; i++) {
      var text = allSections[i].textContent || '';
      if (text.indexOf('About Palatial Pools') !== -1 && text.indexOf('Professional Pool') !== -1) {
        aboutSection = allSections[i];
        break;
      }
    }
    if (!aboutSection) return; // Not on homepage
    
    var banner = document.createElement('div');
    banner.id = 'pp-shop-banner';
    banner.className = 'max-w-[1400px] mx-auto px-4 md:px-6';
    banner.style.paddingTop = '1rem';
      banner.style.marginTop = '3rem';
    banner.style.paddingBottom = '1rem';
    var videoUrl = '/videos/palatial-pools-abbotsford-shop.mp4';
    banner.innerHTML = [
      '<div class="shop-banner">',
        '<div class="shop-banner-grid">',
          '<div class="shop-content">',
            '<span class="shop-badge">New Abbotsford Location</span>',
            '<h2 class="shop-address">Visit Our Pool Shop</h2>',
            '<p class="shop-desc">Come in for expert advice, professional water testing, pool chemicals, and equipment. All from Melbourne\'s most trusted pool specialists.</p>',
            '<div style="display:flex;align-items:center;gap:0.75rem;color:#00C4CC;font-weight:600;margin-bottom:1.5rem;font-size:0.95rem;">',
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
              '<span>13A 328 Johnston St, Abbotsford VIC 3067</span>',
            '</div>',
            '<div style="display:flex;gap:1rem;flex-wrap:wrap;">',
              '<a href="/shop" style="display:inline-flex;align-items:center;gap:0.5rem;background:#00C4CC;color:#1a0533;border-radius:100px;padding:0.6rem 1.5rem;font-size:0.85rem;font-weight:700;text-decoration:none;letter-spacing:0.03em;">View Shop Details</a>',
              '<a href="https://maps.google.com/?q=13A+328+Johnston+St+Abbotsford+VIC+3067" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.5rem;background:rgba(0,196,204,0.12);color:#00C4CC;border:1px solid rgba(0,196,204,0.35);border-radius:100px;padding:0.6rem 1.25rem;font-size:0.85rem;font-weight:700;text-decoration:none;">Get Directions</a>',
            '</div>',
          '</div>',
          '<div class="shop-video-panel">',
            '<video autoplay muted loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;">',
              '<source src="' + videoUrl + '" type="video/mp4">',
            '</video>',
            '<div class="shop-video-overlay"></div>',
            '<span class="shop-video-badge">Abbotsford Shop</span>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    
    // Insert AFTER the About section (where Built to Support used to be)
    aboutSection.parentNode.insertBefore(banner, aboutSection.nextSibling);
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: injectFreeToolsSection
     Injects the Free Pool Tools section (diagnostics + calculator)
     on the homepage, after the services section and before contact/CTA
  ─────────────────────────────────────────────────────────────*/
  function injectFreeToolsSection() {
    if (document.getElementById('pp-free-tools')) return;
    // Only inject on the homepage
    if (location.pathname !== '/') return;

    var root = document.getElementById('root');
    if (!root) return;
    if (root.querySelectorAll('section').length < 3) return;

    // Find the services section — it typically contains "Our Services" or "Services"
    // and pool-related service cards. Fall back to finding a section with multiple
    // service-related keywords.
    var servicesSection = null;
    var allSections = root.querySelectorAll('section');

    for (var i = 0; i < allSections.length; i++) {
      var text = allSections[i].textContent || '';
      // Services section contains service listing keywords
      if (
        (text.indexOf('Pool Cleaning') !== -1 || text.indexOf('Pool Service') !== -1 || text.indexOf('Leak Detection') !== -1) &&
        (text.indexOf('Our Services') !== -1 || text.indexOf('What We Do') !== -1 || text.indexOf('Services') !== -1)
      ) {
        servicesSection = allSections[i];
        // Keep looking — we want the LAST matching section before contact
      }
    }

    // If no services section found, try inserting before the contact/CTA section
    if (!servicesSection) {
      for (var j = 0; j < allSections.length; j++) {
        var t = allSections[j].textContent || '';
        if (t.indexOf('Contact') !== -1 || t.indexOf('Get in Touch') !== -1 || t.indexOf('Call Us') !== -1) {
          // Insert before this section
          var contactSection = allSections[j];
          if (contactSection.parentNode) {
            var toolsEl = buildFreeToolsElement();
            contactSection.parentNode.insertBefore(toolsEl, contactSection);
          }
          return;
        }
      }
      // Last resort intentionally disabled: do not inject before React has mounted the full site.
      return;
    }

    // Insert after the services section
    var toolsElement = buildFreeToolsElement();
    servicesSection.parentNode.insertBefore(toolsElement, servicesSection.nextSibling);
  }

  function buildFreeToolsElement() {
    var el = document.createElement('div');
    el.id = 'pp-free-tools';
    el.innerHTML = [
      '<div class="pp-tools-inner">',
        '<div class="pp-tools-header">',
          '<span class="pp-tools-badge">No Account Needed</span>',
          '<h2 class="pp-tools-title">Free Pool Tools</h2>',
          '<p class="pp-tools-subtitle">Try our pool service tools, no account needed</p>',
        '</div>',
        '<div class="pp-tools-grid">',

          /* ── Card 1: Pool Photo Diagnostics ── */
          '<div class="pp-tool-card">',
            '<div class="pp-tool-icon pp-tool-icon-camera">',
              '<svg viewBox="0 0 24 24">',
                '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>',
                '<circle cx="12" cy="13" r="4"/>',
              '</svg>',
            '</div>',
            '<h3>Pool Photo Diagnostics</h3>',
            '<p>Upload a photo of your pool or equipment and get an instant pool service assessment. Our diagnostic tool identifies potential issues, suggests maintenance actions, and helps you understand what\'s happening with your pool.</p>',
            '<p class="pp-tool-disclaimer">Results are indicative only and should not replace professional assessment.</p>',
            '<a href="/pool-diagnostics/" class="pp-tool-btn">',
              '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
              'Try It Now',
            '</a>',
          '</div>',

          /* ── Card 2: Satellite Volume Calculator ── */
          '<div class="pp-tool-card">',
            '<div class="pp-tool-icon pp-tool-icon-satellite">',
              '<svg viewBox="0 0 24 24">',
                '<circle cx="12" cy="12" r="10"/>',
                '<line x1="2" y1="12" x2="22" y2="12"/>',
                '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
              '</svg>',
            '</div>',
            '<h3>Satellite Volume Calculator</h3>',
            '<p>Calculate your pool\'s volume using satellite imagery. Simply locate your pool on the map, trace its outline, and get accurate volume calculations for chemical dosing, equipment sizing, and more.</p>',
            '<a href="/pool-volume-calculator/" class="pp-tool-btn">',
              '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
              'Use This Tool',
            '</a>',
          '</div>',

        '</div>',
      '</div>'
    ].join('');
    return el;
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: addCalculatorsNavLink
     Adds Tools & Calculators to the nav
  ─────────────────────────────────────────────────────────────*/
  function addCalculatorsNavLink() {
    if (document.getElementById('pp-calc-nav-link')) return;
    var existing = document.querySelector('a[href*="pool-calculators"]');
    if (existing) return;
    var navLinks = document.querySelectorAll('nav a, header a');
    if (navLinks.length === 0) return;
    var lastNavLink = navLinks[navLinks.length - 1];
    var container = lastNavLink.closest('li') || lastNavLink.parentNode;
    var newItem = document.createElement(container.tagName === 'LI' ? 'li' : 'div');
    newItem.id = 'pp-calc-nav-link';
    newItem.innerHTML = '<a href="/pool-calculators" style="color:inherit;font-weight:inherit;font-size:inherit;text-transform:inherit;letter-spacing:inherit;text-decoration:none;">Tools &amp; Calculators</a>';
    container.parentNode.insertBefore(newItem, container.nextSibling);
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: fixPalatialLinkRedirect
     Fixes the Palatial Link admin login redirect
  ─────────────────────────────────────────────────────────────*/
  function fixPalatialLinkRedirect() {
    return; // [Palatial Pools fix] admin login redirect disabled for public site
    if (location.pathname.indexOf('/admin') === -1) return;
    var originalFetch = window.fetch;
    if (window._ppFetchPatched) return;
    window._ppFetchPatched = true;
    window.fetch = function() {
      var args = arguments;
      return originalFetch.apply(this, args).then(function(res) {
        if (args[0] && args[0].indexOf('/auth/login') !== -1 && res.ok) {
          setTimeout(function() {
            /* [Palatial Pools fix] admin/dashboard redirect disabled */
          }, 100);
        }
        return res;
      });
    };
  }

  /* ─────────────────────────────────────────────────────────────
     HELPER: isInNavbar
     Returns true if element is inside nav/header
  ─────────────────────────────────────────────────────────────*/
  function isInNavbar(el) {
    var node = el;
    while (node && node !== document.body) {
      var tag = (node.tagName || '').toLowerCase();
      if (tag === 'nav' || tag === 'header') return true;
      var cls = (node.className || '').toString().toLowerCase();
      if (cls.indexOf('navbar') !== -1 || cls.indexOf('nav-bar') !== -1 || cls.indexOf('topbar') !== -1) return true;
      node = node.parentNode;
    }
    return false;
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: normaliseContactDetails
     Ensures phone numbers and email are correct in content areas
  ─────────────────────────────────────────────────────────────*/
  function normaliseContactDetails() {
    // Hide old personal phone number
    document.querySelectorAll('a[href="tel:+61452157694"]').forEach(function(el) {
      el.style.display = 'none';
    });
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: fixHeroContactBlock
     Ensures hero section has full contact block (not navbar)
  ─────────────────────────────────────────────────────────────*/
  function fixHeroContactBlock() {
    if (location.pathname !== '/') return;
    // Find the hero landline link specifically (the one with phone icon, in the hero area)
    var heroLandline = null;
    document.querySelectorAll('a[href="tel:+61452157694"]').forEach(function(el) {
      if (isInNavbar(el)) return;
      if (heroLandline) return; // only first one (hero)
      heroLandline = el;
    });
    if (!heroLandline) return;
    var parent = heroLandline.parentNode;
    if (!parent || parent.querySelector('[data-pp-hero-mobile]')) return;
    
    // Get the landline's computed style to match it exactly
    var landlineStyle = window.getComputedStyle(heroLandline);
    var fontSize = landlineStyle.fontSize;
    var fontWeight = landlineStyle.fontWeight;
    var fontFamily = landlineStyle.fontFamily;
    var color = landlineStyle.color;
    
    // Create mobile number with SAME style as landline
    var mob = document.createElement('a');
    mob.href = 'tel:+61452157694';
    mob.setAttribute('data-pp-hero-mobile', '1');
    mob.style.cssText = 'font-size:' + fontSize + ';font-weight:' + fontWeight + ';font-family:' + fontFamily + ';color:' + color + ';text-decoration:none;display:flex;align-items:center;gap:0.5rem;margin-top:0.3rem;';
    // Add phone icon + text (matching the landline format)
    mob.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> 0452 157 694';
    heroLandline.insertAdjacentElement('afterend', mob);
  }

  /* ─────────────────────────────────────────────────────────────
     FUNCTION: injectAnalyticsTracker
     Lightweight self-hosted analytics tracker
     Tracks: page views, time on site, scroll depth, clicks,
     referrer, unique visitor IDs
  ─────────────────────────────────────────────────────────────*/
  function injectAnalyticsTracker() {
    // Don't track admin/palatial-link pages
    if (location.pathname.indexOf('/admin') === 0) return;
    if (window._ppAnalyticsLoaded) return;
    window._ppAnalyticsLoaded = true;

    var ANALYTICS_ENDPOINT = 'https://palatialpools.com.au/admin/api/analytics/track';
    
    // Get or create visitor ID
    var visitorId = localStorage.getItem('pp_vid');
    if (!visitorId) {
      visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('pp_vid', visitorId);
    }
    
    // Session ID (per browser session)
    var sessionId = sessionStorage.getItem('pp_sid');
    if (!sessionId) {
      sessionId = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('pp_sid', sessionId);
    }
    
    var pageStart = Date.now();
    var maxScrollDepth = 0;
    var clickCount = 0;
    
    // Track scroll depth
    function updateScrollDepth() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        var depth = Math.round((scrollTop / docHeight) * 100);
        if (depth > maxScrollDepth) maxScrollDepth = depth;
      }
    }
    window.addEventListener('scroll', updateScrollDepth, { passive: true });
    
    // Track clicks
    document.addEventListener('click', function(e) {
      clickCount++;
      var target = e.target;
      var tag = (target.tagName || '').toLowerCase();
      var text = (target.textContent || '').trim().substr(0, 50);
      var href = target.getAttribute ? target.getAttribute('href') : null;
      sendEvent('click', { tag: tag, text: text, href: href });
    });
    
    // Send tracking event
    function sendEvent(eventType, data) {
      var payload = {
        visitor_id: visitorId,
        session_id: sessionId,
        event_type: eventType,
        page: location.pathname,
        referrer: document.referrer || '',
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        timestamp: new Date().toISOString(),
        data: data || {}
      };
      
      // Use sendBeacon for reliability, fallback to fetch
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ANALYTICS_ENDPOINT, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).catch(function() {});
      }
    }
    
    // Track page view on load
    sendEvent('pageview', {
      title: document.title,
      referrer: document.referrer
    });
    
    // Track page exit with time on site and scroll depth
    window.addEventListener('beforeunload', function() {
      var timeOnPage = Math.round((Date.now() - pageStart) / 1000);
      sendEvent('pageleave', {
        time_on_page: timeOnPage,
        max_scroll_depth: maxScrollDepth,
        click_count: clickCount
      });
    });
    
    // Track SPA route changes
    var lastPath = location.pathname;
    window.addEventListener('popstate', function() {
      if (location.pathname !== lastPath) {
        var timeOnPage = Math.round((Date.now() - pageStart) / 1000);
        sendEvent('pageleave', { time_on_page: timeOnPage, max_scroll_depth: maxScrollDepth });
        lastPath = location.pathname;
        pageStart = Date.now();
        maxScrollDepth = 0;
        clickCount = 0;
        sendEvent('pageview', { title: document.title });
      }
    });
  }


  /* ─────────────────────────────────────────────────────────────
     FUNCTION: injectNavDropdowns
     Creates hover dropdown menus for nav items with chevrons
  ─────────────────────────────────────────────────────────────*/
  function injectNavDropdowns() {
    // Guard: check if already fully injected (all 3 dropdowns present)
    if (document.querySelectorAll('.pp-nav-dropdown').length >= 3) return;
    
    var dropdownData = {
      '/services': [
        { text: 'Single Visit Services', href: '/melbourne-pool-services/' },
        { text: 'Regular Pool Cleaning', href: '/melbourne-regular-pool-cleaning/' },
        { text: 'Leak Detection', href: '/melbourne-pool-spa-leak-detection/' },
        { text: 'Pool & Spa Heating', href: '/melbourne-pool-heating/' },
        { text: 'Sand Changes', href: '/melbourne-sand-changes/' },
        { text: 'Pool Contracting', href: '/melbourne-pool-contracting/' },
        { text: 'Equipment Store', href: '/online-pool-shop-melbourne/' }
      ],
      '/service-areas': [
        { text: 'All Service Areas', href: '/palatial-service-area/' },
        { text: 'Abbotsford', href: '/abbotsford-pool-maintenance/' },
        { text: 'Balwyn', href: '/balwyn-pool-service/' },
        { text: 'Camberwell', href: '/camberwell-pool-service/' },
        { text: 'Hawthorn', href: '/hawthorn-pool-servicing/' },
        { text: 'Kew', href: '/kew-pool-service/' },
        { text: 'Richmond', href: '/richmond-pool-service/' },
        { text: 'South Yarra', href: '/south-yarra-pool-service/' },
        { text: 'Toorak', href: '/toorak-pool-maintenance/' }
      ],
      '#more': [
        { text: 'About Us', href: '/about-us/' },
        { text: 'FAQ', href: '/faq/' },
        { text: 'Blog', href: '/blog/' },
        { text: 'Testimonials', href: '/testimonials/' },
        { text: 'Naked Pools', href: '/naked-freshwater-pools/' },
        { text: 'Pool Area Shield', href: '/pool-area-shield/' },
        { text: 'Privacy Policy', href: '/privacy-policy/' }
      ]
    };
    
    var navContainer = null;
    var allDivs = document.querySelectorAll('nav div');
    for (var i = 0; i < allDivs.length; i++) {
      var cls = allDivs[i].getAttribute('class') || '';
      if (cls === 'hidden lg:flex items-center' && allDivs[i].children.length > 5) {
        navContainer = allDivs[i];
        break;
      }
    }
    if (!navContainer) return;
    
    var navItems = navContainer.children;
    for (var n = 0; n < navItems.length; n++) {
      var item = navItems[n];
      var link = item.querySelector('a');
      var svg = item.querySelector('svg.lucide-chevron-down');
      if (!link || !svg) continue;
      if (item.querySelector('.pp-nav-dropdown')) continue;
      
      var href = link.getAttribute('href') || '';
      var items = null;
      
      if (href === '/services') items = dropdownData['/services'];
      else if (href === '/service-areas') items = dropdownData['/service-areas'];
      else if ((link.textContent || '').trim().toLowerCase() === 'more' || href === '' || href === '#' || href === '/more') items = dropdownData['#more'];
      
      if (!items) continue;
      
      item.classList.add('pp-nav-has-dropdown');
      
      var dropdown = document.createElement('div');
      dropdown.className = 'pp-nav-dropdown';
      
      for (var j = 0; j < items.length; j++) {
        var a = document.createElement('a');
        a.href = items[j].href;
        a.textContent = items[j].text;
        dropdown.appendChild(a);
      }
      
      item.appendChild(dropdown);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     MAIN: applyAll
     Runs all patches
  ─────────────────────────────────────────────────────────────*/
  function applyAll() {
    injectGlobalCSS();
    swapImages();
    cleanNavigation();
    transformPortalPage();
    injectShopBanner();
    injectFreeToolsSection();
    injectNavDropdowns();
    normaliseContactDetails();
    fixPalatialLinkRedirect();
    fixHeroContactBlock();
    updateChemicalPrices();
  }

  // Run immediately and on DOM mutations (for React SPA)
  applyAll();
  injectAnalyticsTracker();
  
  var mo = new MutationObserver(applyAll);
  mo.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', function() {
    applyAll();
    injectAnalyticsTracker();
  });
})();
