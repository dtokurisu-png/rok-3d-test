/**
 * R.O.K. — Fase 7: planificador DEFENSIVO de la Farolera.
 * Módulo aislado. No cambia el combate ni selecciona el modo de Chiara.
 * Devuelve una propuesta para las dos activaciones: círculo -> lámpara.
 */
import {FAROLERA_RANGE,distanceXZ} from './phase-3-lantern.js';
import {ARENA_BOUNDS,PORTAL_RADIUS,LANDING_CLEARANCE} from './phase-4-portal.js';

const EPS=1e-8;
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const inside=(p,b)=>finite(p)&&p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ;
const living=u=>u&&finite(u)&&!['dead','dying','vanishing'].includes(u.stage)&&Number(u.hp??1)>0;
const position=u=>({x:u.x,z:u.z});
const move=(u,seconds)=>({
 x:u.x+(Number.isFinite(u.vx)?u.vx:0)*seconds,
 z:u.z+(Number.isFinite(u.vz)?u.vz:0)*seconds
});
const rangeOf=e=>Math.max(.3,Number(e.range??e.attackRange??1.5)||1.5);
const damageOf=e=>Math.max(0,Number(e.attackDamage??e.attack??1)||0);
const hpOf=u=>Math.max(.01,Number(u.hp??1)||1);
const closing=(a,b)=>distanceXZ(a,b);

/**
 * Risk score: lethal hits and enemies in striking range have priority;
 * recent incoming damage can be provided as incomingDps.
 * Provisional deterministic heuristic, NOT omniscient actual game AI.
 */
export function assessFaroleraThreat(unit,enemies,{horizon=1.1}={}){
 if(!living(unit))return {danger:0,lethal:false,imminent:false,nearest:null};
 let incoming=0,nearest=null,nearestDistance=Infinity;
 const seconds=Math.max(0,Math.min(2,Number(horizon)||0));
 for(const enemy of enemies||[]){
  if(!living(enemy)||enemy.side===unit.side)continue;
  const d=closing(move(unit,seconds*.5),move(enemy,seconds*.5));
  if(d<nearestDistance){nearestDistance=d;nearest=enemy.id;}
  const r=rangeOf(enemy)+.45;
  if(d>r+1.25)continue;
  // Higher likelihood inside attack range; declining when approaching it.
  const weight=d<=r?1:Math.max(0,1-(d-r)/1.25);
  incoming+=damageOf(enemy)*weight;
 }
 const extra=Math.max(0,Number(unit.incomingDps)||0)*seconds;
 const expected=incoming+extra;
 const lethal=expected>=hpOf(unit);
 const imminent=expected>0&&lethal;
 const danger=expected?expected/hpOf(unit)+(lethal?4:0):0;
 return {danger,lethal,imminent,nearest,expectedDamage:expected,nearestDistance};
}

/** Candidates near the beneficiary: along the predicted path or current tile. */
export function chooseDefensiveCircle({farolera,unit,bounds=ARENA_BOUNDS,predictionSeconds=.65}){
 if(!finite(farolera)||!finite(unit))return null;
 const samples=[0,predictionSeconds*.5,predictionSeconds];
 for(const t of samples){
  const c=move(unit,t);
  if(!inside(c,bounds)||distanceXZ(farolera,c)>FAROLERA_RANGE+EPS)continue;
  return {circle:c,predictionSeconds:t};
 }
 return null;
}

/**
 * Choose safest point at most four cells from Farolera, preferring retreat
 * toward friendly caster (if available), then away from enemy units.
 * Never place the lamp on top of the circle or another combatant.
 */
export function chooseDefensiveLamp({farolera,circle,allies=[],enemies=[],friendlyCaster=null,
 bounds=ARENA_BOUNDS}){
 if(!finite(farolera)||!finite(circle))return null;
 const candidates=[];
 for(let radius=FAROLERA_RANGE;radius>=.5;radius-=.5){
  for(let i=0;i<32;i++){
   const a=2*Math.PI*i/32;
   const p={x:farolera.x+Math.cos(a)*radius,z:farolera.z+Math.sin(a)*radius};
   if(!inside(p,bounds)||distanceXZ(p,circle)<=PORTAL_RADIUS+LANDING_CLEARANCE+.08)continue;
   if([...allies,...enemies].some(u=>living(u)&&distanceXZ(p,u)<LANDING_CLEARANCE))continue;
   const threats=enemies.filter(living);
   const closest=threats.length?Math.min(...threats.map(e=>Math.max(0,distanceXZ(p,e)-rangeOf(e)))):8;
   const safeFromEnemy=Math.min(closest,8);
   const nearCaster=finite(friendlyCaster)?distanceXZ(p,friendlyCaster):0;
   // Enemy safety first; friendly caster proximity and maximum retreat second.
   const score=safeFromEnemy*5-nearCaster*.5+radius*.15;
   candidates.push({lamp:p,score,range:radius,safeFromEnemy});
  }
 }
 candidates.sort((a,b)=>b.score-a.score||b.range-a.range||
  a.lamp.x-b.lamp.x||a.lamp.z-b.lamp.z);
 return candidates[0]||null;
}

/**
 * Only a Chiara-provided defensive mode enables this planner. The Farolera
 * herself is eligible as a rescue target in DEFENSIVE mode (self-escape).
 */
export function planFaroleraDefense({farolera,allies=[],enemies=[],friendlyCaster=null,mode,
 abilityStatus,bounds=ARENA_BOUNDS,predictionSeconds=.65}={}){
 if(mode!=='defensive')return {ok:false,reason:'not-defensive'};
 if(abilityStatus?.canCast!==true)return {ok:false,reason:'ability-unavailable'};
 if(!living(farolera))return {ok:false,reason:'farolera-unavailable'};
 const targets=[...allies,farolera].filter((u,i,all)=>living(u)&&u.side===farolera.side&&
  (u.id!==farolera.id||i===all.length-1)&&u.id!=null);
 const candidates=[];
 for(const unit of targets){
  const threat=assessFaroleraThreat(unit,enemies);
  if(threat.danger<=0)continue;
  const circle=chooseDefensiveCircle({farolera,unit,bounds,predictionSeconds});
  if(!circle)continue;
  const lamp=chooseDefensiveLamp({farolera,circle:circle.circle,allies:targets,
   enemies,friendlyCaster,bounds});
  if(!lamp)continue;
  candidates.push({unit,threat,circle,lamp});
 }
 candidates.sort((a,b)=>Number(b.threat.lethal)-Number(a.threat.lethal)||
  b.threat.danger-a.threat.danger||
  Number(a.unit.id===farolera.id)-Number(b.unit.id===farolera.id)||
  String(a.unit.id).localeCompare(String(b.unit.id)));
 const best=candidates[0];
 if(!best)return {ok:false,reason:'no-rescue-opportunity'};
 return {
  ok:true,mode:'defensive',targetId:best.unit.id,
  selfRescue:best.unit.id===farolera.id,
  dangerScore:best.threat.danger,lethalRisk:best.threat.lethal,
  circle:best.circle.circle,lamp:best.lamp.lamp,lampRange:best.lamp.range,
  actions:['cast-circle','throw-lantern'],
  readyForChiaraDecision:true
 };
}
