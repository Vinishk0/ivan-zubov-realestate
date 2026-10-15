import { content } from './content.mjs';
import './map.mjs';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const lines = (text) => escape(text).replaceAll('\n', '<br>');
const themeColors = {sand:'#eae3d7', air:'#e5e5de', sage:'#dfe4d8', rose:'#eadedb'};

function setTheme(theme) {
  if (!(theme in themeColors)) return;
  document.documentElement.dataset.theme = theme;
  $('meta[name="theme-color"]').content = themeColors[theme];
  $$('[data-set-theme]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.setTheme === theme)));
  try { localStorage.setItem('zubov-theme', theme); } catch { /* Private storage may be unavailable. */ }
}
try { setTheme(localStorage.getItem('zubov-theme') || 'sand'); } catch { setTheme('sand'); }
$$('[data-set-theme]').forEach((button) => button.addEventListener('click', () => setTheme(button.dataset.setTheme)));
const themeTrigger = $('.theme-trigger');
const themePanel = $('#theme-panel');
function closeTheme() { themePanel.hidden = true; themeTrigger.setAttribute('aria-expanded', 'false'); }
themeTrigger.addEventListener('click', () => { themePanel.hidden = !themePanel.hidden; themeTrigger.setAttribute('aria-expanded', String(!themePanel.hidden)); });
document.addEventListener('click', (event) => { if (!themePanel.contains(event.target) && !themeTrigger.contains(event.target)) closeTheme(); });

const menuToggle = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
function closeMenu() { mobileNav.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Открыть меню'); }
menuToggle.addEventListener('click', () => { mobileNav.hidden = !mobileNav.hidden; menuToggle.setAttribute('aria-expanded', String(!mobileNav.hidden)); menuToggle.setAttribute('aria-label', mobileNav.hidden ? 'Открыть меню' : 'Закрыть меню'); closeTheme(); });
$$('#mobile-nav a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeTheme(); closeMenu(); } });
window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => { if (event.matches) closeMenu(); });

// Контактные ссылки и слоган берутся из редактируемого контента.
$$('a[href="https://t.me/puxanakinul"]').forEach((link) => { link.href = content.contacts.telegram; });
$$('a[href="tel:+79851259081"]').forEach((link) => { link.href = content.contacts.phone; });
$('.contact-phone').innerHTML = `${escape(content.contacts.phoneLabel)} <span aria-hidden="true">↗</span>`;
$('#hero-tagline').textContent = content.tagline;

$('#metrics').innerHTML = content.metrics.map((metric, i) => `<div class="metric"><span class="metric-index">0${i+1}</span><strong>${escape(metric.value)}${metric.unit ? `<small>${escape(metric.unit)}</small>` : ''}</strong><span>${escape(metric.label)}</span></div>`).join('');

const dialog = $('#detail-dialog');
const dialogContent = $('#dialog-content');
function openDialog(eyebrow, html) { $('#dialog-eyebrow').textContent = eyebrow; dialogContent.innerHTML = html; closeTheme(); dialog.showModal(); document.body.classList.add('dialog-open'); }
function closeDialog() { dialog.close(); }
$('#dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(); } });
const telegramUrl = (message = '') => message ? `${content.contacts.telegram}?text=${encodeURIComponent(message)}` : content.contacts.telegram;
const contactButton = (message = '') => `<a class="button button-accent" href="${escape(telegramUrl(message))}" target="_blank" rel="noopener noreferrer">Обсудить в Telegram <span aria-hidden="true">↗</span></a>`;
$('#biography-button').addEventListener('click', () => openDialog('01 / ЗНАКОМСТВО', `<h2 id="dialog-title">${escape(content.biography.title)}</h2>${content.biography.paragraphs.map((p) => `<p>${escape(p)}</p>`).join('')}${contactButton()}`));

function renderCases() {
  $('#case-grid').innerHTML = content.cases.map((item) => `<button class="case-card" data-case="${escape(item.id)}" aria-label="Открыть кейс: ${escape(item.title.replace('\n', ' '))}"><div class="case-image"><img src="${escape(item.image)}" alt="${escape(item.alt)}" loading="lazy" width="1200" height="900"><span class="case-category">${escape(item.category)}</span></div><div class="case-info"><span class="case-place">${escape(item.place)}</span><h3>${lines(item.title)}</h3><div class="case-facts">${item.facts.map((fact) => `<span>${escape(fact)}</span>`).join('')}<span class="case-arrow" aria-hidden="true">↗</span></div></div></button>`).join('');
}
renderCases();
$('#case-grid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-case]'); if (!button) return;
  const item = content.cases.find((candidate) => candidate.id === button.dataset.case);
  const caseName = item.title.replace('\n', ' ');
  const list = (items) => `<ul class="dialog-list">${items.map((line) => `<li>${escape(line)}</li>`).join('')}</ul>`;
  const story = item.story ? `<p class="dialog-story">${escape(item.story)}</p>` : '';
  const reviewProof = item.reviewProof ? `<figure class="case-review-proof"><img src="${escape(item.reviewProof.image)}" alt="${escape(item.reviewProof.alt)}" loading="lazy" width="955" height="800"><figcaption>${escape(item.reviewProof.caption)}</figcaption></figure>` : '';
  const details = item.conditions
    ? `<h3>Задача</h3><p>${escape(item.task)}</p><h3>Исходные условия</h3>${list(item.conditions)}<h3>Сложности</h3>${list(item.challenges)}<h3>Решение</h3>${list(item.solution)}<h3>Результат</h3>${list(item.results)}`
    : `<h3>Задача</h3><p>${escape(item.task)}</p><h3>Как работали</h3><p>${escape(item.process)}</p><h3>Результат</h3><p>${escape(item.result)}</p>`;
  openDialog('02 / ИСТОРИЯ СДЕЛКИ', `<img class="dialog-image" src="${escape(item.image)}" alt="${escape(item.alt)}"><span class="eyebrow">${escape(item.place)}</span><h2 id="dialog-title">${lines(item.title)}</h2><div class="dialog-facts">${item.facts.map((fact) => `<span>${escape(fact)}</span>`).join('')}</div>${story}${reviewProof}${details}<p class="dialog-note">${escape(item.price)}</p>${contactButton(`Иван, здравствуйте! Меня заинтересовал кейс «${caseName}». Хочу обсудить похожую задачу.`)}`);
});

const lifestyleContact = $('.lifestyle-cta');
function selectLifestyle(item, activeButton) {
  $$('[data-lifestyle]').forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === activeButton)));
  $('#lifestyle-image').src = item.image; $('#lifestyle-image').alt = item.alt;
  $('#lifestyle-heading').innerHTML = lines(item.heading); $('#lifestyle-text').textContent = item.text; $('#lifestyle-detail').textContent = item.detail;
  lifestyleContact.href = telegramUrl(`Иван, здравствуйте! Меня заинтересовал образ жизни «${item.title}». Хочу обсудить подбор недвижимости под этот сценарий.`);
  lifestyleContact.setAttribute('aria-label', `Обсудить с Иваном образ жизни «${item.title}» в Telegram`);
}
$$('[data-lifestyle]').forEach((button) => button.addEventListener('click', () => {
  const item = content.lifestyles.find((candidate) => candidate.id === button.dataset.lifestyle);
  selectLifestyle(item, button);
}));
selectLifestyle(content.lifestyles[0], $('[data-lifestyle][aria-pressed="true"]'));

