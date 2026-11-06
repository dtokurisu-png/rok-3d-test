import test from 'node:test';
import assert from 'node:assert/strict';
import {
 FAROLERA_COOLDOWN_SECONDS,createFaroleraAbility,beginFaroleraCircle,
 finishFaroleraLantern,cancelFaroleraPlacement,tickFaroleraAbility,
 onFaroleraDeath,stepFaroleraAbility,getFaroleraAbilityStatus
} from '../features/farolera/phase-1/phase-5-lifecycle.js';

const setup=()=>{
 const state=createFaroleraAbility({ownerId:'farolera',ownerSide:'ally'});
 assert.equal(beginFaroleraCircle(state,{origin:{x:0,z:0},circle:{x:1,z:0},mode:'offensive'}).ok,true);
 assert.equal(finishFaroleraLantern(state,{x:4,z:0}).ok,true);
 return state;
};
const ally=(x,z,stage='active')=>({id:'guardian',side:'ally',role:'summon',stage,x,z});

test('phase 5: exactly 20 seconds cooldown starts at second activation',()=>{
 const state=createFaroleraAbility({ownerId:'farolera'});
 assert.equal(beginFaroleraCircle(state,{origin:{x:0,z:0},circle:{x:1,z:0}}).ok,true);
 assert.equal(state.cooldownRemaining,0);
 assert.equal(finishFaroleraLantern(state,{x:4,z:0}).ok,true);
 assert.equal(FAROLERA_COOLDOWN_SECONDS,20);
 assert.equal(getFaroleraAbilityStatus(state).cooldownRemaining,20);
 tickFaroleraAbility(state,19.999);
 assert.equal(getFaroleraAbilityStatus(state).canCast,false);
 tickFaroleraAbility(state,.001);
 assert.equal(getFaroleraAbilityStatus(state).canCast,true);
});
test('phase 5: portal remains operational throughout cooldown',()=>{
 const state=setup();
 assert.equal(stepFaroleraAbility(state,[ally(1,0)]).length,1);
 assert.equal(state.cooldownRemaining,20);
 tickFaroleraAbility(state,5);
 assert.equal(getFaroleraAbilityStatus(state).portalActive,true);
});
test('phase 5: recasting replaces previous linked portal only after completion',()=>{
 const state=setup(),first=state.portal;
 tickFaroleraAbility(state,20);
 const start=beginFaroleraCircle(state,{origin:{x:0,z:0},circle:{x:0,z:1},mode:'defensive'});
 assert.equal(start.ok,true);
 assert.equal(first.active,true);
 assert.equal(state.portal,first);
 assert.equal(finishFaroleraLantern(state,{x:0,z:4}).ok,true);
 assert.equal(first.active,false);
 assert.notEqual(state.portal,first);
 assert.equal(state.portal.mode,'defensive');
 assert.equal(state.castCount,2);
 assert.equal(state.cooldownRemaining,20);
});
test('phase 5: no early recast; cancellation does not create cooldown',()=>{
 const state=setup();
 assert.equal(beginFaroleraCircle(state,{origin:{x:0,z:0},circle:{x:1,z:1}}).ok,false);
 tickFaroleraAbility(state,20);
 assert.equal(beginFaroleraCircle(state,{origin:{x:0,z:0},circle:{x:1,z:1}}).ok,true);
 assert.equal(cancelFaroleraPlacement(state),true);
 assert.equal(getFaroleraAbilityStatus(state).canCast,true);
});
test('phase 5: invalid lamp position preserves pending circle and old portal',()=>{
 const state=setup(),first=state.portal;
 tickFaroleraAbility(state,20);
 beginFaroleraCircle(state,{origin:{x:0,z:0},circle:{x:0,z:1}});
 assert.throws(()=>finishFaroleraLantern(state,{x:6,z:0}),RangeError);
 assert.equal(state.portal,first);
 assert.equal(first.active,true);
 assert.equal(state.phase,'awaiting-lantern');
});
test('phase 5: Farolera death cancels active and pending effects, forbids recast',()=>{
 const state=setup(),old=state.portal;
 onFaroleraDeath(state);
 assert.equal(old.active,false);
 assert.equal(state.portal,null);
 assert.equal(getFaroleraAbilityStatus(state).portalActive,false);
 assert.deepEqual(stepFaroleraAbility(state,[ally(1,0)]),[]);
 tickFaroleraAbility(state,30);
 assert.equal(beginFaroleraCircle(state,{origin:{x:0,z:0},circle:{x:1,z:0}}).ok,false);
 assert.equal(finishFaroleraLantern(state,{x:4,z:0}).ok,false);
});
test('phase 5: restoring beneficiary does not cancel portal',()=>{
 const state=setup();
 const moves=stepFaroleraAbility(state,[ally(1,0,'restoring')]);
 assert.equal(moves.length,1);
 assert.equal(getFaroleraAbilityStatus(state).portalActive,true);
});
test('phase 5: owner death while preparing cancels placement',()=>{
 const state=createFaroleraAbility({ownerId:'farolera'});
 beginFaroleraCircle(state,{origin:{x:0,z:0},circle:{x:1,z:0}});
 onFaroleraDeath(state);
 assert.equal(state.pending,null);
 assert.equal(state.phase,'dead');
});
test('phase 5: reject invalid negative/non-finite simulation time',()=>{
 const state=setup();
 assert.throws(()=>tickFaroleraAbility(state,-1),RangeError);
 assert.throws(()=>tickFaroleraAbility(state,Infinity),RangeError);
 assert.equal(state.cooldownRemaining,20);
});
