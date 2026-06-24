(function() {
  'use strict';

  function injectPlatformSection() {
    var root = document.getElementById('root');
    if (!root) return false;

    var sections = root.querySelectorAll('section');
    if (sections.length < 3) return false;

    if (document.getElementById('platform-section')) return true;

    var targetSection = null;
    for (var i = 0; i < sections.length; i++) {
      var text = sections[i].textContent || '';
      if (text.indexOf('CLIENT REVIEWS') !== -1 || text.indexOf('What Our Clients Say') !== -1) {
        targetSection = sections[i];
        break;
      }
    }

    if (!targetSection && sections.length > 2) {
      targetSection = sections[sections.length - 2];
    }

    if (!targetSection) return false;

    var sectionHTML = '<section id="platform-section" style="padding:6rem 1.5rem;background:linear-gradient(180deg,#0d0118 0%,#120520 50%,#0d0118 100%);position:relative;overflow:hidden;">' +
      '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(197,165,90,0.06) 0%,transparent 70%);pointer-events:none;"></div>' +
      '<div style="max-width:1200px;margin:0 auto;position:relative;z-index:1;">' +
        '<div style="text-align:center;margin-bottom:3.5rem;">' +
          '<p style="color:#00C4CC;font-size:0.875rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:0.75rem;font-family:Outfit,sans-serif;">TOOLS WE USE</p>' +
          '<h2 style="font-size:clamp(2rem,4vw,3rem);font-weight:800;color:#fff;margin:0 0 1rem;font-family:Outfit,sans-serif;line-height:1.15;">Our Pool Management Platform</h2>' +
          '<p style="color:rgba(255,255,255,0.6);font-size:1.1rem;max-width:700px;margin:0 auto;line-height:1.7;font-family:Plus Jakarta Sans,sans-serif;">The systems behind our scheduling, diagnostics, and day-to-day service operations across Melbourne.</p>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-bottom:3rem;">' +
          '<div style="background:rgba(197,165,90,0.05);border:1px solid rgba(0,196,204,0.15);border-radius:12px;padding:2rem;transition:border-color 0.3s;">' +
            '<div style="width:48px;height:48px;border-radius:10px;background:rgba(0,196,204,0.1);display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;">' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C4CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>' +
            '</div>' +
            '<h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin:0 0 0.5rem;font-family:Outfit,sans-serif;">Real-Time Monitoring</h3>' +
            '<p style="color:rgba(255,255,255,0.55);font-size:0.95rem;line-height:1.6;margin:0;font-family:Plus Jakarta Sans,sans-serif;">Live dashboard tracking every service, technician, and customer interaction across all active jobs in real time.</p>' +
          '</div>' +
          '<div style="background:rgba(197,165,90,0.05);border:1px solid rgba(0,196,204,0.15);border-radius:12px;padding:2rem;transition:border-color 0.3s;">' +
            '<div style="width:48px;height:48px;border-radius:10px;background:rgba(0,196,204,0.1);display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;">' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C4CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>' +
            '</div>' +
            '<h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin:0 0 0.5rem;font-family:Outfit,sans-serif;">Predictive Diagnostics</h3>' +
            '<p style="color:rgba(255,255,255,0.55);font-size:0.95rem;line-height:1.6;margin:0;font-family:Plus Jakarta Sans,sans-serif;">AI-driven analysis identifies potential equipment failures and maintenance needs before they become costly problems.</p>' +
          '</div>' +
          '<div style="background:rgba(197,165,90,0.05);border:1px solid rgba(0,196,204,0.15);border-radius:12px;padding:2rem;transition:border-color 0.3s;">' +
            '<div style="width:48px;height:48px;border-radius:10px;background:rgba(0,196,204,0.1);display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;">' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C4CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
            '</div>' +
            '<h3 style="color:#fff;font-size:1.15rem;font-weight:700;margin:0 0 0.5rem;font-family:Outfit,sans-serif;">Customer Portal</h3>' +
            '<p style="color:rgba(255,255,255,0.55);font-size:0.95rem;line-height:1.6;margin:0;font-family:Plus Jakarta Sans,sans-serif;">Secure client access to service history, upcoming appointments, invoices, and real-time job progress updates.</p>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:center;">' +
          '<p style="color:rgba(255,255,255,0.5);font-size:0.95rem;margin-bottom:1.5rem;font-family:Plus Jakarta Sans,sans-serif;">Powering smarter pool management for residential and commercial clients across Melbourne.</p>' +
          '<a href="/palatial-link" style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.875rem 2rem;border-radius:8px;border:1px solid rgba(0,196,204,0.3);color:#00C4CC;font-weight:600;font-size:0.95rem;text-decoration:none;transition:all 0.3s;font-family:Outfit,sans-serif;" onmouseover="this.style.background=\'rgba(0,196,204,0.1)\';this.style.borderColor=\'rgba(0,196,204,0.5)\'" onmouseout="this.style.background=\'transparent\';this.style.borderColor=\'rgba(0,196,204,0.3)\'">' +
            'Explore Palatial Link' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</section>';

    targetSection.insertAdjacentHTML('beforebegin', sectionHTML);
    return true;
  }

  function tryInject() {
    if (!injectPlatformSection()) {
      setTimeout(tryInject, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(tryInject, 500);
    });
  } else {
    setTimeout(tryInject, 500);
  }

  window.addEventListener('palatial-route-change', function() {
    setTimeout(tryInject, 500);
  });
})();
