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
   for(const role of ['idle','forward','backward','left','right','attack','death','defense','hit'])
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
  if(c.stage!=='active'||defending||attackDuration>0||attackCooldown>0)return false;
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
 return {step,disable:stop,startAttack,setDefense,
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
