/* R.O.K. pre-combat element priority and fair shared-fragment regeneration.
 * No cast card logic here: this module owns only the energy economy and HUD.
 */
export function createArenaElementSystem({THREE,root,getCasters,onBegin,onPrepare}){
 const palette={
  water:{label:'Agua',color:'#00ffe4'},
  fire:{label:'Fuego',color:'#ff7846'},
  wind:{label:'Viento',color:'#a9e88a'}
 };
 const names=Object.keys(palette);
 const capacity=12; // 3 whole units per equipped element; 4 fragments each.
 const hud=document.createElement('section');
 hud.id='rokBattleHud';hud.setAttribute('aria-label','Vida, elementos y tiempo');
 hud.innerHTML=`
  <div class="rokPlayer rokAlly"><div class="rokPortrait">L</div><div class="rokPlayerBars"><strong>LIOREN</strong><div class="rokHpTrack"><div class="rokHpFill"></div></div><div class="rokEnergyTracks"></div></div></div>
  <div class="rokClock"><span>R.O.K.</span><strong>00:00</strong><small>0–0</small></div>
  <div class="rokPlayer rokEnemy"><div class="rokPlayerBars"><strong>CHIARA</strong><div class="rokHpTrack"><div class="rokHpFill"></div></div><div class="rokEnergyTracks"></div></div><div class="rokPortrait">C</div></div>`;
 document.body.append(hud);
 const modal=document.createElement('section');
 modal.id='rokElementPrep';modal.hidden=false;
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.innerHTML=`<div class="rokPrepCard">
 <h2>Preparación elemental</h2>
 <p id="rokPrepRound">Combate 1 · mejor de tres</p>
 <p>Elige de uno a tres elementos y su orden de regeneración. No podrás cambiarlo durante el combate.</p>
 <label for="rokElementCount">Cantidad de elementos</label>
 <select id="rokElementCount"><option value="1">1 elemento</option><option value="2">2 elementos</option><option value="3">3 elementos</option></select>
 <div id="rokElementOrders"></div>
 <p class="rokPrepHelp">Cada segundo se genera un fragmento TOTAL. Cuatro fragmentos completan una unidad. El sistema llena una unidad antes de avanzar al siguiente elemento de la lista.</p>
 <p id="rokPrepWarning" role="status"></p>
 <button type="button" id="rokBeginRound" disabled>Preparando partida…</button></div>`;
 document.body.append(modal);
 const count=modal.querySelector('#rokElementCount');
 const orderZone=modal.querySelector('#rokElementOrders');
 let order=['water'],enemyOrder=['water'],scores={ally:0,enemy:0},round=1;
 let elapsed=0,active=false,ready=false,finished=false,redrawLeft=0;
 const pickups=[];
 const spawnTimers={
  ally:{next:0,steps:0},enemy:{next:0,steps:0}
 };
 const pickupTexture=fragment=>{
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
  const ctx=canvas.getContext('2d');
  const glow=ctx.createRadialGradient(48,48,4,48,48,44);
  glow.addColorStop(0,'rgba(255,255,255,1)');
  glow.addColorStop(.22,fragment?'rgba(131,255,229,.93)':'rgba(100,246,255,.95)');
  glow.addColorStop(.52,fragment?'rgba(71,210,198,.53)':'rgba(22,172,244,.48)');
  glow.addColorStop(1,'rgba(0,196,227,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,96,96);
  // Uneven silhouette: an energy wisp for full pickups, a crystal for fragments.
  ctx.save();ctx.translate(48,48);ctx.beginPath();
  const n=fragment?7:13;
  for(let i=0;i<n;i++){
   const a=-Math.PI/2+Math.PI*2*i/n;
   const radius=fragment?(i%2?11:22):(i%3===0?30:i%2?19:24);
   const x=Math.cos(a)*radius,y=Math.sin(a)*radius;
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.fillStyle=fragment?'#b9fff4':'#e4ffff';
  ctx.globalAlpha=.87;ctx.fill();ctx.restore();
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
 };
 const pickupTextures={full:pickupTexture(false),fragment:pickupTexture(true)};
 function clearPickups(){
  for(const p of pickups){root.remove(p.sprite);p.sprite.material.dispose();}
  pickups.length=0;
 }
 function spawnPickup(side,kind,x,z){
  if(pickups.length>=60)return;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
   map:pickupTextures[kind],transparent:true,depthWrite:false,
   depthTest:true,toneMapped:false
  }));
  sprite.position.set(x,.36,z);
  sprite.scale.setScalar(kind==='full'?.56:.32);
  sprite.renderOrder=8;root.add(sprite);
  pickups.push({sprite,side,kind,phase:Math.random()*6.28,attracted:null});
 }
 function spawnFromSource(side){
  if(pickups.filter(p=>p.kind==='full'&&p.side===side).length>=10)return;
  const x=(Math.random()*14)-7;
  // Only the nearest 75% of the owner's 15x30 arena is allowed.
  // Both players may collect any pickup once it lands.
  const z=side==='ally'?-7.5+Math.random()*22.5:-15+Math.random()*22.5;
  spawnPickup(side,'full',x,z);
 }
 function dropFragments(target,cost){
  if(!active||!target?.outer)return;
  const n=Math.max(1,Math.ceil(Math.max(1,Number(cost)||1)/2));
  for(let i=0;i<Math.min(12,n);i++){
   const angle=(i/n)*Math.PI*2;
   const x=THREE.MathUtils.clamp(target.outer.position.x+Math.cos(angle)*.36,-7.2,7.2);
   const z=THREE.MathUtils.clamp(target.outer.position.z+Math.sin(angle)*.36,-14.7,14.7);
   spawnPickup(target.side,'fragment',x,z);
  }
 }
 function stepPickups(dt){
  for(const side of ['ally','enemy']){
   const schedule=spawnTimers[side];
   while(elapsed>=schedule.next&&schedule.steps<250){
    spawnFromSource(side);
    schedule.next+=[5,10,20,35][Math.min(3,schedule.steps)];
    schedule.steps++;
   }
  }
  const casters=getCasters().filter(c=>c.stage==='active'&&c.outer);
  for(let i=pickups.length-1;i>=0;i--){
   const p=pickups[i],pos=p.sprite.position;
   p.phase+=dt*2;
   if(!p.attracted){
    const near=casters.filter(c=>Math.hypot(c.outer.position.x-pos.x,c.outer.position.z-pos.z)<=2);
    near.sort((a,b)=>Math.hypot(a.outer.position.x-pos.x,a.outer.position.z-pos.z)-
      Math.hypot(b.outer.position.x-pos.x,b.outer.position.z-pos.z));
    p.attracted=near[0]||null;
    pos.y=.36+Math.sin(p.phase)*.06;
   }
   if(p.attracted){
    const c=p.attracted;
    if(c.stage!=='active'){p.attracted=null;continue;}
    const dest=new THREE.Vector3(c.outer.position.x,1.0,c.outer.position.z);
    pos.lerp(dest,Math.min(1,dt*7));
    p.sprite.scale.multiplyScalar(Math.max(.96,1-dt*1.5));
    if(pos.distanceTo(dest)<.23){
     for(let n=0;n<(p.kind==='full'?4:1);n++)grantFragment(c.side);
     root.remove(p.sprite);p.sprite.material.dispose();
     pickups.splice(i,1);
     redrawLeft=0;
    }
   }
  }
 }

 const states={
  ally:{fragments:{},timer:0,cursor:0},
  enemy:{fragments:{},timer:0,cursor:0}
 };
 const chooseOrder=()=>{
  orderZone.replaceChildren();
  const n=Number(count.value);
  for(let i=0;i<n;i++){
   const row=document.createElement('label');
   row.textContent='Prioridad '+(i+1);
   const input=document.createElement('select');
   input.className='rokElementChoice';
   for(const id of names){
    const option=document.createElement('option');
    option.value=id;option.textContent=palette[id].label;
    input.append(option);
   }
   input.value=order[i]||names[i]||names[0];
   row.append(input);orderZone.append(row);
  }
 };
 count.addEventListener('change',()=>{
  order=[...orderZone.querySelectorAll('select')].map(x=>x.value);
  chooseOrder();
 });
 function prepare(){
  // The selection gate is authoritative: no gameplay step while visible.
  active=false;ready=true;
  onPrepare?.();
  modal.hidden=false;
  modal.querySelector('#rokBeginRound').disabled=false;
  modal.querySelector('#rokPrepRound').textContent=finished?
   'Serie terminada · '+(scores.ally>scores.enemy?'Ganó Lioren':'Ganó Chiara')+' '+scores.ally+'–'+scores.enemy:
   'Combate '+round+' de 3 · Marcador '+scores.ally+'–'+scores.enemy;
  modal.querySelector('h2').textContent=finished?'Nueva serie':'Preparación elemental';
  modal.querySelector('#rokBeginRound').textContent=finished?'Nueva serie · elegir elementos':'Comenzar combate';
  modal.querySelector('#rokPrepWarning').textContent='';
  chooseOrder();render();
 }
 function resetState(side,priority){
  states[side]={fragments:Object.fromEntries(priority.map(id=>[id,0])),timer:0,cursor:0};
 }
 function begin(){
  if(!ready)return;
  const selected=[...orderZone.querySelectorAll('select')].map(x=>x.value);
  if(new Set(selected).size!==selected.length){
   modal.querySelector('#rokPrepWarning').textContent='No puedes repetir el mismo elemento. Elige un orden sin duplicados.';
   return;
  }
  const button=modal.querySelector('#rokBeginRound');
  button.disabled=true;
  // Do not uncover the world until the round has been reset successfully.
  // Previously modal.hidden=true happened BEFORE onBegin(), so a reset error
  // left an apparently running/broken match with no selection screen.
  try{
   onBegin?.();
  }catch(error){
   button.disabled=false;active=false;ready=true;modal.hidden=false;
   modal.querySelector('#rokPrepWarning').textContent=
    'No se pudo iniciar el combate: '+String(error?.message||error);
   console.error('[R.O.K.] Preparación de combate fallida:',error);
   return;
  }
  if(finished){scores={ally:0,enemy:0};round=1;finished=false;}
  order=selected;
  enemyOrder=['water']; // Temporary prototype opponent; same energy rate.
  resetState('ally',order);resetState('enemy',enemyOrder);
  clearPickups();
  for(const side of ['ally','enemy'])spawnTimers[side]={next:0,steps:0};
  elapsed=0;redrawLeft=0;
  ready=false;active=true;modal.hidden=true;
  render();
 }
 modal.querySelector('#rokBeginRound').addEventListener('click',begin);
 function grantFragment(side){
  const priority=side==='ally'?order:enemyOrder;
  const st=states[side];
  if(!priority.length)return;
  for(let tries=0;tries<priority.length;tries++){
   const id=priority[st.cursor%priority.length];
   if((st.fragments[id]||0)<capacity){
    st.fragments[id]++;
    // Complete four fragments in the same element, then go next.
    if(st.fragments[id]%4===0||st.fragments[id]===capacity)
     st.cursor=(st.cursor+1)%priority.length;
    return;
   }
   st.cursor=(st.cursor+1)%priority.length;
  }
 }
 function energyRows(side){
  const player=states[side],priority=side==='ally'?order:enemyOrder;
  return priority.map(id=>{
   const value=player.fragments[id]||0;
   const pct=value/capacity*100;
   return `<div class="rokEnergyRow" title="${palette[id].label}: ${value}/${capacity} fragmentos">
    <span class="rokElementDot" style="background:${palette[id].color}"></span>
    <div class="rokEnergyTrack"><div style="width:${pct}%;background:${palette[id].color}"></div></div>
    <small>${Math.floor(value/4)}+${value%4}/4</small>
   </div>`;
  }).join('');
 }
 function render(){
  hud.querySelector('.rokClock strong').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(Math.floor(elapsed%60)).padStart(2,'0');
  hud.querySelector('.rokClock small').textContent=scores.ally+'–'+scores.enemy+' · R'+round;
  for(const side of ['ally','enemy']){
   const player=hud.querySelector(side==='ally'?'.rokAlly':'.rokEnemy');
   const c=getCasters().find(x=>x.side===side);
   const hp=Math.max(0,Number(c?.hp)||0),max=Math.max(1,Number(c?.maxHp)||12);
   player.querySelector('.rokHpFill').style.width=Math.min(100,hp/max*100)+'%';
   player.querySelector('.rokHpTrack').title=hp+' / '+max+' vida';
   player.querySelector('.rokEnergyTracks').innerHTML=energyRows(side);
  }
 }
 function step(dt){
  if(!active)return;
  elapsed+=dt;
  stepPickups(dt);
  for(const side of ['ally','enemy']){
   const state=states[side];
   state.timer+=dt;
   while(state.timer>=1){state.timer-=1;grantFragment(side);}
  }
  redrawLeft-=dt;
  if(redrawLeft<=0){render();redrawLeft=.13;}
 }
 function roundFinished(casters){
  if(!active)return;
  active=false;
  clearPickups();
  const ally=casters.find(c=>c.side==='ally'),enemy=casters.find(c=>c.side==='enemy');
  if(ally?.stage==='defeated'&&enemy?.stage!=='defeated')scores.enemy++;
  else if(enemy?.stage==='defeated'&&ally?.stage!=='defeated')scores.ally++;
  // Draws replay the same numbered round.
  if(scores.ally>=2||scores.enemy>=2)finished=true;
  else if(ally?.stage!=='defeated'||enemy?.stage!=='defeated')round++;
  prepare();
 }
 return {prepare,step,dropFragments,roundFinished,render,get active(){return active;},
  get order(){return order.slice();},get state(){return states;}};
}
