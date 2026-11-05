/* R.O.K. 3D — independent skeletal animation creator.
 * Original GLB/FBX assets are read-only; editing occurs in one loaded scene.
 * IK uses world-space CCD on two-joint limb chains and stores local rotations.
 */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {numberedSources,newSources,originalSources,compositeSources,loadCreatorClip} from './animation-creator-sources.js';

const $=id=>document.getElementById(id);
const status=(msg,error=false)=>{
 $('creatorStatus').textContent=msg;
 $('creatorStatus').style.color=error?'#ffb0ac':'#b9eee8';
};
const viewStatus=msg=>$('creatorViewportStatus').textContent=msg;
const defaults={model:null,loadedPath:'',bones:[],pose:new Map(),chains:[],
 targets:new Map(),currentChain:null,currentBone:null,keys:new Map(),
 playing:false,time:0,duration:4,baseScale:1,modelId:null,
 sourceClip:null,sourceMixer:null,sourceAction:null,sourceId:null,
 modelClips:[],recording:false,handles:[],poles:new Map(),selectedHandle:null,centerHandle:null,
 bindPose:new Map(),sourceLoadToken:0,sourceAnimatedBones:null,plantedFeet:new Map()};
const state=defaults;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x081520);
const camera=new THREE.PerspectiveCamera(45,1,.01,1000);
camera.position.set(3.3,2.3,5.4);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setSize(1,1);
$('creatorCanvas').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xcaffed,0x344a65,2.1));
const keyLight=new THREE.DirectionalLight(0xffffff,2.3);
keyLight.position.set(4,8,6);scene.add(keyLight);
const floor=new THREE.GridHelper(10,20,0x3b9486,0x1e3540);
floor.position.y=.005;scene.add(floor);
const axes=new THREE.AxesHelper(.6);axes.position.set(-2.2,0,-2.2);scene.add(axes);
const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;
orbit.target.set(0,1,0);orbit.update();
const gizmo=new TransformControls(camera,renderer.domElement);
gizmo.setSize(.72);
scene.add(gizmo.getHelper());
gizmo.addEventListener('dragging-changed',e=>orbit.enabled=!e.value);
gizmo.addEventListener('objectChange',()=>{
 if(!state.playing){
  if(state.selectedHandle?.type==='pole')solveIK(state.chains[state.selectedHandle.index]);
  else if(state.selectedHandle?.type==='center')moveCenter();
  else if(state.selectedHandle?.type==='ik')solveIK(state.currentChain);
  recordEditedFrame();
  refreshTargetInputs();
  viewStatus('IK aplicada · pulsa «Guardar pose clave» para conservarla.');
 }
});
// The canvas must be sized in CSS pixels AND in the WebGL drawing buffer.
// setSize(..., false) left Three.js's inline 500px × 500px canvas style intact,
// explaining the small square in the top-left of an otherwise full-sized viewport.
let viewportWidth=0,viewportHeight=0;
function resize(){
 const box=$('creatorCanvas').getBoundingClientRect();
 const width=Math.max(1,Math.floor(box.width));
 const height=Math.max(1,Math.floor(box.height));
 if(!box.width||!box.height)return;
 const dpr=Math.min(window.devicePixelRatio||1,2);
 if(width===viewportWidth&&height===viewportHeight&&renderer.getPixelRatio()===dpr)return;
 viewportWidth=width;viewportHeight=height;
 renderer.setPixelRatio(dpr);
 renderer.setSize(width,height,true);
 renderer.setViewport(0,0,width,height);
 camera.aspect=width/height;
 camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe($('creatorCanvas'));
window.addEventListener('resize',resize);
requestAnimationFrame(resize);
const loader=new GLTFLoader();
let models=[];
function cleanName(name){
 return String(name||'').toLowerCase().replace(/^mixamorig[:_]?/,'')
  .replace(/[^a-z0-9]/g,'');
}
function roleBone(words){
 for(const word of words){
  const result=state.bones.find(b=>cleanName(b.name)===word);
  if(result)return result;
 }
 for(const word of words){
  const result=state.bones.find(b=>cleanName(b.name).endsWith(word));
  if(result)return result;
 }
 return null;
}
function buildChains(){
 const defs=[
  ['Brazo izquierdo',['leftarm','leftupperarm'],['leftforearm','leftlowerarm'],['lefthand','leftwrist']],
  ['Brazo derecho',['rightarm','rightupperarm'],['rightforearm','rightlowerarm'],['righthand','rightwrist']],
  ['Pierna izquierda',['leftupleg','leftthigh'],['leftleg','leftcalf','leftshin'],['leftfoot','leftankle']],
  ['Pierna derecha',['rightupleg','rightthigh'],['rightleg','rightcalf','rightshin'],['rightfoot','rightankle']],
  ['Cadera y torso',['hips','pelvis'],['spine'],['spine1','spine2','chest']],
  ['Torso y cabeza',['spine1','spine2','upperchest'],['neck'],['head']]
 ];
 return defs.map(([label,upper,lower,tip])=>({
  label,upper:roleBone(upper),lower:roleBone(lower),tip:roleBone(tip)
 })).filter(c=>c.upper&&c.lower&&c.tip);
}
function sortedBones(){
 const preferred=[
  ['Cadera',['hips','pelvis','root']],
  ['Torso',['spine','spine1','spine2','chest','upperchest']],
  ['Cuello',['neck']],
  ['Cabeza',['head']],
  ['Brazo izquierdo',['leftarm','leftupperarm']],
  ['Codo izquierdo',['leftforearm','leftlowerarm']],
  ['Muñeca izquierda',['lefthand','leftwrist']],
  ['Brazo derecho',['rightarm','rightupperarm']],
  ['Codo derecho',['rightforearm','rightlowerarm']],
  ['Muñeca derecha',['righthand','rightwrist']],
  ['Muslo izquierdo',['leftupleg','leftthigh']],
  ['Rodilla izquierda',['leftleg','leftcalf']],
  ['Pie izquierdo',['leftfoot']],
  ['Muslo derecho',['rightupleg','rightthigh']],
  ['Rodilla derecha',['rightleg','rightcalf']],
  ['Pie derecho',['rightfoot']]
 ];
 const found=[],seen=new Set();
 for(const [label,candidates] of preferred){
  for(const candidate of candidates){
   const bone=roleBone([candidate]);
   if(bone&&!seen.has(bone.uuid)){
    seen.add(bone.uuid);found.push({label:label+' · '+bone.name,bone});
   }
  }
 }
 for(const bone of state.bones)if(!seen.has(bone.uuid))found.push({label:bone.name,bone});
 return found;
}
function clearTargets(){
 gizmo.detach();
 for(const item of state.targets.values()){
  scene.remove(item);
  item.geometry.dispose();item.material.dispose();
 }
 state.targets.clear();state.currentChain=null;
 for(const h of state.handles){scene.remove(h);h.geometry.dispose();h.material.dispose();}
 state.handles=[];state.poles.clear();state.selectedHandle=null;state.centerHandle=null;state.plantedFeet.clear();
}
function makeTargets(){
 clearTargets();
 const picker=$('creatorChain');picker.replaceChildren();
 const blank=new Option('Selecciona un objetivo IK','');picker.append(blank);
 for(let i=0;i<state.chains.length;i++){
  const chain=state.chains[i];
  chain.tip.updateWorldMatrix(true,false);
  const target=new THREE.Mesh(new THREE.SphereGeometry(.085,16,12),
   new THREE.MeshBasicMaterial({color:i<2?0x00ffe4:i<4?0xd1ff4d:0xffb678,
    depthTest:false,transparent:true,opacity:.94}));
  target.position.copy(chain.tip.getWorldPosition(new THREE.Vector3()));
  target.renderOrder=200;target.userData.rokIKTarget=i;
  scene.add(target);state.targets.set(i,target);
  picker.append(new Option(chain.label,String(i)));
 }
 picker.disabled=!state.chains.length;createDirectHandles();
 if(state.chains.length)selectChain(0);
 else viewStatus('El modelo no contiene cadenas IK reconocibles; puedes rotar sus huesos manualmente.');
}
function selectChain(i){
 if(!Number.isInteger(i)||!state.chains[i]){gizmo.detach();state.currentChain=null;return;}
 state.currentChain=state.chains[i];
 $('creatorChain').value=String(i);
 gizmo.setMode('translate');gizmo.attach(state.targets.get(i));state.selectedHandle={type:'ik',index:i};
 refreshTargetInputs();
 viewStatus('Objetivo IK: '+state.currentChain.label+' · mueve la esfera con las flechas 3D.');
}
function refreshTargetInputs(){
 if(!state.currentChain)return;
 const index=state.chains.indexOf(state.currentChain);
 const target=state.targets.get(index);if(!target)return;
 for(const [axis,id] of [['x','creatorTargetX'],['y','creatorTargetY'],['z','creatorTargetZ']])
  $(id).value=target.position[axis].toFixed(2);
}
function solveIK(chain){
 if(!chain?.upper||!chain.lower||!chain.tip||!state.model)return;
 const idx=state.chains.indexOf(chain),target=state.targets.get(idx);
 if(!target)return;
 state.model.updateMatrixWorld(true);
 // Cyclic coordinate descent, applying each correction in parent-local space.
 // The target is in WORLD coordinates and therefore does not drift during posing.
 for(let pass=0;pass<18;pass++){
  const tipPos=chain.tip.getWorldPosition(new THREE.Vector3());
  if(tipPos.distanceToSquared(target.position)<.00008)break;
  for(const joint of [chain.lower,chain.upper]){
   joint.updateWorldMatrix(true,true);
   const pivot=joint.getWorldPosition(new THREE.Vector3());
   const effector=chain.tip.getWorldPosition(new THREE.Vector3());
   const toward=effector.sub(pivot),desired=target.position.clone().sub(pivot);
   if(toward.lengthSq()<1e-8||desired.lengthSq()<1e-8)continue;
   toward.normalize();desired.normalize();
   const deltaWorld=new THREE.Quaternion().setFromUnitVectors(toward,desired);
   const maxStep=.36,angle=deltaWorld.angleTo(new THREE.Quaternion());
   if(angle>maxStep)deltaWorld.slerp(new THREE.Quaternion(),1-maxStep/angle);
   const parentWorld=joint.parent.getWorldQuaternion(new THREE.Quaternion());
   const localCorrection=parentWorld.clone().invert().multiply(deltaWorld).multiply(parentWorld);
   joint.quaternion.premultiply(localCorrection).normalize();
   joint.updateWorldMatrix(false,true);
  }
 }
 applyPole(chain);refreshBoneInputs();
}
function resetTarget(){
 if(!state.currentChain)return;
 const i=state.chains.indexOf(state.currentChain),target=state.targets.get(i);
 target.position.copy(state.currentChain.tip.getWorldPosition(new THREE.Vector3()));
 refreshTargetInputs();
}
function refreshBoneInputs(){
 const bone=state.currentBone;if(!bone)return;
 const e=new THREE.Euler().setFromQuaternion(bone.quaternion,'XYZ');
 for(const [axis,id] of [['x','creatorRotX'],['y','creatorRotY'],['z','creatorRotZ']])
  $(id).value=(THREE.MathUtils.radToDeg(e[axis])).toFixed(1);
}
function selectBone(uuid){
 const bone=state.bones.find(b=>b.uuid===uuid);
 state.currentBone=bone||null;
 if(bone){$('creatorBone').value=bone.uuid;refreshBoneInputs();}
}
function recordEditedFrame(){
 if(!state.model||state.playing||state.recording)return;
 state.keys.set(Math.round(state.time*30),snapshot());
 refreshTimeline();
}
function snapshot(){
 const pose={};
 for(const bone of state.bones)pose[bone.name]=bone.quaternion.toArray();
 return pose;
}
function applyPose(pose){
 for(const bone of state.bones){
  const q=pose[bone.name];
  if(Array.isArray(q)&&q.length===4&&q.every(Number.isFinite))
   bone.quaternion.fromArray(q).normalize();
 }
 state.model?.updateMatrixWorld(true);syncHandles();refreshBoneInputs();
}
function resetPose(){
 if(!state.model)return;
 for(const bone of state.bones){
  const q=state.pose.get(bone.name);
  if(q)bone.quaternion.copy(q);
 }
 state.model.updateMatrixWorld(true);
 for(const [index,target] of state.targets){
  const tip=state.chains[index]?.tip;
  if(tip)target.position.copy(tip.getWorldPosition(new THREE.Vector3()));
 }
 refreshTargetInputs();refreshBoneInputs();
}
function refreshTimeline(){
 const max=Math.max(1,Math.round(state.duration*30));
 $('creatorTime').max=String(max);
 $('creatorTime').value=String(Math.round(state.time*30));
 $('creatorFrameNumber').textContent=String(Math.round(state.time*30));
 $('creatorLastFrame').textContent=String(max);
 queueTrackUpdate();
 const frames=[...state.keys.keys()].sort((a,b)=>a-b);
 $('creatorKeys').textContent=frames.length?
  frames.length+' poses clave · fotogramas: '+frames.join(', '):
  'Sin poses clave. Coloca el modelo y pulsa «Guardar pose clave».';
}
function sampleFrame(frame){
 if(state.sourceClip&&state.sourceMixer){
  // Always evaluate the ORIGINAL source animation at exactly this frame.
  // Only frames explicitly edited replace that original pose; nothing
  // outside the selected frame is erased or interpolated over.
  for(const bone of state.bones){
   if(state.sourceAnimatedBones?.has(bone.name))continue;
   const rest=state.bindPose.get(bone.name);
   if(rest)bone.quaternion.copy(rest);
  }
  // Scrubbing must work in either direction, even after the last frame.
  state.sourceMixer.setTime(Math.max(0,Math.min(state.sourceClip.duration-.00001,frame/30)));
  const edited=state.keys.get(frame);
  if(edited)applyPose(edited);
  state.model?.updateMatrixWorld(true);
  if(!state.recording){syncHandles();refreshBoneInputs();}
  return;
 }
 if(!state.keys.size)return;
 const frames=[...state.keys.keys()].sort((a,b)=>a-b);
 let lo=frames[0],hi=frames[frames.length-1];
 for(let i=0;i<frames.length;i++){
  if(frames[i]<=frame)lo=frames[i];
  if(frames[i]>=frame){hi=frames[i];break;}
 }
 const left=state.keys.get(lo),right=state.keys.get(hi);
 if(lo===hi){applyPose(left);return;}
 const t=THREE.MathUtils.clamp((frame-lo)/(hi-lo),0,1);
 for(const bone of state.bones){
  const qa=left[bone.name],qb=right[bone.name];
  if(!qa&&!qb)continue;
  const a=new THREE.Quaternion().fromArray(qa||qb);
  const b=new THREE.Quaternion().fromArray(qb||qa);
  bone.quaternion.copy(a.slerp(b,t));
 }
 state.model.updateMatrixWorld(true);syncHandles();refreshBoneInputs();
}
function setFrame(frame,sample=true){
 state.time=THREE.MathUtils.clamp(frame/30,0,state.duration);
 if(sample){
  sampleFrame(Math.round(state.time*30));
  // Anchor IK targets to the limb positions of the CURRENT frame.
  // Otherwise a handle left at the previous frame will drag unexpectedly.
  if(!state.playing)for(const [index,target] of state.targets){
   const tip=state.chains[index]?.tip;
   if(tip)target.position.copy(tip.getWorldPosition(new THREE.Vector3()));
  }
  syncHandles();refreshTargetInputs();
 }
 refreshTimeline();
}
function download(data,filename,type){
 const url=URL.createObjectURL(new Blob([data],{type}));
 const a=document.createElement('a');a.href=url;a.download=filename;
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function safeFilename(name){return String(name||'animacion').trim().replace(/[^a-z0-9áéíóúüñ_-]+/gi,'_').slice(0,64)||'animacion';}
function serialize(){
 return {schemaVersion:2,kind:'ROK_AnimationCreator',modelId:state.modelId,
  sourceId:state.sourceId,
  modelPath:state.loadedPath,name:$('creatorName').value,
  fps:30,duration:state.duration,
  keyframes:[...state.keys.entries()].sort((a,b)=>a[0]-b[0])
   .map(([frame,pose])=>({frame,pose}))};
}
function createClip(){
 const frames=[...state.keys.keys()].sort((a,b)=>a-b);
 if(!state.sourceClip&&frames.length<2)
  throw Error('Para exportar desde una pose, guarda al menos dos fotogramas clave.');
 if(!state.sourceClip&&!frames.length)throw Error('Guarda una pose clave.');
 const tracks=[];
 if(state.sourceClip){
  // Dense 30 FPS quaternion bake: every unedited frame is evaluated from
  // the original animation; edited frames are replaced individually.
  const count=Math.max(2,Math.round(state.duration*30)+1);
  if(count>3601)throw Error('Animación demasiado larga para el editor.');
  const savedFrame=Math.round(state.time*30);
  const times=Array.from({length:count},(_,i)=>i/30);
  const perBone=new Map(state.bones.map(b=>[b.name,[]]));
  state.recording=true;
  try{
   for(let frame=0;frame<count;frame++){
    sampleFrame(frame);
    for(const bone of state.bones)perBone.get(bone.name).push(...bone.quaternion.toArray());
   }
  }finally{
   state.recording=false;
   sampleFrame(savedFrame);
   // sampleFrame(savedFrame) is the correct active visual pose.
  }
  for(const bone of state.bones){
   tracks.push(new THREE.QuaternionKeyframeTrack(
    bone.name+'.quaternion',times,perBone.get(bone.name)));
  }
  // Keep the source's position/scale channels (notably hips vertical motion).
  for(const track of state.sourceClip.tracks){
   if(/\.(position|scale)$/.test(track.name))tracks.push(track.clone());
  }
 }else{
  const times=frames.map(f=>f/30);
  for(const bone of state.bones){
   const values=[];
   for(const frame of frames){
    const q=state.keys.get(frame)[bone.name]||state.pose.get(bone.name).toArray();
    values.push(...q);
   }
   tracks.push(new THREE.QuaternionKeyframeTrack(bone.name+'.quaternion',times,values));
  }
 }
 const clip=new THREE.AnimationClip($('creatorName').value||'ROK Animation',-1,tracks);
 clip.resetDuration();
 return clip;
}
async function initializeTPose(){
 if(!state.model||!state.bones.length)return false;
 try{
  const source={kind:'fbx',id:'37',path:
   'assets/animations/casters/shared/T-Pose.fbx',name:'T-Pose'};
  const clip=await loadCreatorClip(source,state.model);
  const mixer=new THREE.AnimationMixer(state.model);
  const action=mixer.clipAction(clip);action.play();mixer.setTime(0);
  const pose=state.bones.map(b=>({bone:b,quaternion:b.quaternion.clone()}));
  mixer.stopAllAction();
  for(const {bone,quaternion} of pose)bone.quaternion.copy(quaternion);
  state.model.updateMatrixWorld(true);
  for(const {bone} of pose)state.pose.set(bone.name,bone.quaternion.clone());
  return true;
 }catch(error){
  // Non-Mixamo rigs remain safely in their GLB bind pose.
  return false;
 }
}
async function loadModel(item){
 if(!item)return;
 state.playing=false;$('creatorPlay').textContent='▶ Reproducir';
 clearTargets();
 if(state.model){scene.remove(state.model);state.model=null;}
 state.keys.clear();state.bones=[];state.pose.clear();state.bindPose.clear();state.currentBone=null;
 state.sourceLoadToken++;state.sourceAnimatedBones=null;
 state.sourceClip=null;state.sourceMixer=null;state.sourceAction=null;state.sourceId=null;
 status('Descargando '+item.name+'…');
 const url='./'+item.path.split('/').map(encodeURIComponent).join('/');
 try{
  const gltf=await loader.loadAsync(url);
  const model=gltf.scene;
  state.modelClips=gltf.animations||[];
  model.traverse(o=>{if(o.isSkinnedMesh||o.isMesh)o.frustumCulled=false;});
  const box=new THREE.Box3().setFromObject(model);
  const size=box.getSize(new THREE.Vector3()),height=Math.max(.01,size.y);
  const scale=2.1/height;
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  const scaled=new THREE.Box3().setFromObject(model);
  const center=scaled.getCenter(new THREE.Vector3());
  model.position.x-=center.x;model.position.z-=center.z;model.position.y-=scaled.min.y;
  scene.add(model);model.updateMatrixWorld(true);
  state.model=model;state.modelId=item.id;state.loadedPath=item.path;state.baseScale=scale;
  state.bones=[];model.traverse(o=>{if(o.isBone)state.bones.push(o);});
  if(!state.bones.length)throw Error('El modelo GLB no tiene huesos para editar.');
  const seen=new Set();
  for(const b of state.bones)if(seen.has(b.name))throw Error('El rig tiene nombres de hueso duplicados: '+b.name);
  else seen.add(b.name);
  for(const bone of state.bones){state.pose.set(bone.name,bone.quaternion.clone());state.bindPose.set(bone.name,bone.quaternion.clone());}
  const usedTPose=await initializeTPose();
  state.chains=buildChains();
  const boneSelect=$('creatorBone');boneSelect.replaceChildren();
  const available=sortedBones();
  for(const {label,bone} of available)boneSelect.append(new Option(label,bone.uuid));
  if(available.length)selectBone(available[0].bone.uuid);
  makeTargets();frameModel();
  populateSources();
  state.time=0;state.duration=4;$('creatorDuration').value='4';refreshTimeline();
  status('✓ '+item.name+' · '+state.bones.length+' huesos · '+state.chains.length+
   ' cadenas IK · '+(usedTPose?'T-Pose':'pose de rig')+
   '. Puedes cargar una animación existente.');
  viewStatus('Selecciona una cadena IK y mueve su objetivo para editar la pose.');
 }catch(error){
  if(state.model){scene.remove(state.model);state.model=null;}
  clearTargets();status('Error al cargar: '+error.message,true);
  viewStatus('No se pudo cargar un rig compatible.');throw error;
 }
}
function frameModel(){
 if(!state.model)return;
 const box=new THREE.Box3().setFromObject(state.model);
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const extent=Math.max(size.x,size.y,size.z,1);
 orbit.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(extent*.9,extent*.6,extent*1.9));
 camera.near=Math.max(.001,extent/1000);camera.far=extent*100;camera.updateProjectionMatrix();orbit.update();
}
const QUEUE_KEY='ROK_ANIMATION_CREATOR_QUEUE_V1';
let creatorSources=[];
function populateSources(){
 creatorSources=[
  ...state.modelClips.filter(clip=>clip?.tracks?.length).map((clip,i)=>({
   id:'glb:'+i,name:'GLB · '+(clip.name||'Animación '+(i+1)),
   kind:'glb',clip
  })),
  ...originalSources.map(item=>({...item,id:'archive:'+item.id})),
  ...numberedSources.map(item=>({...item,id:'fbx:'+item.id,kind:'fbx'})),
  ...newSources.map(item=>({...item,id:'fbx:'+item.id,kind:'fbx'})),
  ...compositeSources.map(item=>({...item,id:'composite:'+item.id}))
 ];
 const select=$('creatorSource');
 select.replaceChildren(new Option('Pose inicial / T-pose',''));
 for(const item of creatorSources)select.append(new Option(item.name,item.id));
 select.value='';state.sourceId=null;
 renderQueue();
}
function resetSource(){
 state.sourceLoadToken++;state.sourceAnimatedBones=null;
 state.playing=false;$('creatorPlay').textContent='▶ Reproducir';
 state.sourceMixer?.stopAllAction();
 state.sourceMixer=null;state.sourceClip=null;state.sourceAction=null;state.sourceId=null;
 state.keys.clear();state.duration=4;$('creatorDuration').value='4';
 if(state.model)resetPose();
 setFrame(0,false);refreshTimeline();
 $('creatorSource').value='';
 status('Pose inicial preparada; también puedes cargar T-Pose.fbx o una animación existente.');
}
async function loadSource(id){
 if(!state.model)throw Error('Primero debes cargar un modelo.');
 const loadToken=++state.sourceLoadToken,modelAtStart=state.model;
 const source=creatorSources.find(x=>x.id===id);
 if(!source){resetSource();return;}
 state.playing=false;$('creatorPlay').textContent='▶ Reproducir';
 status('Adaptando '+source.name+' al esqueleto…');
 const clip=await loadCreatorClip(source,state.model);
 if(loadToken!==state.sourceLoadToken||modelAtStart!==state.model)return;
 if(!clip?.tracks?.length||clip.duration<=0)throw Error('Animación vacía o incompatible.');
 const matched=clip.tracks.filter(t=>state.bones.some(b=>t.name===b.name+'.quaternion'||t.name===b.name+'.position'||t.name===b.name+'.scale'));
 if(matched.length<4)throw Error('El clip no tiene pistas compatibles con el esqueleto cargado ('+matched.length+'/'+clip.tracks.length+').');
 state.sourceMixer?.stopAllAction();
 for(const bone of state.bones){const bind=state.bindPose.get(bone.name);if(bind)bone.quaternion.copy(bind);}
 state.model.updateMatrixWorld(true);
 state.sourceAnimatedBones=new Set(matched.map(t=>t.name.slice(0,t.name.lastIndexOf('.'))));
 // The original action plays ONLY inside this editor. No repository changes.
 const mixer=new THREE.AnimationMixer(state.model);
 const action=mixer.clipAction(clip);
 action.setLoop(THREE.LoopRepeat,Infinity);
 action.clampWhenFinished=false;
 action.play();mixer.setTime(0);
 state.sourceClip=clip;state.sourceMixer=mixer;state.sourceAction=action;
 state.sourceId=id;state.duration=Math.ceil(clip.duration*30)/30;
 state.keys.clear();
 $('creatorDuration').value=String(state.duration);
 setFrame(0);refreshTimeline();
 $('creatorName').value=source.name.replace(/^\\d+\\s*·\\s*/,'').replace(/^GLB · /,'')+' · editada';
 status('✓ '+source.name+' · '+matched.length+' pistas vinculadas · '+(Math.round(state.duration*30)+1)+
  ' fotogramas. Reproduciendo referencia.');
 state.playing=true;$('creatorPlay').textContent='Ⅱ Pausar';gizmo.detach();
}
function readQueue(){
 try{
  const data=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');
  return Array.isArray(data)?data.filter(x=>x?.kind==='ROK_AnimationCreator'):[];}
 catch{return [];}
}
function renderQueue(){
 const parent=$('creatorQueue');parent.replaceChildren();
 const queue=readQueue().filter(x=>x.modelId===state.modelId);
 if(!queue.length){
  const empty=document.createElement('p');
  empty.className='creatorNote';empty.textContent='Todavía no hay animaciones editadas en este navegador.';
  parent.append(empty);return;
 }
 for(const item of queue){
  const row=document.createElement('div');
  row.className='creatorQueueItem '+(item.mode==='replace'?'creatorReplacement':'creatorOriginal');
  const title=document.createElement('span');
  title.textContent=(item.mode==='replace'?'↻ ':'✦ ')+item.name;
  const badge=document.createElement('small');
  badge.textContent=item.mode==='replace'?'Versión reemplazada':'Nueva';
  const button=document.createElement('button');
  button.textContent='Abrir';button.type='button';
  button.addEventListener('click',()=>applyProject(item));
  row.append(title,badge,button);parent.append(row);
 }
}
async function applyProject(data){
 const item=models.find(m=>m.id===data.modelId&&m.path===data.modelPath);
 if(!item)throw Error('Modelo del proyecto no disponible.');
 if(!state.model||state.modelId!==item.id)await loadModel(item);
 const sourceId=data.sourceId||null;
 if(sourceId){
  $('creatorSource').value=sourceId;await loadSource(sourceId);
 }else resetSource();
 state.duration=THREE.MathUtils.clamp(Number(data.duration)||4,.5,120);
 $('creatorDuration').value=String(state.duration);
 $('creatorName').value=String(data.name||'Mi animación R.O.K.').slice(0,90);
 state.keys.clear();
 for(const record of data.keyframes||[]){
  const frame=Number(record.frame);
  if(!Number.isInteger(frame)||frame<0||frame>Math.round(state.duration*30)||
    !record.pose||typeof record.pose!=='object')continue;
  const pose={};
  for(const bone of state.bones){
   const q=record.pose[bone.name];
   if(Array.isArray(q)&&q.length===4&&q.every(Number.isFinite))
    pose[bone.name]=q;
  }
  state.keys.set(frame,pose);
 }
 setFrame(0);renderQueue();
 status('Proyecto recuperado · '+state.keys.size+' fotogramas modificados.');
}
$('creatorLoadSource').addEventListener('click',async()=>{
 const button=$('creatorLoadSource');button.disabled=true;
 try{await loadSource($('creatorSource').value);}
 catch(error){status('No se pudo cargar: '+error.message,true);}
 finally{button.disabled=false;}
});
$('creatorNoSource').addEventListener('click',resetSource);
$('creatorSource').addEventListener('change',async e=>{
 if(!state.model)return;
 const button=$('creatorLoadSource');button.disabled=true;
 try{await loadSource(e.target.value);}catch(error){status('Animación incompatible: '+error.message,true);}
 finally{button.disabled=false;}
});
$('creatorCommit').addEventListener('click',()=>{
 if(!state.model){status('Primero carga un personaje.',true);return;}
 const mode=$('creatorSaveMode').value;
 if(mode==='replace'&&!state.sourceId){
  status('Selecciona una animación existente para crear su versión reemplazada.',true);return;
 }
 let name=$('creatorName').value.trim();
 if(mode==='new'){
  const entered=window.prompt('Nombre de la nueva animación:',name||'Nueva animación R.O.K.');
  if(entered===null)return;
  name=entered.trim();
  if(!name){status('Debes escribir el nombre de la nueva animación.',true);return;}
 }else{
  const confirmed=window.confirm('¿Reemplazar la versión EDITADA de esta animación en tu cola local? El archivo original de GitHub se conservará.');
  if(!confirmed)return;
 }
 $('creatorName').value=name;
 const entry={...serialize(),name,mode,kind:'ROK_AnimationCreator',
  entryId:mode==='replace'?'override:'+state.modelId+':'+state.sourceId:
   'new:'+state.modelId+':'+Date.now()};
 const queue=readQueue().filter(x=>x.entryId!==entry.entryId);
 queue.push(entry);
 try{localStorage.setItem(QUEUE_KEY,JSON.stringify(queue));}
 catch(error){status('No se pudo guardar cola: '+error.message,true);return;}
 renderQueue();
 status(mode==='new'?'✓ Animación nueva añadida a la cola.':
  '✓ Versión editada reemplazada en la cola local, sin tocar GitHub.');
});

async function fillModels(){
 try{
  const response=await fetch('./assets/manifests/model-library.json',{cache:'no-cache'});
  if(!response.ok)throw Error('Catálogo HTTP '+response.status);
  const manifest=await response.json();
  models=(manifest.models||[]).filter(x=>x.category==='caster'&&x.path?.endsWith('.glb'));
  const select=$('creatorModel');select.replaceChildren();
  for(const m of models)select.append(new Option(m.name,m.id));
  if(!models.length)throw Error('No hay personajes GLB en el catálogo.');
  const pref=models.find(m=>m.id==='caster-chiara')||models[0];
  select.value=pref.id;
  status(models.length+' personajes disponibles. Cargando modelo inicial…');
  await loadModel(pref);
 }catch(error){status('No se pudo leer biblioteca: '+error.message,true);}
}
$('creatorLoad').addEventListener('click',async()=>{
 $('creatorLoad').disabled=true;
 try{await loadModel(models.find(m=>m.id===$('creatorModel').value));}
 catch{}finally{$('creatorLoad').disabled=false;}
});
$('creatorFrame').addEventListener('click',frameModel);
$('creatorChain').addEventListener('change',e=>selectChain(Number(e.target.value)));
for(const [axis,id] of [['x','creatorTargetX'],['y','creatorTargetY'],['z','creatorTargetZ']])
 $(id).addEventListener('change',e=>{
  if(!state.currentChain)return;
  const target=state.targets.get(state.chains.indexOf(state.currentChain));
  const value=Number(e.target.value);if(!Number.isFinite(value))return;
  target.position[axis]=value;solveIK(state.currentChain);
  recordEditedFrame();refreshTargetInputs();
 });
$('creatorSolve').addEventListener('click',()=>solveIK(state.currentChain));
$('creatorResetTarget').addEventListener('click',resetTarget);
$('creatorBone').addEventListener('change',e=>selectBone(e.target.value));
for(const id of ['creatorRotX','creatorRotY','creatorRotZ'])
 $(id).addEventListener('change',()=>{
  const bone=state.currentBone;if(!bone||state.playing)return;
  const x=Number($('creatorRotX').value),y=Number($('creatorRotY').value),z=Number($('creatorRotZ').value);
  if(![x,y,z].every(Number.isFinite))return;
  bone.rotation.set(THREE.MathUtils.degToRad(x),THREE.MathUtils.degToRad(y),
   THREE.MathUtils.degToRad(z),'XYZ');
  state.model.updateMatrixWorld(true);
  recordEditedFrame();
  viewStatus('Rotación aplicada a '+bone.name+' · fotograma '+Math.round(state.time*30)+' guardado.');
 });
$('creatorResetBone').addEventListener('click',()=>{
 const bone=state.currentBone;if(!bone)return;
 bone.quaternion.copy(state.pose.get(bone.name));refreshBoneInputs();recordEditedFrame();
});
$('creatorResetPose').addEventListener('click',resetPose);
$('creatorDuration').addEventListener('change',e=>{
 const duration=THREE.MathUtils.clamp(Number(e.target.value)||4,.5,120);
 state.duration=duration;e.target.value=String(duration);setFrame(Math.round(state.time*30),false);
});
$('creatorTime').addEventListener('input',e=>{
 state.playing=false;$('creatorPlay').textContent='▶ Reproducir';
 setFrame(Number(e.target.value));
});
$('creatorKey').addEventListener('click',()=>{
 if(!state.model){status('Carga un modelo antes de crear poses.',true);return;}
 state.playing=false;$('creatorPlay').textContent='▶ Reproducir';
 state.keys.set(Math.round(state.time*30),snapshot());
 refreshTimeline();status('Pose clave guardada en fotograma '+Math.round(state.time*30));
});
$('creatorDeleteKey').addEventListener('click',()=>{
 state.keys.delete(Math.round(state.time*30));refreshTimeline();
});
$('creatorPlay').addEventListener('click',()=>{
 if(!state.model||(!state.keys.size&&!state.sourceClip)){status('Carga una animación o guarda poses clave antes de reproducir.',true);return;}
 state.playing=!state.playing;
 if(state.time>=state.duration)state.time=0;
 if(state.playing)gizmo.detach();
 else if(state.currentChain)selectChain(state.chains.indexOf(state.currentChain));
 $('creatorPlay').textContent=state.playing?'Ⅱ Pausar':'▶ Reproducir';
});
$('creatorStop').addEventListener('click',()=>{
 state.playing=false;setFrame(0);
 $('creatorPlay').textContent='▶ Reproducir';
 if(state.currentChain)selectChain(state.chains.indexOf(state.currentChain));
});
$('creatorExportJson').addEventListener('click',()=>{
 if(!state.model){status('Carga un modelo antes de guardar.',true);return;}
 const data=serialize();
 download(JSON.stringify(data,null,2),safeFilename(data.name)+'.rok-animation.json','application/json');
 status('Proyecto JSON guardado · original GLB intacto.');
});
$('creatorImport').addEventListener('click',()=>$('creatorImportFile').click());
$('creatorImportFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  if(file.size>5000000)throw Error('Proyecto mayor de 5 MB.');
  const data=JSON.parse(await file.text());
  if(![1,2].includes(data.schemaVersion)||data.kind!=='ROK_AnimationCreator'||
    !Array.isArray(data.keyframes)||data.keyframes.length>3600)
   throw Error('Proyecto JSON incompatible.');
  await applyProject(data);
  status('Proyecto abierto: '+state.keys.size+' fotogramas editados.');
 }catch(error){status('No se pudo importar: '+error.message,true);}
});
$('creatorExportGlb').addEventListener('click',async()=>{
 if(!state.model){status('Primero carga un personaje.',true);return;}
 const button=$('creatorExportGlb');button.disabled=true;state.playing=false;
 try{
  const clip=createClip();
  // GLTFExporter is run on the current model but no edits reach GitHub.
  // The animation owns quaternion tracks and uses normal glTF skeleton nodes.
  const exporter=new GLTFExporter();
  status('Generando GLB con '+clip.tracks.length+' pistas…');
  const glb=await exporter.parseAsync(state.model,{
   binary:true,animations:[clip],trs:true,onlyVisible:false,maxTextureSize:2048
  });
  download(glb,safeFilename($('creatorName').value)+'.glb','model/gltf-binary');
  status('✓ GLB animado descargado. Modelos originales sin cambios.');
 }catch(error){status('No se pudo exportar GLB: '+error.message,true);}
 finally{button.disabled=false;}
});


