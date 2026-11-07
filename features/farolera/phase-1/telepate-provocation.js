/**
 * R.O.K. 3D — Telépate de Agua: pulse of confusion ONLY.
 * Every five seconds, ALL hostile summons within six units are confused
 * until the compulsory attack resolves. No taunt or allegiance change.
 * The pulse immediately resolves one 50/50 self-hit or friendly-fire outcome.
 */
export const TELEPATE_AURA_RADIUS=6;
export const TELEPATE_AURA_INTERVAL=5;
// Legacy exports kept for compatibility with older tests/consumers.
export const TELEPATE_PROVOKE_DURATION=0;
export const TELEPATE_EXIT_LINGER=0;
export const TELEPATE_CONFUSE_CHANCE=1;
export const TELEPATE_CONFUSION_TARGET_WEIGHTS=Object.freeze({self:.50,ally:.50});
export function rollTelepateConfusedAttack(random=Math.random){
 const v=Math.max(0,Math.min(.999999999,Number(random())));
 return v<.50?'self':'ally';
}
// Legacy exported duration; action-gated confusion has no timed expiry.
export const TELEPATE_CONFUSE_DURATION=0;
const VALID_STAGE=u=>u&&Number(u.hp)>0&&
 !['dead','dying','vanishing','restoring'].includes(u.stage);
const dist=(a,b)=>Math.hypot(a.outer.position.x-b.outer.position.x,
 a.outer.position.z-b.outer.position.z);
export function provocationSource(_target){
 // Retained compatibility API for the arena; the Telépate no longer taunts.
 return null;
}
export function clearTelepateSource(units,source){
 for(const target of units)
  if(target.rokProvocation?.source===source)target.rokProvocation=null;
}
export function stepTelepateProvocations(units,dt,{random=Math.random,onPulse=null,
 onConfusion=null,canAffect=()=>true,managedConfusion=false,
 applyConfusion=null}={}){
 if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid dt');
 for(const unit of units){
  const confusion=unit.rokConfusion;
  if(!confusion||confusion.actionGated||
   (managedConfusion&&!confusion.legacyFallback))continue;
  confusion.remaining-=dt;
  // Float-safe expiry: 0.99 + 0.01 must equal one full second.
  if(confusion.remaining<=1e-8){
   unit.rokConfusion=null;
   // Only a real attack may roll confusion: expiry itself deals no damage.
  }
 }
 // Remove legacy taunts immediately, including those made by older builds.
 for(const unit of units){
  const previous=unit.rokProvocation;
  if(previous?.originalSide!==undefined)unit.side=previous.originalSide;
  unit.rokProvocation=null;
 }
 for(const source of units){
  if(source.cardId!=='telepate')continue;
  if(!VALID_STAGE(source)){source.rokAuraClock=0;continue;}
  source.rokAuraClock=(source.rokAuraClock||0)+dt;
  while(source.rokAuraClock>=TELEPATE_AURA_INTERVAL){
   source.rokAuraClock-=TELEPATE_AURA_INTERVAL;
   onPulse?.(source);
   for(const enemy of units){
    if(enemy===source||enemy.role!=='summon'||enemy.side===source.side||
       !VALID_STAGE(enemy)||enemy.rokConfusion||
       dist(source,enemy)>TELEPATE_AURA_RADIUS+1e-8||
       !canAffect(enemy,{category:'psiquico',negative:true,factor:'confusion',
        sourceId:'telepate'}))continue;
    // The pulse ALWAYS confuses. Resolve one attack immediately, rather
    // than waiting for an attack cooldown that might exceed one second.
    const outcome=rollTelepateConfusedAttack(random);
    const sharedApplied=managedConfusion&&applyConfusion?.(enemy,source,outcome);
    if(!sharedApplied)
     enemy.rokConfusion={category:'psiquico',negative:true,
      factor:'confusion',remaining:null,source,
      outcome,resolved:false,legacyFallback:true,actionGated:true};
    onConfusion?.(source,enemy,outcome);
   }
  }
 }
}

