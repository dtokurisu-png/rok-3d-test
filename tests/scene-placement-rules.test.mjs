import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA_COLUMNS,ARENA_ROWS,SCENERY_BOUNDS,
 PLAYABLE_CLEARANCE,footprint,placeOutsidePlayable,
 isOutsidePlayable,isWithinScenery,assertPlacement,validPlacement}
 from '../scene-placement-rules.js';

test('gameplay grid is exactly 15 by 30 and always empty of scenery',()=>{
 assert.equal(ARENA_COLUMNS,15);
 assert.equal(ARENA_ROWS,30);
 assert.equal(ARENA_COLUMNS*ARENA_ROWS,450);
 for(const [x,z] of [[0,0],[7,0],[-7,0],[0,14],[0,-14],[7.49,14.99]])
  assert.equal(validPlacement(x,z,0,0),false);
 assert.equal(PLAYABLE_CLEARANCE,0,'decorations may meet the exact arena border');
});

test('new and dragged objects can be placed beyond any of the four borders',()=>{
 for(const [x,z] of [[0,0],[20,0],[-20,0],[0,32],[0,-32],[2,4],[-3,-4]]){
  const adjusted=placeOutsidePlayable(x,z,1,1.5);
  assert.equal(validPlacement(adjusted.x,adjusted.z,1,1.5),true);
  assert.ok(isOutsidePlayable(adjusted.x,adjusted.z,1,1.5));
  assert.ok(isWithinScenery(adjusted.x,adjusted.z,1,1.5));
 }
 assert.equal(validPlacement(21,0,2,1),true);
 assert.equal(validPlacement(-21,0,2,1),true);
 assert.equal(validPlacement(0,28,2,1),true);
 assert.equal(validPlacement(0,-28,2,1),true);
});

test('rotation and footprint matter: pivot outside may still overlap gameplay',()=>{
 const {halfX,halfZ}=footprint(8,3,45,2);
 assert.ok(halfX>3&&halfZ>3);
 assert.equal(validPlacement(8,0,halfX,halfZ),false);
 const moved=placeOutsidePlayable(8,0,halfX,halfZ);
 assert.equal(validPlacement(moved.x,moved.z,halfX,halfZ),true);
 assert.throws(()=>assertPlacement(8,0,halfX,halfZ));
 assert.doesNotThrow(()=>assertPlacement(moved.x,moved.z,halfX,halfZ));
});

test('the grid is the only exclusion boundary; exterior coordinates are unrestricted',()=>{
 assert.equal(validPlacement(100,0),true);
 assert.equal(validPlacement(-400,250),true);
 assert.deepEqual(placeOutsidePlayable(500,-500,3,4),{x:500,z:-500});
 assert.equal(validPlacement(7.5,15,0,0),true);
 const near=placeOutsidePlayable(7,0,2,2);
 assert.ok(validPlacement(near.x,near.z,2,2));
});
test('editor and tester invoke shared footprint validation for all props',async()=>{
 const fs=await import('node:fs/promises');
 const editor=await fs.readFile(new URL('../scene-editor.js',import.meta.url),'utf8');
 const tester=await fs.readFile(new URL('../arena-scene-overlay.js',import.meta.url),'utf8');
 const html=await fs.readFile(new URL('../scene-editor.html',import.meta.url),'utf8');
 assert.match(editor,/const \$=id=>document\.getElementById\(id\), W=ARENA_COLUMNS,D=ARENA_ROWS;/);
 assert.match(editor,/const safe=placeOutsidePlayable\(middle\.x,middle\.z,size\.x\/2,size\.z\/2\)/);
 assert.match(editor,/assertPlacement\(middle\.x,middle\.z,size\.x\/2,size\.z\/2\)/);
 assert.match(editor,/x:W\/2\+3,z:0/);
 assert.match(editor,/scaleX,scaleY,scaleZ/);
 assert.match(tester,/data\.arena\?\.columns!==ARENA_COLUMNS\|\|data\.arena\?\.rows!==ARENA_ROWS/);
 assert.match(tester,/assertPlacement\(center\.x,center\.z,size\.x\/2,size\.z\/2\)/);
 assert.match(html,/Editor de escenarios · 15 × 30/);
});
