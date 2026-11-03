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
 track('RightArm.quaternion'),track('RightHand.quaternion'),
 track('LeftArm.quaternion'),track('LeftForeArm.quaternion'),
 track('LeftHand.quaternion')]);
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
 assert.equal(clip.userData.attackStartFrame,13);
 assert.equal(clip.userData.attackSourceFPS,30);
 assert.equal(clip.userData.excludeLeftArm,true);
 assert.equal(clip.userData.blendIn,.2);
 assert.equal(clip.userData.blendOut,.2);
 assert.ok(!clip.tracks.some(t=>/LeftArm|LeftForeArm|LeftHand/.test(t.name)));
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

test('composite attack samples frame 13 and blends smoothly with locomotion',()=>{
 const sampled=[];
 class RecordingTrack extends Track{
  createInterpolant(){
   return {evaluate:t=>{
    sampled.push({bone:this.name,time:t});
    if(this.name==='Spine.quaternion')return [0,Math.sin(t*.2),0,Math.cos(t*.2)];
    return this.value;
   }};
  }
 }
 const locomotion=new Clip('Run',1,[
  track('Hips.position'),track('LeftUpLeg.quaternion'),
  new RecordingTrack('Spine.quaternion',[0,0,0,1]),
  track('LeftArm.quaternion'),track('LeftForeArm.quaternion')]);
 const action=new Clip('02',2,[
  new RecordingTrack('Spine.quaternion',[0,0,0,1]),
  track('RightArm.quaternion'),
  track('LeftArm.quaternion'),track('LeftForeArm.quaternion')]);
 const clip=buildCasterCompositeClip(THREE,{
  preset:COMPOSITE_PRESETS[1],motionClip:locomotion,
  actionClip:action,idleClip:locomotion
 });
 const actionSamples=sampled.filter(x=>x.bone==='Spine.quaternion');
 // Spine interpolants from both locomotion and attack are sampled; the
 // action source begins at 13/30 seconds rather than zero.
 assert.ok(actionSamples.some(x=>Math.abs(x.time-13/30)<1e-9));
 assert.ok(clip.tracks.some(t=>t.name==='LeftArm.quaternion'));
 assert.ok(clip.tracks.some(t=>t.name==='LeftForeArm.quaternion'));
 // The attack begins in the locomotion pose and ends back in locomotion.
 const spine=clip.tracks.find(t=>t.name==='Spine.quaternion');
 assert.ok(spine);
 assert.equal(spine.values[1],0);
 assert.ok(Math.abs(spine.values.at(-3))<.3);
});
