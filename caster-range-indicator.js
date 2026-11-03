/* R.O.K. 3D — Caster proximity/attack-range indicators.
 * A range ring fades in as a hostile summon approaches, becoming fully
 * visible at actual attack range. The nearest hostile summon in range
 * receives a ground target marker. Purely visual; never changes pathfinding.
 */
export function createCasterRangeIndicator({THREE,range=2,approach=4.5}){
 const instances=new WeakMap();
 const opacity=(mesh,value)=>{if(mesh)mesh.material.opacity=value;};
 function makeRing(inner,outer,color,alpha){
  const mesh=new THREE.Mesh(
   new THREE.RingGeometry(inner,outer,64),
   new THREE.MeshBasicMaterial({color,transparent:true,opacity:alpha,
    depthWrite:false,side:THREE.DoubleSide})
  );
  mesh.rotation.x=-Math.PI/2;
  mesh.renderOrder=6;
  return mesh;
 }
 function state(c){
  if(instances.has(c))return instances.get(c);
  const radius=new THREE.Group();
  radius.name='ROK_Caster_Range_Radius_2';
  radius.position.y=.042;
  const ring=makeRing(range-.035,range+.035,0x00ffe4,0);
  const accent=makeRing(range-.13,range-.12,0x00ffe4,0);
  radius.add(ring,accent);
  c.outer.add(radius);
  const st={radius,ring,accent,marked:null,mark:null,opacity:0};
  instances.set(c,st);
  return st;
 }
 function clear(st){
  if(st.mark?.parent)st.mark.parent.remove(st.mark);
  st.marked=null;st.mark=null;
 }
 function mark(st,target){
  if(st.marked===target)return;
  clear(st);
  if(!target)return;
  const group=new THREE.Group();
  group.name='ROK_Caster_Target_In_Range';
  group.position.y=.085;
  group.add(makeRing(.37,.43,0xffd46e,.9));
  group.add(makeRing(.18,.205,0xffd46e,.58));
  // Short radial ticks make the small target distinguishable from the range ring.
  for(let i=0;i<4;i++){
   const tick=new THREE.Mesh(new THREE.PlaneGeometry(.12,.028),
    new THREE.MeshBasicMaterial({color:0xffe9a8,transparent:true,opacity:.9,
     depthWrite:false,side:THREE.DoubleSide}));
   tick.rotation.x=-Math.PI/2;tick.rotation.z=i*Math.PI/2;
   tick.position.x=Math.cos(i*Math.PI/2)*.51;
   tick.position.z=Math.sin(i*Math.PI/2)*.51;
   group.add(tick);
  }
  target.outer.add(group);
  st.marked=target;st.mark=group;
 }
 function choose(c,enemies,allowed){
  if(!c||c.stage!=='active')return {nearest:null,distance:Infinity,target:null};
  const list=(enemies||[]).filter(e=>e&&e.side!==c.side&&
   (!allowed||allowed(e))&&e.outer?.position);
  list.sort((a,b)=>{
   const pa=a.outer.position,pb=b.outer.position,own=c.outer.position;
   const da=Math.hypot(pa.x-own.x,pa.z-own.z),db=Math.hypot(pb.x-own.x,pb.z-own.z);
   return da-db;
  });
  const nearest=list[0]||null;
  const distance=nearest?Math.hypot(nearest.outer.position.x-c.outer.position.x,
   nearest.outer.position.z-c.outer.position.z):Infinity;
  return {nearest,distance,target:distance<=range+.0001?nearest:null};
 }
 function update(c,enemies,dt,allowed){
  if(!c)return null;
  const st=state(c);
  const inReach=choose(c,enemies,allowed);
  // There is no aura if no hostile summons are within the approach zone.
  const proximity=Number.isFinite(inReach.distance)?
   THREE.MathUtils.clamp((approach-inReach.distance)/(approach-range),0,1):0;
  // Smoothly fade on approach and on withdrawal, while keeping full opacity
  // once within range.
  const factor=Math.min(1,Math.max(0,dt)*9);
  st.opacity+= (proximity-st.opacity)*factor;
  if(proximity===1)st.opacity=1;
  if(st.opacity<.005)st.opacity=0;
  opacity(st.ring,st.opacity*.8);
  opacity(st.accent,st.opacity*.3);
  st.radius.visible=st.opacity>0;
  mark(st,inReach.target);
  return inReach.target;
 }
 function hide(c){
  const st=c&&instances.get(c);
  if(!st)return;
  st.opacity=0;st.radius.visible=false;clear(st);
 }
 return {update,hide,choose,range};
}
