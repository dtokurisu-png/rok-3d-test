/* R.O.K. 3D · Minimal manual WASD for the Arena 2.5D.
   Press W/A/S/D or hold a D-pad button to take control immediately.
   No activation checkbox; FBX loading is nonblocking and affects only pose. */
export function createCasterMobility({THREE,getCaster,prepareClips,onStatus,onModeChange,reviveCaster,onAttack}){
 const $=id=>document.getElementById(id);
 const select=$('casterMoveSide'),speed=$('casterMoveSpeed'),speedText=$('casterMoveSpeedText'),
  status=$('casterMoveStatus'),attackButton=$('casterAttackButton');
 const buttons=[...document.querySelectorAll('#casterMobilityPanel [data-move-key]')];
 if(!select||!speed||!speedText||!status||!attackButton||buttons.length!==4)
  throw Error('Faltan botones o control de velocidad WASD');
 const directions={KeyW:'forward',KeyS:'backward',KeyA:'left',KeyD:'right'};
 const held=new Set(),clips=new Map();
 let enabled=false,caster=null,lastMotion=null,previousPlaying=false;
 let preparedModel=null,loadingModel=null,revision=0,shownMessage='';
 let attackAction=null,attackElapsed=0,attackDuration=0,attackReleased=false,attackCooldown=0;
 const notify=(message)=>{
  status.textContent=message;status.title=message;
  if(message!==shownMessage){shownMessage=message;onStatus?.(message);}
 };
 const selected=()=>getCaster(select.value);
 function motion(){
  const forward=(held.has('KeyW')?1:0)-(held.has('KeyS')?1:0);
  const lateral=(held.has('KeyD')?1:0)-(held.has('KeyA')?1:0);
  const kind=forward>0?'forward':forward<0?'backward':lateral<0?'left':lateral>0?'right':'idle';
  return {forward,lateral,kind};
 }
 function keyLabel(){
  for(const button of buttons)button.dataset.held=String(held.has(button.dataset.moveKey));
 }
 function clearKeys(){held.clear();keyLabel();}
 function cancelAttack(){attackAction=null;attackElapsed=0;attackDuration=0;attackReleased=false;attackCooldown=0;}
 function stopAction(c){
  if(!c?.mixer)return;
  c.mixer.stopAllAction();
  if(c.userData)delete c.userData.manualAction;
  if(c.idleClip)c.mixer.clipAction(c.idleClip).reset().play();
 }
 function stop(){
  ++revision;clearKeys();
  if(!enabled)return;
  cancelAttack();
  stopAction(caster);
  enabled=false;caster=null;lastMotion=null;preparedModel=null;loadingModel=null;clips.clear();
  onModeChange?.(false,previousPlaying);
  notify('WASD · listo');
 }
 function engage(){
  if(enabled)return true;
  const next=selected();
  if(!next){notify('Cargando caster…');return false;}
  if(next.stage!=='active')reviveCaster?.(next);
  if(next.stage!=='active'){notify('Caster no disponible');return false;}
  caster=next;enabled=true;lastMotion=null;
  cancelAttack();
  previousPlaying=onModeChange?.(true)??false;
  notify('Control manual activo');
  return true;
 }
 function requestClips(c){
  if(!c?.model?.userData?.rokCasterAsset||preparedModel===c.model||loadingModel===c.model)return;
  const model=c.model,ticket=++revision;
  loadingModel=model;
  notify('Moviendo · cargando animaciones…');
  Promise.resolve().then(()=>prepareClips(c)).then(result=>{
   if(ticket!==revision||!enabled||selected()!==c||c.model!==model)return;
   clips.clear();
   for(const name of ['idle','forward','backward','left','right','attack','death'])
    if(result?.[name])clips.set(name,result[name]);
   preparedModel=model;loadingModel=null;lastMotion=null;
   const missing=result?._unavailable||[];
   notify(missing.length?'WASD · FBX '+missing.join(', ')+' en respaldo':'WASD · animaciones listas');
  }).catch(error=>{
   if(ticket!==revision||!enabled)return;
   loadingModel=null;preparedModel=model;lastMotion=null;
   notify('WASD activo · sin FBX: '+String(error.message||error));
  });
 }
 function animate(c,kind){
  if(!c?.mixer||kind===lastMotion)return;
  const clip=clips.get(kind)||c.idleClip;
  if(!clip)return;
  const old=c.userData?.manualAction||null;
  const next=c.mixer.clipAction(clip);
  if(old!==next){
   next.reset();next.enabled=true;next.setEffectiveWeight(1);next.setEffectiveTimeScale(1);
   next.setLoop(THREE.LoopRepeat,Infinity);next.play();
   if(old){old.fadeOut(.12);next.fadeIn(.12);}
  }else if(!next.isRunning())next.play();
  c.userData=c.userData||{};
  c.userData.manualAction=next;
  lastMotion=kind;
 }
 // Attack 02 is a simple provisional ranged action; NOT a composed 21/22/23 clip.
 function startAttack(){
  if(!engage())return false;
  const c=selected();
  if(c!==caster||c.stage!=='active'||attackCooldown>0||attackAction)return false;
  const clip=clips.get('attack');
  if(!clip||clip.duration<=0){notify('Ataque 02 cargando…');requestClips(c);return false;}
  c.mixer.stopAllAction();
  const action=c.mixer.clipAction(clip);
  action.reset().setLoop(THREE.LoopOnce,1);
  action.clampWhenFinished=true;
  action.enabled=true;action.setEffectiveWeight(1);action.setEffectiveTimeScale(1);action.play();
  c.userData=c.userData||{};c.userData.manualAction=action;
  attackAction=action;attackElapsed=0;
  attackDuration=Math.max(.1,clip.duration);
  attackReleased=false;attackCooldown=Math.max(1.6,attackDuration);
  lastMotion=null;
  notify('Ataque 02 · lanzamiento');
  return true;
 }
 function step(dt){
  if(!enabled){
   if(held.size&&!engage())return;
   if(!enabled)return;
  }
  const c=selected();
  if(!c||c!==caster)return;
  if(c.stage!=='active')return;
  if(preparedModel!==c.model){
   if(loadingModel&&loadingModel!==c.model){loadingModel=null;clips.clear();lastMotion=null;}
   requestClips(c);
  }
  attackCooldown=Math.max(0,attackCooldown-dt);
  const {forward,lateral,kind}=motion();
  if(attackAction){
   attackElapsed+=dt;
   if(!attackReleased&&attackElapsed>=attackDuration*.55){
    attackReleased=true;
    onAttack?.(c);
   }
   if(attackElapsed>=attackDuration){
    attackAction=null;lastMotion=null;
    notify('WASD · ataque disponible');
   }
   c.mixer.update(dt);
   return; // Attack takes priority over locomotion until release.
  }
  if(forward||lateral){
   const length=Math.hypot(forward,lateral),v=Number(speed.value)||2.2;
   const sign=c.side==='ally'?-1:1;
   const maxDt=Math.min(Math.max(dt,0),.05);
   c.outer.position.x=THREE.MathUtils.clamp(c.outer.position.x+lateral/length*v*maxDt,-4.25,4.25);
   c.outer.position.z=THREE.MathUtils.clamp(c.outer.position.z+forward/length*sign*v*maxDt,-8.75,8.75);
  }
  animate(c,kind);
  c.mixer.update(dt);
 }
 function inputKey(event,down){
  if(event.code==='KeyF'){
   if(down&&!event.repeat)startAttack();
   event.preventDefault();return;
  }
  if(!Object.hasOwn(directions,event.code))return;
  if(down&&event.target?.closest?.('textarea,select,[contenteditable="true"],input:not([type="range"])'))return;
  if(down)held.add(event.code);else held.delete(event.code);
  event.preventDefault();
  keyLabel();
  if(down)engage();
 }
 document.addEventListener('keydown',e=>inputKey(e,true));
 document.addEventListener('keyup',e=>inputKey(e,false));
 for(const button of buttons){
  const code=button.dataset.moveKey;
  if(!Object.hasOwn(directions,code))throw Error('Tecla direccional no válida');
  const release=()=>{held.delete(code);keyLabel();};
  button.addEventListener('pointerdown',e=>{
   e.preventDefault();held.add(code);keyLabel();
   if(typeof button.setPointerCapture==='function')button.setPointerCapture(e.pointerId);
   engage();
  });
  button.addEventListener('pointerup',release);
  button.addEventListener('pointercancel',release);
  button.addEventListener('lostpointercapture',release);
 }
 attackButton.addEventListener('click',()=>{attackButton.blur();startAttack();});
 window.addEventListener('blur',clearKeys);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys();});
 select.addEventListener('change',()=>{stop();select.blur();});
 speed.addEventListener('input',()=>{speedText.textContent=Number(speed.value).toFixed(1);});
 notify('WASD · listo');
 return {step,disable:stop,startAttack,get enabled(){return enabled;},get caster(){return caster;}};
}
