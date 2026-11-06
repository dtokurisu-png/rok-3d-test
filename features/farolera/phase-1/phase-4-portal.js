/**
 * R.O.K. Farolera / phase 4 — ISOLATED teleport engine.
 * No writes to arena, animations, GLB, HUD, or existing game files.
 * Gameplay integration, cooldown, owner death and AI belong to later phases.
 */
import {withinThrowRange,distanceXZ} from './phase-3-lantern.js';

export const PORTAL_RADIUS=0.48;
export const ARENA_BOUNDS=Object.freeze({minX:-7,maxX:7,minZ:-14.5,maxZ:14.5});
export const LANDING_CLEARANCE=0.65;

const point=p=>({x:Number(p.x),z:Number(p.z)});
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const inArena=(p,bounds)=>p.x>=bounds.minX&&p.x<=bounds.maxX&&p.z>=bounds.minZ&&p.z<=bounds.maxZ;
const allowedUnit=(portal,unit)=>unit&&unit.id!=null&&unit.side===portal.ownerSide&&
 (unit.role==='summon'||(unit.role==='caster'&&unit.id===portal.ownerId&&portal.mode==='defensive'));

export function createFaroleraPortal({ownerId,ownerSide='ally',origin,circle,mode='offensive',bounds=ARENA_BOUNDS}){
 if(ownerId==null||!['ally','enemy'].includes(ownerSide))throw Error('Propietario inválido');
 if(!['offensive','defensive'].includes(mode))throw Error('Modo inválido');
 if(!finite(origin)||!finite(circle))throw Error('Coordenadas inválidas');
 if(!withinThrowRange(origin,circle))throw RangeError('Círculo fuera del radio de 4 casillas');
 if(!inArena(circle,bounds))throw RangeError('Círculo fuera de la arena');
 return {
  ownerId,ownerSide,mode,origin:point(origin),circle:point(circle),lamp:null,
  radius:PORTAL_RADIUS,bounds:{...bounds},phase:'circle',active:false,
  // Keep state private to one ability instance, not in existing combatants.
  inside:new Set(),previous:new Map()
 };
}

export function linkFaroleraLantern(portal,lamp){
 if(portal.phase!=='circle')throw Error('Primero se debe crear el círculo');
 if(!finite(lamp)||!withinThrowRange(portal.origin,lamp))throw RangeError('Lámpara fuera del radio de 4 casillas');
 if(!inArena(lamp,portal.bounds))throw RangeError('Lámpara fuera de la arena');
 if(distanceXZ(portal.circle,lamp)<=portal.radius+LANDING_CLEARANCE)
  throw RangeError('El destino no puede solaparse con la entrada del portal');
 portal.lamp=point(lamp);
 portal.phase='linked';portal.active=true;
 return portal;
}

function touchesCircle(prev,current,center,radius){
 if(distanceXZ(current,center)<=radius)return true;
 if(!prev||!finite(prev))return false;
 const dx=current.x-prev.x,dz=current.z-prev.z,den=dx*dx+dz*dz;
 if(den===0)return false;
 const t=Math.max(0,Math.min(1,((center.x-prev.x)*dx+(center.z-prev.z)*dz)/den));
 return Math.hypot(prev.x+dx*t-center.x,prev.z+dz*t-center.z)<=radius;
}
function landing(portal,unit,units){
 const {x,z}=portal.lamp;
 const directions=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
 const radii=[0,0.75,1.2,1.7];
 for(const radius of radii){
  for(const [dx,dz] of directions){
   if(radius===0&&(dx||dz))continue;
   if(radius>0&&!dx&&!dz)continue;
   const p={x:x+radius*dx/(Math.hypot(dx,dz)||1),z:z+radius*dz/(Math.hypot(dx,dz)||1)};
   if(!inArena(p,portal.bounds)||distanceXZ(p,portal.circle)<=portal.radius+0.15)continue;
   if(units.some(other=>other.id!==unit.id&&finite(other)&&
     other.stage!=='dead'&&distanceXZ(p,other)<LANDING_CLEARANCE))continue;
   return p;
  }
 }
 return null;
}

/**
 * Evaluate one simulation tick; caller applies returned teleports to units.
 * Keeps the owner-alive gate external: false means no transfers (phase 5
 * will decide whether/when the portal is fully destroyed).
 * Detects line-segment entry so fast-moving units cannot skip a circle.
 */
export function stepFaroleraPortal(portal,units,{ownerAlive=true}={}){
 if(!Array.isArray(units))throw TypeError('units must be an array');
 const transfers=[];
 const present=new Set();
 for(const unit of units){
  if(unit?.id==null||!finite(unit))continue;
  present.add(unit.id);
  const current=point(unit);
  const previous=portal.previous.get(unit.id);
  const nowInside=distanceXZ(current,portal.circle)<=portal.radius;
  const wasInside=portal.inside.has(unit.id);
  if(!nowInside)portal.inside.delete(unit.id);
  if(portal.active&&ownerAlive&&allowedUnit(portal,unit)&&unit.stage!=='dead'&&!wasInside&&
    touchesCircle(previous,current,portal.circle,portal.radius)){
   const target=landing(portal,unit,units);
   if(target){
    transfers.push({id:unit.id,from:current,to:target});
    // Mark consumed until the unit has been observed outside the entry zone.
    portal.inside.add(unit.id);
    portal.previous.set(unit.id,target);
    continue;
   }
  }
  if(nowInside)portal.inside.add(unit.id);
  portal.previous.set(unit.id,current);
 }
 for(const id of [...portal.previous.keys()])if(!present.has(id)){
  portal.previous.delete(id);portal.inside.delete(id);
 }
 return transfers;
}
