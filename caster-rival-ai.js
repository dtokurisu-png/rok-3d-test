/* R.O.K. 3D — Rival caster decision module v0.1
 * Priority: elemental pickup > tactical summoning > defense > direct attack.
 * Works through adapter callbacks; does not own Three.js, cards or models.
 * All distances measured in board world units.
 */
export function createRivalCasterAI({
 getCaster,getOrbs,getEnemies,getThreats,getResourceState,
 move,face,guard,attack,cast,onCastResolve,animate,canCast,
 bounds={x:7.25,z:14.75},
 settings={}
}){
 const cfg={
  pickupRadius:3.65,interceptRange:4.1,threatRange:5.1,
  idealPressureZ:2.4,attackRange:3,castCooldown:.65,
  attackCooldown:1.1,guardDuration:.5,decisionInterval:.15,
  ...settings
 };
 const state={mode:'collect',target:null,elapsed:0,decision:0,
  castCooldown:0,attackCooldown:0,guardLeft:0,castLeft:0,castTarget:null,
  castDone:false,casting:false,castDefensive:false,records:{collectedAttempts:0,casts:0,attacks:0}};
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const current=()=>getCaster?.();
 function reset(){
  state.mode='collect';state.target=null;state.elapsed=0;state.decision=0;
  state.castCooldown=0;state.attackCooldown=0;state.guardLeft=0;
  state.castLeft=0;state.castTarget=null;state.castDone=false;state.casting=false;
  state.castDefensive=false;
  guard?.(false);
 }
 function nearest(from,items){
  let best=null,bestDistance=Infinity;
  for(const item of items||[]){
   if(!item?.position)continue;
   const d=distance(from,item.position);
   if(d<bestDistance){best=item;bestDistance=d;}
  }
  return {item:best,distance:bestDistance};
 }
 function advanceToward(c,position,dt,speedScale=1){
  if(!position)return false;
  const pos=c.outer.position;
  const dx=position.x-pos.x,dz=position.z-pos.z,d=Math.hypot(dx,dz);
  if(d<.12){animate?.(c,'idle');return false;}
  const step=Math.min(d,Math.max(0,c.moveSpeed||3.8)*speedScale*dt);
  const nx=clamp(pos.x+dx/d*step,-bounds.x,bounds.x);
  const nz=clamp(pos.z+dz/d*step,-bounds.z,bounds.z);
  move?.(c,nx,nz);
  face?.(c,position);
  animate?.(c,Math.abs(dz)>.08?'forward':dx>=0?'right':'left');
  return true;
 }
 function startCast(c,position,defensive){
  if(state.casting||state.castCooldown>0||!canCast?.(c))return false;
  const duration=.5;
  if(!cast?.(c,{position,defensive,duration}))return false;
  state.mode=defensive?'intercept':'pressure';
  state.casting=true;state.castLeft=duration;state.castDone=false;
  state.castTarget={...position};state.castDefensive=defensive;
  state.castCooldown=cfg.castCooldown;
  state.records.casts++;
  return true;
 }
 function step(dt){
  const c=current();
  if(!c?.outer||c.stage!=='active'||!Number.isFinite(dt)||dt<=0){
   if(state.guardLeft>0){state.guardLeft=0;guard?.(false);}
   return;
  }
  state.elapsed+=dt;
  state.castCooldown=Math.max(0,state.castCooldown-dt);
  state.attackCooldown=Math.max(0,state.attackCooldown-dt);
  if(state.guardLeft>0){
   state.guardLeft=Math.max(0,state.guardLeft-dt);
   if(!state.guardLeft)guard?.(false);
  }
  if(state.casting){
   state.castLeft=Math.max(0,state.castLeft-dt);
   if(state.castLeft===0){
    // Commit the physical invocation when the casting windup completes.
    onCastResolve?.(c,{position:state.castTarget,defensive:state.castDefensive});
    state.casting=false;state.castTarget=null;state.castDefensive=false;
   }
   animate?.(c,'idle');
   return;
  }
  const pos=c.outer.position;
  const orbs=nearest(pos,getOrbs?.());
  const opponents=getEnemies?.()||[];
  const nearby=nearest(pos,opponents);
  const incoming=(getThreats?.(c)||[]).filter(t=>t?.position&&
   distance(pos,t.position)<=cfg.threatRange);
  const atRisk=incoming.length>0||nearby.distance<cfg.interceptRange;
  // Highest priority: seek and take the orb even at risk. Defense is
  // nonexclusive and never prevents movement toward the resource.
  if(orbs.item){
   state.mode='collect';
   state.target=orbs.item.id??null;
   if(incoming.length&&state.guardLeft<=0){
    guard?.(true);state.guardLeft=cfg.guardDuration;
   }
   if(orbs.distance>.65)advanceToward(c,orbs.item.position,dt,1);
   else animate?.(c,'idle');
   state.records.collectedAttempts++;
   return;
  }
  state.target=null;
  const amount=Math.max(0,Number(getResourceState?.(c)?.available)||0);
  // Defensive invocation intercepts a rushing unit; only when not
  // contesting an elemental orb.
  if(atRisk&&amount>=1&&!state.casting){
   if(startCast(c,{x:pos.x,z:pos.z},true))return;
  }
  if(incoming.length&&state.guardLeft<=0){
   guard?.(true);state.guardLeft=cfg.guardDuration;
  }
  // Offensive summon: approach the player half of the map, but never
  // enter hostile territory solely to reach the ideal cast point.
  const objective={x:clamp(nearby.item?.position.x??0,-bounds.x,bounds.x),
   z:cfg.idealPressureZ};
  if(amount>=1){
   if(pos.z<cfg.idealPressureZ-0.8&&!atRisk){
    state.mode='advance';advanceToward(c,objective,dt);return;
   }
   if(startCast(c,{x:pos.x,z:pos.z},false))return;
  }
  // No resource available: position for pressure while scanning orbs.
  if(!atRisk&&pos.z<cfg.idealPressureZ-1){
   state.mode='advance';advanceToward(c,objective,dt,.85);return;
  }
  // Attack only if there is no orb to collect or immediate cast ready.
  if(nearby.item&&nearby.distance<=cfg.attackRange&&state.attackCooldown<=0){
   state.mode='attack';face?.(c,nearby.item.position);
   if(attack?.(c,nearby.item.target)){state.attackCooldown=cfg.attackCooldown;state.records.attacks++;}
   return;
  }
  if(atRisk&&nearby.item){
   state.mode='defend';face?.(c,nearby.item.position);
  }else state.mode='position';
  animate?.(c,'idle');
 }
 return {step,reset,get status(){return {...state,records:{...state.records}};}};
}
