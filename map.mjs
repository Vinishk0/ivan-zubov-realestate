import { content } from './content.mjs';
import './assets/vendor/leaflet.js';
import { animateElement, swapContent, reducedMotion } from './motion.mjs';

const board = document.querySelector('#map-board');
const cursor = document.querySelector('#map-cursor');
const status = document.querySelector('#map-status');
const okrugs = new Map(content.okrugs.map(okrug => [okrug.id, okrug]));
const layers = new Map();
const pins = new Map();
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
let map;
let allBounds;
let selectedId = 'cao';

function styleOkrugs() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  for (const [id, layer] of layers) {
    const selected = id === selectedId;
    layer.setStyle({color:accent, fillColor:accent, weight:selected?2.5:1.2, opacity:selected?1:.65, fillOpacity:selected?.16:.035});
    if (selected) layer.bringToFront();
  }
  for (const [id, button] of pins) button.setAttribute('aria-pressed', String(id === selectedId));
}

function selectOkrug(id, focusMap = true) {
  const okrug = okrugs.get(id);
  if (!okrug) return;
  const changed = selectedId !== id;
  selectedId = id;
  const updateCard = () => {
  document.querySelector('#district-kicker').textContent = `МОСКВА / ${okrug.code}`;
  document.querySelector('#district-name').textContent = okrug.name;
  document.querySelector('#okrug-summary').textContent = `${okrug.districtCount} ${okrug.districtCount === 4 ? 'района' : 'районов'} · административный округ`;
  document.querySelector('#district-description').textContent = okrug.description;
  const photo = document.querySelector('#district-image');
  photo.src = okrug.image;
  photo.alt = okrug.photoCaption;
  photo.style.objectPosition = okrug.photoPosition || '50% 50%';
  document.querySelector('#district-photo-caption').textContent = okrug.photoCaption;
  document.querySelector('#district-priorities').innerHTML = okrug.priorities.map(priority => `<span>${escape(priority)}</span>`).join('');
  const contact = document.querySelector('#district-contact');
  contact.setAttribute('aria-label', `Обсудить ${okrug.officialName} с Иваном в Telegram`);
  contact.href = `${content.contacts.telegram}?text=${encodeURIComponent(`Иван, здравствуйте! Меня интересует ${okrug.officialName} (${okrug.code}). Хочу обсудить подбор недвижимости.`)}`;
  const revealPhoto = () => {
    if (selectedId !== id) return;
    animateElement(photo, [{ opacity: .4, transform: 'scale(1.035)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 650 });
  };
  if (changed) photo.decode().then(revealPhoto).catch(() => {});
  };
  if (changed) swapContent(document.querySelector('.district-copy'), updateCard);
  else updateCard();
  styleOkrugs();
  const layer = layers.get(id);
  if (map && layer && focusMap) map.fitBounds(layer.getBounds(), {padding:[42,55], maxZoom:12, animate:false});
}
selectOkrug(selectedId, false);

async function initializeMap() {
  const response = await fetch('assets/districts/okrugs.geojson');
  if (!response.ok) throw new Error('Okrug boundaries unavailable');
  const boundaries = await response.json();
  const L = window.L;
  map = L.map('city-map', {scrollWheelZoom:false, zoomControl:false, minZoom:7, maxZoom:18, attributionControl:true, zoomSnap:1, zoomAnimation:false, markerZoomAnimation:false});
  L.control.zoom({position:'topright', zoomInTitle:'Приблизить карту', zoomOutTitle:'Отдалить карту'}).addTo(map);
  map.attributionControl.setPrefix(false);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(map);
  let loadedTile = false;
  tiles.on('tileload', () => {loadedTile = true; status.hidden = true;});
  tiles.on('tileerror', () => {if (!loadedTile) status.textContent = 'Подложка карты недоступна. Границы округов и информация доступны.';});
  const geometry = L.geoJSON(boundaries, {onEachFeature(feature, layer) {
    layers.set(feature.properties.id, layer);
    layer.on('click', () => selectOkrug(feature.properties.id));
  }}).addTo(map);
  allBounds = geometry.getBounds();
  map.on('zoomend', () => board.classList.toggle('map-overview', map.getZoom() < 10));
  map.fitBounds([[55.64,37.38],[55.9,37.84]], {padding:[20,20], animate:false});
  for (const okrug of content.okrugs) {
    const icon = L.divIcon({className:'district-marker-host', iconSize:[1,1], iconAnchor:[0,0], html:`<button class="map-pin" data-okrug="${okrug.id}" aria-label="Выбрать ${escape(okrug.officialName)}" aria-pressed="false"><span class="pin-dot" aria-hidden="true"></span><span class="pin-label">${escape(okrug.code)}</span></button>`});
    const marker = L.marker(okrug.coordinates, {icon, keyboard:false, interactive:false}).addTo(map);
    const button = marker.getElement().querySelector('button');
    L.DomEvent.disableClickPropagation(button);
    button.addEventListener('click', () => selectOkrug(okrug.id));
    button.addEventListener('focus', () => map.panInside(okrug.coordinates, {padding:[60,60], animate:false}));
    pins.set(okrug.id, button);
  }
  selectOkrug(selectedId, false);
  document.querySelector('#map-reset').addEventListener('click', () => map.fitBounds(allBounds, {padding:[35,45], animate:false}));
  new ResizeObserver(() => map.invalidateSize({pan:false})).observe(board);
  new MutationObserver(styleOkrugs).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
}
initializeMap().catch(error => {
  console.error('Map initialization failed:', error);
  status.textContent = 'Не удалось загрузить карту. Обновите страницу, чтобы выбрать округ.';
});

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
board.addEventListener('pointermove', event => {
  if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch' || event.target.closest('.leaflet-control,.map-toolbar')) {cursor.classList.remove('visible'); return;}
  const rect = board.getBoundingClientRect();
  const half = cursor.offsetWidth / 2;
  cursor.style.transform = `translate(${event.clientX-rect.left-half}px, ${event.clientY-rect.top-half}px)`;
  cursor.classList.add('visible');
});
board.addEventListener('pointerleave', () => cursor.classList.remove('visible'));
board.addEventListener('focusin', () => cursor.classList.remove('visible'));

reducedMotion.addEventListener('change', () => cursor.classList.remove('visible'));
