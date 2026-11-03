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
 constructor(){this.children=[];this.position={set:(...xyz)=>this.xyz=xyz};this.visible=true;this.parent=null;}
 add(item){this.children.push(item);item.parent=this;}
 remove(item){this.children=this.children.filter(x=>x!==item);item.parent=null;}
}
class FakeMaterial{
 constructor(options){this.options=options;}
 clone(){return new FakeMaterial(this.options);}
}
class FakeMesh{
 constructor(geometry,material){this.geometry=geometry;this.material=material;this.position={x:0,y:0,z:0};this.rotation={x:0,y:0,z:0};}
}
const three={
 AnimationClip:FakeClip,LoopRepeat:1,LoopOnce:2,AdditiveAnimationBlendMode:3,
 DoubleSide:2,AdditiveBlending:4,Group:FakeGroup,Mesh:FakeMesh,
 RingGeometry:class{},CircleGeometry:class{},PlaneGeometry:class{},MeshBasicMaterial:FakeMaterial,
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
  ['casterMoveSide','ally'],['casterMoveSpeed','3.8'],
  ['casterMoveSpeedText','3.8'],['casterMoveStatus',''],
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
 assert.match(arena,/v0\.9\.27 · Arena 15×30/);
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
   prepareClips:()=>new Promise(()=>{}),onModeChange:()=>true,
   getAttackTarget:()=>({id:'enemy'}),onAttack:()=>shots++
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

test('caster movement 3.8 and attacks every 1 second',async()=>{
 const [arena,control]=await Promise.all([read('arena-25d.html'),read('caster-mobility.js')]);
 assert.match(arena,/id="casterMoveSpeed"[^>]*value="3\.8"/);
 assert.match(arena,/attackRange:3,moveSpeed:3\.8,attackPeriod:1/);
 assert.match(control,/const ATTACK_PERIOD=1/);
 assert.match(control,/const WALK_SPEED=3\.8/);
 const [{createCasterLayerSystem},{createCasterMobility}]=await Promise.all([
  moduleFrom('caster-animation-layers.js'),moduleFrom('caster-mobility.js')
 ]);
 const layers=createCasterLayerSystem(three),caster=makeCaster(),ui=mockUI();
 let shots=0;
 try{
  const ctl=createCasterMobility({THREE:three,layers,getCaster:()=>caster,
   prepareClips:()=>new Promise(()=>{}),onAttack:()=>shots++,onModeChange:()=>true,
   getAttackTarget:()=>({id:'enemy'})});
  ui.handlers.keydown(keyboard('KeyW'));
  ctl.step(.05);
  assert.ok(Math.abs(caster.outer.position.z-(7.5-3.8*.05))<1e-7);
  ui.handlers.keyup(keyboard('KeyW'));
  ui.handlers.keydown(keyboard('Space'));
  for(let i=0;i<20;i++)ctl.step(.05);
  assert.equal(shots,1);
  ui.handlers.keydown(keyboard('Space'));
  for(let i=0;i<12;i++)ctl.step(.05);
  assert.equal(shots,2);
  ctl.disable();
 }finally{ui.restore();}
});
test('ring fades on approach and target marker appears only within 3',async()=>{
 const {createCasterRangeIndicator}=await moduleFrom('caster-range-indicator.js');
 const indicator=createCasterRangeIndicator({THREE:three,range:3,approach:5.5});
 const c=makeCaster(),hostile={role:'summon',side:'enemy',stage:'active',hp:3,
  outer:new FakeGroup()};
 hostile.outer.position.x=0;hostile.outer.position.z=1.5;
 const allowed=t=>t.hp>0&&t.stage==='active';
 assert.equal(indicator.update(c,[hostile],.1,allowed),null);
 const ring=c.outer.children[0];
 assert.equal(ring.visible,false);
 hostile.outer.position.z=3.5;
 assert.equal(indicator.update(c,[hostile],.1,allowed),null);
 assert.equal(ring.visible,true);
 assert.ok(ring.children[0].material.opacity>0&&ring.children[0].material.opacity<.8);
 hostile.outer.position.z=4.5;
 assert.equal(indicator.update(c,[hostile],.1,allowed),hostile);
 assert.equal(ring.children[0].material.opacity,.8);
 assert.equal(hostile.outer.children.length,1);
 hostile.outer.position.z=4.4;
 assert.equal(indicator.update(c,[hostile],.1,allowed),null);
 assert.equal(hostile.outer.children.length,0);
 indicator.hide(c);
 assert.equal(ring.visible,false);
});
test('caster projectile only selects in-range hostile units while keeping other combat live',async()=>{
 const arena=await read('arena-25d.html');
 assert.match(arena,/const casterRangeIndicator=createCasterRangeIndicator\(\{THREE,range:3,approach:5\.5\}\)/);
 assert.match(arena,/const summon=casterRangeIndicator\.choose\(c,enemies,canDamageTarget\)\.target/);
 assert.match(arena,/getAttackTarget:casterAttackTarget/);
 assert.match(arena,/if\(attacker\?\.role==='caster'\)return true/);
 assert.match(arena,/if\(loaded&&playing&&!casterReview\.active\)updateDuel\(dt\)/);
});

test('Space validates range once on press and retains target after moving out',async()=>{
 const [{createCasterLayerSystem},{createCasterMobility}]=await Promise.all([
  moduleFrom('caster-animation-layers.js'),moduleFrom('caster-mobility.js')
 ]);
 const layers=createCasterLayerSystem(three),caster=makeCaster(),ui=mockUI();
 const enemy={role:'summon',side:'enemy',outer:{position:{x:0,z:4.6}}};
 let shots=0,received=null,checks=0;
 const getAttackTarget=()=>{
  checks++;
  const distance=Math.hypot(caster.outer.position.x-enemy.outer.position.x,
   caster.outer.position.z-enemy.outer.position.z);
  return distance<=3?enemy:null;
 };
 try{
  const ctl=createCasterMobility({
   THREE:three,layers,getCaster:()=>caster,prepareClips:()=>new Promise(()=>{}),
   getAttackTarget,onAttack:(source,target)=>{shots++;received=target;},
   onModeChange:()=>true
  });
  // First press at 3.1 distance: absolutely no attack animation or cooldown.
  enemy.outer.position.z=4.4;
  ui.handlers.keydown(keyboard('Space'));
  for(let i=0;i<15;i++)ctl.step(.05);
  assert.equal(shots,0);
  assert.equal(caster.mixer.actions.size>0,true);
  assert.equal([...caster.mixer.actions.values()].some(a=>a.clip.name==='Attack_upper'),false);
  // At 2.9 distance attack is admitted and target locked.
  enemy.outer.position.z=4.6;
  ui.handlers.keydown(keyboard('Space'));
  // The caster walks backwards, so by the time release happens enemy is out of reach.
  ui.handlers.keydown(keyboard('KeyS'));
  for(let i=0;i<12;i++)ctl.step(.05);
  assert.ok(Math.abs(caster.outer.position.z-enemy.outer.position.z)>3);
  assert.equal(shots,1,'previously accepted shot must launch even after leaving range');
  assert.equal(received,enemy,'release must retain the target captured at Space press');
  assert.equal(checks,2,'never recheck range at release');
  ctl.disable();
 }finally{ui.restore();}
});

test('range indicator updates while selected caster stands idle; no WASD activation required',async()=>{
 const arena=await read('arena-25d.html');
 assert.match(arena,/const side=qs\('#casterMoveSide'\)\.value/);
 assert.match(arena,/const selectedCaster=casters\.find\(c=>c\.side===side\)/);
 assert.match(arena,/if\(c===selectedCaster\)casterRangeIndicator\.update\(c,/);
 assert.doesNotMatch(arena,/const controlled=casterMovement\?\.enabled\?casterMovement\.caster:null/);
});

test('accepted range-three caster spell keeps target and resolves impact after movement',async()=>{
 const arena=await read('arena-25d.html');
 assert.match(arena,/launchSpell\(c,lockedTarget,\{manualCasterShot:true\}\)/);
 assert.match(arena,/function launchSpell\(attacker,target,\{manualCasterShot=false\}=\{\}\)/);
 assert.match(arena,/manualCasterShot,\s*aimX:impact\.x/);
 assert.match(arena,/m\.manualCasterShot\|\|a<\.85/);
 assert.match(arena,/if\(m\.manualCasterShot\|\|/);
 assert.match(arena,/if\(current\.row===m\.impactCell\.row&&current\.col===m\.impactCell\.col\)/);
});

test('summons attack the first enemy actually within their range, not distant spawned summons',async()=>{
 const html=await read('arena-25d.html');
 const begin=html.indexOf('function selectCombatTarget(c){');
 const end=html.indexOf('let loaded=false,playing=true',begin);
 assert.ok(begin>0&&end>begin,'targeting function should be present');
 const make=(side,z,role='summon',range=1.5,x=0)=>({
  role,side,stage:'active',hp:3,range,outer:{position:{x,z}}
 });
 const ally=make('ally',5);
 const caster=make('enemy',-7.5,'caster');
 const closeSummon=make('enemy',3.6);
 const remoteSummon=make('enemy',-3);
 const combatants=[ally,closeSummon,remoteSummon],casters=[caster];
 const valid=c=>c.stage==='active'&&c.hp>0;
 const current=c=>c.duelOpponent||null;
 const release=c=>{
  if(c.duelOpponent){c.duelOpponent.duelOpponent=null;c.duelOpponent=null;}
 };
 const reserve=(a,b)=>{
  if(b.duelOpponent)return false;
  a.duelOpponent=b;b.duelOpponent=a;return true;
 };
 const select=new Function('combatants','casters','canDamageTarget',
  'currentSummonDuel','reserveSummonDuel','releaseSummonDuel',
  html.slice(begin,end)+'\nreturn selectCombatTarget;')(
  combatants,casters,valid,current,reserve,release
 );
 assert.equal(select(ally),closeSummon,'attack opponent in actual reach');
 assert.equal(ally.duelOpponent,closeSummon,'duel reservation occurs only in range');
 closeSummon.outer.position.z=-1;
 assert.equal(select(ally),caster,'head to enemy caster instead of chasing distant summons');
 assert.equal(ally.duelOpponent,null,'release distant duel lock');
 assert.equal(remoteSummon.duelOpponent,undefined,'distant summons never reserved');
 caster.outer.position.z=4.5;
 assert.equal(select(ally),caster,'caster is attackable when encountered first');
 const nearer=make('enemy',4.7);
 combatants.push(nearer);
 assert.equal(select(ally),nearer,'nearest encountered enemy wins in attack range');
});

test('summon casting does not fire at enemy caster outside actual attack range',async()=>{
 const html=await read('arena-25d.html');
 assert.match(html,/const inCastRange=priority&&Math\.hypot\(/);
 assert.match(html,/priority\.outer\.position\.z-c\.outer\.position\.z\)<=c\.range\+\.005/);
 assert.match(html,/c\.castTarget=inCastRange&&canDamageTarget\(priority\)/);
 assert.doesNotMatch(html,/const candidates=\[\.\.\.available,enemyCaster\]/);
});

test('Arena 15x30 has consistent grid, spawns, coordinate conversions and movement bounds',async()=>{
 const [html,mob,overlay]=await Promise.all([
  read('arena-25d.html'),read('caster-mobility.js'),read('arena-scene-overlay.js')
 ]);
 assert.match(html,/const W=15,D=30/);
 assert.match(html,/const HALF_W=\(W-1\)\/2,HALF_D=\(D-1\)\/2/);
 assert.match(html,/const SPAWN_Z=HALF_D,CASTER_Z=HALF_D-1/);
 assert.match(html,/for\(let row=0;row<D;row\+\+\)for\(let col=0;col<W;col\+\+\)/);
 assert.match(html,/row<D\/2\?'enemy':'ally'/);
 assert.match(html,/for\(let row=0;row<D;row\+\+\)for\(let col=0;col<W;col\+\+\)/);
 assert.match(html,/function inBoard\(col,row\)\{return col>=0&&col<W&&row>=0&&row<D;/);
 assert.match(html,/Math\.round\(x\+HALF_W\)/);
 assert.match(html,/Math\.round\(z\+HALF_D\)/);
 assert.match(html,/cellToWorld\(col,row\)\{return \{x:col-HALF_W,z:row-HALF_D\}/);
 assert.match(html,/bounds:\{x:MAX_X,z:MAX_Z\}/);
 assert.match(mob,/bounds=\{x:7\.25,z:14\.75\}/);
 assert.match(mob,/,-bounds\.x,bounds\.x\)/);
 assert.match(mob,/,-bounds\.z,bounds\.z\)/);
 assert.match(overlay,/x:finite\(raw\.x,-7\.5,7\.5\)/);
 assert.match(overlay,/z:finite\(raw\.z,-15,15\)/);
 assert.doesNotMatch(html,/const W=9,D=18/);
 assert.doesNotMatch(html,/for\(let row=0;row<18;row\+\+\)/);
 assert.doesNotMatch(html,/for\(let col=0;col<9;col\+\+\)/);
 const W=15,D=30,HW=(W-1)/2,HD=(D-1)/2;
 const w2c=(x,z)=>({col:Math.max(0,Math.min(W-1,Math.round(x+HW))),
  row:Math.max(0,Math.min(D-1,Math.round(z+HD)))});
 const c2w=(col,row)=>({x:col-HW,z:row-HD});
 for(const [col,row] of [[0,0],[14,29],[7,14],[7,15],[1,25]]){
  const p=c2w(col,row);
  assert.deepEqual(w2c(p.x,p.z),{col,row});
 }
 assert.deepEqual(w2c(0,14.5),{col:7,row:29});
 assert.deepEqual(w2c(0,-14.5),{col:7,row:0});
});
