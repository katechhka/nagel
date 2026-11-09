// Shared, slower shuffled reveal for the gallery and partner logos.
export function initWorksReveal(section, selector = '.works__photo') {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!section || motion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const cards = [...section.querySelectorAll(selector)];
  const pending = new Map();
  const active = new Set();
  let remaining = cards.length;

  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting);
    // Fisher–Yates keeps the order random without changing the visual grid.
    for (let i = visible.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [visible[i], visible[j]] = [visible[j], visible[i]];
    }
    visible.forEach((entry, index) => {
      observer.unobserve(entry.target);
      const animation = pending.get(entry.target);
      if (!animation) return;
      pending.delete(entry.target);
      animation.effect.updateTiming({ delay: index * 180 });
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
    const baseTransform = getComputedStyle(card).transform;
    const restingTransform = baseTransform === 'none' ? '' : baseTransform;
    const animation = card.animate([
      { opacity: 0, transform: `${restingTransform} translateY(20px)` },
      { opacity: 1, transform: `${restingTransform} translateY(0)` },
    ], { duration: 1100, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
    animation.pause();
    pending.set(card, animation);
    active.add(animation);
    observer.observe(card);
  });
  section.addEventListener('focusin', showImmediately);
  motion.addEventListener('change', onMotionChange);
}
