import test from 'node:test';
import assert from 'node:assert/strict';
import {createFaroleraPortal,linkFaroleraLantern,stepFaroleraPortal} from '../features/farolera/phase-1/phase-4-portal.js';

function portal(mode='offensive'){
 const p=createFaroleraPortal({ownerId:'farolera',ownerSide:'ally',origin:{x:0,z:0},
   circle:{x:1,z:0},mode});
 return linkFaroleraLantern(p,{x:4,z:0});
}
test('phase 4: the magic circle must be created before the lantern is linked',()=>{
 const p=createFaroleraPortal({ownerId:'farolera',origin:{x:0,z:0},circle:{x:2,z:0}});
 assert.equal(p.phase,'circle');assert.equal(p.active,false);
 linkFaroleraLantern(p,{x:4,z:0});
 assert.equal(p.phase,'linked');assert.equal(p.active,true);
 assert.throws(()=>linkFaroleraLantern(p,{x:3,z:0}));
});
test('phase 4: validate reach, arena and non-overlapping ends',()=>{
 assert.throws(()=>createFaroleraPortal({ownerId:1,origin:{x:0,z:0},circle:{x:4.1,z:0}}),RangeError);
 const p=createFaroleraPortal({ownerId:1,origin:{x:0,z:0},circle:{x:1,z:0}});
 assert.throws(()=>linkFaroleraLantern(p,{x:4.1,z:0}),RangeError);
 assert.throws(()=>linkFaroleraLantern(p,{x:1.2,z:0}),RangeError);
});
test('phase 4: ally crossing circle teleports, does not teleport continuously',()=>{
 const p=portal();
 let unit={id:'warrior',side:'ally',role:'summon',stage:'active',x:0,z:0};
 assert.deepEqual(stepFaroleraPortal(p,[unit]),[]);
 unit={...unit,x:2,z:0};
 const transfers=stepFaroleraPortal(p,[unit]);
 assert.equal(transfers.length,1);assert.equal(transfers[0].id,'warrior');
 assert.deepEqual(transfers[0].to,{x:4,z:0});
 unit={...unit,x:4,z:0};
 assert.deepEqual(stepFaroleraPortal(p,[unit]),[]);
});
test('phase 4: hostile invocations and offensive owner are not teleported',()=>{
 const p=portal('offensive');
 const enemy={id:'enemy',side:'enemy',role:'summon',x:1,z:0};
 const owner={id:'farolera',side:'ally',role:'caster',x:1,z:0};
 assert.deepEqual(stepFaroleraPortal(p,[enemy,owner]),[]);
});
test('phase 4: defensive Farolera can teleport herself',()=>{
 const p=portal('defensive');
 const owner={id:'farolera',side:'ally',role:'caster',x:1,z:0};
 const moves=stepFaroleraPortal(p,[owner]);
 assert.equal(moves.length,1);assert.equal(moves[0].id,'farolera');
});
test('phase 4: no transfer if owner dead, but restoration of beneficiary does not cancel it',()=>{
 const p=portal();
 const ally={id:'ally',side:'ally',role:'summon',stage:'restoring',x:1,z:0};
 assert.deepEqual(stepFaroleraPortal(p,[ally],{ownerAlive:false}),[]);
 assert.equal(p.active,true);
 // Leaving and returning lets the still-active portal rescue a restoring ally.
 stepFaroleraPortal(p,[{...ally,x:0,z:0}],{ownerAlive:true});
 const transfers=stepFaroleraPortal(p,[ally],{ownerAlive:true});
 assert.equal(transfers.length,1);
});
test('phase 4: occupied destination picks another safe cell',()=>{
 const p=portal();
 const ally={id:'ally',side:'ally',role:'summon',x:1,z:0};
 const blocker={id:'blocker',side:'ally',role:'summon',x:4,z:0};
 const transfers=stepFaroleraPortal(p,[ally,blocker]);
 assert.equal(transfers.length,1);
 assert.notDeepEqual(transfers[0].to,{x:4,z:0});
});
test('phase 4: a fast unit crossing the circle is detected by segment intersection',()=>{
 const p=portal();
 const before={id:'runner',side:'ally',role:'summon',x:0,z:0};
 const after={...before,x:2,z:0};
 stepFaroleraPortal(p,[before]);
 const transfers=stepFaroleraPortal(p,[after]);
 assert.equal(transfers.length,1);
});
