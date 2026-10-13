import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {content} from '../content.mjs';

const collection=JSON.parse(await readFile(new URL('../assets/districts/okrugs.geojson',import.meta.url),'utf8'));
test('covers all 12 administrative okrugs and their 132 districts',()=>{
  assert.equal(content.okrugs.length,12);
  assert.equal(new Set(content.okrugs.map(d=>d.id)).size,12);
  assert.equal(new Set(content.okrugs.map(d=>d.osmId)).size,12);
  assert.equal(content.okrugs.reduce((total,d)=>total+d.districtCount,0),132);
  const counts=Object.fromEntries(content.okrugs.map(d=>[d.code,d.districtCount]));
  assert.deepEqual(counts,{'ЦАО':10,'САО':16,'СВАО':17,'ВАО':16,'ЮВАО':12,'ЮАО':16,'ЮЗАО':12,'ЗАО':12,'СЗАО':8,'ЗелАО':5,'НАО':4,'ТАО':4});
});
function insideRing([x,y],ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
}
function insideGeometry(point,geometry){
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  return polygons.some(rings=>insideRing(point,rings[0])&&!rings.slice(1).some(ring=>insideRing(point,ring)));
}

test('every displayed okrug has a closed OpenStreetMap boundary',()=>{
  assert.equal(collection.features.length,content.okrugs.length);
  for(const district of content.okrugs){
    const feature=collection.features.find(f=>f.properties.id===district.id);
    assert.ok(feature,district.id);
    assert.equal(feature.properties.osmType,'relation');
    const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
    for(const rings of polygons)for(const ring of rings){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));}
  }
});

test('okrug markers lie within their real administrative boundaries',()=>{
  for(const district of content.okrugs){
    const feature=collection.features.find(f=>f.properties.id===district.id);
    const [lat,lon]=district.coordinates;
    assert.ok(insideGeometry([lon,lat],feature.geometry),district.name);
  }
});

test('okrug photographs are local JPEGs with source and licence credits',async()=>{
  assert.equal(new Set(content.okrugs.map(d=>d.image)).size,12);
  for(const district of content.okrugs){
    const file=new URL(`../${district.image}`,import.meta.url);
    assert.ok((await stat(file)).size>20000,district.name);
    const bytes=await readFile(file);
    assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);
    assert.equal(new URL(district.photoSource).hostname,'commons.wikimedia.org');
    assert.ok(district.photoAuthor&&district.photoLicense&&district.photoCaption);
    assert.match(district.photoCaption,new RegExp(district.name));
    if(district.photoCamera){const[lat,lon]=district.photoCamera;assert.ok(insideGeometry([lon,lat],collection.features.find(f=>f.properties.id===district.id).geometry),district.name+' photo camera');}
  }
});
