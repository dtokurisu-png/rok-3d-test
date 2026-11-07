import test from 'node:test';
import assert from 'node:assert/strict';
import {
 stepTelepateProvocations,provocationSource,clearTelepateSource,
 TELEPATE_AURA_RADIUS,TELEPATE_AURA_INTERVAL,TELEPATE_PROVOKE_DURATION,
 TELEPATE_CONFUSE_CHANCE,TELEPATE_CONFUSE_DURATION,
 rollTelepateConfusedAttack,TELEPATE_CONFUSION_TARGET_WEIGHTS
} from '../features/farolera/phase-1/telepate-provocation.js';

const unit=(id,side,x,z,cardId='kariona')=>({
 id,side,role:'summon',stage:'active',hp:3,cardId,
 outer:{position:{x,z}}
});

test('five-second provocation is guaranteed, not a control effect',()=>{
 assert.equal(TELEPATE_AURA_RADIUS,10);
 assert.equal(TELEPATE_AURA_INTERVAL,5);
 assert.equal(TELEPATE_PROVOKE_DURATION,8);
 assert.equal(TELEPATE_CONFUSE_CHANCE,1);
 assert.equal(TELEPATE_CONFUSE_DURATION,1);
 const telepate=unit('t','enemy',0,0,'telepate');
 const a=unit('a','ally',2,0),b=unit('b','ally',10,0);
 let count=0;
 stepTelepateProvocations([telepate,a,b],4.99,{random:()=>.99});
 assert.equal(provocationSource(a),null);
 stepTelepateProvocations([telepate,a,b],.01,{
  random:()=>.99,onSuccess:()=>count++
 });
 assert.equal(count,2);
 assert.equal(provocationSource(a),telepate);
 assert.equal(provocationSource(b),telepate);
 assert.equal(a.side,'ally');
 assert.equal(b.side,'ally');
});

test('only hostile, living summons inside aura are provoked',()=>{
 const t=unit('t','enemy',0,0,'telepate');
 const friendly=unit('f','enemy',1,1);
 const caster={...unit('c','ally',1,0),role:'caster'};
 const outside=unit('o','ally',10.01,0);
 const dead=unit('dead','ally',1,0);dead.stage='dead';dead.hp=0;
 stepTelepateProvocations([t,friendly,caster,outside,dead],5,{random:()=>0});
 for(const target of [friendly,caster,outside,dead])
  assert.equal(target.rokProvocation,undefined);
});

test('every eligible enemy is confused for one second with no RNG activation roll',()=>{
 const t=unit('t','enemy',0,0,'telepate');
 const a=unit('a','ally',2,0),b=unit('b','ally',4,0);
 let applied=0,rolls=0;
 stepTelepateProvocations([t,a,b],5,{
  random:()=>{rolls++;return .99},onConfusion:()=>applied++
 });
 assert.equal(rolls,0);
 assert.equal(applied,2);
 assert.equal(a.rokConfusion.remaining,1);
 assert.equal(b.rokConfusion.remaining,1);
 stepTelepateProvocations([t,a,b],5,{random:()=>.99});
 assert.equal(a.rokConfusion.remaining,1);
});

test('confusion expires without fabricating an attack, preserving provocation',()=>{
 const t=unit('t','enemy',0,0,'telepate'),e=unit('e','ally',1,0);
 let phantom=0;
 stepTelepateProvocations([t,e],5);
 stepTelepateProvocations([t,e],.99,{onResolveConfusion:()=>phantom++});
 assert.equal(e.rokConfusion.remaining>0,true);
 stepTelepateProvocations([t,e],.01,{onResolveConfusion:()=>phantom++});
 assert.equal(phantom,0);
 assert.equal(e.rokConfusion,null);
 assert.equal(provocationSource(e),t);
});

test('20/40/40 uses exact cutoffs for the next eligible attack',()=>{
 assert.deepEqual(TELEPATE_CONFUSION_TARGET_WEIGHTS,
  {telepate:.20,self:.40,ally:.40});
 for(const [n,result] of [
  [0,'telepate'],[.199999,'telepate'],
  [.20,'self'],[.599999,'self'],[.60,'ally'],[.99999,'ally']
 ])assert.equal(rollTelepateConfusedAttack(()=>n),result);
});

test('provocation refreshes, expires and clears when its source is lost',()=>{
 const t=unit('t','enemy',0,0,'telepate'),e=unit('e','ally',1,0);
 stepTelepateProvocations([t,e],5,{random:()=>.99});
 stepTelepateProvocations([t,e],5,{random:()=>.99});
 assert.equal(e.rokProvocation.remaining,8);
 t.stage='restoring';
 stepTelepateProvocations([t,e],.01);
 assert.equal(provocationSource(e),null);
 t.stage='active';
 stepTelepateProvocations([t,e],5,{random:()=>.99});
 assert.equal(provocationSource(e),t);
 clearTelepateSource([t,e],t);
 assert.equal(provocationSource(e),null);
});

test('confused summons do not change allegiance, even after repeated pulses',()=>{
 const t=unit('t','enemy',0,0,'telepate'),e=unit('e','ally',1,0);
 stepTelepateProvocations([t,e],5,{random:()=>0});
 stepTelepateProvocations([t,e],5,{random:()=>0});
 assert.equal(e.side,'ally');
 assert.equal(provocationSource(e),t);
});

test('after teleport beyond radius, existing provocation persists three seconds',()=>{
 const t=unit('t','enemy',0,0,'telepate'),e=unit('e','ally',1,0);
 stepTelepateProvocations([t,e],5,{random:()=>.99});
 assert.equal(provocationSource(e),t);
 t.outer.position.x=-12;
 stepTelepateProvocations([t,e],.01);
 assert.equal(e.rokProvocation.outside,true);
 assert.ok(e.rokProvocation.remaining>2.98);
 stepTelepateProvocations([t,e],2.95);
 assert.equal(provocationSource(e),t);
 stepTelepateProvocations([t,e],.05);
 assert.equal(provocationSource(e),null);
});
