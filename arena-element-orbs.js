/* R.O.K. Arena 2.5D — Stage 4 corrected.
   Real fountains are props from the loaded scenario (elementSourcePlayer 1/2).
   Their water effects are visual overlays, NOT replacement fountain models.
   Each fountain charges visibly before an orb appears on its board half.
   Orbs remain neutral and can be collected by either caster. */
export function createArenaElementOrbs({THREE,root,casters,onCollect}){
 const sources=[],orbs=[];
 const ORB_LIMIT=6,EMIT_DURATION=1.35,FIELD_HALF_WIDTH=6.35;
 const MAGNET_RANGE=4.05,MAGNET_SPEED=36,MAGNET_CAPTURE=.7;
 const ORB_LIFETIME=10,ORB_FADE_START=7;
 const orbPool=[];const ORBIT_PARTICLES=4,TRAIL_PER_PARTICLE=4,POINT_COUNT=ORBIT_PARTICLES*(1+TRAIL_PER_PARTICLE);
 // R.O.K. elemental spectrum: 11 distinct stops. The salmon tone bridges
 // magenta and white, rather than reducing the effect to a single hue.
 const rainbowHex=[
  0xff324d, // red
  0xff8b2d, // orange
  0xffdf38, // yellow
  0xbfff3f, // lime
  0x42e86f, // green
  0x00ffe4, // cyan
  0x277bff, // blue
  0x6229ad, // purple / violet
  0xf22aa2, // magenta
  0xffb3a2, // salmon / luminous pink
  0xffffff  // luminous white
 ];
 const rainbowColors=rainbowHex.map(hex=>new THREE.Color(hex));
 const white=new THREE.Color(0xffffff);
 const spectrumColor=new THREE.Color();
 function sampleSpectrum(at,out=spectrumColor){
  const n=rainbowColors.length,phase=((at%1)+1)%1*n;
  const a=Math.floor(phase),b=(a+1)%n;
  return out.copy(rainbowColors[a]).lerp(rainbowColors[b],phase-a);
 }
 // Angular/radial texture means several distinct colors are visible at
 // once on the same orb AND in the fountain basin, never a flat tint.
 // Pure white glints are layered over the palette without washing it out.
 const canvas=document.createElement('canvas');
 canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');
 const image=ctx.createImageData(256,256),pixel=image.data;
 const pixelColor=new THREE.Color();
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const dx=(x-127.5)/127.5,dy=(y-127.5)/127.5;
  const angle=(Math.atan2(dy,dx)/Math.PI/2+1)%1;
  const radius=Math.min(1,Math.hypot(dx,dy));
  sampleSpectrum(angle+radius*.26,pixelColor);
  const glint=.12*Math.pow(Math.max(0,Math.sin(angle*22*Math.PI+radius*8)),14);
  pixelColor.lerp(white,glint);
  const index=(y*256+x)*4;
  pixelColor.convertLinearToSRGB();
  pixel[index]=Math.round(255*pixelColor.r);
  pixel[index+1]=Math.round(255*pixelColor.g);
  pixel[index+2]=Math.round(255*pixelColor.b);
  pixel[index+3]=255;
 }
 ctx.putImageData(image,0,0);
 const rainbowTexture=new THREE.CanvasTexture(canvas);
 rainbowTexture.colorSpace=THREE.SRGBColorSpace;
 rainbowTexture.wrapS=THREE.RepeatWrapping;
 rainbowTexture.wrapT=THREE.RepeatWrapping;
 rainbowTexture.center.set(.5,.5);
 const coreGeo=new THREE.IcosahedronGeometry(.23,1);
 const haloGeo=new THREE.SphereGeometry(.37,12,8);
 const pointMaterial=new THREE.PointsMaterial({size:.18,vertexColors:true,sizeAttenuation:true,
  transparent:true,opacity:.95,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const coreMaterial=new THREE.MeshBasicMaterial({color:0xffffff,map:rainbowTexture,transparent:true,depthWrite:false});
 const haloMaterial=new THREE.MeshBasicMaterial({color:0xffffff,map:rainbowTexture,transparent:true,
  opacity:.24,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const waterGeo=new THREE.CircleGeometry(1,48);
 const waterRingGeo=new THREE.RingGeometry(.73,.96,48);
 const beamGeo=new THREE.CylinderGeometry(.07,.17,1.5,12,1,true);
 const sparkGeo=new THREE.OctahedronGeometry(.095,0);
 const mat=(color,opacity=1,rainbow=false)=>new THREE.MeshBasicMaterial({
  color, ...(rainbow?{map:rainbowTexture}:{}),
  transparent:true,opacity,depthWrite:false,depthTest:true,side:THREE.DoubleSide
 });
 function disposeVisual(group){
  root.remove(group);
  group.traverse(node=>{
   if(node.isMesh){node.material?.dispose?.();}
  });
 }
 function clearOrbs(){
  for(const orb of orbs){orb.group.visible=false;orb.target=null;orb.source=null;orb.age=0;}
  orbs.length=0;
 }
 function rebuildOrbPool(){
  // Pre-create complete orbiting-atom visuals when a scene loads, not when
  // the source emits. No geometry/material/shader/light allocation at spawn.
  for(const orb of orbPool){
   root.remove(orb.group);
   orb.points.geometry.dispose();
   orb.core.material.dispose();orb.glow.material.dispose();orb.points.material.dispose();
  }
  orbPool.length=0;
  for(let i=0;i<ORB_LIMIT*2;i++){
   const group=new THREE.Group();group.visible=false;
   const core=new THREE.Mesh(coreGeo,coreMaterial.clone());group.add(core);
   const glow=new THREE.Mesh(haloGeo,haloMaterial.clone());group.add(glow);
   const geometry=new THREE.BufferGeometry();
   const positions=new Float32Array(POINT_COUNT*3);
   const colors=new Float32Array(POINT_COUNT*3);
   const positionAttribute=new THREE.BufferAttribute(positions,3);
   positionAttribute.setUsage(THREE.DynamicDrawUsage);
   const colorAttribute=new THREE.BufferAttribute(colors,3);
   colorAttribute.setUsage(THREE.DynamicDrawUsage);
   geometry.setAttribute('position',positionAttribute);
   geometry.setAttribute('color',colorAttribute);
   geometry.setDrawRange(0,POINT_COUNT);
   // Ensure the moving particles cannot be culled by their initial bounds.
   const points=new THREE.Points(geometry,pointMaterial.clone());
   points.frustumCulled=false;group.add(points);root.add(group);
   orbPool.push({group,core,glow,points,phase:0,age:0,target:null,source:null});
  }
 }
 function updateAtom(orb,dt){
  orb.phase+=dt*4.6;
  const t=orb.phase,positions=orb.points.geometry.attributes.position.array;
  const colors=orb.points.geometry.attributes.color.array;
  const radius=orb.orbitRadius??.41;
  const satellites=orb.satellites??ORBIT_PARTICLES;
  for(let j=0;j<satellites;j++){
   const a=t+j*Math.PI*2/satellites;
   // Four satellites in alternating inclined orbits around one nucleus.
   const tilt=j%2===0?1:-1;
   const x=Math.cos(a)*radius;
   const y=Math.sin(a)*radius*.78;
   const z=Math.sin(a+.45)*radius*.65*tilt;
   const base=j*(1+TRAIL_PER_PARTICLE);
   const blink=.7+.3*Math.sin(t*3+j*1.6);
   for(let k=0;k<=TRAIL_PER_PARTICLE;k++){
    const index=(base+k)*3;
    const trailAngle=a-k*.19;
    positions[index]=k===0?x:Math.cos(trailAngle)*radius;
    positions[index+1]=k===0?y:Math.sin(trailAngle)*radius*.78;
    positions[index+2]=k===0?z:Math.sin(trailAngle+.45)*radius*.65*tilt;
    const fade=k===0?blink:Math.max(.06,(1-k/(TRAIL_PER_PARTICLE+1))*.55);
    // Each of the four orbiting particles cycles through the full spectrum
    // at a different phase; the trail follows with a short chromatic delay.
    const spectral=sampleSpectrum(t*.034+j*.25-k*.012);
    colors[index]=spectral.r*fade;
    colors[index+1]=spectral.g*fade;
    colors[index+2]=spectral.b*fade;
   }
  }
  orb.points.geometry.attributes.position.needsUpdate=true;
  orb.points.geometry.attributes.color.needsUpdate=true;
  const flash=.82+.3*Math.sin(t*3.8);
  const fade=orb.age<=ORB_FADE_START?1:
   Math.max(0,(ORB_LIFETIME-orb.age)/(ORB_LIFETIME-ORB_FADE_START));
  // Faster pulses and lower opacity through the final three seconds.
  const urgency=1-fade;
  const flicker=orb.age<=ORB_FADE_START?1:
   1-urgency*(.2+.55*(.5+.5*Math.sin(orb.age*(10+urgency*24))));
  const alpha=fade*flicker;
  orb.core.material.opacity=alpha;
  orb.core.rotation.z+=dt*.31;
  orb.glow.material.opacity=.24*alpha;
  orb.points.material.opacity=.95*alpha;
  orb.glow.scale.setScalar(flash);
  orb.core.scale.setScalar(.9+.14*Math.sin(t*4.4));
 }

 // Share exactly the fountain-orb nucleus, chromatic texture and orbital
 // shader with a Semillera fragment; only the scale and satellite count vary.
 function createFragmentVisual(){
  const group=new THREE.Group();
  group.scale.setScalar(.43);
  const core=new THREE.Mesh(coreGeo,coreMaterial.clone());group.add(core);
  const glow=new THREE.Mesh(haloGeo,haloMaterial.clone());group.add(glow);
  const geometry=new THREE.BufferGeometry();
  const positions=new Float32Array((1+TRAIL_PER_PARTICLE)*3);
  const colors=new Float32Array((1+TRAIL_PER_PARTICLE)*3);
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const points=new THREE.Points(geometry,pointMaterial.clone());
  points.frustumCulled=false;group.add(points);root.add(group);
  const visual={group,core,glow,points,phase:0,age:0,satellites:1,orbitRadius:.32};
  updateAtom(visual,0);
  return {
   group,
   // Small fragments share the fountain orb's age-based fade and flicker.
   update(dt,age=0){visual.age=Math.max(0,age);updateAtom(visual,dt);},
   dispose(){
    root.remove(group);geometry.dispose();
    core.material.dispose();glow.material.dispose();points.material.dispose();
   }
  };
 }
 function clearSources(){
  for(const source of sources)disposeVisual(source.visual);
  sources.length=0;
 }
 function bindSources(real){
  clearOrbs();clearSources();
  rebuildOrbPool();
  const seen=new Set();
  for(const item of real||[]){
   if((item.player!==1&&item.player!==2)||!item.instance||!item.bounds||seen.has(item.player))continue;
   seen.add(item.player);
   const bound=item.bounds;
   const center=bound.getCenter(new THREE.Vector3());
   const size=bound.getSize(new THREE.Vector3());
   // Approximate the upper basin from the actual fountain's world bounding box.
   // Water sits inside the existing fountain; no extra fountain mesh is created.
   const basinY=bound.min.y+size.y*.66;
   const radius=Math.max(.35,Math.min(1.2,Math.min(size.x,size.z)*.27));
   const visual=new THREE.Group();
   visual.position.set(center.x,basinY,center.z);
   const water=new THREE.Mesh(waterGeo,mat(0xffffff,.34,true));
   water.rotation.x=-Math.PI/2;
   water.scale.setScalar(radius);
   visual.add(water);
   const ripple1=new THREE.Mesh(waterRingGeo,mat(0xffffff,.42,true));
   ripple1.rotation.x=-Math.PI/2;ripple1.position.y=.02;ripple1.scale.setScalar(radius);
   visual.add(ripple1);
   const ripple2=new THREE.Mesh(waterRingGeo,mat(0xffffff,.30,true));
   ripple2.rotation.x=-Math.PI/2;ripple2.position.y=.028;ripple2.scale.setScalar(radius);
   visual.add(ripple2);
   const beam=new THREE.Mesh(beamGeo,mat(0xffffff,.0,true));
   beam.position.y=.8;beam.scale.set(radius*.65,1,radius*.65);
   visual.add(beam);
   const halo=new THREE.Mesh(new THREE.TorusGeometry(radius*.8,.06,8,48),mat(0xffffff,0,true));
   halo.rotation.x=Math.PI/2;halo.position.y=.3;visual.add(halo);
   const light=new THREE.PointLight(0xffffff,0,Math.max(3,size.y*2));
   light.position.y=.6;visual.add(light);
   const sparks=[];
   for(let i=0;i<10;i++){
    const spark=new THREE.Mesh(sparkGeo,mat(0xffffff,0));
    visual.add(spark);sparks.push(spark);
   }
   root.add(visual);
   sources.push({player:item.player,instance:item.instance,visual,water,ripple1,ripple2,
    beam,halo,light,sparks,radius,elapsed:0,next:0,pending:false,cast:0,
    emitted:0,lastEmissionAt:0,phase:item.player*.7});
  }
  return sources.length;
 }
 function spawn(source){
  // The entire visual is reused from the scene-load pool: this cannot
  // trigger a mesh/geometry/material/PointLight allocation mid-battle.
  const orb=orbPool.find(item=>!item.group.visible);
  if(!orb)return false;
  const zDistance=4.1+Math.random()*9.7;
  const z=source.visual.position.z<0?-zDistance:zDistance;
  const x=-FIELD_HALF_WIDTH+Math.random()*(FIELD_HALF_WIDTH*2);
  orb.group.position.set(x,.55,z);orb.group.visible=true;
  orb.phase=Math.random()*Math.PI*2;orb.target=null;orb.source=source;orb.age=0;
  updateAtom(orb,0);
  orbs.push(orb);source.emitted++;source.lastEmissionAt=source.elapsed;
  return true;
 }
 function reset(){
  clearOrbs();
  for(const source of sources){
   source.elapsed=0;source.next=0;source.pending=false;source.cast=0;source.emitted=0;
   source.lastEmissionAt=0;
   source.light.intensity=0;source.beam.material.opacity=0;source.halo.material.opacity=0;
  }
 }
 function beginEmission(source){
  if(source.pending)return;
  if(orbs.filter(o=>o.source===source).length>=ORB_LIMIT){
   source.next=source.elapsed+3;return;
  }
  source.pending=true;source.cast=0;
 }
 function animateSpectrum(source){
  const t=source.phase;
  // A different spectral wave for each moving water ring, spark and light.
  // This applies even while the fountain is idle; emission only boosts alpha.
  source.light.color.copy(sampleSpectrum(t*.045+source.player*.2));
  source.sparks.forEach((spark,i)=>{
   spark.material.color.copy(sampleSpectrum(t*.09+i/source.sparks.length));
  });
 }
 function animateWater(source,dt){
  // Effects follow the real source and disappear when scenery is hidden.
  source.visual.visible=!!(source.instance.parent?.visible&&source.instance.parent?.parent?.visible);
  source.phase+=dt*1.1;
  const t=source.phase;
  animateSpectrum(source);
  source.water.material.opacity=.27+Math.sin(t*1.5)*.07;
  source.water.rotation.z+=dt*.11;
  source.ripple1.scale.setScalar(source.radius*(.82+.13*(1+Math.sin(t*1.7))));
  source.ripple1.material.opacity=.32+.13*Math.sin(t*2);
  source.ripple2.scale.setScalar(source.radius*(.76+.16*(1+Math.sin(t*1.2+2))));
  source.ripple2.material.opacity=.26+.09*Math.sin(t*1.7+1);
  if(source.pending){
   source.cast=Math.min(EMIT_DURATION,source.cast+dt);
   const p=source.cast/EMIT_DURATION;
   const pulse=Math.sin(Math.PI*Math.min(1,p));
   source.beam.material.opacity=.1+.5*pulse;
   source.beam.scale.y=.35+p*1.3;
   source.halo.material.opacity=.25+.65*pulse;
   source.halo.position.y=.18+1.3*p;
   source.halo.rotation.z+=dt*3;
   source.light.intensity=.5+2.1*pulse;
   source.water.material.opacity=Math.min(.95,.35+.5*pulse);
   source.sparks.forEach((spark,i)=>{
    const a=i*Math.PI*2/source.sparks.length+t*.65;
    const r=source.radius*(.45+.15*Math.sin(t*3+i));
    spark.position.set(Math.cos(a)*r,.12+((p+i*.13)%1)*1.5,Math.sin(a)*r);
    spark.material.opacity=.35+.65*pulse;
    spark.rotation.y+=dt*2;
   });
   if(p>=1){
    source.pending=false;source.light.intensity=0;source.beam.material.opacity=0;
    source.halo.material.opacity=0;
    source.sparks.forEach(spark=>spark.material.opacity=0);
    spawn(source); // Only after the fountain has completed its visual emission.
    const intervals=[5,10,20,35];
    source.next=source.elapsed+intervals[Math.min(source.emitted-1,intervals.length-1)];
   }
  }
 }
 // Water continues to ripple while waiting for a match. Source casting and
 // spawn timers never advance during pause or preparation.
 function idle(dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  rainbowTexture.rotation=(rainbowTexture.rotation+dt*.18)%(Math.PI*2);
  for(const source of sources){
   if(!source.instance.parent)continue;
   source.visual.visible=!!(source.instance.parent.visible&&source.instance.parent.parent?.visible);
   source.phase+=dt*1.1;
   const t=source.phase;
   animateSpectrum(source);
   source.water.material.opacity=.27+Math.sin(t*1.5)*.07;
   source.water.rotation.z+=dt*.11;
   source.ripple1.scale.setScalar(source.radius*(.82+.13*(1+Math.sin(t*1.7))));
   source.ripple1.material.opacity=.32+.13*Math.sin(t*2);
   source.ripple2.scale.setScalar(source.radius*(.76+.16*(1+Math.sin(t*1.2+2))));
   source.ripple2.material.opacity=.26+.09*Math.sin(t*1.7+1);
  }
 }
 function tick(dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  rainbowTexture.rotation=(rainbowTexture.rotation+dt*.18)%(Math.PI*2);
  for(const source of sources){
   if(!source.instance.parent){continue;}
   source.elapsed+=dt;
   if(!source.pending&&source.elapsed>=source.next)beginEmission(source);
   animateWater(source,dt);
  }
  for(let i=orbs.length-1;i>=0;i--){
   const orb=orbs[i];
   orb.age+=dt;
   // Expiry precedes magnetism and collection, so a dead orb cannot be taken.
   if(orb.age>=ORB_LIFETIME){
    orb.group.visible=false;orb.target=null;orb.source=null;orbs.splice(i,1);
    continue;
   }
   orb.phase+=dt*2.1;
   orb.group.position.y=.5+Math.sin(orb.phase)*.13;
   orb.core.rotation.y+=dt*1.3;updateAtom(orb,dt);
   const eligible=casters.filter(c=>c?.outer&&c.hp>0&&c.stage==='active');
   let nearest=null,dist=Infinity;
   for(const c of eligible){
    const d=Math.hypot(c.outer.position.x-orb.group.position.x,c.outer.position.z-orb.group.position.z);
    if(d<dist){dist=d;nearest=c;}
   }
   if(nearest&&dist<=MAGNET_RANGE)orb.target=nearest;
   if(orb.target&&!eligible.includes(orb.target))orb.target=null;
   if(orb.target){
    const pos=orb.target.outer.position,dx=pos.x-orb.group.position.x,dz=pos.z-orb.group.position.z;
    const d=Math.hypot(dx,dz),step=Math.min(d,dt*MAGNET_SPEED);
    if(d>0.00001){orb.group.position.x+=dx/d*step;orb.group.position.z+=dz/d*step;}
    if(d<=MAGNET_CAPTURE||step>=d){
     onCollect?.(orb.target.side);
     orb.group.visible=false;orb.target=null;orb.source=null;orbs.splice(i,1);
    }
   }
  }
 }
 function dispose(){
  clearOrbs();clearSources();
  for(const orb of orbPool){
   root.remove(orb.group);orb.points.geometry.dispose();
   orb.core.material.dispose();orb.glow.material.dispose();orb.points.material.dispose();
  }
  orbPool.length=0;
  coreGeo.dispose();haloGeo.dispose();pointMaterial.dispose();coreMaterial.dispose();haloMaterial.dispose();
  waterGeo.dispose();waterRingGeo.dispose();beamGeo.dispose();sparkGeo.dispose();
  rainbowTexture.dispose();
 }
 function getNextOrbForecast(player){
  const source=sources.find(item=>item.player===player);
  if(!source)return null;
  const intervals=[5,10,20,35];
  const period=intervals[Math.min(Math.max(0,source.emitted-1),3)];
  const remaining=source.pending?Math.max(0,EMIT_DURATION-source.cast):
   Math.max(0,source.next-source.elapsed)+EMIT_DURATION;
  // The first orb follows the initial emission immediately. Later orbs
  // use the real fountain timer; no separate AI-only countdown.
  const elapsed=source.pending?period:Math.max(0,source.elapsed-source.lastEmissionAt);
  return {remaining,period,halfElapsed:source.emitted>0&&(source.pending||elapsed>=period*.5),
   emitted:source.emitted};
 }
 return {bindSources,reset,tick,idle,dispose,createFragmentVisual,getNextOrbForecast,
  fragmentLifetime:ORB_LIFETIME,fragmentFadeStart:ORB_FADE_START,
  forEachActiveOrb(callback){for(let i=0;i<orbs.length;i++)callback(orbs[i],i);},
  get sourceCount(){return sources.length;}};
}
