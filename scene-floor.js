import {reduceTextureImage} from './arena-asset-budget.js?v=2';
/* R.O.K. 3D — separate exterior ground layer.
 * Never touches the combat grid or its collision/navigation geometry.
 */
export const DEFAULT_SCENE_FLOOR=Object.freeze({
 enabled:true,height:0,repeatX:12,repeatZ:16,textureData:'',
 texture:'assets/texturas/Superficie de mármol azul marino en mosaico.webp'
});
export function normalizeSceneFloor(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Suelo exterior inválido');
 const finite=(v,d)=>v===undefined?d:Number.isFinite(Number(v))?Number(v):d;
 const num=(v,a,b,d)=>Math.max(a,Math.min(b,finite(v,d)));
 const texture=String(value.texture===undefined?DEFAULT_SCENE_FLOOR.texture:value.texture).trim();
 if(texture&&(!/^assets\/texturas\/[\p{L}\p{N} ()._-]+\.(?:png|jpe?g|webp)$/iu.test(texture)||texture.includes('..')))
  throw Error('Textura de suelo debe estar en assets/texturas');
 const textureData=String(value.textureData||'');
 if(textureData&&(!/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(textureData)||
   textureData.length>1200000))throw Error('Imagen del suelo demasiado grande o inválida');
 return {enabled:value.enabled!==false,height:num(value.height,-12,12,0),
  repeatX:num(value.repeatX,1,100,12),repeatZ:num(value.repeatZ,1,100,16),
  texture,textureData};
}
export function createSceneFloor(THREE,{onStatus,textureLimit=0}={}){
 const group=new THREE.Group();group.name='ROK_ExteriorFloor_VisualOnly';
 const loader=new THREE.TextureLoader();
 let config=normalizeSceneFloor(),generation=0,currentMap=null,materials=[];
 function dispose(){
  ++generation;
  for(const m of [...group.children]){group.remove(m);m.geometry?.dispose();}
  for(const m of materials)m.dispose();materials=[];
  currentMap?.dispose();currentMap=null;
 }
 function apply(raw=config){
  config=normalizeSceneFloor(raw);
  dispose();const token=generation;
  const width=240,depth=340,arenaW=15,arenaD=30;
  // Four planes whose union is the rectangular exterior minus the playfield.
  const pieces=[
   [(width-arenaW)/2,depth,-(width+arenaW)/4,0],
   [(width-arenaW)/2,depth,(width+arenaW)/4,0],
   [arenaW,(depth-arenaD)/2,0,-(depth+arenaD)/4],
   [arenaW,(depth-arenaD)/2,0,(depth+arenaD)/4]
  ];
  const mat=new THREE.MeshBasicMaterial({color:0x14273a,side:THREE.DoubleSide});
  materials.push(mat);
  for(const [w,d,x,z] of pieces){
   const geo=new THREE.PlaneGeometry(w,d);
   // Use shared WORLD coordinates so the tile pattern crosses the four
   // segments seamlessly and stays aligned when repeat counts change.
   const positions=geo.getAttribute('position'),uv=geo.getAttribute('uv');
   for(let i=0;i<positions.count;i++){
    const worldX=x+positions.getX(i);
    const worldZ=z-positions.getY(i);
    uv.setXY(i,(worldX+width/2)/width*config.repeatX,
     (worldZ+depth/2)/depth*config.repeatZ);
   }
   const mesh=new THREE.Mesh(geo,mat);
   mesh.rotation.x=-Math.PI/2;mesh.position.set(x,config.height-.012,z);
   group.add(mesh);
  }
  group.visible=config.enabled;
  if(config.texture||config.textureData){
   const path=config.textureData||'./'+config.texture.split('/').map(encodeURIComponent).join('/');
   loader.load(path,tex=>{
    if(token!==generation){tex.dispose();return;}
    if(textureLimit)reduceTextureImage(tex,textureLimit);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(1,1);
    currentMap=tex;mat.map=tex;mat.color.set(0xffffff);mat.needsUpdate=true;
    onStatus?.('Textura del suelo exterior aplicada.');
   },undefined,()=>{if(token===generation)onStatus?.('No se encontró la textura del suelo exterior: '+config.texture);});
  }
  return {...config};
 }
 apply();
 return {group,apply,dispose,get config(){return {...config}},setHeight(height){
  config.height=normalizeSceneFloor({...config,height}).height;
  for(const mesh of group.children)mesh.position.y=config.height-.012;
 },setVisible(enabled){config.enabled=!!enabled;group.visible=config.enabled}};
}
