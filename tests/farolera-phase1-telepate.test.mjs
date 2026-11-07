import test from 'node:test';
import assert from 'node:assert/strict';
import {
 stepTelepateProvocations,provocationSource,clearTelepateSource,
 TELEPATE_AURA_RADIUS,TELEPATE_AURA_INTERVAL,TELEPATE_PROVOKE_DURATION,
 TELEPATE_CONFUSE_CHANCE,TELEPATE_CONFUSE_DURATION
} from '../features/farolera/phase-1/telepate-provocation.js';

const unit=(id,side,x,z,cardId='kariona')=>({
 id,side,role:'summon',stage:'active',hp:3,cardId,
 outer:{position:{x,z}}
});

test('five-second provocation is guaranteed, not a control effect',()=>{
 assert.equal(TELEPATE_AURA_RADIUS,8);
 assert.equal(TELEPATE_AURA_INTERVAL,5);
 assert.equal(TELEPATE_PROVOKE_DURATION,6);
 assert.equal(TELEPATE_CONFUSE_CHANCE,.5);
 assert.equal(TELEPATE_CONFUSE_DURATION,1);
 const telepate=unit('t','enemy',0,0,'telepate');
 const a=unit('a','ally',2,0),b=unit('b','ally',8,0);
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
 const outside=unit('o','ally',8.01,0);
 const dead=unit('dead','ally',1,0);dead.stage='dead';dead.hp=0;
 stepTelepateProvocations([t,friendly,caster,outside,dead],5,{random:()=>0});
 for(const target of [friendly,caster,outside,dead])
  assert.equal(target.rokProvocation,undefined);
});

test('each affected enemy has an independent 50% confusion roll',()=>{
 const t=unit('t','enemy',0,0,'telepate');
 const a=unit('a','ally',2,0),b=unit('b','ally',4,0);
 let rolls=0,applied=0;
 stepTelepateProvocations([t,a,b],5,{
  random:()=>++rolls===1?.3:.8,
  onConfusion:()=>applied++
 });
 assert.equal(rolls,2);
 assert.equal(applied,1);
 assert.equal(a.rokConfusion.remaining,1);
 assert.equal(b.rokConfusion,undefined);
});

test('confusion resolves after one second with one of three equiprobable outcomes',()=>{
 const t=unit('t','enemy',0,0,'telepate'),e=unit('e','ally',1,0);
 const results=[];
 stepTelepateProvocations([t,e],5,{random:()=>0});
 stepTelepateProvocations([t,e],.99,{
  random:()=>.5,onResolveConfusion:(u,result)=>results.push(result)
 });
 assert.equal(results.length,0);
 stepTelepateProvocations([t,e],.01,{
  random:()=>.5,onResolveConfusion:(u,result)=>results.push(result)
 });
 assert.deepEqual(results,[1]);
 assert.equal(e.rokConfusion,null);
 assert.equal(provocationSource(e),t);
});

test('provocation refreshes, expires and clears when its source is lost',()=>{
 const t=unit('t','enemy',0,0,'telepate'),e=unit('e','ally',1,0);
 stepTelepateProvocations([t,e],5,{random:()=>.99});
 stepTelepateProvocations([t,e],5,{random:()=>.99});
 assert.equal(e.rokProvocation.remaining,6);
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
