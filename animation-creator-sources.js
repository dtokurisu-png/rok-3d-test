/* The animation creator shares the original numbered FBX paths, but
 * retargeting happens on temporary rigs; repo source clips are never edited. */
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {clone as cloneSkinned,retargetClip} from 'three/addons/utils/SkeletonUtils.js';
import {COMPOSITE_PRESETS,COMPOSITE_MOTION_IDS,buildCasterCompositeClip} from './viewer-caster-composites.js';

const SHARED='assets/animations/casters/shared/';
export const compositeSources=COMPOSITE_PRESETS.map(p=>({id:p.index,name:p.name,kind:'composite',preset:p}));
export const numberedSources=[
 {id:15,name:'15 · Desplazamiento lateral izquierdo',path:SHARED+'Right Strafe.fbx'},
 {id:16,name:'16 · Desplazamiento lateral derecho',path:SHARED+'Right Strafe (1).fbx'},
 {id:21,name:'21 · Lanzamiento de hechizo',path:SHARED+'Standing 1H Cast Spell 01.fbx'},
 {id:22,name:'22 · Preparación de hechizo',path:SHARED+'Standing 2H Magic Area Attack 02 (1).fbx'},
 {id:23,name:'23 · Defensa con escudo',path:SHARED+'Sword And Shield Impact.fbx'},
 {id:'idle',name:'Standing Idle · Reposo',path:SHARED+'Standing Idle.fbx'}
];
export const newSources=[
 {id:34,name:'34 · Catwalk Walk Forward HighKnees',path:SHARED+'Catwalk Walk Forward HighKnees.fbx'},
 {id:35,name:'35 · Idle (1)',path:SHARED+'Idle (1).fbx'},
 {id:36,name:'36 · Male Dynamic Pose',path:SHARED+'Male Dynamic Pose.fbx'},
 {id:37,name:'37 · T-Pose',path:SHARED+'T-Pose.fbx'}
];
export const originalSources=[
 'Stable Sword Outward Slash.fbx','Magic Heal.fbx','Frisbee Throw.fbx',
 'Running Backward Arc (1).fbx','Running Backward Arc.fbx',
 'Running Backward.fbx','Running.fbx','Sword And Shield Death.fbx',
 'Standing React Small From Headshot.fbx','Standing Aim Recoil.fbx',
 'Idle.fbx','Walk W_ Briefcase.fbx','Standing.fbx',
 'Standing 2H Magic Area Attack 01.fbx'
].map((name,index)=>({
 id:index+1,name:String(index+1).padStart(2,'0')+' · '+name.replace(/\.fbx$/,''),
 file:name,kind:'archive'
}));
let archivePromise=null;
async function loadOriginalArchive(){
 if(!archivePromise)archivePromise=(async()=>{
  if(!window.JSZip)throw Error('JSZip no está disponible; recarga el creador.');
  const response=await fetch('./assets/animations/casters/farolera/ROK_PUBLICAR_ANIMACIONES.zip');
  if(!response.ok)throw Error('No se pudo descargar el paquete original.');
  const outer=await window.JSZip.loadAsync(await response.arrayBuffer());
  const nested=Object.values(outer.files).find(item=>!item.dir&&
   item.name.split('/').pop()==='Farolera_Mixamo_14_animaciones.zip');
  return nested?window.JSZip.loadAsync(await nested.async('arraybuffer')):outer;
 })().catch(error=>{archivePromise=null;throw error;});
 return archivePromise;
}
const FBX=new FBXLoader();
const norm=name=>String(name||'').toLowerCase().replace(/^mixamorig[:_]?/,'').replace(/[^a-z0-9]/g,'');
function rigSkeleton(root){
 let skeleton=null;
 root.traverse(o=>{if(o.isSkinnedMesh&&o.skeleton?.bones?.length&&!skeleton)skeleton=o.skeleton;});
 return skeleton;
}
export async function loadCreatorClip(source,model){
 if(source.kind==='composite'){
  const preset=source.preset;
  const getById=id=>originalSources.find(item=>item.id===id)||
   numberedSources.find(item=>item.id===id);
  const motionId=preset.motion==='idle'?'idle':COMPOSITE_MOTION_IDS[preset.motion];
  const movement=await loadCreatorClip(getById(motionId),model);
  const action=await loadCreatorClip(getById(preset.source),model);
  const idle=motionId==='idle'?movement:await loadCreatorClip(getById('idle'),model);
  return buildCasterCompositeClip(THREE,{preset,motionClip:movement,actionClip:action,idleClip:idle,fps:30});
 }
 if(source.kind==='glb'){
  if(!source.clip?.tracks?.length)throw Error('Esta animación GLB no contiene pistas.');
  return source.clip.clone();
 }
 let fbx;
 if(source.kind==='archive'){
  const archive=await loadOriginalArchive();
  const item=Object.values(archive.files).find(file=>!file.dir&&
   file.name.split('/').pop().toLowerCase()===source.file.toLowerCase());
  if(!item)throw Error('No se encontró '+source.file+' dentro del ZIP original.');
  fbx=FBX.parse(await item.async('arraybuffer'),'');
 }else{
  const url='./'+source.path.split('/').map(encodeURIComponent).join('/');
  fbx=await FBX.loadAsync(url);
 }
 const original=fbx.animations?.[0];
 if(!original?.tracks?.length)throw Error('El FBX no tiene animación: '+source.name);
 const working=cloneSkinned(model);
 const src=rigSkeleton(fbx),dst=rigSkeleton(working);
 if(!src||!dst)throw Error('La animación o el personaje no tienen rig compatible.');
 src.pose();dst.pose();fbx.updateMatrixWorld(true);working.updateMatrixWorld(true);
 const byNorm=new Map(src.bones.map(b=>[norm(b.name),b]));
 const names={},offsets={};
 for(const bone of dst.bones){
  const input=byNorm.get(norm(bone.name));
  if(!input)continue;
  names[bone.name]=input.name;
  const sourceQ=input.getWorldQuaternion(new THREE.Quaternion());
  const targetQ=bone.getWorldQuaternion(new THREE.Quaternion());
  offsets[bone.name]=new THREE.Matrix4().makeRotationFromQuaternion(
   sourceQ.invert().multiply(targetQ)
  );
 }
 if(Object.keys(names).length<8)
  throw Error('Esqueleto incompatible: menos de ocho huesos emparejados.');
 fbx.skeleton=src;working.skeleton=dst;
 let adapted;
 try{
  adapted=retargetClip(working,fbx,original,{fps:30,names,
   localOffsets:offsets,preserveBonePositions:true,hip:'__NO_ROOT_TRANSLATION__'});
 }finally{
  delete fbx.skeleton;delete working.skeleton;
 }
 const tracks=[];
 for(const track of adapted.tracks){
  const match=/^\.bones\[(.+)\]\.quaternion$/.exec(track.name);
  if(!match)continue;
  const adaptedTrack=track.clone();
  adaptedTrack.name=match[1]+'.quaternion';
  tracks.push(adaptedTrack);
 }
 if(tracks.length<8)throw Error('No se pudieron adaptar suficientes huesos de '+source.name);
 return new THREE.AnimationClip(source.name,Math.max(.001,adapted.duration),tracks);
}
