import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const arena=new URL('../arena-25d.html',import.meta.url);
test('combat consumes confusion at a ready attack rather than skipping confused units',async()=>{
 const html=await readFile(arena,'utf8');
 assert.doesNotMatch(html,/c\.stage!=='active'\|\|c\.rokConfusion\|\|/);
 assert.match(html,/function resolveTelConfusedAttack\(attacker\)/);
 assert.match(html,/if\(c\.rokConfusion&&resolveTelConfusedAttack\(c\)\)continue/);
 assert.match(html,/const result=rollTelepateConfusedAttack\(\)/);
});
test('confused self and ally damage consume one attack and obey reach and allegiance',async()=>{
 const html=await readFile(arena,'utf8');
 const b=html.slice(html.indexOf('function resolveTelConfusedAttack('),
  html.indexOf('function updateDuel(',html.indexOf('function resolveTelConfusedAttack(')));
 assert.match(b,/other\.side===attacker\.side&&canDamageTarget\(other\)/);
 assert.match(b,/<=attacker\.range\+\.005/);
 assert.match(b,/victim=allies\[0\]\|\|attacker/);
 assert.match(b,/damage\(victim,amount,attacker,\{committed:true\}\)/);
 assert.match(b,/attacker\.cooldown=Math\.max\(/);
 assert.match(b,/if\(result==='telepate'\)return false/);
});
