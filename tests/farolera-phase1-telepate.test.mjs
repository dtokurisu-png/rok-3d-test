import test from 'node:test';
import assert from 'node:assert/strict';
import {
 stepTelepateProvocations,provocationSource,clearTelepateSource,
 TELEPATE_AURA_RADIUS,TELEPATE_AURA_INTERVAL,TELEPATE_CONFUSE_CHANCE,
 TELEPATE_CONFUSE_DURATION,TELEPATE_PROVOKE_DURATION,
 rollTelepateConfusedAttack,TELEPATE_CONFUSION_TARGET_WEIGHTS
} from '../features/farolera/phase-1/telepate-provocation.js';

const unit=(id,side,x,z,cardId='kariona')=>({
 id,side,role:'summon',stage:'active',hp:3,cardId,
 outer:{position:{x,z}}
});

test('pulse is guaranteed confusion only, with no attraction or allegiance change',()=>{
 assert.equal(TELEPATE_AURA_RADIUS,10);
 assert.equal(TELEPATE_AURA_INTERVAL,5);
 assert.equal(TELEPATE_CONFUSE_CHANCE,1);
 assert.equal(TELEPATE_CONFUSE_DURATION,1);
 assert.equal(TELEPATE_PROVOKE_DURATION,0);
 const t=unit('t','enemy',0,0,'telepate');
 const a=unit('a','ally',2,0),b=unit('b','ally',10,0);
 const effects=[];
 stepTelepateProvocations([t,a,b],4.99,{onConfusion:(src,target,outcome)=>effects.push([target.id,outcome])});
 assert.equal(effects.length,0);
 stepTelepateProvocations([t,a,b],.01,{random:()=>.3,onConfusion:(src,target,outcome)=>effects.push([target.id,outcome])});
 assert.deepEqual(effects,[['a','self'],['b','self']]);
 for(const u of [a,b]){
  assert.equal(u.side,'ally');
  assert.equal(provocationSource(u),null);
  assert.equal(u.rokProvocation,null);
  assert.equal(u.rokConfusion.remaining,1);
 }
});

test('only living hostile summoned units inside radius receive confusion',()=>{
 const t=unit('t','enemy',0,0,'telepate');
 const friendly=unit('f','enemy',1,1);
 const caster={...unit('c','ally',1,0),role:'caster'};
 const outside=unit('o','ally',10.01,0);
 const dead=unit('dead','ally',1,0);dead.stage='dead';dead.hp=0;
 stepTelepateProvocations([t,friendly,caster,outside,dead],5);
 for(const target of [friendly,caster,outside,dead])
  assert.equal(target.rokConfusion,undefined);
});

test('confusion is applied every pulse and expires after one second',()=>{
 const t=unit('t','enemy',0,0,'telepate'),a=unit('a','ally',2,0);
 let count=0;
 stepTelepateProvocations([t,a],5,{random:()=>.9,onConfusion:()=>count++});
 assert.equal(count,1);
 stepTelepateProvocations([t,a],.99);
 assert.ok(a.rokConfusion.remaining>0);
 stepTelepateProvocations([t,a],.01);
 assert.equal(a.rokConfusion,null);
 stepTelepateProvocations([t,a],4);
 assert.equal(count,1);
 assert.equal(a.rokConfusion.remaining,1);
});

test('20/40/40 outcomes still have their exact probability boundaries',()=>{
 assert.deepEqual(TELEPATE_CONFUSION_TARGET_WEIGHTS,{telepate:.2,self:.4,ally:.4});
 for(const [value,expect] of [
  [0,'telepate'],[.199999,'telepate'],[.2,'self'],
  [.599999,'self'],[.6,'ally'],[.999999,'ally']
 ])assert.equal(rollTelepateConfusedAttack(()=>value),expect);
});

test('legacy attraction is removed even if a previous version left it active',()=>{
 const t=unit('t','enemy',0,0,'telepate'),a=unit('a','ally',2,0);
 a.rokProvocation={source:t,remaining:6};
 stepTelepateProvocations([t,a],.01);
 assert.equal(a.rokProvocation,null);
 assert.equal(provocationSource(a),null);
 clearTelepateSource([t,a],t);
 assert.equal(a.rokProvocation,null);
});
