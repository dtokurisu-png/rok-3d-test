import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
test('manual caster mode has independent controls and pauses autonomous combat',async()=>{
 const [arena,controller,loader]=await Promise.all([
  read('arena-25d.html'),read('caster-mobility.js'),read('caster-movement-loader.js')
 ]);
 for(const id of ['casterMobilityPanel','casterMoveEnable','casterMoveSide','casterMoveSpeed','casterMoveStatus','casterMoveKeys']){
  assert.match(arena,new RegExp('id="'+id+'"'));
 }
 assert.match(arena,/from '\.\/caster-mobility\.js'/);
 assert.match(arena,/from '\.\/caster-movement-loader\.js'/);
 assert.match(arena,/if\(loaded&&playing&&!casterReview\.active&&!casterMovement\?\.enabled\)\{updateDuel\(dt\);\}/);
 assert.match(arena,/casterMovement\.step\(dt\)/);
 assert.match(arena,/casterMovement\?\.disable\(\)/);
 assert.match(controller,/KeyW:'forward'/);
 assert.match(controller,/KeyS:'backward'/);
 assert.match(controller,/KeyA:'left'/);
 assert.match(controller,/KeyD:'right'/);
 assert.match(controller,/Math\.hypot\(move\.lateral,move\.forward\)/);
 assert.match(controller,/sideSign=c.side==='ally'\?-1:1/);
 assert.match(loader,/Standing Idle\.fbx/);
 assert.match(loader,/Running Backward\.fbx/);
 assert.match(loader,/Running\.fbx/);
 assert.match(loader,/Right Strafe\.fbx/);
 assert.match(loader,/Right Strafe \(1\)\.fbx/);
 assert.match(loader,/result\[role\]=result\.idle\|\|caster\.idleClip/);
 assert.match(loader,/result\._unavailable\.push/);
 const panelPosition=arena.indexOf('<section id="casterMobilityPanel"');
 const closedOptions=arena.indexOf('<div id="nameplateLayer"');
 const barPosition=arena.indexOf('<div id="bottom"');
 assert.ok(panelPosition>closedOptions&&panelPosition<barPosition,'WASD panel must be outside hidden options and before bottom bar');
 for(const code of ['KeyW','KeyA','KeyS','KeyD'])assert.match(arena,new RegExp('data-move-key="'+code+'"'));
 assert.match(controller,/setPointerCapture/);
 assert.match(controller,/pointercancel/);
 assert.match(controller,/lostpointercapture/);
 assert.match(controller,/showReady/);
 assert.doesNotMatch(controller,/localStorage|indexedDB|Authorization/);
});
