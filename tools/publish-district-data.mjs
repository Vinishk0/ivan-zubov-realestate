// One-time local preparation; cached sources are described in docs/ASSETS.md.
import {readFile,writeFile} from 'node:fs/promises';
const districts=JSON.parse(await readFile('artifacts/all-district-data.json','utf8'));
const moscowPhoto=districts.find(d=>d.id==='presnya');
for(const district of districts){
  if(!district.image){
    for(const field of ['image','photoAuthor','photoSource','photoLicense','photoLicenseUrl','photoPosition'])district[field]=moscowPhoto[field];
    district.photoCaption='Москва-Сити · общая фотография для макета';
    district.photoPlaceholder=true;
  }
}
await writeFile('districts.mjs',`// 132 districts; OSM sources and licences: docs/ASSETS.md. Shared photos are placeholders.\nexport const districts = ${JSON.stringify(districts,null,2)};\n`);
await writeFile('assets/districts/boundaries.geojson',await readFile('artifacts/all-district-boundaries.geojson'));
const content=await readFile('content.mjs','utf8');
const updated=content.replace(/  districts: \[[\s\S]*?\r?\n  \],\r?\n  lifestyles:/,'  districts,\n  lifestyles:');
await writeFile('content.mjs',(updated.includes("import { districts }")?'':"import { districts } from './districts.mjs';\n")+updated);
console.log('Published',districts.length,'districts with five curated photos and shared Moscow placeholders.');
