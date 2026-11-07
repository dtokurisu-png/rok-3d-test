/* R.O.K. — browser-persistent, bounded tactical experience.
 * Decisions are keyed by compact tactical contexts, not by raw positions.
 * Local storage remains the source of truth; exported snapshots are portable.
 */
const KEY='rok.chiara.learning.v1';
const ACTIONS=new Set(['collect','retreat','guard','attack','cast','position','farolera-rescue','farolera-offense','farolera-hold']);
const empty=()=>({schema:1,updatedAt:null,decisions:{},matches:0});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function sanitize(input){
 if(!input||input.schema!==1||typeof input.decisions!=='object'||!input.decisions||Array.isArray(input.decisions))
  throw Error('Formato de aprendizaje incompatible');
 const data=empty();data.matches=clamp(Number(input.matches)||0,0,1000000);
 for(const [key,actions] of Object.entries(input.decisions).slice(0,1200)){
  if(key.length>180||!actions||typeof actions!=='object')continue;
  const safe={};
  for(const [action,stats] of Object.entries(actions)){
   if(!ACTIONS.has(action))continue;
   const n=clamp(Math.floor(Number(stats?.n)||0),0,1000000);
   const q=Number(stats?.q);
   if(n&&Number.isFinite(q))safe[action]={n,q:clamp(q,-4,4)};
  }
  if(Object.keys(safe).length)data.decisions[key]=safe;
 }
 data.updatedAt=typeof input.updatedAt==='string'?input.updatedAt:null;
 return data;
}
export function createChiaraLearning(){
 let data=empty();
 try{const raw=localStorage.getItem(KEY);if(raw)data=sanitize(JSON.parse(raw));}catch(_){}
 let dirty=0,available=true;
 const persist=()=>{try{data.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(data));available=true;dirty=0;}catch(_){available=false;}};
 const key=(unit,context)=>String(unit||'chiara')+'|'+String(context||'normal').slice(0,150);
 const get=(unit,context,action)=>data.decisions[key(unit,context)]?.[action]||null;
 const score=(unit,context,action)=>get(unit,context,action)?.q||0;
 function observe(unit,context,action,reward){
  if(!ACTIONS.has(action)||!Number.isFinite(reward))return;
  const k=key(unit,context),row=data.decisions[k]||(data.decisions[k]={});
  const v=row[action]||(row[action]={n:0,q:0});
  v.n++;v.q=clamp(v.q+(clamp(reward,-3,3)-v.q)/Math.min(v.n,30),-4,4);
  if(++dirty>=8)persist();
 }
 function choose(unit,context,actions,fallback){
  const candidates=actions.filter(a=>ACTIONS.has(a));
  if(!candidates.length)return fallback;
  // The baseline rule wins until enough comparable observations exist.
  const experienced=candidates.filter(a=>(get(unit,context,a)?.n||0)>=3);
  if(!experienced.length)return fallback;
  const ranked=experienced.sort((a,b)=>score(unit,context,b)-score(unit,context,a));
  const best=ranked[0];return score(unit,context,best)>score(unit,context,fallback)+.25?best:fallback;
 }
 function exportJSON(){persist();return JSON.stringify(data,null,2);}
 function importJSON(raw){
  const parsed=sanitize(typeof raw==='string'?JSON.parse(raw):raw);
  data=parsed;persist();return stats();
 }
 function stats(){
  return {matches:data.matches,contexts:Object.keys(data.decisions).length,
   samples:Object.values(data.decisions).reduce((n,v)=>n+Object.values(v).reduce((a,s)=>a+s.n,0),0),
   stored:available,updatedAt:data.updatedAt};
 }
 function finishMatch(){data.matches++;persist();}
 async function loadShared(url){
  if(localStorage.getItem(KEY))return false;
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)return false;
  importJSON(await r.json());return true;
 }
 window.addEventListener('pagehide',()=>{if(dirty)persist();});
 return {observe,choose,score,exportJSON,importJSON,stats,finishMatch,loadShared,persist};
}
