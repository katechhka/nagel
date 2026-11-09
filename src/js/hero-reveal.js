// Progressive enhancement: without JS or motion support, all content stays visible.
export function initHeroReveal(hero) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!hero || motion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const copy = hero.querySelector('.hero__copy');
  const items = [...copy.querySelectorAll('.hero__title-caption, .hero__title-brand, .hero__intro, .hero__actions > a, .hero__addresses > li')];
  const animations = items.map((item, index) => {
    const animation = item.animate([
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 650, delay: index * 120, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
    animation.pause();
    return animation;
  });

  function cleanup() {
    observer.disconnect();
    copy.removeEventListener('focusin', showImmediately);
    motion.removeEventListener('change', onMotionChange);
  }
  function showImmediately() {
    animations.forEach(animation => animation.cancel());
    cleanup();
  }
  function onMotionChange(event) {
    if (event.matches) showImmediately();
  }
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    animations.forEach(animation => animation.play());
    Promise.all(animations.map(animation => animation.finished)).then(showImmediately).catch(() => {});
  }, { threshold: 0.1 });

  // Keyboard navigation must never land on an invisible button.
  copy.addEventListener('focusin', showImmediately);
  motion.addEventListener('change', onMotionChange);
  observer.observe(copy);
}
