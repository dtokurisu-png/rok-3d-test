import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
test('scene editor is connected to an isolated 3D module',async()=>{
 const [html,js,css]=await Promise.all([read('scene-editor.html'),read('scene-editor.js'),read('scene-editor.css')]);
 for(const id of ['sceneCanvas','sceneLibraryList','sceneCompositions','sceneInstances','sceneSave','sceneOpen','sceneNew','sceneDuplicate','sceneDelete','sceneScale','sceneRotation','sceneImportAsset','sceneGrid'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/src="\.\/scene-editor\.js"/);
 assert.match(js,/new GLTFLoader\(\)/);
 assert.match(js,/const \$=id=>document\.getElementById\(id\), W=9,D=18/);
 assert.match(js,/arena-background\.css/);
 assert.match(js,/rok-lirte-html\/assets\/arena\.webp/);
 assert.match(js,/sceneDocument\(\)/);
 assert.match(css,/\.sceneStudio/);
});
test('scene importer validates geometry, composition types and excludes character-only assets',async()=>{
 const source=await read('scene-editor.js');
 assert.match(source,/enabledInSceneEditor/);
 assert.match(source,/schemaVersion!==1/);
 assert.match(source,/json\.arena\?\.columns!==W/);
 assert.match(source,/json\.arena\?\.rows!==D/);
 assert.match(source,/json\.objects\.length>250/);
 assert.match(source,/obj\.effects\.length>40/);
 assert.match(source,/model\.gitBlobSha/);
 assert.match(source,/effects=new Set\(\['glow','light','particles','fog','pulse'\]\)/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB/);
});
