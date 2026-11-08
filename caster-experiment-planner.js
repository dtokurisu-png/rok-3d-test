/* R.O.K. — experiential spellbook planner.
 * Never bypasses game validation: it only ranks cards supplied as legal.
 * Test mode explores untried (situation, card, role) combinations;
 * normal mode exploits observed results, keeping a safe fallback.
 * Each caster retains its own independent local training memory.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const empty=()=>({schema:1,updatedAt:null,mode:'test',trials:{},matches:0});
const number=x=>Number.isFinite(Number(x))?Number(x):0;
const safeKey=s=>String(s||'none').replace(/[^\w:|.-]/g,'_').slice(0,150);
export function createCasterExperimentPlanner({id,storage,initialMode='test'}){
 const key='rok.'+id+'.experiments.v1';
 let data=empty(),pending=[],chosen=null,dirty=0;
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
  data=clean;return true;
 }
 try{const raw=storage?.getItem(key);if(raw)load(JSON.parse(raw));}catch{}
 function persist(){
  try{
   data.updatedAt=new Date().toISOString();
   storage?.setItem(key,JSON.stringify(data));dirty=0;return true;
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
  data.mode=value==='normal'?'normal':'test';persist();
  return data.mode;
 }
 function context({caster,enemies=[],element=0,allies=[],side}){
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
  return safeKey([side||id,hp/max<=.35?'critical':hp/max<=.7?'hurt':'healthy',
   threat,enemyId,enemyHp,ownUnits,mana].join('|'));
 }
 const trialKey=(ctx,card,role='defense')=>safeKey(ctx+'|'+card+'|'+role);
 function row(ctx,card,role){return data.trials[trialKey(ctx,card,role)]||null;}
 function select({context:ctx,cards=[],available=0,threat=false,preferred=null}){
  const possible=cards.filter(c=>c&&c.id&&number(c.cost)<=available&&c.legal!==false);
  if(!possible.length){chosen=null;return null;}
  const roles=threat?['defense','offense']:['offense','defense'];
  const candidates=possible.flatMap(card=>roles.map(role=>{
   const r=row(ctx,card.id,role),n=r?.n||0;
   const success=r?.score||0;
   // Exploration samples each feasible, untested option before repeating
   // a known successful answer. No forced repeats of a single card.
   const explore=1/Math.sqrt(n+1);
   const base=(card.id===preferred?.id?.id||card.id===preferred?.id)?0.15:0;
   const score=data.mode==='test'?
    -n*2+success*.16+base+(role==='defense'&&threat?.2:0):
    success*(n/(n+3))+base+(role==='defense'&&threat?.4:0)+explore*.12;
   return {card,role,n,score};
  }));
  candidates.sort((a,b)=>b.score-a.score||
   a.card.cost-b.card.cost||a.card.id.localeCompare(b.card.id));
  const winner=candidates[0];
  chosen={context:ctx,card:winner.card.id,role:winner.role,at:Date.now()};
  return {card:winner.card,role:winner.role,trials:winner.n};
 }
 function begin({context:ctx,card,role='defense',snapshot}){
  if(!card?.id)return false;
  pending.push({context:ctx,card:card.id,role,start:number(snapshot?.time),
   snapshot,elapsed:0});
  if(pending.length>24)pending.shift();
  return true;
 }
 function evaluate(dt,snapshot){
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
   observe(p.context,p.card,p.role,score);
   pending.splice(i,1);
  }
 }
 function observe(ctx,card,role,reward){
  const k=trialKey(ctx,card,role),r=data.trials[k]||
   (data.trials[k]={n:0,wins:0,score:0,last:null});
  r.n++;r.score=clamp(r.score+(clamp(number(reward),-5,5)-r.score)/
   Math.min(30,r.n),-10,10);
  if(reward>0)r.wins++;
  r.last={reward:clamp(number(reward),-5,5),at:new Date().toISOString()};
  if(++dirty>=1)persist();
 }
 function finishMatch(){data.matches++;pending=[];persist();}
 function exportJSON(){persist();return JSON.stringify(data,null,2);}
 function importJSON(raw){if(!load(typeof raw==='string'?JSON.parse(raw):raw))
  throw Error('Memoria de experimentos incompatible');
  persist();return stats();}
 function stats(){return {mode:data.mode,matches:data.matches,
  contexts:new Set(Object.keys(data.trials).map(k=>k.split('|').slice(0,7).join('|'))).size,
  experiments:Object.keys(data.trials).length,
  samples:Object.values(data.trials).reduce((n,r)=>n+r.n,0),
  pending:pending.length};}
 return {mode,setMode,context,select,begin,evaluate,observe,
  finishMatch,loadShared,exportJSON,importJSON,stats};
}
