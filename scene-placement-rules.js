/* R.O.K. 3D — shared decorative scene placement contract.
 * The 15 × 30 arena is a NO-PROP region, including model footprints.
 * All editor operations and tester JSON imports use these same functions.
 */
export const ARENA_COLUMNS=15;
export const ARENA_ROWS=30;
export const SCENERY_BOUNDS=Object.freeze({halfWidth:45,halfDepth:65});
export const PLAYABLE_CLEARANCE=.35;
export const ARENA_HALF_WIDTH=ARENA_COLUMNS/2;
export const ARENA_HALF_DEPTH=ARENA_ROWS/2;
const finite=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function footprint(width,depth,rotation=0,scale=1){
 const a=finite(rotation)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
 const w=Math.abs(finite(width,0))*Math.abs(finite(scale,1))/2;
 const d=Math.abs(finite(depth,0))*Math.abs(finite(scale,1))/2;
 return {halfX:w*c+d*s,halfZ:w*s+d*c};
}
export function isOutsidePlayable(x,z,halfX=0,halfZ=0,clearance=PLAYABLE_CLEARANCE){
 const pad=Math.max(0,finite(clearance));
 // Merely touching the edge is not safe for decorative props.
 return Math.abs(x)-halfX>=ARENA_HALF_WIDTH+pad||
        Math.abs(z)-halfZ>=ARENA_HALF_DEPTH+pad;
}
export function isWithinScenery(x,z,halfX=0,halfZ=0){
 return Math.abs(x)+halfX<=SCENERY_BOUNDS.halfWidth &&
        Math.abs(z)+halfZ<=SCENERY_BOUNDS.halfDepth;
}
export function validPlacement(x,z,halfX=0,halfZ=0){
 return Number.isFinite(x)&&Number.isFinite(z)&&
  isWithinScenery(x,z,halfX,halfZ)&&isOutsidePlayable(x,z,halfX,halfZ);
}
export function placeOutsidePlayable(x,z,halfX=0,halfZ=0){
 const minX=ARENA_HALF_WIDTH+PLAYABLE_CLEARANCE+halfX;
 const minZ=ARENA_HALF_DEPTH+PLAYABLE_CLEARANCE+halfZ;
 const boundX=SCENERY_BOUNDS.halfWidth-halfX;
 const boundZ=SCENERY_BOUNDS.halfDepth-halfZ;
 if(boundX<minX&&boundZ<minZ)
  throw Error('El objeto es demasiado grande para la zona exterior del escenario');
 const px=clamp(finite(x),-boundX,boundX),pz=clamp(finite(z),-boundZ,boundZ);
 if(isOutsidePlayable(px,pz,halfX,halfZ))return {x:px,z:pz};
 // Candidate placements on four sides, selecting the minimum-distance one.
 const choices=[];
 if(boundX>=minX){
  choices.push({x:minX,z:pz},{x:-minX,z:pz});
 }
 if(boundZ>=minZ){
  choices.push({x:px,z:minZ},{x:px,z:-minZ});
 }
 if(!choices.length)throw Error('No hay espacio exterior disponible para este objeto');
 choices.sort((a,b)=>(a.x-px)**2+(a.z-pz)**2-
                     ((b.x-px)**2+(b.z-pz)**2));
 return choices[0];
}
export function assertPlacement(x,z,halfX=0,halfZ=0){
 if(!validPlacement(x,z,halfX,halfZ))
  throw Error('Objeto decorativo dentro de la zona de juego o fuera del escenario');
}
