/* ========================================
   Standout Design Effects
   Custom cursor, magnetic buttons, text reveals,
   scroll progress, and enhanced animations
   ======================================== */

(function() {
  'use strict';

  var isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // --- Scroll Progress Bar ---
  var progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', function() {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  }, { passive: true });

  // --- Hero Text Split Animation ---
  var heroName = document.querySelector('.hero-name');
  if (heroName) {
    var text = heroName.textContent;
    heroName.innerHTML = '';
    heroName.classList.add('hero-text-reveal');
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement('span');
      span.className = 'hero-char';
      span.textContent = text[i] === ' ' ? '\u00A0' : text[i];
      heroName.appendChild(span);
    }
    // Animate each char with a stagger (purely visual enhancement)
    var chars = heroName.querySelectorAll('.hero-char');
    chars.forEach(function(ch, idx) {
      ch.style.opacity = '0';
      ch.style.transform = 'translateY(40px)';
      ch.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      ch.style.transitionDelay = (idx * 0.04 + 0.2) + 's';
    });
    // Trigger the transition on next frame
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        chars.forEach(function(ch) {
          ch.style.opacity = '1';
          ch.style.transform = 'translateY(0)';
        });
      });
    });
  }

  // --- Hero Tagline Fade ---
  var heroTagline = document.querySelector('.hero-tagline');
  if (heroTagline) {
    heroTagline.style.opacity = '0';
    heroTagline.style.transform = 'translateY(15px)';
    heroTagline.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(function() {
      heroTagline.style.opacity = '1';
      heroTagline.style.transform = 'translateY(0)';
    }, 800);
  }

  // --- Magnetic Buttons ---
  if (!isTouch) {
    var magneticEls = document.querySelectorAll('.contact-btn, .nav-logo');
    magneticEls.forEach(function(el) {
      el.addEventListener('mousemove', function(e) {
        var rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = 'translate(' + (x * 0.3) + 'px, ' + (y * 0.3) + 'px)';
      });
      el.addEventListener('mouseleave', function() {
        el.style.transform = 'translate(0, 0)';
        el.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      });
      el.addEventListener('mouseenter', function() {
        el.style.transition = 'transform 0.1s ease-out';
      });
    });
  }

  // (title reveal removed)

  // --- Skill card tilt on hover ---
  if (!isTouch) {
    var skillCards = document.querySelectorAll('.skill-card');
    skillCards.forEach(function(card) {
      card.addEventListener('mousemove', function(e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = 'translateY(-4px) perspective(600px) rotateX(' + (-y * 8) + 'deg) rotateY(' + (x * 8) + 'deg)';
      });
      card.addEventListener('mouseleave', function() {
        card.style.transform = 'translateY(0) perspective(600px) rotateX(0) rotateY(0)';
      });
    });
  }

  // --- Stat number count-up animation ---
  var stats = document.querySelectorAll('.stat-number');
  var statObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        var text = el.textContent;
        var match = text.match(/^(\d+)/);
        if (match) {
          var target = parseInt(match[1]);
          var suffix = text.replace(match[1], '');
          var start = 0;
          var duration = 1500;
          var startTime = null;
          function step(ts) {
            if (!startTime) startTime = ts;
            var progress = Math.min((ts - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target) + suffix;
            if (progress < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
        statObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(function(s) { statObserver.observe(s); });

})();
