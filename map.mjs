import { content } from './content.mjs';
import './assets/vendor/leaflet.js';

const section=document.querySelector('#moscow'), board=document.querySelector('#map-board'), cursor=document.querySelector('#map-cursor');
const search=document.querySelector('#district-search'), okrugSelect=document.querySelector('#district-okrug'), options=document.querySelector('#district-options'), clearSearch=document.querySelector('#district-search-clear');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=value=>value.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[—–-]/g,' ').replace(/\s+/g,' ').trim();
const districts=new Map(content.districts.map(d=>[d.id,d])), districtLayers=new Map();
let map,allBounds,selectedMarker;
let selectedId='khamovniki';
const okrugs=['ЦАО','САО','СВАО','ВАО','ЮВАО','ЮАО','ЮЗАО','ЗАО','СЗАО','ЗелАО','НАО','ТАО'];
for(const code of okrugs){const option=document.createElement('option');option.value=code;option.textContent=`${code} · ${content.districts.find(d=>d.okrug===code).okrugName.replace(/ административный округ$/,'')}`;okrugSelect.append(option);}
function matches(d){const query=normalize(search.value);return(!okrugSelect.value||d.okrug===okrugSelect.value)&&(!query||normalize([d.name,d.officialName,d.nameEn,...d.aliases].join(' ')).includes(query));}
function renderOptions(){
  const visible=content.districts.filter(matches);
  options.innerHTML=visible.map(d=>`<button data-district="${d.id}" aria-pressed="${d.id===selectedId}"><span>${escape(d.okrug)}</span>${escape(d.name)}</button>`).join('');
  options.scrollTop=0;
  document.querySelector('#district-count').textContent=search.value||okrugSelect.value?`Найдено: ${visible.length} из ${content.districts.length}`:`${content.districts.length} района · ${okrugs.length} округов`;
  document.querySelector('#district-empty').hidden=visible.length>0;
  clearSearch.hidden=!search.value;
  styleDistricts();
}
function styleDistricts(){
  const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  for(const[id,layer]of districtLayers){const selected=id===selectedId,visible=matches(districts.get(id));layer.setStyle({color:accent,fillColor:accent,weight:selected?2.5:1,opacity:selected?1:visible?.55:.15,fillOpacity:selected?.2:visible?.04:.008});if(selected)layer.bringToFront();}
}
function selectDistrict(id,focusMap=true){
  const d=districts.get(id);if(!d)return;selectedId=id;
  if(!matches(d)){search.value='';okrugSelect.value='';renderOptions();}
  section.querySelectorAll('[data-district]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.district===id)));
  document.querySelector('#district-kicker').textContent=`МОСКВА / ${d.okrug}`;
  document.querySelector('#district-name').textContent=d.name;
  document.querySelector('#district-description').textContent=d.description;
  const photo=document.querySelector('#district-image');photo.src=d.image;photo.alt=d.photoCaption;photo.style.objectPosition=d.photoPosition||'50% 50%';
  document.querySelector('#district-photo-caption').textContent=d.photoCaption;
  document.querySelector('#district-photo-credit').innerHTML=`<a href="${escape(d.photoSource)}" target="_blank" rel="noopener noreferrer">Фото: ${escape(d.photoAuthor)} ↗</a> · <a href="${escape(d.photoLicenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(d.photoLicense)}</a>`;
  document.querySelector('#district-priorities').innerHTML=d.priorities.map(p=>`<span>${escape(p)}</span>`).join('');
  const contact=document.querySelector('#district-contact');contact.setAttribute('aria-label',`Обсудить район «${d.name}» с Иваном в Telegram`);contact.href=`${content.contacts.telegram}?text=${encodeURIComponent(`Иван, здравствуйте! Меня интересует район «${d.name}». Хочу обсудить подбор недвижимости.`)}`;
  styleDistricts();
  if(map){const L=window.L;if(selectedMarker)map.removeLayer(selectedMarker);const icon=L.divIcon({className:'district-marker-host',iconSize:[1,1],iconAnchor:[0,0],html:`<span class="map-pin" aria-hidden="true"><span class="pin-dot"></span><span class="pin-label">${escape(d.name)}</span></span>`});selectedMarker=L.marker(d.coordinates,{icon,keyboard:false,interactive:false}).addTo(map);const layer=districtLayers.get(id);if(layer&&focusMap)map.fitBounds(layer.getBounds(),{padding:[42,55],maxZoom:13,animate:false});}
}
renderOptions();selectDistrict(selectedId,false);
section.addEventListener('click',event=>{const button=event.target.closest('button[data-district]');if(button)selectDistrict(button.dataset.district);});
search.addEventListener('input',renderOptions);
search.addEventListener('keydown',event=>{if(event.key==='Enter'){const result=content.districts.find(matches);if(result){event.preventDefault();selectDistrict(result.id);}}});
clearSearch.addEventListener('click',()=>{search.value='';renderOptions();search.focus();});
okrugSelect.addEventListener('change',()=>{renderOptions();if(!map)return;const bounds=window.L.latLngBounds([]);for(const[id,layer]of districtLayers)if(!okrugSelect.value||districts.get(id).okrug===okrugSelect.value)bounds.extend(layer.getBounds());if(bounds.isValid())map.fitBounds(bounds,{padding:[35,45],animate:false});});
async function initializeMap(){
  const response=await fetch('assets/districts/boundaries.geojson');if(!response.ok)throw Error('District boundaries unavailable');const boundaries=await response.json(),L=window.L;
  map=L.map('city-map',{scrollWheelZoom:false,zoomControl:false,minZoom:7,maxZoom:18,attributionControl:true,zoomSnap:1,zoomAnimation:false,markerZoomAnimation:false});
  L.control.zoom({position:'topright',zoomInTitle:'Приблизить карту',zoomOutTitle:'Отдалить карту'}).addTo(map);map.attributionControl.setPrefix(false);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(map);
  let loadedTile=false;tiles.on('tileload',()=>{loadedTile=true;document.querySelector('#map-status').hidden=true;});tiles.on('tileerror',()=>{if(!loadedTile)document.querySelector('#map-status').textContent='Подложка карты недоступна. Границы районов и фотографии доступны.';});
  const geometry=L.geoJSON(boundaries,{onEachFeature(feature,layer){districtLayers.set(feature.properties.id,layer);layer.bindTooltip(feature.properties.name,{sticky:true,direction:'top',className:'district-tooltip'});layer.on('click',()=>selectDistrict(feature.properties.id));}}).addTo(map);
  allBounds=geometry.getBounds();map.fitBounds([[55.64,37.38],[55.9,37.84]],{padding:[20,20],animate:false});selectDistrict(selectedId,false);
  document.querySelector('#map-reset').addEventListener('click',()=>{search.value='';okrugSelect.value='';renderOptions();map.fitBounds(allBounds,{padding:[35,45],animate:false});});
  new ResizeObserver(()=>map.invalidateSize({pan:false})).observe(board);new MutationObserver(styleDistricts).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}
initializeMap().catch(error=>{console.error('Map initialization failed:',error);document.querySelector('#map-status').textContent='Не удалось загрузить карту. Выберите район в списке ниже.';});
const finePointer=window.matchMedia('(hover: hover) and (pointer: fine)');
board.addEventListener('pointermove',event=>{if(!finePointer.matches||event.pointerType==='touch'||event.target.closest('.leaflet-control,.map-toolbar')){cursor.classList.remove('visible');return;}const rect=board.getBoundingClientRect(),half=cursor.offsetWidth/2;cursor.style.transform=`translate(${event.clientX-rect.left-half}px, ${event.clientY-rect.top-half}px)`;cursor.classList.add('visible');});
board.addEventListener('pointerleave',()=>cursor.classList.remove('visible'));board.addEventListener('focusin',()=>cursor.classList.remove('visible'));
