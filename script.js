/* ============================================
   script.js — Abhay Mittal's Portfolio
   ============================================ */

(function () {
    'use strict';

    /* ────────────────────────────────────────────
       1. Custom Animated Cursor
       ──────────────────────────────────────────── */
    const cursorDot = document.getElementById('cursorDot');
    const cursorRing = document.getElementById('cursorRing');

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;
    const lerpFactor = 0.12;

    document.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top = mouseY + 'px';
        cursorDot.classList.add('visible');
        cursorRing.classList.add('visible');
    });

    function animateRing() {
        ringX += (mouseX - ringX) * lerpFactor;
        ringY += (mouseY - ringY) * lerpFactor;
        cursorRing.style.left = ringX + 'px';
        cursorRing.style.top = ringY + 'px';
        requestAnimationFrame(animateRing);
    }
    animateRing();

    const hoverTargets = 'a, button, input, textarea, .skill-tag, .skill-tag--learning';

    document.addEventListener('mouseover', function (e) {
        if (e.target.closest(hoverTargets)) {
            cursorDot.classList.add('hover');
            cursorRing.classList.add('hover');
        }
    });

    document.addEventListener('mouseout', function (e) {
        if (e.target.closest(hoverTargets)) {
            cursorDot.classList.remove('hover');
            cursorRing.classList.remove('hover');
        }
    });

    /* ────────────────────────────────────────────
       2. Typing Effect
       ──────────────────────────────────────────── */
    const typedTextEl = document.getElementById('typedText');
    const phrases = [
        'Building for the Web.',
        'React & JS Developer.',
        'MERN Stack in Progress.',
        'Clean Code. Sharp UI.',
    ];
    const typeSpeed = 110;
    const deleteSpeed = 55;
    const pauseAfterWord = 1800;
    const pauseBeforeNext = 400;

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeLoop() {
        var currentPhrase = phrases[phraseIndex];

        if (!isDeleting) {
            charIndex++;
            typedTextEl.textContent = currentPhrase.substring(0, charIndex);
            if (charIndex === currentPhrase.length) {
                isDeleting = true;
                setTimeout(typeLoop, pauseAfterWord);
                return;
            }
            setTimeout(typeLoop, typeSpeed);
        } else {
            charIndex--;
            typedTextEl.textContent = currentPhrase.substring(0, charIndex);
            if (charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                setTimeout(typeLoop, pauseBeforeNext);
                return;
            }
            setTimeout(typeLoop, deleteSpeed);
        }
    }

    setTimeout(typeLoop, 1400);

    /* ────────────────────────────────────────────
       3. Scroll Reveal (IntersectionObserver)
       ──────────────────────────────────────────── */
    var revealElements = document.querySelectorAll('.reveal');

    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(function (el) {
        revealObserver.observe(el);
    });

    /* ────────────────────────────────────────────
       4. Dark / Light Mode Toggle
       ──────────────────────────────────────────── */
    var themeToggle = document.getElementById('themeToggle');
    var themeIcon = document.getElementById('themeIcon');
    var body = document.body;

    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }

    themeToggle.addEventListener('click', function () {
        body.classList.toggle('light-mode');
        var isLight = body.classList.contains('light-mode');

        if (isLight) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('theme', 'light');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('theme', 'dark');
        }
    });

    /* ────────────────────────────────────────────
       5. Active Nav Highlight + Navbar Shadow
          (combined into one scroll handler)
       ──────────────────────────────────────────── */
    var navLinks = document.querySelectorAll('.nav__link');
    var sections = document.querySelectorAll('section[id]');
    var nav = document.getElementById('nav');

    function highlightNav() {
        var scrollY = window.scrollY + 120;

        sections.forEach(function (section) {
            var sectionTop = section.offsetTop;
            var sectionHeight = section.offsetHeight;
            var sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinks.forEach(function (link) {
                    link.classList.remove('active');
                    if (link.getAttribute('data-section') === sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    /* Call once on load so correct link is active immediately */
    highlightNav();

    window.addEventListener('scroll', function () {
        highlightNav();

        if (window.scrollY > 40) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    /* ────────────────────────────────────────────
       6. Contact Form — Web3Forms fetch submission
       ──────────────────────────────────────────── */
    var contactForm = document.getElementById('contactForm');
    var submitBtn = document.getElementById('submitBtn');
    var formStatus = document.getElementById('formStatus');

    if (contactForm && submitBtn && formStatus) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            /* Show loading state */
            var originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Sending... <i class="fa-solid fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
            formStatus.textContent = '';
            formStatus.className = 'form-status';

            var formData = new FormData(contactForm);

            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: formData
            })
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    if (data.success) {
                        formStatus.textContent = "Message sent! I'll get back to you soon.";
                        formStatus.className = 'form-status success';
                        contactForm.reset();
                    } else {
                        formStatus.textContent = 'Something went wrong. Please try again.';
                        formStatus.className = 'form-status error';
                    }
                })
                .catch(function () {
                    formStatus.textContent = 'Something went wrong. Please try again.';
                    formStatus.className = 'form-status error';
                })
                .finally(function () {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                });
        });
    }

})();
