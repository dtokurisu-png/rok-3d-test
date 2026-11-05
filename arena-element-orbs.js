/* R.O.K. Arena 2.5D — Stage 4 corrected.
   Real fountains are props from the loaded scenario (elementSourcePlayer 1/2).
   Their water effects are visual overlays, NOT replacement fountain models.
   Each fountain charges visibly before an orb appears on its board half.
   Orbs remain neutral and can be collected by either caster. */
export function createArenaElementOrbs({THREE,root,casters,onCollect}){
 const sources=[],orbs=[];
 const ORB_LIMIT=6,EMIT_DURATION=1.35,FIELD_HALF_WIDTH=6.35;
 const coreGeo=new THREE.IcosahedronGeometry(.23,1);
 const haloGeo=new THREE.SphereGeometry(.32,12,8);
 const ringGeo=new THREE.TorusGeometry(.48,.042,7,36);
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
  for(const orb of orbs)disposeVisual(orb.group);
  orbs.length=0;
 }
 function clearSources(){
  for(const source of sources)disposeVisual(source.visual);
  sources.length=0;
 }
 function bindSources(real){
  clearOrbs();clearSources();
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
  // Each owner generates on its own side; the pickup itself is neutral.
  const zDistance=4.1+Math.random()*9.7;
  const z=source.player===1?zDistance:-zDistance;
  const x=-FIELD_HALF_WIDTH+Math.random()*(FIELD_HALF_WIDTH*2);
  const group=new THREE.Group();group.position.set(x,.5,z);
  const core=new THREE.Mesh(coreGeo,mat(0xa5fff4,.98));group.add(core);
  const glow=new THREE.Mesh(haloGeo,mat(0x00ffe4,.16));group.add(glow);
  const ring=new THREE.Mesh(ringGeo,mat(0x64ffe5,.54));group.add(ring);
  const light=new THREE.PointLight(0x00ffe4,.48,2.2);group.add(light);
  root.add(group);
  orbs.push({group,core,ring,phase:Math.random()*Math.PI*2,target:null,source});
  source.emitted++;
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
   orb.core.rotation.y+=dt*1.3;orb.ring.rotation.y+=dt*.75;
   const eligible=casters.filter(c=>c?.outer&&c.hp>0&&c.stage==='active');
   let nearest=null,dist=Infinity;
   for(const c of eligible){
    const d=Math.hypot(c.outer.position.x-orb.group.position.x,c.outer.position.z-orb.group.position.z);
    if(d<dist){dist=d;nearest=c;}
   }
   if(nearest&&dist<=2.05)orb.target=nearest;
   if(orb.target&&!eligible.includes(orb.target))orb.target=null;
   if(orb.target){
    const pos=orb.target.outer.position,dx=pos.x-orb.group.position.x,dz=pos.z-orb.group.position.z;
    const d=Math.hypot(dx,dz),step=Math.min(d,dt*4.2);
    if(d>0.00001){orb.group.position.x+=dx/d*step;orb.group.position.z+=dz/d*step;}
    if(d<=.38||step>=d){
     onCollect?.(orb.target.side);
     disposeVisual(orb.group);orbs.splice(i,1);
    }
   }
  }
 }
 function dispose(){clearOrbs();clearSources();coreGeo.dispose();haloGeo.dispose();ringGeo.dispose();waterGeo.dispose();waterRingGeo.dispose();beamGeo.dispose();sparkGeo.dispose();}
 return {bindSources,reset,tick,dispose,get sourceCount(){return sources.length;}};
}
