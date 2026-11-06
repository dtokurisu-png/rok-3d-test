/**
 * R.O.K. — Farolera, fase 6: planificador ofensivo independiente.
 *
 * El modo NO se decide aquí: el controlador de Chiara lo asignará en fase 8.
 * Esta función solo propone un plan de dos activaciones para una Farolera viva
 * cuando su habilidad esté disponible. No escribe en arena ni mueve unidades.
 */
import {FAROLERA_RANGE,distanceXZ} from './phase-3-lantern.js';
import {ARENA_BOUNDS,PORTAL_RADIUS,LANDING_CLEARANCE} from './phase-4-portal.js';

const EPS=1e-8;
const point=p=>({x:p.x,z:p.z});
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const inside=(p,b)=>p.x>=b.minX-EPS&&p.x<=b.maxX+EPS&&p.z>=b.minZ-EPS&&p.z<=b.maxZ+EPS;
const norm=(x,z)=>{const n=Math.hypot(x,z);return n>EPS?{x:x/n,z:z/n}:null};
const predict=(unit,seconds)=>{
 const vx=Number.isFinite(unit.vx)?unit.vx:0;
 const vz=Number.isFinite(unit.vz)?unit.vz:0;
 const speed=Math.hypot(vx,vz);
 const t=Math.max(0,Math.min(seconds,2));
 return {x:unit.x+vx*t,z:unit.z+vz*t,speed};
};
const alive=u=>u&&u.stage!=='dead'&&u.stage!=='dying'&&u.stage!=='vanishing'&&
 Number(u.hp??1)>0;

/**
 * Predict where an allied summon will walk and place the circle there.
 * Out-of-range projected positions are disregarded; a feasible intermediate
 * prediction is allowed. A higher-attack unit wins among feasible options.
 */
export function chooseOffensiveCircle({farolera,allies,bounds=ARENA_BOUNDS,predictionSeconds=1.1}){
 if(!finite(farolera)||!Array.isArray(allies))throw TypeError('Entradas inválidas');
 const candidates=[];
 for(const ally of allies){
  if(!finite(ally)||ally.id==null||ally.id===farolera.id||ally.role!=='summon'||
    ally.side!==farolera.side||!alive(ally))continue;
  const damage=Number(ally.attackDamage??ally.attack??0);
  if(!Number.isFinite(damage))continue;
  for(const seconds of [predictionSeconds,predictionSeconds*.65,predictionSeconds*.3,0]){
   const forecast=predict(ally,seconds);
   const circle={x:forecast.x,z:forecast.z};
   if(!inside(circle,bounds)||distanceXZ(farolera,circle)>FAROLERA_RANGE+EPS)continue;
   // Avoid self-overlap with the caster and avoid placing a portal under her.
   if(distanceXZ(farolera,circle)<=PORTAL_RADIUS+.15)continue;
   candidates.push({allyId:ally.id,ally,damage,circle,predictionSeconds:seconds,
     distance:distanceXZ(farolera,circle)});
   break;
  }
 }
 candidates.sort((a,b)=>b.damage-a.damage||
  b.predictionSeconds-a.predictionSeconds||
  a.distance-b.distance||
  String(a.allyId).localeCompare(String(b.allyId)));
 return candidates[0]||null;
}

/** Choose the farthest legal lamp point towards the enemy caster. */
export function chooseOffensiveLamp({farolera,enemyCaster,circle,bounds=ARENA_BOUNDS}){
 if(!finite(farolera)||!finite(enemyCaster)||!finite(circle))
  throw TypeError('Posiciones inválidas');
 const direction=norm(enemyCaster.x-farolera.x,enemyCaster.z-farolera.z);
 if(!direction)return null;
 // Step back from full reach only if arena bounds or circle overlap demand it.
 for(let range=FAROLERA_RANGE;range>=.1;range-=.05){
  const lamp={x:farolera.x+direction.x*range,z:farolera.z+direction.z*range};
  if(!inside(lamp,bounds))continue;
  if(distanceXZ(circle,lamp)<=PORTAL_RADIUS+LANDING_CLEARANCE+.03)continue;
  return {lamp,range:Number(range.toFixed(2))};
 }
 return null;
}

/**
 * Returns a proposal; not an execution. Mode comes exclusively from Chiara's
 * future control interface. The planner never switches modes autonomously.
 */
export function planFaroleraOffense({farolera,allies,enemyCaster,mode,abilityStatus,
 bounds=ARENA_BOUNDS,predictionSeconds=1.1}={}){
 if(mode!=='offensive')return {ok:false,reason:'not-offensive'};
 if(abilityStatus?.canCast!==true)return {ok:false,reason:'ability-unavailable'};
 if(!alive(farolera)||!finite(farolera))return {ok:false,reason:'farolera-unavailable'};
 const selected=chooseOffensiveCircle({farolera,allies,bounds,predictionSeconds});
 if(!selected)return {ok:false,reason:'no-eligible-ally-in-reach'};
 const landing=chooseOffensiveLamp({farolera,enemyCaster,circle:selected.circle,bounds});
 if(!landing)return {ok:false,reason:'no-safe-lantern-direction'};
 return {
  ok:true,mode:'offensive',targetId:selected.allyId,
  circle:point(selected.circle),lamp:point(landing.lamp),
  lampRange:landing.range,attackPriority:selected.damage,
  predictionSeconds:selected.predictionSeconds,
  actions:['cast-circle','throw-lantern'],
  // Execution is performed by the ability lifecycle after animation triggers.
  // Chiara decides if/when to accept this proposal.
  readyForChiaraDecision:true
 };
}
