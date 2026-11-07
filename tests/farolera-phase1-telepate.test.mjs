import test from 'node:test';
import assert from 'node:assert/strict';
import {stepTelepateProvocations,provocationSource,clearTelepateSource,
 TELEPATE_AURA_RADIUS,TELEPATE_AURA_INTERVAL,TELEPATE_PROVOKE_CHANCE,
 TELEPATE_PROVOKE_DURATION} from '../features/farolera/phase-1/telepate-provocation.js';
const unit=(id,side,x,z,cardId='kariona')=>({id,side,role:'summon',stage:'active',hp:3,
 cardId,outer:{position:{x,z}}});
test('R.O.K. Lite factor adapted to 8 radius, three seconds, 32 percent',()=>{
 assert.equal(TELEPATE_AURA_RADIUS,8);assert.equal(TELEPATE_AURA_INTERVAL,3);
 assert.equal(TELEPATE_PROVOKE_CHANCE,.32);
 assert.equal(TELEPATE_PROVOKE_DURATION,6);
});
test('pulse does not occur before third second',()=>{
 const t=unit('t','enemy',0,0,'telepate'),e=unit('e','ally',3,0);
 stepTelepateProvocations([t,e],2.99,{random:()=>0});
 assert.equal(provocationSource(e),null);
 stepTelepateProvocations([t,e],.01,{random:()=>0});
 assert.equal(provocationSource(e),t);
});
test('one roll per enemy in radius, not one global roll',()=>{
 const t=unit('t','enemy',0,0,'telepate');
 const a=unit('a','ally',2,0),b=unit('b','ally',0,8);
 let rolls=0;
 stepTelepateProvocations([t,a,b],3,{random:()=>{rolls++;return rolls===1?.20:.90}});
 assert.equal(rolls,2);assert.equal(provocationSource(a),t);
 assert.equal(provocationSource(b),null);
});
test('hostile caster, allied summon, and distant enemy not provoked',()=>{
 const t=unit('t','enemy',0,0,'telepate'),friend=unit('f','enemy',1,1);
 const caster={...unit('c','ally',1,0),role:'caster'};
 const far=unit('far','ally',8.01,0);
 stepTelepateProvocations([t,friend,caster,far],3,{random:()=>0});
 assert.equal(friend.rokProvocation,undefined);
 assert.equal(caster.rokProvocation,undefined);
 assert.equal(far.rokProvocation,undefined);
});
test('refreshes on next successful pulse and expires afterwards',()=>{
 const t=unit('t','enemy',0,0,'telepate'),e=unit('e','ally',1,0);
 stepTelepateProvocations([t,e],3,{random:()=>0});
 stepTelepateProvocations([t,e],3,{random:()=>0});
 assert.equal(e.rokProvocation.remaining,6);
 t.rokAuraClock=0;
 stepTelepateProvocations([e],6.01,{random:()=>0});
 assert.equal(provocationSource(e),null);
});
test('death or restoration of telepate cleans up all forced targeting',()=>{
 const t=unit('t','enemy',0,0,'telepate'),e=unit('e','ally',2,0);
 stepTelepateProvocations([t,e],3,{random:()=>0});
 t.stage='restoring';
 stepTelepateProvocations([t,e],.01);
 assert.equal(provocationSource(e),null);
 t.stage='active';stepTelepateProvocations([t,e],3,{random:()=>0});
 clearTelepateSource([t,e],t);
 assert.equal(provocationSource(e),null);
});

test('expanded eight-unit aura reaches ranged summons but not beyond its edge',()=>{
 const telepate=unit('t','enemy',0,0,'telepate');
 const inRange=unit('r','ally',7.99,0);
 const outside=unit('o','ally',8.01,0);
 stepTelepateProvocations([telepate,inRange,outside],3,{random:()=>0});
 assert.equal(provocationSource(inRange),telepate);
 assert.equal(provocationSource(outside),null);
});
