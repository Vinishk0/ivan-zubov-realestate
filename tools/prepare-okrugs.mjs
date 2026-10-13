// One-time preparation from the read-only OSM API. Cached responses live in artifacts/.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {content} from '../content.mjs';
const registry=JSON.parse(await readFile('artifacts/all-district-registry.json','utf8'));
const definitions=[
  ['cao','ЦАО','Центральный','Жизнь в центре начинается с деталей: прогулочных маршрутов, привычных мест и характера дома. Обсудим, какое окружение подходит вашему ритму.',['Характер дома','Пешие маршруты','Ваш ритм']],
  ['sao','САО','Северный','Соберём ваши привычные маршруты: работа, встречи, занятия и отдых. Сравним адреса на севере Москвы по тому, насколько удобно вам будет жить.',['Удобные маршруты','Повседневный комфорт','Личный подбор']],
  ['svao','СВАО','Северо-Восточный','Начнём с баланса между городскими планами и временем для себя. Выберем окружение дома с учётом ваших занятий, прогулок и ежедневных поездок.',['Время для себя','Жизнь рядом','Ваши приоритеты']],
  ['vao','ВАО','Восточный','Разберём, что для вас значит хороший день дома: пространство, места для прогулок и всё нужное рядом. Затем перейдём к конкретным адресам на востоке Москвы.',['Пространство','Прогулки','Комфорт каждый день']],
  ['yuvao','ЮВАО','Юго-Восточный','У каждого переезда своя задача. Обсудим бюджет, планировку и привычные маршруты, чтобы сравнивать предложения по важным именно для вас критериям.',['Понятный бюджет','Нужная планировка','Ваши маршруты']],
  ['yuao','ЮАО','Южный','Посмотрим на ваш будущий адрес в масштабе жизни: работа, семья, встречи и выходные. Соберём приоритеты и сравним подходящие предложения на юге Москвы.',['Для жизни','Ваши планы','Личный подбор']],
  ['yuzao','ЮЗАО','Юго-Западный','Если вы выбираете дом надолго, начнём с планов на будущее. Обсудим пространство для семьи, работу из дома и окружение, в котором вам будет спокойно.',['Для семьи','Планы на будущее','Личное пространство']],
  ['zao','ЗАО','Западный','Хороший адрес поддерживает ваш ритм. Обсудим, что должно быть рядом с домом, какие маршруты удобны и каким вы представляете своё пространство.',['Ваш ритм','Пространство дома','Удобное окружение']],
  ['szao','СЗАО','Северо-Западный','Начнём с того, как вы любите отдыхать и проводить время рядом с домом. Сопоставим ваши пожелания с конкретными адресами на северо-западе Москвы.',['Время рядом с домом','Прогулки','Ваши пожелания']],
  ['zelao','ЗелАО','Зеленоградский','Рассмотрим Зеленоград как отдельный жизненный маршрут. Обсудим работу, ежедневные поездки и занятия семьи, прежде чем выбирать конкретный дом.',['Свой маршрут','Для семьи','Комфорт каждый день']],
  ['nao','НАО','Новомосковский','Если вы рассматриваете Новую Москву, начнём с ваших ожиданий от места. Сравним адреса по окружению, планировке и удобству повседневных поездок.',['Окружение дома','Понятный бюджет','Ваши маршруты']],
  ['tao','ТАО','Троицкий','Обсудим, какой баланс пространства и связи с городом вам нужен. Соберём критерии, с которыми будет проще выбрать подходящий адрес в Троицком округе.',['Больше пространства','Связь с городом','Свой ритм']]
];
await mkdir('artifacts/osm-cache',{recursive:true});
async function fetchRelation(id){
  const file=`artifacts/osm-cache/${id}-full.json`;
  try{return JSON.parse(await readFile(file,'utf8'));}catch{}
  for(let attempt=0;attempt<4;attempt++){
    const response=await fetch(`https://api.openstreetmap.org/api/0.6/relation/${id}/full.json`,{headers:{'User-Agent':'IvanZubovWebsitePrototype/0.1 (Moscow okrug geography)'},signal:AbortSignal.timeout(30000)});
    if(response.status===429||response.status===503){await new Promise(r=>setTimeout(r,15000));continue;}
    if(!response.ok)throw Error(`OSM ${id}: ${response.status}`);
    const data=await response.json();await writeFile(file,JSON.stringify(data));return data;
  }
  throw Error(`OSM unavailable: ${id}`);
}
function inside([x,y],ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const[a,b]=ring[i],[c,d]=ring[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
function joinRings(ways){const pending=ways.map(w=>[...w.nodes]),rings=[];while(pending.length){const ring=pending.shift();while(ring[0]!==ring.at(-1)){const i=pending.findIndex(s=>s[0]===ring.at(-1)||s.at(-1)===ring.at(-1));if(i<0)throw Error('Unclosed boundary');let segment=pending.splice(i,1)[0];if(segment.at(-1)===ring.at(-1))segment.reverse();ring.push(...segment.slice(1));}rings.push(ring);}return rings;}
function geometryFrom(data,id){
  const relation=data.elements.find(e=>e.type==='relation'&&e.id===id),nodes=new Map(data.elements.filter(e=>e.type==='node').map(n=>[n.id,[n.lon,n.lat]])),ways=new Map(data.elements.filter(e=>e.type==='way').map(w=>[w.id,w]));
  const rings=role=>joinRings(relation.members.filter(m=>m.type==='way'&&m.role===role).map(m=>ways.get(m.ref))).map(r=>r.map(n=>nodes.get(n)));
  const polygons=rings('outer').map(r=>[r]);
  for(const hole of rings('inner')){const p=polygons.find(p=>inside(hole[0],p[0]));if(!p)throw Error('Unassigned hole');p.push(hole);}
  return polygons.length===1?{type:'Polygon',coordinates:polygons[0]}:{type:'MultiPolygon',coordinates:polygons};
}
function centerOf(geometry){
  const area=r=>Math.abs(r.reduce((sum,p,i)=>sum+p[0]*r[(i+1)%r.length][1]-r[(i+1)%r.length][0]*p[1],0));
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  const largest=[...polygons].sort((a,b)=>area(b[0])-area(a[0]))[0],xs=largest[0].map(p=>p[0]),ys=largest[0].map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  for(let n=1;n<31;n++)for(let x=0;x<n;x++)for(let y=0;y<n;y++){const point=[minX+(x+.5)/n*(maxX-minX),minY+(y+.5)/n*(maxY-minY)];if(inside(point,largest[0])&&!largest.slice(1).some(r=>inside(point,r)))return[point[1],point[0]];}
  throw Error('No interior point');
}
const photo=content.okrugs[0],features=[],okrugs=[];
for(const[i,entry]of registry.entries()){
  const[id,code,name,description,priorities]=definitions[i];
  const geometry=geometryFrom(await fetchRelation(entry.id),entry.id),coordinates=centerOf(geometry);
  const okrug={id,code,name,officialName:entry.name,osmId:entry.id,districtCount:entry.districtIds.length,coordinates,description,priorities,photoCaption:'Москва-Сити · общая фотография для макета'};
  for(const field of['image','photoAuthor','photoSource','photoLicense','photoLicenseUrl','photoPosition'])okrug[field]=photo[field];
  okrugs.push(okrug);features.push({type:'Feature',properties:{id,code,name:entry.name,osmId:entry.id,osmType:'relation'},geometry});
  console.log('Prepared',code,entry.districtIds.length,'districts');
}
await writeFile('okrugs.mjs',`// Administrative okrugs from OSM; sources: docs/ASSETS.md. Photos and descriptions are for the prototype.\nexport const okrugs = ${JSON.stringify(okrugs,null,2)};\n`);
await writeFile('assets/districts/okrugs.geojson',JSON.stringify({type:'FeatureCollection',features}));
