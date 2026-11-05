/* R.O.K. Arena 2.5D — Stage 4 corrected.
   Real fountains are props from the loaded scenario (elementSourcePlayer 1/2).
   Their water effects are visual overlays, NOT replacement fountain models.
   Each fountain charges visibly before an orb appears on its board half.
   Orbs remain neutral and can be collected by either caster. */
export function createArenaElementOrbs({THREE,root,casters,onCollect}){
 const sources=[],orbs=[];
 const ORB_LIMIT=6,EMIT_DURATION=1.35,FIELD_HALF_WIDTH=6.35;
 const MAGNET_RANGE=4.05,MAGNET_SPEED=36,MAGNET_CAPTURE=.7;
 const orbPool=[];const ORBIT_PARTICLES=4,TRAIL_PER_PARTICLE=4,POINT_COUNT=ORBIT_PARTICLES*(1+TRAIL_PER_PARTICLE);
 const coreGeo=new THREE.IcosahedronGeometry(.23,1);
 const haloGeo=new THREE.SphereGeometry(.37,12,8);
 const pointMaterial=new THREE.PointsMaterial({size:.18,vertexColors:true,sizeAttenuation:true,
  transparent:true,opacity:.95,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const coreMaterial=new THREE.MeshBasicMaterial({color:0xc8fff9});
 const haloMaterial=new THREE.MeshBasicMaterial({color:0x00ffe4,transparent:true,
  opacity:.24,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const waterGeo=new THREE.CircleGeometry(1,48);
 const waterRingGeo=new THREE.RingGeometry(.73,.96,48);
 const beamGeo=new THREE.CylinderGeometry(.07,.17,1.5,12,1,true);
 const sparkGeo=new THREE.OctahedronGeometry(.095,0);
 const mat=(color,opacity=1)=>new THREE.MeshBasicMaterial({
  color,transparent:true,opacity,depthWrite:false,depthTest:true,side:THREE.DoubleSide
 });
 function disposeVisual(group){
  root.remove(group);
  group.traverse(node=>{
   if(node.isMesh){node.material?.dispose?.();}
  });
 }
 function clearOrbs(){
  for(const orb of orbs){orb.group.visible=false;orb.target=null;orb.source=null;}
  orbs.length=0;
 }
 function rebuildOrbPool(){
  // Pre-create complete orbiting-atom visuals when a scene loads, not when
  // the source emits. No geometry/material/shader/light allocation at spawn.
  for(const orb of orbPool){
   root.remove(orb.group);
   orb.points.geometry.dispose();
  }
  orbPool.length=0;
  for(let i=0;i<ORB_LIMIT*2;i++){
   const group=new THREE.Group();group.visible=false;
   const core=new THREE.Mesh(coreGeo,coreMaterial);group.add(core);
   const glow=new THREE.Mesh(haloGeo,haloMaterial);group.add(glow);
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
   const points=new THREE.Points(geometry,pointMaterial);
   points.frustumCulled=false;group.add(points);root.add(group);
   orbPool.push({group,core,glow,points,phase:0,trailHistory:[],target:null,source:null});
  }
 }
 function updateAtom(orb,dt){
  orb.phase+=dt*4.6;
  const t=orb.phase,positions=orb.points.geometry.attributes.position.array;
  const colors=orb.points.geometry.attributes.color.array;
  const radius=.41;
  for(let j=0;j<ORBIT_PARTICLES;j++){
   const a=t+j*Math.PI/2;
   // Four satellites in alternating inclined orbits around one nucleus.
   const tilt=j%2===0?1:-1;
   const x=Math.cos(a)*radius;
   const y=Math.sin(a)*radius*.78;
   const z=Math.sin(a+.45)*radius*.65*tilt;
   const base=j*(1+TRAIL_PER_PARTICLE);
   const trace=orb.trailHistory[j];
   trace.unshift([x,y,z]);if(trace.length>TRAIL_PER_PARTICLE)trace.pop();
   const blink=.7+.3*Math.sin(t*3+j*1.6);
   for(let k=0;k<=TRAIL_PER_PARTICLE;k++){
    const index=(base+k)*3;
    const pos=k===0?[x,y,z]:trace[Math.min(k-1,trace.length-1)];
    positions[index]=pos[0];positions[index+1]=pos[1];positions[index+2]=pos[2];
    const fade=k===0?blink:Math.max(.06,(1-k/(TRAIL_PER_PARTICLE+1))*.5);
    colors[index]=.27*fade;colors[index+1]=fade;colors[index+2]=.93*fade;
   }
  }
  orb.points.geometry.attributes.position.needsUpdate=true;
  orb.points.geometry.attributes.color.needsUpdate=true;
  const flash=.82+.3*Math.sin(t*3.8);
  orb.glow.scale.setScalar(flash);
  orb.core.scale.setScalar(.9+.14*Math.sin(t*4.4));
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
   const water=new THREE.Mesh(waterGeo,mat(0x18dfff,.34));
   water.rotation.x=-Math.PI/2;
   water.scale.setScalar(radius);
   visual.add(water);
   const ripple1=new THREE.Mesh(waterRingGeo,mat(0x7cfff4,.42));
   ripple1.rotation.x=-Math.PI/2;ripple1.position.y=.02;ripple1.scale.setScalar(radius);
   visual.add(ripple1);
   const ripple2=new THREE.Mesh(waterRingGeo,mat(0xc8fff7,.30));
   ripple2.rotation.x=-Math.PI/2;ripple2.position.y=.028;ripple2.scale.setScalar(radius);
   visual.add(ripple2);
   const beam=new THREE.Mesh(beamGeo,mat(0x45fff0,.0));
   beam.position.y=.8;beam.scale.set(radius*.65,1,radius*.65);
   visual.add(beam);
   const halo=new THREE.Mesh(new THREE.TorusGeometry(radius*.8,.06,8,48),mat(0xd9fff8,0));
   halo.rotation.x=Math.PI/2;halo.position.y=.3;visual.add(halo);
   const light=new THREE.PointLight(0x16ffe7,0,Math.max(3,size.y*2));
   light.position.y=.6;visual.add(light);
   const sparks=[];
   for(let i=0;i<10;i++){
    const spark=new THREE.Mesh(sparkGeo,mat(i%2?0xb4fff8:0x23ffdf,0));
    visual.add(spark);sparks.push(spark);
   }
   root.add(visual);
   sources.push({player:item.player,instance:item.instance,visual,water,ripple1,ripple2,
    beam,halo,light,sparks,radius,elapsed:0,next:0,pending:false,cast:0,
    emitted:0,phase:item.player*.7});
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
  orb.phase=Math.random()*Math.PI*2;orb.target=null;orb.source=source;
  orb.trailHistory=Array.from({length:ORBIT_PARTICLES},()=>[]);
  updateAtom(orb,0);
  orbs.push(orb);source.emitted++;
  return true;
 }
 function reset(){
  clearOrbs();
  for(const source of sources){
   source.elapsed=0;source.next=0;source.pending=false;source.cast=0;source.emitted=0;
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
 function animateWater(source,dt){
  // Effects follow the real source and disappear when scenery is hidden.
  source.visual.visible=!!(source.instance.parent?.visible&&source.instance.parent?.parent?.visible);
  source.phase+=dt*1.1;
  const t=source.phase;
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
  for(const source of sources){
   if(!source.instance.parent)continue;
   source.visual.visible=!!(source.instance.parent.visible&&source.instance.parent.parent?.visible);
   source.phase+=dt*1.1;
   const t=source.phase;
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
  for(const source of sources){
   if(!source.instance.parent){continue;}
   source.elapsed+=dt;
   if(!source.pending&&source.elapsed>=source.next)beginEmission(source);
   animateWater(source,dt);
  }
  for(let i=orbs.length-1;i>=0;i--){
   const orb=orbs[i];orb.phase+=dt*2.1;
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
  for(const orb of orbPool){root.remove(orb.group);orb.points.geometry.dispose();}
  orbPool.length=0;
  coreGeo.dispose();haloGeo.dispose();pointMaterial.dispose();coreMaterial.dispose();haloMaterial.dispose();
  waterGeo.dispose();waterRingGeo.dispose();beamGeo.dispose();sparkGeo.dispose();
 }
 return {bindSources,reset,tick,idle,dispose,get sourceCount(){return sources.length;}};
}
