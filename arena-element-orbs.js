/* R.O.K. 3D · Stage 4: neutral energy orbs from two elemental sources.
   Sources are visual, not colliders. Any caster can claim any orb.
   No cards, death drops or element-specific orbs in this stage. */
export function createArenaElementOrbs({THREE,root,casters,onCollect}){
 const SOURCE_Z=12.25;
 const SOURCES=[
  {x:-5.6,z:SOURCE_Z,side:'ally'},
  {x:5.6,z:-SOURCE_Z,side:'enemy'}
 ];
 const active=[],sources=[];
 const geometry=new THREE.IcosahedronGeometry(.23,1);
 const shellGeometry=new THREE.SphereGeometry(.32,12,8);
 const ringGeometry=new THREE.TorusGeometry(.48,.045,7,36);
 const srcRingGeometry=new THREE.TorusGeometry(.72,.045,7,48);
 const baseGeometry=new THREE.CylinderGeometry(.5,.64,.17,16);
 const mat=(color,opacity=1)=>new THREE.MeshBasicMaterial({
  color,transparent:true,opacity,depthWrite:false,depthTest:true
 });
 const disposeGroup=g=>{root.remove(g);g.traverse(n=>{
  if(!n.isMesh)return;
  if(n.userData.orbMaterial)n.material?.dispose?.();
 });};
 for(const spec of SOURCES){
  const group=new THREE.Group();
  group.position.set(spec.x,.08,spec.z);
  const base=new THREE.Mesh(baseGeometry,mat(0x12363d,.90));base.userData.orbMaterial=true;group.add(base);
  const ring=new THREE.Mesh(srcRingGeometry,mat(0x00ffe4,.62));
  ring.userData.orbMaterial=true;ring.rotation.x=Math.PI/2;ring.position.y=.1;group.add(ring);
  const pillar=new THREE.Mesh(new THREE.OctahedronGeometry(.32,0),mat(0xb3fff6,.86));
  pillar.userData.orbMaterial=true;pillar.position.y=.56;group.add(pillar);
  const light=new THREE.PointLight(0x00ffe4,.75,3);light.position.y=.57;group.add(light);
  root.add(group);sources.push({group,pillar,ring,light,spec,elapsed:0,created:0,next:5});
 }
 function spawn(source){
  // The back 3/4 of each side are allowed; never spawn in the
  // forwardmost quarter nearest the rival. Terrain: x [-7,7], z [-14.5,14.5].
  const zDistance=4.1+Math.random()*9.7;
  const z=source.spec.side==='ally'?zDistance:-zDistance;
  const x=-6.35+Math.random()*12.7;
  const g=new THREE.Group();g.position.set(x,.5,z);
  const core=new THREE.Mesh(geometry,mat(0xa5fff4,.98));
  core.userData.orbMaterial=true;g.add(core);
  const glow=new THREE.Mesh(shellGeometry,mat(0x00ffe4,.16));
  glow.userData.orbMaterial=true;g.add(glow);
  const ring=new THREE.Mesh(ringGeometry,mat(0x64ffe5,.54));
  ring.userData.orbMaterial=true;g.add(ring);
  const light=new THREE.PointLight(0x00ffe4,.48,2.2);g.add(light);
  root.add(g);
  active.push({group:g,core,glow,ring,light,x,z,phase:Math.random()*6.28,target:null,source});
  source.created++;
 }
 function reset(){
  for(const orb of active)disposeGroup(orb.group);
  active.length=0;
  for(const source of sources){
   source.elapsed=0;source.created=0;source.next=5;
   spawn(source); // Initial orb, then 5, 10, 20 and 35s.
  }
 }
 function tick(dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  for(const source of sources){
   source.elapsed+=dt;
   source.pillar.rotation.y+=dt*.7;
   source.ring.rotation.z+=dt*.38;
   // Growing intervals, capped at 35 s; up to six unclaimed orbs/source.
   while(source.elapsed>=source.next){
    if(active.filter(orb=>orb.source===source).length<6)spawn(source);
    const previous=source.next;
    source.next+=Math.min(35,5*Math.pow(2,Math.min(3,source.created-1)));
    if(source.next<=previous)source.next=previous+35;
   }
  }
  for(let i=active.length-1;i>=0;i--){
   const orb=active[i];orb.phase+=dt*2.1;
   orb.group.position.y=.5+Math.sin(orb.phase)*.13;
   orb.core.rotation.y+=dt*1.3;orb.ring.rotation.y+=dt*.75;
   const eligible=casters.filter(c=>c?.outer&&c.hp>0&&c.stage==='active');
   let nearest=null,dist=Infinity;
   for(const c of eligible){
    const d=Math.hypot(c.outer.position.x-orb.group.position.x,c.outer.position.z-orb.group.position.z);
    if(d<dist){dist=d;nearest=c;}
   }
   // Magnetism within ~2 board cells, for either caster on either territory.
   if(nearest&&dist<=2.05)orb.target=nearest;
   if(orb.target&&(!eligible.includes(orb.target)))orb.target=null;
   if(orb.target){
    const pos=orb.target.outer.position;
    const dx=pos.x-orb.group.position.x,dz=pos.z-orb.group.position.z;
    const d=Math.hypot(dx,dz);
    const travel=Math.min(d,dt*4.2);
    if(d>.00001){orb.group.position.x+=dx/d*travel;orb.group.position.z+=dz/d*travel;}
    if(d<=.38||travel>=d){
     onCollect?.(orb.target.side);
     disposeGroup(orb.group);active.splice(i,1);continue;
    }
   }
  }
 }
 function dispose(){for(const orb of active)disposeGroup(orb.group);active.length=0;
  for(const source of sources)disposeGroup(source.group);sources.length=0;}
 return {reset,tick,dispose};
}
