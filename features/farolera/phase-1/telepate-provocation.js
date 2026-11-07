/**
 * R.O.K. 3D — Telépate de Agua: Aura de Provocación.
 * Port of Nael's factor behavior in R.O.K. Lite:
 * independent rolls per hostile summon, forced target pursuit,
 * timed debuff that refreshes, cleanup on source death/restoration.
 * Tuned for 3D: radius 8, pulse every 3 s, independent 32% rolls.
 */
export const TELEPATE_AURA_RADIUS=8;
export const TELEPATE_AURA_INTERVAL=3;
export const TELEPATE_PROVOKE_CHANCE=.32;
export const TELEPATE_GUARD_LIMIT=2;
// R.O.K. Lite Provocación level 4 lasts 6 phases. A 3D phase is
// approximated as one simulation second until a shared phase clock exists.
export const TELEPATE_PROVOKE_DURATION=6;
const VALID_STAGE=u=>u&&Number(u.hp)>0&&
 !['dead','dying','vanishing','restoring'].includes(u.stage);
const dist=(a,b)=>Math.hypot(a.outer.position.x-b.outer.position.x,
 a.outer.position.z-b.outer.position.z);
// Captured units change allegiance temporarily, without replacing their card identity.
function releaseGuard(unit){
 const fx=unit?.rokProvocation;
 if(!fx)return;
 if(fx.originalSide!==undefined)unit.side=fx.originalSide;
 unit.rokProvocation=null;
}
export function provocationSource(target){
 const effect=target?.rokProvocation;
 const src=effect?.source;
 if(!effect||effect.remaining<=0||!VALID_STAGE(src)||!VALID_STAGE(target))
  return null;
 return src;
}
export function telepateGuards(units,source){
 return units.filter(u=>u.rokProvocation?.source===source&&provocationSource(u));
}
export function stepTelepateProvocations(units,dt,{random=Math.random,onPulse=null,onSuccess=null}={}){
 if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid dt');
 const active=new Set(units);
 for(const unit of units){
  const fx=unit.rokProvocation;
  if(!fx)continue;
  fx.remaining-=dt;
  if(!active.has(fx.source)||!provocationSource(unit))releaseGuard(unit);
 }
 for(const source of units){
  if(source.cardId!=='telepate')continue;
  if(!VALID_STAGE(source)){source.rokAuraClock=0;continue}
  source.rokAuraClock=(source.rokAuraClock||0)+dt;
  while(source.rokAuraClock>=TELEPATE_AURA_INTERVAL){
   source.rokAuraClock-=TELEPATE_AURA_INTERVAL;
   onPulse?.(source);
   let guards=telepateGuards(units,source).length;
   if(guards>=TELEPATE_GUARD_LIMIT)continue;
   for(const enemy of units){
    if(guards>=TELEPATE_GUARD_LIMIT)break;
    if(enemy===source||enemy.role!=='summon'||enemy.side===source.side||
       enemy.rokProvocation||!VALID_STAGE(enemy)||
       dist(source,enemy)>TELEPATE_AURA_RADIUS+1e-8)continue;
    if(random()>=TELEPATE_PROVOKE_CHANCE)continue;
    enemy.rokProvocation={
      source,remaining:TELEPATE_PROVOKE_DURATION,originalSide:enemy.side
    };
    enemy.side=source.side;
    guards++;
    onSuccess?.(source,enemy);
   }
  }
 }
}
export function clearTelepateSource(units,source){
 for(const target of units)if(target.rokProvocation?.source===source)
  releaseGuard(target);
}

/** Three.js-only visual layer; does not modify aura range or combat targets. */
export function createTelepateAuraVisuals({THREE,root}){
 const live=new Map();
 const make=source=>{
  const group=new THREE.Group();
  group.name='ROK_Telepate_Provocation_Aura';
  const material=new THREE.MeshBasicMaterial({color:0x21c5ff,
   transparent:true,opacity:.25,depthWrite:false,
   side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const persistent=new THREE.Mesh(new THREE.RingGeometry(TELEPATE_AURA_RADIUS-.07,TELEPATE_AURA_RADIUS+.02,96),material);
  persistent.rotation.x=-Math.PI/2;group.add(persistent);
  const pulseMat=material.clone();pulseMat.opacity=0;
  const pulse=new THREE.Mesh(new THREE.RingGeometry(.95,1.03,96),pulseMat);
  pulse.rotation.x=-Math.PI/2;group.add(pulse);
  group.position.set(source.outer.position.x,.083,source.outer.position.z);
  root.add(group);
  const v={group,persistent,pulse,age:1,source};
  live.set(source,v);
  return v;
 };
 function remove(source){
  const v=live.get(source);if(!v)return;
  root.remove(v.group);
  v.persistent.geometry.dispose();v.persistent.material.dispose();
  v.pulse.geometry.dispose();v.pulse.material.dispose();
  live.delete(source);
 }
 function update(units,dt){
  const present=new Set(units);
  for(const source of units){
   if(source.cardId!=='telepate'||!VALID_STAGE(source))continue;
   let v=live.get(source);
   if(!v)v=make(source);
   v.group.position.set(source.outer.position.x,.083,source.outer.position.z);
   v.persistent.material.opacity=.16+.08*Math.sin((source.rokAuraClock||0)*2);
   v.age+=dt;
   const progress=Math.min(1,v.age/.65);
   v.pulse.scale.setScalar(TELEPATE_AURA_RADIUS*progress);
   v.pulse.material.opacity=v.age<.65?.57*(1-progress):0;
  }
  for(const source of [...live.keys()])
   if(!present.has(source)||!VALID_STAGE(source))remove(source);
 }
 function pulse(source){
  const v=live.get(source)|| (VALID_STAGE(source)?make(source):null);
  if(v)v.age=0;
 }
 function clear(){for(const source of [...live.keys()])remove(source)}
 return {update,pulse,remove,clear};
}
