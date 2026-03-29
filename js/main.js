/* ========================================
   Jeff Fenchel - Personal Site
   Scroll animations, nav behavior, mobile menu
   ======================================== */

(function() {
  'use strict';

  // --- Navbar scroll behavior ---
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  function onScroll() {
    const scrollY = window.scrollY;
    nav.classList.toggle('scrolled', scrollY > 80);
    lastScroll = scrollY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- Mobile menu toggle ---
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function() {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
      document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
    });

    links.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() {
        toggle.classList.remove('open');
        links.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // --- Scroll animations (Intersection Observer) ---
  var animatedElements = document.querySelectorAll(
    '.about-image, .about-text, .adventure-card, .skill-card, .tech-stack, .contact-subtitle, .contact-links, .parallax-text'
  );

  animatedElements.forEach(function(el) {
    el.classList.add('fade-up');
  });

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  animatedElements.forEach(function(el) {
    observer.observe(el);
  });

  // --- Stagger adventure cards ---
  var cards = document.querySelectorAll('.adventure-card');
  cards.forEach(function(card, i) {
    card.style.transitionDelay = (i * 0.08) + 's';
  });

  // --- Stagger skill cards ---
  var skillCards = document.querySelectorAll('.skill-card');
  skillCards.forEach(function(card, i) {
    card.style.transitionDelay = (i * 0.1) + 's';
  });

  // --- Parallax on scroll ---
  var parallaxImg = document.querySelector('.parallax-break img');
  if (parallaxImg) {
    window.addEventListener('scroll', function() {
      var rect = parallaxImg.parentElement.getBoundingClientRect();
      var viewH = window.innerHeight;
      if (rect.bottom > 0 && rect.top < viewH) {
        var progress = (viewH - rect.top) / (viewH + rect.height);
        parallaxImg.style.transform = 'translateY(' + ((progress - 0.5) * 20) + '%)';
      }
    }, { passive: true });
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

})();
