// Same timing, easing and movement as the first-screen reveal.
export function initCardsReveal(section, selector = '.service-tile') {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!section || motion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const cards = [...section.querySelectorAll(selector)];
  if (!cards.length) return;
  const pending = new Map();
  const active = new Set();
  let remaining = cards.length;

  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting)
      .sort((a, b) => cards.indexOf(a.target) - cards.indexOf(b.target));
    visible.forEach((entry, index) => {
      observer.unobserve(entry.target);
      const animation = pending.get(entry.target);
      if (!animation) return;
      pending.delete(entry.target);
      animation.effect.updateTiming({ delay: index * 120 });
      animation.play();
      animation.finished.then(() => {
        animation.cancel();
        active.delete(animation);
        remaining -= 1;
        if (!remaining) showImmediately();
      }).catch(() => {});
    });
  }, { threshold: 0.12 });

  function showImmediately() {
    observer.disconnect();
    active.forEach(animation => animation.cancel());
    active.clear();
    pending.clear();
    section.removeEventListener('focusin', showImmediately);
    motion.removeEventListener('change', onMotionChange);
  }
  function onMotionChange(event) {
    if (event.matches) showImmediately();
  }

  cards.forEach(card => {
    const animation = card.animate([
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 650, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
    animation.pause();
    pending.set(card, animation);
    active.add(animation);
    observer.observe(card);
  });
  section.addEventListener('focusin', showImmediately);
  motion.addEventListener('change', onMotionChange);
}
