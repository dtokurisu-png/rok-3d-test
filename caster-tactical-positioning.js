/* Shared tactical positioning policy for Chiara and Lioren.
 * Uses explicit safety knowledge plus local contextual reinforcement.
 * No pathfinding physics, animation or card effects are owned here.
 */
export function createCasterTacticalPositioning({id,side,learning,bounds}){
 const home=side==='ally'?1:-1;
 const actions=['hold','flank-left','flank-right','advance','retreat'];
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 let last=null,clock=0,decision=null,decisionAge=0;
 const enemiesNear=(point,enemies)=>enemies.filter(e=>distance(point,e.position)<9).length;
 const dangerAt=(point,enemies)=>enemies.reduce((total,e)=>{
  const d=distance(point,e.position);
  // Enemy Farolera can reach from farther away with its directed ability.
  const reach=e.target?.cardId==='farolera'?8.5:
   e.target?.cardId==='telepate'?6.5:4.8;
  return total+Math.max(0,(reach-d)/reach)*(e.target?.cardId==='farolera'?2.2:1);
 },0);
 function finishMatch(won){
  // Outcome is attributed to the last positioning decision only; it must
  // not override survival observations from earlier in the match.
  if(last)learning?.observe(id,last.ctx,last.action,won?1.25:-2.5);
  reset();
 }
 function reset(){last=null;clock=0;decision=null;decisionAge=0;}
 function tick({caster,enemies=[],resources=0,casts=0,allies=0,dt=0,mission='idle'}){
  const p=caster.outer.position;clock+=dt;decisionAge+=dt;
  const currentDanger=dangerAt(p,enemies);
  const front=home*p.z<5,back=home*p.z>9;
  const ctx=[mission,caster.hp<=3?'critical':caster.hp<=7?'hurt':'healthy',
   currentDanger>1?'high':currentDanger>.15?'medium':'clear',
   front?'front':back?'back':'middle',
   resources>=3?'rich':resources>=1?'ready':'empty',
   allies?'supported':'alone'].join(':');
  if(last&&(clock-last.time>=1||caster.hp<last.hp)){
   const hpLoss=Math.max(0,last.hp-caster.hp);
   const hpGain=Math.max(0,caster.hp-last.hp);
   const reward=clamp((casts-last.casts)*.85+(resources-last.resources)*.27+
    hpGain*.4-hpLoss*1.8-
    Math.max(0,currentDanger-last.danger)*.5+
    (hpLoss===0&&currentDanger<.3?.12:0),-3,3);
   learning?.observe(id,last.ctx,last.action,reward);
   last=null;
  }
  // Candidate destinations remain on our own half, including side flanks.
  const baseZ=home*8,forwardZ=home*3.5,backZ=home*11.5;
  const points={
   hold:{x:p.x,z:baseZ},
   'flank-left':{x:clamp(p.x-3,-bounds.x+.55,bounds.x-.55),z:baseZ},
   'flank-right':{x:clamp(p.x+3,-bounds.x+.55,bounds.x-.55),z:baseZ},
   advance:{x:p.x,z:forwardZ},
   retreat:{x:p.x,z:backZ}
  };
  const imminent=currentDanger>=1.1||caster.hp<=3&&currentDanger>.15;
  // The planner must compare safety before learning can override a move.
  // A short horizon ahead prevents repeated frontal charges.
  const choices=actions.map(action=>{
   const target=points[action],nextDanger=dangerAt(target,enemies);
   const pathDanger=dangerAt({x:(target.x+p.x)/2,z:(target.z+p.z)/2},enemies);
   const risk=Math.max(nextDanger,pathDanger);
   const safetyPenalty=risk*1.4+(imminent&&action==='advance'?5:0);
   const urgency=imminent&&action==='retreat'?1.8:0;
   const castBias=mission==='cast'&&action==='hold'?.65:0;
   const opportunity=mission==='collect'&&action==='advance'&&currentDanger<.2?.15:0;
   const learned=learning?.score(id,ctx,action)||0;
   const uncertainty=Math.random()*.18; // bounded exploration among safe options
   return {action,target,risk,score:learned*.9-safetyPenalty+
    urgency+castBias+opportunity+uncertainty};
  });
  const safe=choices.filter(c=>c.risk<=(imminent?.7:1.3));
  const viable=safe.length?safe:choices;
  viable.sort((a,b)=>b.score-a.score);
  if(!decision||decisionAge>=2.2||imminent&&decision.action==='advance'){
   decision=viable[0];decisionAge=0;
  }
  if(!last)last={time:clock,ctx,action:decision.action,
   hp:caster.hp,resources,casts,danger:currentDanger};
  return {action:decision.action,target:decision.target,
   danger:currentDanger,context:ctx,imminent,nearby:enemiesNear(p,enemies)};
 }
 return {tick,reset,finishMatch,dangerAt,
  get status(){return {action:decision?.action||'hold',context:last?.ctx||'',age:decisionAge};}};
}
