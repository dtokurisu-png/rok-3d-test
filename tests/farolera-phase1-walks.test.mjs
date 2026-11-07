import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const arena=()=>readFile(new URL('arena-25d.html',root),'utf8');

test('approved FBX originals 38, 39, 40, 41 all exist without renumbering',async()=>{
 const names=['Catwalk Walk Forward HighKnees.fbx','Catwalk Walk.fbx',
  'Catwalk Walking.fbx','Walking.fbx'];
 for(const name of names){
  const file=new URL('animations/'+name,root);
  assert.ok((await stat(file)).size>0,name);
 }
 const html=await arena();
 assert.match(html,/kariona:38,semillera:40,telepate:41/);
 assert.match(html,/\{id:39,cardId:'semillera',path:'animations\/Catwalk Walk\.fbx'\}/);
});

test('Semillera walks toward home boundary and prepares arrival before crystals',async()=>{
 const html=await arena();
 assert.match(html,/if\(!c\.semilleraFacingBack\)\{startSemilleraTurnBack\(c\);continue;\}/);
 assert.match(html,/c\.outer\.rotation\.y=0;/);
 assert.match(html,/unit\.stage='semilleraTurningBack'/);
 assert.match(html,/unit\.stage='active';\s*setAnim\(unit,summonWalkId\(unit\)/);
 assert.match(html,/if\(!c\.semilleraArrived\)/);
 assert.match(html,/startSemilleraArrival\(c\)/);
 assert.match(html,/else startSemilleraCrystalCast\(c\)/);
 assert.match(html,/c\.semilleraArrivalWait<8/);
});

test('animation 39 is sampled in reverse from 181 to 130 exactly once',async()=>{
 const html=await arena();
 assert.match(html,/SEMILLERA_ARRIVAL_START=181\/30,SEMILLERA_ARRIVAL_END=130\/30/);
 assert.match(html,/const SEMILLERA_ARRIVAL_DURATION=\(181-130\)\/30/);
 assert.match(html,/unit\.semilleraArrived=true;unit\.stage='active'/);
 assert.match(html,/action\.play\(\);action\.paused=false;action\.setEffectiveTimeScale\(-1\)/);
 assert.match(html,/unit\.outer\.rotation\.y=THREE\.MathUtils\.lerp\(arrival\.fromYaw,Math\.PI,eased\)/);
 assert.match(html,/arrival\.action\.time=SEMILLERA_ARRIVAL_END/);
});

test('new FBX loading is deferred and cannot block main arena readiness',async()=>{
 const html=await arena();
 assert.match(html,/window\.ROKBoot\.ready\(\);[\s\S]*?setTimeout\(\(\)=>\{void preloadApprovedSummonWalks\(\);\},2500\)/);
 assert.match(html,/try\{[\s\S]*?await new FBXLoader\(\)\.loadAsync\(url\)/);
});
