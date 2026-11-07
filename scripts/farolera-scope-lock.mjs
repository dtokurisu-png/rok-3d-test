// R.O.K. 3D — Farolera phase-1 scope guard.
// BASELINE is the last approved fully working commit, before this lock.
// This CI guard blocks unintended changes by reporting them as failed checks.
// It is not an authentication system or a substitute for GitHub branch rules.
import {execFileSync} from 'node:child_process';

const BASELINE='dd215d6a0295bbe4033d60600f63cf6d27e6442b';
const allowedNew=[
 /^features\/farolera\/phase-1\/[a-zA-Z0-9_.\/-]+$/,
 /^tests\/farolera-phase1(?:-[a-zA-Z0-9_-]+)?\.test\.mjs$/,
 /^docs\/FAROLERA_PHASE1\.md$/,
 /^scripts\/farolera-scope-lock\.mjs$/,
 /^\.github\/workflows\/farolera-scope-lock\.yml$/,
 /^\.github\/workflows\/farolera-integration-tests\.yml$/
];
function git(...args){
 return execFileSync('git',args,{encoding:'utf8'}).trim();
}
try{
 git('cat-file','-e',BASELINE+'^{commit}');
 const diff=git('diff','--name-status',BASELINE,'HEAD','--');
 const violations=[];
 for(const entry of diff.split('\n').filter(Boolean)){
  const [status,...fields]=entry.split('\t');
  const path=fields.at(-1);
  // Never edit or remove a pre-existing file. The only permitted differences
  // from the protected baseline are phase-1 additions.
  // Owner-authorized gameplay integration: arena, resource HUD,
  // fountain timing and rival caster economic decisions. Other existing
  // files remain protected, and no authorization secrets belong in Git.
  const approvedArenaIntegration=status==='M'&&
   ['arena-25d.html','arena-combat-hud.js',
    'arena-element-orbs.js','caster-rival-ai.js'].includes(path);
  if(!approvedArenaIntegration&&(status!=='A'||!allowedNew.some(pattern=>pattern.test(path)))){
   violations.push(status+' '+fields.join(' -> '));
  }
 }
 if(violations.length){
  console.error('R.O.K. scope lock: protected modifications detected:');
  violations.forEach(v=>console.error('  '+v));
  console.error('The owner must explicitly approve an exception before modifying protected code.');
  process.exitCode=1;
 }else{
  console.log('R.O.K. scope lock: all pre-existing files remain unchanged.');
 }
}catch(error){
 console.error('R.O.K. scope lock could not verify baseline:',error.message);
 process.exitCode=1;
}
