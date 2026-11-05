/* R.O.K. pre-combat element priority and fair shared-fragment regeneration.
 * No cast card logic here: this module owns only the energy economy and HUD.
 */
export function createArenaElementSystem({getCasters,onBegin}){
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
 modal.id='rokElementPrep';modal.hidden=true;
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
 <button type="button" id="rokBeginRound">Comenzar combate</button></div>`;
 document.body.append(modal);
 const count=modal.querySelector('#rokElementCount');
 const orderZone=modal.querySelector('#rokElementOrders');
 let order=['water'],enemyOrder=['water'],scores={ally:0,enemy:0},round=1;
 let elapsed=0,active=false,ready=false,finished=false,redrawLeft=0;
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
  active=false;ready=true;
  modal.hidden=false;
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
  if(finished){scores={ally:0,enemy:0};round=1;finished=false;}
  order=selected;
  enemyOrder=['water']; // Temporary prototype opponent; same energy rate.
  resetState('ally',order);resetState('enemy',enemyOrder);
  elapsed=0;redrawLeft=0;active=true;ready=false;modal.hidden=true;
  onBegin();render();
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
  const ally=casters.find(c=>c.side==='ally'),enemy=casters.find(c=>c.side==='enemy');
  if(ally?.stage==='defeated'&&enemy?.stage!=='defeated')scores.enemy++;
  else if(enemy?.stage==='defeated'&&ally?.stage!=='defeated')scores.ally++;
  // Draws replay the same numbered round.
  if(scores.ally>=2||scores.enemy>=2)finished=true;
  else if(ally?.stage!=='defeated'||enemy?.stage!=='defeated')round++;
  prepare();
 }
 return {prepare,step,roundFinished,render,get active(){return active;},
  get order(){return order.slice();},get state(){return states;}};
}
