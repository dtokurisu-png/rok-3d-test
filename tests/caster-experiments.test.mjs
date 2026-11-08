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

test('test mode explores a new card role instead of repeating the same one',()=>{
 const learner=createCasterExperimentPlanner({id:'chiara-test-1',storage:storage()});
 const first=learner.select({context:ctx,cards:[cheap,expensive],available:1,threat:true});
 assert.equal(first.card.id,'farolera');
 learner.observe(ctx,first.card.id,first.role,3,1);
 const second=learner.select({context:ctx,cards:[cheap,expensive],available:1,threat:true});
 assert.notEqual(second.role,first.role);
 assert.equal(second.trials,0);
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

test('saving is a bounded experiment, interrupted by a threat',()=>{
 const learner=createCasterExperimentPlanner({id:'chiara-test-4',storage:storage()});
 learner.observe(ctx,'farolera','defense',1,1);
 assert.equal(learner.considerSaving({context:ctx,cards:[cheap,expensive],
  available:1,capacity:3,threat:false}),true);
 assert.equal(learner.stats().savingFor,'save-for-telepate');
 assert.equal(learner.considerSaving({context:ctx,cards:[cheap,expensive],
  available:1,capacity:3,threat:true}),false);
 assert.equal(learner.stats().savingFor,null);
 assert.ok(learner.stats().samples>=2);
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
