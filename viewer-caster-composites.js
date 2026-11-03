/* R.O.K. 3D — Composite animations for the EXISTING numbered viewer catalog.
 * Bake playable local AnimationClips from the same upper/lower bone masks as
 * the arena. Source FBXs and the original catalog remain untouched.
 */
export const COMPOSITE_PRESETS=Object.freeze([
 {index:24,name:'Compuesta · Idle + Ataque 02',motion:'idle',action:'attack',source:2},
 {index:25,name:'Compuesta · Adelante 07 + Ataque 02',motion:'forward',action:'attack',source:2},
 {index:26,name:'Compuesta · Atrás 06 + Ataque 02',motion:'backward',action:'attack',source:2},
 {index:27,name:'Compuesta · Izquierda 15 + Ataque 02',motion:'left',action:'attack',source:2},
 {index:28,name:'Compuesta · Derecha 16 + Ataque 02',motion:'right',action:'attack',source:2},
 {index:29,name:'Compuesta · Idle + Defensa 23',motion:'idle',action:'defense',source:23},
 {index:30,name:'Compuesta · Adelante 07 + Defensa 23',motion:'forward',action:'defense',source:23},
 {index:31,name:'Compuesta · Atrás 06 + Defensa 23',motion:'backward',action:'defense',source:23},
 {index:32,name:'Compuesta · Izquierda 15 + Defensa 23',motion:'left',action:'defense',source:23},
 {index:33,name:'Compuesta · Derecha 16 + Defensa 23',motion:'right',action:'defense',source:23}
]);
export const COMPOSITE_MOTION_IDS=Object.freeze({forward:7,backward:6,left:15,right:16});
const lower=new Set(['hips','leftupleg','rightupleg','leftleg','rightleg',
 'leftfoot','rightfoot','lefttoebase','righttoebase','lefttoe','righttoe',
 'lefttoes','righttoes','leftfootend','rightfootend']);
const boneKey=name=>String(name).replace(/^.*?mixamorig[:_]?/i,'')
 .replace(/[^a-z0-9]/gi,'').toLowerCase();
const trackBone=name=>boneKey(name.replace(/\.(quaternion|position|scale)$/,'').replace(/^\.bones\[(.*)\]$/,'$1'));
function motionTrack(track){return lower.has(trackBone(track.name));}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function buildCasterCompositeClip(THREE,{preset,motionClip,actionClip,idleClip,fps=30}){
 if(!preset||!motionClip||!actionClip)throw Error('Faltan clips para la composición');
 const defending=preset.action==='defense';
 if(preset.action!=='attack'&&!defending)throw Error('Tipo de composición inválido');
 const period=defending?2:1.2;
 const count=Math.ceil(period*fps),times=[];
 for(let i=0;i<=count;i++)times.push(i*period/count);
 const movement=motionClip.tracks.filter(t=>
  motionTrack(t)&&/\.(quaternion|position)$/.test(t.name));
 const sourceUpper=actionClip.tracks.filter(t=>
  !motionTrack(t)&&/\.quaternion$/.test(t.name));
 if(!movement.length||!sourceUpper.length)throw Error('El rig no tiene pistas de piernas y torso compatibles');
 const idleUpper=new Map((idleClip?.tracks||[]).filter(t=>
  !motionTrack(t)&&/\.quaternion$/.test(t.name)).map(t=>[t.name,t]));
 const motionUpper=new Map(motionClip.tracks.filter(t=>
  !motionTrack(t)&&/\.quaternion$/.test(t.name)).map(t=>[t.name,t]));
 const baked=[];
 function appendTrack(source,values){
  const type=source.ValueTypeName==='quaternion'||/\.quaternion$/.test(source.name)?
   THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;
  baked.push(new type(source.name,times,values));
 }
 // Legs and hips continue looping. Do not copy position tracks from the
 // attack/defense clip: they would displace the model or interrupt walking.
 for(const track of movement){
  const interpolant=track.createInterpolant(),value=[];
  const span=Math.max(.0001,motionClip.duration);
  for(const t of times){
   const sample=Math.min(span-.000001,t%span);
   value.push(...interpolant.evaluate(sample));
  }
  appendTrack(track,value);
 }
 for(const attackTrack of sourceUpper){
  const interp=attackTrack.createInterpolant();
  const base=motionUpper.get(attackTrack.name)||idleUpper.get(attackTrack.name);
  const baseInterp=base?.createInterpolant();
  const value=[];
  for(const t of times){
   const attackTime=defending?
    Math.min(actionClip.duration-.000001,t*1.8):
    Math.min(actionClip.duration-.000001,t*actionClip.duration);
   const result=Array.from(interp.evaluate(Math.max(0,attackTime)));
   if(!defending&&t>1&&baseInterp){
    const desired=Array.from(baseInterp.evaluate(Math.min(Math.max(.0001,motionClip.duration)-.000001,
     t%Math.max(.0001,motionClip.duration))));
    const q1=new THREE.Quaternion().fromArray(result),q2=new THREE.Quaternion().fromArray(desired);
    q1.slerp(q2,clamp((t-1)/.2,0,1));q1.toArray(result);
   }
   value.push(...result);
  }
  appendTrack(attackTrack,value);
 }
 // Not an imitation or a label-only entry: this is a real, sampled
 // AnimationClip usable by the shared viewer timeline/frame inspector.
 const clip=new THREE.AnimationClip(preset.name,period,baked);
 clip.userData={rokComposite:true,kind:preset.action,motion:preset.motion,
  origin:motionClip.name,actionSource:actionClip.name};
 return clip;
}
