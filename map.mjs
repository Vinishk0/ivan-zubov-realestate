import { content } from './content.mjs';

const section = document.querySelector('#moscow');
const board = document.querySelector('#map-board');
const cursor = document.querySelector('#map-cursor');
const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

document.querySelector('#map-pins').innerHTML = content.districts.map(district => `<button class="map-pin" data-district="${district.id}" style="--pin-x:${district.x}%;--pin-y:${district.y}%" aria-label="Выбрать район ${escape(district.name)}" aria-pressed="false"><span class="pin-dot" aria-hidden="true"></span><span class="pin-label">${escape(district.name)}</span></button>`).join('');
document.querySelector('#district-options').innerHTML = content.districts.map((district, i) => `<button data-district="${district.id}" aria-pressed="false"><span>0${i+1}</span>${escape(district.name)}</button>`).join('');

function selectDistrict(id) {
  const district = content.districts.find(item => item.id === id);
  if (!district) return;
  section.querySelectorAll('[data-district]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.district === id)));
  document.querySelector('#district-kicker').textContent = `МОСКВА / ${String(content.districts.indexOf(district)+1).padStart(2,'0')}`;
  document.querySelector('#district-name').textContent = district.name;
  document.querySelector('#district-description').textContent = district.description;
  document.querySelector('#district-image').src = district.image;
  document.querySelector('#district-priorities').innerHTML = district.priorities.map(priority => `<span>${escape(priority)}</span>`).join('');
  const contact = document.querySelector('#district-contact');
  contact.href = content.contacts.telegram;
  contact.setAttribute('aria-label', `Обсудить район «${district.name}» с Иваном в Telegram`);
  // Telegram opens the chat with an editable draft; nothing is sent automatically.
  contact.href = `${content.contacts.telegram}?text=${encodeURIComponent(`Иван, здравствуйте! Меня интересует район «${district.name}». Хочу обсудить подбор недвижимости.`)}`;
}
selectDistrict(content.districts[0].id);
section.addEventListener('click', event => {
  const button = event.target.closest('[data-district]');
  if (button) selectDistrict(button.dataset.district);
});

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
board.addEventListener('pointermove', event => {
  if (!finePointer.matches || event.pointerType === 'touch') return;
  const rect = board.getBoundingClientRect();
  const half = cursor.offsetWidth / 2;
  const x = Math.max(half+8, Math.min(rect.width-half-8, event.clientX-rect.left));
  const y = Math.max(half+8, Math.min(rect.height-half-8, event.clientY-rect.top));
  cursor.style.transform = `translate(${x-half}px, ${y-half}px)`;
  const pin = event.target.closest('[data-district]');
  document.querySelector('#map-cursor-text').innerHTML = pin ? 'Узнать<br>район' : 'Найдём<br>ваш адрес';
  cursor.classList.add('visible');
});
board.addEventListener('pointerleave', () => cursor.classList.remove('visible'));
board.addEventListener('focusin', () => cursor.classList.remove('visible'));
