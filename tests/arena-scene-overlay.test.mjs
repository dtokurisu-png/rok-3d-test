import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),read=file=>readFile(new URL(file,root),'utf8');

test('Arena loads the optional scene overlay without modifying its simulation loop',async()=>{
 const [arena,overlay,style]=await Promise.all([
  read('arena-25d.html'),read('arena-scene-overlay.js'),read('arena-scene-overlay.css')
 ]);
 for(const id of ['testerSceneTools','testerSceneFile','testerScenePublished','testerSceneApply','testerSceneReset','testerSceneVisible','testerSceneCurrent','testerSceneStatus'])assert.match(arena,new RegExp('id="'+id+'"'));
 assert.match(arena,/from '\.\/arena-scene-overlay\.js'/);
 assert.match(arena,/createArenaSceneOverlay\(\{THREE,root,/);
 assert.match(arena,/sceneryOverlay\.update\(now\/1000\)/);
 assert.match(arena,/if\(loaded&&playing&&!casterReview\.active\)\{updateDuel\(dt\);\}/);
 assert.match(overlay,/root\.add\(scenery\)/);
 assert.match(overlay,/kind!=='rok3d\.scene'/);
 assert.match(overlay,/data\.arena\?\.columns!==9/);
 assert.match(overlay,/data\.arena\?\.rows!==18/);
 assert.match(overlay,/m\.category!=='prop'/);
 assert.match(overlay,/clearGroup\(nextRoot,nextObjects\)/);
 assert.match(overlay,/get currentName\(\)/);
 assert.match(style,/#testerSceneTools/);
});

test('published scene catalog starts empty and loader excludes untrusted paths',async()=>{
 const [raw,overlay]=await Promise.all([
  read('assets/scenes/catalog.json'),read('arena-scene-overlay.js')
 ]);
 const catalog=JSON.parse(raw);
 assert.equal(catalog.schemaVersion,1);
 assert.ok(Array.isArray(catalog.scenes));
 for(const entry of catalog.scenes)assert.match(entry.path,/^assets\/scenes\/[a-zA-Z0-9_-]+\.json$/);
 assert.match(overlay,/assets\/scenes\/catalog\.json/);
 assert.match(overlay,/sceneName=normalized\.name/);
 assert.doesNotMatch(overlay,/localStorage|sessionStorage|indexedDB|Authorization/);
});
