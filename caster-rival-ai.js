/* R.O.K. 3D — Rival caster decision module v0.1
 * Priority: safe-feasible elemental pickup > retreat into own half > tactical summons > combat.
 * Works through adapter callbacks; does not own Three.js, cards or models.
 * All distances measured in board world units.
 */
export function createRivalCasterAI({
 getCaster,getOrbs,getEnemies,getThreats,getResourceState,getCastPlan,getStagingPosition,
 move,face,guard,attack,cast,onCastResolve,animate,canCast,learning=null,
 bounds={x:7.25,z:14.75},
 settings={}
}){
 const cfg={
  pickupRadius:3.65,interceptRange:4.1,threatRange:5.1,
  idealPressureZ:-.85,attackRange:3,castCooldown:1.1,
  territorialGrace:2.65,returnMargin:.35,minimumSurvivalHp:2,
  attackCooldown:1.1,guardDuration:.5,decisionInterval:.15,
  ...settings
 };
 const state={mode:'collect',target:null,elapsed:0,decision:0,
  castCooldown:0,attackCooldown:0,guardLeft:0,castLeft:0,castTarget:null,castCard:null,
  castDone:false,casting:false,castDefensive:false,incursion:false,records:{collectedAttempts:0,casts:0,attacks:0}};
 let learningClock=0,previous=null;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const bucket=(c,risk,amount)=>[
  c.hp<=2?'critical':c.hp<=6?'hurt':'healthy',
  risk?'threat':'clear',
  amount>=3?'rich':amount>=1?'ready':'empty'
 ].join(':');
 function learn(c,context,amount,dt){
  learningClock+=dt;
  if(learningClock<1)return;
  learningClock=0;
  if(previous&&previous.action){
   const hpDelta=(c.hp-previous.hp);
   const resourceDelta=amount-previous.amount;
   const reward=clamp(hpDelta*1.2+resourceDelta*.35+
    ((state.records.casts-previous.casts)*.35)+
    ((state.records.attacks-previous.attacks)*.18),-3,3);
   learning?.observe('chiara',previous.context,previous.action,reward);
  }
  previous={context,action:state.mode==='collect'?'collect':
   state.mode==='retreat'?'retreat':state.mode==='attack'?'attack':
   state.mode==='defend'?'guard':
   ['intercept','pressure','stage-summon'].includes(state.mode)?'cast':'position',
   hp:c.hp,amount,casts:state.records.casts,attacks:state.records.attacks};
 }
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const current=()=>getCaster?.();
 function reset(){
  state.mode='collect';state.target=null;state.elapsed=0;state.decision=0;
  state.castCooldown=0;state.attackCooldown=0;state.guardLeft=0;
  state.castLeft=0;state.castTarget=null;state.castCard=null;state.castDone=false;state.casting=false;
  state.castDefensive=false;state.incursion=false;
  previous=null;learningClock=0;
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
 function startCast(c,position,defensive,card=null){
  if(state.casting||state.castCooldown>0||!card||!canCast?.(c,card))return false;
  if(c.outer.position.z>=0||position.z>=0)return false;
  const duration=.5;
  if(!cast?.(c,{position,defensive,duration,card}))return false;
  state.mode=defensive?'intercept':'pressure';
  state.casting=true;state.castLeft=duration;state.castDone=false;
  state.castTarget={...position};state.castCard=card;state.castDefensive=defensive;
  state.castCooldown=cfg.castCooldown;
  state.records.casts++;
  return true;
 }
 // Orbs magnetize at about four units. Enter hostile ground only if the
 // caster can reach pickup range AND return before territorial damage, or
 // survive the estimated environmental ticks with a strict HP reserve.
 function feasibleOrb(c,orb){
  const pos=c.outer.position,point=orb.position;
  if(point.z<=0)return true;
  const magnet=Math.max(.5,Number(orb.pickupRadius)||cfg.pickupRadius);
  const requiredZ=Math.max(0,point.z-magnet);
  if(requiredZ<=.02)return true; // Collectible at the border.
  const speed=Math.max(.1,c.moveSpeed||3.8);
  const toPickup=pos.z>0?
   Math.hypot(point.x-pos.x,Math.max(0,requiredZ-pos.z))/speed:
   Math.hypot(point.x-pos.x,requiredZ)/speed;
  const returnSeconds=(requiredZ+cfg.returnMargin)/speed;
  // No intentional territory tick is acceptable on a planned incursion.
  // Staying home is preferred unless the full OUT+BACK trip fits the grace.
  const exposed=toPickup+returnSeconds;
  const graceRemaining=Math.max(0,cfg.territorialGrace-(c.hostileZoneSeconds||0));
  return c.hp>cfg.minimumSurvivalHp&&exposed<=graceRemaining;
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
    onCastResolve?.(c,{position:state.castTarget,defensive:state.castDefensive,card:state.castCard});
    state.casting=false;state.castTarget=null;state.castCard=null;state.castDefensive=false;
   }
   animate?.(c,'idle');
   return;
  }
  const pos=c.outer.position;
  // Home-side pickups beat invading the player's half, even if farther.
  const resources=getResourceState?.(c)||{};
  const amount=Math.max(0,Number(resources.available)||0);
  const unlocked=Math.max(0,Number(resources.unlocked)||0);
  // Small fragments restore a quarter of a previously unlocked unit.
  // Never pursue a fragment when the reservoir is already full.
  const visibleOrbs=(getOrbs?.()||[]).filter(orb=>orb?.position&&
   (orb.kind!=='fragment'||amount<unlocked-.01)&&feasibleOrb(c,orb));
  const homeOrbs=visibleOrbs.filter(orb=>orb.position.z<=0);
  const pool=homeOrbs.length?homeOrbs:visibleOrbs;
  // Save mode makes neutral death fragments a primary resource target.
  // A full reservoir orb still takes precedence while capacity is < 3.
  const preferFragment=unlocked>=3&&amount<3;
  const shardCandidates=pool.filter(orb=>orb.kind==='fragment');
  const largeCandidates=pool.filter(orb=>orb.kind!=='fragment');
  const selected=unlocked<3&&largeCandidates.length?largeCandidates:
   preferFragment&&shardCandidates.length?shardCandidates:pool;
  const orbs=nearest(pos,selected);
  const opponents=getEnemies?.()||[];
  const nearby=nearest(pos,opponents);
  const incoming=(getThreats?.(c)||[]).filter(t=>t?.position&&
   distance(pos,t.position)<=cfg.threatRange);
  const atRisk=incoming.length>0||nearby.distance<cfg.interceptRange;
  const context=bucket(c,atRisk,amount);
  learn(c,context,amount,dt);
  // The economic plan has priority when a card is affordable: do not
  // endlessly chase orbs while waiting to cast an already available unit.
  const planned=getCastPlan?.(c,amount,resources)||null;
  // Build the formation in the rearguard instead of casting a high-value
  // Telépate next to hostile summons. Escort units then have approach time.
  if(planned&&amount>=planned.cost&&pos.z<0){
   const staging=getStagingPosition?.(c,planned)||null;
   if(staging&&distance(pos,staging)>.35){
    state.mode='stage-summon';
    advanceToward(c,staging,dt,1);
    return;
   }
   if(startCast(c,{x:pos.x,z:pos.z},atRisk,planned))return;
  }
  // Enter enemy territory ONLY for a feasible orb. Once magnetized or
  // collected, immediately return to the enemy half of the arena.
  const canPursue=orbs.item&&(!(pos.z>0)||feasibleOrb(c,orbs.item));
  if(pos.z>0&&!canPursue){
   state.mode='retreat';state.incursion=false;state.target=null;
   advanceToward(c,{x:Math.max(-bounds.x,Math.min(bounds.x,pos.x)),z:-.55},dt,1);
   return;
  }
  // Pickup still outranks defense and offense, except when the incursion
  // would be lethal or would overrun the battlefield grace period.
  // A critical caster must not sacrifice its last HP for a resource orb.
  // Learned outcomes can also prefer retreat over repeated unsafe pickups.
  const unsafePickup=atRisk&&(c.hp<=cfg.minimumSurvivalHp||
   learning?.choose('chiara',context,['collect','retreat'],'collect')==='retreat');
  if(canPursue&&!unsafePickup){
   state.mode='collect';
   state.target=orbs.item.id??null;
   if(incoming.length&&state.guardLeft<=0){
    guard?.(true);state.guardLeft=cfg.guardDuration;
   }
   const target=orbs.item.position;
   const pickup=Math.max(.5,Number(orbs.item.pickupRadius)||cfg.pickupRadius);
   const safeCollectPosition={x:target.x,z:Math.min(target.z,
    Math.max(-bounds.z,target.z-pickup+.25))};
   state.incursion=safeCollectPosition.z>0;
   if(distance(pos,target)>pickup-.3)
    advanceToward(c,safeCollectPosition,dt,1);
   else animate?.(c,'idle');
   state.records.collectedAttempts++;
   return;
  }
  state.target=null;state.incursion=false;
  if(unsafePickup&&nearby.item){
   state.mode='retreat';
   const away=pos.x-nearby.item.position.x;
   advanceToward(c,{x:clamp(pos.x+(away>=0?2:-2),-bounds.x,bounds.x),
    z:Math.min(-.6,pos.z-1.5)},dt);
   if(incoming.length&&state.guardLeft<=0){guard?.(true);state.guardLeft=cfg.guardDuration;}
   return;
  }
  // Survival and guard remain active while saving resources.
  if(incoming.length&&state.guardLeft<=0){
   guard?.(true);state.guardLeft=cfg.guardDuration;
  }
  // Offensive summon: approach the player half of the map, but never
  // enter hostile territory solely to reach the ideal cast point.
  const objective={x:clamp(nearby.item?.position.x??0,-bounds.x,bounds.x),
   z:Math.min(-.15,cfg.idealPressureZ)};
  if(planned&&amount>=planned.cost){
   if(pos.z<cfg.idealPressureZ-0.8&&!atRisk){
    state.mode='advance';advanceToward(c,objective,dt);return;
   }
   if(startCast(c,{x:pos.x,z:pos.z},false,planned))return;
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
