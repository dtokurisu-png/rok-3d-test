import test from 'node:test';
import assert from 'node:assert/strict';
import {createRivalCasterAI} from '../caster-rival-ai.js';

function setup({available=2,unlocked=3,orbs=[],plan=null}={}){
 const caster={side:'enemy',stage:'active',hp:8,moveSpeed:3.8,
  outer:{position:{x:0,z:-8}},hostileZoneSeconds:0};
 let casts=0;
 const ai=createRivalCasterAI({
  getCaster:()=>caster,getOrbs:()=>orbs,
  getEnemies:()=>[],getThreats:()=>[],
  getResourceState:()=>({available,unlocked,nextOrb:{halfElapsed:true}}),
  getCastPlan:()=>plan,
  canCast:()=>true,cast:()=>{casts++;return true},
  move:(c,x,z)=>{c.outer.position.x=x;c.outer.position.z=z},
  animate:()=>{},guard:()=>{},face:()=>{},
  bounds:{x:7,z:14.75}
 });
 return {ai,caster,get casts(){return casts}};
}
test('Chiara pursues a small neutral death fragment when saving for Telépate',()=>{
 const ctx=setup({orbs:[{id:'death-0',kind:'fragment',pickupRadius:1.05,
  position:{x:2,z:-8}}]});
 ctx.ai.step(.2);
 assert.equal(ctx.ai.status.mode,'collect');
 assert.ok(ctx.caster.outer.position.x>0);
});
test('Chiara does not waste time following a fragment with full reserve',()=>{
 const ctx=setup({available:3,unlocked:3,
  orbs:[{id:'death-0',kind:'fragment',pickupRadius:1.05,position:{x:2,z:-8}}]});
 ctx.ai.step(.2);
 assert.notEqual(ctx.ai.status.mode,'collect');
});
test('with under-three unlocked reservoirs, collecting large orb retains priority',()=>{
 const ctx=setup({available:2,unlocked:2,orbs:[
  {id:'death-0',kind:'fragment',pickupRadius:1.05,position:{x:1,z:-8}},
  {id:'large-0',position:{x:4,z:-8}}
 ]});
 ctx.ai.step(.2);
 assert.equal(ctx.ai.status.mode,'collect');
 assert.equal(ctx.ai.status.target,'large-0');
});
test('when Telépate is affordable, casting outranks pursuing nearby fragments',()=>{
 const ctx=setup({available:3,unlocked:3,
  plan:{id:'telepate',element:'water',cost:3},orbs:[
   {id:'death-0',kind:'fragment',pickupRadius:1.05,position:{x:1,z:-8}}
  ]});
 ctx.ai.step(.2);
 assert.equal(ctx.casts,1);
 assert.equal(ctx.ai.status.casting,true);
});
