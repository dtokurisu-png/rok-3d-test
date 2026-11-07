import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const arena=new URL('../arena-25d.html',import.meta.url);

test('pulse resolves guaranteed confusion immediately, with no attraction callback',async()=>{
 const html=await readFile(arena,'utf8');
 assert.match(html,/onConfusion:\(source,target,outcome\)=>\s*resolveTelConfusedAttack\(target,source,outcome\)/);
 assert.doesNotMatch(html,/onSuccess:\(source,target\)=>/);
 assert.match(html,/function resolveTelConfusedAttack\(attacker,telepate,outcome\)/);
 assert.match(html,/if\(c\.stage!=='active'\|\|c\.rokConfusion\|\|/);
});

test('confused attackers hit self or in-range teammate once without changing teams',async()=>{
 const html=await readFile(arena,'utf8');
 const b=html.slice(html.indexOf('function resolveTelConfusedAttack('),
  html.indexOf('function updateDuel(',html.indexOf('function resolveTelConfusedAttack(')));
 assert.match(b,/confusion\.resolved=true/);
 assert.match(b,/else if\(outcome==='self'\)victim=attacker/);
 assert.match(b,/other\.side===attacker\.side&&canDamageTarget\(other\)/);
 assert.match(b,/<=attacker\.range\+\.005/);
 assert.match(b,/victim=allies\[0\]\|\|attacker/);
 assert.match(b,/if\(victim\)damage\(victim,amount,attacker,\{committed:true\}\)/);
 assert.match(b,/attacker\.cooldown=Math\.max\(/);
});

test('outgoing attacks are interrupted by a confusion pulse',async()=>{
 const html=await readFile(arena,'utf8');
 assert.match(html,/if\(attacker\.stage==='casting'&&!attacker\.castFired\)/);
 assert.match(html,/attacker\.stage='active';attacker\.castTarget=null;attacker\.castFired=true/);
});
