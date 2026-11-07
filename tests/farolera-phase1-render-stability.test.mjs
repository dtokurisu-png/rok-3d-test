import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('Chiara Idle 35 uses the actual root FBX, never the missing shared path',async()=>{
 const arena=await read('arena-25d.html');
 const source=await read('animation-creator-sources.js');
 const file=await stat(new URL('Idle (1).fbx',root));
 assert.ok(file.size>0);
 assert.match(source,/id:35,name:'35 · Idle \(1\)'/);
 const rig=await read('chiara-visual-rig.js');
 assert.match(arena,/spec\.side==='enemy'\?\s*createChiaraCaster\(gltf\.scene\)/);
 assert.match(arena,/await chiaraRig\.loadIdle\(caster\)/);
 assert.match(rig,/idle:\{path:'Idle \(1\)\.fbx',id:35\}/);
 assert.match(rig,/rokIdleAnimationId=35/);
});

test('Farolera live effects do not create new per-cast point lights',async()=>{
 const bridge=await read('features/farolera/phase-1/phase-8-arena-bridge.js');
 assert.doesNotMatch(bridge,/new THREE\.PointLight\(/);
 assert.match(bridge,/ROK_Farolera_BrightPortalCircle/);
 assert.match(bridge,/new THREE\.MeshBasicMaterial/);
});

test('Farolera abandoned lantern and completed teleport free their visuals',async()=>{
 const bridge=await read('features/farolera/phase-1/phase-8-arena-bridge.js');
 assert.match(bridge,/e\.step==='target-wait'&&e\.time>=2/);
 assert.match(bridge,/disposeVisual\(e\);e\.plan=null;e\.throwPlan=null/);
 assert.match(bridge,/const chainHand=new THREE\.Vector3\(\),chainDelta=new THREE\.Vector3\(\)/);
 assert.doesNotMatch(bridge,/c\.model\.updateMatrixWorld\(true\)/);
});
