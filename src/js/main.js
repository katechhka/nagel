import { initWorksReveal } from './works-reveal.js';
import { prices } from './prices.js';
import { initContactForm } from './contact-form.js';
import { initSalonSelect } from './salon-select.js';
import { initHeroReveal } from './hero-reveal.js';
import { initCardsReveal } from './services-reveal.js';
import { initQualityReveal } from './quality-reveal.js';

initWorksReveal(document.querySelector('#works'));
initWorksReveal(document.querySelector('#partners'), '.partners__card');

initHeroReveal(document.querySelector('[data-hero]'));
initCardsReveal(document.querySelector('#services'));
initCardsReveal(document.querySelector('#regular-care'), '.offer-card');
initQualityReveal(document.querySelector('#quality'));

document.querySelectorAll('[data-contact-form] select').forEach(initSalonSelect);

document.querySelectorAll('[data-contact-form]').forEach(initContactForm);
const mapObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    mapObserver.unobserve(entry.target);
    import('./contacts.js').then(({ initContactsMap }) => initContactsMap(entry.target));
  });
}, { rootMargin: '300px' });
document.querySelectorAll('[data-partners-map]').forEach(root => mapObserver.observe(root));

const header = document.querySelector('[data-header]');
const toggle = header.querySelector('.menu-toggle');
const navigation = header.querySelector('.site-nav');
const mobileViewport = window.matchMedia('(max-width: 1023px)');

function setMenu(open, restoreFocus = false) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  navigation.hidden = mobileViewport.matches && !open;
  if (restoreFocus) toggle.focus();
}

function syncViewport() {
  const focusWasInNavigation = navigation.contains(document.activeElement);
  toggle.hidden = !mobileViewport.matches;
  setMenu(false, mobileViewport.matches && focusWasInNavigation);
}

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  setMenu(open);
  if (open) navigation.querySelector('a').focus({ preventScroll: true });
});

header.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
    setMenu(false, true);
  }
});

navigation.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link || !mobileViewport.matches) return;
  setMenu(false);
  const target = link.hash && document.querySelector(link.hash);
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  } else {
    toggle.focus({ preventScroll: true });
  }
});

document.addEventListener('click', (event) => {
  if (mobileViewport.matches && !header.contains(event.target)) setMenu(false);
});

mobileViewport.addEventListener('change', syncViewport);
window.addEventListener('scroll', () => {
  header.classList.toggle('--scrolled', window.scrollY > 8);
}, { passive: true });

syncViewport();
header.classList.toggle('--scrolled', window.scrollY > 8);

const priceDialog = document.querySelector('#price-dialog');
const priceContent = priceDialog.querySelector('.price-dialog__content');
let priceTrigger;

document.querySelectorAll('[data-price]').forEach((button) => {
  button.addEventListener('click', () => {
    const category = prices.find((item) => item.id === button.dataset.price);
    if (!category || priceDialog.open) return;
    priceTrigger = button;
    priceDialog.querySelector('#price-title').textContent = category.title;
    priceDialog.querySelector('#price-description').textContent = category.description;
    const groups = category.groups.map((group) => {
      const section = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = group.title;
      const list = document.createElement('dl');
      group.rows.forEach(([name, value]) => {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const price = document.createElement('dd');
        term.textContent = name;
        price.textContent = `${value} ₽`;
        row.append(term, price);
        list.append(row);
      });
      section.append(title, list);
      return section;
    });
    priceDialog.querySelector('[data-price-groups]').replaceChildren(...groups);
    priceDialog.showModal();
    document.documentElement.classList.add('has-price-dialog');
    priceContent.scrollTop = 0;
  });
});

priceDialog.querySelector('.price-dialog__close').addEventListener('click', () => priceDialog.close());
priceDialog.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const controls = [...priceDialog.querySelectorAll('button, a[href], [tabindex="0"]')];
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
let backdropPress = false;
priceDialog.addEventListener('pointerdown', (event) => { backdropPress = event.target === priceDialog; });
priceDialog.addEventListener('click', (event) => {
  if (backdropPress && event.target === priceDialog) priceDialog.close();
  backdropPress = false;
});
priceDialog.addEventListener('close', () => {
  document.documentElement.classList.remove('has-price-dialog');
  priceTrigger?.focus({ preventScroll: true });
});
