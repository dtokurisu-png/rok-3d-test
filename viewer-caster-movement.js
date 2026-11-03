/* R.O.K. · Vista de animaciones: control WASD no destructivo.
   Comparte los clips/AnimationMixer existentes; no cambia los FBX ni la Arena. */
export function createViewerCasterMovement({getCharacter,getModel,getClip,ensureClip,ensureIdle,playClip,playIdle,onMessage}){
 const $=id=>document.getElementById(id),toggle=$('viewerMoveEnable'),status=$('viewerMoveStatus'),speed=$('viewerMoveSpeed'),speedOut=$('viewerMoveSpeedValue'),keysOut=$('viewerMoveKeys');
 const map={KeyW:{id:7,x:0,z:-1},KeyS:{id:6,x:0,z:1},KeyA:{id:15,x:-1,z:0},KeyD:{id:16,x:1,z:0}};
 const down=new Set();
 let enabled=false,revision=0,prepared=null,last='none',originalPosition=null,busy=false;
 function report(s){status.textContent=s;onMessage?.(s);}
 function controlsReady(){return ['chiara','lioren'].includes(getCharacter())&&!!getModel();}
 function clearKeys(){down.clear();keysOut.textContent='—';}
 function restorePosition(){if(originalPosition&&prepared?.model===getModel())prepared.model.position.copy(originalPosition);originalPosition=null;}
 function disable(){
  revision++;const was=enabled;enabled=false;toggle.checked=false;clearKeys();busy=false;
  if(was&&prepared?.model===getModel()&&getCharacter()===prepared.character)playIdle(prepared.idle);
  restorePosition();prepared=null;last='none';report('WASD desactivado.');
 }
 async function enable(){
  if(enabled)return;
  if(!controlsReady()){toggle.checked=false;report('Selecciona primero Chiara o Lioren.');return;}
  const ticket=++revision,character=getCharacter(),model=getModel();
  enabled=true;busy=true;prepared=null;last='none';clearKeys();originalPosition=model.position.clone();
  report('Preparando animaciones WASD…');
  try{
   const idle=await ensureIdle();
   const available={};
   for(const id of [6,7,15,16]){
    await ensureClip(id);
    const clip=getClip(id);
    if(!clip)throw Error('La animación '+id+' no se pudo adaptar al caster');
    available[id]=clip;
    if(!enabled||ticket!==revision||getModel()!==model||getCharacter()!==character)return;
   }
   if(!enabled||ticket!==revision||getModel()!==model||getCharacter()!==character)return;
   prepared={character,model,idle,available};
   busy=false;last='idle';playIdle(idle);
   report('WASD listo · W 07 · S 06 · A 15 · D 16');
  }catch(e){if(ticket!==revision)return;report('Error al preparar WASD: '+(e?.message||e));disable();}
 }
 toggle.addEventListener('change',()=>toggle.checked?void enable():disable());
 function key(event,pressed){
  if(!enabled||!Object.hasOwn(map,event.code))return;
  if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  event.preventDefault();
  if(pressed)down.add(event.code);else down.delete(event.code);
  keysOut.textContent=[...down].map(s=>s.slice(3)).join(' + ')||'—';
 }
 window.addEventListener('keydown',e=>key(e,true));
 window.addEventListener('keyup',e=>key(e,false));
 window.addEventListener('blur',clearKeys);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys();});
 speed.addEventListener('input',()=>{speedOut.textContent=Number(speed.value).toFixed(1)+' u/s';});
 function update(dt){
  if(!enabled||busy||!prepared||prepared.model!==getModel()||prepared.character!==getCharacter())return;
  const forward=(down.has('KeyW')?1:0)-(down.has('KeyS')?1:0);
  const lateral=(down.has('KeyD')?1:0)-(down.has('KeyA')?1:0);
  const kind=forward>0?7:forward<0?6:lateral<0?15:lateral>0?16:'idle';
  if(kind!==last){
   if(kind==='idle')playIdle(prepared.idle);
   else playClip(kind);
   last=kind;
  }
  if(!forward&&!lateral)return;
  const length=Math.hypot(forward,lateral),velocity=Number(speed.value)||2.2;
  const p=prepared.model.position;
  // Movimiento local de prueba, dentro de los límites de la cuadrícula del visor.
  p.x=Math.max(-4,Math.min(4,p.x+lateral/length*velocity*dt));
  p.z=Math.max(-4,Math.min(4,p.z-forward/length*velocity*dt));
 }
 return {update,disable,get enabled(){return enabled;}};
}
