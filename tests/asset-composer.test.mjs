import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=file=>readFile(new URL(file,root),'utf8');

test('asset editor references the shared catalog, Three.js and its composer module',async()=>{
 const [html,js,css]=await Promise.all([read('asset-editor.html'),read('asset-editor.js'),read('asset-editor.css')]);
 assert.match(html,/src="\.\/asset-editor\.js"/);
 assert.match(html,/href="\.\/asset-editor\.css"/);
 assert.match(html,/three@0\.169\.0/);
 assert.match(js,/assets\/manifests\/model-library\.json/);
 assert.match(js,/new GLTFLoader\(\)/);
 assert.match(js,/rok3d\.asset-composition/);
 assert.match(css,/\.assetViewport/);
 for(const id of ['assetCanvas','assetModels','effectAdd','effectList','assetSave','assetImport','assetClear']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
});
test('effect palette and JSON validation have the five canonical effects',async()=>{
 const js=await read('asset-editor.js');
 for(const kind of ['glow','light','particles','fog','pulse'])assert.match(js,new RegExp(kind));
 assert.match(js,/obj\.schemaVersion!==1/);
 assert.match(js,/obj\.effects\.length>40/);
 assert.match(js,/modelId===obj\.source\?\.modelId/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB/);
});
