/**
 * Chiara's clean visual rig. No caster AI, resources, pathing or combat
 * decisions are defined here. One mixer, one pose owner, one stable Idle 35.
 * This replaces the legacy overlapping full-body / per-bone animation
 * actions for Chiara only. Lioren remains on the original layered system.
 */
export function createChiaraVisualRig({THREE,FBXLoader,adaptClip,shieldVisual}){
 const states=new WeakMap();
 const definitions={
  idle:{path:'Idle (1).fbx',id:35},
  left:{path:'assets/animations/casters/shared/Right Strafe.fbx',id:15},
  right:{path:'assets/animations/casters/shared/Right Strafe (1).fbx',id:16},
  castPrepare:{path:'assets/animations/casters/shared/Standing 2H Magic Area Attack 02 (1).fbx',id:22},
  castFinish:{path:'assets/animations/casters/shared/Standing 1H Cast Spell 01.fbx',id:21},
  defense:{path:'assets/animations/casters/shared/Sword And Shield Impact.fbx',id:23},
  attack:{zip:'Magic Heal.fbx',id:2},
  forward:{zip:'Running.fbx',id:7},
  backward:{zip:'Running Backward.fbx',id:6},
  hit:{zip:'Standing React Small From Headshot.fbx',id:9},
  death:{zip:'Sword And Shield Death.fbx',id:8}
 };
 let archivePromise=null;
 const findState=c=>states.get(c);
 async function archive(){
  if(archivePromise)return archivePromise;
  archivePromise=(async()=>{
   if(!window.JSZip){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
     script.onload=resolve;script.onerror=()=>reject(Error('JSZip unavailable'));
     document.head.append(script);
    });
   }
   const response=await fetch('./assets/animations/casters/farolera/ROK_PUBLICAR_ANIMACIONES.zip');
   if(!response.ok)throw Error('FBX archive HTTP '+response.status);
   const outer=await window.JSZip.loadAsync(await response.arrayBuffer());
   const nested=Object.values(outer.files).find(entry=>
    !entry.dir&&entry.name.split('/').pop()==='Farolera_Mixamo_14_animaciones.zip');
   return nested?window.JSZip.loadAsync(await nested.async('arraybuffer')):outer;
  })().catch(error=>{archivePromise=null;throw error;});
  return archivePromise;
 }
 async function source(spec){
  const loader=new FBXLoader();
  if(spec.path){
   const url='./'+spec.path.split('/').map(encodeURIComponent).join('/');
   return loader.loadAsync(url);
  }
  const zip=await archive();
  const file=Object.values(zip.files).find(entry=>!entry.dir&&
   entry.name.split('/').pop().toLowerCase()===spec.zip.toLowerCase());
  if(!file)throw Error('Missing FBX '+spec.id);
  return loader.parse(await file.async('arraybuffer'),'');
 }
 // A single Chiara-owned mixer, with independently masked lower/upper
 // actions. This is the approved composite casting behavior used by Lioren,
 // without restoring any competing legacy Chiara pose controller.
 const lowerBones=new Set(['hips','leftupleg','rightupleg','leftleg',
  'rightleg','leftfoot','rightfoot','lefttoebase','righttoebase',
  'lefttoe','righttoe','lefttoes','righttoes','leftfootend','rightfootend']);
 const boneKey=name=>String(name).replace(/^.*?mixamorig[:_]?/i,'')
  .replace(/[^a-z0-9]/gi,'').toLowerCase();
 function masked(st,clip,part){
  if(!clip?.tracks?.length)return null;
  let cached=st.cache.get(clip);
  if(!cached){cached={};st.cache.set(clip,cached);}
  if(cached[part])return cached[part];
  const tracks=clip.tracks.filter(track=>{
   const m=/^(.+)\.(quaternion|position|scale)$/.exec(track.name);
   if(!m)return false;
   const key=boneKey(m[1].replace(/^\.bones\[(.*)\]$/,'$1'));
   if(part==='lower')return lowerBones.has(key)&&
    !(key==='hips'&&m[2]==='position');
   return !lowerBones.has(key)&&m[2]==='quaternion';
  }).map(t=>t.clone());
  return cached[part]=tracks.length?
   new THREE.AnimationClip(clip.name+'_Chiara_'+part,clip.duration,tracks):null;
 }
 function mount(c){
  c.mixer.stopAllAction();
  const st={clips:Object.create(null),cache:new WeakMap(),movement:null,
   lowerAction:null,upperAction:null,overlay:null,overlayKind:null,
   overlayUntil:0,castLower:null,castLowerSpeed:1,castLowerProgress:0};
  states.set(c,st);return st;
 }
 function startAction(c,clip,{once=false,speed=1,startTime=0}={}){
  if(!clip)return null;
  const action=c.mixer.clipAction(clip).reset();
  action.enabled=true;action.setEffectiveWeight(1);
  action.setEffectiveTimeScale(speed);
  action.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
  action.clampWhenFinished=once;
  action.time=Math.max(0,Math.min(Math.max(0,clip.duration-.0001),startTime));
  action.play();return action;
 }
 function swapAction(c,old,clip,opts={}){
  if(!clip)return old;
  const existing=c.mixer.clipAction(clip);
  if(old===existing&&existing.isRunning())return old;
  if(old)old.stop();
  return startAction(c,clip,opts);
 }
 function register(c,clips){
  const st=findState(c);if(!st)return;
  for(const [key,clip] of Object.entries(clips||{}))
   if(clip?.tracks?.length)st.clips[key]=clip;
  // Installing optional clips never restarts or replaces Idle 35.
  if(clips?.idle?.tracks?.length){
   c.idleClip=st.clips.idle;
   c.model.userData.rokIdleAnimationId=35;
   if(!st.overlayKind)movement(c,'idle');
  }
 }
 function reset(c){
  const st=findState(c);if(!st)return;
  c.mixer.stopAllAction();
  st.movement=null;st.lowerAction=null;st.upperAction=null;
  st.overlay=null;st.overlayKind=null;st.overlayUntil=0;
  st.castLower=null;st.castLowerProgress=0;
  movement(c,'idle');
 }
 function movement(c,kind='idle'){
  const st=findState(c);if(!st)return;
  if(st.overlayKind&&performance.now()>=st.overlayUntil)
   endUpper(c,st.overlayKind);
  const normal=st.clips[kind]||st.clips.idle;
  const base=st.castLower&&kind==='idle'?st.castLower:normal;
  const lower=masked(st,base,'lower');
  const upper=masked(st,normal,'upper');
  const speed=st.castLower&&kind==='idle'?st.castLowerSpeed:1;
  if(lower&&(!st.lowerAction||st.lowerAction.getClip()!==lower||
    !st.lowerAction.isRunning())){
   st.lowerAction=swapAction(c,st.lowerAction,lower,{speed});
  }else if(st.lowerAction)st.lowerAction.setEffectiveTimeScale(speed);
  if(st.castLower&&kind==='idle'&&st.lowerAction)
   st.lowerAction.time=Math.min(Math.max(0,lower.duration-.00001),
    st.castLowerProgress*lower.duration);
  if(!st.overlayKind&&upper&&(!st.upperAction||
    st.upperAction.getClip()!==upper||!st.upperAction.isRunning()))
   st.upperAction=swapAction(c,st.upperAction,upper);
  st.movement=kind;
 }
 function upper(c,kind,source,speed=1,{startTime=0,transition=false}={}){
  const st=findState(c);if(!st)return false;
  const clip=masked(st,source,'upper');
  if(!clip)return false;
  const previous=st.overlay;
  // The composited upper cast uses the original 22->21 source and keeps
  // legs/hips independently animated. It does NOT play a full-body clip.
  if(previous&&previous!==c.mixer.clipAction(clip))previous.stop();
  if(st.upperAction){st.upperAction.stop();st.upperAction=null;}
  const action=startAction(c,clip,{once:true,speed,startTime});
  if(!action)return false;
  st.overlay=action;st.overlayKind=kind;
  st.overlayUntil=performance.now()+1000*
   Math.max(0,clip.duration-startTime)/Math.max(.1,Math.abs(speed));
  movement(c,st.movement||'idle');
  return true;
 }
 function endUpper(c,kind){
  const st=findState(c);if(!st||kind&&st.overlayKind!==kind)return;
  if(st.overlay)st.overlay.stop();
  st.overlay=null;st.overlayKind=null;st.overlayUntil=0;
  st.castLower=null;st.castLowerProgress=0;
  st.upperAction=null;
  movement(c,st.movement||'idle');
 }
 function setCastLower(c,clip,speed=1,progress=0){
  const st=findState(c);if(!st)return;
  st.castLower=clip;st.castLowerSpeed=speed;
  st.castLowerProgress=Math.max(0,Math.min(1,progress));
  movement(c,'idle');
 }
 function syncCastLower(c,progress){
  const st=findState(c);if(!st||!st.castLower)return;
  st.castLowerProgress=Math.max(0,Math.min(1,progress));
  if(st.movement==='idle')movement(c,'idle');
 }
 function clearCastLower(c){
  const st=findState(c);if(!st)return;
  st.castLower=null;st.castLowerProgress=0;
  movement(c,st.movement||'idle');
 }
 function shield(c,on){shieldVisual?.(c,on);}
 function cancelHit(){}
 function hit(c,clip){
  const st=findState(c);
  if(!clip?.tracks?.length||st?.overlayKind)return false;
  return upper(c,'hit',clip,1);
 }
 async function loadIdle(c){
  if(!findState(c))throw Error('Chiara visual rig not mounted');
  const fbx=await source(definitions.idle);
  if(!fbx.animations?.length)throw Error('Chiara Idle 35 missing animation');
  const clip=adaptClip(fbx,fbx.animations[0],c.model,'Chiara_Idle_35');
  if(!clip?.tracks?.length)throw Error('Chiara Idle 35 incompatible skeleton');
  register(c,{idle:clip});
  return clip;
 }
 async function loadExtras(c){
  for(const role of ['castPrepare','castFinish','attack','forward','backward',
    'left','right','defense','hit','death']){
   if(!findState(c))return;
   const spec=definitions[role];
   try{
    const fbx=await source(spec);
    if(!fbx.animations?.length)throw Error('Empty animation');
    const clip=adaptClip(fbx,fbx.animations[0],c.model,'Chiara_'+role+'_'+spec.id);
    if(!clip?.tracks?.length)throw Error('No compatible tracks');
    register(c,{[role]:clip});
    const field={castPrepare:'rokCast22Clip',castFinish:'rokCast21Clip',
     attack:'rokAttackClip',defense:'rokDefenseClip',hit:'rokHitClip',
     death:'rokDeathClip'}[role];
    if(field)c.model.userData[field]=clip;
   }catch(error){
    console.warn('[R.O.K.] Chiara pose '+role+' ('+spec.id+') unavailable:',error);
   }
   // No large FBX batch on the same frame.
   await new Promise(resolve=>setTimeout(resolve,120));
  }
 }
 return {mount,loadIdle,loadExtras,register,reset,movement,upper,endUpper,
  setCastLower,syncCastLower,clearCastLower,
  shield,hit,cancelHit,getClips:c=>({...findState(c)?.clips})};
}
