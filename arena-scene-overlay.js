/* R.O.K. 3D Studio · tester visual scenario overlay (stage 5).
   Strictly decorative: never touches the arena's combatants, colliders or tiles. */
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createSceneBackground,normalizeSceneBackground} from './scene-background.js';
import {createSceneFloor,normalizeSceneFloor} from './scene-floor.js';
import {ARENA_COLUMNS,ARENA_ROWS,SCENERY_BOUNDS,assertPlacement} from './scene-placement-rules.js';

export function createArenaSceneOverlay({THREE,root,renderStatus,onArenaVisual}){
 const catalog=new Map(), cache=new Map();
 const loader=new GLTFLoader();
 const scenery=new THREE.Group();scenery.name='ROK_scenery_visual_only';root.add(scenery);
 const background=createSceneBackground(THREE,{onStatus:renderStatus});
 // Keep this independent of the prop swap: a failed scene must not replace it.
 root.add(background.group);background.show(false);
 const floor=createSceneFloor(THREE,{onStatus:renderStatus});root.add(floor.group);
 floor.setVisible(false);
 const effects=new Set(['glow','light','particles','fog','pulse']);
 const objects=[];
 // Occlusion affects decorative prop instances only; never the arena mesh,
 // characters, stage floor, background or collision/gameplay objects.
 // Sight cone: its axis connects camera to allied caster's upper body.
 // Wide at camera, tapered to the caster. No proximity spheres or radial fades.
 const sightRaycaster=new THREE.Raycaster();
 const sightDirection=new THREE.Vector3();
 const sightTarget=new THREE.Vector3();
 const sightOrigin=new THREE.Vector3();
 const sightSample=new THREE.Vector3();
 const sightNearest=new THREE.Vector3();
 const coneVector=new THREE.Vector3();
 let lastSightCheck=-Infinity,lastFadeTime=-Infinity;
 const SIGHT_CHECK_INTERVAL=.09;
 const CONE_CAMERA_RADIUS=1.35;
 const CONE_CASTER_RADIUS=.18;
 const CONE_FADE_RESPONSE=7.0;
 let generation=0,sceneName='',visible=true;
 const say=message=>{if(typeof renderStatus==='function')renderStatus(message);};
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const finite=(value,a,b,fallback=0)=>{
  if(value===null||value===undefined||value==='')return fallback;
  const n=Number(value);return Number.isFinite(n)?clamp(n,a,b):fallback;
 };
 const url=path=>'./'+path.split('/').map(encodeURIComponent).join('/');
 const fxClean=(fx)=>{
  if(!fx||!effects.has(fx.type))throw Error('Efecto desconocido');
  return {type:fx.type,color:/^#[\da-fA-F]{6}$/.test(fx.color)?fx.color:'#00ffe4',intensity:finite(fx.intensity,0,3,1),size:finite(fx.size,.1,6,1),height:finite(fx.height,-3,6,0),x:finite(fx.x,-20,20),z:finite(fx.z,-20,20),enabled:fx.enabled!==false};
 };
 const normalize=(data)=>{
  if(data?.kind!=='rok3d.scene'||data.schemaVersion!==1||data.arena?.columns!==ARENA_COLUMNS||data.arena?.rows!==ARENA_ROWS||!Array.isArray(data.objects)||data.objects.length>250)throw Error('Escenario JSON incompatible');
  const ids=new Set();
  const entries=data.objects.map((raw,i)=>{
   if(!raw||typeof raw!=='object'||typeof raw.modelId!=='string')throw Error('Objeto inválido #'+(i+1));
   const m=catalog.get(raw.modelId);
   if(!m||m.enabledInSceneEditor!==true||m.category!=='prop')throw Error('Modelo no autorizado: '+raw.modelId);
   if(!Array.isArray(raw.effects)||raw.effects.length>40)throw Error('Efectos incorrectos en '+raw.modelId);
   if(raw.id&&ids.has(raw.id))throw Error('ID de objeto duplicado');
   ids.add(raw.id||'item-'+i);
   return {name:String(raw.name||m.name).slice(0,70),modelId:m.id,model:m,
    x:finite(raw.x,-10000,10000),y:finite(raw.y,-100,100),z:finite(raw.z,-10000,10000),
    rotation:finite(raw.rotation,-3600,3600),scale:finite(raw.scale,.05,20,1),
    scaleX:finite(raw.scaleX,.05,20,finite(raw.scale,.05,20,1)),
    scaleY:finite(raw.scaleY,.05,20,finite(raw.scale,.05,20,1)),
    scaleZ:finite(raw.scaleZ,.05,20,finite(raw.scale,.05,20,1)),
    modelTexture:String(raw.modelTexture||''),
    effects:raw.effects.map(fxClean)};
  });
  return {name:String(data.name||'Escenario').slice(0,70),
   arenaArtOpacity:finite(data.arena.artOpacity,0,100,100),
   background:normalizeSceneBackground(data.background||{}),floor:normalizeSceneFloor(data.floor||{}),entries};
 };
 async function init(){
  const response=await fetch('./assets/manifests/model-library.json',{cache:'no-cache'});
  if(!response.ok)throw Error('No se pudo leer la biblioteca (HTTP '+response.status+')');
  const data=await response.json();
  if(!Array.isArray(data.models))throw Error('Biblioteca sin modelos');
  for(const model of data.models)if(model?.id&&model.path&&model.gitBlobSha)catalog.set(model.id,model);
 }
 function getTemplate(model){
  if(!cache.has(model.id)){
   const promise=loader.loadAsync(url(model.path)).then(gltf=>{
    const group=gltf.scene;
    const bound=new THREE.Box3().setFromObject(group);
    if(bound.isEmpty())throw Error('Modelo sin geometría: '+model.name);
    const size=bound.getSize(new THREE.Vector3());
    const center=bound.getCenter(new THREE.Vector3());
    group.position.set(-center.x,-center.y,-center.z);
    return {group,halfHeight:size.y/2,dimension:Math.max(size.x,size.y,size.z,.4)};
   }).catch(error=>{cache.delete(model.id);throw error;});
   cache.set(model.id,promise);
  }
  return cache.get(model.id);
 }
 const material=(fx,opacity)=>new THREE.MeshBasicMaterial({
  color:fx.color,transparent:true,opacity:clamp(opacity*fx.intensity,0,1),
  depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending
 });
 function buildFx(fx,dimension){
  const group=new THREE.Group();
  const radius=Math.max(.12,dimension*.52*fx.size);
  group.position.set(fx.x,fx.height+Math.max(dimension*.45,.3),fx.z);
  let animated=null;
  if(fx.type==='light'){
   group.add(new THREE.PointLight(fx.color,fx.intensity*14,radius*8,2));
   group.add(new THREE.Mesh(new THREE.SphereGeometry(radius*.08,12,8),material(fx,.8)));
  }else if(fx.type==='glow'||fx.type==='pulse'){
   animated=new THREE.Mesh(new THREE.SphereGeometry(radius,24,16),material(fx,fx.type==='pulse'?.32:.2));
   group.add(animated);
  }else if(fx.type==='fog'){
   const haze=new THREE.Mesh(new THREE.SphereGeometry(radius*1.5,20,12),
    new THREE.MeshBasicMaterial({color:fx.color,transparent:true,opacity:clamp(.07*fx.intensity,0,.3),depthWrite:false,side:THREE.DoubleSide}));
   haze.scale.y=.32;group.add(haze);
  }else if(fx.type==='particles'){
   const n=140,positions=new Float32Array(n*3);
   for(let i=0;i<n;i++){
    const angle=i*2.3999632,r=Math.sqrt((i+.5)/n)*radius;
    positions[i*3]=Math.cos(angle)*r;
    positions[i*3+1]=((i*37)%n)/n*radius*1.7-radius*.6;
    positions[i*3+2]=Math.sin(angle)*r;
   }
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
   animated=new THREE.Points(geometry,new THREE.PointsMaterial({
    color:fx.color,size:Math.max(.025,radius*.075),sizeAttenuation:true,
    transparent:true,opacity:clamp(fx.intensity*.65,0,1),depthWrite:false,
    blending:THREE.AdditiveBlending
   }));
   group.add(animated);
  }
  return {group,animated,kind:fx.type};
 }
 const disposeFx=entry=>entry.group.traverse(o=>{
  o.geometry?.dispose();
  if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}
 });
 function clearGroup(group,entries){
  for(const obj of entries){
   for(const mat of obj.fadingModelMaterials||[])mat.material.dispose();
   for(const fx of obj.animated)disposeFx(fx);
  }
  group.clear();
 }
 async function loadScene(data){
  const normalized=normalize(data);
  const token=++generation;
  // Build completely offscreen first. A bad GLB must not destroy the current scenery.
  const nextRoot=new THREE.Group(),nextObjects=[];
  say('Cargando '+normalized.entries.length+' objetos del escenario…');
  try{
   for(const item of normalized.entries){
    if(token!==generation){clearGroup(nextRoot,nextObjects);return false;}
    const template=await getTemplate(item.model);
    if(token!==generation){clearGroup(nextRoot,nextObjects);return false;}
    const instance=new THREE.Group();
    instance.name=item.name;
    instance.position.set(item.x,item.y+template.halfHeight*item.scaleY,item.z);
    instance.rotation.y=THREE.MathUtils.degToRad(item.rotation);
    instance.scale.set(item.scaleX,item.scaleY,item.scaleZ);
    const model=template.group.clone(true);
    instance.add(model);
    if(item.modelTexture){
     if(!/^assets\/texturas\/[\p{L}\p{N} ()._-]+\.(?:png|jpe?g|webp)$/iu.test(item.modelTexture)||
      item.modelTexture.includes('..'))throw Error('Textura del modelo no permitida');
     const texPath='./'+item.modelTexture.split('/').map(encodeURIComponent).join('/');
     const texture=await new THREE.TextureLoader().loadAsync(texPath);
     texture.colorSpace=THREE.SRGBColorSpace;
     model.traverse(node=>{
      if(!node.isMesh)return;
      const paint=material=>{
       const mat=material.clone();mat.map=texture;mat.color.set(0xffffff);mat.needsUpdate=true;
       return mat;
      };
      node.material=Array.isArray(node.material)?node.material.map(paint):paint(node.material);
     });
    }
    // GLB template clones share materials. Give each decorative instance
    // independent opacity so fading one prop never fades its siblings.
    const fadingModelMaterials=[];
    model.traverse(node=>{
     if(!node.isMesh||!node.material)return;
     const cloneForFade=mat=>{
      const individual=mat.clone();
      fadingModelMaterials.push({material:individual,
       opacity:individual.opacity,transparent:individual.transparent,
       depthWrite:individual.depthWrite});
      return individual;
     };
     node.material=Array.isArray(node.material)?
      node.material.map(cloneForFade):cloneForFade(node.material);
    });
    const animated=[];
    for(const fx of item.effects)if(fx.enabled){
     const entry=buildFx(fx,template.dimension);
     instance.add(entry.group);animated.push(entry);
    }
    // Reject untrusted JSON with scenery that intrudes into ANY playable
    // cell, considering the world-space footprint after rotation/scale/FX.
    instance.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);
    if(bounds.isEmpty())throw Error('Objeto de escenario sin geometría: '+item.name);
    const center=bounds.getCenter(new THREE.Vector3());
    const size=bounds.getSize(new THREE.Vector3());
    try{assertPlacement(center.x,center.z,size.x/2,size.z/2);}
    catch(error){throw Error('Escenario rechazado: '+item.name+
      ' invade la arena 15×30 o queda fuera del área exterior');}
    const effectMaterials=[],effectLights=[];
    for(const fx of animated)fx.group.traverse(node=>{
     if(node.isLight)effectLights.push({light:node,intensity:node.intensity});
     const mats=node.material?(Array.isArray(node.material)?node.material:[node.material]):[];
     for(const mat of mats)effectMaterials.push({material:mat,opacity:mat.opacity});
    });
    // Separate mesh bounds prevent oversized prop pivots or hollow models from
    // making nearby unrelated objects disappear.
    const meshBounds=[];
    model.traverse(node=>{
     if(node.isMesh&&node.geometry){
      const box=new THREE.Box3().setFromObject(node);
      if(!box.isEmpty())meshBounds.push(box);
     }
    });
    nextRoot.add(instance);
    nextObjects.push({animated,instance,bounds:bounds.clone(),meshBounds,
     opacity:1,targetOpacity:1,fadingModelMaterials,effectMaterials,effectLights});
   }
   if(token!==generation){clearGroup(nextRoot,nextObjects);return false;}
   const oldRoot=scenery.children[0];
   if(oldRoot){
    scenery.remove(oldRoot);
    clearGroup(oldRoot,objects);
   }
   scenery.add(nextRoot);
   objects.length=0;objects.push(...nextObjects);
   sceneName=normalized.name;
   background.build(normalized.background);
   floor.apply(normalized.floor);
   onArenaVisual?.(normalized.arenaArtOpacity);
   scenery.visible=visible;background.group.visible=visible&&normalized.background.enabled;
   floor.group.visible=visible&&normalized.floor.enabled;
   say('Escenario activo: '+sceneName+' · '+objects.length+' objetos');
   return true;
  }catch(error){
   clearGroup(nextRoot,nextObjects);
   if(token===generation)say('Error de carga: '+error.message);
   throw error;
  }
 }
 function clear(){
  ++generation;
  const current=scenery.children[0];
  if(current){scenery.remove(current);clearGroup(current,objects);}
  objects.length=0;sceneName='';background.show(false);floor.setVisible(false);onArenaVisual?.(100);say('Escenario original · sin decoraciones');
 }
 function show(value){visible=!!value;scenery.visible=visible;background.group.visible=visible&&background.config.enabled&&!!sceneName;floor.group.visible=visible&&floor.config.enabled&&!!sceneName;}
 // Distance between one real decoration mesh's world bounding box
 // and a sample of the finite camera-to-head segment. Ternary minimization
 // works for this convex distance function and avoids per-frame allocations.
 function nearestBoxToSight(box,origin,vector){
  let low=0,high=1;
  for(let k=0;k<11;k++){
   const left=low+(high-low)/3,right=high-(high-low)/3;
   sightSample.copy(origin).addScaledVector(vector,left);
   box.clampPoint(sightSample,sightNearest);
   const dl=sightNearest.distanceToSquared(sightSample);
   sightSample.copy(origin).addScaledVector(vector,right);
   box.clampPoint(sightSample,sightNearest);
   const dr=sightNearest.distanceToSquared(sightSample);
   if(dl<dr)high=right;else low=left;
  }
  const t=(low+high)*.5;
  sightSample.copy(origin).addScaledVector(vector,t);
  box.clampPoint(sightSample,sightNearest);
  return {t,distance:sightNearest.distanceTo(sightSample)};
 }
 function updateOcclusion(camera,allyPosition,time){
  if(!scenery.visible||!objects.length||!camera||!allyPosition)return;
  const dt=Number.isFinite(lastFadeTime)?clamp(time-lastFadeTime,0,.09):.016;
  lastFadeTime=time;
  const refresh=time-lastSightCheck>=SIGHT_CHECK_INTERVAL;
  if(refresh){
   lastSightCheck=time;
   sightOrigin.copy(camera.position);
   // Upper torso/head: the cone is a short, finite line, not a floor probe.
   sightTarget.set(allyPosition.x,allyPosition.y+1.7,allyPosition.z);
   sightDirection.subVectors(sightTarget,sightOrigin);
   const segmentLength=sightDirection.length();
   if(segmentLength>.1){
    sightRaycaster.set(sightOrigin,sightDirection.clone().normalize());
    sightRaycaster.near=0;
    sightRaycaster.far=segmentLength-.08;
   }
   for(const obj of objects){
    let alpha=1;
    if(segmentLength>.1){
     // Evaluate only actual meshes of this decoration and never neighboring
     // props, the ground, background or the caster.
     for(const box of obj.meshBounds||[]){
      const {t,distance}=nearestBoxToSight(box,sightOrigin,sightDirection);
      const coneRadius=THREE.MathUtils.lerp(CONE_CAMERA_RADIUS,CONE_CASTER_RADIUS,t);
      if(distance>=coneRadius)continue; // Outside sight cone: no fading.
      const p=clamp(distance/coneRadius,0,1);
      const candidate=p*p*(3-2*p);
      alpha=Math.min(alpha,candidate);
      if(alpha<.001)break;
     }
     // An actual hit with the central sight line is fully obstructive, even
     // if a large mesh's axis-aligned box is a coarse approximation.
     if(alpha<1&&obj.instance?.children[0]){
      const intersects=sightRaycaster.intersectObject(obj.instance.children[0],true);
      if(intersects.length)alpha=0;
     }
    }
    obj.targetOpacity=alpha;
   }
  }
  // Animate opacity every frame; recalculating geometry every 90 ms
  // avoids unnecessary raycasts while keeping the transition fluid.
  const blend=1-Math.exp(-CONE_FADE_RESPONSE*dt);
  for(const obj of objects){
   obj.opacity+=(obj.targetOpacity-obj.opacity)*blend;
   if(Math.abs(obj.opacity-obj.targetOpacity)<.002)obj.opacity=obj.targetOpacity;
   const alpha=clamp(obj.opacity,0,1);
   for(const entry of obj.fadingModelMaterials){
    const fading=alpha<.997;
    const mat=entry.material;
    // Preserve all original PBR maps, normal maps, roughness, metalness,
    // transmission and emissive settings. Restore render flags at full alpha.
    const transparent=entry.transparent||fading;
    const depthWrite=fading?false:entry.depthWrite;
    if(mat.transparent!==transparent||mat.depthWrite!==depthWrite){
     mat.transparent=transparent;mat.depthWrite=depthWrite;mat.needsUpdate=true;
    }
    mat.opacity=entry.opacity*alpha;
   }
   for(const entry of obj.effectMaterials)entry.material.opacity=entry.opacity*alpha;
   for(const entry of obj.effectLights)entry.light.intensity=entry.intensity*alpha;
  }
 }
 function update(time){
  if(!scenery.visible)return;
  for(const obj of objects)for(const fx of obj.animated){
   if(fx.kind==='pulse'&&fx.animated)fx.animated.scale.setScalar(1+Math.sin(time*2.4)*.15);
   if(fx.kind==='particles'&&fx.animated)fx.animated.rotation.y=time*.12;
  }
 }
 return {init,loadScene,clear,show,update,updateOcclusion,get currentName(){return sceneName;},get count(){return objects.length;}};
}

