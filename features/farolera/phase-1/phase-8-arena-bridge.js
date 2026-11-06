/**
 * Farolera — Arena 2.5D integration bridge.
 * Visuals and phase progression are localized here. Chiara orders the mode,
 * Farolera's existing phase 4-8 modules own the rules.
 */
import {
 createChiaraFaroleraController,orderFaroleraMode,proposeChiaraFaroleraAction,
 activateChiaraFaroleraCircle,activateChiaraFaroleraLantern,
 activateChiaraDefensiveLantern,activateChiaraDefensiveCircle,
 tickChiaraFarolera,chiaraFaroleraDeath
} from './phase-8-chiara-controller.js';
import {assessFaroleraThreat} from './phase-7-defense.js';
import {directedLampPosition,directedTarget,canDirectedCast,DIRECTED_TELEPORT_COOLDOWN}
 from './phase-9-directed-teleport.js';
import {lerpLanternPosition,prepareLanternThrow,distanceXZ} from './phase-3-lantern.js';

export function createFaroleraArenaIntegration({THREE,root,combatants,casters,getClip,setAnim,releaseDuel}){
 const entries=new Map();
 let uid=0;
 const unitIds=new WeakMap();
 const getId=c=>{
  if(c.rokFaroleraId)return c.rokFaroleraId;
  if(!unitIds.has(c))unitIds.set(c,'arena-unit-'+(++uid));
  return unitIds.get(c);
 };
 const snapshot=c=>{
  const p=c.outer.position;
  const q={id:getId(c),side:c.side,role:c.role,
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
  // Brighter magic circle: separate concentric runes, additive halos, and
  // a restrained real light. This remains purely visual (portal radius .48).
  const group=new THREE.Group();group.position.set(p.x,.072,p.z);
  group.name='ROK_Farolera_BrightPortalCircle';
  const isEnemy=side==='enemy';
  const primary=isEnemy?0xd1b6ff:0x9afff3;
  const halo=isEnemy?0xb89aff:0x66fce0;
  const addMaterial=(color,opacity)=>new THREE.MeshBasicMaterial({
   color,transparent:true,opacity,depthWrite:false,depthTest:true,
   side:THREE.DoubleSide,blending:THREE.AdditiveBlending
  });
  const animated=[];
  const addSurface=(mesh,baseOpacity)=>{
   mesh.rotation.x=-Math.PI/2;
   mesh.renderOrder=15;
   group.add(mesh);
   animated.push({material:mesh.material,baseOpacity});
   return mesh;
  };
  // Wide, soft halo and internal energy — visually larger than the
  // collision circle, without changing the actual teleport activation area.
  const outer=addSurface(new THREE.Mesh(
   new THREE.RingGeometry(.45,.74,64),addMaterial(halo,.26)),.26);
  outer.position.y=.001;
  const inner=addSurface(new THREE.Mesh(
   new THREE.CircleGeometry(.35,64),addMaterial(primary,.16)),.16);
  inner.position.y=.002;
  for(const [radius,width,opacity] of [[.42,.047,1],[.31,.018,.86],[.19,.014,.69]]){
   const ring=addSurface(new THREE.Mesh(
    new THREE.RingGeometry(radius,radius+width,64),
    addMaterial(primary,opacity)),opacity);
   ring.position.y=.004;
  }
  // Eight high-contrast glyph marks, with each material pulse-managed once.
  for(let i=0;i<8;i++){
   const angle=i*Math.PI/4;
   const rune=addSurface(new THREE.Mesh(
    new THREE.PlaneGeometry(.080,.13),addMaterial(0xffffff,.98)),.98);
   rune.rotation.z=angle;
   rune.position.set(Math.cos(angle)*.375,.006,Math.sin(angle)*.375);
  }
  const circleLight=new THREE.PointLight(halo,1.35,3,2);
  circleLight.position.set(0,.55,0);group.add(circleLight);
  group.userData.magicPulse={
   phase:0,animated,light:circleLight,baseLight:1.35
  };
  root.add(group);return group;
 }
 function makeLantern(c){
  const group=new THREE.Group();root.add(group);
  const cage=new THREE.Mesh(new THREE.CylinderGeometry(.13,.10,.31,8),
   new THREE.MeshStandardMaterial({color:0x135d9a,metalness:.6,roughness:.28,
    emissive:0x008ff6,emissiveIntensity:1.3}));
  group.add(cage);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),
   new THREE.MeshBasicMaterial({color:0x77eaff}));
  group.add(glow);
  const pointLight=new THREE.PointLight(0x27baff,3.4,5.5,1.5);
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
   plan:null,hiddenLamp:false,lastMode:null,finished:false,
   cooldown:0,target:null,castSnapshot:null,transitGlow:null};
  entries.set(c,e);
  return e;
 }
 function remove(c){
  const e=entries.get(c);if(!e)return;
  chiaraFaroleraDeath(e.controller);
  clearNode(e.transitGlow);e.transitGlow=null;
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
 // The lamp is always the FIRST activation. One target, one cast, no
 // persistent portal entry detection. The target is selected at cast time.
 function begin(e,plan){
  const c=e.unit;
  if(e.step!=='idle'||e.cooldown>0)return false;
  if(!canDirectedCast(snapshot(c),e.opponents||[],c.duelOpponent))return false;
  disposeVisual(e);
  e.plan=plan;e.target=null;e.time=0;
  e.step='throw-animation';
  setClipSegment(e,2);
  return true;
 }
 function throwLantern(e){
  const c=e.unit;
  const current=snapshot(c);
  if(distanceXZ(current,e.plan.lamp)>4+1e-8){e.step='idle';return}
  e.lantern=makeLantern(c);
  if(c.lamp){c.lamp.visible=false;e.hiddenLamp=true}
  e.throwPlan=prepareLanternThrow(current,e.plan.lamp);
  e.step='throw-flight';e.time=0;
  e.lantern.group.position.set(current.x,.85,current.z);
 }
 function findTarget(e){
  const c=e.unit,mode=e.plan.mode;
  return directedTarget({
   farolera:snapshot(c),
   allies:combatants.filter(u=>u!==c&&u.side===c.side&&u.role==='summon'&&u.hp>0).map(snapshot),
   enemies:e.opponents||[],mode,
   inCombat:u=>{
    const actual=combatants.find(x=>getId(x)===u.id);
    return !!actual?.duelOpponent;
   }
  });
 }
 function beginTransport(e){
  if(!e.lantern||!e.plan)return false;
  const c=e.unit;
  if(!canDirectedCast(snapshot(c),e.opponents||[],c.duelOpponent))return false;
  const chosen=findTarget(e);
  if(!chosen)return false;
  const actual=combatants.find(u=>getId(u)===chosen.id);
  if(!actual||actual.hp<=0||actual.duelOpponent)return false;
  e.target=actual;e.castSnapshot=chosen;
  clearNode(e.circle);
  e.circle=makeCircle(chosen,c.side);
  e.step='transport-cast';e.time=0;
  const clip=getClip(c,14);
  const ok=!!clip&&setClipSegment(e,14,26,50);
  e.stageTime=ok?Math.max(.3,e.animEnd-26/30):.8;
  // Distinct aquamarine glow over the beneficiary while the spell plays.
  const color=c.side==='enemy'?0x59caff:0x00dfff;
  const aura=new THREE.Mesh(new THREE.SphereGeometry(.66,20,12),
   new THREE.MeshBasicMaterial({color,transparent:true,opacity:.12,
    blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));
  aura.position.set(actual.outer.position.x,.85,actual.outer.position.z);
  root.add(aura);e.transitGlow=aura;
  return true;
 }
 function completeTransport(e){
  const c=e.unit,unit=e.target;
  if(unit&&unit.hp>0&&!['dead','dying','vanishing'].includes(unit.stage)){
   const x=e.plan.lamp.x,z=e.plan.lamp.z;
   // Teleport is instantaneous after the cast, never a new movement state.
   // Keep active/casting/attack state, speed and AI movement intact.
   if(unit.duelOpponent){/* Do not remove an active fight. */}
   else{
    unit.outer.position.set(x,unit.outer.position.y,z);
    unit.currentThreatTarget=null;
    if(unit===c)e.finished=true;
   }
  }
  clearNode(e.transitGlow);e.transitGlow=null;
  clearNode(e.circle);e.circle=null;
  e.target=null;e.castSnapshot=null;
  e.step='idle';e.cooldown=DIRECTED_TELEPORT_COOLDOWN;
  setAnim(c,'idle',{fade:.16});
 }
 function getUnits(e){
  return combatants.filter(c=>c.role==='summon'&&c.hp>0&&!['dead','vanishing','dying'].includes(c.stage)&&
    (c!==e.unit||e.controller.order==='defensive'))
   .map(snapshot);
 }
 function chooseChiaraMode(c,friendlies,opponents){
  // Chiara chooses the stance, not the Farolera: critical rescue beats offense.
  const self=snapshot(c);
  const risky=[self,...friendlies].some(u=>{
   const t=assessFaroleraThreat(u,opponents);
   return t.lethal||t.danger>=1.3;
  });
  // Anticipate danger: deploy the defensive lamp before lethal damage.
  const approaching=[self,...friendlies].some(ally=>
   opponents.some(enemy=>enemy.side!==ally.side&&distanceXZ(ally,enemy)<=5.5));
  return risky||approaching?'defensive':'offensive';
 }
 function tick(dt){
  for(const unit of combatants)if(unit.cardId==='farolera'&&!entries.has(unit))attach(unit);
  for(const [c,e] of entries){
   if(!combatants.includes(c)||!c.hp||['dead','dying','vanishing'].includes(c.stage)){
    remove(c);continue;
   }
   e.cooldown=Math.max(0,e.cooldown-dt);
   const caster=casters.find(k=>k.side===c.side&&k.stage==='active');
   if(!caster)continue;
   const own=snapshot(c);
   const friends=combatants.filter(u=>u!==c&&u.side===c.side&&u.hp>0&&u.role==='summon')
    .map(snapshot);
   const opponents=[...combatants,...casters].filter(u=>u.side!==c.side&&u.hp>0)
    .map(snapshot);
   e.opponents=opponents;
   const mode=chooseChiaraMode(c,friends,opponents);
   if(e.step==='idle'&&e.controller.order!==mode)
    orderFaroleraMode(e.controller,{issuerId:e.controller.chiaraId,mode});
   if(e.step==='throw-animation'){
    e.time+=dt;
    if(e.time>=.35)throwLantern(e);
   }else if(e.step==='throw-flight'){
    e.time+=dt;
    const t=Math.min(1,e.time/e.throwPlan.duration);
    const v=lerpLanternPosition(e.throwPlan,t);
    e.lantern.group.position.set(v.x,v.height,v.z);
    linkChain(c,e.lantern);
    if(t>=1){e.step='target-wait';e.time=0;setAnim(c,'idle',{fade:.15})}
   }else if(e.step==='target-wait'){
    // Combat stops initiation, but a fight is never broken just to cast.
    e.time+=dt;
    if(canDirectedCast(snapshot(c),opponents,c.duelOpponent))beginTransport(e);
    if(e.lantern)linkChain(c,e.lantern);
   }else if(e.step==='transport-cast'){
    e.time+=dt;
    if(e.target&&e.target.hp>0&&e.transitGlow){
     e.transitGlow.position.set(e.target.outer.position.x,.85,e.target.outer.position.z);
     const p=Math.min(1,e.time/e.stageTime);
     e.transitGlow.material.opacity=.10+.45*p;
     e.transitGlow.scale.setScalar(.9+.5*p);
    }
    if(e.time>=e.stageTime)completeTransport(e);
    if(e.lantern)linkChain(c,e.lantern);
   }else if(e.lantern)linkChain(c,e.lantern);
   if(e.circle){
    e.circle.rotation.y+=dt*.45;
    const fx=e.circle.userData.magicPulse;
    if(fx){
     fx.phase+=dt*3.1;
     const wave=Math.sin(fx.phase);
     e.circle.scale.set(1+.035*wave,1,1+.035*wave);
     for(const item of fx.animated)item.material.opacity=item.baseOpacity*(.91+.09*wave);
     fx.light.intensity=fx.baseLight*(.90+.10*wave);
    }
   }
   if(e.step==='idle'&&e.cooldown<=0&&active(c)&&
    canDirectedCast(own,opponents,c.duelOpponent)){
    // Launch forward on own half in offense, backward in defense.
    const lamp=directedLampPosition({farolera:own,mode});
    const target=directedTarget({farolera:own,allies:friends,
     enemies:opponents,mode,inCombat:u=>!!combatants.find(x=>getId(x)===u.id)?.duelOpponent});
    if(lamp&&(mode==='defensive'||target)&&distanceXZ(lamp,own)>.3)
     begin(e,{mode,lamp});
   }
  }
 }
 function immobilized(c){
  const e=entries.get(c);
  return !!e&&['throw-animation','throw-flight','transport-cast'].includes(e.step);
 }
 /**
  * Defensive escort: follow the threatened ally rather than chasing the
  * enemy caster while the retreat lamp is already positioned behind.
  * Called from the existing arena's movement loop, not a parallel game loop.
  */
 function escort(c,dt){
  // Do not seize locomotion after a teleport; the normal arena movement
  // and target-acquisition loops continue on their following tick.
  return false;
 }
 function lanternDeployed(c){
  const e=entries.get(c);
  return !!(e?.hiddenLamp);
 }
 return {tick,reset,remove,immobilized,lanternDeployed,escort};
}
