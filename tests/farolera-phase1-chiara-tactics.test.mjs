import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');

test('Chiara reserves element for the first rearline Telépate and a five-cost Controladora',async()=>{
 const arena=await read('arena-25d.html');
 assert.match(arena,/if\(!t\)\{[\s\S]*?if\(amount>=3\)id='telepate'/);
 assert.match(arena,/boss<1&&amount>=5/);
 assert.match(arena,/controladora:\{cost:5,hp:5/);
 assert.match(arena,/name:'Controladora de Agua',element:'water',cost:5/);
 assert.match(arena,/getStagingPosition:\(c,card\)=>/);
 assert.match(arena,/z:-Math\.min\(MAX_Z-2,10\.5\)/);
});

test('Faroleras give combat priority to nearby provoked summons',async()=>{
 const arena=await read('arena-25d.html');
 assert.match(arena,/if\(c\.cardId==='farolera'\)\{\s*const exposed=combatants/);
 assert.match(arena,/provocationSource\(other\)\?\.side===c\.side/);
 assert.match(arena,/distanceTo\(other\)<=c\.range\+\.005/);
});

test('Chiara AI moves to a staging point before committing the card cost',async()=>{
 const ai=await read('caster-rival-ai.js');
 assert.match(ai,/getStagingPosition/);
 const stage=ai.indexOf("state.mode='stage-summon'");
 const cast=ai.indexOf("if(startCast(c,{x:pos.x,z:pos.z},atRisk,planned))return;");
 assert.ok(stage>=0&&cast>stage);
});

test('multiple Faroleras reserve rescue for the endangered Telépate rather than duplicating it',async()=>{
 const bridge=await read('features/farolera/phase-1/phase-8-arena-bridge.js');
 assert.match(bridge,/other\.rescueFor===unit&&/);
 assert.match(bridge,/rescueFor:mode==='defensive'\?rescue:null/);
 assert.match(bridge,/chosen=e\.rescueFor&&e\.rescueFor\.hp>0/);
});

test('pre-Telépate opening preserves original Farolera casting and resource policy',async()=>{
 const html=await read('arena-25d.html');
 const plan=html.slice(html.indexOf('function chiaraCastPlan('),html.indexOf('rivalAI=createRivalCasterAI('));
 assert.match(plan,/if\(!t\)\{/);
 assert.match(plan,/if\(amount>=3\)id='telepate'/);
 assert.match(plan,/else if\(amount>=1&&f<4&&live\.length<4\)id='farolera'/);
 assert.match(plan,/saveForThird/);
 assert.match(plan,/saveToRefillThree/);
 assert.match(html,/settings:\{idealPressureZ:-\.85/);
 assert.doesNotMatch(html,/card\?\.id==='telepate'\|\|card\?\.id==='farolera'\|\|/);
});
test('Semillera incompatible cast clips are not retargeted in every combat frame',async()=>{
 const html=await read('arena-25d.html');
 assert.match(html,/unit\.semilleraFailedSource22===clip22&&/);
 assert.match(html,/unit\.semilleraFailedSource21===clip21\)return null/);
 assert.match(html,/unit\.semilleraFailedSource22=clip22;/);
 assert.match(html,/slowCompleteFrames\?' · tirones:/);
});