/* The controls use no credentials and never write to the repository. */
export function mountArenaSceneControls(overlay){
 const $=id=>document.getElementById(id);
 const importButton=$('testerSceneImport'),fileInput=$('testerSceneFile'),localButton=$('testerSceneLocal');
 const packageStorageKey='ROK_SCENE_PACKAGE_1_V1';
 const editorDraftKey='ROK_SCENE_EDITOR_DRAFT_V2';
 const published=$('testerScenePublished'),apply=$('testerSceneApply');
 const reset=$('testerSceneReset'),visibility=$('testerSceneVisible');
 const status=$('testerSceneStatus');
 const current=$('testerSceneCurrent');
 const banner=$('testerSceneBanner');
 const bannerText=$('testerSceneBannerText');
 const bannerLoad=$('testerSceneBannerLoad');
 const bannerReport=(message,loaded=false)=>{
  if(bannerText)bannerText.textContent=message;
  if(banner)banner.dataset.active=String(loaded);
 };
 let working=false;
 const report=message=>{status.textContent=message;};
 const busy=value=>{
  working=value;
  for(const node of [importButton,localButton,published,apply,reset,visibility])node.disabled=value;
 };
 const showCurrent=()=>{current.textContent=overlay.currentName||'Arena original';};
 const applyScene=async json=>{
  if(working)return;
  busy(true);report('Preparando decoraciones…');
  try{
   const loaded=await overlay.loadScene(json);
   if(!loaded)throw Error('La carga se interrumpió');
   visibility.checked=true;overlay.show(true);showCurrent();
   report('✓ '+overlay.currentName+' cargado: '+overlay.count+' objetos');
   bannerReport('✓ '+overlay.currentName+' · '+overlay.count+' objetos',true);
  }
  catch(error){const msg='No se aplicó: '+String(error.message||error);report(msg);bannerReport(msg,false);}
  finally{busy(false);}
 };
 const loadFromEditor=async()=>{
  try{
   const raw=localStorage.getItem(packageStorageKey)||localStorage.getItem(editorDraftKey);
   if(!raw)throw Error('No hay un escenario guardado en este navegador. Desde el creador pulsa Guardar progreso y Ver Escenario 1 en probador.');
   const data=JSON.parse(raw);
   if(!data.packageId){data.name='Escenario 1';data.packageId='escenario-1';}
   await applyScene(data);
  }catch(error){
   const msg='Escenario 1: '+error.message;
   report(msg);bannerReport(msg,false);
  }
 };
 bannerLoad?.addEventListener('click',()=>{if(!working)void loadFromEditor();});
 localButton.addEventListener('click',()=>{if(!working)void loadFromEditor();});
 importButton.addEventListener('click',()=>{if(!working)fileInput.click();});
 fileInput.addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  if(file.size>2500000){report('JSON demasiado grande (máximo 2.5 MB)');return;}
  try{await applyScene(JSON.parse(await file.text()));}
  catch(error){report('Archivo inválido: '+String(error.message||error));}
 });
 apply.addEventListener('click',async()=>{
  const relative=published.value;
  if(!relative)return;
  if(!/^assets\/scenes\/[a-zA-Z0-9_-]+\.json$/.test(relative)){report('Ruta publicada no autorizada');return;}
  busy(true);
  try{
   const response=await fetch('./'+relative,{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const json=await response.json();
   busy(false);await applyScene(json);
  }catch(error){report('No se pudo abrir el escenario publicado: '+error.message);}
  finally{busy(false);}
 });
 reset.addEventListener('click',()=>{if(working)return;overlay.clear();visibility.checked=true;overlay.show(true);showCurrent();report('Escenario original restaurado');bannerReport('Arena original · Escenario 1 disponible desde el editor',false);});
 visibility.addEventListener('change',()=>{overlay.show(visibility.checked);report(visibility.checked?'Decoraciones visibles':'Decoraciones ocultas');});
 const initialReady=overlay.init().then(async()=>{
  report('Biblioteca de modelos lista');
  // Load a saved composition even when the tester is opened directly.
  // Published catalog is independent; an empty catalog must not reset status.
  const hasLocal=!!(localStorage.getItem(packageStorageKey)||localStorage.getItem(editorDraftKey));
  const requested=new URLSearchParams(location.search).get('scene')==='escenario-1';
  if(hasLocal||requested)await loadFromEditor();
  else bannerReport('Arena original · aún no hay Escenario 1 guardado en este navegador',false);
  try{
   const response=await fetch('./assets/scenes/catalog.json',{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(!Array.isArray(data.scenes))throw Error('Índice de escenarios inválido');
   for(const entry of data.scenes){
    if(!entry||typeof entry.path!=='string'||!/^assets\/scenes\/[a-zA-Z0-9_-]+\.json$/.test(entry.path))continue;
    const option=document.createElement('option');option.value=entry.path;option.textContent=String(entry.name||entry.path).slice(0,80);published.append(option);
   }
   apply.disabled=published.options.length===1;
   if(!overlay.currentName)report(published.options.length>1?'Escenarios publicados disponibles':'Sin escenarios publicados; importa un JSON para probar');
  }catch(error){if(!overlay.currentName)report('Biblioteca lista; no se pudo cargar el índice de escenas');}
 }).catch(error=>{
  report('Error en biblioteca de modelos: '+error.message);
  importButton.disabled=true;apply.disabled=true;
  // The original arena can still be used without decorative scene assets.
  return {fallback:true,reason:String(error.message||error)};
 });
 published.addEventListener('change',()=>{apply.disabled=!published.value;});
 showCurrent();
 return {ready:initialReady};
}
