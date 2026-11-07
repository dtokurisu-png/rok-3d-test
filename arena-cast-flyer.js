/* R.O.K. 3D — phase 2: passive visual flyer for active card casting.
 * Does not own spell timing, resource spending, the caster mixer, or AI.
 * The caller supplies actual cost-derived preparation duration and release.
 */
export function createArenaCastFlyer(){
 const holders={};
 const palette={
  earth:['#CCFF00','#67400D'],water:['#00FFE4','#00FF8A'],
  fire:['#FF4A2D','#B81717'],wind:['#57B569','#FFFFFF'],
  light:['#D7A803','#FFF2A0'],dark:['#A455C8','#110821']
 };
 for(const side of ['ally','enemy']){
  const parent=document.querySelector('[data-hud-side="'+side+'"] .rokHudBars');
  if(!parent)throw Error('No existe la barra elemental para '+side);
  const root=document.createElement('div');
  root.className='rokCastFlyer';root.dataset.side=side;
  root.hidden=true;root.setAttribute('role','status');
  root.setAttribute('aria-live','off');
  root.innerHTML='<div class="rokCastFlyerPortrait"></div>'+
   '<div class="rokCastFlyerContents"><div class="rokCastFlyerName"></div>'+
   '<div class="rokCastFlyerProgress"><span class="rokCastFlyerFill"></span></div></div>'+
   '<div class="rokCastFlyerParticles" aria-hidden="true"></div>';
  const portrait=document.querySelector('[data-hud-side="'+side+'"] .rokHudPortrait img');
  if(portrait)root.querySelector('.rokCastFlyerPortrait').appendChild(portrait.cloneNode(true));
  parent.appendChild(root);
  const particles=root.querySelector('.rokCastFlyerParticles');
  for(let i=0;i<8;i++){
   const p=document.createElement('i');
   p.style.setProperty('--i',String(i));p.style.left=(7+i*12)+'%';
   p.style.animationDelay=-(i*.23)+'s';particles.appendChild(p);
  }
  holders[side]={root,fill:root.querySelector('.rokCastFlyerFill'),
   name:root.querySelector('.rokCastFlyerName'),duration:0,elapsed:0,
   active:false,finishing:0,token:0};
 }
 function paint(h){
  const progress=h.duration>0?Math.min(1,h.elapsed/h.duration):1;
  h.fill.style.transform='scaleX('+progress+')';
  h.root.style.setProperty('--rok-cast-percent',(100*progress).toFixed(1)+'%');
  h.root.setAttribute('aria-label',h.name.textContent+' · '+Math.round(progress*100)+'%');
 }
 function begin(side,{name='Casteo',element,duration}={}){
  const h=holders[side];if(!h)return null;
  h.token++;h.active=true;h.finishing=0;
  h.duration=Math.max(.01,Number(duration)||.5);h.elapsed=0;
  const [color,secondary]=palette[element]||palette[side==='ally'?'earth':'water'];
  h.root.style.setProperty('--rok-cast-color',color);
  h.root.style.setProperty('--rok-cast-secondary',secondary);
  h.name.textContent=String(name);
  h.root.hidden=false;h.root.dataset.phase='preparing';
  paint(h);return h.token;
 }
 function release(side,token){
  const h=holders[side];if(!h||token!==h.token)return;
  h.active=false;h.elapsed=h.duration;h.finishing=.65;
  h.root.dataset.phase='released';paint(h);
 }
 function cancel(side,token){
  const h=holders[side];if(!h||token!==undefined&&token!==h.token)return;
  h.active=false;h.finishing=0;h.root.hidden=true;h.root.dataset.phase='';
 }
 function tick(dt){
  const delta=Math.max(0,Math.min(.1,Number(dt)||0));
  for(const h of Object.values(holders)){
   if(h.active){h.elapsed=Math.min(h.duration,h.elapsed+delta);paint(h);}
   else if(h.finishing>0){
    h.finishing=Math.max(0,h.finishing-delta);
    if(h.finishing===0)h.root.hidden=true;
   }
  }
 }
 function reset(){for(const side of Object.keys(holders))cancel(side);}
 return {begin,release,cancel,tick,reset};
}
