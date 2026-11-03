import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/* R.O.K. 3D Studio: asset composer. Source GLBs are never modified. */
const $=id=>document.getElementById(id);
const status=$('assetStatus');
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const safeNumber=(v,lo,hi,def)=>Number.isFinite(Number(v))?clamp(Number(v),lo,hi):def;
const kinds={glow:'Resplandor',light:'Luz puntual',particles:'Partículas',fog:'Niebla local',pulse:'Pulso de energía'};
const fields={name:$('fxName'),color:$('fxColor'),intensity:$('fxIntensity'),size:$('fxSize'),height:$('fxHeight'),x:$('fxX'),z:$('fxZ')};
const scene=new THREE.Scene();
scene.background=new THREE.Color('#081521');
const camera=new THREE.PerspectiveCamera(45,1,.05,1000);
camera.position.set(5,3.5,6);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
$('assetCanvas').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.07;
controls.maxPolarAngle=Math.PI*.92;
scene.add(new THREE.HemisphereLight(0xc4ebff,0x283744,2.1));
const key=new THREE.DirectionalLight(0xffffff,2.3);key.position.set(5,9,6);scene.add(key);
const rim=new THREE.DirectionalLight(0x00ffe4,.55);rim.position.set(-6,4,-5);scene.add(rim);
const grid=new THREE.GridHelper(18,18,0x26777c,0x19444a);grid.position.y=-.012;scene.add(grid);
const modelRoot=new THREE.Group();scene.add(modelRoot);
const fxRoot=new THREE.Group();scene.add(fxRoot);
const loader=new GLTFLoader();
const library=[];
let model=null,modelId=null,modelSize=2,selectedFx=null,layers=[],loadSerial=0,loadUrl=null;
function setStatus(message){status.textContent=message;}
function modelUrl(item){return './'+item.path.split('/').map(encodeURIComponent).join('/');}
function resetView(){
 const size=Math.max(modelSize,1);
 camera.position.set(size*1.75,size*1.22,size*2.15);
 controls.target.set(0,size*.45,0);
 controls.minDistance=Math.max(.15,size*.2);
 controls.maxDistance=Math.max(20,size*20);
 camera.near=Math.max(.005,size/2000);camera.far=Math.max(100,size*100);camera.updateProjectionMatrix();controls.update();
}
function clearModel(){
 if(model){modelRoot.remove(model);model.traverse(obj=>{if(obj.isMesh||obj.isSkinnedMesh){obj.geometry?.dispose();const materials=Array.isArray(obj.material)?obj.material:[obj.material];for(const mat of materials){if(!mat)continue;for(const value of Object.values(mat))if(value?.isTexture)value.dispose();mat.dispose();}}});model=null;}
}
async function selectModel(item){
 modelId=item.id;$('assetTitle').textContent=item.name;
 const serial=++loadSerial;
 setStatus('Cargando GLB…');clearModel();
 clearVisualEffects();
 $('assetModels').querySelectorAll('button[data-id]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===item.id)));
 try{
  const gltf=await loader.loadAsync(modelUrl(item));
  if(serial!==loadSerial){gltf.scene.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});return;}
  model=gltf.scene;
  const bounds=new THREE.Box3().setFromObject(model);
  if(bounds.isEmpty())throw new Error('GLB sin geometría visible');
  const size=bounds.getSize(new THREE.Vector3());
  const center=bounds.getCenter(new THREE.Vector3());
  // Preserve original geometry, materials and authoring scale; only center the preview.
  model.position.set(-center.x,-bounds.min.y,-center.z);
  modelRoot.add(model);
  modelSize=Math.max(size.x,size.y,size.z,.4);
  resetView();
  refreshFX();
  setStatus('Modelo cargado');
 }catch(error){if(serial===loadSerial){clearModel();setStatus('Error GLB: '+error.message);}}
}
function button(label,small,pressed,click,id){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.title=small;
 if(id)b.dataset.id=id;b.setAttribute('aria-pressed',String(!!pressed));
 if(small){const s=document.createElement('small');s.textContent=small;b.append(s);}
 b.addEventListener('click',click);return b;
}
function renderLibrary(){
 const query=$('assetSearch').value.trim().toLocaleLowerCase(),category=$('assetCategory').value;
 const found=library.filter(x=>(category==='all'||x.category===category)&&((x.name+' '+x.path).toLocaleLowerCase().includes(query)));
 $('assetCount').textContent=found.length+' modelos';
 $('assetModels').replaceChildren(...found.map(x=>button(x.name,x.category==='reserved'?'Estatua reservada · '+(x.bytes/1e6).toFixed(1)+' MB':(x.bytes/1e6).toFixed(1)+' MB',x.id===modelId,()=>{selectModel(x);if(!$('assetName').value.trim())$('assetName').value=x.name+' FX';},x.id)));
}
function newLayer(kind){return {id:'fx-'+Math.random().toString(36).slice(2,10),type:kind,name:kinds[kind],color:'#00ffe4',intensity:1,size:1,height:0,x:0,z:0,enabled:true};}
function sanitizedLayer(obj){
 if(!obj||!Object.prototype.hasOwnProperty.call(kinds,obj.type))throw new Error('Tipo de efecto no válido');
 const color=/^#[0-9a-fA-F]{6}$/.test(obj.color)?obj.color:'#00ffe4';
 return {id:'fx-'+Math.random().toString(36).slice(2,10),type:obj.type,name:String(obj.name||kinds[obj.type]).slice(0,48),color,intensity:safeNumber(obj.intensity,0,3,1),size:safeNumber(obj.size,.1,6,1),height:safeNumber(obj.height,-3,6,0),x:safeNumber(obj.x,-20,20,0),z:safeNumber(obj.z,-20,20,0),enabled:obj.enabled!==false};
}
function disposeObject(node){
 node.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const mm=Array.isArray(o.material)?o.material:[o.material];for(const m of mm)m.dispose();}});
}
const visuals=[];
function clearVisualEffects(){for(const entry of visuals){fxRoot.remove(entry.object);disposeObject(entry.object);}visuals.length=0;}
function haloMaterial(layer,opacity=.3){return new THREE.MeshBasicMaterial({color:layer.color,transparent:true,opacity:clamp(opacity*layer.intensity,0,1),depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});}
function makeVisual(layer){
 const group=new THREE.Group();
 group.position.set(layer.x,layer.height+Math.max(modelSize*.45,.3),layer.z);
 const r=Math.max(.12,modelSize*.52*layer.size);
 let animated=null;
 if(layer.type==='light'){
  const lamp=new THREE.PointLight(layer.color,layer.intensity*14,r*8,2);group.add(lamp);
  const marker=new THREE.Mesh(new THREE.SphereGeometry(r*.08,12,8),haloMaterial(layer,.8));group.add(marker);
 }else if(layer.type==='glow'||layer.type==='pulse'){
  const geo=new THREE.SphereGeometry(r,32,20);
  const mesh=new THREE.Mesh(geo,haloMaterial(layer,layer.type==='glow'?.2:.32));group.add(mesh);
  if(layer.type==='pulse')animated=mesh;
 }else if(layer.type==='fog'){
  const geo=new THREE.SphereGeometry(r*1.5,28,14);
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:layer.color,transparent:true,opacity:clamp(.07*layer.intensity,0,.3),depthWrite:false,side:THREE.DoubleSide}));mesh.scale.y=.32;group.add(mesh);
 }else if(layer.type==='particles'){
  const count=140;const positions=new Float32Array(count*3);
  // Deterministic positions avoid flicker when changing settings.
  for(let i=0;i<count;i++){const theta=i*2.3999632,rr=Math.sqrt((i+.5)/count)*r;positions[3*i]=Math.cos(theta)*rr;positions[3*i+1]=((i*37)%count)/count*r*1.7-r*.6;positions[3*i+2]=Math.sin(theta)*rr;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.PointsMaterial({color:layer.color,size:Math.max(.025,r*.075),sizeAttenuation:true,transparent:true,opacity:clamp(layer.intensity*.65,0,1),depthWrite:false,blending:THREE.AdditiveBlending});
  const dots=new THREE.Points(geometry,material);group.add(dots);animated=dots;
 }
 return {object:group,animated,kind:layer.type,enabled:layer.enabled};
}
function refreshFX(){
 clearVisualEffects();
 for(const layer of layers){if(!layer.enabled)continue;const vis=makeVisual(layer);fxRoot.add(vis.object);visuals.push(vis);}
}
function refreshList(){
 const root=$('effectList');root.replaceChildren();
 if(!layers.length){const p=document.createElement('p');p.className='assetSubtle';p.textContent='Sin efectos.';root.append(p);}
 for(const layer of layers){
  const b=button((layer.enabled?'● ':'○ ')+layer.name,kinds[layer.type],layer.id===selectedFx,()=>selectFX(layer.id));
  root.append(b);
 }
 const active=layers.find(x=>x.id===selectedFx);
 $('effectControls').hidden=!active;
 if(active){updateFields(active);$('effectToggle').textContent=active.enabled?'Ocultar capa':'Mostrar capa';}
}
function updateFields(x){
 fields.name.value=x.name;fields.color.value=x.color;fields.intensity.value=x.intensity;fields.size.value=x.size;fields.height.value=x.height;fields.x.value=x.x;fields.z.value=x.z;
 $('fxIntensityValue').textContent=x.intensity.toFixed(1);$('fxSizeValue').textContent=x.size.toFixed(1);$('fxHeightValue').textContent=x.height.toFixed(1);
}
function selectFX(id){selectedFx=id;refreshList();}
function changeFX(){
 const fx=layers.find(x=>x.id===selectedFx);if(!fx)return;
 fx.name=fields.name.value.slice(0,48)||kinds[fx.type];fx.color=fields.color.value;
 fx.intensity=safeNumber(fields.intensity.value,0,3,1);fx.size=safeNumber(fields.size.value,.1,6,1);
 fx.height=safeNumber(fields.height.value,-3,6,0);fx.x=safeNumber(fields.x.value,-20,20,0);fx.z=safeNumber(fields.z.value,-20,20,0);
 refreshFX();refreshList();
}
Object.values(fields).forEach(field=>field.addEventListener('input',changeFX));
$('effectAdd').addEventListener('click',()=>{const l=newLayer($('effectKind').value);layers.push(l);selectedFx=l.id;refreshFX();refreshList();});
$('effectToggle').addEventListener('click',()=>{const item=layers.find(x=>x.id===selectedFx);if(!item)return;item.enabled=!item.enabled;refreshFX();refreshList();});
$('effectRemove').addEventListener('click',()=>{layers=layers.filter(x=>x.id!==selectedFx);selectedFx=layers[0]?.id||null;refreshFX();refreshList();});
$('assetSearch').addEventListener('input',renderLibrary);
$('assetCategory').addEventListener('change',renderLibrary);
$('assetFrame').addEventListener('click',resetView);
$('assetGrid').addEventListener('click',()=>{grid.visible=!grid.visible;$('assetGrid').setAttribute('aria-pressed',String(grid.visible));});
function snapshot(){
 if(!modelId||!library.some(x=>x.id===modelId))throw Error('Selecciona un GLB antes de guardar');
 const asset=library.find(x=>x.id===modelId);
 return {schemaVersion:1,kind:'rok3d.asset-composition',id:'',name:$('assetName').value.trim().slice(0,70)||asset.name+' FX',source:{modelId:asset.id,path:asset.path,gitBlobSha:asset.gitBlobSha},effects:layers.map(({id,...rest})=>({...rest}))};
}
function fileSlug(s){return (s||'asset').normalize('NFKD').replace(/[^a-zA-Z0-9-_ ]/g,'').trim().replace(/\s+/g,'-').toLowerCase().slice(0,55)||'asset';}
$('assetSave').addEventListener('click',()=>{
 try{
  const obj=snapshot();obj.id=fileSlug(obj.name);
  const data=new Blob([JSON.stringify(obj,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=obj.id+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  setStatus('Composición JSON descargada');
 }catch(error){setStatus(error.message);}
});
$('assetImport').addEventListener('click',()=>$('assetImportFile').click());
$('assetImportFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  if(file.size>150000)throw Error('JSON demasiado grande');
  const obj=JSON.parse(await file.text());
  if(obj.kind!=='rok3d.asset-composition'||obj.schemaVersion!==1||!Array.isArray(obj.effects)||obj.effects.length>40)throw Error('Archivo de composición no válido');
  const asset=library.find(x=>x.id===obj.source?.modelId&&x.path===obj.source?.path);
  if(!asset)throw Error('El modelo original no existe en esta biblioteca');
  const clean=obj.effects.map(sanitizedLayer);
  layers=clean;selectedFx=layers[0]?.id||null;
  $('assetName').value=String(obj.name||'').slice(0,70);
  await selectModel(asset);
  refreshFX();refreshList();setStatus('Composición cargada');
 }catch(error){setStatus('Importación: '+error.message);}
});
$('assetClear').addEventListener('click',()=>{layers=[];selectedFx=null;$('assetName').value='';refreshFX();refreshList();setStatus('Composición nueva');});
const canvas=$('assetCanvas');
const observer=new ResizeObserver(()=>{
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
});observer.observe(canvas);
const clock=new THREE.Clock();
function tick(){requestAnimationFrame(tick);const time=clock.getElapsedTime();for(const item of visuals){if(item.kind==='pulse'&&item.animated){const v=1+Math.sin(time*2.4)*.15;item.animated.scale.setScalar(v);}if(item.kind==='particles'&&item.animated)item.animated.rotation.y=time*.12;}controls.update();renderer.render(scene,camera);}
tick();refreshList();
try{
 const response=await fetch('./assets/manifests/model-library.json',{cache:'no-cache'});
 if(!response.ok)throw Error('HTTP '+response.status);
 const data=await response.json();
 if(!Array.isArray(data.models))throw Error('Inventario inválido');
 library.push(...data.models);renderLibrary();setStatus('Elige un modelo');
}catch(error){setStatus('Biblioteca: '+error.message);}
