/* R.O.K. Arena — mobile GPU texture budget.
 * Keeps original GLBs unchanged; only downsizes already-decoded textures.
 * Reduces GPU memory and upload work (not original network bytes).
 */
export function reduceModelTextureBudget(model,{maxSize=768}={}){
 if(!model?.traverse)return 0;
 const handled=new Set();
 let changed=0;
 model.traverse(node=>{
  if(!node.isMesh||!node.material)return;
  const materials=Array.isArray(node.material)?node.material:[node.material];
  for(const material of materials)for(const key of [
   'map','normalMap','roughnessMap','metalnessMap','emissiveMap',
   'aoMap','alphaMap','bumpMap','displacementMap'
  ]){
   const tex=material?.[key];
   if(!tex||handled.has(tex))continue;
   handled.add(tex);
   const image=tex.image;
   const width=image?.width||0,height=image?.height||0;
   if(!width||!height||Math.max(width,height)<=maxSize)continue;
   // 2D textures only. Never alter video/cubemap/compressed image payloads.
   if(tex.isCompressedTexture||tex.isCubeTexture||Array.isArray(image))continue;
   const scale=maxSize/Math.max(width,height);
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(width*scale));
   canvas.height=Math.max(1,Math.round(height*scale));
   try{
    const context=canvas.getContext('2d',{alpha:true});
    if(!context)continue;
    context.drawImage(image,0,0,canvas.width,canvas.height);
    tex.image=canvas;
    tex.needsUpdate=true;
    tex.anisotropy=1;
    changed++;
   }catch(error){
    // Browser may refuse a source not drawable on canvas. Keep original.
    console.warn('[R.O.K.] Textura original preservada:',error);
   }
  }
 });
 return changed;
}
