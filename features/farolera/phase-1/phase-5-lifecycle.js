/**
 * R.O.K. — Farolera / fase 5
 * Ciclo de vida aislado: recasteo, enfriamiento, muerte y restauración.
 * No cambia arena-25d.html, animaciones, modelos ni inteligencia de Chiara.
 */
import {
 createFaroleraPortal,linkFaroleraLantern,stepFaroleraPortal
} from './phase-4-portal.js';

export const FAROLERA_COOLDOWN_SECONDS=20;

/**
 * El enfriamiento empieza al completar la SEGUNDA activación (lámpara).
 * El portal permanece operativo durante ese enfriamiento, hasta que
 * otro portal válido lo sustituya o fallezca la Farolera.
 *
 * Cada llamada es para UNA Farolera concreta. Chiara asignará el modo
 * ofensivo/defensivo cuando se integre la IA (fase 8).
 */
export function createFaroleraAbility({ownerId,ownerSide='ally'}={}){
 if(ownerId==null||!['ally','enemy'].includes(ownerSide)){
  throw new TypeError('Farolera necesita un propietario y un bando válidos');
 }
 return {
  ownerId,ownerSide,alive:true,
  phase:'ready',cooldownRemaining:0,
  portal:null,pending:null,castCount:0,
  generation:0
 };
}

const ready=state=>state.alive&&state.phase==='ready'&&state.cooldownRemaining<=0;

export function beginFaroleraCircle(state,{origin,circle,mode='offensive'}){
 if(!ready(state))return {ok:false,reason:state.alive?'cooldown-or-pending':'owner-dead'};
 // Build and validate first. A bad placement must not destroy the old portal.
 const pending=createFaroleraPortal({
  ownerId:state.ownerId,ownerSide:state.ownerSide,origin,circle,mode
 });
 state.pending=pending;
 state.phase='awaiting-lantern';
 return {ok:true,phase:state.phase,circle:{...pending.circle}};
}

export function finishFaroleraLantern(state,lamp){
 if(!state.alive)return {ok:false,reason:'owner-dead'};
 if(state.phase!=='awaiting-lantern'||!state.pending){
  return {ok:false,reason:'circle-required'};
 }
 // Invalid destinations leave the circle pending for another attempt.
 linkFaroleraLantern(state.pending,lamp);
 if(state.portal){
  state.portal.active=false;
  state.portal.inside.clear();
  state.portal.previous.clear();
 }
 state.portal=state.pending;
 state.pending=null;
 state.castCount++;
 state.generation++;
 state.cooldownRemaining=FAROLERA_COOLDOWN_SECONDS;
 state.phase='cooldown';
 return {
  ok:true,phase:state.phase,cooldownRemaining:state.cooldownRemaining,
  generation:state.generation,lamp:{...state.portal.lamp}
 };
}

export function cancelFaroleraPlacement(state){
 if(state.phase!=='awaiting-lantern')return false;
 state.pending=null;
 state.phase=state.cooldownRemaining>0?'cooldown':'ready';
 return true;
}

/** dt is seconds of simulated combat, not real-world wall-clock time. */
export function tickFaroleraAbility(state,dt){
 if(!Number.isFinite(dt)||dt<0)throw new RangeError('dt debe ser >= 0');
 if(!state.alive)return {phase:'dead',cooldownRemaining:state.cooldownRemaining};
 state.cooldownRemaining=Math.max(0,state.cooldownRemaining-dt);
 if(state.phase==='cooldown'&&state.cooldownRemaining<=0)state.phase='ready';
 return {phase:state.phase,cooldownRemaining:state.cooldownRemaining};
}

/**
 * La restauración de la BENEFICIARIA no cancela el portal.
 * La muerte de la Farolera sí lo desactiva permanentemente hasta
 * que nazca una nueva instancia de la habilidad.
 */
export function onFaroleraDeath(state){
 state.alive=false;
 state.phase='dead';
 state.pending=null;
 if(state.portal){
  state.portal.active=false;
  state.portal.inside.clear();
  state.portal.previous.clear();
 }
 state.portal=null;
 state.generation++;
 return {phase:'dead',active:false};
}

export function stepFaroleraAbility(state,units){
 if(!Array.isArray(units))throw new TypeError('units must be an array');
 if(!state.alive||!state.portal?.active)return [];
 return stepFaroleraPortal(state.portal,units,{ownerAlive:true});
}

export function getFaroleraAbilityStatus(state){
 return {
  phase:state.phase,
  alive:state.alive,
  canCast:ready(state),
  awaitingLantern:state.phase==='awaiting-lantern',
  portalActive:!!(state.alive&&state.portal?.active),
  cooldownRemaining:state.cooldownRemaining,
  castCount:state.castCount,
  generation:state.generation
 };
}
