import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {BACKGROUND_DEFAULTS,createSceneBackground,normalizeSceneBackground} from './scene-background.js';
import {DEFAULT_SCENE_FLOOR,createSceneFloor,normalizeSceneFloor} from './scene-floor.js';
import {ARENA_COLUMNS,ARENA_ROWS,SCENERY_BOUNDS,footprint,
 placeOutsidePlayable,assertPlacement,validPlacement} from './scene-placement-rules.js';

/* R.O.K. Studio · isolated scenery editor, 15 x 30 protected playable cells.
   No combat systems, timers, HUD, caster animations, or writes to source GLBs. */
const $=id=>document.getElementById(id), W=ARENA_COLUMNS,D=ARENA_ROWS;
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
camera.position.set(32,37,51);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;
controls.target.set(0,0,0);controls.minDistance=4;controls.maxDistance=125;
scene.add(new THREE.HemisphereLight(0xc9e9ff,0x334858,2.1));
const sunlight=new THREE.DirectionalLight(0xffffff,2.1);sunlight.position.set(8,16,6);scene.add(sunlight);
const base=new THREE.Mesh(new THREE.BoxGeometry(W+.5,.25,D+.5),new THREE.MeshStandardMaterial({color:0x182b31,metalness:.15,roughness:.83}));
base.position.y=-.16;scene.add(base);
const tileGeometry=new THREE.PlaneGeometry(.986,.986);
const tileMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide});
const tiles=new THREE.InstancedMesh(tileGeometry,tileMaterial,W*D);
tiles.rotation.x=-Math.PI/2;tiles.position.y=.014;
const dummy=new THREE.Object3D(),tileColor=new THREE.Color();
for(let row=0;row<D;row++)for(let col=0;col<W;col++){
 const idx=row*W+col;
 dummy.position.set(col-(W-1)/2,(D-1)/2-row,0);dummy.updateMatrix();tiles.setMatrixAt(idx,dummy.matrix);
 const enemy=row<D/2;
 tileColor.setHex(enemy?(idx%2?0x29404e:0x263947):(idx%2?0x214945:0x203e3e));
 tiles.setColorAt(idx,tileColor);
}
tiles.instanceMatrix.needsUpdate=true;if(tiles.instanceColor)tiles.instanceColor.needsUpdate=true;
scene.add(tiles);
const lines=[];
for(let x=-W/2;x<=W/2;x+=1){lines.push(x,.032,-D/2,x,.032,D/2);}
for(let z=-D/2;z<=D/2;z+=1){lines.push(-W/2,.032,z,W/2,.032,z);}
const gridGeometry=new THREE.BufferGeometry();gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
const grid=new THREE.LineSegments(gridGeometry,new THREE.LineBasicMaterial({color:0x319391,transparent:true,opacity:.6}));scene.add(grid);
// New official combat-floor artwork. It is a separate ground-level plane,
// not a prop or collider, and does not change any of the 450 gameplay tiles.
const arenaFloorTextureUrl='./assets/texturas/'+encodeURIComponent('Pavimento ornamental de piedra azul y beige.webp');
const arenaArt=new THREE.Mesh(new THREE.PlaneGeometry(W,D),
 new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,depthWrite:false}));
arenaArt.rotation.x=-Math.PI/2;arenaArt.position.y=.024;scene.add(arenaArt);
new THREE.TextureLoader().load(arenaFloorTextureUrl,texture=>{
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 arenaArt.material.map=texture;arenaArt.material.needsUpdate=true;
 status('Pavimento ornamental aplicado al plano 15 × 30.');
},undefined,()=>status('No se encontró Pavimento ornamental en assets/texturas: carga la imagen al repositorio.'));
// Highlight the entire prohibited gameplay zone independently of grid visibility.
const border=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W,.02,D)),new THREE.LineBasicMaterial({color:0xffb36b}));
const exteriorGuide=new THREE.LineSegments(new THREE.EdgesGeometry(
 new THREE.BoxGeometry(SCENERY_BOUNDS.halfWidth*2,.02,SCENERY_BOUNDS.halfDepth*2)),
 new THREE.LineBasicMaterial({color:0x397c90,transparent:true,opacity:.48}));scene.add(exteriorGuide);
