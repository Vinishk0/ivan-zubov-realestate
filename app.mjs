import { content } from './content.mjs';
import './map.mjs';
import { initializeMotion, animateElement, settled, swapContent, timing } from './motion.mjs';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const lines = (text) => escape(text).replaceAll('\n', '<br>');
const menuToggle = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
function closeMenu() { mobileNav.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Открыть меню'); }
menuToggle.addEventListener('click', () => { mobileNav.hidden = !mobileNav.hidden; menuToggle.setAttribute('aria-expanded', String(!mobileNav.hidden)); menuToggle.setAttribute('aria-label', mobileNav.hidden ? 'Открыть меню' : 'Закрыть меню'); });
$$('#mobile-nav a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeMenu(); } });
window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => { if (event.matches) closeMenu(); });

// Контактные ссылки берутся из редактируемого контента.
$$('a[href="https://t.me/puxanakinul"]').forEach((link) => { link.href = content.contacts.telegram; });
$$('a[href="tel:+79851259081"]').forEach((link) => { link.href = content.contacts.phone; });
$('.contact-phone').innerHTML = `${escape(content.contacts.phoneLabel)} <span aria-hidden="true">↗</span>`;

const [experience, ...deals] = content.metrics;
$('#metrics').innerHTML = `<div class="metric metric-experience"><strong>${escape(experience.value)} <small>года</small></strong><span>работы с недвижимостью</span></div><div class="metrics-deals">${deals.map(metric => `<div class="metric"><strong>${escape(metric.value)}</strong><span>${escape(metric.label)}</span></div>`).join('')}</div>`;

const dialog = $('#detail-dialog');
const dialogContent = $('#dialog-content');
let dialogVersion = 0;
function openDialog(eyebrow, html) {
  dialogVersion++;
  $('#dialog-eyebrow').textContent = eyebrow;
  dialogContent.innerHTML = html;
  dialog.showModal(); dialog.scrollTop = 0;
  document.body.classList.add('dialog-open');
  animateElement(dialog, [{ opacity: 0, transform: 'translateY(20px) scale(.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 500 });
  [...dialogContent.children].slice(0, 5).forEach((element, i) => animateElement(element,
    [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 550, delay: 70 + i * 45, fill: 'backwards' }));
}
async function closeDialog() {
  if (!dialog.open) return;
  const version = ++dialogVersion;
  await settled(animateElement(dialog, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(12px)' }], { duration: timing.quick }));
  if (version === dialogVersion) dialog.close();
}
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
$('#dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(); } });
const telegramUrl = (message = '') => message ? `${content.contacts.telegram}?text=${encodeURIComponent(message)}` : content.contacts.telegram;
const contactButton = (message = '') => `<a class="button button-accent" href="${escape(telegramUrl(message))}" target="_blank" rel="noopener noreferrer">Обсудить в Telegram <span aria-hidden="true">↗</span></a>`;
$('#biography-button').addEventListener('click', () => openDialog('01 / ЗНАКОМСТВО', `<h2 id="dialog-title">${escape(content.biography.title)}</h2>${content.biography.paragraphs.map((p) => `<p>${escape(p)}</p>`).join('')}${contactButton()}`));

function renderCases() {
  $('#case-grid').innerHTML = content.cases.map((item, i) => `<button class="case-card" data-case="${escape(item.id)}" aria-label="Открыть кейс: ${escape(item.title.replace('\n', ' '))}"><div class="case-image"><img src="${escape(item.image)}" alt="${escape(item.alt)}" loading="lazy" width="1200" height="900"><span class="case-category">${escape(item.category)}</span>${item.imageCaption ? '<span class="case-illustration">Иллюстрация</span>' : ''}</div><div class="case-info"><span class="case-number">${escape(item.category)}</span><span class="case-place">${escape(item.place)}</span><h3>${lines(item.title)}</h3><div class="case-facts">${item.facts.map((fact) => `<span>${escape(fact)}</span>`).join('')}<span class="case-arrow" aria-hidden="true">↗</span></div></div></button>`).join('');
}
renderCases();
const caseTrack = $('#case-grid');
const casePrev = $('#case-prev');
const caseNext = $('#case-next');
let caseScrollFrame;
function caseCapacity() { return matchMedia('(max-width: 700px)').matches ? 1 : 2; }
function syncCaseControls() {
  const cards = $$('.case-card');
  const width = cards[0].getBoundingClientRect().width;
  const step = width + parseFloat(getComputedStyle(caseTrack).gap);
  const first = Math.min(cards.length - caseCapacity(), Math.max(0, Math.round(caseTrack.scrollLeft / step)));
  casePrev.disabled = first === 0;
  caseNext.disabled = first + caseCapacity() >= cards.length;
  $('#case-count').textContent = `${first + 1}${caseCapacity() === 2 ? '–' + (first + 2) : ''} / ${cards.length}`;
}
function moveCases(direction) {
  const step = $('.case-card').getBoundingClientRect().width + parseFloat(getComputedStyle(caseTrack).gap);
  const first = Math.round(caseTrack.scrollLeft / step);
  caseTrack.scrollTo({ left: (first + direction * caseCapacity()) * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
casePrev.addEventListener('click', () => moveCases(-1));
caseNext.addEventListener('click', () => moveCases(1));
caseTrack.addEventListener('scroll', () => {
  cancelAnimationFrame(caseScrollFrame);
  caseScrollFrame = requestAnimationFrame(syncCaseControls);
}, { passive: true });
caseTrack.addEventListener('keydown', event => {
  if (event.target !== caseTrack || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault(); moveCases(event.key === 'ArrowRight' ? 1 : -1);
});
new ResizeObserver(syncCaseControls).observe(caseTrack);
syncCaseControls();
$('#case-grid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-case]'); if (!button) return;
  const item = content.cases.find((candidate) => candidate.id === button.dataset.case);
  const caseName = (item.detailTitle || item.title).replace('\n', ' ');
  const list = (items) => `<ul class="dialog-list">${items.map((line) => `<li>${escape(line)}</li>`).join('')}</ul>`;
  const highlight = item.highlight ? `<aside class="case-highlight"><span class="eyebrow">АЛЬТЕРНАТИВНЫЙ ПУТЬ К ДОМУ</span><p>${escape(item.highlight)}</p></aside>` : '';
  const imageCaption = item.imageCaption ? `<p class="dialog-note">${escape(item.imageCaption)}</p>` : '';
  const story = item.story ? `<p class="dialog-story">${escape(item.story)}</p>` : '';
  const details = item.conditions
    ? `<h3>Задача</h3><p>${escape(item.task)}</p><h3>Исходные условия</h3>${list(item.conditions)}<h3>Сложности</h3>${list(item.challenges)}<h3>Решение</h3>${list(item.solution)}<h3>Результат</h3>${list(item.results)}`
    : `<h3>Задача</h3><p>${escape(item.task)}</p><h3>Как работали</h3><p>${escape(item.process)}</p><h3>Результат</h3><p>${escape(item.result)}</p>`;
  openDialog('02 / КЕЙС СДЕЛКИ', `<img class="dialog-image" src="${escape(item.image)}" alt="${escape(item.alt)}">${imageCaption}<span class="eyebrow">${escape(item.place)}</span><h2 id="dialog-title">${lines(item.detailTitle || item.title)}</h2><div class="dialog-facts">${item.facts.map((fact) => `<span>${escape(fact)}</span>`).join('')}</div>${story}${highlight}${details}${item.takeaway ? `<h3>Почему это важно для моих клиентов</h3><p>${escape(item.takeaway)}</p>` : ''}<p class="dialog-note">${escape(item.price)}</p>${contactButton(`Иван, здравствуйте! Меня заинтересовал кейс «${caseName}». Хочу обсудить похожую задачу.`)}`);
});

$('#service-rows').innerHTML = content.services.map((item, i) => `<button class="service-row" data-service="${i}"><span class="service-row-index">0${i+1}</span><span class="service-row-title">${escape(item.title.replace('\n',' '))}<small>${escape(item.text)}</small></span><span class="service-row-price"><strong>${escape(item.price)}</strong><small>${escape(item.note)}</small></span><span class="service-row-arrow" aria-hidden="true">↗</span></button>`).join('');
$$('[data-service]').forEach((button) => button.addEventListener('click', () => {
  const item = content.services[Number(button.dataset.service)];
  const serviceName = item.title.replace('\n', ' ');
  const details = item.details ? item.details.map((detail) => `<h3>${escape(detail.title)}</h3><p>${escape(detail.text)}</p>`).join('') : `<ul class="dialog-list">${item.items.map((line) => `<li>${escape(line)}</li>`).join('')}</ul>`;
  openDialog('03 / УСЛУГА', `<h2 id="dialog-title">${lines(item.title)}</h2>${item.headline ? `<p class="dialog-story">${escape(item.headline)}</p>` : ''}<p>${escape(item.text)}</p>${details}${item.goal ? `<p class="service-goal">${escape(item.goal)}</p>` : ''}<div class="dialog-price">${escape(item.price)}</div><p class="dialog-note">${escape(item.terms || 'Точный объём работы и стоимость определим после обсуждения вашей задачи.')}</p>${contactButton(`Иван, здравствуйте! Меня интересует услуга «${serviceName}». Хочу уточнить условия и стоимость.`)}`);
}));

let reviewIndex = 0;
let displayedReviewIndex = 0;
let reviewExcerpts = [];
const reviewFrame = $('.review-text-frame');
function excerpt(text, limit) {
  if (text.length <= limit) return text;
  const end = text.lastIndexOf(' ', limit);
  return text.slice(0, end > 0 ? end : limit).replace(/[.,;:!?]+$/, '') + '…';
}
function renderReview() {
  displayedReviewIndex = reviewIndex;
  const review = content.reviews[reviewIndex];
  $('#review-quote').textContent = reviewExcerpts[reviewIndex] || excerpt(review.quote, 240);
  $('#review-topic').textContent = review.topic;
  $('#review-count').textContent = `${reviewIndex + 1} / ${content.reviews.length}`;
}
function sizeReviewFrame() {
  const limit = reviewFrame.clientWidth < 600 ? 160 : 240;
  reviewExcerpts = content.reviews.map(review => excerpt(review.quote, limit));
  const measure = document.createElement('blockquote');
  measure.className = 'review-measure';
  measure.setAttribute('aria-hidden', 'true');
  reviewFrame.append(measure);
  let height = 0;
  for (const text of reviewExcerpts) {
    measure.textContent = text;
    height = Math.max(height, measure.getBoundingClientRect().height);
  }
  measure.remove();
  reviewFrame.style.height = Math.ceil(height) + 'px';
  $('#review-quote').textContent = reviewExcerpts[displayedReviewIndex];
}
renderReview();
document.fonts.ready.then(sizeReviewFrame);
let reviewWidth = 0;
new ResizeObserver(entries => {
  const width = Math.round(entries[0].contentRect.width);
  if (width !== reviewWidth) { reviewWidth = width; sizeReviewFrame(); }
}).observe(reviewFrame);
function changeReview(direction) {
  reviewIndex = (reviewIndex + direction + content.reviews.length) % content.reviews.length;
  swapContent($('#review-quote'), renderReview, direction, { resize: false });
}
$('#review-prev').addEventListener('click', () => changeReview(-1));
$('#review-next').addEventListener('click', () => changeReview(1));
$('#review-read').addEventListener('click', () => {
  const review = content.reviews[displayedReviewIndex];
  openDialog('ОТЗЫВ О РАБОТЕ', `<h2 id="dialog-title">Отзыв клиента</h2><p class="dialog-note">${escape(review.topic)}</p><p class="full-review">${escape(review.quote)}</p>${review.proof ? `<figure class="review-proof"><img src="${escape(review.proof)}" alt="Оригинал отзыва о работе Ивана Зубова" loading="lazy"></figure>` : ''}`);
});
$('#reasons-grid').innerHTML = content.reasons.map((item, index) => `<article class="reason"><span class="eyebrow">0${index + 1}</span><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></article>`).join('');
$('#faq-list').innerHTML = content.faq.map((item) => `<details class="faq-item"><summary>${escape(item.question)}<span aria-hidden="true">+</span></summary><div class="faq-answer"><p>${escape(item.answer)}</p>${item.steps ? `<ol>${item.steps.map((step) => `<li>${escape(step)}</li>`).join('')}</ol>` : ''}</div></details>`).join('');
const slides = $$('.hero-slide');
const slideshowToggle = $('#slideshow-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let slideshowPaused = reducedMotion.matches;
let slideIndex = 0;
let slideTimer;
let slideshowVisible = true;
function syncSlideshow() {
  clearInterval(slideTimer);
  $('.hero-slideshow').classList.toggle('is-paused', slideshowPaused || document.hidden || !slideshowVisible);
  slideshowToggle.setAttribute('aria-pressed', String(slideshowPaused));
  slideshowToggle.setAttribute('aria-label', slideshowPaused ? 'Продолжить слайдшоу' : 'Приостановить слайдшоу');
  slideshowToggle.innerHTML = slideshowPaused ? '<span aria-hidden="true">▷</span>' : '<span aria-hidden="true">Ⅱ</span>';
  if (!slideshowPaused && !document.hidden && slideshowVisible) slideTimer = setInterval(() => {
    const next = (slideIndex + 1) % slides.length;
    if (!slides[next].complete || !slides[next].naturalWidth) return;
    slides[slideIndex].classList.remove('is-active');
    slideIndex = next;
    slides[slideIndex].classList.add('is-active');
  }, 6500);
}
slideshowToggle.addEventListener('click', () => { slideshowPaused = !slideshowPaused; syncSlideshow(); });
reducedMotion.addEventListener('change', (event) => { slideshowPaused = event.matches; syncSlideshow(); });
document.addEventListener('visibilitychange', syncSlideshow);
new IntersectionObserver(([entry]) => { slideshowVisible = entry.isIntersecting; syncSlideshow(); }).observe($('.hero'));
syncSlideshow();

const leadForm = $('#lead-form');
$('#contacts').before($('#request'));
$('.hero-description .button').href = '#request';
$('.hero-description .button').removeAttribute('target');
$('.hero-description .button').removeAttribute('rel');
let leadRequestId = crypto.randomUUID();
leadForm.addEventListener('change', () => {
  $('#budget-label').textContent = leadForm.elements.intent.value === 'sell' ? 'Желаемая стоимость продажи, ₽' : 'Бюджет покупки, ₽';
});
leadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!leadForm.reportValidity()) return;
  const button = leadForm.querySelector('[type="submit"]');
  if (button.disabled) return;
  const status = $('#lead-status');
  button.disabled = true;
  leadForm.dataset.state = 'sending';
  leadForm.setAttribute('aria-busy', 'true');
  status.textContent = 'Отправляем заявку…';
  const fields = Object.fromEntries(new FormData(leadForm));
  try {
    const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, requestId: leadRequestId }), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Не удалось отправить заявку. Попробуйте ещё раз или напишите Ивану в Telegram.');
    leadForm.dataset.state = 'success';
    status.textContent = 'Заявка доставлена Ивану. Он свяжется с вами по указанному контакту.';
    leadForm.reset();
    $('#budget-label').textContent = 'Бюджет покупки, ₽';
    leadRequestId = crypto.randomUUID();
  } catch (error) {
    leadForm.dataset.state = 'error';
    status.textContent = error.name === 'TimeoutError' ? 'Подтверждение не получено. Повторите отправку или напишите Ивану в Telegram.' : error.message;
  } finally {
    button.disabled = false;
    leadForm.removeAttribute('aria-busy');
    animateElement(status, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }]);
  }
});

const headerObserver = new IntersectionObserver(([entry]) => { $('#header').classList.toggle('scrolled', !entry.isIntersecting); }, { rootMargin: '-80px 0px 0px 0px', threshold: 0 });
headerObserver.observe($('.hero'));

const themeSelect = $('#theme-select');
try {
  const savedTheme = localStorage.getItem('ivan-theme');
  if (['sand', 'air', 'sage', 'rose'].includes(savedTheme)) document.documentElement.dataset.theme = savedTheme;
} catch { /* Storage may be disabled; theme selection still works. */ }
themeSelect.value = document.documentElement.dataset.theme || 'sand';
themeSelect.addEventListener('change', () => {
  document.documentElement.dataset.theme = themeSelect.value;
  try { localStorage.setItem('ivan-theme', themeSelect.value); } catch { /* Optional preference. */ }
});
initializeMotion();
