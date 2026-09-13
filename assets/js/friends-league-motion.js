/* Decorative motion only: never reads or writes tournament state. */
(() => {
  'use strict';
  const root = document.documentElement;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.fl-hero-stage');
  let frame = 0;
  const update = () => {
    frame = 0;
    if (!hero || preference.matches) return;
    const rect = hero.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < innerHeight) {
      const offset = Math.max(-120, Math.min(180, -rect.top * .22));
      hero.style.setProperty('--fl-orb-y', `${offset.toFixed(1)}px`);
    }
  };
  const schedule = () => { if (!frame && !preference.matches) frame = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  preference.addEventListener('change', () => {
    if (preference.matches && hero) hero.style.removeProperty('--fl-orb-y');
    else schedule();
  });
  schedule();
  // Animate on entry without hiding content while data loads or if JS fails.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (!preference.matches) entry.target.classList.add('fl-enter');
      observer.unobserve(entry.target);
    }), { threshold: 0, rootMargin: '0px 0px -35px 0px' });
    document.querySelectorAll('.fl-section-intro, .fl-season-grid, .public-layout > .main-column > .panel, #analytics-section, .fl-footer').forEach(el => observer.observe(el));
  }
  // Offscreen decorative loops do not consume animation work.
  if ('IntersectionObserver' in window) {
    const loops = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
    }));
    document.querySelectorAll('.fl-orb, .fl-satellite, .fl-marquee > div').forEach(el => loops.observe(el));
  }
})();
