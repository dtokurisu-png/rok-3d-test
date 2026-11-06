import test from 'node:test';
import assert from 'node:assert/strict';
import {
 chooseOffensiveCircle,chooseOffensiveLamp,planFaroleraOffense
} from '../features/farolera/phase-1/phase-6-offense.js';

const farolera={id:'f',role:'summon',side:'ally',stage:'active',hp:3,x:0,z:0};
const enemyCaster={id:'enemy-caster',x:0,z:-11};
const ready={canCast:true};
const warrior=(id,attackDamage,x,z,vx=0,vz=0)=>({
 id,side:'ally',role:'summon',stage:'active',hp:3,
 attackDamage,x,z,vx,vz
});
const params=(allies,opts={})=>({
 farolera,enemyCaster,allies,abilityStatus:ready,mode:'offensive',...opts
});

test('phase 6: chooses highest-attack eligible allied summon',()=>{
 const result=planFaroleraOffense(params([
  warrior('weak',1,1,0),warrior('strong',8,2,0),warrior('medium',4,3,0)
 ]));
 assert.equal(result.ok,true);
 assert.equal(result.targetId,'strong');
 assert.deepEqual(result.actions,['cast-circle','throw-lantern']);
});
test('phase 6: prioritizes a feasible ally rather than an unreachable higher attack',()=>{
 const result=planFaroleraOffense(params([
  warrior('too-far',20,6,1),warrior('reachable',2,2,0)
 ]));
 assert.equal(result.targetId,'reachable');
});
test('phase 6: predicts incoming trajectory into spell-circle placement',()=>{
 const result=planFaroleraOffense(params([warrior('runner',5,3,2,-1,0)]));
 assert.equal(result.ok,true);
 assert.ok(result.circle.x<3);
 assert.ok(result.circle.x>1.8);
});
test('phase 6: lantern aims toward enemy caster and reaches four if safe',()=>{
 const result=planFaroleraOffense(params([warrior('target',5,2,0)]));
 assert.equal(result.ok,true);
 assert.ok(Math.abs(result.lamp.x)<1e-7);
 assert.ok(Math.abs(result.lamp.z+4)<1e-7);
 assert.equal(result.lampRange,4);
});
test('phase 6: no self-targeting or hostile summons or dead units',()=>{
 const allies=[
 warrior('f',99,1,0),
 {...warrior('hostile',98,1,0),side:'enemy'},
 {...warrior('dead',97,1,0),stage:'dead'},
 warrior('healthy',3,2,0)
 ];
 assert.equal(planFaroleraOffense(params(allies)).targetId,'healthy');
});
test('phase 6: no automatic mode assignment; unavailable ability cannot cast',()=>{
 assert.deepEqual(planFaroleraOffense(params([warrior('a',2,2,0)],{mode:'defensive'})),
  {ok:false,reason:'not-offensive'});
 assert.deepEqual(planFaroleraOffense(params([warrior('a',2,2,0)],{abilityStatus:{canCast:false}})),
  {ok:false,reason:'ability-unavailable'});
});
test('phase 6: no eligible ally means no portal, not a self-target',()=>{
 const result=planFaroleraOffense(params([]));
 assert.deepEqual(result,{ok:false,reason:'no-eligible-ally-in-reach'});
});
test('phase 6: lamp respects bounds and cannot overlap circle',()=>{
 const origin={x:6.5,z:0};
 const circle={x:5,z:0};
 const lamp=chooseOffensiveLamp({
  farolera:origin,enemyCaster:{x:12,z:0},circle
 });
 assert.ok(lamp);
 assert.ok(lamp.lamp.x<=7);
 assert.ok(lamp.range<=4);
});
test('phase 6: placement must be inside 4 cells and not on Farolera',()=>{
 const result=chooseOffensiveCircle({
  farolera,allies:[warrior('near-owner',6,0,0),warrior('legal',3,1,0)]
 });
 assert.equal(result.allyId,'legal');
});
test('phase 6: stationary Farolera is rejected if dead',()=>{
 assert.deepEqual(planFaroleraOffense(params([warrior('ally',2,1,0)],{
  farolera:{...farolera,stage:'dead',hp:0}
 })),{ok:false,reason:'farolera-unavailable'});
});
