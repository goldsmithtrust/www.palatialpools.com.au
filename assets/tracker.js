(function() {
    const CONFIG = {
        endpoint: 'https://pulse.palatialpools.com.au/api/public/track',
        cookieName: '_pp_vid',
        cookieExpiry: 365
    };

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
    }

    let vid = getCookie(CONFIG.cookieName);
    if (!vid) {
        vid = 'v-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
        setCookie(CONFIG.cookieName, vid, CONFIG.cookieExpiry);
    }

    const sessionData = {
        vid: vid,
        url: window.location.href,
        referrer: document.referrer,
        screen: `${window.screen.width}x${window.screen.height}`,
        browser: navigator.userAgent,
        ts: Date.now()
    };

    function sendEvent(type, data = {}) {
        const payload = { ...sessionData, type, ...data, path: window.location.pathname };
        fetch(CONFIG.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(() => {});
    }

    // Track pageview
    sendEvent('pageview');

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
        const scroll = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);
        if (scroll > maxScroll) {
            maxScroll = scroll;
            if (maxScroll % 25 === 0) sendEvent('scroll', { depth: maxScroll });
        }
    }, { passive: true });

    // Track clicks
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a, button');
        if (target) {
            sendEvent('click', { 
                text: target.innerText.substring(0, 50), 
                id: target.id, 
                class: target.className,
                href: target.href
            });
        }
    });

    // Track form interactions & abandoned fills
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            sendEvent('form_focus', { name: e.target.name || e.target.id });
        }
    });

    // Link form submissions
    document.addEventListener('submit', (e) => {
        const formData = new FormData(e.target);
        const data = {};
        formData.forEach((value, key) => {
            if (key.toLowerCase().includes('email') || key.toLowerCase().includes('phone') || key.toLowerCase().includes('name')) {
                data[key] = value;
            }
        });
        sendEvent('form_submit', { form_id: e.target.id, identity: data });
    });

    // Phone reordering logic
    function reorderPhones() {
        const containers = document.querySelectorAll('.flex.items-start.gap-3, .flex.items-center.gap-2, .space-y-3, .grid');
        containers.forEach(container => {
            const links = Array.from(container.querySelectorAll('a[href^="tel:"]'));
            if (links.length >= 2) {
                const landline = links.find(l => l.innerText.includes('03 4231'));
                const mobile = links.find(l => l.innerText.includes('0452 157'));
                const other = links.find(l => l.innerText.includes('0452 157'));
                
                if (landline && mobile) {
                    const parent = landline.parentNode;
                    // Simple reorder if they are direct children
                    if (parent === mobile.parentNode) {
                        const fragment = document.createDocumentFragment();
                        fragment.appendChild(landline);
                        fragment.appendChild(mobile);
                        if (other) fragment.appendChild(other);
                        // This is destructive, only do if we are sure of the structure
                        // Instead, let's just swap if needed
                    }
                }
            }
        });
    }
    window.addEventListener('DOMContentLoaded', reorderPhones);
    setTimeout(reorderPhones, 1000); // Backup for SPA
})();
