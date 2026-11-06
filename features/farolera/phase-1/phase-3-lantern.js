/**
 * Farolera — Fase 3: prototipo independiente de lanzamiento.
 * No altera mallas, animaciones ni sistemas existentes de R.O.K.
 * La integración real requiere inspeccionar el rig GLB y autorización
 * explícita para modificar la arena protegida.
 */
export const FAROLERA_RANGE=4;
export const LANTERN_THROW_SECONDS=0.65;

export function distanceXZ(a,b){
 return Math.hypot(b.x-a.x,b.z-a.z);
}
export function withinThrowRange(origin,target){
 return [origin.x,origin.z,target.x,target.z].every(Number.isFinite) &&
  distanceXZ(origin,target)<=FAROLERA_RANGE+1e-9;
}
export function prepareLanternThrow(origin,target){
 if(!withinThrowRange(origin,target))throw new RangeError('El farol supera el alcance de 4 casillas');
 return Object.freeze({
  origin:{x:origin.x,z:origin.z},
  target:{x:target.x,z:target.z},
  duration:LANTERN_THROW_SECONDS,
  status:'prepared'
 });
}
export function lerpLanternPosition(throwPlan,progress){
 const t=Math.max(0,Math.min(1,Number(progress)||0));
 const eased=t*t*(3-2*t);
 return {
  x:throwPlan.origin.x+(throwPlan.target.x-throwPlan.origin.x)*eased,
  z:throwPlan.origin.z+(throwPlan.target.z-throwPlan.origin.z)*eased,
  height:0.30+1.15*Math.sin(Math.PI*t)
 };
}
export function chainEndpoints(hand,lantern){
 return {
  from:{x:hand.x,y:hand.y,z:hand.z},
  to:{x:lantern.x,y:lantern.y,z:lantern.z},
  length:Math.hypot(lantern.x-hand.x,lantern.y-hand.y,lantern.z-hand.z)
 };
}
export function lampLightDescriptor(target){
 return Object.freeze({x:target.x,z:target.z,color:'#b5ffe1',radius:2.25,intensity:1.6});
}
