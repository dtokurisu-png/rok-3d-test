import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const arena=()=>readFile(new URL('../arena-25d.html',import.meta.url),'utf8');

test('Cariona starts at original HP with one permanent physical armor and zero innate magic armor',async()=>{
 const source=await arena();
 const reset=source.slice(source.indexOf('function resetCombatant(c){'),source.indexOf('// Every card summon creates',source.indexOf('function resetCombatant(c){')));
 assert.match(reset,/c\.armorPhysical=c\.cardId==='kariona'\?1:0/);
 assert.match(reset,/c\.armorMagical=0/);
 assert.match(reset,/if\(c\.cardId==='kariona'\)c\.maxHp=2/);
 assert.match(reset,/c\.magicShieldMax=c\.cardId==='kariona'\?3:0/);
 assert.match(reset,/c\.magicShieldHits=c\.magicShieldMax/);
});

test('three-hit magic shield absorbs complete incoming attacks without becoming permanent armor',async()=>{
 const source=await arena();
 const damage=source.slice(source.indexOf('function damage('),source.indexOf('const squareTileGeometry',source.indexOf('function damage(')));
 assert.match(damage,/target\.cardId==='kariona'&&target\.magicShieldHits>0&&!environment&&value>0/);
 assert.match(damage,/target\.magicShieldHits--/);
 assert.match(damage,/makeFloatingWord\(target,'ESCUDO '/);
 assert.ok(damage.indexOf('target.magicShieldHits--')<damage.indexOf('const armor=environment'));
 assert.match(damage,/target\.hp=Math\.max\(0,target\.hp-\(effective-absorbed\)\)/);
});

test('shield replenishes on new incarnation but not restoration after winning',async()=>{
 const source=await arena();
 assert.match(source,/if\(!winner&&c\.cardId==='kariona'\)c\.magicShieldHits=c\.magicShieldMax/);
 assert.match(source,/c\.shield=c\.shieldMax;c\.shieldPulse=0/);
});

test('Cariona armor and consumable shield appear as two separate meters and icons',async()=>{
 const source=await arena();
 assert.match(source,/const armorArc=c\.cardId==='kariona'\?summonHudArc\(group,'left',1\.23,0xffffff/);
 assert.match(source,/c\.cardId==='kariona'\?0xffdf54:0xe0efff/);
 assert.match(source,/const armorSlot=new THREE\.Group\(\);secondaryIcons\.add\(armorSlot\)/);
 assert.match(source,/h\.armorSlot\.visible=hasArmor/);
 assert.match(source,/setSummonHudStat\(h\.armorArc,\[\],physicalArmor/);
 assert.match(source,/const shieldValue=hasArmor\?Math\.max\(0,c\.magicShieldHits\|\|0\):c\.shield/);
});

test('oak armor remains a separately equipped spell and reset never restores innate magical armor',async()=>{
 const source=await arena();
 assert.match(source,/function applyOakArmor\(c\)/);
 assert.match(source,/c\.armorPhysical=\(c\.armorPhysical\|\|0\)\+2/);
 assert.match(source,/oakArmor\.holder\.armorMagical=0/);
 assert.match(source,/function onOakArmorHolderDeath\(c\)/);
});
