import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
async function moduleFrom(path){
 const source=await read(path);
 return import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
}
class FakeTrack{
 constructor(name){this.name=name;}
 clone(){return new FakeTrack(this.name);}
}
class FakeClip{
 constructor(name,duration,tracks){this.name=name;this.duration=duration;this.tracks=tracks;}
}
class FakeAction{
 constructor(clip){this.clip=clip;this.time=0;this.playing=false;}
 reset(){this.time=0;return this;}
 setLoop(loop,reps){this.loop=loop;this.reps=reps;return this;}
 setEffectiveWeight(weight){this.weight=weight;return this;}
 setEffectiveTimeScale(speed){this.speed=speed;return this;}
 play(){this.playing=true;return this;}
 fadeOut(){return this;}
 fadeIn(){return this;}
 stop(){this.playing=false;return this;}
 isRunning(){return this.playing;}
}
class FakeGroup{
 constructor(){this.children=[];this.position={set:(...xyz)=>this.xyz=xyz};this.visible=true;}
 add(item){this.children.push(item);}
}
class FakeMaterial{
 constructor(options){this.options=options;}
 clone(){return new FakeMaterial(this.options);}
}
class FakeMesh{
 constructor(geometry,material){this.geometry=geometry;this.material=material;this.position={z:0};}
}
const three={
 AnimationClip:FakeClip,LoopRepeat:1,LoopOnce:2,AdditiveAnimationBlendMode:3,
 DoubleSide:2,AdditiveBlending:4,Group:FakeGroup,Mesh:FakeMesh,
 RingGeometry:class{},CircleGeometry:class{},MeshBasicMaterial:FakeMaterial,
 AnimationUtils:{makeClipAdditive:clip=>{clip.additive=true;}},
 MathUtils:{clamp:(value,a,b)=>Math.max(a,Math.min(b,value))}
};
function makeMixer(){
 const actions=new Map();
 return {actions,updateCount:0,stopped:0,
  clipAction(clip){
   if(!actions.has(clip))actions.set(clip,new FakeAction(clip));
   return actions.get(clip);
  },
  stopAllAction(){this.stopped++;for(const action of actions.values())action.stop();},
  update(dt){this.updateCount++;for(const a of actions.values())if(a.playing)a.time+=dt*(a.speed||1);}
 };
}
const trackNames=[
 'Hips.quaternion','Hips.position','LeftUpLeg.quaternion','LeftLeg.quaternion',
 'RightUpLeg.quaternion','RightLeg.quaternion','Spine.quaternion',
 'Spine1.quaternion','Neck.quaternion','Head.quaternion',
 'LeftArm.quaternion','RightArm.quaternion','RightHand.quaternion'
];
const clip=(name,duration=1)=>new FakeClip(name,duration,trackNames.map(n=>new FakeTrack(n)));
function makeCaster(){
 const mixer=makeMixer();
 return {role:'caster',stage:'active',side:'ally',manualDefending:false,
  outer:{position:{x:0,z:7.5},children:[],add(item){this.children.push(item);}},
  model:{userData:{rokCasterAsset:'Lioren'}},
  idleClip:clip('Idle'),mixer,userData:{}};
}
function mockUI(){
 const handlers={},nodes={};
 const element=(value='')=>({
  value,textContent:'',title:'',dataset:{},listeners:{},
  addEventListener(name,fn){this.listeners[name]=fn;},
  blur(){},setPointerCapture(){}
 });
 for(const [id,value] of [
  ['casterMoveSide','ally'],['casterMoveSpeed','2.2'],
  ['casterMoveSpeedText','2.2'],['casterMoveStatus',''],
  ['casterAttackButton',''],['casterDefenseButton','']])nodes[id]=element(value);
 const buttons=['KeyW','KeyA','KeyS','KeyD'].map(k=>{
  const b=element();b.dataset.moveKey=k;return b;
 });
 const previous={document:globalThis.document,window:globalThis.window};
 globalThis.document={
  getElementById:id=>nodes[id],querySelectorAll:()=>buttons,
  addEventListener:(name,fn)=>handlers[name]=fn,hidden:false
 };
 globalThis.window={addEventListener(){}};
 return {handlers,nodes,buttons,restore(){
  globalThis.document=previous.document;globalThis.window=previous.window;
 }};
}
function keyboard(code,repeat=false){return {code,repeat,target:null,preventDefault(){}};}

