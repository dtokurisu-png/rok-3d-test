/**
 * R.O.K. 3D — Telépate de Agua: Aura de Provocación.
 * Port of Nael's factor behavior in R.O.K. Lite:
 * independent rolls per hostile summon, forced target pursuit,
 * timed debuff that refreshes, cleanup on source death/restoration.
 * Tuned for 3D: radius 5, pulse every 3 s, independent 32% rolls.
 */
export const TELEPATE_AURA_RADIUS=5;
export const TELEPATE_AURA_INTERVAL=3;
export const TELEPATE_PROVOKE_CHANCE=.32;
// R.O.K. Lite Provocación level 4 lasts 6 phases. A 3D phase is
// approximated as one simulation second until a shared phase clock exists.
export const TELEPATE_PROVOKE_DURATION=6;
const VALID_STAGE=u=>u&&Number(u.hp)>0&&
 !['dead','dying','vanishing','restoring'].includes(u.stage);
const dist=(a,b)=>Math.hypot(a.outer.position.x-b.outer.position.x,
 a.outer.position.z-b.outer.position.z);
export function provocationSource(target){
 const effect=target?.rokProvocation;
 const src=effect?.source;
 if(!effect||effect.remaining<=0||!VALID_STAGE(src)||src.side===target.side)
  return null;
 return src;
}
export function stepTelepateProvocations(units,dt,{random=Math.random,onPulse=null,onSuccess=null}={}){
 if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid dt');
 const active=new Set(units);
 // Expiry and invalid sources must never leave enemies pursuing a phantom.
 for(const unit of units){
  const fx=unit.rokProvocation;
  if(!fx)continue;
  fx.remaining-=dt;
  if(!active.has(fx.source)||!provocationSource(unit))unit.rokProvocation=null;
 }
 for(const source of units){
  if(source.cardId!=='telepate')continue;
  if(!VALID_STAGE(source)){source.rokAuraClock=0;continue}
  source.rokAuraClock=(source.rokAuraClock||0)+dt;
  while(source.rokAuraClock>=TELEPATE_AURA_INTERVAL){
   source.rokAuraClock-=TELEPATE_AURA_INTERVAL;
   onPulse?.(source);
   for(const enemy of units){
    if(enemy===source||enemy.role!=='summon'||enemy.side===source.side||
       !VALID_STAGE(enemy)||dist(source,enemy)>TELEPATE_AURA_RADIUS+1e-8)continue;
    if(random()>=TELEPATE_PROVOKE_CHANCE)continue;
    enemy.rokProvocation={source,remaining:TELEPATE_PROVOKE_DURATION};
    onSuccess?.(source,enemy);
   }
  }
 }
}
export function clearTelepateSource(units,source){
 for(const target of units)if(target.rokProvocation?.source===source)
  target.rokProvocation=null;
}