const directRay=new THREE.Raycaster(),directVec=new THREE.Vector2();
function handle(radius,color,data){
 const h=new THREE.Mesh(new THREE.SphereGeometry(radius,14,12),
  new THREE.MeshBasicMaterial({color,depthTest:false,transparent:true,opacity:.9}));
 h.userData.control=data;h.renderOrder=250;state.handles.push(h);scene.add(h);return h;
}
function createDirectHandles(){
 for(const bone of state.bones){
  const n=cleanName(bone.name);
  if(/finger|toe|twist|helper/.test(n))continue;
  if(!/hips|pelvis|spine|chest|head|neck|arm|forearm|hand|wrist|upleg|thigh|calf|shin|foot/.test(n))continue;
  handle(.055,/hand|wrist/.test(n)?0xff9bd4:0x85b2ff,{type:'bone',bone});
 }
 // Pole controls orient the plane of elbow and knee bending.
 for(let i=0;i<state.chains.length;i++){
  const c=state.chains[i];if(!/Brazo|Pierna/.test(c.label))continue;
  const elbow=c.lower.getWorldPosition(new THREE.Vector3());
  const root=c.upper.getWorldPosition(new THREE.Vector3());
  const tip=c.tip.getWorldPosition(new THREE.Vector3());
  const direction=elbow.clone().sub(root.clone().add(tip).multiplyScalar(.5));
  if(direction.lengthSq()<.00001)direction.set(0,0,/Brazo/.test(c.label)?-1:1);
  const pole=handle(.075,/Brazo/.test(c.label)?0xffae5b:0xdfee66,{type:'pole',index:i});
  pole.position.copy(elbow).addScaledVector(direction.normalize(),.5);state.poles.set(i,pole);
 }
 const hips=roleBone(['hips','pelvis']);
 if(hips){state.centerHandle=handle(.12,0xff60b4,{type:'center'});
  state.centerHandle.position.copy(hips.getWorldPosition(new THREE.Vector3()));}
 syncHandles();
}
function syncHandles(){
 if(!state.model)return;state.model.updateMatrixWorld(true);
 for(const h of state.handles){
  if(h.userData.control.type==='bone')
   h.position.copy(h.userData.control.bone.getWorldPosition(new THREE.Vector3()));
  else if(h.userData.control.type==='center'&&!gizmo.dragging){
   const hips=roleBone(['hips','pelvis']);
   if(hips)h.position.copy(hips.getWorldPosition(new THREE.Vector3()));
  }
 }
}
function applyPole(chain){
 const p=state.poles.get(state.chains.indexOf(chain));if(!p)return;
 state.model.updateMatrixWorld(true);
 const root=chain.upper.getWorldPosition(new THREE.Vector3());
 const elbow=chain.lower.getWorldPosition(new THREE.Vector3());
 const axis=chain.tip.getWorldPosition(new THREE.Vector3()).sub(root).normalize();
 const project=v=>v.sub(axis.clone().multiplyScalar(v.dot(axis)));
 const a=project(elbow.sub(root)),b=project(p.position.clone().sub(root));
 if(a.lengthSq()<1e-9||b.lengthSq()<1e-9)return;
 a.normalize();b.normalize();
 const angle=Math.atan2(axis.dot(new THREE.Vector3().crossVectors(a,b)),a.dot(b));
 const parent=chain.upper.parent.getWorldQuaternion(new THREE.Quaternion());
 const q=new THREE.Quaternion().setFromAxisAngle(axis,angle);
 chain.upper.quaternion.premultiply(parent.clone().invert().multiply(q).multiply(parent)).normalize();
 state.model.updateMatrixWorld(true);
}
function moveCenter(){
 const hips=roleBone(['hips','pelvis']),h=state.centerHandle;
 if(!hips||!h||!state.previousCenter)return;
 const delta=h.position.clone().sub(state.previousCenter);state.previousCenter.copy(h.position);
 const p=hips.parent;
 const local=delta.clone().applyQuaternion(p.getWorldQuaternion(new THREE.Quaternion()).invert())
  .divide(p.getWorldScale(new THREE.Vector3()));
 hips.position.add(local);state.model.updateMatrixWorld(true);
 // Plant feet when going down; lift the pelvis and feet when going upward.
 for(let i=0;i<state.chains.length;i++){
  const c=state.chains[i];if(!/Pierna/.test(c.label))continue;
  const target=state.targets.get(i);if(!target)continue;
  const planted=state.plantedFeet.get(i);
  if(planted)target.position.copy(planted);
  target.position.y=Math.max(0,target.position.y);
  solveIK(c);
 }
}
function activateHandle(info,obj){
 state.selectedHandle=info;
 if(info.type==='ik'){selectChain(info.index);return;}
 if(info.type==='bone'){
  selectBone(info.bone.uuid);gizmo.setMode('rotate');gizmo.attach(info.bone);
  viewStatus('Hueso '+info.bone.name+' · R: rotar');
 }else if(info.type==='pole'){
  state.currentChain=state.chains[info.index];
  gizmo.setMode('translate');gizmo.attach(obj);
  viewStatus('Pole target: arrastra para orientar la flexión.');
 }else if(info.type==='center'){
  gizmo.setMode('translate');gizmo.attach(obj);
  state.previousCenter=obj.position.clone();
  for(let i=0;i<state.chains.length;i++)if(/Pierna/.test(state.chains[i].label)){
   const c=state.chains[i],t=state.targets.get(i);
   if(t){t.position.copy(c.tip.getWorldPosition(new THREE.Vector3()));
    t.position.y=Math.max(0,t.position.y);
    state.plantedFeet.set(i,t.position.clone());}
  }
  viewStatus('Centro de gravedad · pies fijados al bajar.');
 }
}
renderer.domElement.addEventListener('pointerup',e=>{
 if(!state.model||state.playing)return;
 const rect=renderer.domElement.getBoundingClientRect();
 directVec.set(2*(e.clientX-rect.left)/rect.width-1,1-2*(e.clientY-rect.top)/rect.height);
 directRay.setFromCamera(directVec,camera);
 const hit=directRay.intersectObjects(state.handles,false)[0];
 if(hit)activateHandle(hit.object.userData.control,hit.object);
});

