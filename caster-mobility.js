/* R.O.K. Arena 2.5D: WASD locomotion + independent upper-body attack/guard.
 * All actions share the original caster mixer and keep the rest of combat live.
 */
export function createCasterMobility({THREE,getCaster,prepareClips,onStatus,
 onModeChange,reviveCaster,getAttackTarget,onAttack,layers,canControl=()=>true,bounds={x:7.25,z:14.75}}){
 const $=id=>document.getElementById(id);
 const select=$('casterMoveSide'),speed=$('casterMoveSpeed'),speedText=$('casterMoveSpeedText'),
  status=$('casterMoveStatus'),attackButton=$('casterAttackButton'),defenseButton=$('casterDefenseButton');
 const buttons=[...document.querySelectorAll('#casterMobilityPanel [data-move-key]')];
 if(!select||!speed||!speedText||!status||!attackButton||!defenseButton||buttons.length!==4||!layers)
  throw Error('Controles WASD o sistema de capas de caster incompletos');
 const directions={KeyW:'forward',KeyS:'backward',KeyA:'left',KeyD:'right'};
 const held=new Set(),defenseKeys=new Set(),clips=new Map();
 let mobileAxisX=0,mobileAxisY=0;
 let enabled=false,caster=null,loadedModel=null,loadingModel=null,revision=0;
 const ATTACK_PERIOD=1;
 const WALK_SPEED=3.8;
 let priorPlaying=false,attackElapsed=0,attackDuration=0,attackReleased=false,attackCooldown=0;
 let committedAttackTarget=null;
 let defending=false,shown='';
 let cardCast=null;
 const notify=message=>{
  status.textContent=message;status.title=message;
  if(message!==shown){shown=message;onStatus?.(message);}
 };
 const selected=()=>getCaster(select.value);
 function clearMovement(){
  mobileAxisX=0;mobileAxisY=0;
  held.clear();
  for(const button of buttons)button.dataset.held='false';
 }
 function motion(){
  const forward=THREE.MathUtils.clamp((held.has('KeyW')?1:0)-(held.has('KeyS')?1:0)+mobileAxisY,-1,1);
  const lateral=THREE.MathUtils.clamp((held.has('KeyD')?1:0)-(held.has('KeyA')?1:0)+mobileAxisX,-1,1);
  return {forward,lateral,kind:forward>0?'forward':forward<0?'backward':
   lateral<0?'left':lateral>0?'right':'idle'};
 }
 function engage(){
  if(!canControl())return false;
  if(enabled&&caster===selected()&&caster?.model)return true;
  const c=selected();
  if(!c){notify('Cargando caster…');return false;}
  if(c.stage!=='active')reviveCaster?.(c);
  if(c.stage!=='active'){notify('Caster no disponible');return false;}
  caster=c;enabled=true;
  layers.register(c,{idle:c.idleClip});
  layers.movement(c,'idle');
  priorPlaying=onModeChange?.(true)??false;
  notify('WASD · listo');
  return true;
 }
 function requestClips(c){
  // The provisional Farolera rig also supports Mixamo animation retargeting.
  // Do not restrict forward/attack loading to the optional Lioren/Chiara GLBs.
  if(!c?.model||loadingModel===c.model||loadedModel===c.model)return;
  const model=c.model,ticket=++revision;
  loadingModel=model;
  Promise.resolve().then(()=>prepareClips(c)).then(result=>{
   if(ticket!==revision||!enabled||caster!==c||c.model!==model)return;
   for(const role of ['idle','forward','backward','left','right','attack','castPrepare','castFinish','death','defense','hit'])
    if(result?.[role])clips.set(role,result[role]);
   layers.register(c,result);
   loadedModel=model;loadingModel=null;
   const missing=result?._unavailable||[];
   notify(missing.length?'WASD listo · algunos FBX sin cargar':'WASD · animaciones listas');
  }).catch(e=>{
   if(ticket!==revision||!enabled)return;
   loadedModel=model;loadingModel=null;
   notify('WASD operativo · FBX: '+String(e?.message||e));
  });
 }
 function stop(){
  ++revision;
  clearMovement();defenseKeys.clear();
  if(!enabled)return;
  setDefense(false);
  attackDuration=0;attackElapsed=0;attackReleased=false;attackCooldown=0;
  committedAttackTarget=null;
  if(caster){
   cancelCardCast(caster);
   caster.manualDefending=false;
   layers.shield(caster,false);
   layers.reset(caster);
   caster.mixer?.stopAllAction();
   if(caster.idleClip)caster.mixer?.clipAction(caster.idleClip).reset().play();
  }
  enabled=false;caster=null;loadedModel=null;loadingModel=null;clips.clear();
  onModeChange?.(false,priorPlaying);
  notify('WASD · listo');
 }
 function setDefense(value){
  if(value&&(!engage()||caster.stage!=='active'))return false;
  if(value===defending)return defending;
  defending=value;
  defenseButton.dataset.held=String(value);
  if(caster){
   caster.manualDefending=value;
   if(value){
    // Guard supersedes attack, but never suspends leg motion.
    attackDuration=0;attackReleased=false;committedAttackTarget=null;
    cancelCardCast(caster);
    layers.endUpper(caster,'attack');
    const clip=clips.get('defense')||caster.model?.userData?.rokDefenseClip;
    if(clip)layers.upper(caster,'defense',clip,1.8);
    layers.cancelHit(caster);
    layers.shield(caster,true);
   }else{
    layers.shield(caster,false);
    layers.endUpper(caster,'defense');
   }
  }
  notify(value?'Defensa activa · escudo frontal':'WASD · defensa finalizada');
  return value;
 }
 function startAttack(){
  if(!engage())return false;
  const c=caster;
  if(c.stage!=='active'||defending||attackDuration>0||attackCooldown>0||cardCast)return false;
  // Validate ON PRESS, not at projectile release. A caster can move away
  // during wind-up without cancelling the already accepted attack.
  const target=getAttackTarget?.(c)||null;
  if(!target){notify('Sin enemigo al alcance · ataque no iniciado');return false;}
  const clip=clips.get('attack')||c.model?.userData?.rokAttackClip;
  if(!clip||clip.duration<=0){
   // Do not fire a projectile using a missing or substituted attack animation.
   requestClips(c);
   notify('Cargando ataque original 02 · inténtalo nuevamente');
   return false;
  }
  // The approved original Magic Heal attack begins at source frame 13,
  // omitting its slow preparation; finish the remaining motion in 1 second.
  const frame13=13/30;
  const startTime=clip.duration>frame13+.05?frame13:0;
  const attackSpeed=Math.max(.1,(clip.duration-startTime)/ATTACK_PERIOD);
  if(!layers.upper(c,'attack',clip,attackSpeed,{startTime})){
   notify('No se pudo activar la animación original 02');
   return false;
  }
  committedAttackTarget=target;
  attackElapsed=0;attackReleased=false;
  // Logical projectile timing works even if the FBX is still loading.
  attackDuration=ATTACK_PERIOD;
  attackCooldown=ATTACK_PERIOD;
  requestClips(c);
  notify('Ataque original 02 · Magic Heal');
  return true;
 }
 // Phase 3: two original clips compose one cast, without creating a card.
 // Clip 22 is TRIMMED at frame 48, normalized to the future cost-based time;
 // the action is committed only at that boundary, then clip 21 plays complete.
 function cancelCardCast(c){
  if(!cardCast)return;
  layers.clearCastLower(c);
  layers.endUpper(c,'card-cast');
  layers.endUpper(c,'card-finish');
  cardCast=null;
 }
 function castDuration(cost){
  const n=Math.max(0,Math.floor(Number(cost)||0));
  return n<=1?.5:n===2?1:n===3?1.5:n===4?2:2.5;
 }
 function startCardCast({cost=1,onRelease}={}){
  if(!engage())return false;
  const c=caster;
  if(c.stage!=='active'||defending||cardCast||attackDuration>0)return false;
  const source22=clips.get('castPrepare')||c.model?.userData?.rokCast22Clip;
  const source21=clips.get('castFinish')||c.model?.userData?.rokCast21Clip;
  if(!source22||!source21){
   requestClips(c);
   notify('Cargando animaciones 22 y 21 originales · repite la prueba');
   return false;
  }
  const fps=30;
  const clip22=THREE.AnimationUtils.subclip(source22,'ROK_Cast22_0_48',0,48,fps);
  if(!clip22.tracks.length||clip22.duration<=.01||source21.duration<=.01){
   notify('La animación 22 (0–48) o la 21 está incompleta');
   return false;
  }
  const duration=castDuration(cost);
  const speed=clip22.duration/duration;
  if(!layers.upper(c,'card-cast',clip22,speed)){
   notify('No hay huesos superiores válidos para el casteo 22');
   return false;
  }
  layers.setCastLower(c,clip22,speed,0);
  cardCast={caster:c,clip22,clip21:source21,duration,elapsed:0,
   postElapsed:0,phase:'preparing',onRelease:typeof onRelease==='function'?onRelease:null};
  notify('Casteo 22 · '+duration.toFixed(1)+' s · preparación');
  return true;
 }
 function stepCardCast(dt){
  const cast=cardCast;
  if(!cast)return;
  if(cast.caster!==caster||caster?.stage!=='active'){
   cancelCardCast(cast.caster);return;
  }
  if(cast.phase==='preparing'){
   cast.elapsed=Math.min(cast.duration,cast.elapsed+dt);
   layers.syncCastLower(caster,cast.elapsed/cast.duration);
   if(cast.elapsed>=cast.duration){
    cast.phase='finishing';cast.postElapsed=0;
    // Frame 48: this callback is the ONLY point at which a future card
    // can materialize; there is no cost handling in phase 3.
    try{cast.onRelease?.(caster);}catch(error){console.warn('[ROK] Casteo:',error);}
    layers.clearCastLower(caster);
    layers.endUpper(caster,'card-cast');
    if(!layers.upper(caster,'card-finish',cast.clip21,1)){
     cancelCardCast(caster);return;
    }
    layers.setCastLower(caster,cast.clip21,1,0);
    notify('Frame 48 · casteo ejecutado · animación 21');
   }
  }else{
   cast.postElapsed+=dt;
   layers.syncCastLower(caster,cast.postElapsed/Math.max(.01,cast.clip21.duration));
   if(cast.postElapsed>=cast.clip21.duration){
    cancelCardCast(caster);
    notify('Casteo compuesto completado · 22 → 21');
   }
  }
 }
 function step(dt){
  if(!enabled){if(held.size&&!engage())return;if(!enabled)return;}
  const c=selected();
  if(!c||c!==caster||c.stage!=='active')return;
  // A real GLB may replace the initial provisional model asynchronously.
  if(c.model!==loadedModel&&c.model!==loadingModel)requestClips(c);
  attackCooldown=Math.max(0,attackCooldown-dt);
  const {forward,lateral,kind}=motion();
  if(forward||lateral){
   const len=Math.hypot(forward,lateral),v=(Number(speed.value)||WALK_SPEED)*Math.min(1,len);
   const sign=c.side==='ally'?-1:1;
   const delta=Math.min(.05,Math.max(0,dt));
   c.outer.position.x=THREE.MathUtils.clamp(c.outer.position.x+lateral/len*v*delta,-bounds.x,bounds.x);
   c.outer.position.z=THREE.MathUtils.clamp(c.outer.position.z+forward/len*sign*v*delta,-bounds.z,bounds.z);
  }
  // Always update hips + legs, even while upper-body attack or guard plays.
  stepCardCast(dt);
  layers.movement(c,kind);
  if(attackDuration>0){
   attackElapsed+=dt;
   if(!attackReleased&&attackElapsed>=attackDuration*.55){
    attackReleased=true;
    onAttack?.(c,committedAttackTarget);
   }
   if(attackElapsed>=attackDuration){
    attackDuration=0;committedAttackTarget=null;
    layers.endUpper(c,'attack');
    notify('WASD · ataque terminado');
   }
  }
  c.mixer.update(dt);
 }
 function key(event,down){
  // Pre-match selection and portrait safety lock all gameplay inputs.
  // Key releases still pass through to avoid stuck movement/defense.
  if(down&&!canControl())return;
  if(event.code==='Space'){
   if(down&&event.target?.closest?.('textarea,select,[contenteditable="true"],input:not([type="range"])'))return;
   if(down&&!event.repeat)startAttack();
   event.preventDefault();return;
  }
  if(event.code==='ShiftLeft'||event.code==='ShiftRight'){
   if(down)defenseKeys.add(event.code);else defenseKeys.delete(event.code);
   if(down)setDefense(true);
   else if(!defenseKeys.size)setDefense(false);
   event.preventDefault();return;
  }
  if(!Object.hasOwn(directions,event.code))return;
  if(down&&event.target?.closest?.('textarea,select,[contenteditable="true"],input:not([type="range"])'))return;
  if(down)held.add(event.code);else held.delete(event.code);
  for(const button of buttons)button.dataset.held=String(held.has(button.dataset.moveKey));
  event.preventDefault();
  if(down)engage();
 }
 document.addEventListener('keydown',e=>key(e,true));
 document.addEventListener('keyup',e=>key(e,false));
 for(const button of buttons){
  const code=button.dataset.moveKey;
  if(!Object.hasOwn(directions,code))throw Error('Botón direccional inválido');
  const release=()=>{held.delete(code);button.dataset.held='false';};
  button.addEventListener('pointerdown',e=>{
   e.preventDefault();
   if(!canControl())return;
   held.add(code);button.dataset.held='true';
   if(typeof button.setPointerCapture==='function')button.setPointerCapture(e.pointerId);
   engage();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])
   button.addEventListener(event,release);
 }
 attackButton.addEventListener('click',()=>{attackButton.blur();startAttack();});
 defenseButton.addEventListener('pointerdown',e=>{
  e.preventDefault();
  if(typeof defenseButton.setPointerCapture==='function')defenseButton.setPointerCapture(e.pointerId);
  setDefense(true);
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])
  defenseButton.addEventListener(event,()=>setDefense(false));
 defenseButton.addEventListener('click',()=>defenseButton.blur());
 function releaseAll(){clearMovement();defenseKeys.clear();setDefense(false);}
 window.addEventListener('blur',releaseAll);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
 select.addEventListener('change',()=>{stop();select.blur();});
 speed.addEventListener('input',()=>{speedText.textContent=Number(speed.value).toFixed(1);});
 notify('WASD · listo');
 return {step,disable:stop,startAttack,startCardCast,setDefense,
  setMobileAxis(x,y){
   if(!canControl()){mobileAxisX=0;mobileAxisY=0;return;}
   mobileAxisX=THREE.MathUtils.clamp(Number(x)||0,-1,1);
   mobileAxisY=THREE.MathUtils.clamp(Number(y)||0,-1,1);
   if((mobileAxisX||mobileAxisY)&&!enabled)engage();
  },
  releaseMobile(){mobileAxisX=0;mobileAxisY=0;setDefense(false);},
  get enabled(){return enabled;},
  get defending(){return defending;},get caster(){return caster;},
  get threatTarget(){return attackDuration>0&&!attackReleased?committedAttackTarget:null;}};
}
