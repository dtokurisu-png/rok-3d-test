/* R.O.K. — experiential spellbook planner.
 * Never bypasses game validation: it only ranks cards supplied as legal.
 * Test mode explores untried (situation, card, role) combinations;
 * normal mode exploits observed results, keeping a safe fallback.
 * Each caster retains its own independent local training memory.
 */
import {createCasterNeuralEvaluator} from './caster-neural-evaluator.js?v=20261108-experiments-2';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const empty=()=>({schema:1,updatedAt:null,mode:'test',trials:{},matches:0});
const number=x=>Number.isFinite(Number(x))?Number(x):0;
const safeKey=s=>String(s||'none').replace(/[^\w:|.-]/g,'_').slice(0,210);
export function createCasterExperimentPlanner({id,storage,initialMode='test'}){
 const key='rok.'+id+'.experiments.v1';
 let data=empty(),pending=[],chosen=null,saving=null,readyGoal=null,recent=[],dirty=0;
 let saveCooldown=0,selectionHistory=[],recentCastCount=0;
 let usedCards=new Map(),confirmedCasts={};
 const neural=createCasterNeuralEvaluator(id);
 data.mode=initialMode;
 function load(input){
  if(!input||input.schema!==1||!input.trials||typeof input.trials!=='object')return false;
  const clean=empty();
  clean.mode=input.mode==='normal'?'normal':'test';
  clean.matches=clamp(number(input.matches),0,1000000);
  for(const [k,v] of Object.entries(input.trials).slice(0,2400)){
   if(k.length>220||!v||typeof v!=='object')continue;
   clean.trials[k]={n:clamp(number(v.n),0,100000),wins:clamp(number(v.wins),0,100000),
    score:clamp(number(v.score),-10,10),last:v.last||null};
  }
  data=clean;
  usedCards=new Map();
  confirmedCasts={};
  if(input.castCounts&&typeof input.castCounts==='object')
   for(const [name,count] of Object.entries(input.castCounts).slice(0,80))
    if(/^[\w.-]{1,80}$/.test(name))
     confirmedCasts[name]=clamp(number(count),0,1000000);
  for(const [name,trial] of Object.entries(data.trials)){
   const parts=name.split('|'),role=parts[parts.length-1];
   if(role==='economy')continue;
   const card=parts[parts.length-2].split(/[@_]/)[0];
   usedCards.set(card,(usedCards.get(card)||0)+number(trial.n));
  }
  if(input.network)neural.restore(input.network);
  return true;
 }
 try{const raw=storage?.getItem(key);if(raw)load(JSON.parse(raw));}catch{}
 function persist(){
  try{
   data.updatedAt=new Date().toISOString();
   storage?.setItem(key,JSON.stringify({...data,castCounts:confirmedCasts,
    network:neural.snapshot()}));
   dirty=0;return true;
  }catch{return false;}
 }
 async function loadShared(url){
  // The local experience is authoritative, a checked-in snapshot is a bootstrap.
  if(Object.keys(data.trials).length)return false;
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)return false;
  const snapshot=await response.json();
  if(snapshot?.schema!==1||!snapshot.trials)return false;
  // Avoid overwriting experience accumulated while the network loaded.
  if(Object.keys(data.trials).length)return false;
  const mode=data.mode;
  if(!load(snapshot))return false;
  data.mode=mode;persist();return true;
 }
 const mode=()=>data.mode;
 function setMode(value){
  data.mode=value==='normal'?'normal':'test';
  if(data.mode==='normal'){saving=null;readyGoal=null;saveCooldown=0;}
  persist();
  return data.mode;
 }
 function context({caster,enemies=[],element=0,enemyElement=0,allies=[],side}){
  const p=caster?.outer?.position||{x:0,z:0};
  const nearest=enemies.filter(e=>e?.outer&&e.hp>0).sort((a,b)=>
   Math.hypot(a.outer.position.x-p.x,a.outer.position.z-p.z)-
   Math.hypot(b.outer.position.x-p.x,b.outer.position.z-p.z))[0];
  const dist=nearest?Math.hypot(nearest.outer.position.x-p.x,nearest.outer.position.z-p.z):Infinity;
  const hp=number(caster?.hp),max=Math.max(1,number(caster?.maxHp)||12);
  const threat=dist<3.5?'close':dist<7?'near':dist<11?'far':'clear';
  const enemyId=nearest?.cardId||(nearest?.role==='caster'?'caster':'none');
  const enemyHp=nearest?nearest.hp<=2?'fragile':nearest.hp<=5?'medium':'durable':'none';
  const ownUnits=allies.length>=3?'many':allies.length?'some':'none';
  const mana=element<1?'empty':element<2?'one':element<3?'two':element<5?'three-four':'five-plus';
  const damage=number(nearest?.attackDamage)>=2?'high':'ordinary';
  const protection=(number(nearest?.armorPhysical)+number(nearest?.armorMagical)+
   number(nearest?.magicShieldHits)+number(nearest?.shield))>0?'protected':'unprotected';
  const rivalMana=enemyElement>=3?'rich':enemyElement>=1?'ready':'empty';
  const blocked=nearest?.duelOpponent?.side===side?'blocked':'unblocked';
  return safeKey([side||id,hp/max<=.35?'critical':hp/max<=.7?'hurt':'healthy',
   threat,enemyId,enemyHp,ownUnits,mana,damage,protection,rivalMana,blocked].join('|'));
 }
 const trialKey=(ctx,card,role='defense')=>safeKey(ctx+'|'+card+'|'+role);
 function row(ctx,card,role){return data.trials[trialKey(ctx,card,role)]||null;}
 // Count completed, actual card uses across ALL contexts. A new HP,
 // position or elemental amount must not reset exploration to cost-one.
 function completed(cardId){return usedCards.get(cardId)||0;}
 const identifier=c=>c.experimentId||c.id;
 function select({context:ctx,cards=[],available=0,threat=false,preferred=null}){
  const possible=cards.filter(c=>c&&c.id&&number(c.cost)<=available&&c.legal!==false);
  if(!possible.length){chosen=null;return null;}
  const roles=threat?['defense','offense']:['offense','defense'];
  // A short saving plan gets a cast slot, but may never monopolize combat.
  // A completed saving plan gets the next cast slot. Without this, once
  // three elements are collected a newly different context picks cost one.
  const scheduled=readyGoal&&!threat?
   possible.find(c=>identifier(c)===readyGoal.id||c.id===readyGoal.id):null;
  const pool=scheduled?[scheduled]:possible;
  const candidates=pool.flatMap(card=>
   (card.type==='equipment'||card.type==='spell'?['support']:roles).map(role=>{
   const candidateId=identifier(card);
   const r=row(ctx,candidateId,role),n=r?.n||0,success=r?.score||0;
   const global=completed(card.id);
   const neuralScore=neural.predict(ctx,card,role);
   // Compare concrete recent CASTS, not the number of context evaluations.
   const recentUses=selectionHistory.slice(-4).filter(id=>id===card.id).length;
   const repeated=selectionHistory.slice(-2).every(id=>id===card.id)&&
    selectionHistory.length>=2;
   // Global card variety dominates context-specific novelty in test mode.
   // Situations refine the chosen card, never trap the AI at cost one.
   const score=data.mode==='test'?
    -Math.log2(1+global)*1.2-n*.09+success*.12-
    recentUses*1.6-(repeated?2.5:0)+
      (role==='defense'&&threat?.2:0):
    success*(n/(n+3))+neuralScore*1.25*(3/(n+3))+
    (role==='defense'&&threat?.4:0)+.12/Math.sqrt(n+1);
   return {card,role,n,score};
  }));
  candidates.sort((a,b)=>b.score-a.score||
   a.card.cost-b.card.cost||a.card.id.localeCompare(b.card.id));
  const winner=candidates[0];
  chosen={context:ctx,card:identifier(winner.card),role:winner.role,at:Date.now()};
  return {card:winner.card,role:winner.role,trials:winner.n};
 }
 // A cost-two/three/five experiment is an independent strategic choice,
 // not a reward granted only after thousands of cost-one contexts.
 // Keep that goal through changing positions/element levels.
 function considerSaving({context:ctx,cards=[],available=0,capacity=0,threat=false}){
  if(data.mode!=='test'){saving=null;readyGoal=null;return false;}
  const options=cards.filter(c=>c?.id&&c.legal!==false);
  if(!options.length){saving=null;readyGoal=null;return false;}
  // A high-cost plan must be cancelled when the card cannot be executed.
  if(readyGoal&&!options.some(c=>identifier(c)===readyGoal.id||c.id===readyGoal.id))
   readyGoal=null;
  if(readyGoal)return false;
  if(saving){
   const target=options.find(c=>identifier(c)===saving.id||c.id===saving.id);
   if(!target){saving=null;saveCooldown=6;return false;}
   if(available>=number(target.cost)){
    readyGoal={id:saving.id};
    saving=null;
    return false;
   }
   // A real threat always permits immediate protective casting, without
   // turning the interrupted economic plan into a fake successful trial.
   if(threat){saving=null;saveCooldown=8;return false;}
   // No long waits for cost five while only one reservoir is unlocked.
   if(saving.elapsed>=8){saving=null;saveCooldown=12;return false;}
   return true;
  }
  if(threat||available<1||saveCooldown>0)return false;
  const affordable=options.filter(c=>number(c.cost)<=available);
  if(!affordable.length)return false;
  // Only postpone a cast for a card that is ONE resource away and whose
  // capacity is already unlocked. Others remain future options.
  const next=options.filter(c=>number(c.cost)>available&&
   number(c.cost)<=available+1.01&&number(c.cost)<=capacity);
  if(!next.length)return false;
  // Never save before casting something in the current encounter;
  // nor repeatedly after a single expensive cast.
  if(recentCastCount===0||recentCastCount%3!==0)return false;
  next.sort((a,b)=>completed(a.id)-completed(b.id)||
   number(a.cost)-number(b.cost)||a.id.localeCompare(b.id));
  const target=next[0];
  const leastAffordable=Math.min(...affordable.map(c=>completed(c.id)));
  if(completed(target.id)>leastAffordable+2)return false;
  saving={context:ctx,id:identifier(target),cost:number(target.cost),elapsed:0};
  saveCooldown=12;
  return true;
 }
 function begin({context:ctx,card,role='defense',snapshot}){
  if(!card?.id)return false;
  if(readyGoal&&(readyGoal.id===card.id||readyGoal.id===identifier(card)))readyGoal=null;
  // One confirmed cast is one economic decision, regardless of the number
  // of score observations or network updates it later produces.
  recentCastCount++;
  selectionHistory.push(card.id);
  if(selectionHistory.length>12)selectionHistory.shift();
  confirmedCasts[card.id]=(confirmedCasts[card.id]||0)+1;
  persist();
  pending.push({context:ctx,card:card.experimentId||card.id,
   cost:number(card.cost),role,start:number(snapshot?.time),
   snapshot,elapsed:0});
  if(pending.length>24)pending.shift();
  return true;
 }
 function evaluate(dt,snapshot){
  saveCooldown=Math.max(0,saveCooldown-Math.max(0,number(dt)));
  if(saving)saving.elapsed+=Math.max(0,number(dt));
  for(let i=pending.length-1;i>=0;i--){
   const p=pending[i];p.elapsed+=Math.max(0,number(dt));
   if(p.elapsed<5)continue;
   const before=p.snapshot||{},after=snapshot||{};
   // Credit only observed changes. Includes benefit from a summon blocking
   // while its caster attacks OR prepares another cast.
   const prevented=Math.max(0,number(before.casterHp)-number(after.casterHp));
   const inflicted=Math.max(0,number(before.enemyHp)-number(after.enemyHp));
   const alliesDelta=number(after.allyCount)-number(before.allyCount);
   const enemyDelta=number(before.enemyCount)-number(after.enemyCount);
   const armorGain=Math.max(0,number(after.allyArmor)-number(before.allyArmor));
   const vitalityGain=Math.max(0,number(after.allyMaxHp)-number(before.allyMaxHp));
   const reservoirGain=Math.max(0,number(after.capacity)-number(before.capacity));
   const damageAvoided=prevented===0&&number(before.enemyCount)>0?.5:0;
   const score=clamp(inflicted*.7+enemyDelta*1.5+alliesDelta*.3+
    armorGain*.35+vitalityGain*.65+reservoirGain*1.3+
    damageAvoided-prevented*1.8,-5,5);
   observe(p.context,p.card,p.role,score,p.cost);
   pending.splice(i,1);
  }
 }
 function observe(ctx,card,role,reward,cost=1){
  const k=trialKey(ctx,card,role),r=data.trials[k]||
   (data.trials[k]={n:0,wins:0,score:0,last:null});
  r.n++;r.score=clamp(r.score+(clamp(number(reward),-5,5)-r.score)/
   Math.min(30,r.n),-10,10);
  if(reward>0)r.wins++;
  neural.train(ctx,{id:card,cost},role,reward);
  if(role!=='economy'){
   const family=String(card).split(/[@_]/)[0];
   usedCards.set(family,(usedCards.get(family)||0)+1);
  }
  recent.push({context:ctx,card,role,cost});
  if(recent.length>16)recent.shift();
  r.last={reward:clamp(number(reward),-5,5),at:new Date().toISOString()};
  if(++dirty>=1)persist();
 }
 function finishMatch(won=null){
  // A win or loss corrects misleading five-second outcomes. A manual
  // restart with no defeated caster remains an unlabeled match.
  if(won===true||won===false){
   const latest=recent.slice(-5);
   const adjustment=won?.6:-.9;
   for(let i=0;i<latest.length;i++){
    const entry=latest[i];
    observe(entry.context,entry.card,entry.role,
     adjustment*(i+1)/latest.length,entry.cost);
   }
   for(const trial of pending)
    observe(trial.context,trial.card,trial.role,won?.35:-1.2,trial.cost);
  }
  saving=null;readyGoal=null;saveCooldown=0;recentCastCount=0;
  selectionHistory=[];
  data.matches++;pending=[];recent=[];persist();
 }
 function exportJSON(){persist();return JSON.stringify({...data,
  castCounts:confirmedCasts,network:neural.snapshot()},null,2);}
 function importJSON(raw){if(!load(typeof raw==='string'?JSON.parse(raw):raw))
  throw Error('Memoria de experimentos incompatible');
  persist();return stats();}
 function stats(){return {mode:data.mode,matches:data.matches,
  contexts:new Set(Object.keys(data.trials).map(k=>k.split('|').slice(0,-2).join('|'))).size,
  experiments:Object.keys(data.trials).length,
  samples:Object.values(data.trials).reduce((n,r)=>n+r.n,0),
  pending:pending.length,savingFor:saving?.id||readyGoal?.id||null,
  saveCooldown:Math.round(saveCooldown*10)/10,
  cardsUsed:Object.fromEntries(usedCards),
  confirmedCasts:{...confirmedCasts},
  distinctCards:[...usedCards].filter(([,n])=>n>0).length,
  neuralExamples:neural.examples};}
 return {mode,setMode,context,select,considerSaving,begin,evaluate,observe,
  finishMatch,loadShared,exportJSON,importJSON,stats};
}
