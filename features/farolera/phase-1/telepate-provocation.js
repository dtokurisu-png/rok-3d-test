/**
 * R.O.K. 3D — Telépate de Agua: Aura de Provocación.
 * Every five seconds, the pulse taunts hostile summons within ten units.
 * Taunted summons remain enemies and chase/attack the Telépate for up to eight seconds.
 * It NEVER changes their allegiance, controls them, or limits them to two.
 * Every affected hostile receives one-second confusion on each pulse.
 * Next eligible attack: 20% Telépate, 40% self, 40% own team.
 */
export const TELEPATE_AURA_RADIUS=10;
export const TELEPATE_AURA_INTERVAL=5;
export const TELEPATE_PROVOKE_DURATION=8;
export const TELEPATE_EXIT_LINGER=3;
export const TELEPATE_CONFUSE_CHANCE=1;
export const TELEPATE_CONFUSION_TARGET_WEIGHTS=Object.freeze({telepate:.20,self:.40,ally:.40});
export function rollTelepateConfusedAttack(random=Math.random){
 const v=Math.max(0,Math.min(.999999999,Number(random())));
 return v<.20?'telepate':v<.60?'self':'ally';
}
export const TELEPATE_CONFUSE_DURATION=1;
const VALID_STAGE=u=>u&&Number(u.hp)>0&&
 !['dead','dying','vanishing','restoring'].includes(u.stage);
const dist=(a,b)=>Math.hypot(a.outer.position.x-b.outer.position.x,
 a.outer.position.z-b.outer.position.z);
export function provocationSource(target){
 const effect=target?.rokProvocation;
 const src=effect?.source;
 if(!effect||effect.remaining<=0||!VALID_STAGE(src)||!VALID_STAGE(target)||
    src.side===target.side)return null;
 return src;
}
export function clearTelepateSource(units,source){
 for(const target of units)
  if(target.rokProvocation?.source===source)target.rokProvocation=null;
}
export function stepTelepateProvocations(units,dt,{random=Math.random,onPulse=null,onSuccess=null,onConfusion=null,onResolveConfusion=null}={}){
 if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid dt');
 const present=new Set(units);
 for(const unit of units){
  const confusion=unit.rokConfusion;
  if(!confusion)continue;
  confusion.remaining-=dt;
  // Float-safe expiry: 0.99 + 0.01 must equal one full second.
  if(confusion.remaining<=1e-8){
   unit.rokConfusion=null;
   // Only a real attack may roll confusion: expiry itself deals no damage.
  }
 }
 // Migration safety: old capture versions changed the enemy's side.
 for(const unit of units){
  const fx=unit.rokProvocation;
  if(!fx)continue;
  if(fx.originalSide!==undefined)unit.side=fx.originalSide;
  // A rescued Telépate can temporarily leave its own aura. Existing
  // pursuers continue for precisely three seconds after crossing the edge.
  if(!fx.outside&&VALID_STAGE(fx.source)&&
     dist(unit,fx.source)>TELEPATE_AURA_RADIUS+1e-8){
   fx.outside=true;fx.remaining=TELEPATE_EXIT_LINGER;
  }
  fx.remaining=(Number.isFinite(fx.remaining)?fx.remaining:0)-dt;
  if(!present.has(fx.source)||!provocationSource(unit))unit.rokProvocation=null;
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
       !VALID_STAGE(enemy)||dist(source,enemy)>TELEPATE_AURA_RADIUS+1e-8)continue;
    // Guaranteed provocation: every eligible hostile switches target, not side.
    enemy.rokProvocation={source,remaining:TELEPATE_PROVOKE_DURATION,outside:false};
    onSuccess?.(source,enemy);
    enemy.rokConfusion={remaining:TELEPATE_CONFUSE_DURATION};
    onConfusion?.(source,enemy);
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
  group.name='ROK_Telepate_Provocation_Aura';
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
   const taunted=!!provocationSource(unit);
   const confused=!!unit.rokConfusion;
   if(!VALID_STAGE(unit)||(!taunted&&!confused)){
    removeHead(unit);continue;
   }
   const v=heads.get(unit)||makeHead(unit);
   v.group.position.set(unit.outer.position.x,1.5,unit.outer.position.z);
   v.bubble.visible=taunted;
   v.wire.visible=taunted;
   v.question.visible=confused;
   if(taunted){
    const t=(unit.rokProvocation?.remaining||0);
    v.bubble.material.opacity=.16+.06*Math.sin(t*8);
    v.wire.rotation.y+=dt*1.8;
   }
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
