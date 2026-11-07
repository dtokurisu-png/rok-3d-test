/**
 * R.O.K. 3D — Telépate de Agua: Aura de Provocación.
 * Every five seconds, the pulse taunts hostile summons within eight units.
 * Taunted summons remain enemies and chase/attack the Telépate for six seconds.
 * It NEVER changes their allegiance, controls them, or limits them to two.
 */
export const TELEPATE_AURA_RADIUS=8;
export const TELEPATE_AURA_INTERVAL=5;
export const TELEPATE_PROVOKE_DURATION=6;
const VALID_STAGE=u=>u&&Number(u.hp)>0&&
 !['dead','dying','vanishing','restoring'].includes(u.stage);
const dist=(a,b)=>Math.hypot(a.outer.position.x-b.outer.position.x,
 a.outer.position.z-b.outer.position.z);
export function provocationSource(target){
 const effect=target?.rokProvocation;
 const src=effect?.source;
 if(!effect||effect.remaining<=0||!VALID_STAGE(src)||!VALID_STAGE(target)||
    src.side===target.side)return null;
 return src;
}
export function clearTelepateSource(units,source){
 for(const target of units)
  if(target.rokProvocation?.source===source)target.rokProvocation=null;
}
export function stepTelepateProvocations(units,dt,{onPulse=null,onSuccess=null}={}){
 if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid dt');
 const present=new Set(units);
 // Migration safety: old capture versions changed the enemy's side.
 for(const unit of units){
  const fx=unit.rokProvocation;
  if(!fx)continue;
  if(fx.originalSide!==undefined)unit.side=fx.originalSide;
  fx.remaining=(Number.isFinite(fx.remaining)?fx.remaining:0)-dt;
  if(!present.has(fx.source)||!provocationSource(unit))unit.rokProvocation=null;
 }
 for(const source of units){
  if(source.cardId!=='telepate')continue;
  if(!VALID_STAGE(source)){source.rokAuraClock=0;continue;}
  source.rokAuraClock=(source.rokAuraClock||0)+dt;
  while(source.rokAuraClock>=TELEPATE_AURA_INTERVAL){
   source.rokAuraClock-=TELEPATE_AURA_INTERVAL;
   onPulse?.(source);
   for(const enemy of units){
    if(enemy===source||enemy.role!=='summon'||enemy.side===source.side||
       !VALID_STAGE(enemy)||dist(source,enemy)>TELEPATE_AURA_RADIUS+1e-8)continue;
    // Guaranteed provocation: every eligible hostile switches target, not side.
    enemy.rokProvocation={source,remaining:TELEPATE_PROVOKE_DURATION};
    onSuccess?.(source,enemy);
   }
  }
 }
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
