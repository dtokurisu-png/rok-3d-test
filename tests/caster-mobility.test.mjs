import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('Arena has only the compact lower-right D-pad, no wide Studio bar or activation checkbox',async()=>{
 const [html,css]=await Promise.all([read('arena-25d.html'),read('caster-mobility.css')]);
 assert.doesNotMatch(html,/src="\.\/studio\.js"/);
 assert.doesNotMatch(html,/href="\.\/studio\.css"/);
 assert.doesNotMatch(html,/id="casterMoveEnable"/);
 assert.doesNotMatch(html,/id="casterMoveReady"/);
 assert.equal((html.match(/id="casterMobilityPanel"/g)||[]).length,1);
 assert.ok(html.indexOf('id="casterMobilityPanel"')>html.indexOf('id="nameplateLayer"'));
 for(const key of ['KeyW','KeyA','KeyS','KeyD']){
  assert.equal((html.match(new RegExp('data-move-key="'+key+'"','g'))||[]).length,1);
 }
 assert.match(css,/#casterMobilityPanel\{[^}]*position:fixed/);
 assert.match(css,/bottom:calc\(77px/);
 assert.match(css,/width:158px/);
 assert.match(html,/v0\.9\.20 · Espacio / Shift/);
});

test('WASD automatically activates and moves before animation loading completes',async()=>{
 const code=await read('caster-mobility.js');
 const {createCasterMobility}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(code));
 const handlers={},nodes={};
 const makeNode=(name,value='')=>({
  name,value,textContent:'',title:'',dataset:{},listeners:{},
  addEventListener(type,fn){this.listeners[type]=fn;},blur(){},setPointerCapture(){}
 });
 for(const id of ['casterMoveSide','casterMoveSpeed','casterMoveSpeedText','casterMoveStatus'])
  nodes[id]=makeNode(id,id==='casterMoveSide'?'ally':id==='casterMoveSpeed'?'2.2':'');
 const buttons=['KeyW','KeyA','KeyS','KeyD'].map(key=>{
  const b=makeNode(key);b.dataset.moveKey=key;return b;
 });
 const originalDocument=globalThis.document,originalWindow=globalThis.window;
 globalThis.document={
  getElementById:id=>nodes[id],
  querySelectorAll:()=>buttons,
  addEventListener:(event,fn)=>{handlers['document:'+event]=fn;},
  hidden:false
 };
 globalThis.window={addEventListener:(event,fn)=>{handlers['window:'+event]=fn;}};
 const three={LoopRepeat:1,MathUtils:{clamp:(n,lo,hi)=>Math.min(hi,Math.max(lo,n))}};
 const actions=new Map();
 const mixer={
  clipAction(clip){
   if(!actions.has(clip))actions.set(clip,{
    reset(){return this;},setLoop(){return this;},setEffectiveWeight(){},
    setEffectiveTimeScale(){},play(){return this;},fadeIn(){},fadeOut(){},isRunning(){return true}
   });
   return actions.get(clip);
  },stopAllAction(){},update(){}
 };
 const caster={
  stage:'active',side:'ally',outer:{position:{x:0,z:7.5}},
  model:{userData:{rokCasterAsset:'Lioren'}},idleClip:{name:'Idle'},mixer,userData:{}
 };
 let manualMode=false;const keyEvent=code=>({code,target:null,preventDefault(){}});
 try{
  const driver=createCasterMobility({
   THREE:three,getCaster:()=>caster,
   prepareClips:()=>new Promise(()=>{}), // unresolved FBX preload is intentional
   onModeChange:active=>{manualMode=active;return true;}
  });
  handlers['document:keydown'](keyEvent('KeyW'));
  assert.equal(driver.enabled,true);
  assert.equal(manualMode,true);
  driver.step(.05);
  assert.ok(caster.outer.position.z<7.5,'W should move toward rival immediately');
  handlers['document:keyup'](keyEvent('KeyW'));
  const z=caster.outer.position.z;
  driver.step(.05);
  assert.equal(caster.outer.position.z,z,'release should stop translation');
  buttons[1].listeners.pointerdown({pointerId:3,preventDefault(){}});
  driver.step(.05);
  assert.ok(caster.outer.position.x<0,'holding on-screen A should move left');
  buttons[1].listeners.pointerup({pointerId:3});
  driver.disable();
  assert.equal(manualMode,false);
 }finally{
  globalThis.document=originalDocument;
  globalThis.window=originalWindow;
 }
});

test('Arena still keeps combat simulation separated from manual movement and retains original FBX sources',async()=>{
 const [html,loader]=await Promise.all([read('arena-25d.html'),read('caster-movement-loader.js')]);
 assert.match(html,/if\(loaded&&playing&&!casterReview\.active\)updateDuel\(dt\)/);
 assert.doesNotMatch(html,/playing=false;qs\('#pause'\)/);
 assert.match(html,/if\(caster\.stage==='active'&&!?\(casterMovement\?\.enabled&&casterMovement\.caster===caster\)\)/);
 assert.match(html,/if\(loaded&&casterMovement\?\.enabled\)casterMovement\.step\(dt\)/);
 assert.match(html,/casterMovement\.step\(dt\)/);
 assert.match(html,/reviveCaster:c=>/);
 for(const original of ['Standing Idle.fbx','Running Backward.fbx','Running.fbx','Right Strafe.fbx','Right Strafe (1).fbx'])
  assert.ok(loader.includes(original),original);
});

test('Caster combat action 02 uses an actual clip and existing ranged projectile pipeline',async()=>{
 const [arena,control,loader]=await Promise.all([
  read('arena-25d.html'),read('caster-mobility.js'),read('caster-movement-loader.js')
 ]);
 assert.match(arena,/id="casterAttackButton"/);
 assert.match(control,/if\(event\.code==='Space'\)/);
 assert.match(control,/event\.code==='ShiftLeft'\|\|event\.code==='ShiftRight'/);
 assert.match(arena,/id="casterDefenseButton"/);
 assert.match(control,/attackElapsed>=attackDuration\*\.55/);
 assert.match(control,/onAttack\?\.\(c\)/);
 assert.match(arena,/onAttack:c=>\{/);
 assert.match(arena,/launchSpell\(c,enemy\)/);
 assert.match(arena,/c\.attackDamage=1/);
 assert.match(loader,/attack:\{name:'Magic Heal\.fbx',id:2\}/);
 assert.match(loader,/death:\{name:'Sword And Shield Death\.fbx',id:8\}/);
 assert.match(loader,/if\(role==='attack'\|\|role==='death'\)/);
});
test('Caster 08 death playback and match restart do not stop summon animation updates',async()=>{
 const arena=await read('arena-25d.html');
 assert.match(arena,/function playCasterDeath\(target\)/);
 assert.match(arena,/target\.mixer\.clipAction\(clip\)/);
 assert.match(arena,/target\.stage='defeated';\s*playCasterDeath\(target\)/);
 assert.match(arena,/if\(c\.stage==='defeated'&&c\.deathAnimationActive\)c\.mixer\.update\(dt\)/);
 assert.match(arena,/if\(loaded&&playing&&!casterReview\.active\)updateDuel\(dt\)/);
 assert.match(arena,/if\(loaded&&casterMovement\?\.enabled\)casterMovement\.step\(dt\)/);
});

test('F fires exactly once during clip 02 and does not freeze the animation mixer',async()=>{
 const code=await read('caster-mobility.js');
 const {createCasterMobility}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(code));
 const handlers={},nodes={};
 const create=(value='')=>({value,textContent:'',title:'',dataset:{},events:{},
  addEventListener(name,fn){this.events[name]=fn;},blur(){},setPointerCapture(){}});
 for(const [name,value] of [['casterMoveSide','ally'],['casterMoveSpeed','2.2'],['casterMoveSpeedText','2.2'],['casterMoveStatus',''],['casterAttackButton',''],['casterDefenseButton','']])
  nodes[name]=create(value);
 const buttons=['KeyW','KeyA','KeyS','KeyD'].map(key=>{const b=create();b.dataset.moveKey=key;return b;});
 const oldDoc=globalThis.document,oldWindow=globalThis.window;
 globalThis.document={getElementById:id=>nodes[id],querySelectorAll:()=>buttons,
  addEventListener:(name,fn)=>handlers[name]=fn,hidden:false};
 globalThis.window={addEventListener(){}};
 const three={LoopRepeat:1,LoopOnce:2,MathUtils:{clamp:(x,a,b)=>Math.min(b,Math.max(a,x))}};
 let updates=0,hits=0;
 const action={reset(){return this;},setLoop(){return this;},play(){return this;},
  setEffectiveWeight(){},setEffectiveTimeScale(){},fadeIn(){},fadeOut(){},isRunning(){return true}};
 const caster={stage:'active',side:'ally',outer:{position:{x:0,z:7.5}},
  model:{userData:{rokCasterAsset:'Lioren',rokAttackClip:{duration:1}}},idleClip:{duration:1},
  mixer:{clipAction(){return action;},stopAllAction(){},update(){updates++;}},userData:{}};
 try{
  const ctl=createCasterMobility({THREE:three,getCaster:()=>caster,
   prepareClips:()=>new Promise(()=>{}),onModeChange:()=>true,onAttack:()=>hits++});
  handlers.keydown({code:'Space',repeat:false,target:null,preventDefault(){}});
  for(let n=0;n<20;n++)ctl.step(.05);
  assert.equal(hits,1,'the spell is launched only once');
  assert.ok(updates>=19,'the caster mixer continues running');
  ctl.disable();
 }finally{globalThis.document=oldDoc;globalThis.window=oldWindow;}
});

test('F is no longer attack; both Shift keys identify defense as pending',async()=>{
 const [arena,control]=await Promise.all([read('arena-25d.html'),read('caster-mobility.js')]);
 assert.doesNotMatch(control,/KeyF/);
 assert.doesNotMatch(arena,/Ataque · F/);
 assert.match(arena,/Ataque · Espacio/);
 assert.match(arena,/Defensa · Shift/);
 assert.match(control,/Defensa Shift: composición 23 pendiente/);
});
