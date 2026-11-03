/* R.O.K. 3D Studio · tester visual scenario overlay (stage 5).
   Strictly decorative: never touches the arena's combatants, colliders or tiles. */
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export function createArenaSceneOverlay({THREE,root,renderStatus}){
 const catalog=new Map(), cache=new Map();
 const loader=new GLTFLoader();
 const scenery=new THREE.Group();scenery.name='ROK_scenery_visual_only';root.add(scenery);
 const effects=new Set(['glow','light','particles','fog','pulse']);
 const objects=[];
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
  if(data?.kind!=='rok3d.scene'||data.schemaVersion!==1||data.arena?.columns!==9||data.arena?.rows!==18||!Array.isArray(data.objects)||data.objects.length>250)throw Error('Escenario JSON incompatible');
  const ids=new Set();
  const entries=data.objects.map((raw,i)=>{
   if(!raw||typeof raw!=='object'||typeof raw.modelId!=='string')throw Error('Objeto inválido #'+(i+1));
   const m=catalog.get(raw.modelId);
   if(!m||m.enabledInSceneEditor!==true||m.category!=='prop')throw Error('Modelo no autorizado: '+raw.modelId);
   if(!Array.isArray(raw.effects)||raw.effects.length>40)throw Error('Efectos incorrectos en '+raw.modelId);
   if(raw.id&&ids.has(raw.id))throw Error('ID de objeto duplicado');
   ids.add(raw.id||'item-'+i);
   return {name:String(raw.name||m.name).slice(0,70),modelId:m.id,model:m,
    x:finite(raw.x,-4.5,4.5),y:finite(raw.y,-10,20),z:finite(raw.z,-9,9),
    rotation:finite(raw.rotation,-3600,3600),scale:finite(raw.scale,.05,5,1),
    effects:raw.effects.map(fxClean)};
  });
  return {name:String(data.name||'Escenario').slice(0,70),entries};
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
    group.position.set(-center.x,-bound.min.y,-center.z);
    return {group,dimension:Math.max(size.x,size.y,size.z,.4)};
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
  for(const obj of entries)for(const fx of obj.animated)disposeFx(fx);
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
    instance.position.set(item.x,item.y,item.z);
    instance.rotation.y=THREE.MathUtils.degToRad(item.rotation);
    instance.scale.setScalar(item.scale);
    instance.add(template.group.clone(true));
    const animated=[];
    for(const fx of item.effects)if(fx.enabled){
     const entry=buildFx(fx,template.dimension);
     instance.add(entry.group);animated.push(entry);
    }
    nextRoot.add(instance);nextObjects.push({animated});
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
   scenery.visible=visible;
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
  objects.length=0;sceneName='';say('Escenario original · sin decoraciones');
 }
 function show(value){visible=!!value;scenery.visible=visible;}
 function update(time){
  if(!scenery.visible)return;
  for(const obj of objects)for(const fx of obj.animated){
   if(fx.kind==='pulse'&&fx.animated)fx.animated.scale.setScalar(1+Math.sin(time*2.4)*.15);
   if(fx.kind==='particles'&&fx.animated)fx.animated.rotation.y=time*.12;
  }
 }
 return {init,loadScene,clear,show,update,get currentName(){return sceneName;},get count(){return objects.length;}};
}
