/**
 * R.O.K. Farolera — directed teleport rules.
 * Lamp first, select a real allied summon (self only as last offensive option),
 * cast on its current tile, then move it to the lamp when animation completes.
 * The magic circle is a targeted effect, NOT a passive collision portal.
 */
import {distanceXZ} from './phase-3-lantern.js';
export const DIRECTED_TELEPORT_COOLDOWN=10;
export const DIRECTED_LAMP_RANGE=4;
const living=u=>u&&u.hp>0&&!['dead','dying','vanishing'].includes(u.stage);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function directedLampPosition({farolera,mode,ownHalf=true}){
 if(!farolera||!['offensive','defensive'].includes(mode))return null;
 const towardEnemy=farolera.side==='enemy'?1:-1;
 const direction=towardEnemy*(mode==='offensive'?1:-1);
 const edge=farolera.side==='enemy'?{min:-14.5,max:-.5}:{min:.5,max:14.5};
 // Clamp the horizontal landing point first. A Farolera can stand at
 // x=+/-7.25 while the valid lamp area ends at +/-7. A full four-cell
 // forward throw plus this lateral adjustment becomes a >4 diagonal throw.
 const x=clamp(farolera.x,-7,7);
 const dx=x-farolera.x;
 if(!Number.isFinite(dx)||!Number.isFinite(farolera.z)||
    Math.abs(dx)>DIRECTED_LAMP_RANGE)return null;
 // The remaining longitudinal distance must lie on the same radius-4
 // circle, not on an independent four-cell z interval.
 const longitudinal=Math.sqrt(Math.max(0,
  DIRECTED_LAMP_RANGE**2-dx**2));
 const z=clamp(farolera.z+longitudinal*direction,
  ownHalf?edge.min:-14.5,ownHalf?edge.max:14.5);
 const lamp={x,z};
 // Outside the map or beyond the spell's radius is an unavailable cast,
 // never a fatal combat exception.
 return distanceXZ(lamp,farolera)<=DIRECTED_LAMP_RANGE+1e-8?lamp:null;
}
export function directedTarget({farolera,allies,mode,enemies=[],inCombat=()=>false}){
 if(!living(farolera))return null;
 const eligible=[...allies,farolera].filter(u=>
  u.side===farolera.side&&living(u)&&u.role==='summon');
 if(!eligible.length)return null;
 if(mode==='offensive'){
  const others=eligible.filter(u=>u.id!==farolera.id);
  const pool=others.length?others:eligible;
  // Ally farthest from enemy front is the one who benefits most.
  const sign=farolera.side==='enemy'?-1:1;
  return [...pool].sort((a,b)=>sign*(b.z-a.z)||
   String(a.id).localeCompare(String(b.id)))[0];
 }
 if(mode==='defensive'){
  const threat=u=>enemies.reduce((acc,e)=>{
   if(!living(e)||e.side===u.side)return acc;
   const d=distanceXZ(u,e);
   const reach=Number(e.range??e.attackRange??1.5);
   const damage=Number(e.attackDamage??e.attack??1);
   return acc+(d<=reach+1.2?Math.max(0,damage)/(Math.max(.5,u.hp)*(1+d*.25)):0);
  },0);
  const sorted=[...eligible].sort((a,b)=>threat(b)-threat(a)||
    String(a.id).localeCompare(String(b.id)));
  return threat(sorted[0])>0?sorted[0]:null;
 }
 return null;
}
export function canDirectedCast(farolera,opponents,duelOpponent=null){
 if(!living(farolera)||farolera.stage!=='active'||duelOpponent)return false;
 // Never break an actual active fight just to cast the transport.
 return !opponents.some(e=>living(e)&&e.side!==farolera.side&&
  distanceXZ(farolera,e)<=Number(farolera.range??1.5)+.15);
}