$('#service-grid').innerHTML = content.services.slice(0, 3).map((item, i) => `<article class="service-card"><div class="service-top"><span>0${i+1}</span><span>${escape(item.kicker)}</span><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M6 28V14l12-7 12 7v14M12 28V18l6-4 6 4v10M6 32h24"/></svg></div><h3>${lines(item.title)}</h3><p>${escape(item.text)}</p><ul>${item.items.map((line) => `<li>${escape(line)}</li>`).join('')}</ul><div class="service-bottom"><div><strong>${escape(item.price)}</strong><small>${escape(item.note)}</small></div><button class="circle-button" data-service="${i}" aria-label="Подробнее: ${escape(item.title.replace('\n', ' '))}">↗</button></div></article>`).join('');
$('#service-rows').innerHTML = content.services.slice(3).map((item, i) => `<button class="service-row" data-service="${i+3}"><span class="service-row-index">0${i+4}</span><span class="service-row-title">${escape(item.title)}<small>${escape(item.text)}</small></span><strong>${escape(item.price)}</strong><span class="service-row-arrow" aria-hidden="true">↗</span></button>`).join('');
$$('[data-service]').forEach((button) => button.addEventListener('click', () => {
  const item = content.services[Number(button.dataset.service)];
  const serviceName = item.title.replace('\n', ' ');
  openDialog('04 / УСЛУГА', `<h2 id="dialog-title">${lines(item.title)}</h2><p>${escape(item.text)}</p><ul class="dialog-list">${item.items.map((line) => `<li>${escape(line)}</li>`).join('')}</ul><div class="dialog-price">${escape(item.price)}</div><p class="dialog-note">Точный объём работы и стоимость определим после обсуждения вашей задачи.</p>${contactButton(`Иван, здравствуйте! Меня интересует услуга «${serviceName}». Хочу уточнить условия и стоимость.`)}`);
}));

let reviewIndex = 0;
function renderReview() {
  const review = content.reviews[reviewIndex];
  $('#review-quote').textContent = review.quote; $('#review-name').textContent = review.name; $('#review-topic').textContent = review.topic; $('#review-initials').textContent = review.initials; $('#review-count').textContent = `${String(reviewIndex+1).padStart(2,'0')} / ${String(content.reviews.length).padStart(2,'0')}`;
  requestAnimationFrame(fitReviewQuote);
}
function fitReviewQuote() {
  const quote = $('#review-quote');
  const mobile = window.innerWidth <= 600;
  let size = mobile ? 31 : window.innerWidth <= 900 ? 29 : 40;
  const minimum = mobile ? 18 : 21;
  quote.style.fontSize = `${size}px`;
  while (quote.scrollHeight > quote.clientHeight && size > minimum) {
    size -= 1;
    quote.style.fontSize = `${size}px`;
  }
}
renderReview();
$('#review-prev').addEventListener('click', () => { reviewIndex = (reviewIndex-1+content.reviews.length)%content.reviews.length; renderReview(); });
$('#review-next').addEventListener('click', () => { reviewIndex = (reviewIndex+1)%content.reviews.length; renderReview(); });
let reviewResizeTimer;
window.addEventListener('resize', () => { clearTimeout(reviewResizeTimer); reviewResizeTimer = setTimeout(fitReviewQuote, 100); });
const video = $('#hero-video');
async function playVideo() { try { await video.play(); } catch { /* Poster remains if the browser blocks autoplay. */ } }
playVideo();
document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else playVideo(); });

const headerObserver = new IntersectionObserver(([entry]) => { $('#header').classList.toggle('scrolled', !entry.isIntersecting); }, { rootMargin: '-80px 0px 0px 0px', threshold: 0 });
headerObserver.observe($('.hero'));
