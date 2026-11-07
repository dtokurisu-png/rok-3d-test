import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const get=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Chiara is constructed through her own clean GLB factory, not old createCaster',async()=>{
 const arena=await get('arena-25d.html');
 assert.match(arena,/function createChiaraCaster\(baseScene\)/);
 assert.match(arena,/spec\.side==='enemy'\?\s*createChiaraCaster\(gltf\.scene\)/);
 assert.match(arena,/chiaraRig\.mount\(c\)/);
 assert.match(arena,/await chiaraRig\.loadIdle\(caster\)/);
 assert.doesNotMatch(arena,/spec\.side!=='enemy'\)return;[\s\S]*?Chiara_Idle_35/);
});

test('Chiara uses only one pose owner and approved Idle 35',async()=>{
 const file=await get('chiara-visual-rig.js');
 assert.match(file,/idle:\{path:'Idle \(1\)\.fbx',id:35\}/);
 assert.match(file,/if\(old\)old\.stop\(\)/);
 assert.match(file,/c\.model\.userData\.rokIdleAnimationId=35/);
 assert.match(file,/c\.mixer\.stopAllAction\(\)/);
 assert.match(file,/function masked\(st,clip,part\)/);
 assert.doesNotMatch(file,/AnimationUtils\.makeClipAdditive/);
});

test('Chiara rival AI decisions and costs still use original AI module',async()=>{
 const arena=await get('arena-25d.html');
 assert.match(arena,/rivalAI=createRivalCasterAI\(\{/);
 assert.match(arena,/getCastPlan:chiaraCastPlan/);
 assert.match(arena,/getStagingPosition:/);
 assert.match(arena,/getResourceState:c=>/);
 assert.match(arena,/onCastResolve:\(c,\{card\}\)=>/);
 assert.match(arena,/chiaraRig\.movement\(c,kind\)/);
 assert.match(arena,/chiaraRig\.upper\(c,'card-cast'/);
});

test('manual caster mode sends Chiara through clean controller, not legacy layers',async()=>{
 const arena=await get('arena-25d.html');
 assert.match(arena,/function casterPoseFor\(c\)\{return c\?\.side==='enemy'\?chiaraRig:casterLayers;\}/);
 assert.match(arena,/prepareClips:c=>c\.side==='enemy'\?Promise\.resolve\(chiaraRig\.getClips\(c\)\)/);
 assert.match(arena,/if\(caster\.side==='ally'\)casterLayers\.register\(caster/);
});
