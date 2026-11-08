import test from 'node:test';
import assert from 'node:assert/strict';
import {createCasterExperimentPlanner} from '../caster-experiment-planner.js';
import {createCasterNeuralEvaluator} from '../caster-neural-evaluator.js';

const storage=()=>{
 const values=new Map();
 return {getItem:key=>values.get(key)||null,
  setItem:(key,value)=>values.set(key,value)};
};
const ctx='enemy|healthy|near|kariona|fragile|none|one|high|unprotected|ready|unblocked';
const cheap={id:'farolera',cost:1,legal:true};
const expensive={id:'telepate',cost:3,legal:true};

test('training compares currently affordable cards without forced savings',()=>{
 const learner=createCasterExperimentPlanner({id:'chiara-test-1',storage:storage()});
 const pick=learner.select({context:ctx,cards:[cheap,expensive],available:1,threat:true});
 assert.equal(pick.card.id,'farolera');
 assert.equal(learner.considerSaving({context:ctx,cards:[cheap,expensive],
  available:1,capacity:1,threat:false}),false);
});
test('neural weights and direct trial evidence survive reload and normal mode',()=>{
 const memory=storage();
 const a=createCasterExperimentPlanner({id:'chiara-test-2',storage:memory});
 a.observe(ctx,'farolera','defense',4,1);
 a.observe(ctx,'farolera','offense',-4,1);
 a.setMode('normal');
 const b=createCasterExperimentPlanner({id:'chiara-test-2',storage:memory});
 assert.equal(b.mode(),'normal');
 assert.equal(b.stats().neuralExamples,2);
 assert.equal(b.stats().samples,2);
 const pick=b.select({context:ctx,cards:[cheap],available:1,threat:true});
 assert.equal(pick.role,'defense');
});

test('cannot invent a cast when no legal affordable card exists',()=>{
 const learner=createCasterExperimentPlanner({id:'chiara-test-3',storage:storage()});
 assert.equal(learner.select({context:ctx,cards:[expensive],available:1,threat:false}),null);
 assert.equal(learner.select({context:ctx,cards:[{...cheap,legal:false}],available:1}),null);
});

