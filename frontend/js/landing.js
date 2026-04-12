/**
 * GreetX Landing Page — landing.js
 * Scroll reveal, animated chat preview, stats counter, tabs, navbar scroll
 */
(function () {
    'use strict';

    // ── NAVBAR SCROLL ──────────────────────────────────
    const nav = document.getElementById('lp-nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 24);
        }, { passive: true });
    }

    // ── HAMBURGER MENU ─────────────────────────────────
    const hamburger = document.getElementById('lp-hamburger');
    const mobileMenu = document.getElementById('lp-mobile-menu');

    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            mobileMenu.classList.toggle('open');
        });

        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('open');
                mobileMenu.classList.remove('open');
            });
        });
    }

    // ── SCROLL REVEAL ──────────────────────────────────
    const revealEls = document.querySelectorAll('.reveal');

    // Stagger delays for sibling groups
    const staggerGroups = [
        '.features-grid .feature-card',
        '.steps-row .step',
        '.why-list li',
    ];

    staggerGroups.forEach(selector => {
        document.querySelectorAll(selector).forEach((el, i) => {
            el.dataset.delay = i * 90;
        });
    });

    function revealEl(el) {
        const delay = parseFloat(el.dataset.delay || 0);
        setTimeout(() => el.classList.add('visible'), delay);
    }

    function checkInViewport(el) {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    }

    // Immediately reveal anything already in viewport on load
    function initialReveal() {
        revealEls.forEach(el => {
            if (checkInViewport(el)) revealEl(el);
        });
    }

    // Observer for the rest as user scrolls
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                revealEl(entry.target);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    revealEls.forEach(el => {
        if (!checkInViewport(el)) {
            revealObserver.observe(el);
        }
    });

    // Run initial reveal after a short paint delay
    requestAnimationFrame(() => {
        setTimeout(initialReveal, 80);
    });

    // Also reveal on scroll (fallback)
    window.addEventListener('scroll', () => {
        revealEls.forEach(el => {
            if (!el.classList.contains('visible') && checkInViewport(el)) {
                revealEl(el);
            }
        });
    }, { passive: true });

    // ── STATS COUNTER ──────────────────────────────────
    const statNums = document.querySelectorAll('.stat-num');

    function animateStat(el) {
        if (el.dataset.animated) return;
        el.dataset.animated = '1';
        const target = parseInt(el.dataset.target);
        const duration = 1600;
        const step = 16;
        const steps = Math.ceil(duration / step);
        let count = 0;

        const timer = setInterval(() => {
            count++;
            const progress = count / steps;
            const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
            el.textContent = Math.round(eased * target);
            if (count >= steps) {
                el.textContent = target;
                clearInterval(timer);
            }
        }, step);
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStat(entry.target);
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });

    statNums.forEach(el => statsObserver.observe(el));

    // ── PREVIEW TABS ───────────────────────────────────
    const tabs = document.querySelectorAll('.ptab');
    const previewImgs = document.querySelectorAll('.preview-img');
    const pfUrl = document.querySelector('.pf-url');

    const tabUrls = {
        chat: 'greetx.app/chat',
        contacts: 'greetx.app/contacts',
        profile: 'greetx.app/profile',
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            previewImgs.forEach(img => img.classList.remove('active'));

            const activeImg = document.getElementById(`preview-${target}`);
            if (activeImg) activeImg.classList.add('active');
            if (pfUrl) pfUrl.textContent = tabUrls[target] || '';
        });
    });

    // ── ANIMATED CHAT PREVIEW ─────────────────────────
    const chatMsgs = [
        document.getElementById('anim-msg-1'),
        document.getElementById('anim-msg-2'),
        document.getElementById('anim-msg-3'),
        document.getElementById('anim-msg-4'),
    ];
    const typingEl = document.getElementById('anim-typing');
    const typedText = document.getElementById('cpw-typed-text');

    function runChatAnimation() {
        // Reset all
        chatMsgs.forEach(m => { if (m) m.classList.remove('visible'); });
        if (typingEl) typingEl.classList.remove('visible');
        if (typedText) { typedText.textContent = 'Type a message...'; typedText.style.color = ''; }

        const timeline = [
            [700,  () => show(chatMsgs[0])],
            [1500, () => show(typingEl)],
            [2800, () => hide(typingEl)],
            [3000, () => show(chatMsgs[1])],
            [4000, () => show(chatMsgs[2])],
            [5000, () => typeMessage('Got it! 🚀 Let\'s do it')],
            [6400, () => { if (typedText) { typedText.textContent = 'Type a message...'; typedText.style.color = ''; }}],
            [6600, () => show(chatMsgs[3])],
        ];

        timeline.forEach(([delay, fn]) => setTimeout(fn, delay));

        // Loop every 10s
        setTimeout(runChatAnimation, 10000);
    }

    function show(el) { if (el) el.classList.add('visible'); }
    function hide(el) { if (el) el.classList.remove('visible'); }

    function typeMessage(text) {
        if (!typedText) return;
        typedText.style.color = 'var(--c-text)';
        let i = 0;
        typedText.textContent = '';
        const t = setInterval(() => {
            if (i < text.length) {
                typedText.textContent += text[i++];
            } else {
                clearInterval(t);
            }
        }, 55);
    }

    // Start chat animation after 500ms
    setTimeout(runChatAnimation, 500);

    // ── SMOOTH ANCHOR SCROLL ─────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const navH = nav ? nav.offsetHeight : 68;
                const top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

})();
