import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('animation viewer has WASD keys and clickable directional controls',async()=>{
 const [viewer,controller,styles]=await Promise.all([
  read('index.html'),read('viewer-caster-movement.js'),read('viewer-caster-movement.css')
 ]);
 for(const id of ['viewerMovePanel','viewerMoveEnable','viewerMoveStatus','viewerMoveSpeed','viewerMoveSpeedValue','viewerMoveKeys']){
  assert.equal((viewer.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 for(const key of ['KeyW','KeyA','KeyS','KeyD'])assert.match(viewer,new RegExp('data-wasd="'+key+'"'));
 assert.match(controller,/setPointerCapture/);
 assert.match(controller,/window\.addEventListener\('keydown'/);
 assert.match(controller,/window\.addEventListener\('keyup'/);
 assert.match(controller,/Math\.hypot\(forward,lateral\)/);
 assert.match(styles,/\.viewerMoveButtons/);
});
test('viewer reuses original numbered clips and Standing Idle while preserving frame inspector',async()=>{
 const [viewer,controller]=await Promise.all([read('index.html'),read('viewer-caster-movement.js')]);
 assert.match(viewer,/from '\.\/viewer-caster-movement\.js'/);
 assert.match(viewer,/from '\.\/universal-frames\.js'/);
 assert.match(viewer,/Standing%20Idle\.fbx/);
 assert.match(controller,/for\(const id of \[6,7,15,16\]\)/);
 assert.match(viewer,/viewerCasterMovement\.update\(dt\)/);
 assert.match(viewer,/viewerCasterMovement\.disable\(\)/);
 assert.match(viewer,/archerSeekAttackFrame/);
 assert.match(controller,/originalPosition=model\.position\.clone\(\)/);
 assert.doesNotMatch(controller,/localStorage|sessionStorage|indexedDB|Authorization/);
});
