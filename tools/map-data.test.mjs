import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {content} from '../content.mjs';

const collection=JSON.parse(await readFile(new URL('../assets/districts/boundaries.geojson',import.meta.url),'utf8'));
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

test('every displayed district has a closed OpenStreetMap boundary',()=>{
  assert.equal(collection.features.length,content.districts.length);
  for(const district of content.districts){
    const feature=collection.features.find(f=>f.properties.id===district.id);
    assert.ok(feature,district.id);
    assert.equal(feature.properties.osmType,'relation');
    const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
    for(const rings of polygons)for(const ring of rings){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));}
  }
});

test('district markers lie within their real district boundaries',()=>{
  for(const district of content.districts){
    const feature=collection.features.find(f=>f.properties.id===district.id);
    const [lat,lon]=district.coordinates;
    assert.ok(insideGeometry([lon,lat],feature.geometry),district.name);
  }
});

test('district photographs are local JPEGs with source and licence credits',async()=>{
  for(const district of content.districts){
    const file=new URL(`../${district.image}`,import.meta.url);
    assert.ok((await stat(file)).size>20000,district.name);
    const bytes=await readFile(file);
    assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);
    assert.equal(new URL(district.photoSource).hostname,'commons.wikimedia.org');
    assert.ok(district.photoAuthor&&district.photoLicense&&district.photoCaption);
  }
});
