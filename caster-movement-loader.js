/* R.O.K. caster animation assets: original numbered sources, no clip mutation.
 * Uses the arena's existing FBX retargeter, compiled separately for each GLB rig. */
export function createCasterMovementLoader({FBXLoader,adaptClip,getManualController}){
 const definitions={
  idle:{path:'assets/animations/casters/shared/Standing Idle.fbx',id:'standing-idle'},
  attack:{name:'Magic Heal.fbx',id:2},
  death:{name:'Sword And Shield Death.fbx',id:8},
  backward:{name:'Running Backward.fbx',id:6},
  forward:{name:'Running.fbx',id:7},
  left:{path:'assets/animations/casters/shared/Right Strafe.fbx',id:15},
  right:{path:'assets/animations/casters/shared/Right Strafe (1).fbx',id:16}
 };
 const cache=new WeakMap();
 let zipPromise=null;
 async function zip(){
  if(!zipPromise)zipPromise=(async()=>{
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
   for(const [role,def] of Object.entries(definitions)){
    try{
     const fbx=await source(def);
     result[role]=adaptClip(fbx,fbx.animations[0],model,'Caster_'+String(def.id));
    }catch(error){
     // A missing FBX must never prevent the user from moving the caster.
     // The model can still translate with Idle until a compatible clip is available.
     result._unavailable.push(String(def.id));
     if(role==='attack'||role==='death'){
      // Never replace a combat action with Idle and pretend the correct clip played.
      result[role]=null;
     }else{
      result[role]=result.idle||caster.idleClip;
      if(!result[role])throw Error('No se encontró un Idle de respaldo');
     }
    }
    if(caster.model!==model)throw Error('Se reemplazó el rig durante la carga');
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
