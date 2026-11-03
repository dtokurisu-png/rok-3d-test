import test from 'node:test';
import assert from 'node:assert/strict';
import {createViewerCasterMovement} from '../viewer-caster-movement.js';
function setup(){
 const prevDoc=globalThis.document,prevWin=globalThis.window;
 const nodes={},windows={},documents={},buttons=[];
 const el=(id,value='')=>nodes[id]={
  id,value,checked:false,dataset:{},textContent:'',events:{},
  addEventListener(type,fn){this.events[type]=fn},
  blur(){},setPointerCapture(){}
 };
 for(const id of ['viewerMoveEnable','viewerMoveStatus','viewerMoveSpeed',
  'viewerMoveSpeedValue','viewerMoveKeys','viewerAttackButton','viewerDefenseButton'])
  el(id,id==='viewerMoveSpeed'?'3.8':'');
 for(const code of ['KeyW','KeyA','KeyS','KeyD']){
  const b=el('button'+code);b.dataset.wasd=code;buttons.push(b);
 }
 globalThis.document={
  getElementById:id=>nodes[id],querySelectorAll:()=>buttons,
  addEventListener:(k,fn)=>documents[k]=fn,hidden:false
 };
 globalThis.window={addEventListener:(k,fn)=>windows[k]=fn};
 const position={x:0,y:0,z:0,clone(){return{x:this.x,y:this.y,z:this.z}},
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;}};
 const model={position,rotation:{y:0}};
 const mixer={stopAllAction(){},clipAction(){return{reset(){return this},play(){return this}}}};
 const clips={6:{name:'Back'},7:{name:'Run'},15:{name:'Strafe Right'},
  16:{name:'Strafe Left'}};
 const events=[];let requested=[],idleRestored=0;
 const controller=createViewerCasterMovement({
  getCharacter:()=> 'lioren',getModel:()=>model,getMixer:()=>mixer,
  getClip:id=>clips[id],
  async ensureClip(id){requested.push(id);clips[id]={name:String(id)};},
  async ensureIdle(){return {name:'Standing Idle',duration:1}},
  async getActionClip(kind){events.push(['loadAction',kind]);
   return{name:kind,duration:kind==='attack'?1.2:2};},
  makeLayers:()=>({
   register(c,clips){events.push(['register',Object.keys(clips)])},
   movement(c,kind){events.push(['movement',kind])},
   upper(c,kind,clip,speed){events.push(['upper',kind,speed]);return true},
   endUpper(c,kind){events.push(['end',kind])},
   reset(c){events.push(['reset'])}
  }),
  playIdle(){idleRestored++}
 });
 const press=(code,down=true)=>windows[down?'keydown':'keyup']({
  code,repeat:false,target:null,preventDefault(){}
 });
 const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
 const enable=async()=>{nodes.viewerMoveEnable.checked=true;
  nodes.viewerMoveEnable.events.change();await settle();};
 const restore=()=>{controller.disable();globalThis.document=prevDoc;globalThis.window=prevWin;};
 return{nodes,model,events,requested,controller,press,settle,enable,restore,
  idleCount:()=>idleRestored};
}
test('viewer WASD moves in the intended directions at 3.8 without refetching cached FBX',async()=>{
 const h=setup();
 try{
  await h.enable();
  assert.equal(h.controller.enabled,true);
  assert.ok(Math.abs(h.model.rotation.y-Math.PI)<1e-10);
  h.press('KeyW');h.controller.update(.05);await h.settle();
  assert.ok(h.model.position.z<0);
  h.press('KeyW',false);h.press('KeyD');h.controller.update(.05);await h.settle();
  assert.ok(h.model.position.x>0);
  h.press('KeyD',false);h.press('KeyA');h.controller.update(.05);await h.settle();
  assert.ok(Math.abs(h.model.position.x)<1e-9);
  assert.deepEqual(h.requested,[],'existing FBX clips must not redownload');
  assert.ok(h.events.some(e=>e[0]==='register'&&e[1].includes('right')));
  assert.ok(h.events.some(e=>e[0]==='register'&&e[1].includes('left')));
 }finally{h.restore();}
 assert.equal(h.model.rotation.y,0);
 assert.equal(h.model.position.z,0);
 assert.equal(h.idleCount(),1);
});
test('viewer Space and Shift preview layered action clips with no combat callbacks',async()=>{
 const h=setup();
 try{
  await h.enable();
  h.press('KeyW');h.controller.update(.05);
  h.press('Space');await h.settle();
  assert.ok(h.events.some(e=>e[0]==='upper'&&e[1]==='attack'));
  h.press('ShiftLeft');await h.settle();
  assert.ok(h.events.some(e=>e[0]==='upper'&&e[1]==='defense'));
  assert.equal(h.controller.defending,true);
  h.press('ShiftLeft',false);
  assert.equal(h.controller.defending,false);
  assert.ok(h.events.some(e=>e[0]==='end'&&e[1]==='defense'));
  assert.ok(h.events.some(e=>e[0]==='movement'&&e[1]==='forward'));
  assert.deepEqual(h.requested,[]);
 }finally{h.restore();}
});
test('viewer action buttons trigger the same animation-only commands',async()=>{
 const h=setup();
 try{
  await h.enable();
  h.nodes.viewerAttackButton.events.click();
  await h.settle();
  assert.ok(h.events.some(e=>e[0]==='upper'&&e[1]==='attack'));
  const event={preventDefault(){},pointerId:1};
  h.nodes.viewerDefenseButton.events.pointerdown(event);
  await h.settle();
  assert.equal(h.controller.defending,true);
  h.nodes.viewerDefenseButton.events.pointerup();
  assert.equal(h.controller.defending,false);
 }finally{h.restore();}
});
