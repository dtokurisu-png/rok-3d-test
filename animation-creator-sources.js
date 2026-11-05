/* The animation creator shares the original numbered FBX paths, but
 * retargeting happens on temporary rigs; repo source clips are never edited. */
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {clone as cloneSkinned,retargetClip} from 'three/addons/utils/SkeletonUtils.js';

const SHARED='assets/animations/casters/shared/';
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
const FBX=new FBXLoader();
const norm=name=>String(name||'').toLowerCase().replace(/^mixamorig[:_]?/,'').replace(/[^a-z0-9]/g,'');
function rigSkeleton(root){
 let skeleton=null;
 root.traverse(o=>{if(o.isSkinnedMesh&&o.skeleton?.bones?.length&&!skeleton)skeleton=o.skeleton;});
 return skeleton;
}
export async function loadCreatorClip(source,model){
 if(source.kind==='glb'){
  if(!source.clip?.tracks?.length)throw Error('Esta animación GLB no contiene pistas.');
  return source.clip.clone();
 }
 const url='./'+source.path.split('/').map(encodeURIComponent).join('/');
 const fbx=await FBX.loadAsync(url);
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
