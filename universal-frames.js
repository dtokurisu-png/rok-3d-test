/* R.O.K. 3D · Inspector universal no destructivo de fotogramas.
 * Reutiliza el AnimationMixer y los clips actualmente cargados en el visor.
 * No reescribe keyframes ni modifica GLB/FBX.
 */
export function createUniversalFrameInspector(adapter){
 'use strict';
 const $=id=>document.getElementById(id);
 const panel=$('universalFrames');
 const ui={
  source:$('ufSource'),timeline:$('ufTimeline'),frame:$('ufFrame'),
  time:$('ufTime'),fps:$('ufFPS'),speed:$('ufSpeed'),
  speedValue:$('ufSpeedValue'),play:$('ufPlay'),prev:$('ufPrev'),
  next:$('ufNext'),first:$('ufFirst'),last:$('ufLast'),
  markStart:$('ufMarkStart'),markEnd:$('ufMarkEnd'),
  start:$('ufStart'),end:$('ufEnd'),copy:$('ufCopy'),
  export:$('ufExport'),status:$('ufStatus')
 };
 const required=Object.values(ui);
 if(!panel||required.some(node=>!node))return {update(){}};
 let observedClip=null,observedMixer=null,observedCharacter='';
 let rangeStart=0,rangeEnd=0,changedRange=false;
 const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
 const fps=()=>Number(ui.fps.value)||30;
 function snapshot(){
  const state=adapter.current();
  if(!state?.clip||!state.action||!state.mixer||!(state.clip.duration>0))return null;
  return state;
 }
 function maximum(s){return Math.max(0,Math.floor(s.clip.duration*fps()+1e-7));}
 function currentFrame(s){return clamp(Math.round(s.action.time*fps()),0,maximum(s));}
 function name(s){return s.animationId===null?'Idle original':String(s.animationId).padStart(2,'0')+' · '+s.clip.name;}
 function resetIfChanged(s){
  const same=s&&s.clip===observedClip&&s.mixer===observedMixer&&s.character===observedCharacter;
  if(same)return;
  observedClip=s?.clip||null;observedMixer=s?.mixer||null;
  observedCharacter=s?.character||'';
  rangeStart=0;rangeEnd=s?maximum(s):0;changedRange=false;
  if(s){const effective=Number(s.action.getEffectiveTimeScale?.())||1;ui.speed.value=String(clamp(effective,.25,2));}
 }
 function setStatus(value){ui.status.textContent=value;}
 function update(){
  const s=snapshot();resetIfChanged(s);
  const ready=!!s,max=ready?maximum(s):0,frame=ready?currentFrame(s):0;
  panel.dataset.ready=String(ready);
  for(const node of [ui.timeline,ui.prev,ui.next,ui.first,ui.last,ui.play,
    ui.markStart,ui.markEnd,ui.copy,ui.export,ui.speed])node.disabled=!ready;
  ui.source.textContent=ready?name(s):'Sin clip activo';
  ui.timeline.max=String(Math.max(1,max));ui.timeline.value=String(frame);
  ui.frame.textContent=ready?frame+' / '+max:'—';
  ui.time.textContent=ready?s.action.time.toFixed(3)+' / '+s.clip.duration.toFixed(3)+' s':'—';
  ui.play.textContent=ready&&s.playing?'⏸ Pausar':'▶ Reproducir';
  ui.start.textContent=String(rangeStart);
  ui.end.textContent=String(rangeEnd);
  ui.speedValue.textContent=Number(ui.speed.value).toFixed(2)+'×';
 }
 function seek(frame){
  const s=snapshot();if(!s)return;
  const count=maximum(s);
  const target=clamp(Math.round(Number(frame)||0),0,count);
  adapter.seek(target/fps(),target,fps());
  update();
 }
 ui.timeline.addEventListener('input',()=>seek(ui.timeline.value));
 ui.prev.addEventListener('click',()=>{const s=snapshot();if(s)seek(currentFrame(s)-1);});
 ui.next.addEventListener('click',()=>{const s=snapshot();if(s)seek(currentFrame(s)+1);});
 ui.first.addEventListener('click',()=>seek(0));
 ui.last.addEventListener('click',()=>{const s=snapshot();if(s)seek(maximum(s));});
 ui.play.addEventListener('click',()=>{if(snapshot())adapter.toggle();update();});
 ui.fps.addEventListener('change',()=>{
  const s=snapshot();if(s&&!changedRange){rangeEnd=maximum(s);}
  else if(s){rangeStart=clamp(rangeStart,0,maximum(s));rangeEnd=clamp(rangeEnd,rangeStart,maximum(s));}
  update();
 });
 ui.speed.addEventListener('input',()=>{if(snapshot())adapter.speed(Number(ui.speed.value));update();});
 ui.markStart.addEventListener('click',()=>{
  const s=snapshot();if(!s)return;
  rangeStart=currentFrame(s);
  if(rangeEnd<rangeStart)rangeEnd=rangeStart;
  changedRange=true;update();
 });
 ui.markEnd.addEventListener('click',()=>{
  const s=snapshot();if(!s)return;
  rangeEnd=currentFrame(s);
  if(rangeStart>rangeEnd)rangeStart=rangeEnd;
  changedRange=true;update();
 });
 function rangePayload(){
  const s=snapshot();if(!s)return null;
  return {schemaVersion:1,kind:'rok3d.animation-range',character:s.character,
    animationId:s.animationId===null?'idle-original':s.animationId,
    sourceClip:s.clip.name,clipDurationSeconds:s.clip.duration,
    inspectionFPS:fps(),startFrame:rangeStart,endFrame:rangeEnd,
    startTimeSeconds:rangeStart/fps(),
    endTimeSeconds:Math.min(s.clip.duration,rangeEnd/fps())};
 }
 ui.copy.addEventListener('click',async()=>{
  const data=rangePayload();if(!data)return;
  const text=JSON.stringify(data,null,2);
  try{await navigator.clipboard.writeText(text);setStatus('Intervalo copiado.');}
  catch{setStatus('Portapapeles no disponible. Usa Exportar intervalo.');}
 });
 ui.export.addEventListener('click',()=>{
  const data=rangePayload();if(!data)return;
  const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='rok-'+data.character+'-'+String(data.animationId)+'-frames.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
  setStatus('Intervalo exportado (no es una animación compuesta todavía).');
 });
 update();
 return {update};
}
