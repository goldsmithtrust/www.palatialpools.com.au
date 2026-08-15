(function () {
  'use strict';

  var isHome = function () {
    return window.location.pathname === '/' || window.location.pathname === '/index.html';
  };

  var icons = {
    fault: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 10-13h-7z"/></svg>',
    leak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/><path d="M9.2 15.2c.45 1.2 1.35 1.8 2.8 1.8"/></svg>',
    water: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v11a5 5 0 0 0 10 0V3"/><path d="M7 7h10M7 11h10"/></svg>',
    heat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8M7 6.5l3 5.2M17 6.5l-3 5.2M8.3 18.3a5.2 5.2 0 1 0 7.4 0"/></svg>',
    service: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 3v6M17 3v6M5 10h14v10H5z"/></svg>'
  };

  var decisions = {
    fault: {
      heading: 'Start with a diagnostic visit',
      body: 'If the pump is hot, noisy, tripping or leaking, do not keep resetting a safety device. Note the symptom and arrange the right check.',
      cta: 'Book a diagnostic visit',
      href: '/pool-diagnostics'
    },
    leak: {
      heading: 'Confirm the cause before repair',
      body: 'Record the water level and any wet areas. A proper investigation separates evaporation, plumbing and structural causes before work starts.',
      cta: 'Check likely leak causes',
      href: '/melbourne-pool-spa-leak-detection'
    },
    water: {
      heading: 'Use a measured water test',
      body: 'Bring a fresh sample and note recent chemical additions. Avoid mixing chemicals or making several corrections at once.',
      cta: 'Open water tools',
      href: '/pool-calculators'
    },
    heat: {
      heading: 'Check the safe basics first',
      body: 'Record any error message and whether circulation is normal. Do not keep restarting equipment with an electrical or gas-related fault.',
      cta: 'Book a heater check',
      href: '/melbourne-pool-heating'
    },
    service: {
      heading: 'Plan regular pool care',
      body: 'A service plan starts with your pool type, usage, equipment condition and access. We then set the useful visit scope.',
      cta: 'Discuss regular service',
      href: '/contact-palatial-pool-services'
    }
  };

  function normalizeButtons() {
    document.querySelectorAll('a, button').forEach(function (element) {
      if (element.dataset.ppActionReady === 'true') return;
      var label = (element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!label) return;
      var type = '';
      if (/book a service|book service|request.*service|free quote|request a quote/.test(label)) type = 'book';
      else if (/call 0452|call us|call now/.test(label)) type = 'call';
      else if (/calculator|pool tool|water tool|diagnostic tool/.test(label)) type = 'tool';
      else if (/diagnostic|leak detection|equipment repair|installation/.test(label)) type = 'service';
      if (!type) return;
      element.classList.add('pp-action', 'pp-action--' + type);
      element.dataset.ppActionReady = 'true';
      if (!element.getAttribute('aria-label')) element.setAttribute('aria-label', (element.textContent || '').trim());
    });
  }

  function addQuickDock() {
    if (document.querySelector('.pp-quick-dock')) return;
    var dock = document.createElement('nav');
    dock.className = 'pp-quick-dock';
    dock.setAttribute('aria-label', 'Quick actions');
    dock.innerHTML = '<a href="/contact-palatial-pool-services">Book service</a><a href="tel:+61452157694">Call 0452 157 694</a>';
    document.body.appendChild(dock);
  }

  function makeDecisionBoard() {
    if (!isHome() || document.querySelector('.pp-decision-board')) return;
    var main = document.querySelector('#root main') || document.querySelector('#root');
    if (!main) return;
    var firstSection = main.querySelector('section');
    if (!firstSection) return;
    var section = document.createElement('section');
    section.className = 'pp-decision-board pp-next-density pp-next-density--tight';
    section.setAttribute('aria-labelledby', 'pp-decision-title');
    section.innerHTML = [
      '<div class="pp-decision-board__inner">',
      '<div class="pp-decision-board__intro">',
      '<div><p class="pp-eyebrow"><span class="pp-pulse-dot" aria-hidden="true"></span> Pool decision guide</p><h2 id="pp-decision-title">Tell us what the pool is doing.</h2></div>',
      '<p>Choose the closest situation. You will get the right next step, not a generic quote path.</p>',
      '</div>',
      '<div class="pp-decision-grid" role="group" aria-label="Choose your pool situation">',
      decisionButton('fault', 'Pump stopped or noisy', 'Start with the fault'),
      decisionButton('leak', 'Losing water', 'Check the likely cause'),
      decisionButton('water', 'Water looks wrong', 'Test before treating'),
      decisionButton('heat', 'Heating problem', 'Check the system'),
      decisionButton('service', 'Routine pool care', 'Plan the right visit'),
      '</div>',
      '<div class="pp-decision-result" aria-live="polite">',
      '<div class="pp-decision-result__copy"><span class="pp-decision-result__mark">i</span><div><strong id="pp-decision-result-heading">Choose a situation to see the useful next step.</strong><p id="pp-decision-result-copy">For immediate danger, a suspected gas leak, electrical hazard or barrier fault, stop using the area and seek the appropriate urgent assistance.</p></div></div>',
      '<a id="pp-decision-result-link" class="pp-action pp-action--service" href="/contact-palatial-pool-services">Discuss your pool</a>',
      '</div>',
      '<div class="pp-service-path" aria-label="Palatial service pathway">',
      '<div class="pp-path-step"><span class="pp-path-step__number">01</span><h3>Observe</h3><p>Note the symptom, error code, water condition or change in behaviour.</p></div>',
      '<div class="pp-path-step"><span class="pp-path-step__number">02</span><h3>Assess</h3><p>Use the right test, water reading or site check before choosing work.</p></div>',
      '<div class="pp-path-step"><span class="pp-path-step__number">03</span><h3>Act</h3><p>Receive a clear repair, service or shop-support path that fits the finding.</p></div>',
      '</div>',
      '</div>'
    ].join('');
    firstSection.insertAdjacentElement('afterend', section);
    section.querySelectorAll('.pp-decision-choice').forEach(function (button) {
      button.addEventListener('click', function () {
        var choice = decisions[button.dataset.choice];
        section.querySelectorAll('.pp-decision-choice').forEach(function (item) { item.setAttribute('aria-pressed', 'false'); });
        button.setAttribute('aria-pressed', 'true');
        section.querySelector('#pp-decision-result-heading').textContent = choice.heading;
        section.querySelector('#pp-decision-result-copy').textContent = choice.body;
        var link = section.querySelector('#pp-decision-result-link');
        link.textContent = choice.cta;
        link.href = choice.href;
      });
    });
  }

  function decisionButton(key, title, helper) {
    return '<button class="pp-decision-choice" type="button" data-choice="' + key + '" aria-pressed="false"><span class="pp-decision-choice__icon">' + icons[key] + '</span><span>' + title + '<small>' + helper + '</small></span></button>';
  }

  function applyExperience() {
    normalizeButtons();
    addQuickDock();
    makeDecisionBoard();
  }

  applyExperience();
  var observer = new MutationObserver(function () {
    window.requestAnimationFrame(applyExperience);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
