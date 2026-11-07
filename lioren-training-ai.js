/* Lioren training pilot: Earth economy, survival, tactical invocation.
 * Opposite battlefield half from Chiara; no game engine ownership.
 */
export function createLiorenTrainingAI({getCaster,getOrbs,getEnemies,getResources,
 getCards,canCast,cast,attack,guard,move,face,learning,bounds}){
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
  state.last=null;
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
  const threat=near.d<4.4;
  const allies=getCards().live;
  const ctx=context(c,threat,available,allies.length);
  let action='position';
  const healthRatio=c.hp/Math.max(1,c.maxHp||12);
  // Casters never enter the opponent's half to gather: Lioren is +Z.
  if(c.outer.position.z<.45){
   action='retreat';
   advance(c,{x:c.outer.position.x,z:2.2},dt);
  }else if(threat&&healthRatio<.4){
   action='retreat';
   const p=c.outer.position,enemy=near.item?.position||{x:0,z:0};
   advance(c,{x:clamp(p.x+(p.x>=enemy.x?2:-2),-bounds.x,bounds.x),
    z:clamp(Math.max(2.5,p.z+2.0),.5,bounds.z)},dt);
   if(state.guardClock===0){guard(true);state.guardClock=.45;}
  }else{
   const plan=getCards().plan(available,unlocked,allies,near);
   if(plan&&available>=plan.cost&&state.cooldown===0&&
    c.outer.position.z>.5&&canCast(c,plan)){
    if(cast(c,plan,'begin')){
     state.selected=plan;state.casting=.5;state.cooldown=1.1;
     state.casts++;action='cast';
    }
   }
   if(action!=='cast'){
    const usableOrbs=getOrbs().filter(orb=>orb.position&&
     (orb.kind!=='fragment'||available<unlocked-.01)&&
     orb.position.z>=-.2);
    const home=usableOrbs.filter(orb=>orb.position.z>=0);
    const candidate=nearest(c.outer.position,home.length?home:usableOrbs);
    const retreat=threat&&learning.choose('lioren',ctx,
     ['collect','retreat'],'collect')==='retreat';
    if(candidate.item&&!retreat&&(available<unlocked-.02||unlocked<3)){
     const p=candidate.item.position,pickup=candidate.item.pickupRadius||3.65;
     const destination={x:p.x,z:clamp(p.z+pickup-.25,.5,bounds.z)};
     if(candidate.d>pickup-.3)advance(c,destination,dt);
     state.collects++;action='collect';
    }else if(near.item&&near.d<=c.attackRange+.1&&state.attackCooldown===0){
     face(c,near.item.position);
     if(attack(c,near.item.target)){state.attacks++;state.attackCooldown=1.15;}
     action='attack';
    }else if(near.item&&threat){
     face(c,near.item.position);guard(true);state.guardClock=.45;action='guard';
    }else{
     const destination={x:clamp(near.item?.position.x||0,-bounds.x,bounds.x),
      z:Math.max(1.1,Math.min(bounds.z,c.outer.position.z))};
     if(c.outer.position.z>5.5)advance(c,{x:destination.x,z:5.0},dt,.75);
     action='position';
    }
   }
  }
  observe(c,ctx,action,available,allies.length);
 }
 return {step,reset,setActive,stop,get active(){return state.active;},
  get status(){return {...state,last:undefined,selected:state.selected?.id||null}}};
}