test('saving is short, requires unlocked capacity and a recently completed cast',()=>{
 const learner=createCasterExperimentPlanner({id:'chiara-test-4',storage:storage()});
 learner.begin({context:ctx,card:cheap,role:'offense',snapshot:{}});
 learner.begin({context:ctx,card:cheap,role:'defense',snapshot:{}});
 learner.begin({context:ctx,card:cheap,role:'offense',snapshot:{}});
 assert.equal(learner.considerSaving({context:ctx,cards:[cheap,expensive],
  available:1,capacity:1,threat:false}),false);
 // A 3-cost card is not 1 resource away from a caster with only 1.
 assert.equal(learner.considerSaving({context:ctx,cards:[cheap,expensive],
  available:1,capacity:5,threat:false}),false);
 assert.equal(learner.considerSaving({context:ctx,cards:[cheap,expensive],
  available:2,capacity:3,threat:false}),true);
 assert.equal(learner.stats().savingFor,'telepate');
 learner.evaluate(8.1,{});
 assert.equal(learner.considerSaving({context:ctx,cards:[cheap,expensive],
  available:2,capacity:3,threat:false}),false);
 assert.equal(learner.stats().savingFor,null);
 assert.ok(learner.stats().saveCooldown>0);
});
test('threat interrupts an affordable saving plan immediately',()=>{
 const learner=createCasterExperimentPlanner({id:'chiara-test-8',storage:storage()});
 for(let i=0;i<3;i++)learner.begin({context:ctx,card:cheap,role:'offense',snapshot:{}});
 assert.equal(learner.considerSaving({context:ctx,cards:[cheap,expensive],
  available:2,capacity:3,threat:false}),true);
 assert.equal(learner.considerSaving({context:ctx,cards:[cheap,expensive],
  available:2,capacity:3,threat:true}),false);
 assert.equal(learner.stats().savingFor,null);
});
test('training memory with hundreds of cost-one casts still chooses untried cost-three card',()=>{
 const learner=createCasterExperimentPlanner({id:'chiara-test-6',storage:storage()});
 const far=ctx.replace('|near|','|far|'),close=ctx.replace('|near|','|close|');
 for(let i=0;i<700;i++)learner.observe(i%2?far:close,'farolera','offense',1,1);
 const card=learner.select({context:ctx,cards:[cheap,expensive],
  available:3,threat:false});
 assert.equal(card.card.id,'telepate');
});
test('recorded save attempts are not incorrectly treated as completed card uses',()=>{
 const memory=storage();
 memory.setItem('rok.chiara-test-7.experiments.v1',JSON.stringify({
  schema:1,mode:'test',trials:{
   [ctx+'|farolera|offense']:{n:100,score:1,wins:80},
   [ctx+'|save-for-telepate|economy']:{n:80,score:-.8,wins:0}
  },matches:9}));
 const learner=createCasterExperimentPlanner({id:'chiara-test-7',storage:memory});
 assert.equal(learner.select({context:ctx,cards:[cheap,expensive],
  available:3,threat:false}).card.id,'telepate');
});
test('successful summons are evaluated only after the observation window',()=>{
 const learner=createCasterExperimentPlanner({id:'lioren-test-5',storage:storage()});
 learner.begin({context:ctx,card:{id:'kariona',cost:2},role:'defense',
  snapshot:{casterHp:12,enemyHp:9,allyCount:0,enemyCount:2}});
 learner.evaluate(4,{casterHp:12,enemyHp:6,allyCount:1,enemyCount:2});
 assert.equal(learner.stats().samples,0);
 learner.evaluate(1.1,{casterHp:12,enemyHp:6,allyCount:1,enemyCount:2});
 assert.equal(learner.stats().samples,1);
 assert.equal(learner.stats().pending,0);
});

test('with three affordable cards AI does not endlessly repeat cost three',()=>{
 const learner=createCasterExperimentPlanner({id:'lioren-test-diversity',storage:storage()});
 const options=[{id:'semillera',cost:1},{id:'kariona',cost:2},{id:'astarium',cost:3}];
 const played=[];
 for(let i=0;i<12;i++){
  const chosen=learner.select({context:ctx,cards:options,available:3,threat:false});
  played.push(chosen.card.id);
  learner.begin({context:ctx,card:chosen.card,role:chosen.role,snapshot:{}});
 }
 assert.equal(new Set(played).size,3);
 for(let i=2;i<played.length;i++)
  assert.ok(!(played[i]===played[i-1]&&played[i]===played[i-2]));
});
test('an acquired expensive-card goal expires when casting stays impossible',()=>{
 const learner=createCasterExperimentPlanner({id:'chiara-test-expiry',storage:storage()});
 const options=[cheap,expensive];
 for(let i=0;i<3;i++)learner.begin({context:ctx,card:cheap,role:'offense',snapshot:{}});
 assert.equal(learner.considerSaving({context:ctx,cards:options,
  available:2,capacity:3,threat:false}),true);
 assert.equal(learner.considerSaving({context:ctx,cards:options,
  available:3,capacity:3,threat:false}),false);
 assert.equal(learner.stats().savingFor,'telepate');
 learner.evaluate(6.2,{});
 assert.equal(learner.stats().savingFor,null);
});
test('small neural evaluator learns outcomes and validates snapshots',()=>{
 const net=createCasterNeuralEvaluator('lioren-test');
 const before=net.predict(ctx,cheap,'defense');
 for(let i=0;i<20;i++)net.train(ctx,cheap,'defense',5);
 const after=net.predict(ctx,cheap,'defense');
 assert.ok(after>before);
 const restored=createCasterNeuralEvaluator('lioren-test');
 assert.equal(restored.restore(net.snapshot()),true);
 assert.ok(Math.abs(restored.predict(ctx,cheap,'defense')-after)<1e-10);
});