const outsideGround=new THREE.Mesh(new THREE.PlaneGeometry(
 SCENERY_BOUNDS.halfWidth*2,SCENERY_BOUNDS.halfDepth*2),
 new THREE.MeshBasicMaterial({color:0x164450,transparent:true,opacity:.095,
 depthWrite:false,side:THREE.DoubleSide}));
outsideGround.rotation.x=-Math.PI/2;outsideGround.position.y=-.005;scene.add(outsideGround);
scene.add(border);
const level=new THREE.Group();scene.add(level);
// Environmental shell is a separate visual layer, never a movable prop or collider.
const environment=createSceneBackground(THREE,{onStatus:message=>{
 status(message);
 if(message.startsWith('Textura gótica aplicada:')){
  // Reflect the resolved actual extension in the editor and exported JSON.
  $('sceneBackgroundTexture').value=environment.config.texture;
 }
}});
scene.add(environment.group);
const outdoorFloor=createSceneFloor(THREE,{onStatus:status});
let localFloorTextureData='';
async function compressSceneImage(file){
 if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Selecciona PNG, JPG o WebP');
 if(file.size>12000000)throw Error('Imagen demasiado grande (máximo 12 MB)');
 const bitmap=await createImageBitmap(file);
 const factor=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(bitmap.width*factor));
 canvas.height=Math.max(1,Math.round(bitmap.height*factor));
 const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
 bitmap.close();
 const image=canvas.toDataURL('image/webp',.8);
 if(image.length>1200000)throw Error('La imagen comprimida excede el límite de guardado');
 return image;
}
$('sceneFloorImport').addEventListener('click',()=>$('sceneFloorFile').click());
$('sceneFloorFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  localFloorTextureData=await compressSceneImage(file);
  $('sceneFloorImageStatus').textContent='✓ Imagen integrada: '+file.name+
   '. Guardar progreso la conserva al recargar.';
  showFloorFields(outdoorFloor.apply(floorInputs()));
  status('Suelo exterior: imagen cargada correctamente');
 }catch(error){status('Imagen del suelo: '+error.message);}
});
scene.add(outdoorFloor.group);
function floorInputs(){
 return {enabled:$('sceneFloorEnabled').checked,height:$('sceneFloorHeight').value,
  repeatX:$('sceneFloorRepeatX').value,repeatZ:$('sceneFloorRepeatZ').value,
  texture:$('sceneFloorTexture').value,textureData:localFloorTextureData};
}
function showFloorFields(c){
 const v=normalizeSceneFloor(c);
 localFloorTextureData=v.textureData||'';
 $('sceneFloorImageStatus').textContent=v.textureData?
  '✓ Imagen del suelo incorporada al escenario y guardable en JSON.':
  'Textura por ruta; puedes cargar una imagen desde tu equipo.';
 $('sceneFloorEnabled').checked=v.enabled;
 $('sceneFloorHeight').value=String(v.height);
 $('sceneFloorHeightValue').textContent=v.height.toFixed(2);
 $('sceneFloorRepeatX').value=String(v.repeatX);
 $('sceneFloorRepeatZ').value=String(v.repeatZ);
 $('sceneFloorTexture').value=v.texture;
}
showFloorFields(outdoorFloor.config);
$('sceneFloorHeight').addEventListener('input',()=>{
 outdoorFloor.setHeight($('sceneFloorHeight').value);
 $('sceneFloorHeightValue').textContent=outdoorFloor.config.height.toFixed(2);
});
$('sceneFloorEnabled').addEventListener('change',()=>outdoorFloor.setVisible($('sceneFloorEnabled').checked));
$('sceneFloorApply').addEventListener('click',()=>{
 try{showFloorFields(outdoorFloor.apply(floorInputs()));status('Suelo exterior actualizado');}
 catch(error){status('Suelo: '+error.message);}
});
function backgroundInputs(){
 return {
  enabled:$('sceneBackgroundEnabled').checked,type:'gothic-vault',
  width:$('sceneBackgroundWidth').value,
  height:$('sceneBackgroundHeight').value,
  archRise:$('sceneBackgroundArch').value,
  texture:$('sceneBackgroundTexture').value,
  textureOffsetX:$('sceneBackgroundOffsetX').value,
  textureOffsetY:$('sceneBackgroundOffsetY').value
 };
}
function showBackgroundFields(config){
 const c=normalizeSceneBackground(config);
 $('sceneBackgroundEnabled').checked=c.enabled;
 $('sceneBackgroundWidth').value=String(c.width);
 $('sceneBackgroundWidthValue').textContent=String(c.width);
 $('sceneBackgroundLengthValue').textContent=String(c.length);
 $('sceneBackgroundHeight').value=String(c.height);
 $('sceneBackgroundArch').value=String(c.archRise);
 $('sceneBackgroundTexture').value=c.texture;
 $('sceneBackgroundOffsetX').value=String(c.textureOffsetX);
 $('sceneBackgroundOffsetY').value=String(c.textureOffsetY);
 $('sceneBackgroundOffsetXValue').textContent=c.textureOffsetX.toFixed(2);
 $('sceneBackgroundOffsetYValue').textContent=c.textureOffsetY.toFixed(2);
}
function applyBackground(){
 try{
  const cfg=normalizeSceneBackground(backgroundInputs());
  environment.build(cfg);showBackgroundFields(cfg);
  status('Background: '+cfg.width+' × '+cfg.length+
   ' · paredes '+cfg.height+' · arco '+cfg.archRise);
 }catch(error){status('Background: '+error.message);}
}
$('sceneBackgroundWidth').addEventListener('input',()=>{
 $('sceneBackgroundWidthValue').textContent=$('sceneBackgroundWidth').value;
 $('sceneBackgroundLengthValue').textContent=String(Number($('sceneBackgroundWidth').value)*2);
});
$('sceneBackgroundEnabled').addEventListener('change',()=>{
 environment.show($('sceneBackgroundEnabled').checked);
});
for(const axis of ['X','Y']){
 $('sceneBackgroundOffset'+axis).addEventListener('input',()=>{
  const x=Number($('sceneBackgroundOffsetX').value);
  const y=Number($('sceneBackgroundOffsetY').value);
  environment.setTextureOffset(x,y);
  $('sceneBackgroundOffsetXValue').textContent=x.toFixed(2);
  $('sceneBackgroundOffsetYValue').textContent=y.toFixed(2);
 });
}
$('sceneBackgroundApply').addEventListener('click',applyBackground);
showBackgroundFields(environment.config);
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
 const bb=new THREE.Box3().setFromObject(group);
 if(bb.isEmpty())throw Error('El modelo no contiene geometría');
 const size=bb.getSize(new THREE.Vector3());
 const center=bb.getCenter(new THREE.Vector3());
 // Center of geometry is the pivot for BOTH rotation and X/Y/Z scaling.
 group.position.sub(center);
 group.userData.rokCenteredHalfHeight=size.y/2;
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
// Geometric (rendered) footprint, ignoring selection outlines and VFX.
function renderedFootprint(entry){
 entry.root.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(entry.model);
 const middle=box.getCenter(new THREE.Vector3());
 const size=box.getSize(new THREE.Vector3());
 return {middle,size};
}
function updateTransform(entry){
 if(!entry?.root)return;
 const sx=entry.scaleX??entry.scale??1,sy=entry.scaleY??entry.scale??1,
  sz=entry.scaleZ??entry.scale??1;
 entry.root.scale.set(sx,sy,sz);
 entry.root.rotation.y=THREE.MathUtils.degToRad(entry.rotation);
 // Ground-level Y is user controlled. Rendering pivot remains at real center.
 entry.root.position.set(entry.x,entry.y+entry.centerHalfHeight*sy,entry.z);
 const {middle,size}=renderedFootprint(entry);
 const safe=placeOutsidePlayable(middle.x,middle.z,size.x/2,size.z/2);
 entry.x+=safe.x-middle.x;
 entry.z+=safe.z-middle.z;
 entry.root.position.set(entry.x,entry.y+entry.centerHalfHeight*sy,entry.z);
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
 $('sceneRotation').value=v.rotation.toFixed(1);
 $('sceneScale').value=v.scale.toFixed(2);
 $('sceneScaleValue').textContent=v.scale.toFixed(2);
 for(const axis of ['X','Y','Z'])
  $('sceneScale'+axis).value=(v['scale'+axis]??v.scale).toFixed(2);
 $('sceneModelTexture').value=v.modelTexture||'';
}
function selectObject(obj){
 selection=obj;
 renderObjects();
 for(const o of objects)if(o.outline)o.outline.visible=o===obj;
}
async function applyModelTexture(entry,path){
 const raw=String(path||'').trim();
 if(!raw){
  entry.modelTexture='';
  entry.model.traverse(node=>{
   if(node.isMesh&&node.userData.rokOriginalMaterial){
    node.material=node.userData.rokOriginalMaterial;
   }
  });
  return;
 }
 if(!/^assets\/texturas\/[\p{L}\p{N} ()._-]+\.(?:png|jpe?g|webp)$/iu.test(raw)||raw.includes('..'))
  throw Error('Textura no permitida: usa assets/texturas/archivo.webp');
 const token=(entry.textureRevision||0)+1;
 entry.textureRevision=token;
 const url='./'+raw.split('/').map(encodeURIComponent).join('/');
 const map=await new THREE.TextureLoader().loadAsync(url);
 if(token!==entry.textureRevision||!entry.root.parent){map.dispose();return;}
 map.colorSpace=THREE.SRGBColorSpace;
 entry.model.traverse(node=>{
  if(!node.isMesh)return;
  if(!node.userData.rokOriginalMaterial)node.userData.rokOriginalMaterial=node.material;
  // Instance-specific material clone prevents affecting other props.
  const original=node.userData.rokOriginalMaterial;
  const update=mat=>{
   const copy=mat.clone();copy.map=map;copy.color.set(0xffffff);
   copy.needsUpdate=true;return copy;
  };
  node.material=Array.isArray(original)?original.map(update):update(original);
 });
 entry.modelTexture=raw;
}
$('sceneModelApplyTexture').addEventListener('click',async()=>{
 if(!selection)return;
 try{await applyModelTexture(selection,$('sceneModelTexture').value);status('Textura del modelo actualizada');}
 catch(error){status('Textura del modelo: '+error.message);}
});
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
 const rotation=num(data.rotation,-3600,3600),scale=num(data.scale,.05,20,1);
 const scaleX=num(data.scaleX,.05,20,scale),scaleY=num(data.scaleY,.05,20,scale),
  scaleZ=num(data.scaleZ,.05,20,scale);
 const obj={id:data.id||newId(),modelId:source.id,name:String(data.name||source.name).slice(0,70),
  compositionId:data.compositionId||null,effects:(data.effects||[]).map(cleanFx),
  x:Number.isFinite(Number(data.x))?Number(data.x):W/2+3,
  y:num(data.y,-100,100,0),z:Number.isFinite(Number(data.z))?Number(data.z):0,
  rotation,scale,scaleX,scaleY,scaleZ,
  modelTexture:String(data.modelTexture||''),centerHalfHeight:g.userData.rokCenteredHalfHeight||dimension/2,
  root,model:g,vfx,animations,outline};
 updateTransform(obj);level.add(root);objects.push(obj);renderObjects();
 if(obj.modelTexture)void applyModelTexture(obj,obj.modelTexture);
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
  try{const obj=await insertObject({modelId:item.id,name:item.name,x:W/2+3,z:0});if(obj){selectObject(obj);status('Objeto añadido');}}catch(e){status('Error: '+e.message);}
 })));
}
function renderCompositions(){
 const list=$('sceneCompositions');
 list.replaceChildren();
 if(!compositions.size){const p=document.createElement('p');p.className='sceneQuiet';p.textContent='Ninguna importada.';list.append(p);}
 for(const comp of compositions.values())list.append(makeButton(comp,'+ Añadir con efectos',async()=>{
  try{const v=await insertObject({modelId:comp.modelId,name:comp.name,compositionId:comp.id,effects:comp.effects,x:W/2+3,z:0});if(v){selectObject(v);status('Composición añadida');}}catch(e){status('Error: '+e.message);}
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
 try{
  const desiredX=at.x+drag.dx,desiredZ=at.z+drag.dz;
  if(Math.abs(desiredX-drag.obj.x)+Math.abs(desiredZ-drag.obj.z)>.001)drag.moved=true;
  drag.obj.x=desiredX;drag.obj.z=desiredZ;
  updateTransform(drag.obj);fillControls();
 }catch(error){status('Límite de la arena: '+error.message);}
});
function endDrag(event){if(!drag||event.pointerId!==drag.id)return;drag=null;controls.enabled=true;renderObjects();}
renderer.domElement.addEventListener('pointerup',endDrag);
renderer.domElement.addEventListener('pointercancel',endDrag);
renderer.domElement.addEventListener('lostpointercapture',()=>{drag=null;controls.enabled=true;});
function readControls(event){
 if(!selection)return;
 try{
  const v=selection;
  v.name=$('sceneObjectName').value.slice(0,70)||modelFor(v.modelId).name;
  v.x=Number($('scenePosX').value);v.y=num($('scenePosY').value,-100,100);
  v.z=Number($('scenePosZ').value);
  v.rotation=num($('sceneRotation').value,-3600,3600);
  const uniform=num($('sceneScale').value,.05,20,1);
  if(event?.target?.id==='sceneScale'){
   v.scaleX=uniform;v.scaleY=uniform;v.scaleZ=uniform;
  }else{
   v.scaleX=num($('sceneScaleX').value,.05,20,1);
   v.scaleY=num($('sceneScaleY').value,.05,20,1);
   v.scaleZ=num($('sceneScaleZ').value,.05,20,1);
  }
  v.scale=uniform;
  updateTransform(v);renderObjects();
 }catch(error){status('Transformación: '+error.message);fillControls();}
}
for(const id of ['sceneObjectName','scenePosX','scenePosY','scenePosZ',
 'sceneRotation','sceneScale','sceneScaleX','sceneScaleY','sceneScaleZ'])
 $(id).addEventListener('change',readControls);
$('sceneScale').addEventListener('input',readControls);
$('sceneDelete').addEventListener('click',()=>{
 if(!selection)return;
 const v=selection;level.remove(v.root);disposeEffects(v.vfx);v.outline.geometry.dispose();v.outline.material.dispose();
 objects=objects.filter(x=>x!==v);selectObject(null);status('Objeto eliminado');
});
$('sceneDuplicate').addEventListener('click',async()=>{
 if(!selection)return;
 const old=selection;
 try{const v=await insertObject({...serializeObject(old),id:undefined,x:old.x+1,z:old.z+1});if(v){selectObject(v);status('Objeto duplicado');}}catch(e){status(e.message);}
});
$('sceneSearch').addEventListener('input',renderLibrary);
$('sceneCamera').addEventListener('click',()=>{camera.position.set(32,37,51);controls.target.set(0,0,0);controls.update();});
$('sceneGrid').addEventListener('click',()=>{grid.visible=!grid.visible;$('sceneGrid').setAttribute('aria-pressed',String(grid.visible));});
function serializeObject(o){return {id:o.id,name:o.name,modelId:o.modelId,
 compositionId:o.compositionId,effects:o.effects.map(x=>({...x})),
 x:o.x,y:o.y,z:o.z,rotation:o.rotation,scale:o.scale,
 scaleX:o.scaleX,scaleY:o.scaleY,scaleZ:o.scaleZ,
 modelTexture:o.modelTexture||''};}
function sceneDocument(){
 for(const obj of objects){
  const {middle,size}=renderedFootprint(obj);
  assertPlacement(middle.x,middle.z,size.x/2,size.z/2);
 }
 return {schemaVersion:1,kind:'rok3d.scene',name:$('sceneName').value.trim().slice(0,70)||'Escenario',arena:{columns:W,rows:D},background:normalizeSceneBackground(backgroundInputs()),
 floor:normalizeSceneFloor(floorInputs()),objects:objects.map(serializeObject)};
}
function downloadJSON(obj){
 const name=(obj.name||'escenario').normalize('NFKD').replace(/[^a-z0-9 _-]/gi,'').trim().replace(/\s+/g,'-').toLowerCase().slice(0,55)||'escenario';
 const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=name+'.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
const sceneStorageKey='ROK_SCENE_EDITOR_DRAFT_V2';
function saveLocalScene(){
 try{
  const json=sceneDocument();
  localStorage.setItem(sceneStorageKey,JSON.stringify(json));
  $('sceneLocalStatus').textContent='✓ Progreso guardado en este navegador: '+
   objects.length+' objetos. Puedes actualizar sin perderlo.';
  status('Progreso guardado en el navegador');
  return true;
 }catch(error){
  $('sceneLocalStatus').textContent='No se guardó: '+error.message;
  return false;
 }
}
async function restoreScene(json,notice='Escenario restaurado'){
 const next=verifyScene(json);
 removeAll();
 $('sceneName').value=next.name;
 environment.build(next.background);showBackgroundFields(environment.config);
 outdoorFloor.apply(next.floor);showFloorFields(outdoorFloor.config);
 const generation=loadGeneration;
 let failed=0;
 for(const data of next.objects){
  try{await insertObject(data,generation);}
  catch(error){failed++;status('Error de objeto: '+error.message);}
 }
 status(notice+' · '+objects.length+' objetos'+(failed?' · '+failed+' pendientes':''));
 return {loaded:objects.length,failed};
}
$('sceneSaveLocal').addEventListener('click',saveLocalScene);
$('sceneRestoreLocal').addEventListener('click',async()=>{
 try{
  const raw=localStorage.getItem(sceneStorageKey);
  if(!raw)throw Error('Aún no existe progreso guardado');
  await restoreScene(JSON.parse(raw),'Progreso recuperado');
 }catch(error){status('Recuperación: '+error.message);}
});
$('sceneSave').addEventListener('click',()=>{
 try{downloadJSON(sceneDocument());status('Escenario JSON descargado · cuadrícula jugable despejada');}
 catch(error){status('No se pudo guardar: '+error.message);}
});
$('sceneNew').addEventListener('click',()=>{if(objects.length&&!confirm('¿Crear un escenario nuevo y descartar los cambios sin exportar?'))return;removeAll();$('sceneName').value='Nuevo escenario';environment.build(BACKGROUND_DEFAULTS);showBackgroundFields(environment.config);
 outdoorFloor.apply(DEFAULT_SCENE_FLOOR);showFloorFields(outdoorFloor.config);
 status('Escenario vacío');});
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
  result.push({id:newId(),modelId:raw.modelId,name:String(raw.name||model.name).slice(0,70),compositionId:raw.compositionId?String(raw.compositionId).slice(0,70):null,effects:raw.effects.map(cleanFx),x:Number(raw.x)||0,y:num(raw.y,-100,100),z:Number(raw.z)||0,rotation:num(raw.rotation,-3600,3600),scale:num(raw.scale,.05,20,1),
   scaleX:num(raw.scaleX,.05,20,num(raw.scale,.05,20,1)),
   scaleY:num(raw.scaleY,.05,20,num(raw.scale,.05,20,1)),
   scaleZ:num(raw.scaleZ,.05,20,num(raw.scale,.05,20,1)),
   modelTexture:String(raw.modelTexture||'')});
 }
 return {name:String(json.name||'Escenario').slice(0,70),
 background:normalizeSceneBackground(json.background||{}),
 floor:normalizeSceneFloor(json.floor||{}),objects:result};
}
$('sceneFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  const next=verifyScene(await readJSONFile(file));
  removeAll();$('sceneName').value=next.name;environment.build(next.background);showBackgroundFields(environment.config);
  outdoorFloor.apply(next.floor);showFloorFields(outdoorFloor.config);
  const generation=loadGeneration;
  let adjusted=0,omitted=0;
  for(const data of next.objects){
   try{
    const obj=await insertObject(data,generation);
    if(obj&&(Math.abs(obj.x-data.x)>.001||Math.abs(obj.z-data.z)>.001))adjusted++;
   }catch(error){omitted++;status('Modelo omitido: '+error.message);}
  }
  status('Escenario cargado: '+objects.length+' objetos'+
   (adjusted?' · '+adjusted+' recolocados fuera de la arena':'')+
   (omitted?' · '+omitted+' omitidos':''));

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
  try{
   const saved=localStorage.getItem(sceneStorageKey);
   if(saved){
    const result=await restoreScene(JSON.parse(saved),'Progreso recuperado automáticamente');
    $('sceneLocalStatus').textContent='✓ Se restauró el último progreso guardado ('+
     result.loaded+' objetos).';
   }
  }catch(error){$('sceneLocalStatus').textContent='No se pudo restaurar el borrador: '+error.message;}
 }catch(error){status('Catálogo: '+error.message);}
}
init();
