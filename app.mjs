import { content } from './content.mjs';
import './map.mjs';

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

$('#metrics').innerHTML = content.metrics.map((metric, i) => `<div class="metric"><span class="metric-index">0${i+1}</span><strong>${escape(metric.value)}${metric.unit ? `<small>${escape(metric.unit)}</small>` : ''}</strong><span>${escape(metric.label)}</span></div>`).join('');

const dialog = $('#detail-dialog');
const dialogContent = $('#dialog-content');
function openDialog(eyebrow, html) { $('#dialog-eyebrow').textContent = eyebrow; dialogContent.innerHTML = html; dialog.showModal(); document.body.classList.add('dialog-open'); }
function closeDialog() { dialog.close(); }
$('#dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(); } });
const telegramUrl = (message = '') => message ? `${content.contacts.telegram}?text=${encodeURIComponent(message)}` : content.contacts.telegram;
const contactButton = (message = '') => `<a class="button button-accent" href="${escape(telegramUrl(message))}" target="_blank" rel="noopener noreferrer">Обсудить в Telegram <span aria-hidden="true">↗</span></a>`;
$('#biography-button').addEventListener('click', () => openDialog('01 / ЗНАКОМСТВО', `<h2 id="dialog-title">${escape(content.biography.title)}</h2>${content.biography.paragraphs.map((p) => `<p>${escape(p)}</p>`).join('')}${contactButton()}`));

function renderCases() {
  $('#case-grid').innerHTML = content.cases.map((item, i) => `<button class="case-card" data-case="${escape(item.id)}" aria-label="Открыть кейс: ${escape(item.title.replace('\n', ' '))}"><div class="case-image"><img src="${escape(item.image)}" alt="${escape(item.alt)}" loading="lazy" width="1200" height="900"><span class="case-category">${escape(item.category)}</span>${item.imageCaption ? '<span class="case-illustration">Иллюстрация</span>' : ''}</div><div class="case-info"><span class="case-number">0${i+1} / ${escape(item.category)}</span><span class="case-place">${escape(item.place)}</span><h3>${lines(item.title)}</h3><div class="case-facts">${item.facts.map((fact) => `<span>${escape(fact)}</span>`).join('')}<span class="case-arrow" aria-hidden="true">↗</span></div></div></button>`).join('');
}
renderCases();
$('#case-grid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-case]'); if (!button) return;
  const item = content.cases.find((candidate) => candidate.id === button.dataset.case);
  const caseName = item.title.replace('\n', ' ');
  const list = (items) => `<ul class="dialog-list">${items.map((line) => `<li>${escape(line)}</li>`).join('')}</ul>`;
  const highlight = item.highlight ? `<aside class="case-highlight"><span class="eyebrow">АЛЬТЕРНАТИВНЫЙ ПУТЬ К ДОМУ</span><p>${escape(item.highlight)}</p></aside>` : '';
  const imageCaption = item.imageCaption ? `<p class="dialog-note">${escape(item.imageCaption)}</p>` : '';
  const story = item.story ? `<p class="dialog-story">${escape(item.story)}</p>` : '';
  const reviewProof = item.reviewProof ? `<figure class="case-review-proof"><img src="${escape(item.reviewProof.image)}" alt="${escape(item.reviewProof.alt)}" loading="lazy" width="955" height="800"><figcaption>${escape(item.reviewProof.caption)}</figcaption></figure>` : '';
  const details = item.conditions
    ? `<h3>Задача</h3><p>${escape(item.task)}</p><h3>Исходные условия</h3>${list(item.conditions)}<h3>Сложности</h3>${list(item.challenges)}<h3>Решение</h3>${list(item.solution)}<h3>Результат</h3>${list(item.results)}`
    : `<h3>Задача</h3><p>${escape(item.task)}</p><h3>Как работали</h3><p>${escape(item.process)}</p><h3>Результат</h3><p>${escape(item.result)}</p>`;
  openDialog('02 / ИСТОРИЯ СДЕЛКИ', `<img class="dialog-image" src="${escape(item.image)}" alt="${escape(item.alt)}">${imageCaption}<span class="eyebrow">${escape(item.place)}</span><h2 id="dialog-title">${lines(item.title)}</h2><div class="dialog-facts">${item.facts.map((fact) => `<span>${escape(fact)}</span>`).join('')}</div>${story}${highlight}${reviewProof}${details}<p class="dialog-note">${escape(item.price)}</p>${contactButton(`Иван, здравствуйте! Меня заинтересовал кейс «${caseName}». Хочу обсудить похожую задачу.`)}`);
});

$('#service-rows').innerHTML = content.services.map((item, i) => `<button class="service-row" data-service="${i}"><span class="service-row-index">0${i+1}</span><span class="service-row-title">${escape(item.title.replace('\n',' '))}<small>${escape(item.text)}</small></span><span class="service-row-price"><strong>${escape(item.price)}</strong><small>${escape(item.note)}</small></span><span class="service-row-arrow" aria-hidden="true">↗</span></button>`).join('');
$$('[data-service]').forEach((button) => button.addEventListener('click', () => {
  const item = content.services[Number(button.dataset.service)];
  const serviceName = item.title.replace('\n', ' ');
  const details = item.details ? item.details.map((detail) => `<h3>${escape(detail.title)}</h3><p>${escape(detail.text)}</p>`).join('') : `<ul class="dialog-list">${item.items.map((line) => `<li>${escape(line)}</li>`).join('')}</ul>`;
  openDialog('03 / УСЛУГА', `<h2 id="dialog-title">${lines(item.title)}</h2>${item.headline ? `<p class="dialog-story">${escape(item.headline)}</p>` : ''}<p>${escape(item.text)}</p>${details}${item.goal ? `<p class="service-goal">${escape(item.goal)}</p>` : ''}<div class="dialog-price">${escape(item.price)}</div><p class="dialog-note">${escape(item.terms || 'Точный объём работы и стоимость определим после обсуждения вашей задачи.')}</p>${contactButton(`Иван, здравствуйте! Меня интересует услуга «${serviceName}». Хочу уточнить условия и стоимость.`)}`);
}));

