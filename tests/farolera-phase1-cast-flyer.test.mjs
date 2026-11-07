import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('phase 2 flyer remains a passive, separate visual component',async()=>{
 const js=await read('arena-cast-flyer.js');
 const css=await read('arena-cast-flyer.css');
 assert.match(js,/parent\.appendChild\(root\)/);
 assert.match(js,/\.rokHudPortrait img/);
 assert.match(js,/\.rokCastFlyerName/);
 assert.match(js,/function begin\(side,\{name='Casteo',element,duration\}/);
 assert.match(js,/function release\(side,token\)/);
 assert.match(js,/function cancel\(side,token\)/);
 assert.match(js,/function tick\(dt\)/);
 assert.match(css,/linear-gradient\(95deg,rgba\(0,0,0,\.95\)/);
 assert.match(css,/@keyframes rokCastDust/);
 assert.doesNotMatch(js,/\.spend\(|summonChiaraCard|startCardCast/);
});
test('flyer is wired to actual playable spell windows for both casters',async()=>{
 const html=await read('arena-25d.html');
 assert.match(html,/createArenaCastFlyer\(\)/);
 assert.match(html,/castFlyer\.tick\(dt\)/);
 assert.match(html,/castFlyer\.reset\(\)/);
 assert.match(html,/cardToken=castFlyer\.begin\(caster\.side,\{name:card\.name,element:card\.element/);
 assert.match(html,/castFlyer\.release\(caster\.side,cardToken\)/);
 assert.match(html,/onCancel:\(\)=>castFlyer\.cancel\(caster\.side,cardToken\)/);
 assert.match(html,/oakToken=castFlyer\.begin\('ally'/);
 assert.match(html,/rivalAction\.flyerToken=castFlyer\.begin\('enemy'/);
 assert.match(html,/castFlyer\.release\('enemy',rivalAction\.flyerToken\)/);
});
test('visual phase does not change existing 22→21 cast animation or damage',async()=>{
 const html=await read('arena-25d.html');
 assert.match(html,/subclip\(clip,'ROK_Rival_Cast22_0_48',0,48,30\)/);
 assert.match(html,/startTime:20\/30,transition:true/);
 assert.match(html,/const blocked=Math\.ceil\(Math\.max\(0,value\)\/2\)/);
});
