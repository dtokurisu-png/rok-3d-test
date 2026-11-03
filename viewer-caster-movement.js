/* R.O.K. 3D — Viewer-only caster controller.
 * Arena key layout: WASD, Space (attack), held Shift (guard).
 * Uses previously retargeted viewer clips / the same layered animation
 * system as the arena. No target acquisition, damage, VFX or projectile.
 * Missing clips load on demand, never an eager full-palette reload.
 */
export function createViewerCasterMovement({
 getCharacter,getModel,getMixer,ensureClip,getClip,ensureIdle,
 getActionClip,makeLayers,playIdle,onMessage
}){
 const $=id=>document.getElementById(id);
 const toggle=$('viewerMoveEnable'),status=$('viewerMoveStatus');
 const speed=$('viewerMoveSpeed'),speedOut=$('viewerMoveSpeedValue');
 const keysOut=$('viewerMoveKeys');
 const attackButton=$('viewerAttackButton'),guardButton=$('viewerDefenseButton');
 const roles={KeyW:'forward',KeyS:'backward',KeyA:'left',KeyD:'right'};
 // Source 15 is Right Strafe; source 16 is its opposite mirrored variant.
 // The previous mapping played them backwards to the direction requested.
 const motionIds={forward:7,backward:6,left:16,right:15};
 const held=new Set(),guards=new Set();
 const loaded=new Map(),loading=new Map();
 let enabled=false,revision=0,prepared=null;
 let last='none',originalPosition=null,originalRotation=null;
 let defending=false,guardLoading=false,attackLoading=false;
 let attackRemaining=0,attackCooldown=0;
 let pendingAttack=false;
 function report(message){status.textContent=message;onMessage?.(message);}
 const valid=()=>['chiara','lioren','astarium','controladora','semillera','kariona','telepate'].includes(getCharacter())&&!!getModel()&&!!getMixer();
 const suspendedTarget=target=>target?.closest?.('textarea,select,[contenteditable="true"],input:not([type="range"])');
 const displayKeys=()=>{
  keysOut.textContent=[...held,...guards].map(k=>k.startsWith('Key')?k.slice(3):'Shift').join(' + ')||'—';
 };
 const refreshButtons=()=>{
  for(const b of document.querySelectorAll('#viewerMovePanel [data-wasd]'))
   b.dataset.held=String(held.has(b.dataset.wasd));
  guardButton.dataset.held=String(defending||guards.size>0);
 };
 function motion(){
  const f=Number(held.has('KeyW'))-Number(held.has('KeyS'));
  const x=Number(held.has('KeyD'))-Number(held.has('KeyA'));
  return {forward:f,lateral:x,kind:f>0?'forward':f<0?'backward':
   x<0?'left':x>0?'right':'idle'};
 }
 const stillCurrent=(ticket,model,character)=>
  enabled&&ticket===revision&&prepared?.model===model&&getModel()===model&&getCharacter()===character;
 function clearHeld(){held.clear();guards.clear();displayKeys();refreshButtons();}
 function disable(){
  revision++;
  const previous=prepared;
  enabled=false;toggle.checked=false;
  defending=false;guardLoading=false;attackLoading=false;pendingAttack=false;
  attackRemaining=0;attackCooldown=0;
  clearHeld();
  if(previous){
   previous.layers.endUpper(previous.caster);
   previous.layers.reset(previous.caster);
   previous.mixer.stopAllAction();
   if(previous.model===getModel()){
    if(originalPosition)previous.model.position.copy(originalPosition);
    if(originalRotation!==null)previous.model.rotation.y=originalRotation;
    // Return control to the original viewer/player and its frame inspector.
    if(playIdle)playIdle(previous.idle);
    else if(previous.idle)previous.mixer.clipAction(previous.idle).reset().play();
   }
  }
  originalPosition=null;originalRotation=null;
  prepared=null;last='none';loaded.clear();loading.clear();
  report('Prueba desactivada · sin cambios en la arena.');
 }
 async function ensure(id,ticket,model,character){
  const existing=getClip(id);
  if(existing)return existing;
  if(loading.has(id))return loading.get(id);
  const promise=Promise.resolve().then(()=>ensureClip(id)).then(()=>{
   if(!stillCurrent(ticket,model,character))return null;
   return getClip(id)||null;
  }).finally(()=>loading.delete(id));
  loading.set(id,promise);
  return promise;
 }
 async function enable(){
  if(enabled)return;
  if(!valid()){toggle.checked=false;report('Selecciona Chiara o Lioren.');return;}
  const ticket=++revision,model=getModel(),character=getCharacter(),mixer=getMixer();
  enabled=true;originalPosition=model.position.clone();originalRotation=model.rotation.y;
  report('Preparando locomoción sin volver a descargar el catálogo…');
  try{
   const idle=await ensureIdle();
   if(!enabled||ticket!==revision||model!==getModel()||character!==getCharacter())return;
   const caster={model,mixer,idleClip:idle};
   const layers=makeLayers();
   prepared={model,character,mixer,idle,caster,layers};
   loaded.set('idle',idle);
   // All controllable casters face the same viewer forward (-Z).
   // This makes W move forward, S back, A left and D right on screen.
   model.rotation.y=originalRotation+Math.PI;
   layers.register(caster,{idle});
   layers.movement(caster,'idle');
   last='idle';
   report('Listo · WASD mover · Espacio atacar · Shift defender (solo animación).');
  }catch(error){
   if(ticket!==revision)return;
   report('No se pudo preparar el visor: '+String(error?.message||error));
   disable();
  }
 }
 function requestMotion(kind){
  const st=prepared;
  if(!st||kind==='idle'){
   if(st)st.layers.movement(st.caster,'idle');
   return;
  }
  const existing=loaded.get(kind);
  if(existing){
   st.layers.register(st.caster,{[kind]:existing});
   st.layers.movement(st.caster,kind);
   return;
  }
  // Movement can start immediately while the FBX downloads.
  st.layers.movement(st.caster,'idle');
  if(loading.has('motion:'+kind))return;
  const ticket=revision;
  const promise=ensure(motionIds[kind],ticket,st.model,st.character)
   .then(clip=>{
    if(!stillCurrent(ticket,st.model,st.character)||!clip)return;
    loaded.set(kind,clip);
    st.layers.register(st.caster,{[kind]:clip});
    if(motion().kind===kind)st.layers.movement(st.caster,kind);
   }).catch(e=>{
    if(stillCurrent(ticket,st.model,st.character))
     report('Movimiento '+kind+': '+String(e?.message||e));
   }).finally(()=>loading.delete('motion:'+kind));
  loading.set('motion:'+kind,promise);
 }
 async function startAttack(){
  if(!enabled||!prepared||defending||guardLoading||guards.size>0||attackRemaining>0||attackCooldown>0||attackLoading)return false;
  const st=prepared,ticket=revision;
  attackLoading=true;
  report('Preparando ataque compuesto 24 con los FBX disponibles…');
  try{
   const clip=await getActionClip('attack',st.model,st.character);
   if(!stillCurrent(ticket,st.model,st.character)||defending||!clip)return false;
   st.layers.upper(st.caster,'attack',clip,clip.duration/1);
   attackRemaining=1;attackCooldown=1;pendingAttack=false;
   report('Ataque compuesto · animación solamente (sin proyectiles).');
   return true;
  }catch(error){
   if(stillCurrent(ticket,st.model,st.character))
    report('Ataque 02: '+String(error?.message||error));
   return false;
  }finally{attackLoading=false;}
 }
 async function setDefense(on){
  if(!enabled||!prepared)return false;
  if(!on){
   defending=false;guardLoading=false;
   prepared.layers.endUpper(prepared.caster,'defense');
   report('Defensa finalizada · solo previsualización.');
   refreshButtons();
   return false;
  }
  if(defending||guardLoading)return true;
  const st=prepared,ticket=revision;
  guardLoading=true;
  report('Preparando defensa compuesta 29 con los FBX disponibles…');
  try{
   const clip=await getActionClip('defense',st.model,st.character);
   if(!stillCurrent(ticket,st.model,st.character)||!guards.size||!clip)return false;
   st.layers.endUpper(st.caster,'attack');
   attackRemaining=0;pendingAttack=false;
   st.layers.upper(st.caster,'defense',clip,clip.duration/1.1);
   defending=true;
   report('Defensa compuesta · mantener Shift · sin escudo visual ni daño.');
   refreshButtons();
   return true;
  }catch(error){
   if(stillCurrent(ticket,st.model,st.character))
    report('Defensa 23: '+String(error?.message||error));
   return false;
  }finally{guardLoading=false;}
 }
 function keyboard(event,pressed){
  const code=event.code;
  const isGuard=code==='ShiftLeft'||code==='ShiftRight';
  if(!enabled||(!Object.hasOwn(roles,code)&&code!=='Space'&&!isGuard))return;
  if(pressed&&suspendedTarget(event.target))return;
  event.preventDefault();
  if(code==='Space'){
   if(pressed&&!event.repeat)void startAttack();
  }else if(isGuard){
   if(pressed)guards.add(code);else guards.delete(code);
   if(guards.size)void setDefense(true);
   else void setDefense(false);
  }else{
   if(pressed)held.add(code);else held.delete(code);
  }
  displayKeys();refreshButtons();
 }
 window.addEventListener('keydown',e=>keyboard(e,true));
 window.addEventListener('keyup',e=>keyboard(e,false));
 for(const button of document.querySelectorAll('#viewerMovePanel [data-wasd]')){
  const code=button.dataset.wasd;
  const release=()=>{held.delete(code);displayKeys();refreshButtons();};
  button.addEventListener('pointerdown',event=>{
   if(!enabled)return;
   event.preventDefault();
   if(button.setPointerCapture)button.setPointerCapture(event.pointerId);
   held.add(code);displayKeys();refreshButtons();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])
   button.addEventListener(type,release);
 }
 attackButton.addEventListener('click',()=>{
  attackButton.blur();void startAttack();
 });
 guardButton.addEventListener('pointerdown',event=>{
  if(!enabled)return;
  event.preventDefault();
  if(guardButton.setPointerCapture)guardButton.setPointerCapture(event.pointerId);
  guards.add('PointerShift');displayKeys();refreshButtons();
  void setDefense(true);
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])
  guardButton.addEventListener(type,()=>{
   guards.delete('PointerShift');displayKeys();refreshButtons();
   if(!guards.size)void setDefense(false);
  });
 toggle.addEventListener('change',()=>{toggle.blur();toggle.checked?void enable():disable();});
 window.addEventListener('blur',()=>{clearHeld();void setDefense(false);});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){clearHeld();void setDefense(false);}
 });
 speed.addEventListener('input',()=>{speedOut.textContent=Number(speed.value).toFixed(1)+' u/s';});
 function update(dt){
  if(!enabled||!prepared||prepared.model!==getModel())return;
  const step=Math.min(.05,Math.max(0,dt));
  attackCooldown=Math.max(0,attackCooldown-step);
  if(attackRemaining>0){
   attackRemaining=Math.max(0,attackRemaining-step);
   if(!attackRemaining&&!defending)prepared.layers.endUpper(prepared.caster,'attack');
  }
  const {forward,lateral,kind}=motion();
  if(kind!==last){
   requestMotion(kind);
   last=kind;
  }
  if(!forward&&!lateral)return;
  const len=Math.hypot(forward,lateral),velocity=Number(speed.value)||3.8;
  // Viewer front is -Z for both casters, matching the visible animations.
  const p=prepared.model.position;
  p.x=Math.max(originalPosition.x-7.25,Math.min(originalPosition.x+7.25,
   p.x+lateral/len*velocity*step));
  p.z=Math.max(originalPosition.z-14.75,Math.min(originalPosition.z+14.75,
   p.z-forward/len*velocity*step));
 }
 return {update,disable,startAttack,setDefense,get enabled(){return enabled;},
  get defending(){return defending;}};
}
