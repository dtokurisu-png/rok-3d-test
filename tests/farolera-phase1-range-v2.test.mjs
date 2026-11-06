import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createFaroleraAbility,beginDefensiveLantern,finishDefensiveCircle,
 tickFaroleraAbility,getFaroleraAbilityStatus
} from '../features/farolera/phase-1/phase-5-lifecycle.js';
import {
 createChiaraFaroleraController,orderFaroleraMode,
 proposeChiaraFaroleraAction,activateChiaraDefensiveLantern,
 activateChiaraDefensiveCircle
} from '../features/farolera/phase-1/phase-8-chiara-controller.js';
import {distanceXZ} from '../features/farolera/phase-1/phase-3-lantern.js';
import {planFaroleraOffense} from '../features/farolera/phase-1/phase-6-offense.js';
import {planFaroleraDefense} from '../features/farolera/phase-1/phase-7-defense.js';

const origin={x:0,z:0};
test('range v2: defensive lamp validates precisely four cells FROM launch position',()=>{
 const a=createFaroleraAbility({ownerId:'farolera'});
 assert.throws(()=>beginDefensiveLantern(a,{origin,lamp:{x:4.001,z:0}}),RangeError);
 assert.equal(beginDefensiveLantern(a,{origin,lamp:{x:-4,z:0}}).ok,true);
 assert.equal(a.phase,'awaiting-circle');
});
test('range v2: defensive circle uses Farolera NEW position after moving',()=>{
 const a=createFaroleraAbility({ownerId:'farolera'});
 beginDefensiveLantern(a,{origin,lamp:{x:-4,z:0}});
 const moved={x:4,z:0};
 assert.throws(()=>finishDefensiveCircle(a,{origin:moved,circle:{x:8.01,z:0}}),RangeError);
 assert.equal(a.phase,'awaiting-circle');
 const result=finishDefensiveCircle(a,{origin:moved,circle:{x:7,z:0}});
 assert.equal(result.ok,true);
 assert.equal(a.portal.active,true);
 assert.equal(a.portal.lamp.x,-4);
 assert.equal(a.portal.circle.x,7);
 assert.equal(a.cooldownRemaining,5);
 tickFaroleraAbility(a,4.9);
 assert.equal(getFaroleraAbilityStatus(a).canCast,false);
 tickFaroleraAbility(a,.1);
 assert.equal(getFaroleraAbilityStatus(a).canCast,true);
});
test('range v2: defensive portal can span 8+ cells because each cast has its own four-cell origin',()=>{
 const a=createFaroleraAbility({ownerId:'farolera'});
 beginDefensiveLantern(a,{origin:{x:0,z:0},lamp:{x:-4,z:0}});
 finishDefensiveCircle(a,{origin:{x:4,z:0},circle:{x:7,z:0}});
 assert.ok(distanceXZ(a.portal.circle,a.portal.lamp)>8);
});
test('range v2: offensive plan limits BOTH entry and exit to four from current Farolera',()=>{
 const farolera={id:'f',role:'summon',side:'ally',stage:'active',hp:2,x:0,z:0};
 const ally={id:'a',role:'summon',side:'ally',stage:'active',hp:3,
  attackDamage:5,x:-3,z:0};
 const plan=planFaroleraOffense({farolera,allies:[ally],
  enemyCaster:{x:10,z:0},mode:'offensive',abilityStatus:{canCast:true}});
 assert.equal(plan.ok,true);
 assert.ok(distanceXZ(farolera,plan.circle)<=4+1e-8);
 assert.ok(distanceXZ(farolera,plan.lamp)<=4+1e-8);
 assert.equal(plan.actions[0],'cast-circle');
});
test('range v2: defensive planner prepares retreat lamp before any circle',()=>{
 const farolera={id:'f',role:'summon',side:'ally',stage:'active',hp:2,x:0,z:0};
 const ally={id:'a',role:'summon',side:'ally',stage:'active',hp:3,
  attackDamage:5,x:2,z:0};
 const plan=planFaroleraDefense({farolera,allies:[ally],enemies:[],
  friendlyCaster:{x:0,z:-8},mode:'defensive',abilityStatus:{canCast:true}});
 assert.equal(plan.ok,true);
 assert.equal(plan.actions[0],'throw-lantern');
 assert.ok(distanceXZ(farolera,plan.lamp)<=4+1e-8);
});
test('range v2: Chiara owns the reversed defensive two-step order',()=>{
 const ctrl=createChiaraFaroleraController({chiaraId:'chiara',faroleraId:'f'});
 const farolera={id:'f',role:'summon',side:'ally',stage:'active',hp:2,x:0,z:0};
 const ally={id:'a',role:'summon',side:'ally',stage:'active',hp:3,attackDamage:5,x:2,z:0};
 orderFaroleraMode(ctrl,{issuerId:'chiara',mode:'defensive'});
 const plan=proposeChiaraFaroleraAction(ctrl,{farolera,allies:[ally],
  friendlyCaster:{x:0,z:-7},enemies:[]});
 assert.equal(plan.ok,true);
 assert.equal(activateChiaraDefensiveLantern(ctrl,plan,{farolera}).ok,true);
 assert.equal(ctrl.ability.phase,'awaiting-circle');
 assert.equal(activateChiaraDefensiveCircle(ctrl,{
  farolera:{...farolera,x:3},circle:{x:2,z:0}
 }).ok,true);
 assert.equal(ctrl.ability.cooldownRemaining,5);
});
