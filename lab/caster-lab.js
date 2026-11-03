import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {clone as cloneSkinned,retargetClip} from 'three/addons/utils/SkeletonUtils.js';

const $=id=>document.getElementById(id);
const status=$('sceneState');
const labels={chiara:'Chiara',lioren:'Lioren'};
const models=new Map(), animations=new Map(), decisions=new Map();
let manifest=null,current='chiara',currentClip=null,loadingToken=0,speed=1;
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
renderer.outputColorSpace=THREE.SRGBColorSpace;
$('scene').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x081924);
scene.add(new THREE.HemisphereLight(0xffffff,0x35425b,2.2));
const light=new THREE.DirectionalLight(0xffffff,2.8);light.position.set(-4,11,8);scene.add(light);
const floor=new THREE.Mesh(new THREE.CircleGeometry(3.4,64),new THREE.MeshStandardMaterial({color:0x1c4a4b,roughness:.9}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.014;scene.add(floor);
const ring=new THREE.GridHelper(7,14,0x3fa99c,0x245461);ring.position.y=.002;scene.add(ring);
const camera=new THREE.PerspectiveCamera(45,1,.05,150);
camera.position.set(3.5,2.8,6.5);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,1,0);controls.enableDamping=true;controls.minDistance=1.6;controls.maxDistance=20;controls.update();
const gltfLoader=new GLTFLoader(),fbxLoader=new FBXLoader();
const clock=new THREE.Clock();
function boneKey(name){return String(name).replace(/^.*?mixamorig[:_]?/i,'').replace(/[^a-z0-9]/gi,'').toLowerCase();}
function skeletonFor(root){
  let sk=null;
  root.traverse(o=>{if(o.isSkinnedMesh&&o.skeleton&&(!sk||o.skeleton.bones.length>sk.bones.length))sk=o.skeleton;});
  if(sk)return sk;
  const bones=[];root.traverse(o=>{if(o.isBone)bones.push(o);});
  return bones.length>=20?new THREE.Skeleton(bones):null;
}
function adaptFBX(source,sourceClip,targetModel,name){
  const copy=cloneSkinned(targetModel);
  const src=skeletonFor(source),dst=skeletonFor(copy);
  if(!src||!dst)throw Error('No hay esqueleto Mixamo compatible en este modelo');
  src.pose();dst.pose();source.updateMatrixWorld(true);copy.updateMatrixWorld(true);
  const srcMap=new Map(src.bones.map(b=>[boneKey(b.name),b]));
  const names={},localOffsets={};let count=0;
  for(const bone of dst.bones){
    const srcBone=srcMap.get(boneKey(bone.name));
    if(!srcBone)continue;
    names[bone.name]=srcBone.name;
    const from=srcBone.getWorldQuaternion(new THREE.Quaternion());
    const to=bone.getWorldQuaternion(new THREE.Quaternion());
    localOffsets[bone.name]=new THREE.Matrix4().makeRotationFromQuaternion(from.invert().multiply(to));
    count++;
  }
  if(count<20)throw Error('Solo coinciden '+count+' huesos: revisar rig del GLB/FBX');
  source.skeleton=src;copy.skeleton=dst;
  let baked;
  try{
    baked=retargetClip(copy,source,sourceClip,{fps:30,names,localOffsets,
      preserveBonePositions:true,hip:'__NO_ROOT_TRANSLATION__'});
  }finally{
    delete source.skeleton;delete copy.skeleton;
  }
  const tracks=baked.tracks.filter(t=>/^\.bones\[(.+)\]\.quaternion$/.test(t.name)).map(track=>{
    const t=track.clone();t.name=t.name.replace(/^\.bones\[(.+)\]\.quaternion$/,'$1.quaternion');return t;
  });
  if(!tracks.length)throw Error('No hay tracks de huesos trasladables para este GLB');
  const clip=new THREE.AnimationClip(name,-1,tracks);clip.optimize();
  return {clip,count};
}
function report(message){status.textContent=message;}
function fitModel(root){
  const b=new THREE.Box3().setFromObject(root),size=b.getSize(new THREE.Vector3());
  if(size.y<.001)throw Error('GLB sin tamaño válido');
  const scale=1.82/size.y;
  root.scale.multiplyScalar(scale);
  root.position.y=-b.min.y*scale;
}
async function loadCaster(id){
  if(models.has(id))return models.get(id);
  const def=manifest.models.find(m=>m.id===id);
  if(!def)throw Error('Kaster no registrado');
  report('Cargando modelo '+labels[id]+'…');
  const gltf=await gltfLoader.loadAsync(new URL('./'+encodeURIComponent(def.path),location.href).href);
  const group=cloneSkinned(gltf.scene);
  fitModel(group);group.visible=false;scene.add(group);
  group.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
  const mixer=new THREE.AnimationMixer(group);
  const idle=gltf.animations.find(a=>/idle|standing/i.test(a.name))||gltf.animations[0]||null;
  const data={group,mixer,idle,gltf};
  models.set(id,data);
  return data;
}
function idleNow(){
  const m=models.get(current);if(!m)return;
  m.mixer.stopAllAction();
  const sk=skeletonFor(m.group);sk?.pose();
  if(m.idle)m.mixer.clipAction(m.idle).reset().play();
  currentClip=null;document.querySelectorAll('.clip').forEach(e=>e.classList.remove('playing'));
  report(labels[current]+' · Idle / reposo');
}
async function switchCaster(id){
  if(!['chiara','lioren'].includes(id))return;
  loadingToken++;current=id;
  for(const model of models.values()){model.group.visible=false;model.mixer.stopAllAction();}
  try{
    const m=await loadCaster(id);
    if(current!==id)return;
    m.group.visible=true;idleNow();
  }catch(e){report('Error al cargar '+labels[id]+': '+String(e.message||e));}
}
async function play(id){
  const entry=manifest.animations.find(x=>x.id===id);if(!entry)return;
  const token=++loadingToken;
  const el=document.querySelector('[data-id="'+id+'"]');
  const out=el?.querySelector('.clip-result');
  const model=models.get(current);
  if(!model){report('Primero debe cargar el modelo');return;}
  const cacheKey=current+':'+id;
  try{
    report('Preparando '+entry.path+' para '+labels[current]+'…');
    if(out)out.textContent='Cargando FBX y comprobando huesos…';
    let data=animations.get(cacheKey);
    if(!data){
      const fbx=await fbxLoader.loadAsync(new URL('./'+encodeURIComponent(entry.path),location.href).href);
      const clip=fbx.animations?.[0];
      if(!clip)throw Error('Este FBX no contiene clips');
      data=adaptFBX(fbx,clip,model.gltf.scene,entry.id);
      animations.set(cacheKey,data);
    }
    if(token!==loadingToken||!models.get(current))return;
    const m=models.get(current);
    m.mixer.stopAllAction();
    const act=m.mixer.clipAction(data.clip);
    act.reset();act.setLoop(THREE.LoopRepeat,Infinity);act.play();m.mixer.timeScale=speed;
    currentClip=id;
    document.querySelectorAll('.clip').forEach(e=>e.classList.toggle('playing',e.dataset.id===id));
    if(out)out.textContent='Compatible: '+data.count+' huesos · '+data.clip.duration.toFixed(2)+' s';
    report(labels[current]+' · '+entry.path+' · '+data.count+' huesos');
  }catch(error){
    if(out)out.textContent='No compatible: '+String(error.message||error);
    report('Error en animación: '+String(error.message||error));
  }
}
function updateSelection(){
  const list=[...decisions].filter(([,value])=>value!=='pending');
  const kept=list.filter(([,v])=>v==='keep').length;
  const discarded=list.filter(([,v])=>v==='discard').length;
  $('selectionState').textContent='Conservar: '+kept+' · Descartar: '+discarded+' · Sin revisar: '+(manifest.animations.length-list.length);
}
function decisionManifest(){
  return {schemaVersion:1,sourceRepository:'dtokurisu-png/rok-3d-test',
    modelIds:manifest.models.map(x=>x.id),
    decisions:manifest.animations.map(a=>({id:a.id,path:a.path,sha:a.sha,
      decision:decisions.get(a.id)||'pending'}))};
}
function buildList(){
  const wrap=$('animationList');wrap.replaceChildren();
  for(const entry of manifest.animations){
    const box=document.createElement('article');box.className='clip';box.dataset.id=entry.id;
    const top=document.createElement('div');top.className='clip-top';
    const title=document.createElement('strong');title.textContent=entry.path;
    const playBtn=document.createElement('button');playBtn.textContent='▶ Probar';playBtn.onclick=()=>void play(entry.id);
    top.append(title,playBtn);
    const meta=document.createElement('div');meta.className='clip-meta';
    meta.textContent=entry.group+' · SHA '+entry.sha.slice(0,12)+' · archivo independiente';
    const fieldset=document.createElement('fieldset');
    for(const [value,label] of [['pending','Pendiente'],['keep','Conservar'],['discard','Descartar']]){
      const choice=document.createElement('label');
      const radio=document.createElement('input');radio.type='radio';
      radio.name='decision-'+entry.id;radio.value=value;radio.checked=value==='pending';
      radio.addEventListener('change',()=>{decisions.set(entry.id,value);updateSelection();});
      choice.append(radio,document.createTextNode(' '+label));fieldset.append(choice);
    }
    const result=document.createElement('div');result.className='clip-result';result.textContent='Aún no probado con este Kaster';
    box.append(top,meta,fieldset,result);wrap.append(box);
  }
  updateSelection();
}
$('caster').addEventListener('change',e=>void switchCaster(e.target.value));
$('speed').addEventListener('input',e=>{
  speed=Number(e.target.value);$('speedValue').textContent=speed.toFixed(2)+'×';
  for(const model of models.values())model.mixer.timeScale=speed;
});
$('idle').onclick=()=>{loadingToken++;idleNow();};
$('stop').onclick=()=>{loadingToken++;for(const m of models.values())m.mixer.stopAllAction();currentClip=null;report('Animación detenida');};
$('resetCamera').onclick=()=>{
  controls.target.set(0,1,0);camera.position.set(3.5,2.8,6.5);controls.update();
};
$('copy').onclick=async()=>{
  try{
    await navigator.clipboard.writeText(JSON.stringify(decisionManifest(),null,2));
    $('selectionState').textContent='Selección copiada. Pégala en el chat para aplicarla a GitHub.';
  }catch(error){$('selectionState').textContent='Portapapeles no disponible; usa Exportar decisiones JSON.';}
};
$('export').onclick=()=>{
  const blob=new Blob([JSON.stringify(decisionManifest(),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='rok-caster-animation-decisions.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  $('selectionState').textContent='JSON exportado; súbelo al chat para registrar tus decisiones en GitHub.';
};
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),.05);
  for(const m of models.values())if(m.group.visible)m.mixer.update(dt);
  controls.update();
  renderer.render(scene,camera);
}
const resizer=new ResizeObserver(()=>{
  const el=$('scene'),w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
});
resizer.observe($('scene'));
loop();
try{
  const response=await fetch('./assets/manifests/caster-animations.json',{cache:'no-store'});
  if(!response.ok)throw Error('No está disponible el inventario de FBX');
  manifest=await response.json();
  buildList();await switchCaster('chiara');
  // Precargar Lioren después de que Chiara esté lista, sin cambiar el elegido.
  void loadCaster('lioren').catch(()=>{});
}catch(error){report('Error al iniciar laboratorio: '+String(error.message||error));}