test('compact Arena controls and live combat are unchanged',async()=>{
 const [arena,css,loader]=await Promise.all([
  read('arena-25d.html'),read('caster-mobility.css'),read('caster-movement-loader.js')
 ]);
 assert.doesNotMatch(arena,/src="\.\/studio\.js"/);
 assert.match(css,/#casterMobilityPanel\{[^}]*position:fixed/);
 for(const key of ['KeyW','KeyA','KeyS','KeyD'])
  assert.match(arena,new RegExp('data-move-key="'+key+'"'));
 assert.match(arena,/id="casterAttackButton"/);
 assert.match(arena,/id="casterDefenseButton"/);
 assert.match(arena,/if\(loaded&&playing&&!casterReview\.active\)updateDuel\(dt\)/);
 assert.match(arena,/if\(loaded&&casterMovement\?\.enabled\)casterMovement\.step\(dt\)/);
 assert.match(arena,/v0\.9\.22 · Capas y escudo/);
 for(const [path,id] of [['Magic Heal.fbx',2],['Sword And Shield Impact.fbx',23],
  ['Standing React Small From Headshot.fbx',9],['Sword And Shield Death.fbx',8]])
  assert.ok(loader.includes(path)&&loader.includes('id:'+id),path);
});

test('lower/upper clips have disjoint bones, upper guard plays fast once, and shield stays frontal',async()=>{
 const {createCasterLayerSystem}=await moduleFrom('caster-animation-layers.js');
 const layers=createCasterLayerSystem(three),caster=makeCaster();
 const sources={idle:clip('Idle'),forward:clip('Run'),attack:clip('Attack',1.5),
  defense:clip('Defense',1.4),hit:clip('Hit',.45)};
 layers.register(caster,sources);
 layers.movement(caster,'forward');
 layers.upper(caster,'attack',sources.attack);
 const running=caster.mixer.actions;
 const leg=[...running.values()].find(a=>a.clip.name==='Run_lower');
 const attack=[...running.values()].find(a=>a.clip.name==='Attack_upper');
 assert.ok(leg&&attack);
 assert.ok(leg.clip.tracks.some(t=>t.name==='Hips.position'));
 assert.ok(leg.clip.tracks.every(t=>/Hips|Leg|Foot/.test(t.name)));
 assert.ok(attack.clip.tracks.every(t=>!/Hips|Leg|Foot/.test(t.name)));
 layers.movement(caster,'idle');
 layers.upper(caster,'defense',sources.defense,1.8);
 const defense=[...running.values()].find(a=>a.clip.name==='Defense_upper');
 assert.equal(defense.loop,three.LoopOnce);
 assert.equal(defense.clampWhenFinished,true);
 assert.equal(defense.speed,1.8);
 layers.shield(caster,true);
 assert.equal(caster.outer.children.length,1);
 assert.equal(caster.outer.children[0].visible,true);
 assert.deepEqual(caster.outer.children[0].xyz,[0,1.12,.84]);
 layers.shield(caster,false);
 assert.equal(caster.outer.children[0].visible,false);
 layers.endUpper(caster,'defense');
 assert.equal(leg.clip.tracks.length,6);
});

test('hit reaction 09 is an additive neck/head overlay; defense can suppress it',async()=>{
 const {createCasterLayerSystem}=await moduleFrom('caster-animation-layers.js');
 const layers=createCasterLayerSystem(three),caster=makeCaster(),hit=clip('Hit09',.4);
 assert.equal(layers.hit(caster,hit),true);
 const action=[...caster.mixer.actions.values()].find(a=>a.clip.name==='ROK_Caster_Hit09_Additive');
 assert.ok(action);
 assert.ok(action.clip.additive);
 assert.deepEqual(action.clip.tracks.map(t=>t.name),['Neck.quaternion','Head.quaternion']);
 caster.manualDefending=true;
 assert.equal(layers.hit(caster,hit),false);
 layers.cancelHit(caster);
 assert.equal(action.playing,false);
});

test('WASD motion never stops during attack or held Shift; releasing restores upper-body movement',async()=>{
 const [{createCasterLayerSystem},{createCasterMobility}]=await Promise.all([
  moduleFrom('caster-animation-layers.js'),moduleFrom('caster-mobility.js')
 ]);
 const layers=createCasterLayerSystem(three),caster=makeCaster(),ui=mockUI();
 let shots=0;
 try{
  const c=createCasterMobility({
   THREE:three,layers,getCaster:()=>caster,
   prepareClips:()=>new Promise(()=>{}),onModeChange:()=>true,onAttack:()=>shots++
  });
  ui.handlers.keydown(keyboard('KeyW'));
  c.step(.05);const forward=caster.outer.position.z;
  assert.ok(forward<7.5);
  ui.handlers.keydown(keyboard('Space'));
  for(let i=0;i<14;i++)c.step(.05);
  assert.ok(caster.outer.position.z<forward,'walking must continue during attack');
  assert.equal(shots,1,'Space attack must launch once while FBX is unavailable');
  ui.handlers.keydown(keyboard('ShiftLeft'));
  assert.equal(caster.manualDefending,true);
  assert.equal(caster.outer.children[0]?.visible,true);
  const beforeGuard=caster.outer.position.z;
  c.step(.05);
  assert.ok(caster.outer.position.z<beforeGuard,'walking must continue during guard');
  ui.handlers.keyup(keyboard('ShiftLeft'));
  assert.equal(caster.manualDefending,false);
  assert.equal(caster.outer.children[0]?.visible,false);
  c.disable();
 }finally{ui.restore();}
});

test('guard prevents damage and releasing it restores normal damage in Arena damage()',async()=>{
 const arena=await read('arena-25d.html');
 const start=arena.indexOf('function damage(target,value,source,{committed=false}={}){');
 const end=arena.indexOf('const squareTileGeometry',start);
 const target={role:'caster',stage:'active',side:'enemy',hp:12,manualDefending:true};
 const hud={textContent:'',title:''};
 let reactions=0;
 const create=new Function(
  'canDamageTarget','canAttackSummonTarget','qs','casterMovement','casterLayers',
  'matchRestartLeft','playCasterDeath','CASTER_RESTART_DELAY','nameplates','casters',
  arena.slice(start,end)+'\nreturn damage;');
 const damage=create(()=>true,()=>true,()=>hud,
  {caster:target},{hit(){reactions++;}},null,()=>{},1.8,new Map(),[target]);
 assert.equal(damage(target,1,{side:'ally'}),true);
 assert.equal(target.hp,12);
 target.manualDefending=false;
 assert.equal(damage(target,1,{side:'ally'}),true);
 assert.equal(target.hp,11);
 assert.equal(reactions,1);
});
