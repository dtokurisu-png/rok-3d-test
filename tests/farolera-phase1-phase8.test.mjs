import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createChiaraFaroleraController,orderFaroleraMode,proposeChiaraFaroleraAction,
 activateChiaraFaroleraCircle,activateChiaraFaroleraLantern,tickChiaraFarolera,
 chiaraFaroleraDeath
} from '../features/farolera/phase-1/phase-8-chiara-controller.js';

const farolera={id:'f',side:'ally',role:'summon',stage:'active',hp:4,x:0,z:0};
const friend={id:'warrior',side:'ally',role:'summon',stage:'active',hp:2,
 attackDamage:7,x:2,z:0,vx:0,vz:0};
const enemy={id:'raider',side:'enemy',role:'summon',stage:'active',
 hp:8,attackDamage:5,range:1.5,x:2,z:1};
const setup=()=>createChiaraFaroleraController({chiaraId:'chiara',faroleraId:'f'});
const situation=(overrides={})=>({
 farolera,allies:[friend],enemies:[enemy],enemyCaster:{x:0,z:-12},
 friendlyCaster:{x:0,z:7},...overrides
});
test('phase 8: Farolera is idle until Chiara supplies a mode',()=>{
 const c=setup();
 assert.equal(proposeChiaraFaroleraAction(c,situation()).reason,'awaiting-chiara-order');
 assert.equal(c.order,null);
});
test('phase 8: no other caster can change Farolera mode',()=>{
 const c=setup();
 assert.equal(orderFaroleraMode(c,{issuerId:'someone-else',mode:'offensive'}).ok,false);
 assert.equal(orderFaroleraMode(c,{issuerId:'chiara',mode:'unknown'}).ok,false);
 assert.equal(c.order,null);
});
test('phase 8: Chiara issues offense and planner prioritizes strongest ally',()=>{
 const c=setup();
 assert.equal(orderFaroleraMode(c,{issuerId:'chiara',mode:'offensive'}).ok,true);
 const plan=proposeChiaraFaroleraAction(c,situation());
 assert.equal(plan.ok,true);
 assert.equal(plan.mode,'offensive');assert.equal(plan.targetId,'warrior');
 assert.equal(plan.orderRevision,1);
});
test('phase 8: circle then lamp activates portal and cooldown',()=>{
 const c=setup();
 orderFaroleraMode(c,{issuerId:'chiara',mode:'offensive'});
 const plan=proposeChiaraFaroleraAction(c,situation());
 assert.equal(activateChiaraFaroleraLantern(c).ok,false);
 assert.equal(activateChiaraFaroleraCircle(c,plan,{farolera}).ok,true);
 assert.equal(activateChiaraFaroleraLantern(c).ok,true);
 const state=tickChiaraFarolera(c,0,[]);
 assert.equal(state.ability.portalActive,true);
 assert.equal(state.ability.cooldownRemaining,20);
 assert.equal(state.ability.castCount,1);
});
test('phase 8: changing mode cancels only an incomplete cast',()=>{
 const c=setup();
 orderFaroleraMode(c,{issuerId:'chiara',mode:'offensive'});
 const proposal=proposeChiaraFaroleraAction(c,situation());
 activateChiaraFaroleraCircle(c,proposal,{farolera});
 assert.equal(orderFaroleraMode(c,{issuerId:'chiara',mode:'defensive'}).changed,true);
 assert.equal(c.pendingPlan,null);
 assert.equal(activateChiaraFaroleraLantern(c).ok,false);
 assert.equal(activateChiaraFaroleraCircle(c,proposal,{farolera}).ok,false);
 assert.equal(c.ability.cooldownRemaining,0);
});
test('phase 8: a defensive order prioritizes ally endangered by lethal enemy',()=>{
 const c=setup();
 orderFaroleraMode(c,{issuerId:'chiara',mode:'defensive'});
 const plan=proposeChiaraFaroleraAction(c,situation());
 assert.equal(plan.ok,true);
 assert.equal(plan.mode,'defensive');
 assert.equal(plan.targetId,'warrior');
 assert.equal(plan.lethalRisk,true);
});
test('phase 8: cooldown prevents a second cast but maintains active portal',()=>{
 const c=setup();
 orderFaroleraMode(c,{issuerId:'chiara',mode:'offensive'});
 const plan=proposeChiaraFaroleraAction(c,situation());
 activateChiaraFaroleraCircle(c,plan,{farolera});
 activateChiaraFaroleraLantern(c);
 assert.equal(proposeChiaraFaroleraAction(c,situation()).reason,'ability-unavailable');
 const s=tickChiaraFarolera(c,19,[]);
 assert.equal(s.ability.portalActive,true);
 assert.equal(s.ability.canCast,false);
 assert.equal(tickChiaraFarolera(c,1,[]).ability.canCast,true);
});
test('phase 8: owner death stops transfers and further orders',()=>{
 const c=setup();
 orderFaroleraMode(c,{issuerId:'chiara',mode:'offensive'});
 const plan=proposeChiaraFaroleraAction(c,situation());
 activateChiaraFaroleraCircle(c,plan,{farolera});
 activateChiaraFaroleraLantern(c);
 chiaraFaroleraDeath(c);
 assert.equal(c.ability.alive,false);
 assert.equal(orderFaroleraMode(c,{issuerId:'chiara',mode:'defensive'}).ok,false);
 assert.equal(tickChiaraFarolera(c,1,[friend]).transfers.length,0);
});
test('phase 8: mismatch identity rejects all plans and activations',()=>{
 const c=setup();
 orderFaroleraMode(c,{issuerId:'chiara',mode:'offensive'});
 assert.equal(proposeChiaraFaroleraAction(c,situation({farolera:{...farolera,id:'not-f'}})).reason,
  'farolera-identity-mismatch');
 const plan=proposeChiaraFaroleraAction(c,situation());
 assert.equal(activateChiaraFaroleraCircle(c,plan,{farolera:{...farolera,id:'not-f'}}).ok,false);
});
test('phase 8: reissuing same Chiara command does not invalidate a plan',()=>{
 const c=setup();
 orderFaroleraMode(c,{issuerId:'chiara',mode:'offensive'});
 const plan=proposeChiaraFaroleraAction(c,situation());
 assert.equal(orderFaroleraMode(c,{issuerId:'chiara',mode:'offensive'}).changed,false);
 assert.equal(activateChiaraFaroleraCircle(c,plan,{farolera}).ok,true);
});
