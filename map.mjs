import { content } from './content.mjs';
import './assets/vendor/leaflet.js';

const section = document.querySelector('#moscow');
const board = document.querySelector('#map-board');
const cursor = document.querySelector('#map-cursor');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const districtLayers = new Map();
let map;
let allBounds;
let selectedId = content.districts[0].id;

document.querySelector('#district-options').innerHTML = content.districts.map((district, i) => `<button data-district="${district.id}" aria-pressed="false"><span>0${i+1}</span>${escape(district.name)}</button>`).join('');

function styleDistricts() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  for (const [id, layer] of districtLayers) {
    const selected = id === selectedId;
    layer.setStyle({color:accent,fillColor:accent,weight:selected?2.5:1.4,opacity:selected?1:0.65,fillOpacity:selected?0.18:0.045});
    if (selected) layer.bringToFront();
  }
}

function selectDistrict(id, focusMap = true) {
  const district = content.districts.find(item => item.id === id);
  if (!district) return;
  selectedId = id;
  section.querySelectorAll('[data-district]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.district === id)));
  document.querySelector('#district-kicker').textContent = `МОСКВА / ${String(content.districts.indexOf(district)+1).padStart(2,'0')}`;
  document.querySelector('#district-name').textContent = district.name;
  document.querySelector('#district-description').textContent = district.description;
  const photo = document.querySelector('#district-image');
  photo.src = district.image;
  photo.alt = district.photoCaption;
  photo.style.objectPosition = district.photoPosition || '50% 50%';
  document.querySelector('#district-photo-caption').textContent = district.photoCaption;
  document.querySelector('#district-photo-credit').innerHTML = `<a href="${escape(district.photoSource)}" target="_blank" rel="noopener noreferrer">Фото: ${escape(district.photoAuthor)} ↗</a> · <a href="${escape(district.photoLicenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(district.photoLicense)}</a>`;
  document.querySelector('#district-priorities').innerHTML = district.priorities.map(priority => `<span>${escape(priority)}</span>`).join('');
  const contact = document.querySelector('#district-contact');
  contact.setAttribute('aria-label', `Обсудить район «${district.name}» с Иваном в Telegram`);
  contact.href = `${content.contacts.telegram}?text=${encodeURIComponent(`Иван, здравствуйте! Меня интересует район «${district.name}». Хочу обсудить подбор недвижимости.`)}`;
  styleDistricts();
  const layer = districtLayers.get(id);
  if (map && layer && focusMap) map.fitBounds(layer.getBounds(), {padding:[42,42],maxZoom:13,animate:false});
}
selectDistrict(selectedId, false);
section.addEventListener('click', event => {
  const button = event.target.closest('[data-district]');
  if (button) selectDistrict(button.dataset.district);
});

async function initializeMap() {
  const response = await fetch('assets/districts/boundaries.geojson');
  if (!response.ok) throw new Error('District boundaries unavailable');
  const boundaries = await response.json();
  const L = window.L;
  map = L.map('city-map', {scrollWheelZoom:false,zoomControl:false,minZoom:9,maxZoom:18,attributionControl:true,zoomSnap:0.25,zoomAnimation:false,markerZoomAnimation:false});
  L.control.zoom({position:'topright',zoomInTitle:'Приблизить карту',zoomOutTitle:'Отдалить карту'}).addTo(map);
  map.attributionControl.setPrefix(false);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
  }).addTo(map);
  let loadedTile = false;
  tiles.on('tileload', () => { loadedTile = true; document.querySelector('#map-status').hidden = true; });
  tiles.on('tileerror', () => { if (!loadedTile) document.querySelector('#map-status').textContent = 'Подложка карты недоступна. Границы районов и фотографии доступны.'; });
  const geometry = L.geoJSON(boundaries, {onEachFeature(feature, layer) {
    districtLayers.set(feature.properties.id, layer);
    layer.on('click', () => selectDistrict(feature.properties.id));
  }}).addTo(map);
  allBounds = geometry.getBounds();
  map.fitBounds(allBounds, {padding:[35,45],animate:false});
  for (const district of content.districts) {
    const icon = L.divIcon({className:'district-marker-host',iconSize:[1,1],iconAnchor:[0,0],html:`<button class="map-pin" data-district="${district.id}" aria-label="Выбрать район ${escape(district.name)}" aria-pressed="false"><span class="pin-dot" aria-hidden="true"></span><span class="pin-label">${escape(district.name)}</span></button>`});
    const marker = L.marker(district.coordinates, {icon,keyboard:false,interactive:false}).addTo(map);
    const button = marker.getElement().querySelector('button');
    L.DomEvent.disableClickPropagation(button);
    button.addEventListener('click', () => selectDistrict(district.id));
  }
  selectDistrict(selectedId, false);
  document.querySelector('#map-reset').addEventListener('click', () => map.fitBounds(allBounds, {padding:[35,45],animate:false}));
  new ResizeObserver(() => map.invalidateSize({pan:false})).observe(board);
  new MutationObserver(styleDistricts).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}
initializeMap().catch(error => { console.error('Map initialization failed:',error); document.querySelector('#map-status').textContent = 'Не удалось загрузить карту. Выберите район кнопками ниже.'; });

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
board.addEventListener('pointermove', event => {
  if (!finePointer.matches || event.pointerType === 'touch' || event.target.closest('.leaflet-control,.map-toolbar')) {cursor.classList.remove('visible');return;}
  const rect = board.getBoundingClientRect();
  const half = cursor.offsetWidth/2;
  cursor.style.transform = `translate(${event.clientX-rect.left-half}px, ${event.clientY-rect.top-half}px)`;
  cursor.classList.toggle('over-pin', !!event.target.closest('[data-district]'));
  cursor.classList.add('visible');
});
board.addEventListener('pointerleave', () => cursor.classList.remove('visible'));
board.addEventListener('focusin', () => cursor.classList.remove('visible'));
