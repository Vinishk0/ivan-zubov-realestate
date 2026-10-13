// One-time source preparation. Read API responses are cached; the site never calls the OSM editing API.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {content} from '../content.mjs';
const registry=JSON.parse(await readFile('artifacts/all-district-registry.json','utf8'));
const core=JSON.parse(await readFile('artifacts/moscow-core-raw.geojson','utf8'));
const oldGeometry=JSON.parse(await readFile('assets/districts/boundaries.geojson','utf8'));
await mkdir('artifacts/osm-cache',{recursive:true});
const sourceById=new Map(core.features.map(f=>[Number(f.properties['@id'].split('/')[1]),f]));
const codes=['ЦАО','САО','СВАО','ВАО','ЮВАО','ЮАО','ЮЗАО','ЗАО','СЗАО','ЗелАО','НАО','ТАО'];
const oldByOsm=new Map(oldGeometry.features.map(f=>[f.properties.osmId,content.districts.find(d=>d.id===f.properties.id)]));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function requestRelation(id){
 const file=`artifacts/osm-cache/${id}-full.json`;
 try{return JSON.parse(await readFile(file,'utf8'));}catch{}
 for(let attempt=0;attempt<4;attempt++){
  const r=await fetch(`https://api.openstreetmap.org/api/0.6/relation/${id}/full.json`,{headers:{'User-Agent':'IvanZubovWebsitePrototype/0.1 (district geography research)'},signal:AbortSignal.timeout(30000)});
  if(r.status===429){await sleep(30000);continue;}
  if(!r.ok)throw Error(`OSM ${id}: ${r.status}`);
  const data=await r.json();await writeFile(file,JSON.stringify(data));await sleep(1000);return data;
 }
 throw Error(`OSM rate limit for ${id}`);
}
function joinRings(ways){
 const pending=ways.map(way=>[...way.nodes]);const rings=[];
 while(pending.length){
  let ring=pending.shift();
  while(ring[0]!==ring.at(-1)){
   const i=pending.findIndex(segment=>segment[0]===ring.at(-1)||segment.at(-1)===ring.at(-1));
   if(i<0)throw Error('Unclosed administrative ring');
   let segment=pending.splice(i,1)[0];if(segment.at(-1)===ring.at(-1))segment=segment.reverse();ring.push(...segment.slice(1));
  }
  rings.push(ring);
 }
 return rings;
}
function inside([x,y],ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const[a,b]=ring[i],[c,d]=ring[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
function fullToGeometry(data,id){
 const relation=data.elements.find(e=>e.type==='relation'&&e.id===id);
 const nodes=new Map(data.elements.filter(e=>e.type==='node').map(n=>[n.id,[n.lon,n.lat]]));
 const ways=new Map(data.elements.filter(e=>e.type==='way').map(w=>[w.id,w]));
 const outer=joinRings(relation.members.filter(m=>m.type==='way'&&m.role==='outer').map(m=>ways.get(m.ref))).map(r=>r.map(n=>nodes.get(n)));
 const inner=joinRings(relation.members.filter(m=>m.type==='way'&&m.role==='inner').map(m=>ways.get(m.ref))).map(r=>r.map(n=>nodes.get(n)));
 if(!outer.length)throw Error(`No outer ring ${id}`);
 const polygons=outer.map(r=>[r]);for(const hole of inner){const polygon=polygons.find(p=>inside(hole[0],p[0]));if(!polygon)throw Error('Unassigned inner ring');polygon.push(hole);}
 return{type:'Feature',properties:{...relation.tags,'@id':`relation/${id}`},geometry:polygons.length===1?{type:'Polygon',coordinates:polygons[0]}:{type:'MultiPolygon',coordinates:polygons}};
}
function centerOf(geometry){
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 const largest=[...polygons].sort((a,b)=>b[0].length-a[0].length)[0];
 const xs=largest[0].map(p=>p[0]),ys=largest[0].map(p=>p[1]);
 const middle=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];
 if(inside(middle,largest[0])&&!largest.slice(1).some(r=>inside(middle,r)))return[middle[1],middle[0]];
 for(let n=1;n<31;n++)for(let x=0;x<n;x++)for(let y=0;y<n;y++){
  const point=[Math.min(...xs)+(x+.5)/n*(Math.max(...xs)-Math.min(...xs)),Math.min(...ys)+(y+.5)/n*(Math.max(...ys)-Math.min(...ys))];
  if(inside(point,largest[0])&&!largest.slice(1).some(r=>inside(point,r)))return[point[1],point[0]];
 }
 throw Error('No interior point');
}
const features=[],districts=[];
for(const [i,okrug]of registry.entries())for(const osmId of okrug.districtIds){
 let source=sourceById.get(osmId);
 if(!source){source=fullToGeometry(await requestRelation(osmId),osmId);console.log('Fetched geometry:',source.properties.name);}
 const curated=oldByOsm.get(osmId);
 const name=source.properties.name.replace(/^район\s+/,'').replace(/\s+район$/,'');
 const id=curated?.id||`district-${osmId}`;
 const coordinates=curated?.coordinates||centerOf(source.geometry);
 const data={...curated,id,name,officialName:source.properties.name,osmId,coordinates,okrug:codes[i],okrugName:okrug.name,wikidata:source.properties.wikidata||null,nameEn:source.properties['name:en']||'',aliases:[curated?.name,source.properties.alt_name].filter(Boolean),description:curated?.description||`Начнём с ваших планов: как вы хотите жить, что должно быть рядом и какой бюджет комфортен. Сравним предложения в районе «${name}» и выберем подходящий вам адрес.`,priorities:curated?.priorities||['Ваши приоритеты','Понятный бюджет','Личный подбор']};
 districts.push(data);
 features.push({type:'Feature',properties:{id,name,osmId,osmType:'relation',okrug:codes[i],center:coordinates},geometry:source.geometry});
}
districts.sort((a,b)=>a.name.localeCompare(b.name,'ru'));
await writeFile('artifacts/all-district-data.json',JSON.stringify(districts,null,2));
await writeFile('artifacts/all-district-boundaries.geojson',JSON.stringify({type:'FeatureCollection',features}));
console.log('Prepared',districts.length,'districts',features.length,'boundaries');
