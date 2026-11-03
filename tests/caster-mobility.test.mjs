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
 assert.match(html,/v0\.9\.17 · WASD/);
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
