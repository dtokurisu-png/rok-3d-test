/* R.O.K. caster animation assets: original numbered sources, no clip mutation.
 * Uses the arena's existing FBX retargeter, compiled separately for each GLB rig. */
export function createCasterMovementLoader({FBXLoader,adaptClip,getManualController,onClipReady}){
 const definitions={
  idle:{path:'assets/animations/casters/shared/Standing Idle.fbx',id:'standing-idle'},
  // Use directly published FBXs instead of requiring a 17 MB nested ZIP.
  // Provisional replacements for the original catalog IDs 2 and 7.
  attack:{path:'assets/animations/casters/shared/Standing 1H Cast Spell 01.fbx',id:2},
  death:{name:'Sword And Shield Death.fbx',id:8},
  defense:{path:'assets/animations/casters/shared/Sword And Shield Impact.fbx',id:23},
  hit:{name:'Standing React Small From Headshot.fbx',id:9},
  backward:{name:'Running Backward.fbx',id:6},
  forward:{path:'Catwalk Walk Forward HighKnees.fbx',id:7},
  left:{path:'assets/animations/casters/shared/Right Strafe.fbx',id:15},
  right:{path:'assets/animations/casters/shared/Right Strafe (1).fbx',id:16}
 };
 const cache=new WeakMap();
 let zipPromise=null;
 async function zip(){
  if(!zipPromise)zipPromise=(async()=>{
   // Load JSZip only when a legacy animation is specifically requested.
   if(!window.JSZip){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
     script.onload=resolve;script.onerror=()=>reject(Error('JSZip no disponible'));
     document.head.append(script);
    });
   }
   const response=await fetch('./assets/animations/casters/farolera/ROK_PUBLICAR_ANIMACIONES.zip',{cache:'force-cache'});
   if(!response.ok||!window.JSZip)throw Error('Paquete original no disponible');
   const archive=await window.JSZip.loadAsync(await response.arrayBuffer());
   const nested=Object.values(archive.files).find(item=>!item.dir&&item.name.split('/').pop()==='Farolera_Mixamo_14_animaciones.zip');
   return nested?window.JSZip.loadAsync(await nested.async('arraybuffer')):archive;
  })().catch(e=>{zipPromise=null;throw e;});
  return zipPromise;
 }
 async function source(spec){
  let buffer;
  if(spec.path){
   const url='./'+spec.path.split('/').map(encodeURIComponent).join('/');
   const res=await fetch(url,{cache:'force-cache'});
   if(!res.ok)throw Error('FBX '+spec.id+': HTTP '+res.status);
   buffer=await res.arrayBuffer();
  }else{
   const archive=await zip();
   const item=Object.values(archive.files).find(x=>!x.dir&&x.name.split('/').pop().toLowerCase()===spec.name.toLowerCase());
   if(!item)throw Error('Falta animación '+spec.id+' en el ZIP');
   buffer=await item.async('arraybuffer');
  }
  const fbx=new FBXLoader().parse(buffer,'');
  if(!fbx.animations?.length)throw Error('FBX '+spec.id+' sin clip');
  return fbx;
 }
 function load(caster){
  const model=caster.model;
  if(cache.has(model))return cache.get(model);
  const promise=(async()=>{
   const result={_unavailable:[]};
   // Download/action readiness prioritizes the gestures the user actually
  // needs; rare optional clips can remain absent without stalling the others.
  const order=['idle','forward','attack','left','right','defense','backward','hit','death'];
  for(const role of order){
    const def=definitions[role];
    try{
     const fbx=await source(def);
     result[role]=adaptClip(fbx,fbx.animations[0],model,'Caster_'+String(def.id));
    }catch(error){
     // A missing FBX must never prevent the user from moving the caster.
     // The model can still translate with Idle until a compatible clip is available.
     result._unavailable.push(String(def.id));
     if(role==='attack'||role==='death'||role==='defense'||role==='hit'){
      // Never replace a combat action with Idle and pretend the correct clip played.
      result[role]=null;
     }else{
      result[role]=result.idle||caster.idleClip;
      if(!result[role])throw Error('No se encontró un Idle de respaldo');
     }
    }
    if(caster.model!==model)throw Error('Se reemplazó el rig durante la carga');
    // Make the two combat actions available immediately; remaining locomotion
    // retarget tasks must not delay attack or death playback.
    if(role==='attack')model.userData.rokAttackClip=result.attack||null;
    if(role==='death')model.userData.rokDeathClip=result.death||null;
    if(role==='defense')model.userData.rokDefenseClip=result.defense||null;
    if(role==='hit')model.userData.rokHitClip=result.hit||null;
    if(result[role])onClipReady?.(caster,role,result[role]);
    if(role==='idle'){
     caster.idleClip=result.idle;
     const controller=getManualController();
     if(!controller?.enabled||controller.caster!==caster){
      caster.mixer.stopAllAction();
      caster.mixer.clipAction(caster.idleClip).reset().play();
     }
    }
   }
   // Keep the safely retargeted death clip available even when this caster is AI-controlled.
   if(caster.model===model)model.userData.rokDeathClip=result.death||null;
   return result;
  })().catch(e=>{cache.delete(model);throw e;});
  cache.set(model,promise);return promise;
 }
 return {load};
}