/* v0.3: visible per-bone keyframe tracks and direct interactive IK targets */
const pickRay=new THREE.Raycaster(),pickVec=new THREE.Vector2();
let activeTimelineKey=null,tracksPending=false;
function updateTracks(){
 const host=$('creatorTracks');host.replaceChildren();
 if(!state.model)return;
 const max=Math.max(1,Math.round(state.duration*30));
 $('creatorTrackInfo').textContent='Fotograma '+Math.round(state.time*30)+' / '+max;
 for(const {bone,label} of sortedBones()){
  const row=document.createElement('div');row.className='creatorTrackRow';
  const title=document.createElement('div');title.className='creatorTrackLabel'+(state.currentBone===bone?' active':'');
  title.textContent=label;
  title.onclick=()=>{selectBone(bone.uuid);queueTrackUpdate();};
  const lane=document.createElement('div');lane.className='creatorTrackLane';
  lane.onclick=e=>{const r=lane.getBoundingClientRect();setFrame(Math.round(THREE.MathUtils.clamp((e.clientX-r.left)/r.width,0,1)*max));};
  const changed=new Set([...state.keys.entries()].filter(([,p])=>p[bone.name]).map(([f])=>f));
  const source=new Set();
  for(const tr of state.sourceClip?.tracks||[]){
   if(!tr.name.includes(bone.name+'.'))continue;
   const step=Math.max(1,Math.ceil(tr.times.length/100));
   for(let j=0;j<tr.times.length;j+=step)source.add(Math.round(tr.times[j]*30));
  }
  for(const frame of [...new Set([...source,...changed])].sort((a,b)=>a-b)){
   const original=!changed.has(frame);
   const k=document.createElement('button');k.type='button';
   k.className='creatorTrackKey'+(original?' source':'')+
    (activeTimelineKey?.bone===bone.name&&activeTimelineKey.frame===frame?' selected':'');
   k.style.left=(100*Math.min(1,frame/max))+'%';
   k.title=bone.name+' · fotograma '+frame;
   k.onclick=e=>{e.stopPropagation();activeTimelineKey={bone:bone.name,frame,original};
    setFrame(frame);selectBone(bone.uuid);queueTrackUpdate();};
   lane.appendChild(k);
  }
  row.append(title,lane);host.append(row);
 }
}
function queueTrackUpdate(){
 if(tracksPending)return;tracksPending=true;
 requestAnimationFrame(()=>{tracksPending=false;updateTracks();});
}
$('creatorTrackDelete').onclick=()=>{
 if(!activeTimelineKey||activeTimelineKey.original){status('Selecciona un rombo editado para eliminar su clave.',true);return;}
 const {bone,frame}=activeTimelineKey,pose=state.keys.get(frame);if(!pose)return;
 delete pose[bone];if(!Object.keys(pose).length)state.keys.delete(frame);
 activeTimelineKey=null;setFrame(frame);queueTrackUpdate();
 status('Clave eliminada de '+bone+' en fotograma '+frame);
};
$('creatorTogglePanel').onclick=()=>{
 const shell=document.querySelector('.creatorShell');
 const closed=shell.classList.toggle('panelHidden');
 $('creatorTogglePanel').textContent=closed?'☰ Herramientas':'✕ Ocultar panel';resize();
};
let pointerDown=null;
renderer.domElement.addEventListener('pointerdown',e=>{pointerDown=[e.clientX,e.clientY]});
renderer.domElement.addEventListener('pointerup',e=>{
 if(!pointerDown||Math.hypot(e.clientX-pointerDown[0],e.clientY-pointerDown[1])>5){pointerDown=null;return;}
 pointerDown=null;const r=renderer.domElement.getBoundingClientRect();
 pickVec.set(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height);
 pickRay.setFromCamera(pickVec,camera);
 const hit=pickRay.intersectObjects([...state.targets.values()],false)[0];
 if(hit&&Number.isInteger(hit.object.userData.rokIKTarget))activateHandle({type:'ik',index:hit.object.userData.rokIKTarget},hit.object);
});
document.addEventListener('keydown',e=>{
 if(e.key.toLowerCase()!=='r'||!state.currentBone||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
 e.preventDefault();gizmo.setMode('rotate');gizmo.attach(state.currentBone);state.selectedHandle={type:'bone',bone:state.currentBone};
});
let last=0;
function render(now){
 requestAnimationFrame(render);
 const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 if(state.playing&&(state.keys.size||state.sourceClip)){
  state.time=Math.min(state.duration,state.time+dt);
  sampleFrame(Math.round(state.time*30));
  refreshTimeline();
  if(state.time>=state.duration){
   state.playing=false;$('creatorPlay').textContent='▶ Reproducir';
   if(state.currentChain)selectChain(state.chains.indexOf(state.currentChain));
  }
 }
 // Catch delayed layout changes and browser zoom without relying on a stale canvas size.
 const viewRect=$('creatorCanvas').getBoundingClientRect();
 if(viewRect.width>1&&viewRect.height>1&&
  (Math.abs(viewRect.width-viewportWidth)>1||Math.abs(viewRect.height-viewportHeight)>1))resize();
 orbit.update();renderer.render(scene,camera);
}
requestAnimationFrame(render);
fillModels();
