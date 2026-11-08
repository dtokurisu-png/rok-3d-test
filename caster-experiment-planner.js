/* R.O.K. — experiential spellbook planner.
 * Never bypasses game validation: it only ranks cards supplied as legal.
 * Test mode explores untried (situation, card, role) combinations;
 * normal mode exploits observed results, keeping a safe fallback.
 * Each caster retains its own independent local training memory.
 */
import {createCasterNeuralEvaluator} from './caster-neural-evaluator.js?v=20261108-1';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const empty=()=>({schema:1,updatedAt:null,mode:'test',trials:{},matches:0});
const number=x=>Number.isFinite(Number(x))?Number(x):0;
const safeKey=s=>String(s||'none').replace(/[^\w:|.-]/g,'_').slice(0,210);
export function createCasterExperimentPlanner({id,storage,initialMode='test'}){
 const key='rok.'+id+'.experiments.v1';
 let data=empty(),pending=[],chosen=null,saving=null,recent=[],dirty=0;
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
  if(input.network)neural.restore(input.network);
  return true;
 }
 try{const raw=storage?.getItem(key);if(raw)load(JSON.parse(raw));}catch{}
 function persist(){
  try{
   data.updatedAt=new Date().toISOString();
   storage?.setItem(key,JSON.stringify({...data,network:neural.snapshot()}));
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
  if(data.mode==='normal')saving=null;
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
 function select({context:ctx,cards=[],available=0,threat=false,preferred=null}){
  const possible=cards.filter(c=>c&&c.id&&number(c.cost)<=available&&c.legal!==false);
  if(!possible.length){chosen=null;return null;}
  const roles=threat?['defense','offense']:['offense','defense'];
  const candidates=possible.flatMap(card=>
   (card.type==='equipment'||card.type==='spell'?['support']:roles).map(role=>{
   const candidateId=card.experimentId||card.id;
   const r=row(ctx,candidateId,role),n=r?.n||0;
   const success=r?.score||0;
   // Exploration samples each feasible, untested option before repeating
   // a known successful answer. No forced repeats of a single card.
   const explore=1/Math.sqrt(n+1);
   const base=(card.id===preferred?.id?.id||card.id===preferred?.id)?0.15:0;
   // In normal mode, generalize from similar situations through the
   // neural evaluator, but give direct evidence increasing precedence.
   const neuralScore=neural.predict(ctx,card,role);
   const score=data.mode==='test'?
    -n*2+success*.16+base+(role==='defense'&&threat?.2:0):
    success*(n/(n+3))+neuralScore*1.25*(3/(n+3))+
    base+(role==='defense'&&threat?.4:0)+explore*.12;
   return {card,role,n,score};
  }));
  candidates.sort((a,b)=>b.score-a.score||
   a.card.cost-b.card.cost||a.card.id.localeCompare(b.card.id));
  const winner=candidates[0];
  chosen={context:ctx,card:winner.card.experimentId||winner.card.id,
   role:winner.role,at:Date.now()};
  return {card:winner.card,role:winner.role,trials:winner.n};
 }
 // "Save instead of cost-one" is a REAL testable choice too.
 // Never save in immediate danger or for a card above unlocked capacity.
 // A waiting decision does not freeze the caster: the ordinary AI
 // continues looking for resources, moving and defending.
 function considerSaving({context:ctx,cards=[],available=0,capacity=0,threat=false}){
  if(saving){
   // An immediate threat interrupts saving: defend or cast now.
   if(!threat&&available<saving.cost&&saving.elapsed<7)return true;
   if(available>=saving.cost)
    observe(saving.context,saving.card,'economy',1.2,saving.cost);
   else
    observe(saving.context,saving.card,'economy',threat?-.4:-.8,saving.cost);
   saving=null;
  }
  if(threat||available<1||data.mode!=='test')return false;
  const later=cards.filter(c=>c?.id&&Number(c.cost)>available&&Number(c.cost)<=capacity)
   .sort((a,b)=>a.cost-b.cost);
  const affordable=cards.filter(c=>c?.id&&Number(c.cost)<=available);
  if(!later.length||!affordable.length)return false;
  const tried=affordable.some(card=>
   (row(ctx,card.experimentId||card.id,'defense')?.n||0)+
   (row(ctx,card.experimentId||card.id,'offense')?.n||0)+
   (row(ctx,card.experimentId||card.id,'support')?.n||0)>0);
  if(!tried)return false; // Initially try what can be cast now.
  const goal=later.find(card=>(row(ctx,'save-for-'+card.id,'economy')?.n||0)===0);
  if(!goal)return false;
  saving={context:ctx,card:'save-for-'+goal.id,cost:Number(goal.cost),elapsed:0};
  return true;
 }
 function begin({context:ctx,card,role='defense',snapshot}){
  if(!card?.id)return false;
  pending.push({context:ctx,card:card.experimentId||card.id,
   cost:number(card.cost),role,start:number(snapshot?.time),
   snapshot,elapsed:0});
  if(pending.length>24)pending.shift();
  return true;
 }
 function evaluate(dt,snapshot){
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
   const damageAvoided=prevented===0&&number(before.enemyCount)>0?.5:0;
   const score=clamp(inflicted*.7+enemyDelta*1.5+alliesDelta*.3+
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
  if(saving){
   observe(saving.context,saving.card,'economy',won===false?-.8:0,saving.cost);
   saving=null;
  }
  data.matches++;pending=[];recent=[];persist();
 }
 function exportJSON(){persist();return JSON.stringify({...data,
  network:neural.snapshot()},null,2);}
 function importJSON(raw){if(!load(typeof raw==='string'?JSON.parse(raw):raw))
  throw Error('Memoria de experimentos incompatible');
  persist();return stats();}
 function stats(){return {mode:data.mode,matches:data.matches,
  contexts:new Set(Object.keys(data.trials).map(k=>k.split('|').slice(0,-2).join('|'))).size,
  experiments:Object.keys(data.trials).length,
  samples:Object.values(data.trials).reduce((n,r)=>n+r.n,0),
  pending:pending.length,savingFor:saving?.card||null,
  neuralExamples:neural.examples};}
 return {mode,setMode,context,select,considerSaving,begin,evaluate,observe,
  finishMatch,loadShared,exportJSON,importJSON,stats};
}