/** Three.js-only visual layer; does not modify aura range or combat targets. */
export function createTelepateAuraVisuals({THREE,root}){
 const live=new Map(),heads=new Map();
 const bubbleGeometry=new THREE.SphereGeometry(.37,16,12);
 const qCanvas=document.createElement('canvas');
 qCanvas.width=128;qCanvas.height=128;
 const qctx=qCanvas.getContext('2d');
 qctx.clearRect(0,0,128,128);
 qctx.font='bold 110px Arial';qctx.textAlign='center';
 qctx.textBaseline='middle';qctx.lineWidth=8;
 qctx.strokeStyle='#21335a';qctx.strokeText('?',64,65);
 qctx.fillStyle='#ffffff';qctx.fillText('?',64,65);
 const qTexture=new THREE.CanvasTexture(qCanvas);
 function makeHead(unit){
  const group=new THREE.Group();
  group.name='ROK_Telepate_Mental_Status';
  const bubble=new THREE.Mesh(bubbleGeometry,new THREE.MeshBasicMaterial({
   color:0x35d9ff,transparent:true,opacity:.21,depthWrite:false,
   blending:THREE.AdditiveBlending
  }));
  const wire=new THREE.Mesh(bubbleGeometry,new THREE.MeshBasicMaterial({
   color:0x9c76f4,transparent:true,opacity:.14,wireframe:true,
   depthWrite:false
  }));
  const question=new THREE.Sprite(new THREE.SpriteMaterial({
   map:qTexture,transparent:true,depthTest:false,depthWrite:false
  }));
  question.scale.set(.55,.55,1);question.position.y=.68;
  group.add(bubble,wire,question);
  root.add(group);
  const visual={group,bubble,wire,question};
  heads.set(unit,visual);return visual;
 }
 function removeHead(unit){
  const visual=heads.get(unit);if(!visual)return;
  root.remove(visual.group);
  visual.bubble.material.dispose();visual.wire.material.dispose();
  visual.question.material.dispose();
  heads.delete(unit);
 }
 const make=source=>{
  const group=new THREE.Group();
  group.name='ROK_Telepate_Confusion_Aura';
  const material=new THREE.MeshBasicMaterial({color:0x21c5ff,
   transparent:true,opacity:.25,depthWrite:false,
   side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const persistent=new THREE.Mesh(new THREE.RingGeometry(TELEPATE_AURA_RADIUS-.07,TELEPATE_AURA_RADIUS+.02,96),material);
  persistent.rotation.x=-Math.PI/2;group.add(persistent);
  const pulseMat=material.clone();pulseMat.opacity=0;
  const pulse=new THREE.Mesh(new THREE.RingGeometry(.95,1.03,96),pulseMat);
  pulse.rotation.x=-Math.PI/2;group.add(pulse);
  group.position.set(source.outer.position.x,.083,source.outer.position.z);
  root.add(group);
  const v={group,persistent,pulse,age:1,source};
  live.set(source,v);
  return v;
 };
 function remove(source){
  const v=live.get(source);if(!v)return;
  root.remove(v.group);
  v.persistent.geometry.dispose();v.persistent.material.dispose();
  v.pulse.geometry.dispose();v.pulse.material.dispose();
  live.delete(source);
 }
 function update(units,dt){
  const present=new Set(units);
  for(const source of units){
   if(source.cardId!=='telepate'||!VALID_STAGE(source))continue;
   let v=live.get(source);
   if(!v)v=make(source);
   v.group.position.set(source.outer.position.x,.083,source.outer.position.z);
   v.persistent.material.opacity=.16+.08*Math.sin((source.rokAuraClock||0)*2);
   v.age+=dt;
   const progress=Math.min(1,v.age/.65);
   v.pulse.scale.setScalar(TELEPATE_AURA_RADIUS*progress);
   v.pulse.material.opacity=v.age<.65?.57*(1-progress):0;
  }
  for(const source of [...live.keys()])
   if(!present.has(source)||!VALID_STAGE(source))remove(source);
  for(const unit of units){
   const confused=!!unit.rokConfusion;
   if(!VALID_STAGE(unit)||!confused){
    removeHead(unit);continue;
   }
   const v=heads.get(unit)||makeHead(unit);
   v.group.position.set(unit.outer.position.x,1.5,unit.outer.position.z);
   v.bubble.visible=confused;
   v.wire.visible=confused;
   v.question.visible=confused;
   v.bubble.material.opacity=.16+.06*Math.sin(unit.rokConfusion.remaining*8);
   v.wire.rotation.y+=dt*1.8;
  }
  for(const unit of [...heads.keys()])
   if(!present.has(unit))removeHead(unit);

 }
 function pulse(source){
  const v=live.get(source)|| (VALID_STAGE(source)?make(source):null);
  if(v)v.age=0;
 }
 function clear(){for(const source of [...live.keys()])remove(source);
  for(const unit of [...heads.keys()])removeHead(unit);}
 return {update,pulse,remove(source){remove(source);removeHead(source)},clear};
}