let reviewIndex = 0;
function renderReview() {
  const review = content.reviews[reviewIndex];
  $('#review-quote').textContent = review.quote.length > 310 ? `${review.quote.slice(0, review.quote.lastIndexOf(' ', 310))}…` : review.quote;
  $('#review-read').innerHTML = `${review.proof ? 'Полный отзыв и оригинал' : 'Читать полностью'} <span aria-hidden="true">↗</span>`; $('#review-name').textContent = review.name; $('#review-topic').textContent = review.topic; $('#review-initials').textContent = review.initials; $('#review-count').textContent = `${String(reviewIndex+1).padStart(2,'0')} / ${String(content.reviews.length).padStart(2,'0')}`;

}
renderReview();
$('#review-prev').addEventListener('click', () => { reviewIndex = (reviewIndex-1+content.reviews.length)%content.reviews.length; renderReview(); });
$('#review-next').addEventListener('click', () => { reviewIndex = (reviewIndex+1)%content.reviews.length; renderReview(); });
$('#review-read').addEventListener('click', () => {
  const review = content.reviews[reviewIndex];
  openDialog('ОТЗЫВ КЛИЕНТА', `<h2 id="dialog-title">${escape(review.name)}</h2><p class="dialog-note">${escape(review.topic)}</p><p class="full-review">${escape(review.quote)}</p>${review.proof ? `<figure class="review-proof"><img src="${escape(review.proof)}" alt="Оригинал отзыва: ${escape(review.name)}, ${escape(review.topic)}" loading="lazy"><figcaption>Скриншот отзыва, предоставленный Иваном.</figcaption></figure>` : ''}`);
});
$('#reasons-grid').innerHTML = content.reasons.map((item, index) => `<article class="reason"><span class="eyebrow">0${index + 1}</span><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></article>`).join('');
$('#faq-list').innerHTML = content.faq.map((item) => `<details class="faq-item"><summary>${escape(item.question)}<span aria-hidden="true">+</span></summary><div class="faq-answer"><p>${escape(item.answer)}</p>${item.steps ? `<ol>${item.steps.map((step) => `<li>${escape(step)}</li>`).join('')}</ol>` : ''}</div></details>`).join('');
const slides = $$('.hero-slide');
const slideshowToggle = $('#slideshow-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let slideshowPaused = reducedMotion.matches;
let slideIndex = 0;
let slideTimer;
function syncSlideshow() {
  clearInterval(slideTimer);
  $('.hero-slideshow').classList.toggle('is-paused', slideshowPaused || document.hidden);
  slideshowToggle.setAttribute('aria-pressed', String(slideshowPaused));
  slideshowToggle.setAttribute('aria-label', slideshowPaused ? 'Продолжить слайдшоу' : 'Приостановить слайдшоу');
  slideshowToggle.innerHTML = slideshowPaused ? 'Смотреть <span aria-hidden="true">▷</span>' : 'Пауза <span aria-hidden="true">Ⅱ</span>';
  if (!slideshowPaused && !document.hidden) slideTimer = setInterval(() => {
    const next = (slideIndex + 1) % slides.length;
    if (!slides[next].complete || !slides[next].naturalWidth) return;
    slides[slideIndex].classList.remove('is-active');
    slideIndex = next;
    slides[slideIndex].classList.add('is-active');
    $('#slide-count').textContent = `${String(slideIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  }, 6500);
}
slideshowToggle.addEventListener('click', () => { slideshowPaused = !slideshowPaused; syncSlideshow(); });
reducedMotion.addEventListener('change', (event) => { slideshowPaused = event.matches; syncSlideshow(); });
document.addEventListener('visibilitychange', syncSlideshow);
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
  status.textContent = 'Отправляем заявку…';
  const fields = Object.fromEntries(new FormData(leadForm));
  try {
    const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, requestId: leadRequestId }), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Не удалось отправить заявку. Попробуйте ещё раз или напишите Ивану в Telegram.');
    status.textContent = 'Заявка доставлена Ивану. Он свяжется с вами по указанному контакту.';
    leadForm.reset();
    $('#budget-label').textContent = 'Бюджет покупки, ₽';
    leadRequestId = crypto.randomUUID();
  } catch (error) {
    status.textContent = error.name === 'TimeoutError' ? 'Подтверждение не получено. Повторите отправку или напишите Ивану в Telegram.' : error.message;
  } finally { button.disabled = false; }
});

const headerObserver = new IntersectionObserver(([entry]) => { $('#header').classList.toggle('scrolled', !entry.isIntersecting); }, { rootMargin: '-80px 0px 0px 0px', threshold: 0 });
headerObserver.observe($('.hero'));
