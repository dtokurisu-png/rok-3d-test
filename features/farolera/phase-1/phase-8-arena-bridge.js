/**
 * Farolera — Arena 2.5D integration bridge.
 * Visuals and phase progression are localized here. Chiara orders the mode,
 * Farolera's existing phase 4-8 modules own the rules.
 */
import {
 createChiaraFaroleraController,orderFaroleraMode,proposeChiaraFaroleraAction,
 activateChiaraFaroleraCircle,activateChiaraFaroleraLantern,
 tickChiaraFarolera,chiaraFaroleraDeath
} from './phase-8-chiara-controller.js';
import {assessFaroleraThreat} from './phase-7-defense.js';
import {lerpLanternPosition,prepareLanternThrow} from './phase-3-lantern.js';

export function createFaroleraArenaIntegration({THREE,root,combatants,casters,getClip,setAnim,releaseDuel}){
 const entries=new Map();
 let uid=0;
 const maxRange=4;
 const snapshot=c=>{
  const p=c.outer.position;
  const q={id:c.rokFaroleraId??c.rokAbilityId,side:c.side,role:c.role,
   stage:c.stage,hp:c.hp,x:p.x,z:p.z,
   attackDamage:c.attackDamage??0,range:c.range??1.5};
  const target=c.currentThreatTarget;
  if(target?.outer&&target.stage==='active'){
   const dx=target.outer.position.x-p.x,dz=target.outer.position.z-p.z;
   const d=Math.hypot(dx,dz)||1;
   const speed=c.speed??0;
   q.vx=dx/d*speed;q.vz=dz/d*speed;
  }else{q.vx=c.rokVx??0;q.vz=c.rokVz??0}
  return q;
 };
 const clearNode=n=>{
  if(!n)return;
  n.parent?.remove(n);
  n.traverse(o=>{
   o.geometry?.dispose?.();
   const mats=o.material?Array.isArray(o.material)?o.material:[o.material]:[];
   for(const m of mats)m.dispose?.();
  });
 };
 function makeCircle(p,side){
  const group=new THREE.Group();group.position.set(p.x,.07,p.z);
  const m=new THREE.MeshBasicMaterial({color:side==='enemy'?0xb692ff:0x5dffdc,
   transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide});
  for(const [r,thick] of [[.42,.035],[.29,.014]]){
   const ring=new THREE.Mesh(new THREE.RingGeometry(r,r+thick,48),m.clone());
   ring.rotation.x=-Math.PI/2;group.add(ring);
  }
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7;
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(.085,.12),
    new THREE.MeshBasicMaterial({color:0xd6fff4,side:THREE.DoubleSide,transparent:true,opacity:.88}));
   sign.rotation.x=-Math.PI/2;
   sign.rotation.z=a;
   sign.position.set(Math.cos(a)*.35,.003,Math.sin(a)*.35);
   group.add(sign);
  }
  root.add(group);return group;
 }
 function makeLantern(c){
  const group=new THREE.Group();root.add(group);
  const cage=new THREE.Mesh(new THREE.CylinderGeometry(.13,.10,.31,8),
   new THREE.MeshStandardMaterial({color:0x967345,metalness:.65,roughness:.35,
    emissive:0xb98e26,emissiveIntensity:.6}));
  group.add(cage);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),
   new THREE.MeshBasicMaterial({color:0xffe7aa}));
  group.add(glow);
  const pointLight=new THREE.PointLight(0xffd89b,2.3,3.5,2);
  group.add(pointLight);
  const chainMat=new THREE.MeshStandardMaterial({color:0x9c9c91,metalness:.68,roughness:.4});
  const chain=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,1,8),chainMat);
  root.add(chain);
  return {group,chain,pointLight};
 }
 function linkChain(c,v){
  c.model.updateMatrixWorld(true);
  const hand=(c.castHand||c.anchor||c.model).getWorldPosition(new THREE.Vector3());
  const end=v.group.position;
  const mid=hand.clone().add(end).multiplyScalar(.5);
  const delta=end.clone().sub(hand);
  v.chain.position.copy(mid);
  v.chain.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
  v.chain.scale.set(1,Math.max(.001,delta.length()),1);
 }
 function active(c){return c.stage==='active'&&c.hp>0&&c.model?.visible}
 function restoreLantern(c,e){
  if(c.lamp&&e.hiddenLamp){c.lamp.visible=true;e.hiddenLamp=false}
 }
 function disposeVisual(e){
  clearNode(e.circle);e.circle=null;
  if(e.lantern){clearNode(e.lantern.group);clearNode(e.lantern.chain);e.lantern=null}
  restoreLantern(e.unit,e);
 }
 function attach(c){
  if(entries.has(c))return entries.get(c);
  const side=c.side,ownerCaster=casters.find(k=>k.side===side);
  if(!ownerCaster)return null;
  c.rokFaroleraId='farolera-'+(++uid)+'-'+side;
  const controller=createChiaraFaroleraController({
   chiaraId:'chiara-'+side,faroleraId:c.rokFaroleraId,side
  });
  const e={unit:c,controller,step:'idle',time:0,circle:null,lantern:null,
   plan:null,hiddenLamp:false,lastMode:null,finished:false};
  entries.set(c,e);
  return e;
 }
 function remove(c){
  const e=entries.get(c);if(!e)return;
  chiaraFaroleraDeath(e.controller);
  disposeVisual(e);entries.delete(c);
 }
 function reset(){for(const c of [...entries.keys()])remove(c)}
 function setClipSegment(e,id,startFrame=0,endFrame=null){
  const c=e.unit;
  const clip=getClip(c,id);
  if(!clip)return false;
  if(!setAnim(c,id,{once:true,fade:.12,force:true}))return false;
  if(c.animAction){
   const fps=30;
   const start=Math.min(Math.max(0,clip.duration-.04),startFrame/fps);
   const end=endFrame===null?clip.duration:Math.min(clip.duration,endFrame/fps);
   c.animAction.time=start;
   c.animAction.paused=false;
   e.animEnd=Math.max(start+.1,end);
   c.mixer.update(0);
  }
  return true;
 }
 function begin(e,plan){
  const c=e.unit;
  const result=activateChiaraFaroleraCircle(e.controller,plan,{farolera:snapshot(c)});
  if(!result.ok)return false;
  disposeVisual(e);
  e.plan=plan;e.circle=makeCircle(plan.circle,c.side);
  e.step='circle-animation';e.time=0;
  const clip=getClip(c,14);
  const hasClip=!!clip&&setClipSegment(e,14,26,50);
  e.stageTime=hasClip?Math.max(.30,e.animEnd-26/30):.75;
  return true;
 }
 function throwLantern(e){
  const c=e.unit;
  let result;
  try{result=activateChiaraFaroleraLantern(e.controller)}
  catch(error){console.warn('[ROK Farolera] Lanzamiento inválido:',error);e.step='idle';return}
  if(!result.ok){e.step='idle';return}
  const oldLantern=e.lantern;
  if(oldLantern){clearNode(oldLantern.group);clearNode(oldLantern.chain)}
  e.lantern=makeLantern(c);
  if(c.lamp){c.lamp.visible=false;e.hiddenLamp=true}
  e.throwPlan=prepareLanternThrow(snapshot(c),e.plan.lamp);
  e.step='throw-flight';e.time=0;
  e.lantern.group.position.set(c.outer.position.x,.85,c.outer.position.z);
 }
 function getUnits(){
  return combatants.filter(c=>c.role==='summon'&&c.hp>0&&!['dead','vanishing','dying'].includes(c.stage))
   .map(snapshot);
 }
 function chooseChiaraMode(c,friendlies,opponents){
  // Chiara chooses the stance, not the Farolera: critical rescue beats offense.
  const self=snapshot(c);
  const risky=[self,...friendlies].some(u=>{
   const t=assessFaroleraThreat(u,opponents);
   return t.lethal||t.danger>=1.3;
  });
  return risky?'defensive':'offensive';
 }
 function tick(dt){
  const current=combatants.filter(c=>c.cardId==='farolera');
  for(const c of current)if(!entries.has(c))attach(c);
  for(const [c,e] of entries){
   if(!combatants.includes(c)){remove(c);continue}
   const caster=casters.find(k=>k.side===c.side&&k.stage==='active');
   if(!caster||!c.hp||['dead','vanishing','dying'].includes(c.stage)){
    remove(c);continue;
   }
   const own=snapshot(c);
   const friends=combatants.filter(u=>u!==c&&u.side===c.side&&u.hp>0&&u.role==='summon')
    .map(snapshot);
   const opponents=[...combatants,...casters].filter(u=>u.side!==c.side&&u.hp>0)
    .map(snapshot);
   const mode=chooseChiaraMode(c,friends,opponents);
   // A change of strategic order never interrupts an animation in progress.
   if(e.step==='idle'&&e.controller.order!==mode){
    orderFaroleraMode(e.controller,{issuerId:e.controller.chiaraId,mode});
   }
   if(e.step==='circle-animation'){
    e.time+=dt;
    if(e.time>=e.stageTime){
     setClipSegment(e,2);
     e.step='throw-animation';e.time=0;
    }
   }else if(e.step==='throw-animation'){
    e.time+=dt;
    if(e.time>=.35)throwLantern(e);
   }else if(e.step==='throw-flight'){
    e.time+=dt;
    const t=Math.min(1,e.time/e.throwPlan.duration);
    const v=lerpLanternPosition(e.throwPlan,t);
    e.lantern.group.position.set(v.x,v.height,v.z);
    linkChain(c,e.lantern);
    if(t===1){e.step='idle';setAnim(c,'idle',{fade:.16});}
   }else if(e.lantern){
    // The hand moves with subsequent character animations while the lantern
    // remains at its landed location; the chain is always re-anchored.
    linkChain(c,e.lantern);
   }
   if(e.circle){
    e.circle.rotation.y+=dt*.45;
   }
   const units=e.step==='throw-flight'?[]:getUnits();
   const {ability,transfers}=tickChiaraFarolera(e.controller,dt,units);
   if(!ability.portalActive&&e.step==='idle'&&e.circle)disposeVisual(e);
   for(const transfer of transfers){
    const unit=combatants.find(u=>u.rokFaroleraId===transfer.id||u.rokAbilityId===transfer.id);
    if(!unit||!active(unit))continue;
    releaseDuel(unit);
    unit.outer.position.set(transfer.to.x,unit.outer.position.y,transfer.to.z);
    unit.currentThreatTarget=null;
   }
   if(e.step==='idle'&&ability.canCast&&active(c)){
    const plan=proposeChiaraFaroleraAction(e.controller,{
     farolera:own,allies:friends,enemies:opponents,
     friendlyCaster:snapshot(caster),
     enemyCaster:opponents.find(u=>u.role==='caster')
    });
    if(plan.ok)begin(e,plan);
   }
  }
 }
 function immobilized(c){
  const e=entries.get(c);
  return !!e&&e.step!=='idle';
 }
 function lanternDeployed(c){
  const e=entries.get(c);
  return !!(e?.hiddenLamp);
 }
 return {tick,reset,remove,immobilized,lanternDeployed};
}
