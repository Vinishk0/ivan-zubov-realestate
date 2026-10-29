// One motion vocabulary; no content is hidden before this module runs.
export const timing = Object.freeze({ quick: 180, state: 360, reveal: 850, image: 1200, stagger: 85 });
export const easing = Object.freeze({ out: 'cubic-bezier(.16,1,.3,1)', inOut: 'cubic-bezier(.65,0,.35,1)' });
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const running = new Set();
const current = new WeakMap();

export function animateElement(element, frames, options = {}) {
  if (!element) return null;
  current.get(element)?.cancel();
  if (reducedMotion.matches || !element.animate) return null;
  const animation = element.animate(frames, { duration: timing.state, easing: easing.out, ...options });
  current.set(element, animation);
  running.add(animation);
  animation.finished.then(() => running.delete(animation), () => running.delete(animation));
  return animation;
}
export async function settled(animation) {
  if (animation) await animation.finished.catch(() => {});
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) for (const animation of running) animation.finish();
});

const swaps = new WeakMap();
// Commit the newest state only, even when a visitor clicks faster than the transition.
export async function swapContent(element, update, direction = 1) {
  if (!element) return update();
  const token = {};
  swaps.set(element, token);
  await settled(animateElement(element, [
    { opacity: 1, transform: 'translateY(0)' },
    { opacity: 0, transform: `translateY(${-direction * 8}px)` }
  ], { duration: timing.quick, fill: 'forwards' }));
  if (swaps.get(element) !== token) return;
  const oldHeight = element.getBoundingClientRect().height;
  current.get(element)?.cancel();
  update();
  const newHeight = element.getBoundingClientRect().height;
  const frames = [
    { opacity: 0, transform: `translateY(${direction * 12}px)`, height: `${oldHeight}px` },
    { opacity: 1, transform: 'translateY(0)', height: `${newHeight}px` }
  ];
  await settled(animateElement(element, frames));
}

function headingLines(heading) {
  if (heading.querySelector('.motion-line')) return [...heading.querySelectorAll('.motion-line-inner')];
  // Use the author's explicit line breaks, preserving em/other inline markup.
  const parts = heading.innerHTML.split(/<br\s*\/?\s*>/i);
  heading.innerHTML = parts.map(part => `<span class="motion-line"><span class="motion-line-inner">${part}</span></span>`).join('');
  return [...heading.querySelectorAll('.motion-line-inner')];
}

function setupReveals() {
  if (!('IntersectionObserver' in window)) return;
  const effects = new WeakMap();
  const seen = new WeakSet();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || seen.has(entry.target)) continue;
      seen.add(entry.target);
      observer.unobserve(entry.target);
      const { kind, delay } = effects.get(entry.target);
      const element = entry.target;
      const options = { duration: timing.reveal, delay, fill: 'backwards' };
      if (kind === 'heading') headingLines(element).forEach((line, i) => animateElement(line,
        [{ opacity: 0, transform: 'translateY(100%)' }, { opacity: 1, transform: 'translateY(0)' }],
        { ...options, delay: i * timing.stagger }));
      else if (kind === 'image') animateElement(element,
        [{ clipPath: 'inset(10% 0 90% 0)', opacity: .4 }, { clipPath: 'inset(0% 0 0% 0)', opacity: 1 }],
        { ...options, duration: timing.image });
      else if (kind === 'line') animateElement(element,
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], options);
      else animateElement(element,
        [{ opacity: 0, transform: `translateY(${kind === 'card' ? 32 : 18}px)` }, { opacity: 1, transform: 'translateY(0)' }], options);
    }
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
  const add = (selector, kind, stagger = false) => document.querySelectorAll(selector).forEach((element, i) => {
    effects.set(element, { kind, delay: stagger ? (i % 4) * timing.stagger : 0 });
    observer.observe(element);
  });
  add('main h2', 'heading');
  add('.portrait', 'image');
  add('.case-card', 'card', true);
  add('.service-row, .metric, .reason, .faq-item', 'card', true);
  add('.section-label, .section-heading-aside, .about-copy > p, .about-copy > .eyebrow, .personal-note, .review-intro > p, .review-display, .lead-layout > div > p, .lead-form > label:not(.lead-honeypot), .lead-form > fieldset, .contact-right', 'copy');
  add('.small-rule, .note-line', 'line');
  // Keyboard navigation never waits for an entrance effect to finish.
  document.addEventListener('focusin', event => {
    for (let element = event.target; element; element = element.parentElement) {
      current.get(element)?.finish();
      if (effects.has(element)) { seen.add(element); observer.unobserve(element); }
    }
  });
}

