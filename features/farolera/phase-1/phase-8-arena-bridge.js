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
  const defensive=plan.mode==='defensive';
  const result=defensive?
   activateChiaraDefensiveLantern(e.controller,plan,{farolera:snapshot(c)}):
   activateChiaraFaroleraCircle(e.controller,plan,{farolera:snapshot(c)});
  if(!result.ok)return false;
  disposeVisual(e);
  e.plan=plan;e.time=0;
  if(defensive){
   e.step='throw-animation';setClipSegment(e,2);
  }else{
   e.circle=makeCircle(plan.circle,c.side);
   e.step='circle-animation';
   const hasClip=setClipSegment(e,14,26,50);
   e.stageTime=hasClip?Math.max(.30,e.animEnd-26/30):.75;
  }
  return true;
 }
 function throwLantern(e){
  const c=e.unit;
  let result;
  try{
   result=e.plan.mode==='defensive'?{ok:true}:
    activateChiaraFaroleraLantern(e.controller);
  }catch(error){
   console.warn('[ROK Farolera] Lanzamiento inválido:',error);
   e.step='idle';return;
  }
  if(!result.ok){e.step='idle';return}
  // Both offensive and defensive lamp launches validate the actual current
  // Farolera position, never an earlier planned or future position.
  if(distanceXZ(snapshot(c),e.plan.lamp)>4+1e-8){
   console.warn('[ROK Farolera] Farol fuera de alcance al lanzar');
   e.step='idle';return;
  }
  const oldLantern=e.lantern;
  if(oldLantern){clearNode(oldLantern.group);clearNode(oldLantern.chain)}
  e.lantern=makeLantern(c);
  if(c.lamp){c.lamp.visible=false;e.hiddenLamp=true}
  e.throwPlan=prepareLanternThrow(snapshot(c),e.plan.lamp);
  e.step='throw-flight';e.time=0;
  e.lantern.group.position.set(c.outer.position.x,.85,c.outer.position.z);
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
    if(t===1){
     e.step=e.plan.mode==='defensive'?'defense-wait':'idle';
     e.time=0;setAnim(c,'idle',{fade:.16});
    }
   }else if(e.step==='defense-wait'){
    // Rescue circles are cast only when the beneficiary actually faces danger.
    // Farolera can move with allies after depositing the lamp.
    e.time+=dt;
    const target=combatants.find(u=>getId(u)===e.plan.targetId&&u.hp>0&&
      !['dead','dying','vanishing'].includes(u.stage));
    const rescue=target||c;
    const t=assessFaroleraThreat(snapshot(rescue),opponents);
    const origin=snapshot(c),destination=snapshot(rescue);
    if((t.danger>0||t.lethal)&&distanceXZ(origin,destination)<=4+1e-8&&
      distanceXZ(destination,e.plan.lamp)>1.15){
     const result=activateChiaraDefensiveCircle(e.controller,{
      farolera:origin,circle:{x:destination.x,z:destination.z}
     });
     if(result.ok){
      e.circle=makeCircle(destination,c.side);
      e.step='circle-animation-defense';e.time=0;
      const hasClip=setClipSegment(e,14,26,50);
      e.stageTime=hasClip?Math.max(.30,e.animEnd-26/30):.75;
     }
    }
    if(e.lantern)linkChain(c,e.lantern);
   }else if(e.step==='circle-animation-defense'){
    e.time+=dt;
    if(e.time>=e.stageTime){e.step='idle';setAnim(c,'idle',{fade:.16});}
    if(e.lantern)linkChain(c,e.lantern);
   }else if(e.lantern){
    linkChain(c,e.lantern);
   }
   if(e.circle){
    e.circle.rotation.y+=dt*.45;
    const fx=e.circle.userData.magicPulse;
    if(fx){
     fx.phase+=dt*3.1;
     const wave=Math.sin(fx.phase);
     const pulse=1+.035*wave;
     e.circle.scale.set(pulse,1,pulse);
     for(const item of fx.animated)
      item.material.opacity=item.baseOpacity*(.91+.09*wave);
     fx.light.intensity=fx.baseLight*(.90+.10*wave);
    }
   }
   const units=['throw-flight','circle-animation-defense'].includes(e.step)?[]:getUnits(e);
   const {ability,transfers}=tickChiaraFarolera(e.controller,dt,units);
   if(!ability.portalActive&&e.step==='idle'&&e.circle)disposeVisual(e);
   for(const transfer of transfers){
    const unit=combatants.find(u=>getId(u)===transfer.id);
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
  return !!e&&e.step!=='idle'&&e.step!=='defense-wait';
 }
 /**
  * Defensive escort: follow the threatened ally rather than chasing the
  * enemy caster while the retreat lamp is already positioned behind.
  * Called from the existing arena's movement loop, not a parallel game loop.
  */
 function escort(c,dt){
  const e=entries.get(c);
  if(!e||c.stage!=='active')return false;
  // The Farolera is a tactical support unit. Hold her in the back during
  // offense so an incoming ally can use the full four-cell portal projection.
  if(e.step==='idle'&&e.controller.order==='offensive'){
   setAnim(c,'idle',{fade:.15});return true;
  }
  if(e.step!=='defense-wait')return false;
  const target=combatants.find(u=>getId(u)===e.plan.targetId&&u!==c&&u.hp>0&&
   !['dead','dying','vanishing'].includes(u.stage));
  if(!target)return false;
  const dx=target.outer.position.x-c.outer.position.x;
  const dz=target.outer.position.z-c.outer.position.z;
  const dist=Math.hypot(dx,dz);
  if(dist>1.35){
   const step=Math.min((c.speed||2)*dt,dist-1.35);
   c.outer.position.x=THREE.MathUtils.clamp(c.outer.position.x+dx/dist*step,-7.25,7.25);
   c.outer.position.z=THREE.MathUtils.clamp(c.outer.position.z+dz/dist*step,-14.75,14.75);
   setAnim(c,12,{fade:.16});
  }else setAnim(c,'idle',{fade:.15});
  return true;
 }
 function lanternDeployed(c){
  const e=entries.get(c);
  return !!(e?.hiddenLamp);
 }
 return {tick,reset,remove,immobilized,lanternDeployed,escort};
}
