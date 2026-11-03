import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/* R.O.K. Studio · isolated scenery editor, 9 x 18 cells.
   No combat systems, timers, HUD, caster animations, or writes to source GLBs. */
const $=id=>document.getElementById(id), W=9,D=18;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const num=(v,a,b,fallback=0)=>Number.isFinite(Number(v))?clamp(Number(v),a,b):fallback;
const effects=new Set(['glow','light','particles','fog','pulse']);
const status=message=>{$('sceneStatus').textContent=message;};
const loader=new GLTFLoader();
const scene=new THREE.Scene();scene.background=new THREE.Color('#081522');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
$('sceneCanvas').append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(45,1,.05,300);
camera.position.set(13,18,23);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;
controls.target.set(0,0,0);controls.minDistance=4;controls.maxDistance=70;
scene.add(new THREE.HemisphereLight(0xc9e9ff,0x334858,2.1));
const sunlight=new THREE.DirectionalLight(0xffffff,2.1);sunlight.position.set(8,16,6);scene.add(sunlight);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshStandardMaterial({color:0x23333d,roughness:1,metalness:0,side:THREE.DoubleSide}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.025;scene.add(ground);
const grid=new THREE.GridHelper(W,W,0x33918e,0x27525b);
grid.position.y=.003;grid.scale.z=D/W;scene.add(grid);
const border=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W,.02,D)),new THREE.LineBasicMaterial({color:0x398d8d}));
scene.add(border);
const level=new THREE.Group();scene.add(level);
const pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const hitPoint=new THREE.Vector3();
const modelCatalog=new Map(),cache=new Map(),compositions=new Map();
let objects=[],selection=null,serial=0,loadGeneration=0,drag=null,adding=null,instanceCounter=0;
const newId=()=>('obj-'+(++instanceCounter)+'-'+Math.random().toString(36).slice(2,7));
const modelURL=path=>'./'+path.split('/').map(encodeURIComponent).join('/');
const byName=(a,b)=>a.name.localeCompare(b.name,'es');
function modelFor(id){return modelCatalog.get(id);}
function setPointer(event){
 const r=renderer.domElement.getBoundingClientRect();
 pointer.x=(event.clientX-r.left)/r.width*2-1;
 pointer.y=-(event.clientY-r.top)/r.height*2+1;
 raycaster.setFromCamera(pointer,camera);
}
function positionOnFloor(event){
 setPointer(event);
 return raycaster.ray.intersectPlane(groundPlane,hitPoint)?hitPoint.clone():null;
}
function modelCenter(group){
 const bb=new THREE.Box3().setFromObject(group);if(bb.isEmpty())throw Error('El modelo no contiene geometría');
 group.position.set(-((bb.min.x+bb.max.x)/2),-bb.min.y,-((bb.min.z+bb.max.z)/2));
 return group;
}
function fetchTemplate(item){
 if(!cache.has(item.id)){
  cache.set(item.id,loader.loadAsync(modelURL(item.path)).then(gltf=>modelCenter(gltf.scene)));
 }
 return cache.get(item.id);
}
function cleanFx(e){
 if(!e||!effects.has(e.type))throw Error('Efecto incompatible');
 return {type:e.type,name:String(e.name||e.type).slice(0,48),color:/^#[0-9a-fA-F]{6}$/.test(e.color)?e.color:'#00ffe4',intensity:num(e.intensity,0,3,1),size:num(e.size,.1,6,1),height:num(e.height,-3,6,0),x:num(e.x,-20,20),z:num(e.z,-20,20),enabled:e.enabled!==false};
}
function checkComposition(obj){
 if(!obj||obj.kind!=='rok3d.asset-composition'||obj.schemaVersion!==1||!Array.isArray(obj.effects)||obj.effects.length>40)throw Error('Composición inválida');
 const m=modelFor(obj.source?.modelId);
 if(!m||m.path!==obj.source.path||m.gitBlobSha!==obj.source.gitBlobSha)throw Error('El GLB de la composición no coincide con la biblioteca');
 if(!m.enabledInSceneEditor)throw Error('Modelo reservado o personaje: no permitido en escenarios');
 return {id:String(obj.id||m.id).slice(0,70),name:String(obj.name||m.name).slice(0,70),modelId:m.id,effects:obj.effects.map(cleanFx)};
}
function lightMaterial(fx,alpha){return new THREE.MeshBasicMaterial({color:fx.color,transparent:true,opacity:clamp(alpha*fx.intensity,0,1),side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});}
function effectObject(fx,dimension){
 const g=new THREE.Group(),r=Math.max(.12,dimension*.52*fx.size);
 g.position.set(fx.x,fx.height+Math.max(dimension*.45,.3),fx.z);
 let anim=null;
 if(fx.type==='light'){
  g.add(new THREE.PointLight(fx.color,fx.intensity*14,r*8,2));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r*.08,12,8),lightMaterial(fx,.8)));
 }else if(fx.type==='glow'||fx.type==='pulse'){
  anim=new THREE.Mesh(new THREE.SphereGeometry(r,32,20),lightMaterial(fx,fx.type==='pulse'?.32:.2));g.add(anim);
 }else if(fx.type==='fog'){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(r*1.5,28,14),new THREE.MeshBasicMaterial({color:fx.color,transparent:true,opacity:clamp(.07*fx.intensity,0,.3),depthWrite:false,side:THREE.DoubleSide}));
  mesh.scale.y=.32;g.add(mesh);
 }else if(fx.type==='particles'){
  const n=140,p=new Float32Array(n*3);
  for(let i=0;i<n;i++){const a=i*2.3999632,t=Math.sqrt((i+.5)/n)*r;p[i*3]=Math.cos(a)*t;p[i*3+1]=((i*37)%n)/n*r*1.7-r*.6;p[i*3+2]=Math.sin(a)*t;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));
  anim=new THREE.Points(geo,new THREE.PointsMaterial({color:fx.color,size:Math.max(.025,r*.075),sizeAttenuation:true,transparent:true,opacity:clamp(fx.intensity*.65,0,1),depthWrite:false,blending:THREE.AdditiveBlending}));g.add(anim);
 }
 return {group:g,anim,kind:fx.type};
}
function disposeEffects(group){
 group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
}
function clipPos(x,z){return [num(x,-W/2,W/2),num(z,-D/2,D/2)];}
function updateTransform(entry){
 if(!entry?.root)return;
 entry.root.position.set(entry.x,entry.y,entry.z);
 entry.root.rotation.y=THREE.MathUtils.degToRad(entry.rotation);
 entry.root.scale.setScalar(entry.scale);
}
function renderObjects(){
 $('sceneObjectCount').textContent=String(objects.length);
 const target=$('sceneInstances');target.replaceChildren();
 for(const obj of objects){
  const b=document.createElement('button');b.type='button';
  b.textContent=obj.name;b.setAttribute('aria-pressed',String(obj.id===selection?.id));
  const sub=document.createElement('small');sub.textContent=obj.compositionId?'Compuesto':'GLB · '+obj.modelId;b.append(sub);
  b.addEventListener('click',()=>selectObject(obj));target.append(b);
 }
 $('sceneTransform').hidden=!selection;
 if(selection)fillControls();
}
function fillControls(){
 const v=selection;if(!v)return;
 $('sceneObjectName').value=v.name;
 $('scenePosX').value=v.x.toFixed(2);$('scenePosY').value=v.y.toFixed(2);$('scenePosZ').value=v.z.toFixed(2);
 $('sceneRotation').value=v.rotation.toFixed(1);$('sceneScale').value=v.scale;$('sceneScaleValue').textContent=v.scale.toFixed(2);
}
function selectObject(obj){
 selection=obj;
 renderObjects();
 for(const o of objects)if(o.outline)o.outline.visible=o===obj;
}
function objectOutline(root){
 const box=new THREE.Box3().setFromObject(root);
 const size=box.getSize(new THREE.Vector3());
 const bb=new THREE.BoxGeometry(Math.max(size.x,.12),Math.max(size.y,.12),Math.max(size.z,.12));
 const edges=new THREE.LineSegments(new THREE.EdgesGeometry(bb),new THREE.LineBasicMaterial({color:0x00ffe4,depthTest:false}));
 edges.position.copy(box.getCenter(new THREE.Vector3()));
 edges.visible=false;return edges;
}
async function insertObject(data,generation=loadGeneration){
 const source=modelFor(data.modelId);
 if(!source||!source.enabledInSceneEditor)throw Error('Modelo no permitido');
 const base=await fetchTemplate(source);
 if(generation!==loadGeneration)return null;
 const g=base.clone(true);
 const bounding=new THREE.Box3().setFromObject(g);
 const dimension=Math.max(...bounding.getSize(new THREE.Vector3()).toArray(),.4);
 const root=new THREE.Group();root.add(g);
 const vfx=new THREE.Group();root.add(vfx);
 const animations=[];
 for(const fx of data.effects||[]){
  if(!fx.enabled)continue;
  const f=effectObject(fx,dimension);vfx.add(f.group);animations.push(f);
 }
 // Outline is separate from the model: effects do not make the selection bounds grow.
 const outline=objectOutline(g);root.add(outline);
 const [x,z]=clipPos(data.x??0,data.z??0);
 const obj={id:data.id||newId(),modelId:source.id,name:String(data.name||source.name).slice(0,70),compositionId:data.compositionId||null,effects:(data.effects||[]).map(cleanFx),x,y:num(data.y,-10,20),z,rotation:num(data.rotation,-3600,3600),scale:num(data.scale,.05,5,1),root,model:g,vfx,animations,outline};
 updateTransform(obj);level.add(root);objects.push(obj);renderObjects();
 return obj;
}
function removeAll(){
 loadGeneration++;selection=null;
 for(const v of objects){level.remove(v.root);disposeEffects(v.vfx);v.outline.geometry.dispose();v.outline.material.dispose();}
 objects=[];renderObjects();
}
function makeButton(item,caption,callback){
 const b=document.createElement('button');b.type='button';b.textContent=item.name;
 const sm=document.createElement('small');sm.textContent=caption;b.append(sm);b.addEventListener('click',callback);return b;
}
function renderLibrary(){
 const search=$('sceneSearch').value.trim().toLocaleLowerCase();
 const items=[...modelCatalog.values()].filter(x=>x.enabledInSceneEditor&&x.name.toLocaleLowerCase().includes(search)).sort(byName);
 $('sceneLibraryCount').textContent=items.length+' modelos de escenario';
 $('sceneLibraryList').replaceChildren(...items.map(item=>makeButton(item,'+ Añadir · GLB',async()=>{
  status('Cargando '+item.name+'…');
  try{const obj=await insertObject({modelId:item.id,name:item.name,x:0,z:0});if(obj){selectObject(obj);status('Objeto añadido');}}catch(e){status('Error: '+e.message);}
 })));
}
function renderCompositions(){
 const list=$('sceneCompositions');
 list.replaceChildren();
 if(!compositions.size){const p=document.createElement('p');p.className='sceneQuiet';p.textContent='Ninguna importada.';list.append(p);}
 for(const comp of compositions.values())list.append(makeButton(comp,'+ Añadir con efectos',async()=>{
  try{const v=await insertObject({modelId:comp.modelId,name:comp.name,compositionId:comp.id,effects:comp.effects,x:0,z:0});if(v){selectObject(v);status('Composición añadida');}}catch(e){status('Error: '+e.message);}
 }));
}
function pickObject(event){
 setPointer(event);
 const targets=objects.map(x=>x.model),hits=raycaster.intersectObjects(targets,true);
 if(!hits.length)return null;
 let n=hits[0].object;
 while(n){const found=objects.find(x=>x.model===n);if(found)return found;n=n.parent;}
 return null;
}
renderer.domElement.addEventListener('pointerdown',event=>{
 if(event.button!==0||!objects.length)return;
 const found=pickObject(event);if(!found)return;
 selectObject(found);
 const point=positionOnFloor(event);if(!point)return;
 drag={id:event.pointerId,obj:found,dx:found.x-point.x,dz:found.z-point.z,moved:false};
 controls.enabled=false;
 renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove',event=>{
 if(!drag||drag.id!==event.pointerId)return;
 const at=positionOnFloor(event);if(!at)return;
 const [x,z]=clipPos(at.x+drag.dx,at.z+drag.dz);
 if(Math.abs(x-drag.obj.x)+Math.abs(z-drag.obj.z)>.001)drag.moved=true;
 drag.obj.x=x;drag.obj.z=z;updateTransform(drag.obj);fillControls();
});
function endDrag(event){if(!drag||event.pointerId!==drag.id)return;drag=null;controls.enabled=true;renderObjects();}
renderer.domElement.addEventListener('pointerup',endDrag);
renderer.domElement.addEventListener('pointercancel',endDrag);
renderer.domElement.addEventListener('lostpointercapture',()=>{drag=null;controls.enabled=true;});
function readControls(){
 if(!selection)return;
 const [x,z]=clipPos($('scenePosX').value,$('scenePosZ').value);
 selection.name=$('sceneObjectName').value.slice(0,70)||modelFor(selection.modelId).name;
 selection.x=x;selection.z=z;selection.y=num($('scenePosY').value,-10,20);
 selection.rotation=num($('sceneRotation').value,-3600,3600);
 selection.scale=num($('sceneScale').value,.05,5,1);
 updateTransform(selection);$('sceneScaleValue').textContent=selection.scale.toFixed(2);renderObjects();
}
for(const id of ['sceneObjectName','scenePosX','scenePosY','scenePosZ','sceneRotation','sceneScale'])$(id).addEventListener('change',readControls);
$('sceneScale').addEventListener('input',readControls);
$('sceneDelete').addEventListener('click',()=>{
 if(!selection)return;
 const v=selection;level.remove(v.root);disposeEffects(v.vfx);v.outline.geometry.dispose();v.outline.material.dispose();
 objects=objects.filter(x=>x!==v);selectObject(null);status('Objeto eliminado');
});
$('sceneDuplicate').addEventListener('click',async()=>{
 if(!selection)return;
 const old=selection;
 try{const v=await insertObject({...serializeObject(old),id:undefined,x:clamp(old.x+.5,-W/2,W/2),z:clamp(old.z+.5,-D/2,D/2)});if(v){selectObject(v);status('Objeto duplicado');}}catch(e){status(e.message);}
});
$('sceneSearch').addEventListener('input',renderLibrary);
$('sceneCamera').addEventListener('click',()=>{camera.position.set(13,18,23);controls.target.set(0,0,0);controls.update();});
$('sceneGrid').addEventListener('click',()=>{grid.visible=!grid.visible;$('sceneGrid').setAttribute('aria-pressed',String(grid.visible));});
function serializeObject(o){return {id:o.id,name:o.name,modelId:o.modelId,compositionId:o.compositionId,effects:o.effects.map(x=>({...x})),x:o.x,y:o.y,z:o.z,rotation:o.rotation,scale:o.scale};}
function sceneDocument(){
 return {schemaVersion:1,kind:'rok3d.scene',name:$('sceneName').value.trim().slice(0,70)||'Escenario',arena:{columns:W,rows:D},objects:objects.map(serializeObject)};
}
function downloadJSON(obj){
 const name=(obj.name||'escenario').normalize('NFKD').replace(/[^a-z0-9 _-]/gi,'').trim().replace(/\s+/g,'-').toLowerCase().slice(0,55)||'escenario';
 const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=name+'.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
$('sceneSave').addEventListener('click',()=>{downloadJSON(sceneDocument());status('Escenario JSON descargado');});
$('sceneNew').addEventListener('click',()=>{if(objects.length&&!confirm('¿Crear un escenario nuevo y descartar los cambios sin exportar?'))return;removeAll();$('sceneName').value='Nuevo escenario';status('Escenario vacío');});
$('sceneOpen').addEventListener('click',()=>$('sceneFile').click());
async function readJSONFile(file){
 if(!file||file.size>500000)throw Error('Archivo JSON ausente o demasiado grande');
 return JSON.parse(await file.text());
}
function verifyScene(json){
 if(json?.kind!=='rok3d.scene'||json.schemaVersion!==1||json.arena?.columns!==W||json.arena?.rows!==D||!Array.isArray(json.objects)||json.objects.length>250)throw Error('Escenario incompatible');
 const result=[];
 for(const raw of json.objects){
  const model=modelFor(raw.modelId);
  if(!model||!model.enabledInSceneEditor)throw Error('Contiene un modelo no permitido: '+raw.modelId);
  if(!Array.isArray(raw.effects)||raw.effects.length>40)throw Error('Lista de efectos inválida');
  result.push({id:newId(),modelId:raw.modelId,name:String(raw.name||model.name).slice(0,70),compositionId:raw.compositionId?String(raw.compositionId).slice(0,70):null,effects:raw.effects.map(cleanFx),x:num(raw.x,-W/2,W/2),y:num(raw.y,-10,20),z:num(raw.z,-D/2,D/2),rotation:num(raw.rotation,-3600,3600),scale:num(raw.scale,.05,5,1)});
 }
 return {name:String(json.name||'Escenario').slice(0,70),objects:result};
}
$('sceneFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  const next=verifyScene(await readJSONFile(file));
  removeAll();$('sceneName').value=next.name;
  const generation=loadGeneration;
  for(const data of next.objects){try{await insertObject(data,generation);}catch(error){status('Modelo omitido: '+error.message);}}
  status('Escenario cargado: '+objects.length+' objetos');
 }catch(error){status('Importación: '+error.message);}
});
$('sceneImportAsset').addEventListener('click',()=>$('sceneAssetFile').click());
$('sceneAssetFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  const comp=checkComposition(await readJSONFile(file));
  compositions.set(comp.id,comp);renderCompositions();status('Asset importado: '+comp.name);
 }catch(error){status('Asset: '+error.message);}
});
const observer=new ResizeObserver(()=>{const elem=$('sceneCanvas');const w=Math.max(1,elem.clientWidth),h=Math.max(1,elem.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();});observer.observe($('sceneCanvas'));
const clock=new THREE.Clock();
function tick(){
 requestAnimationFrame(tick);const t=clock.getElapsedTime();
 for(const obj of objects)for(const effect of obj.animations){
  if(effect.kind==='pulse'&&effect.anim){effect.anim.scale.setScalar(1+Math.sin(t*2.4)*.15);}
  if(effect.kind==='particles'&&effect.anim)effect.anim.rotation.y=t*.12;
 }
 controls.update();renderer.render(scene,camera);
}
tick();
async function init(){
 try{
  const res=await fetch('./assets/manifests/model-library.json',{cache:'no-cache'});if(!res.ok)throw Error('HTTP '+res.status);
  const data=await res.json();
  for(const item of data.models)modelCatalog.set(item.id,item);
  renderLibrary();renderObjects();renderCompositions();status('Editor preparado');
 }catch(error){status('Catálogo: '+error.message);}
}
init();
