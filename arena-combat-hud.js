/* R.O.K. combat HUD — Stage 2. Presentation only.
 * No resource regeneration, casting, spawns or match flow changes.
 */
export function createArenaCombatHud(){
 const el=document.getElementById('rokCombatHud');
 if(!el)throw Error('Falta el HUD superior');
 const clock=el.querySelector('#rokHudClock');
 const sides={
  ally:{root:el.querySelector('[data-hud-side="ally"]'),levels:['water'],label:'Lioren'},
  enemy:{root:el.querySelector('[data-hud-side="enemy"]'),levels:['water'],label:'Chiara'}
 };
 const types={
  water:{label:'Agua',color:'#00ffe4'},
  fire:{label:'Fuego',color:'#f57c48'},
  wind:{label:'Viento',color:'#8edb92'}
 };
 let seconds=0,refreshLeft=0;
 const safeType=id=>Object.hasOwn(types,id)?id:'water';
 function configure(side,selected){
  const target=sides[side];
  if(!target)return;
  target.levels=[...new Set((selected||['water']).map(safeType))].slice(0,3);
  if(!target.levels.length)target.levels=['water'];
  const slot=target.root.querySelector('.rokHudElementRows');
  slot.replaceChildren();
  for(const id of target.levels){
   const row=document.createElement('div');
   row.className='rokHudElementRow';
   row.title=types[id].label+' · sin regeneración en la etapa 2';
   const dot=document.createElement('span');dot.className='rokHudElementDot';
   dot.style.background=types[id].color;
   const track=document.createElement('span');track.className='rokHudEnergyTrack';
   const fill=document.createElement('span');fill.className='rokHudEnergyFill';
   fill.style.background=types[id].color;
   fill.style.width='0%';
   track.append(fill);
   row.append(dot,track);slot.append(row);
  }
 }
 function draw(casters){
  const displaySeconds=Math.max(0,Math.floor(seconds));
  clock.textContent=String(Math.floor(displaySeconds/60)).padStart(2,'0')+':'+String(displaySeconds%60).padStart(2,'0');
  for(const side of ['ally','enemy']){
   const player=sides[side].root;
   const caster=casters.find(c=>c.side===side);
   const health=Math.max(0,Number(caster?.hp)||0);
   const max=Math.max(1,Number(caster?.maxHp)||12);
   const amount=Math.min(100,health/max*100);
   player.querySelector('.rokHudHpFill').style.width=amount+'%';
   player.querySelector('.rokHudHpTrack').title='Vida '+health+' / '+max;
  }
 }
 function reset(){
  seconds=0;refreshLeft=0;
 }
 function advance(dt,casters){
  if(!Number.isFinite(dt)||dt<=0)return;
  seconds+=dt;
  refreshLeft-=dt;
  if(refreshLeft<=0){refreshLeft=.12;draw(casters);}
 }
 configure('ally',['water']);
 configure('enemy',['water']);
 draw([]);
 return {configure,draw,reset,advance};
}
