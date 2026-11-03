import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {COMPOSITE_PRESETS,COMPOSITE_MOTION_IDS,buildCasterCompositeClip} from '../viewer-caster-composites.js';
const viewer=()=>readFile(new URL('../index.html',import.meta.url),'utf8');
class Track{
 constructor(name,value){
  this.name=name;this.value=value;
  this.ValueTypeName=name.endsWith('.quaternion')?'quaternion':'vector';
 }
 createInterpolant(){return {evaluate:()=>this.value};}
}
class Clip{
 constructor(name,duration,tracks){this.name=name;this.duration=duration;this.tracks=tracks;}
}
class Keyframe{
 constructor(name,times,values){this.name=name;this.times=times;this.values=values;}
}
class Quaternion{
 fromArray(values){this.values=[...values];return this;}
 slerp(other,alpha){
  this.values=this.values.map((x,i)=>x+(other.values[i]-x)*alpha);
  return this;
 }
 toArray(array){this.values.forEach((v,i)=>array[i]=v);}
}
const THREE={Quaternion,AnimationClip:Clip,
 QuaternionKeyframeTrack:Keyframe,VectorKeyframeTrack:Keyframe};
const track=(name)=>new Track(name,name.endsWith('.position')?[0,0,0]:[0,0,0,1]);
const base=new Clip('Running',1,[
 track('Hips.position'),track('Hips.quaternion'),
 track('LeftUpLeg.quaternion'),track('RightUpLeg.quaternion'),
 track('Spine.quaternion')]);
const attack=new Clip('Magic Heal 02',2,[
 track('Hips.quaternion'),track('Spine.quaternion'),
 track('RightArm.quaternion'),track('RightHand.quaternion')]);
const defense=new Clip('Impact 23',1.6,[
 track('Hips.quaternion'),track('Spine.quaternion'),
 track('LeftArm.quaternion'),track('LeftHand.quaternion')]);
test('composites retain original 1-23 catalog and append 10 unique rows 24-33',async()=>{
 const html=await viewer();
 assert.equal(COMPOSITE_PRESETS.length,10);
 assert.deepEqual(COMPOSITE_PRESETS.map(p=>p.index),
  [24,25,26,27,28,29,30,31,32,33]);
 assert.deepEqual(COMPOSITE_PRESETS.map(p=>p.action),
  ['attack','attack','attack','attack','attack',
   'defense','defense','defense','defense','defense']);
 assert.deepEqual(COMPOSITE_MOTION_IDS,
  {forward:7,backward:6,left:15,right:16});
 assert.match(html,/for\(const preset of COMPOSITE_PRESETS\)/);
 assert.match(html,/source:'composite',preset/);
 assert.match(html,/if\(rejectedAnimationIds\.has\(row\.index\)\)continue/);
 assert.match(html,/\.animRow\.composite-attack\{/);
 assert.match(html,/\.animRow\.composite-defense\{/);
 assert.match(html,/source==='composite'\)void loadCompositeAnimation\(row,true\)/);
});
test('attack composition uses real lower locomotion with upper attack 02',()=>{
 const clip=buildCasterCompositeClip(THREE,{
  preset:COMPOSITE_PRESETS[1],motionClip:base,
  actionClip:attack,idleClip:base
 });
 assert.equal(clip.duration,1.2);
 assert.deepEqual(clip.tracks.map(t=>t.name),
  ['Hips.position','Hips.quaternion','LeftUpLeg.quaternion',
   'RightUpLeg.quaternion','Spine.quaternion','RightArm.quaternion',
   'RightHand.quaternion']);
 assert.equal(clip.tracks[0].times.length,37);
 assert.equal(clip.userData.rokComposite,true);
 assert.equal(clip.userData.kind,'attack');
});
test('defense composition keeps legs in motion and upper-body defense 23',()=>{
 const clip=buildCasterCompositeClip(THREE,{
  preset:COMPOSITE_PRESETS[6],motionClip:base,
  actionClip:defense,idleClip:base
 });
 assert.equal(clip.duration,2);
 assert.deepEqual(clip.tracks.map(t=>t.name),
  ['Hips.position','Hips.quaternion','LeftUpLeg.quaternion',
   'RightUpLeg.quaternion','Spine.quaternion','LeftArm.quaternion',
   'LeftHand.quaternion']);
 assert.equal(clip.userData.kind,'defense');
});
test('viewer generates composites on demand and retains original player and frame inspector',async()=>{
 const html=await viewer();
 assert.match(html,/async function loadCompositeAnimation\(row,playAfter=false\)/);
 assert.match(html,/await loadOldCasterAnimation\(dep\)/);
 assert.match(html,/await loadNewAnimation\(dep\)/);
 assert.match(html,/buildCasterCompositeClip\(THREE,\{/);
 assert.match(html,/if\(playAfter\)playAnimation\(row\.index\)/);
 assert.match(html,/next\.setLoop\(row\.source==='composite'&&row\.preset\.action==='defense'/);
 assert.match(html,/createUniversalFrameInspector\(\{/);
 assert.match(html,/const animCatalog=\[/);
 assert.match(html,/const animationRows=animCatalog\.map/);
});