function setupHero() {
  const hero = document.querySelector('.hero');
  const heading = hero.querySelector('h1');
  // Preserve the existing surname span used by the editorial CSS.
  const firstName = [...heading.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (firstName) {
    const word = document.createElement('span');
    word.className = 'hero-first-name'; word.textContent = firstName.textContent;
    firstName.replaceWith(word);
  }
  animateElement(hero.querySelector('.hero-media'),
    [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: 1500 });
  hero.querySelectorAll('h1 > span').forEach((word, i) => animateElement(word,
    [{ opacity: 0, transform: 'translateY(32px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 1300, delay: 180 + i * 180, fill: 'backwards' }));
  hero.querySelectorAll('.hero-pretitle, .hero-description > *, .hero-top, .hero-bottom').forEach((element, i) => animateElement(element,
    [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 900, delay: 420 + i * 90, fill: 'backwards' }));
}

function setupScroll() {
  const progress = document.createElement('div');
  progress.className = 'scroll-progress'; progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);
  const hero = document.querySelector('.hero');
  const portrait = document.querySelector('.portrait');
  const photo = portrait.querySelector('img');
  let frame = 0;
  let heroVisible = true;
  let portraitVisible = false;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target === hero) heroVisible = entry.isIntersecting;
      if (entry.target === portrait) portraitVisible = entry.isIntersecting;
    }
    schedule();
  });
  observer.observe(hero); observer.observe(portrait);
  function update() {
    frame = 0;
    if (document.hidden) return;
    const root = document.documentElement;
    const distance = root.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0})`;
    // Read rectangles first, then write only compositor transforms.
    const heroRect = heroVisible ? hero.getBoundingClientRect() : null;
    const portraitRect = portraitVisible ? portrait.getBoundingClientRect() : null;
    const enabled = !reducedMotion.matches && finePointer.matches;
    const amount = heroRect ? Math.min(1, Math.max(0, -heroRect.top / heroRect.height)) : 0;
    hero.style.setProperty('--hero-drift', enabled ? `${amount * 70}px` : '0px');
    hero.style.setProperty('--hero-fade', enabled ? String(1 - amount * .55) : '1');
    if (portraitRect) {
      const offset = ((innerHeight / 2 - (portraitRect.top + portraitRect.height / 2)) / innerHeight) * 16;
      photo.style.translate = enabled ? `0 ${Math.max(-8, Math.min(8, offset))}px` : 'none';
      photo.style.scale = enabled ? '1.025' : 'none';
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', schedule);
  finePointer.addEventListener('change', schedule);
  new ResizeObserver(schedule).observe(document.body);
  schedule();
}

function setupPointer() {
  let frame = 0;
  let active = null;
  let point = null;
  const selector = '.button, .circle-button, .case-card';
  function reset() {
    if (active) { active.style.removeProperty('--pointer-x'); active.style.removeProperty('--pointer-y'); }
    active = null; point = null;
  }
  document.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return reset();
    const element = event.target.closest(selector);
    if (element !== active) { reset(); active = element; }
    if (!active) return;
    point = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!active || !point) return;
      const rect = active.getBoundingClientRect();
      const travel = active.matches('.case-card') ? 5 : 2.5;
      active.style.setProperty('--pointer-x', `${((point.x - rect.left) / rect.width - .5) * travel * 2}px`);
      active.style.setProperty('--pointer-y', `${((point.y - rect.top) / rect.height - .5) * travel * 2}px`);
    });
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (active && !active.contains(event.relatedTarget)) reset(); });
  addEventListener('blur', reset);
  reducedMotion.addEventListener('change', reset);
  finePointer.addEventListener('change', reset);
}

function setupAccordions() {
  document.querySelectorAll('.faq-item, .approach-details').forEach(details => {
    const summary = details.querySelector('summary');
    let targetOpen = details.open;
    let animation;
    let token = 0;
    const finish = () => { details.open = targetOpen; details.style.height = ''; details.style.overflow = ''; };
    summary.addEventListener('click', async event => {
      if (reducedMotion.matches || !details.animate) return;
      event.preventDefault();
      const version = ++token;
      targetOpen = !targetOpen;
      const start = details.getBoundingClientRect().height;
      animation?.cancel();
      details.style.height = ''; details.style.overflow = 'hidden';
      details.open = true;
      const style = getComputedStyle(details);
      const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const end = targetOpen ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + borders;
      animation = animateElement(details, [{ height: `${start}px` }, { height: `${end}px` }], { duration: 420 });
      await settled(animation);
      if (version === token) finish();
    });
    details.addEventListener('toggle', () => { if (!animation || animation.playState === 'finished') targetOpen = details.open; });
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { token++; animation?.cancel(); finish(); } });
  });
}

export function initializeMotion() {
  setupHero(); setupReveals(); setupScroll(); setupPointer(); setupAccordions();
  const menu = document.querySelector('#mobile-nav');
  new MutationObserver(() => {
    if (!menu.hidden) animateElement(menu, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'translateY(0)' }]);
  }).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
}
