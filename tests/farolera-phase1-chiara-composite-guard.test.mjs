import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('Chiara 35 idle remains the only initial pose and cast is upper/lower masked',async()=>{
 const rig=await read('chiara-visual-rig.js');
 assert.match(rig,/idle:\{path:'Idle \(1\)\.fbx',id:35\}/);
 assert.match(rig,/function masked\(st,clip,part\)/);
 assert.match(rig,/if\(part==='lower'\)return lowerBones\.has\(key\)/);
 assert.match(rig,/return !lowerBones\.has\(key\)&&m\[2\]==='quaternion'/);
 assert.match(rig,/function setCastLower\(c,clip,speed=1,progress=0\)/);
 assert.match(rig,/function syncCastLower\(c,progress\)/);
 assert.match(rig,/function clearCastLower\(c\)/);
 assert.doesNotMatch(rig,/next\.reset\(\)/);
});

test('Chiara AI cast is the exact composite 22 frames 0-48 then 21 from frame 20',async()=>{
 const html=await read('arena-25d.html');
 assert.match(html,/subclip\(clip,'ROK_Rival_Cast22_0_48',0,48,30\)/);
 assert.match(html,/chiaraRig\.upper\(c,'card-cast',prep,speed\)/);
 assert.match(html,/casterCastLayers\.setCastLower\(c,prep,speed,0\)/);
 assert.match(html,/chiaraRig\.upper\(c,'card-finish',finish,1,\{startTime:20\/30,transition:true\}\)/);
 assert.match(html,/casterCastLayers\.setCastLower\(c,finish,1,\(20\/30\)\/finish\.duration\)/);
});

test('manual Chiara and Lioren both receive cast lower and progress callbacks',async()=>{
 const html=await read('arena-25d.html');
 assert.match(html,/syncCastLower:\(c,progress\)=>casterPoseFor\(c\)\.syncCastLower\(c,progress\)/);
 assert.match(html,/clearCastLower:c=>casterPoseFor\(c\)\.clearCastLower\(c\)/);
 assert.match(html,/typeof chiaraRig\.setCastLower==='function'\)return chiaraRig\.setCastLower\(c,clip,speed,progress\)/);
});

test('active caster guard blocks ceil half of hit, no fractional HP losses',async()=>{
 const html=await read('arena-25d.html');
 const damage=html.slice(html.indexOf('function damage('),html.indexOf('const squareTileGeometry',html.indexOf('function damage(')));
 assert.match(damage,/const blocked=Math\.ceil\(Math\.max\(0,value\)\/2\)/);
 assert.match(damage,/value=Math\.max\(0,value-blocked\)/);
 assert.doesNotMatch(damage,/value\*=\.5/);
 for(const [hit,blocked] of [[1,1],[2,1],[3,2],[4,2],[5,3],[6,3],[7,4]])
  assert.equal(Math.ceil(hit/2),blocked);
 assert.match(damage,/if\(value>0&&target\.hp>0\)casterPoseFor\(target\)\.hit/);
});

test('fresh Chiara rig URL prevents reusing stale non-composite module',async()=>{
 const html=await read('arena-25d.html');
 assert.match(html,/chiara-visual-rig\.js\?v=20261107-composite-22-21-2/);
 assert.doesNotMatch(html,/chiara-visual-rig\.js\?v=20261107-rebuild-1/);
 const rig=await read('chiara-visual-rig.js');
 assert.match(rig,/setCastLower,syncCastLower,clearCastLower/);
});
