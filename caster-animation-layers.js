/* R.O.K. 3D — Per-bone caster animation layers.
 * Lower locomotion (hips and legs) never stops for upper-body combat actions.
 * Animation FBXs are filtered into new in-memory clips; original source clips
 * and Mixamo rigs are not modified.
 */
export function createCasterLayerSystem(THREE){
 const states=new WeakMap();
 const lower=new Set(['hips','leftupleg','rightupleg','leftleg','rightleg',
  'leftfoot','rightfoot','lefttoebase','righttoebase','lefttoe','righttoe',
  'lefttoes','righttoes','leftfootend','rightfootend']);
 const key=name=>String(name).replace(/^.*?mixamorig[:_]?/i,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
 function isLower(track){
  const match=/^(.*)\.(quaternion|position|scale)$/.exec(track.name);
  return match&&lower.has(key(match[1].replace(/^\.bones\[(.*)\]$/,'$1')));
 }
 function slice(clip,kind,tag){
  if(!clip)return null;
  const tracks=clip.tracks.filter(t=>kind==='lower'?isLower(t):!isLower(t)&&/\.quaternion$/.test(t.name))
   .map(t=>t.clone());
  return tracks.length?new THREE.AnimationClip(clip.name+'_'+tag,clip.duration,tracks):null;
 }
 function state(c){
  let st=states.get(c.model);
  if(st)return st;
  st={model:c.model,clips:{idle:c.idleClip},cache:new WeakMap(),movement:null,
   lowerAction:null,upperAction:null,overlay:null,overlayKind:null,refreshBase:false,
   overlayClip:null,shield:null,hitAction:null};
  states.set(c.model,st);return st;
 }
 function prepared(st,source,kind){
  if(!source)return null;
  let cached=st.cache.get(source);
  if(!cached){cached={};st.cache.set(source,cached);}
  if(!cached[kind])cached[kind]=slice(source,kind,kind);
  return cached[kind];
 }
 function start(c,clip,once=false,speed=1){
  if(!clip)return null;
  const action=c.mixer.clipAction(clip).reset();
  action.enabled=true;action.setEffectiveWeight(1);action.setEffectiveTimeScale(speed);
  action.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
  action.clampWhenFinished=once;
  action.play();
  return action;
 }
 function switchAction(c,old,clip,once=false,speed=1){
  if(!clip)return old;
  const next=c.mixer.clipAction(clip);
  if(next===old)return old;
  start(c,clip,once,speed);
  if(old){old.fadeOut(.12);next.fadeIn(.12);}
  return next;
 }
 function register(c,clips){
  const st=state(c);
  st.clips={...st.clips,...Object.fromEntries(Object.entries(clips||{}).filter(([k,v])=>k!=='_unavailable'&&v))};
  st.refreshBase=true;
  return st;
 }
 function movement(c,kind){
  const st=state(c);
  if(st.movement===kind&&!st.refreshBase)return;
  const source=st.clips[kind]||st.clips.idle||c.idleClip;
  if(!source)return;
  if(st.movement===null){
   c.mixer.stopAllAction();
  }
  const lowerClip=prepared(st,source,'lower');
  const upperClip=prepared(st,source,'upper');
  if(lowerClip)st.lowerAction=switchAction(c,st.lowerAction,lowerClip);
  if(!st.overlayKind&&upperClip)st.upperAction=switchAction(c,st.upperAction,upperClip);
  st.movement=kind;st.refreshBase=false;
 }
 function upper(c,kind,source,speed=1){
  const st=state(c);
  movement(c,st.movement||'idle');
  const clip=prepared(st,source, 'upper');
  if(!clip)return false;
  if(st.overlay){st.overlay.fadeOut(.09);st.overlay=null;}
  // Upper movement fades while upper attack/defense takes the same bones.
  if(st.upperAction)st.upperAction.fadeOut(.09);
  st.overlay=switchAction(c,null,clip,true,speed);
  st.overlayKind=kind;st.overlayClip=clip;
  return true;
 }
 function endUpper(c,kind){
  const st=state(c);
  if(kind&&st.overlayKind!==kind)return;
  if(st.overlay){st.overlay.fadeOut(.12);st.overlay=null;}
  st.overlayKind=null;st.overlayClip=null;
  const base=prepared(st,st.clips[st.movement]||st.clips.idle||c.idleClip,'upper');
  if(base){
   st.upperAction=null;
   st.upperAction=switchAction(c,null,base);
   st.upperAction.fadeIn(.12);
   if(st.lowerAction)st.upperAction.time=st.lowerAction.time%Math.max(base.duration,.001);
  }
 }
 function makeShield(c){
  const st=state(c);
  if(st.shield)return st.shield;
  const group=new THREE.Group();
  group.name='ROK_Caster_Front_Defense';
  const material=new THREE.MeshBasicMaterial({color:0x00ffe4,transparent:true,
   opacity:.67,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const rim=new THREE.Mesh(new THREE.RingGeometry(.49,.56,48),material);
  const disk=new THREE.Mesh(new THREE.CircleGeometry(.49,48),material.clone());
  disk.material.opacity=.15;disk.position.z=-.004;
  group.add(disk,rim);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.29,.305,48),material.clone());
  ring.material.opacity=.43;ring.position.z=.008;group.add(ring);
  const glow=new THREE.Mesh(new THREE.RingGeometry(.56,.61,48),material.clone());
  glow.material.opacity=.22;glow.position.z=-.006;group.add(glow);
  // The caster models are oriented toward +Z in local space; the outer
  // group's 180° ally rotation automatically makes the shield face the rival.
  group.position.set(0,1.12,.84);
  group.visible=false;c.outer.add(group);
  st.shield=group;return group;
 }
 function shield(c,visible){
  if(!c)return;
  const st=state(c);
  const group=visible?makeShield(c):st.shield;
  if(group)group.visible=!!visible;
 }
 function hit(c,source){
  if(!c?.mixer||!source||c.manualDefending)return false;
  const st=state(c);
  if(st.hitAction){st.hitAction.stop();st.hitAction=null;}
  let clip=st.hitCache;
  if(st.hitSource!==source){
   const tracks=source.tracks.filter(t=>{
    const match=/^(.+)\.quaternion$/.exec(t.name);
    return match&&new Set(['head','neck']).has(key(match[1]));
   }).map(t=>t.clone());
   clip=tracks.length?new THREE.AnimationClip('ROK_Caster_Hit09_Additive',source.duration,tracks):null;
   if(clip){
    THREE.AnimationUtils.makeClipAdditive(clip,0,clip,30);
    clip.blendMode=THREE.AdditiveAnimationBlendMode;
   }
   st.hitSource=source;st.hitCache=clip;
  }
  if(!clip)return false;
  const action=c.mixer.clipAction(clip,undefined,THREE.AdditiveAnimationBlendMode);
  action.reset().setEffectiveWeight(.85).setEffectiveTimeScale(1);
  action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=false;action.play();
  st.hitAction=action;
  return true;
 }
 function cancelHit(c){
  if(!c)return;
  const st=state(c);
  if(st.hitAction){st.hitAction.stop();st.hitAction=null;}
 }
 function reset(c){
  if(!c)return;
  const st=states.get(c.model);
  if(!st)return;
  shield(c,false);cancelHit(c);
  st.lowerAction=null;st.upperAction=null;st.overlay=null;st.overlayKind=null;
  st.movement=null;st.refreshBase=false;
 }
 return {register,movement,upper,endUpper,shield,hit,cancelHit,reset};
}
