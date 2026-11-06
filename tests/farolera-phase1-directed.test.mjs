import test from 'node:test';
import assert from 'node:assert/strict';
import {
 directedLampPosition,directedTarget,canDirectedCast,
 DIRECTED_TELEPORT_COOLDOWN
} from '../features/farolera/phase-1/phase-9-directed-teleport.js';
import {distanceXZ} from '../features/farolera/phase-1/phase-3-lantern.js';
const farolera={id:'f',role:'summon',side:'enemy',stage:'active',hp:2,x:0,z:-11,range:3};
const ally=(id,z,hp=2)=>({id,role:'summon',side:'enemy',stage:'active',hp,x:0,z});
const enemy=(x,z,damage=3)=>({id:'e',role:'summon',side:'ally',stage:'active',
 hp:5,attackDamage:damage,range:1.5,x,z});
test('lamp always travels at most four cells from Farolera',()=>{
 for(const mode of ['offensive','defensive']){
  const lamp=directedLampPosition({farolera,mode});
  assert.ok(distanceXZ(lamp,farolera)<=4+1e-8);
  assert.ok(lamp.z<0);
 }
});
test('offensive launch faces enemy but stays on Chiara own half',()=>{
 const lamp=directedLampPosition({farolera,mode:'offensive'});
 assert.ok(lamp.z>farolera.z);assert.ok(lamp.z<=-.5);
});
test('defensive lamp is launched behind',()=>{
 const lamp=directedLampPosition({farolera:{...farolera,z:-8},mode:'defensive'});
 assert.ok(lamp.z< -8);
});
test('offense selects rearmost allied summon, not Farolera',()=>{
 const target=directedTarget({farolera,mode:'offensive',
  allies:[ally('forward',-4),ally('rear',-13)],enemies:[]});
 assert.equal(target.id,'rear');
});
test('offense teleports Farolera only when no other friendly summon exists',()=>{
 assert.equal(directedTarget({farolera,mode:'offensive',allies:[],enemies:[]}).id,'f');
});
test('defense prioritizes injured allies even while currently fighting',()=>{
 const a=ally('injured',-8,1);
 const t=directedTarget({farolera,mode:'defensive',allies:[a,ally('healthy',-13,6)],
  enemies:[enemy(0,-7.7)],inCombat:unit=>unit.id==='injured'});
 assert.equal(t.id,'injured');
});
test('defense does not waste the skill when nobody is in danger',()=>{
 assert.equal(directedTarget({farolera,mode:'defensive',
  allies:[ally('safe',-14)],enemies:[enemy(5,13)]}),null);
});
test('Farolera cannot cast while locked in combat nor interrupt her fight',()=>{
 const foe=enemy(0,-10);
 assert.equal(canDirectedCast(farolera,[foe],null),false);
 assert.equal(canDirectedCast(farolera,[],{id:'duel'}),false);
 assert.equal(canDirectedCast(farolera,[],null),true);
 assert.equal(DIRECTED_TELEPORT_COOLDOWN,10);
});
