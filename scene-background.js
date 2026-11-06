import {reduceTextureImage} from './arena-asset-budget.js?v=2';
/* R.O.K. 3D — non-colliding environmental enclosure.
 * A proportional Gothic room whose vaulted ceiling, walls and surrounding
 * ground are independent of the 15x30 arena and all gameplay objects.
 */
export const DEFAULT_GOTHIC_TEXTURE='assets/texturas/Panorama gótica de vitrales zafiro.webp';
export const BACKGROUND_DEFAULTS=Object.freeze({
 enabled:true,type:'gothic-vault',width:70,height:18,archRise:12,
 texture:DEFAULT_GOTHIC_TEXTURE,textureOffsetX:0,textureOffsetY:0
});
const textureExtension=/\.(?:png|jpe?g|webp|avif|jfif|bmp)$/i;
const textureRoot=/^assets\/(?:texturas|textures)\/[^/]+$/iu;
export function textureCandidates(name){
 const raw=String(name||'').trim();
 if(!raw)return [];
 if(!textureRoot.test(raw)||raw.includes('..'))throw Error('Ruta de textura no permitida');
 if(textureExtension.test(raw))return [raw];
 return ['.png','.jpg','.jpeg','.webp','.avif','.jfif','.bmp',
  '.PNG','.JPG','.JPEG','.WEBP'].map(ext=>raw+ext);
}
export async function resolveBackgroundTexture(name,listing=undefined){
 const candidates=textureCandidates(name);
 if(!candidates.length||textureExtension.test(name))return candidates;
 try{
  const parts=name.split('/'),parent=parts.slice(0,-1).join('/');
  const normalizeStem=str=>str.replace(textureExtension,'').normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es')
   .replace(/\s+/g,' ').trim();
  const stem=normalizeStem(parts.at(-1));
  const files=listing||await (async()=>{
   const api='https://api.github.com/repos/dtokurisu-png/rok-3d-test/contents/'+
    parent.split('/').map(encodeURIComponent).join('/')+'?ref=main';
   const response=await fetch(api,{headers:{Accept:'application/vnd.github+json'}});
   if(!response.ok)throw Error('GitHub HTTP '+response.status);
   return response.json();
  })();
  const images=Array.isArray(files)?files.filter(item=>item.type==='file'&&
   textureExtension.test(item.name)):[];
  const match=images.find(item=>normalizeStem(item.name)===stem)||
   images.find(item=>normalizeStem(item.name).startsWith(stem+' ('));
  if(match){
   const exact=parent+'/'+match.name;
   return [exact,...candidates.filter(candidate=>candidate!==exact)];
  }
 }catch(error){/* If GitHub API is unavailable, try known extensions directly. */}
 return candidates;
}
const finite=(x,fallback)=>Number.isFinite(Number(x))?Number(x):fallback;
export function normalizeSceneBackground(raw={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Background inválido');
 if(raw.type&&raw.type!=='gothic-vault')throw Error('Tipo de background no compatible');
 const width=Math.max(30,Math.min(120,finite(raw.width,70)));
 const height=Math.max(10,Math.min(40,finite(raw.height,18)));
 const archRise=Math.max(4,Math.min(25,finite(raw.archRise,12)));
 const texture=String(raw.texture===undefined?BACKGROUND_DEFAULTS.texture:raw.texture||'').trim();
 if(texture&&(!textureRoot.test(texture)||texture.includes('..')||(texture.includes('.')&&!textureExtension.test(texture))))
  throw Error('La textura debe estar dentro de assets/texturas o assets/textures');
 const textureOffsetX=Math.max(-1,Math.min(1,finite(raw.textureOffsetX,0)));
 const textureOffsetY=Math.max(-1,Math.min(1,finite(raw.textureOffsetY,0)));
 return {enabled:raw.enabled!==false,type:'gothic-vault',width,
  length:width*2,height,archRise,texture,textureOffsetX,textureOffsetY};
}
export function createSceneBackground(THREE,{onStatus,textureLimit=0}={}){
 const group=new THREE.Group();group.name='ROK_Gothic_Background_VisualOnly';
 const loader=new THREE.TextureLoader();
 let current=normalizeSceneBackground(),material=null,texture=null;
 let generation=0;
 const report=s=>onStatus?.(s);
 function setTextureOffset(x,y){
  current.textureOffsetX=Math.max(-1,Math.min(1,finite(x,0)));
  current.textureOffsetY=Math.max(-1,Math.min(1,finite(y,0)));
  if(texture){
   texture.wrapS=THREE.RepeatWrapping;
   texture.wrapT=THREE.RepeatWrapping;
   texture.offset.set(current.textureOffsetX,current.textureOffsetY);
   texture.needsUpdate=true;
  }
 }
 function clear(){
  for(const o of [...group.children]){
   o.traverse(node=>node.geometry?.dispose?.());
   group.remove(o);
  }
  if(material){material.dispose();material=null;}
 }
 function makeGeometry(vertices,indices,uvs){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(indices);geo.computeVertexNormals();return geo;
 }
 function roofGeometry(width,length,height,rise,steps=32){
  const half=width/2,v=[],uv=[],indices=[];
  for(const z of [-length/2,length/2]){
   for(let i=0;i<=steps;i++){
    const u=i/steps,x=(u-.5)*width;
    // Smooth barrel vault; walls join exactly at their vertical height.
    const y=height+rise*(1-(x/half)**2);
    v.push(x,y,z);uv.push(u,(z+length/2)/length);
   }
  }
  for(let i=0;i<steps;i++){
   const a=i,b=i+1,c=steps+1+i,d=c+1;
   indices.push(a,c,b,b,c,d);
  }
  return makeGeometry(v,indices,uv);
 }
 function endCap(width,height,rise,length,side,steps=32){
  const v=[],uv=[],indices=[],half=width/2,z=side*length/2;
  // An arched wall is one connected mesh from ground to vaulted crown.
  v.push(0,0,z);uv.push(.5,0);
  // Polygon perimeter: bottom right, arch right→left, bottom left.
  const points=[[half,0],[half,height]];
  for(let i=1;i<=steps;i++){
   const x=half-i*width/steps;
   points.push([x,height+rise*(1-(x/half)**2)]);
  }
  points.push([-half,0]);
  for(const [x,y] of points){
   v.push(x,y,z);uv.push((x+half)/width,y/(height+rise));
  }
  for(let i=1;i<points.length;i++){
   if(side>0)indices.push(0,i,i+1);
   else indices.push(0,i+1,i);
  }
  indices.push(...(side>0?[0,points.length,1]:[0,1,points.length]));
  return makeGeometry(v,indices,uv);
 }
 function walls(width,length,height){
  const add=(w,h,x,y,z,rotation)=>{
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
   mesh.position.set(x,y,z);mesh.rotation.y=rotation;group.add(mesh);
  };
  add(length,height,-width/2,height/2,0,-Math.PI/2);
  add(length,height,width/2,height/2,0,Math.PI/2);
 }
 function floorRing(width,length){
  // Four ground strips at Y=0; no environmental floor overlays gameplay.
  const halfW=width/2,halfL=length/2;
  const arenaW=15,arenaL=30;
  const stripMaterial=new THREE.MeshBasicMaterial({
   color:0x10222b,side:THREE.DoubleSide,depthWrite:false,transparent:true,opacity:.75
  });
  const parts=[
   {w:(width-arenaW)/2,l:length,x:-(width+arenaW)/4,z:0},
   {w:(width-arenaW)/2,l:length,x:(width+arenaW)/4,z:0},
   {w:arenaW,l:(length-arenaL)/2,x:0,z:-(length+arenaL)/4},
   {w:arenaW,l:(length-arenaL)/2,x:0,z:(length+arenaL)/4}
  ];
  for(const p of parts){
   if(p.w<=0||p.l<=0)continue;
   const floor=new THREE.Mesh(new THREE.PlaneGeometry(p.w,p.l),stripMaterial);
   floor.rotation.x=-Math.PI/2;floor.position.set(p.x,-.03,p.z);
   group.add(floor);
  }
  return stripMaterial;
 }
 let floorMaterial=null;
 function build(config=current){
  current=normalizeSceneBackground(config);
  ++generation;
  clear();
  floorMaterial?.dispose();floorMaterial=null;
  const {width,length,height,archRise}=current;
  // BackSide ensures the interior panorama is visible and the outer camera
  // can see through the shell during editing.
  material=new THREE.MeshBasicMaterial({
   color:0x6689a4,side:THREE.BackSide,transparent:false,depthWrite:true
  });
  walls(width,length,height);
  group.add(new THREE.Mesh(roofGeometry(width,length,height,archRise),material));
  for(const sign of [-1,1])
   group.add(new THREE.Mesh(endCap(width,height,archRise,length,sign),material));
  // Exterior floor is a separate independently adjustable scene-floor.js layer.
  // Do not create a fixed-height floor inside the background enclosure.
  group.visible=current.enabled;
  if(texture){texture.dispose();texture=null;}
  if(current.texture){
   const ticket=generation,requested=current.texture;
   // Resolve actual extension and case; no manual path entry required.
   void resolveBackgroundTexture(requested).then(async candidates=>{
    if(ticket!==generation)return;
    for(const path of candidates){
     if(ticket!==generation)return;
     const url='./'+path.split('/').map(encodeURIComponent).join('/');
     const loaded=await new Promise(resolve=>{
      loader.load(url,tex=>resolve(tex),undefined,()=>resolve(null));
     });
     if(!loaded)continue;
     if(ticket!==generation){loaded.dispose();return;}
     if(textureLimit)reduceTextureImage(loaded,textureLimit);
     loaded.colorSpace=THREE.SRGBColorSpace;
     loaded.wrapS=THREE.RepeatWrapping;loaded.wrapT=THREE.RepeatWrapping;
     texture=loaded;setTextureOffset(current.textureOffsetX,current.textureOffsetY);
     material.map=loaded;material.color.set(0xffffff);
     material.needsUpdate=true;
     current.texture=path;
     report('Textura gótica aplicada: '+path.split('/').at(-1));
     return;
    }
    if(ticket===generation)report('No se encontró «Panorama gótica de vitrales zafiro» en assets/texturas. Comprueba que esté publicado en GitHub.');
   }).catch(error=>{
    if(ticket===generation)report('Error al cargar textura gótica: '+error.message);
   });
  }
  return current;
 }
 function dispose(){++generation;clear();floorMaterial?.dispose();texture?.dispose();texture=null;}
 build();
 return {group,build,dispose,setTextureOffset,get config(){return {...current}},show(value){
  current.enabled=!!value;group.visible=current.enabled;
 }};
}
