/* R.O.K. 3D · Caster manual locomotion, isolated from autonomous combat.
   Movement uses world-aligned WASD relative to each caster's fixed forward.
   Original clips / model data are never modified. */
export function createCasterMobility({THREE,getCaster,prepareClips,onStatus,onModeChange}){
 const $=id=>document.getElementById(id);
 const controls={
  enable:$('casterMoveEnable'),side:$('casterMoveSide'),speed:$('casterMoveSpeed'),
  speedText:$('casterMoveSpeedText'),status:$('casterMoveStatus'),keys:$('casterMoveKeys')
 };
 const required=Object.values(controls);
 if(required.some(x=>!x))throw Error('Controles WASD incompletos');
 const keyMap={KeyW:'forward',KeyS:'backward',KeyA:'left',KeyD:'right'};
 const actions={forward:7,backward:6,left:15,right:16};
 const keys=new Set();
 const clips=new Map();
 let enabled=false,requested=0,activeCaster=null,lastMotion='idle',priorPlaying=false;
 const announce=text=>{controls.status.textContent=text;onStatus?.(text);};
 function selected(){return getCaster(controls.side.value);}
 function clearKeys(){keys.clear();controls.keys.textContent='—';}
 function playClip(c,key){
  if(!c?.mixer)return;
  const wanted=clips.get(key)||c.idleClip;
  if(!wanted)return;
  if(activeCaster===c&&lastMotion===key)return;
  const from=c.userData?.manualAction||null;
  const to=c.mixer.clipAction(wanted);
  to.reset().setLoop(THREE.LoopRepeat,Infinity);
  to.enabled=true;to.setEffectiveWeight(1);to.setEffectiveTimeScale(1);
  to.play();
  if(from&&from!==to){from.fadeOut(.15);to.fadeIn(.15);}
  c.userData=c.userData||{};c.userData.manualAction=to;
  lastMotion=key;activeCaster=c;
 }
 function stopManualAction(c){
  if(!c)return;
  c.mixer?.stopAllAction();
  if(c.userData)delete c.userData.manualAction;
  if(c.idleClip)c.mixer?.clipAction(c.idleClip).reset().play();
 }
 function active(value){
  if(value===enabled)return;
  enabled=value;
  clearKeys();
  ++requested;
  const caster=selected();
  if(value){
   if(!caster||!caster.model?.userData?.rokCasterAsset){
    enabled=false;controls.enable.checked=false;
    announce('El caster real aún no está disponible.');return;
   }
   priorPlaying=onModeChange(true);
   activeCaster=caster;lastMotion='';
   cReset(caster);
   announce('Modo manual: preparando animaciones…');
   const ticket=requested,model=caster.model,character=controls.side.value;
   prepareClips(caster).then(result=>{
    if(ticket!==requested||!enabled||selected()!==caster||caster.model!==model)return;
    clips.clear();for(const [name,clip] of Object.entries(result))if(clip)clips.set(name,clip);
    cReset(caster);playClip(caster,'idle');
    const missing=['idle','forward','backward','left','right'].filter(name=>!clips.has(name));
    announce(missing.length?'Movimiento preparado, faltan: '+missing.join(', '):'WASD listo · '+character+' · Idle nuevo activo');
   }).catch(err=>{
    if(ticket!==requested)return;
    announce('No se pudieron preparar las animaciones: '+String(err.message||err));
    disable();
   });
  }else{
   stopManualAction(activeCaster);
   activeCaster=null;lastMotion='idle';
   onModeChange(false,priorPlaying);
   announce('Control manual desactivado · combate automático');
  }
 }
 function cReset(c){if(c?.mixer)c.mixer.timeScale=1;}
 function disable(){controls.enable.checked=false;active(false);}
 function setSide(){
  clearKeys();
  if(!enabled)return;
  active(false);
  active(true);
 }
 function chooseAction(){
  // Priority to forward/backward for diagonals; normalized motion prevents speed boost.
  const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);
  const lateral=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
  return {forward,lateral,kind:forward>0?'forward':forward<0?'backward':lateral<0?'left':lateral>0?'right':'idle'};
 }
 function step(dt){
  if(!enabled)return;
  const c=selected();
  if(!c||c!==activeCaster||c.stage!=='active')return;
  if(!clips.has('idle')||!clips.has('forward')||!clips.has('backward')||!clips.has('left')||!clips.has('right'))return;
  const move=chooseAction(),speed=Number(controls.speed.value)||2.2;
  if(move.kind!=='idle'){
   const length=Math.hypot(move.lateral,move.forward)||1;
   const sideSign=c.side==='ally'?-1:1;
   c.outer.position.x=THREE.MathUtils.clamp(c.outer.position.x+move.lateral/length*speed*dt,-4.25,4.25);
   c.outer.position.z=THREE.MathUtils.clamp(c.outer.position.z+move.forward/length*sideSign*speed*dt,-8.75,8.75);
   // Maintain the original facing while strafing and stepping back.
  }
  playClip(c,move.kind);
  c.mixer.update(dt);
 }
 function onKey(event,pressed){
  if(!enabled||!Object.hasOwn(keyMap,event.code))return;
  const target=event.target;
  if(target?.closest?.('input, textarea, select, [contenteditable="true"]'))return;
  if(pressed)keys.add(event.code);else keys.delete(event.code);
  event.preventDefault();
  controls.keys.textContent=[...keys].map(k=>k.replace('Key','')).join(' + ')||'—';
 }
 document.addEventListener('keydown',e=>onKey(e,true));
 document.addEventListener('keyup',e=>onKey(e,false));
 window.addEventListener('blur',clearKeys);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys();});
 controls.enable.addEventListener('change',()=>active(controls.enable.checked));
 controls.side.addEventListener('change',setSide);
 controls.speed.addEventListener('input',()=>controls.speedText.textContent=Number(controls.speed.value).toFixed(1)+' u/s');
 return {step,disable,get enabled(){return enabled;},get caster(){return activeCaster;}};
}
