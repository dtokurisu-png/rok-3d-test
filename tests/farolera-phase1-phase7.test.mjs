import test from 'node:test';
import assert from 'node:assert/strict';
import {
 assessFaroleraThreat,chooseDefensiveCircle,chooseDefensiveLamp,planFaroleraDefense
} from '../features/farolera/phase-1/phase-7-defense.js';

const farolera={id:'farolera',side:'ally',role:'summon',stage:'active',
 hp:4,maxHp:4,x:0,z:0};
const ally=(id,hp,x,z,extra={})=>({
 id,side:'ally',role:'summon',stage:'active',hp,x,z,...extra
});
const enemy=(id,attackDamage,x,z,extra={})=>({
 id,side:'enemy',role:'summon',stage:'active',hp:5,
 attackDamage,range:1.5,x,z,...extra
});
const params=(overrides={})=>({
 farolera,allies:[],enemies:[],friendlyCaster:{x:0,z:5},
 mode:'defensive',abilityStatus:{canCast:true},...overrides
});

test('phase 7: lethal ally in danger is prioritized over safe ally',()=>{
 const threatened=ally('injured',1,2,0);
 const safe=ally('safe',10,-2,0);
 const plan=planFaroleraDefense(params({
  allies:[safe,threatened],enemies:[enemy('attacker',3,2,1)]
 }));
 assert.equal(plan.ok,true);assert.equal(plan.targetId,'injured');
 assert.equal(plan.lethalRisk,true);assert.equal(plan.selfRescue,false);
});
test('phase 7: Farolera may escape herself in defensive mode',()=>{
 const plan=planFaroleraDefense(params({
  farolera:{...farolera,hp:1},enemies:[enemy('danger',5,.7,.8)]
 }));
 assert.equal(plan.ok,true);
 assert.equal(plan.targetId,'farolera');assert.equal(plan.selfRescue,true);
});
test('phase 7: defensive lamp can be prepared before threats appear',()=>{
 const plan=planFaroleraDefense(params({allies:[ally('a',2,1,0)]}));
 assert.equal(plan.ok,true);
 assert.deepEqual(plan.actions,['throw-lantern','approach-ally','cast-circle']);
 assert.ok(Math.hypot(plan.lamp.x,plan.lamp.z)<=4+1e-8);
});
test('phase 7: mode is external and cannot override cooldown',()=>{
 const base={enemies:[enemy('danger',6,1,0)]};
 assert.equal(planFaroleraDefense(params({...base,mode:'offensive'})).reason,'not-defensive');
 assert.equal(planFaroleraDefense(params({...base,abilityStatus:{canCast:false}})).reason,'ability-unavailable');
});
test('phase 7: deceased or enemy-side targets are ignored',()=>{
 const plan=planFaroleraDefense(params({
  allies:[ally('dead',1,1,0,{stage:'dead'}),ally('enemy',1,2,0,{side:'enemy'})],
  enemies:[enemy('threat',6,2,0.5)]
 }));
 assert.equal(plan.ok,true);
 assert.equal(plan.targetId,'farolera');
});
test('phase 7: projected interception stays within four cells of Farolera',()=>{
 const plan=chooseDefensiveCircle({
  farolera,unit:ally('moving',3,3.5,0,{vx:2,vz:0})
 });
 assert.ok(plan);assert.ok(Math.hypot(plan.circle.x,plan.circle.z)<=4);
 const invalid=chooseDefensiveCircle({farolera,unit:ally('outside',3,6,0)});
 assert.equal(invalid,null);
});
test('phase 7: safe destination is legal, different from circle, avoids enemies',()=>{
 const circle={x:1,z:0};
 const lamp=chooseDefensiveLamp({
  farolera,circle,allies:[ally('a',1,1,0)],
  enemies:[enemy('threat',5,2,0)],friendlyCaster:{x:0,z:5}
 });
 assert.ok(lamp);assert.ok(lamp.range<=4);
 assert.ok(Math.hypot(lamp.lamp.x-circle.x,lamp.lamp.z-circle.z)>1.13);
 assert.ok(Math.hypot(lamp.lamp.x-2,lamp.lamp.z)>0.65);
});
test('phase 7: incoming damage increases danger score',()=>{
 const healthy=ally('unit',8,2,0);
 const fragile=ally('unit',2,2,0);
 const enemies=[enemy('raider',2,2,1)];
 assert.ok(assessFaroleraThreat(fragile,enemies).danger>assessFaroleraThreat(healthy,enemies).danger);
});
test('phase 7: negative-time or dead attacker does not create phantom danger',()=>{
 const endangered=ally('unit',2,1,0);
 const deadEnemy=enemy('dead',7,1,1,{stage:'dead'});
 assert.equal(assessFaroleraThreat(endangered,[deadEnemy]).danger,0);
});
test('phase 7: does not choose portal if Farolera herself is dead',()=>{
 const plan=planFaroleraDefense(params({
  farolera:{...farolera,hp:0,stage:'dead'},
  enemies:[enemy('e',5,1,0)]
 }));
 assert.equal(plan.reason,'farolera-unavailable');
});
