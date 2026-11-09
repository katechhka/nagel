// Match the first-screen reveal, keeping the original text and layout after playback.
export async function initQualityReveal(section) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!section || motion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const originals = new Map();
  const animations = new Set();
  const waiting = new Map();
  let stopped = false;
  let textAnimations = [];
  let textWidth;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      waiting.get(entry.target)?.();
      waiting.delete(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

  function inView(element) {
    if (element.getBoundingClientRect().top < innerHeight * .9) return Promise.resolve();
    return new Promise(resolve => {
      waiting.set(element, resolve);
      observer.observe(element);
    });
  }

  // Measure the browser's actual wrapped lines; never hard-code desktop breaks.
  function splitLines(paragraph) {
    const text = paragraph.textContent;
    if (paragraph.childNodes.length !== 1 || paragraph.firstChild.nodeType !== Node.TEXT_NODE) return [paragraph];
    const node = paragraph.firstChild;
    const range = document.createRange();
    const starts = [0];
    let top;
    for (const match of text.matchAll(/\S+/g)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const nextTop = range.getBoundingClientRect().top;
      if (top !== undefined && Math.abs(nextTop - top) > 2) starts.push(match.index);
      top = nextTop;
    }
    originals.set(paragraph, [...paragraph.childNodes]);
    const lines = starts.map((start, index) => {
      const line = document.createElement('span');
      line.className = 'quality__reveal-line';
      line.textContent = text.slice(start, starts[index + 1] ?? text.length);
      return line;
    });
    paragraph.replaceChildren(...lines);
    return lines;
  }

  function prepare(element, delay = 0) {
    const animation = element.animate([
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 650, delay, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
    animation.pause();
    animations.add(animation);
    return animation;
  }

  function showImmediately() {
    stopped = true;
    observer.disconnect();
    waiting.forEach(resolve => resolve());
    waiting.clear();
    animations.forEach(animation => animation.cancel());
    originals.forEach((nodes, paragraph) => paragraph.replaceChildren(...nodes));
    section.removeEventListener('focusin', onFocus);
    motion.removeEventListener('change', onMotionChange);
    window.removeEventListener('resize', onResize);
  }
  function onMotionChange(event) {
    if (event.matches) showImmediately();
  }
  function onFocus(event) {
    if (event.target !== section) showImmediately();
  }
  function onResize() {
    // A resize before scrolling must not reveal the whole section. Only unwrap
    // already-measured text, leaving the photo/card visibility gates intact.
    if (textWidth === undefined || section.clientWidth === textWidth) return;
    textAnimations.forEach(animation => { animation.cancel(); animations.delete(animation); });
    originals.forEach((nodes, paragraph) => paragraph.replaceChildren(...nodes));
    originals.clear();
    textWidth = undefined;
  }
  async function play(group) {
    if (stopped) return;
    group.forEach(animation => animation.play());
    await Promise.all(group.map(animation => animation.finished.catch(() => {})));
    group.forEach(animation => { animation.cancel(); animations.delete(animation); });
  }

  try {
    const portrait = section.querySelector('.quality__portrait');
    const letter = section.querySelector('.quality__letter');
    const photoAnimation = prepare(portrait);
    const letterHold = prepare(letter);
    const cards = [...section.querySelectorAll('.quality__detail')].map(element => ({ element, animation: prepare(element) }));
    section.addEventListener('focusin', onFocus);
    motion.addEventListener('change', onMotionChange);
    window.addEventListener('resize', onResize, { passive: true });

    await inView(portrait);
    await play([photoAnimation]);
    if (stopped) return;
    await inView(letter);
    await document.fonts.ready;
    if (stopped) return;
    // Measure at the moment of appearance, using the current responsive width.
    textWidth = section.clientWidth;
    const lines = [...letter.querySelectorAll('.quality__message p')].flatMap(splitLines);
    textAnimations = lines.map((line, index) => prepare(line, index * 120));
    [letter.querySelector('.quality__signature'), letter.querySelector('.btn')].filter(Boolean)
      .forEach((element, index) => textAnimations.push(prepare(element, (lines.length + index) * 120)));
    letterHold.cancel();
    animations.delete(letterHold);
    await play(textAnimations);
    originals.forEach((nodes, paragraph) => paragraph.replaceChildren(...nodes));
    originals.clear();
    textWidth = undefined;
    for (const card of cards) {
      if (stopped) return;
      await inView(card.element);
      await play([card.animation]);
    }
    showImmediately();
  } catch {
    // Resizing, reduced motion, keyboard focus and unexpected errors reveal everything.
    showImmediately();
  }
}
