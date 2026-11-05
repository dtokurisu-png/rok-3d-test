/* R.O.K. stage 1: explicit match start and mobile landscape readiness.
   Intentionally does not create element resources, cards, HUD or combat rules. */
export function createArenaMatchGate({onStart,onResume,onPause}){
 const panel=document.getElementById('rokMatchGate');
 const selectPanel=document.getElementById('rokMatchSelection');
 const readyPanel=document.getElementById('rokMatchReady');
 const count=document.getElementById('rokMatchElementCount');
 const priorities=document.getElementById('rokMatchElementPriorities');
 const confirm=document.getElementById('rokConfirmElements');
 const start=document.getElementById('rokManualStart');
 const warning=document.getElementById('rokMatchGateWarning');
 const info=document.getElementById('rokMatchReadySummary');
 const mobile=window.matchMedia('(pointer:coarse) and (max-width:950px)');
 const portrait=window.matchMedia('(orientation:portrait)');
 const options=[['water','Agua'],['fire','Fuego'],['wind','Viento']];
 let mode='loading',configuration=['water'];
 let confirmed=null;
 const orientationBlocked=()=>mobile.matches&&portrait.matches;
 function view(){
  document.body.dataset.matchState=mode;
  selectPanel.hidden=mode!=='selecting';
  readyPanel.hidden=mode!=='armed'&&mode!=='rotation-paused';
  panel.hidden=mode==='loading'||mode==='running';
  start.textContent=mode==='rotation-paused'?'▶ REANUDAR':'▶ INICIAR';
 }
 function selectInputs(){
  const prior=[...priorities.querySelectorAll('select')].map(el=>el.value);
  const n=Number(count.value);
  priorities.replaceChildren();
  for(let index=0;index<n;index++){
   const label=document.createElement('label');
   label.textContent='Orden '+(index+1);
   const input=document.createElement('select');
   input.setAttribute('aria-label','Elemento en posición '+(index+1));
   for(const [value,name] of options){
    const o=document.createElement('option');o.value=value;o.textContent=name;input.append(o);
   }
   input.value=prior[index]||configuration[index]||options[index][0];
   label.append(input);priorities.append(label);
  }
 }
 count.addEventListener('change',selectInputs);
 confirm.addEventListener('click',()=>{
  if(mode!=='selecting'||orientationBlocked())return;
  const chosen=[...priorities.querySelectorAll('select')].map(el=>el.value);
  if(chosen.length!==Number(count.value)||new Set(chosen).size!==chosen.length){
   warning.textContent='Elige elementos distintos para cada posición.';
   return;
  }
  configuration=chosen.slice();confirmed=chosen.slice();
  info.textContent='Orden seleccionado: '+chosen.map(id=>options.find(o=>o[0]===id)[1]).join(' → ');
  warning.textContent='';
  mode='armed';view();
 });
 start.addEventListener('click',()=>{
  if(orientationBlocked()||!(mode==='armed'||mode==='rotation-paused'))return;
  const resuming=mode==='rotation-paused';
  start.disabled=true;
  try{
   if(resuming)onResume?.();
   else onStart?.(confirmed.slice());
   mode='running';view();
  }catch(error){
   warning.textContent='No se pudo iniciar: '+String(error?.message||error);
   // An unsuccessful reset never starts the round.
   mode=resuming?'rotation-paused':'armed';view();
  }finally{start.disabled=false;}
 });
 function resourcesReady(){
  if(mode!=='loading')return;
  mode='selecting';configuration=['water'];confirmed=null;
  count.value='1';selectInputs();view();
 }
 function checkOrientation(){
  if(mode==='running'&&orientationBlocked()){
   onPause?.();
   mode='rotation-paused';
   view();
  }
  // The CSS rotation prompt always covers the match selector in portrait.
  // Returning to landscape never starts or resumes the round automatically.
 }
 window.addEventListener('resize',checkOrientation);
 window.addEventListener('orientationchange',checkOrientation);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&mode==='running'){
   onPause?.();mode='rotation-paused';view();
  }
 });
 view();
 return {
  resourcesReady,checkOrientation,
  get isRunning(){return mode==='running';},
  get isPrepared(){return mode==='armed';},
  get configuration(){return confirmed?.slice()||null;}
 };
}
