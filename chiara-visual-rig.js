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
 function mount(c){
  // The previous idle and all mixer actions are discarded, not layered.
  c.mixer.stopAllAction();
  const state={clips:Object.create(null),action:null,kind:null,
   overlayKind:null,overlayUntil:0};
  states.set(c,state);
  return state;
 }
 function play(c,kind,source,{speed=1,startTime=0,once=false}={}){
  const st=findState(c);
  if(!st||!source?.tracks?.length)return false;
  const next=c.mixer.clipAction(source);
  if(st.action===next&&st.kind===kind&&!once&&next.isRunning())return true;
  // An explicit full-body pose replaces the previous pose. Never mix
  // torso tracks from an old Idle/attack with an unrelated new clip.
  if(st.action)st.action.stop();
  next.reset();
  next.enabled=true;
  next.setEffectiveWeight(1).setEffectiveTimeScale(speed);
  next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
  next.clampWhenFinished=once;
  next.time=Math.max(0,Math.min(Math.max(0,source.duration-.0001),startTime));
  next.play();
  st.action=next;st.kind=kind;
  c.mixer.update(0);
  return true;
 }
 function register(c,clips){
  const st=findState(c);if(!st)return;
  for(const [key,clip] of Object.entries(clips||{}))
   if(clip?.tracks?.length)st.clips[key]=clip;
  if(st.clips.idle){
   c.idleClip=st.clips.idle;
   c.model.userData.rokIdleAnimationId=35;
   if(!st.overlayKind)play(c,'idle',st.clips.idle);
  }
 }
 function reset(c){
  const st=findState(c);if(!st)return;
  c.mixer.stopAllAction();
  st.action=null;st.kind=null;st.overlayKind=null;st.overlayUntil=0;
  if(st.clips.idle)play(c,'idle',st.clips.idle);
 }
 function movement(c,kind='idle'){
  const st=findState(c);if(!st)return;
  if(st.overlayKind){
   if(performance.now()<st.overlayUntil)return;
   st.overlayKind=null;
  }
  const motion=st.clips[kind]||st.clips.idle;
  if(!motion)return;
  if(st.kind===kind&&st.action?.isRunning())return;
  play(c,kind,motion);
 }
 function upper(c,kind,source,speed=1,{startTime=0}={}){
  const st=findState(c);if(!st||!source?.tracks?.length)return false;
  if(!play(c,kind,source,{speed,startTime,once:true}))return false;
  st.overlayKind=kind;
  st.overlayUntil=performance.now()+
   Math.max(100,1000*Math.max(0,source.duration-startTime)/Math.max(.1,Math.abs(speed)));
  return true;
 }
 function endUpper(c,kind){
  const st=findState(c);
  if(!st||kind&&st.overlayKind!==kind)return;
  st.overlayKind=null;st.overlayUntil=0;
  play(c,'idle',st.clips.idle);
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
  shield,hit,cancelHit};
}
