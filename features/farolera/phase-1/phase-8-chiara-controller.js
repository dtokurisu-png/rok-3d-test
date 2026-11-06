/**
 * R.O.K. / Phase 8 — Chiara's tactical orders for the Farolera.
 * Standalone adapter: no changes to arena, HUD, models or animation clips.
 * The Farolera DOES NOT choose her own mode. Chiara must supply an order.
 */
import {planFaroleraOffense} from './phase-6-offense.js';
import {planFaroleraDefense} from './phase-7-defense.js';
import {
 createFaroleraAbility,getFaroleraAbilityStatus,beginFaroleraCircle,
 finishFaroleraLantern,tickFaroleraAbility,stepFaroleraAbility,
 cancelFaroleraPlacement,onFaroleraDeath
} from './phase-5-lifecycle.js';

export const CHIARA_TACTICS=Object.freeze(['offensive','defensive']);
const validMode=mode=>CHIARA_TACTICS.includes(mode);
const clonePosition=p=>({x:p.x,z:p.z});
const copyPlan=plan=>({
 ...plan,circle:clonePosition(plan.circle),lamp:clonePosition(plan.lamp),
 actions:[...plan.actions]
});

/**
 * Registers a single Farolera under Chiara's control. No default tactical mode:
 * the ability remains idle until an explicit external Chiara order is received.
 */
export function createChiaraFaroleraController({chiaraId,faroleraId,side='ally'}={}){
 if(chiaraId==null||faroleraId==null||chiaraId===faroleraId)
  throw new TypeError('Chiara y Farolera deben tener identificadores distintos');
 return {
  chiaraId,faroleraId,side,
  order:null,orderRevision:0,
  ability:createFaroleraAbility({ownerId:faroleraId,ownerSide:side}),
  pendingPlan:null,
  lastPlan:null
 };
}

/** Called by Chiara's decision system; the test switch will call this later. */
export function orderFaroleraMode(controller,{issuerId,mode}={}){
 if(issuerId!==controller.chiaraId)return {ok:false,reason:'only-chiara-can-command'};
 if(!validMode(mode))return {ok:false,reason:'invalid-mode'};
 if(!controller.ability.alive)return {ok:false,reason:'farolera-dead'};
 if(controller.order===mode)return {ok:true,mode,changed:false,revision:controller.orderRevision};
 controller.order=mode;
 controller.orderRevision++;
 // A prepared, uncompleted cast cannot be quietly redirected to another
 // mode. Cancel that first activation without touching an active old portal.
 if(controller.pendingPlan){
  cancelFaroleraPlacement(controller.ability);
  controller.pendingPlan=null;
 }
 return {ok:true,mode,changed:true,revision:controller.orderRevision};
}

export function proposeChiaraFaroleraAction(controller,{
 farolera,allies=[],enemies=[],enemyCaster,friendlyCaster,bounds
}={}){
 if(!controller.order)return {ok:false,reason:'awaiting-chiara-order'};
 if(!farolera||farolera.id!==controller.faroleraId||farolera.side!==controller.side)
  return {ok:false,reason:'farolera-identity-mismatch'};
 const abilityStatus=getFaroleraAbilityStatus(controller.ability);
 if(!abilityStatus.canCast)return {ok:false,reason:'ability-unavailable'};
 const common={farolera,allies,enemies,enemyCaster,friendlyCaster,
  mode:controller.order,abilityStatus};
 if(bounds)common.bounds=bounds;
 const plan=controller.order==='offensive'?
  planFaroleraOffense(common):planFaroleraDefense(common);
 if(!plan.ok)return plan;
 const proposal={...copyPlan(plan),orderRevision:controller.orderRevision};
 controller.lastPlan=proposal;
 return proposal;
}

/**
 * First ability activation, dispatched by the caller to the existing
 * animation 14 (frames 26-50) once integration is authorized.
 */
export function activateChiaraFaroleraCircle(controller,proposal,{farolera}={}){
 if(!proposal?.ok||proposal.mode!==controller.order||
  proposal.orderRevision!==controller.orderRevision)
  return {ok:false,reason:'obsolete-or-unapproved-plan'};
 if(controller.pendingPlan)return {ok:false,reason:'first-activation-pending'};
 if(!farolera||farolera.id!==controller.faroleraId||farolera.side!==controller.side)
  return {ok:false,reason:'farolera-identity-mismatch'};
 const result=beginFaroleraCircle(controller.ability,{
  origin:clonePosition(farolera),circle:proposal.circle,mode:controller.order
 });
 if(result.ok)controller.pendingPlan={
  ...copyPlan(proposal),orderRevision:controller.orderRevision
 };
 return result;
}

/**
 * Second activation: only after a matching completed circle.
 * The game must trigger this on the established attack animation release.
 */
export function activateChiaraFaroleraLantern(controller){
 const plan=controller.pendingPlan;
 if(!plan)return {ok:false,reason:'circle-required'};
 if(plan.orderRevision!==controller.orderRevision||plan.mode!==controller.order){
  cancelFaroleraPlacement(controller.ability);
  controller.pendingPlan=null;
  return {ok:false,reason:'order-changed'};
 }
 const result=finishFaroleraLantern(controller.ability,plan.lamp);
 if(result.ok)controller.pendingPlan=null;
 return result;
}

export function tickChiaraFarolera(controller,dt,units=[]){
 const clock=tickFaroleraAbility(controller.ability,dt);
 const transfers=stepFaroleraAbility(controller.ability,units);
 return {clock,transfers,
  order:controller.order,ability:getFaroleraAbilityStatus(controller.ability)};
}

export function chiaraFaroleraDeath(controller){
 controller.pendingPlan=null;
 onFaroleraDeath(controller.ability);
 return {mode:controller.order,active:false,alive:false};
}
