/* Lioren training pilot: Earth economy, survival, tactical invocation.
 * Opposite battlefield half from Chiara; no game engine ownership.
 */
export function createLiorenTrainingAI({getCaster,getOrbs,getEnemies,getResources,
 getCards,canCast,cast,attack,guard,move,face,learning,bounds,positioning}){
 const state={active:false,elapsed:0,casts:0,attacks:0,collects:0,casting:0,
  cooldown:0,attackCooldown:0,guardClock:0,last:null,selected:null};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const nearest=(p,all)=>all.reduce((a,b)=>distance(p,b.position)<a.d?
  {item:b,d:distance(p,b.position)}:a,{item:null,d:Infinity});
 function reset(){
  if(state.selected)state.selected=null;
  state.elapsed=0;state.casts=0;state.attacks=0;state.collects=0;
  state.casting=0;state.cooldown=0;state.attackCooldown=0;state.guardClock=0;
  state.last=null;positioning?.reset();
  guard(false);
 }
 function stop(){state.active=false;reset();}
 function setActive(on){if(!on)stop();else{reset();state.active=true;}}
 function advance(c,target,dt,speed=1){
  const p=c.outer.position,dx=target.x-p.x,dz=target.z-p.z;
  const d=Math.hypot(dx,dz);if(d<.13)return;
  const step=Math.min(d,(c.moveSpeed||3.8)*speed*dt);
  move(c,clamp(p.x+dx/d*step,-bounds.x,bounds.x),
   clamp(p.z+dz/d*step,-bounds.z,bounds.z));
  face(c,target);
 }
 const context=(c,threat,amount,live)=>[
  c.hp<=3?'critical':c.hp<=7?'hurt':'healthy',
  threat?'danger':'safe',amount>=3?'rich':amount>=1?'ready':'empty',
  live>=3?'crowded':'few'].join(':');
 function observe(c,ctx,action,available,units){
  const previous=state.last;
  if(previous&&state.elapsed-previous.at>=1){
   learning.observe('lioren',previous.ctx,previous.action,
    clamp((c.hp-previous.hp)*1.4+(available-previous.available)*.4+
    (state.casts-previous.casts)*.8+
    (state.attacks-previous.attacks)*.3,-3,3));
   state.last=null;
  }
  if(!state.last)state.last={ctx,action,hp:c.hp,available,
   casts:state.casts,attacks:state.attacks,at:state.elapsed};
 }
 function step(dt){
  if(!state.active||!Number.isFinite(dt)||dt<=0)return;
  const c=getCaster();
  if(!c||c.stage!=='active')return;
  state.elapsed+=dt;
  state.cooldown=Math.max(0,state.cooldown-dt);
  state.attackCooldown=Math.max(0,state.attackCooldown-dt);
  state.guardClock=Math.max(0,state.guardClock-dt);
  if(!state.guardClock)guard(false);
  if(state.casting>0){
   state.casting=Math.max(0,state.casting-dt);
   if(state.casting===0&&state.selected){
    const card=state.selected;state.selected=null;
    cast(c,card,'release');
   }
   return;
  }
  const resources=getResources()||{},available=Number(resources.available)||0;
  const unlocked=Number(resources.unlocked)||0;
  const enemies=getEnemies(),near=nearest(c.outer.position,enemies);
  const allies=getCards().live;
  const suggested=positioning?.tick({caster:c,enemies,resources:available,
   casts:state.casts,allies:allies.length,dt,
   mission:available>=1?'cast':'collect'});
  const threat=(suggested?.danger||0)>.2||near.d<5.5;
  const urgent=(suggested?.danger||0)>.85;
  const ctx=context(c,threat,available,allies.length);
  let action='position';
  const healthRatio=c.hp/Math.max(1,c.maxHp||12);
  // Casters never enter the opponent's half to gather: Lioren is +Z.
  if(c.outer.position.z<.45){
   action='retreat';
   advance(c,{x:c.outer.position.x,z:2.2},dt);
  }else if((urgent&&healthRatio<.85)||(threat&&healthRatio<.4)){
   action='retreat';
   const p=c.outer.position,enemy=near.item?.position||{x:0,z:0};
   const safe=suggested?.target;
   advance(c,{x:safe?.x??clamp(p.x+(p.x>=enemy.x?2:-2),-bounds.x,bounds.x),
    z:clamp(Math.max(6.5,safe?.z??p.z+2),.5,bounds.z)},dt);
   if(state.guardClock===0){guard(true);state.guardClock=.45;}
  }else{
   const plan=getCards().plan(available,unlocked,allies,near);
   // Spawn roles need different safe territory depth. Semillera stays in
   // rear support; combat summons can be deployed a little farther forward.
   // Never walk toward a staging point if that lane is under enemy pressure.
   const stagingDepth=plan?.id==='semillera'?10:
    plan?.id==='astarium'?8.5:7.5;
   const staging={x:c.outer.position.x,z:stagingDepth};
   const shouldStage=!!plan&&c.outer.position.z<stagingDepth-.3&&
    (positioning?.dangerAt(staging,enemies)||0)<.3;
   if(shouldStage){
    advance(c,staging,dt,.85);
    action='position';
   }
   // Casting under immediate Farolera pressure repeats the old failure:
   // reposition behind our summons first, then cast from a safe zone.
   const safeToCast=(suggested?.danger||0)<.42;
   if(plan&&!shouldStage&&available>=plan.cost&&state.cooldown===0&&
    c.outer.position.z>.5&&safeToCast&&canCast(c,plan)){
    if(cast(c,plan,'begin')){
     state.selected=plan;state.casting=.5;state.cooldown=1.1;
     state.casts++;action='cast';
    }
   }
   if(action!=='cast'&&!shouldStage){
    const usableOrbs=getOrbs().filter(orb=>orb.position&&
     (orb.kind!=='fragment'||available<unlocked-.01)&&
     orb.position.z>=-.2);
    const home=usableOrbs.filter(orb=>orb.position.z>=0);
    const candidate=nearest(c.outer.position,home.length?home:usableOrbs);
    const retreat=threat&&(urgent||learning.choose('lioren',ctx,
     ['collect','retreat'],'collect')==='retreat');
    const exposed=candidate.item&&positioning?.dangerAt(
     candidate.item.position,enemies)>.35;
    if(candidate.item&&!retreat&&!exposed&&
     (available<unlocked-.02||unlocked<3)){
     const p=candidate.item.position,pickup=candidate.item.pickupRadius||3.65;
     const destination={x:p.x,z:clamp(p.z+pickup-.25,.5,bounds.z)};
     if(candidate.d>pickup-.3)advance(c,destination,dt);
     state.collects++;action='collect';
    }else if((urgent||exposed)&&suggested?.target){
     advance(c,suggested.target,dt,.95);action=suggested.action;
    }else if(near.item&&near.d<=c.attackRange+.1&&state.attackCooldown===0){
     face(c,near.item.position);
     if(attack(c,near.item.target)){state.attacks++;state.attackCooldown=1.15;}
     action='attack';
    }else if(near.item&&threat){
     face(c,near.item.position);guard(true);state.guardClock=.45;action='guard';
    }else{
     // No unprompted march to Z=5. Choose a defensible lane and learn
     // whether holding or flanking worked in this tactical situation.
     if(suggested?.target)advance(c,suggested.target,dt,.72);
     action=suggested?.action||'position';
    }
   }
  }
  observe(c,ctx,action,available,allies.length);
 }
 return {step,reset,setActive,stop,get active(){return state.active;},
  get status(){return {...state,last:undefined,selected:state.selected?.id||null}}};
}
