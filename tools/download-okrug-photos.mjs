// Downloads twelve curated, freely licensed Wikimedia Commons previews and records attribution.
import {readFile,writeFile} from 'node:fs/promises';

const selections = {
  cao: ['View to Moscow river from Bolshoy Moskvoretsky Bridge.jpg','Кремль и Москва-река · Центральный округ'],
  sao: ['20210518 Moscow North River Terminal 01.jpg','Северный речной вокзал · Северный округ'],
  svao: ['Moscow. Central pavilion VDNKh P5293171 2350.jpg','Главный павильон ВДНХ · Северо-Восточный округ'],
  vao: ['Moscow. Izmailovo Kremlin P5140088 2740.jpg','Измайловский кремль · Восточный округ'],
  yuvao: ['Moscow, Kuzminki Park, Pond, Russia.jpg','Парк Кузьминки · Юго-Восточный округ'],
  yuao: ['Wooden Palace in Kolomenskoye, Moscow, Russia.jpg','Дворец в Коломенском · Южный округ'],
  yuzao: ['Moscow State University crop.jpg','Главное здание МГУ · Юго-Западный округ'],
  zao: ['Victory park on Poklonnaya Hill1.jpg','Парк Победы · Западный округ'],
  szao: ['Zhivopisny Bridge (37530309561).jpg','Живописный мост · Северо-Западный округ'],
  zelao: ['Большой городской пруд.jpg','Большой городской пруд · Зеленоградский округ'],
  nao: ['Moscow-2011 - 53 улица Александры Монаховой.jpg','Липовый парк в Коммунарке · Новомосковский округ'],
  tao: ['Desna River in Troitsk of Moscow Region 01.JPG','Река Десна в Троицке · Троицкий округ']
};

const clean = (html='') => html.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const authorOverrides = {cao:'Anton Zelenov'};
const titles = Object.values(selections).map(([title]) => `File:${title}`).join('|');
const parameters = new URLSearchParams({action:'query',format:'json',titles,prop:'imageinfo',iiprop:'url|size|mime|extmetadata',iiurlwidth:'1600'});
let data;
for (let attempt=0;attempt<5;attempt++) {
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${parameters}`, {headers:{'User-Agent':'IvanZubovWebsitePrototype/0.2 (licensed okrug photographs)'},signal:AbortSignal.timeout(45000)});
  if (response.status === 429 || response.status === 503) {await new Promise(resolve => setTimeout(resolve,15000));continue;}
  if (!response.ok) throw Error(`Commons API: ${response.status}`);
  data = await response.json();break;
}
if (!data) throw Error('Commons API unavailable');
const pages = new Map(Object.values(data.query?.pages||{}).map(page => [page.title.replace(/^File:/,''),page]));
const okrugsSource = await readFile('okrugs.mjs','utf8');
const okrugs = JSON.parse(okrugsSource.slice(okrugsSource.indexOf('['),okrugsSource.lastIndexOf(']')+1));
for (const okrug of okrugs) {
  const [title,caption] = selections[okrug.id];
  const page = pages.get(title), info = page?.imageinfo?.[0], metadata = info?.extmetadata;
  if (!info || info.mime !== 'image/jpeg' || info.width < 1000 || info.height < 650) throw Error(`Invalid image: ${title}`);
  const license = metadata?.LicenseShortName?.value || '';
  if (!/CC BY|CC0|Public domain|^PD|Free Art License/.test(license)) throw Error(`Unsupported license for ${title}: ${license}`);
  const response = await fetch(info.thumburl || info.url, {headers:{'User-Agent':'IvanZubovWebsitePrototype/0.2 (licensed okrug photographs)'},signal:AbortSignal.timeout(45000)});
  if (!response.ok) throw Error(`Image ${title}: ${response.status}`);
  const image = `assets/districts/okrug-${okrug.id}.jpg`;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw Error(`Not JPEG: ${title}`);
  await writeFile(image,bytes);
  okrug.image=image;
  okrug.photoCaption=caption;
  okrug.photoAuthor=authorOverrides[okrug.id] || clean(metadata?.Artist?.value || 'Wikimedia Commons').slice(0,160);
  okrug.photoSource=info.descriptionurl;
  okrug.photoLicense=license;
  okrug.photoLicenseUrl=metadata?.LicenseUrl?.value || info.descriptionurl;
  okrug.photoPosition='50% 50%';
  console.log(okrug.code,caption,Math.round(bytes.length/1024)+' KB',license);
}
await writeFile('okrugs.mjs',`// Administrative okrugs from OSM; photo sources and licences: docs/ASSETS.md.\nexport const okrugs = ${JSON.stringify(okrugs,null,2)};\n`);
